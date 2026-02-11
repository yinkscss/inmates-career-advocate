/**
 * Agent Service
 * Orchestrates agent execution and response handling
 */

import { createJobDiscoveryAgent, runAgent } from '../agent/job-discovery-agent.js';
import { config } from '../config/config.js';
import type { JobListing } from '../types/job.types.js';
import { formatErrorMessage } from '../utils/response-formatter.js';
import type { SearchContext } from './conversation.service.js';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

export interface AgentResponse {
  response: string;
  jobs?: JobListing[];
  conversationId?: string;
  searchPerformed?: boolean;
  searchContext?: SearchContext;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Marker in assistant content that indicates job IDs were included (for "first job" follow-ups) */
const JOB_IDS_MARKER = 'ID: ';

/**
 * Trim conversation history to a bounded window for the agent while preserving
 * the most recent job search result so follow-up references like "the first job" work.
 * Exported for unit testing.
 */
export function getHistoryForAgent(
  fullHistory: ConversationMessage[],
  maxMessages: number
): ConversationMessage[] {
  if (fullHistory.length <= maxMessages) {
    return fullHistory;
  }
  const tail = fullHistory.slice(-maxMessages);
  // Ensure we include the last assistant message that contains job IDs, if it would be cut off
  let lastJobListIndex = -1;
  for (let i = fullHistory.length - 1; i >= 0; i--) {
    const msg = fullHistory[i];
    if (msg.role === 'assistant' && msg.content.includes(JOB_IDS_MARKER)) {
      lastJobListIndex = i;
      break;
    }
  }
  if (lastJobListIndex >= 0 && lastJobListIndex < fullHistory.length - maxMessages) {
    return fullHistory.slice(lastJobListIndex);
  }
  return tail;
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
    conversationHistory: ConversationMessage[] = [],
    searchContext?: SearchContext
  ): Promise<AgentResponse> {
    try {
      // Let the LLM classify the intent - more robust than keywords/regex
      // IMPORTANT: Only classify if there's a valid previous search context
      let isFindMoreRequest = false;
      
      if (searchContext && searchContext.currentPage && searchContext.currentPage > 0) {
        // Only classify if there's meaningful search context
        const intentSchema = z.object({
          intent: z.enum(['find_more', 'new_search']).describe(
            'find_more: User wants more results from the same search (e.g., "show more", "next page", "continue"). ' +
            'new_search: User wants to start a new search with different criteria.'
          ),
        });
        
        try {
          const llm = new ChatOpenAI({
            modelName: 'gpt-4o-mini',
            temperature: 0,
          });
          
          const structuredLlm = llm.withStructuredOutput(intentSchema);
          
          // Include previous search query for better context
          const previousQuery = searchContext.lastSearchQuery || 'unknown';
          
          const result = await structuredLlm.invoke([
            {
              role: 'system',
              content: 'You are an intent classifier. Determine if the user wants more results from their SAME previous search, or wants to start a DIFFERENT new search.\n\n' +
                       'find_more: User wants continuation of same search (e.g., "show more", "next page", "continue", "more jobs")\n' +
                       'new_search: User has NEW search criteria or different job requirements',
            },
            {
              role: 'user',
              content: `Previous search: "${previousQuery}"\nCurrent message: "${userMessage}"\n\nAre these the SAME search or DIFFERENT searches?`,
            },
          ]);
          
          isFindMoreRequest = result.intent === 'find_more';
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[AGENT SERVICE DEBUG] LLM classified intent:', result.intent, '(previous page:', searchContext.currentPage + ')');
          }
        } catch (error) {
          // Fallback: treat as new search if classification fails
          if (process.env.NODE_ENV === 'development') {
            console.log('[AGENT SERVICE DEBUG] Intent classification failed, defaulting to new search');
          }
          isFindMoreRequest = false;
        }
      } else {
        // No valid search context - this is definitely a new search
        if (process.env.NODE_ENV === 'development') {
          console.log('[AGENT SERVICE DEBUG] No search context, treating as new search');
        }
        isFindMoreRequest = false;
      }
      
      // Determine current page for search
      let currentPage = 1;
      const maxPages = 100; // Remove hard limit, rely on backend totalPages instead
      
      // If "find more" and we have previous search context
      if (isFindMoreRequest && searchContext) {
        // Start from NEXT page after the last search
        currentPage = (searchContext.currentPage || 0) + 1;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[AGENT SERVICE DEBUG] Find more detected, incrementing page:', {
            previousPage: searchContext.currentPage,
            nextPage: currentPage,
          });
        }
        
        // If exceeded max pages, reset to 1 for broader search
        if (currentPage > maxPages) {
          currentPage = 1;
          if (process.env.NODE_ENV === 'development') {
            console.log('[AGENT SERVICE DEBUG] Exceeded max pages, resetting to page 1');
          }
        }
      } else if (!isFindMoreRequest) {
        // New search, start from page 1
        currentPage = 1;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AGENT SERVICE DEBUG] New search, starting from page 1');
        }
      }
      
      // Create agent with JWT token and search context
      const agent = createJobDiscoveryAgent(token, { currentPage, maxPages, isFindMoreRequest, searchContext });

      // Trim history to configured window so agent receives bounded context
      const trimmedHistory = getHistoryForAgent(conversationHistory, config.maxHistoryMessages);
      const historyForAgent = trimmedHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (process.env.NODE_ENV === 'development' && conversationHistory.length > trimmedHistory.length) {
        console.log('[AGENT SERVICE DEBUG] History trimmed:', conversationHistory.length, '->', trimmedHistory.length, 'messages');
      }

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
      const extractedJobs = this.extractJobsFromMessages(result.messages);
      
      // Extract finalPage from tool response for search context
      let finalPageFromTool: number | undefined;
      for (const message of result.messages) {
        const msg = message as any;
        if (msg.name === 'search_jobs' && msg.content) {
          try {
            const toolResult = typeof msg.content === 'string' 
              ? JSON.parse(msg.content) 
              : msg.content;
            if (toolResult.finalPage !== undefined) {
              finalPageFromTool = toolResult.finalPage;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      // Deduplicate jobs ONLY if they are exact duplicates (same ID)
      // User wants ALL jobs displayed, so we only remove exact ID duplicates
      const jobs = this.deduplicateJobsByIdOnly(extractedJobs);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Extracted jobs count:', extractedJobs.length);
        if (extractedJobs.length !== jobs.length) {
          console.log('[DEBUG] Removed exact ID duplicates, final count:', jobs.length);
        }
        if (finalPageFromTool) {
          console.log('[DEBUG] Final page from tool:', finalPageFromTool);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[AGENT SERVICE DEBUG] Final jobs (after ID deduplication):', jobs.length);
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
        searchPerformed: jobs.length > 0,
        searchContext: jobs.length > 0 ? {
          currentPage: finalPageFromTool || currentPage, // Use finalPage from tool if available
          lastSearchQuery: userMessage,
          searchTimestamp: new Date(),
        } : undefined,
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
   * Deduplicate jobs by ID only (exact duplicates)
   * User wants ALL jobs displayed, so we only remove exact ID duplicates
   * Backend may return same job ID multiple times, but different content should be kept
   */
  private deduplicateJobsByIdOnly(jobs: JobListing[]): JobListing[] {
    const seen = new Map<string, JobListing>();
    
    for (const job of jobs) {
      // Only deduplicate if the exact same ID appears multiple times
      if (job._id && !seen.has(job._id)) {
        seen.set(job._id, job);
      } else if (!job._id) {
        // If no ID, keep all (edge case)
        // Generate a unique key for jobs without IDs
        const uniqueKey = `no-id-${Math.random()}`;
        seen.set(uniqueKey, job);
      }
    }
    
    return Array.from(seen.values());
  }
  
  /**
   * Deduplicate jobs based on content (title, company, description)
   * DEPRECATED: User wants all jobs displayed, keeping for reference only
   * Use deduplicateJobsByIdOnly instead
   */
  private deduplicateJobs(jobs: JobListing[]): JobListing[] {
    const seen = new Map<string, JobListing>();
    
    for (const job of jobs) {
      // Create a content-based key (title + company + first 100 chars of description)
      const descriptionPreview = job.description.substring(0, 100).trim();
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${descriptionPreview}`;
      
      // Only keep the first occurrence
      if (!seen.has(key)) {
        seen.set(key, job);
      }
    }
    
    return Array.from(seen.values());
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
