/**
 * Agent Service
 * Orchestrates agent execution and response handling
 */

import { createJobDiscoveryAgent, runAgent } from '../agent/job-discovery-agent.js';
import type { JobListing } from '../types/job.types.js';

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

      // Extract jobs from tool results if any
      const jobs = this.extractJobsFromMessages(result.messages);

      return {
        response: result.response,
        jobs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process message: ${errorMessage}`);
    }
  }

  /**
   * Extract job data from agent tool call results
   */
  private extractJobsFromMessages(messages: unknown[]): JobListing[] {
    const jobs: JobListing[] = [];

    for (const message of messages) {
      // Type guard for message structure
      if (
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'content' in message
      ) {
        const msg = message as { role?: string; content?: unknown };
        
        // Look for tool messages with job data
        if (msg.role === 'tool' && msg.content) {
          try {
            const content = typeof msg.content === 'string' 
              ? JSON.parse(msg.content) 
              : msg.content;

          if (content.jobs && Array.isArray(content.jobs)) {
            // Map tool response format to JobListing
            for (const jobData of content.jobs) {
              jobs.push({
                _id: jobData.id,
                source: jobData.source || 'unknown',
                title: jobData.title,
                company: jobData.company,
                location: jobData.location,
                description: jobData.description || '',
                url: jobData.url,
                logo: '',
                jobType: jobData.jobType,
                workMode: jobData.workMode,
                tags: jobData.tags || [],
                salaryMin: undefined,
                salaryMax: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as JobListing);
            }
          } else if (content.job) {
            // Single job from get_job_details
            const jobData = content.job;
            jobs.push({
              _id: jobData.id,
              source: jobData.source || 'unknown',
              title: jobData.title,
              company: jobData.company,
              location: jobData.location,
              description: jobData.description || '',
              url: jobData.url,
              logo: jobData.logo || '',
              jobType: jobData.jobType,
              workMode: jobData.workMode,
              tags: jobData.tags || [],
              salaryMin: undefined,
              salaryMax: undefined,
              createdAt: new Date(jobData.createdAt),
              updatedAt: new Date(jobData.updatedAt),
              companyEmail: jobData.companyEmail,
              emailSubject: jobData.emailSubject,
              isCompanyEmail: jobData.isCompanyEmail,
            } as JobListing);
          }
          } catch {
            // Skip messages that aren't valid JSON or don't contain job data
            continue;
          }
        }
      }
    }

    return jobs;
  }
}
