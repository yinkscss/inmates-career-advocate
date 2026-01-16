/**
 * Search Jobs Tool
 * LangChain tool for searching jobs via backend API
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { jobsApiClient } from '../../api/jobs-api.js';
import { buildQueryFromMessage, buildQueryFromFilters } from '../../utils/query-builder.js';
import { GetJobsQueryDto, WorkMode } from '../../types/query.types.js';

// Schema with nullable() for OpenAI structured outputs compatibility
const SearchJobsInputSchema = z.object({
  query: z.string().nullable().optional(),
  searchTerm: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  jobType: z.string().nullable().optional(),
  workMode: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  page: z.number().nullable().optional(),
  limit: z.number().nullable().optional(),
});

/**
 * Create search jobs tool with JWT token
 * The tool accepts either natural language or structured filters
 */
export function createSearchJobsTool(token: string) {
  // @ts-expect-error - TypeScript deep instantiation issue with complex Zod schemas
  return new DynamicStructuredTool({
    name: 'search_jobs',
    description: `Search for job listings from the inmates.ai job database.
    
Use this tool when users ask about:
- Finding jobs (e.g., "show me software engineer jobs", "find remote positions")
- Searching by role, skills, location, salary, or other criteria
- Browsing available job opportunities

The tool accepts:
1. Natural language query (use 'query' parameter) - e.g., "remote Python developer jobs"
2. Structured filters (use specific parameters) - for precise searches
3. Both together - natural language query will be processed first, then explicit structured filters will be merged in (useful when you want to ensure specific filters like salaryMin are applied)

When using both, structured filters will only be applied if they weren't already extracted from the natural language query. This ensures explicit filters (like salaryMin) are preserved even if the natural language doesn't mention them.

The tool returns jobs with:
- id: Job ID (use this with get_job_details tool for follow-up questions)
- index: Position in list (1-based, for "first job", "second job" references)
- title, company, location, workMode, salaryRange, tags, url, description

IMPORTANT: When presenting results, always include job IDs so users can reference them in follow-up questions (e.g., "Tell me more about job [ID]" or "I want details on the first job").

Always use this tool to retrieve job data. Never make up or hallucinate job listings.`,
    schema: SearchJobsInputSchema,
    func: async (input) => {
      try {
        // DEBUG: Log what the agent passed to the tool (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('[TOOL DEBUG] search_jobs called with input:', JSON.stringify(input, null, 2));
        }
        
        let query: GetJobsQueryDto;

        // If 'query' is provided, treat it as natural language
        if (input.query) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Using natural language query:', input.query);
          }
          // Build query from natural language first
          query = await buildQueryFromMessage(input.query);
          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Built query from message:', JSON.stringify(query, null, 2));
          }

          // Merge structured filters that weren't extracted from natural language
          // This preserves explicit filters passed by the agent (e.g., salaryMin)
          const structuredFilters: Partial<GetJobsQueryDto> = {};
          
          // Only merge structured filters if they weren't already extracted from the query
          // This allows natural language to override, but preserves explicit filters when missing
          if (input.salaryMin !== undefined && query.salaryMin === undefined) {
            structuredFilters.salaryMin = input.salaryMin;
          }
          if (input.salaryMax !== undefined && query.salaryMax === undefined) {
            structuredFilters.salaryMax = input.salaryMax;
          }
          if (input.location && !query.location) {
            structuredFilters.location = input.location;
          }
          if (input.jobType && !query.jobType) {
            structuredFilters.jobType = input.jobType;
          }
          if (input.workMode && !query.workMode) {
            structuredFilters.workMode = input.workMode as WorkMode;
          }
          if (input.experienceLevel && !query.experienceLevel) {
            structuredFilters.experienceLevel = input.experienceLevel;
          }
          // Pagination: structured filters take precedence if provided
          if (input.page !== undefined) {
            structuredFilters.page = input.page;
          }
          if (input.limit !== undefined) {
            structuredFilters.limit = input.limit;
          }

          // Merge structured filters into the query
          if (Object.keys(structuredFilters).length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[TOOL DEBUG] Merging structured filters:', JSON.stringify(structuredFilters, null, 2));
            }
            query = { ...query, ...structuredFilters };
            if (process.env.NODE_ENV === 'development') {
              console.log('[TOOL DEBUG] Final merged query:', JSON.stringify(query, null, 2));
            }
          }
        } else {
          // Otherwise, use structured filters only
          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Using structured filters only');
          }
          const filters: Partial<GetJobsQueryDto> = {};
          
          if (input.searchTerm) filters.searchTerm = input.searchTerm;
          if (input.location) filters.location = input.location;
          if (input.salaryMin !== undefined) filters.salaryMin = input.salaryMin;
          if (input.salaryMax !== undefined) filters.salaryMax = input.salaryMax;
          if (input.jobType) filters.jobType = input.jobType;
          if (input.workMode) filters.workMode = input.workMode as WorkMode;
          if (input.experienceLevel) filters.experienceLevel = input.experienceLevel;
          if (input.page !== undefined) filters.page = input.page;
          if (input.limit !== undefined) filters.limit = input.limit;

          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Structured filters:', JSON.stringify(filters, null, 2));
          }
          query = buildQueryFromFilters(filters);
          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Built query from filters:', JSON.stringify(query, null, 2));
          }
        }

        // Call the backend API
        let result;
        try {
          result = await jobsApiClient.searchJobs(query, token);
        } catch (apiError) {
          // Handle API errors gracefully
          const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown API error';
          return JSON.stringify({
            success: false,
            error: `Backend API error: ${errorMsg}`,
            totalJobs: 0,
            jobsFound: 0,
            jobs: [],
            message: 'Unable to connect to job database. Please try again later.',
          });
        }

        // Check if we got results
        if (!result || !result.data || result.data.length === 0) {
          return JSON.stringify({
            success: true,
            totalJobs: result?.meta?.totalItems || 0,
            jobsFound: 0,
            message: 'No jobs found matching the criteria',
            jobs: [],
          });
        }

        // Format response for the agent
        // IMPORTANT: Include job IDs prominently so agent can extract them for follow-up questions
        return JSON.stringify({
          success: true,
          totalJobs: result.meta.totalItems,
          jobsFound: result.data.length,
          page: result.meta.currentPage,
          totalPages: result.meta.totalPages,
          jobs: result.data.map((job, index) => ({
            id: job._id, // Job ID - use this for get_job_details tool
            index: index + 1, // Position in list (1-based) for "first job", "second job" references
            source: job.source,
            title: job.title,
            company: job.company,
            location: job.location || 'Not specified',
            workMode: (job.workMode as string) || 'Not specified',
            jobType: job.jobType,
            salaryRange: job.salaryMin && job.salaryMax
              ? `$${job.salaryMin.toLocaleString()}-$${job.salaryMax.toLocaleString()}`
              : job.salaryMin
                ? `$${job.salaryMin.toLocaleString()}+`
                : job.salaryMax
                  ? `Up to $${job.salaryMax.toLocaleString()}`
                  : 'Not specified',
            tags: job.tags,
            url: job.url,
            description: job.description.substring(0, 200) + '...', // Truncate for tool response
          })),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Return a clear error message that the agent can understand
        return JSON.stringify({
          success: false,
          error: errorMessage,
          totalJobs: 0,
          jobsFound: 0,
          jobs: [],
          message: `Unable to search jobs: ${errorMessage}. Please check your connection or try again.`,
        });
      }
    },
  });
}
