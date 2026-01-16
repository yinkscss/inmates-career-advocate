/**
 * Agent Service
 * Orchestrates agent execution and response handling
 */

import { createJobDiscoveryAgent, runAgent } from '../agent/job-discovery-agent.js';
import type { JobListing } from '../types/job.types.js';
import { formatErrorMessage } from '../utils/response-formatter.js';

export interface AgentResponse {
  response: string;
  jobs?: JobListing[];
  conversationId?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Agent Service for handling conversational job discovery
 */
export class AgentService {
  /**
   * Process a user message and return agent response
   */
  async processMessage(
    userMessage: string,
    token: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<AgentResponse> {
    try {
      // Create agent with JWT token
      const agent = createJobDiscoveryAgent(token);

      // Convert conversation history to simple format for agent
      const historyForAgent = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Run the agent
      const result = await runAgent(agent, userMessage, historyForAgent);

      // DEBUG: Log message structure to understand format
      if (process.env.NODE_ENV === 'development') {
        console.log('[AGENT SERVICE DEBUG] Total messages:', result.messages.length);
        result.messages.forEach((msg, idx) => {
          const msgObj = msg as unknown as { role?: string; content?: unknown; name?: string; [key: string]: unknown };
          const isTool = msgObj.role === 'tool';
          console.log(`[AGENT SERVICE DEBUG] Message ${idx}:`, {
            role: msgObj.role,
            name: msgObj.name,
            contentType: typeof msgObj.content,
            contentPreview: typeof msgObj.content === 'string' 
              ? (isTool ? msgObj.content.substring(0, 200) : msgObj.content.substring(0, 100))
              : JSON.stringify(msgObj.content).substring(0, 100),
            keys: Object.keys(msgObj),
          });
        });
      }

      // Extract jobs from tool results if any
      const jobs = this.extractJobsFromMessages(result.messages);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Extracted jobs count:', jobs.length);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[AGENT SERVICE DEBUG] Extracted jobs:', jobs.length);
      }

      // If no jobs found but agent provided a response, check if we should enhance it
      let finalResponse = result.response;
      
      // CRITICAL: Inject job IDs into response for conversational history
      // This ensures job IDs are visible when user asks follow-up questions
      if (jobs.length > 0) {
        // Check if response already includes job IDs
        const hasJobIds = jobs.some(job => 
          job._id && result.response.includes(job._id)
        );
        
        if (!hasJobIds) {
          // Inject job IDs into the response
          // Find job titles in response and add IDs after them
          let enhancedResponse = result.response;
          
          for (const job of jobs) {
            if (job._id && job.title) {
              // Try to find the job title in the response
              const titlePattern = new RegExp(
                `(\\*\\*${job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*|${job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                'i'
              );
              
              // If title found and ID not already present, add it
              if (titlePattern.test(enhancedResponse) && !enhancedResponse.includes(job._id)) {
                // Add ID after the title (try to find a good insertion point)
                enhancedResponse = enhancedResponse.replace(
                  titlePattern,
                  (match) => {
                    // Check if ID is already nearby
                    const afterMatch = enhancedResponse.substring(enhancedResponse.indexOf(match) + match.length, enhancedResponse.indexOf(match) + match.length + 100);
                    if (!afterMatch.includes(job._id)) {
                      return `${match} (ID: ${job._id})`;
                    }
                    return match;
                  }
                );
              }
            }
          }
          
          // If we couldn't inject via title matching, append IDs at the end
          if (enhancedResponse === result.response && jobs.length > 0) {
            const jobIdsList = jobs
              .map((job, idx) => `${idx + 1}. ${job.title}${job.company ? ` at ${job.company}` : ''} (ID: ${job._id})`)
              .join('\n');
            enhancedResponse = `${result.response}\n\n**Job IDs for reference:**\n${jobIdsList}`;
          }
          
          finalResponse = enhancedResponse;
        } else {
          finalResponse = result.response;
        }
      }
      
      // If no jobs were extracted but agent says it found jobs, provide helpful message
      if (jobs.length === 0 && result.response.toLowerCase().includes('job')) {
        // Check if response mentions "no jobs" or similar
        const noJobsPatterns = /no jobs|couldn't find|didn't find|no results/i;
        if (!noJobsPatterns.test(result.response)) {
          // Agent might have hallucinated - add a note
          finalResponse = result.response + '\n\nNote: No jobs were retrieved from the database.';
        }
      }

      return {
        response: finalResponse,
        jobs,
      };
    } catch (error) {
      // Enhanced error handling
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error('Authentication failed. Please check your token and try again.');
        }
        if (error.message.includes('timeout') || error.message.includes('network')) {
          throw new Error('Network error: Unable to connect to the backend. Please try again.');
        }
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
      }
      
      // Format user-friendly error message
      const errorMessage = formatErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Extract job data from agent tool call results
   * Handles different message formats from LangGraph createReactAgent
   * 
   * LangGraph createReactAgent structures tool messages as:
   * - name: tool name (e.g., 'search_jobs', 'get_job_details') - PRIMARY IDENTIFIER
   * - content: tool return value (JSON string in our case)
   * - role: may be undefined (not always set by LangGraph)
   * - Additional properties: lc_direct_tool_output, tool_call_id, status
   */
  private extractJobsFromMessages(messages: unknown[]): JobListing[] {
    const jobs: JobListing[] = [];

    for (const message of messages) {
      // Type guard for message structure
      // LangGraph returns BaseMessage types, cast to access properties
      if (
        typeof message === 'object' &&
        message !== null
      ) {
        const msg = message as unknown as { 
          role?: string; 
          content?: unknown;
          name?: string;
          getContent?: () => unknown;
          lc_direct_tool_output?: unknown;
          tool_call_id?: string;
          status?: string;
          [key: string]: unknown;
        };
        
        // Check if this is a tool message by name (PRIMARY CHECK)
        // LangGraph tool messages have name set to the tool name
        const toolName = msg.name;
        const isJobTool = toolName === 'search_jobs' || toolName === 'get_job_details';
        
        // Also check for tool-related properties as fallback
        const hasToolProperties = msg.lc_direct_tool_output !== undefined || 
                                  msg.tool_call_id !== undefined ||
                                  msg.status !== undefined;
        
        // Process if it's a job tool OR has tool properties (fallback)
        if (isJobTool || (hasToolProperties && toolName)) {
          // Handle BaseMessage.getContent() if it exists
          let content = msg.content;
          if (!content && typeof msg.getContent === 'function') {
            content = msg.getContent();
          }
          
          // Also check lc_direct_tool_output as alternative content source
          if (!content && msg.lc_direct_tool_output) {
            content = msg.lc_direct_tool_output;
          }
          
          if (!content) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[AGENT SERVICE DEBUG] Tool message (name: ${toolName}) has no content`);
            }
            continue;
          }
          
          try {
            // Tool returns JSON string, parse it
            let parsedContent: unknown;
            if (typeof content === 'string') {
              parsedContent = JSON.parse(content);
            } else {
              parsedContent = content;
            }

            // Check for jobs array in tool response (from search_jobs)
            if (parsedContent && typeof parsedContent === 'object') {
              const contentObj = parsedContent as Record<string, unknown>;
              
              if (contentObj.jobs && Array.isArray(contentObj.jobs)) {
                // Multiple jobs from search_jobs tool
                for (const jobData of contentObj.jobs) {
                  jobs.push(this.mapJobDataToJobListing(jobData));
                }
                
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[AGENT SERVICE DEBUG] Extracted ${contentObj.jobs.length} jobs from ${toolName} tool`);
                }
              } else if (contentObj.job) {
                // Single job from get_job_details tool
                jobs.push(this.mapJobDataToJobListing(contentObj.job, true));
                
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[AGENT SERVICE DEBUG] Extracted 1 job from ${toolName} tool`);
                }
              } else if (process.env.NODE_ENV === 'development') {
                console.log(`[AGENT SERVICE DEBUG] Tool message (name: ${toolName}) has no jobs or job property. Keys:`, Object.keys(contentObj));
              }
            }
          } catch (error) {
            // Skip messages that aren't valid JSON or don't contain job data
            if (process.env.NODE_ENV === 'development') {
              console.log(`[AGENT SERVICE DEBUG] Failed to parse tool message (name: ${toolName}):`, 
                error instanceof Error ? error.message : String(error));
              console.log(`[AGENT SERVICE DEBUG] Content type:`, typeof content);
              console.log(`[AGENT SERVICE DEBUG] Content preview:`, typeof content === 'string' ? content.substring(0, 200) : String(content).substring(0, 200));
            }
            continue;
          }
        }
      }
    }

    return jobs;
  }

  /**
   * Map tool response job data to JobListing format
   */
  private mapJobDataToJobListing(jobData: unknown, isDetailed = false): JobListing {
    const job = jobData as {
      id?: string;
      source?: string;
      title?: string;
      company?: string;
      location?: string;
      description?: string;
      url?: string;
      logo?: string;
      jobType?: string;
      workMode?: string;
      tags?: string[];
      salaryMin?: number;
      salaryMax?: number;
      createdAt?: string | Date;
      updatedAt?: string | Date;
      companyEmail?: string;
      emailSubject?: string;
      isCompanyEmail?: boolean;
    };

    return {
      _id: job.id || '',
      source: job.source || 'unknown',
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      description: job.description || '',
      url: job.url || '',
      logo: job.logo || '',
      jobType: job.jobType || '',
      workMode: job.workMode,
      tags: job.tags || [],
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      createdAt: job.createdAt ? new Date(job.createdAt) : new Date(),
      updatedAt: job.updatedAt ? new Date(job.updatedAt) : new Date(),
      ...(isDetailed && {
        companyEmail: job.companyEmail,
        emailSubject: job.emailSubject,
        isCompanyEmail: job.isCompanyEmail,
      }),
    } as JobListing;
  }
}
