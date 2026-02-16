/**
 * Search Jobs Tool
 * LangChain tool for searching jobs via backend API
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { jobsApiClient } from '../../api/jobs-api.js';
import { buildQueryFromMessage, buildQueryFromFilters } from '../../utils/query-builder.js';
import { GetJobsQueryDto } from '../../types/query.types.js';
import { normalizeWorkMode, normalizeJobType, normalizeExperienceLevel } from '../../utils/enum-normalizer.js';
import type { AgentOptions } from '../job-discovery-agent.js';

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
 * Create search jobs tool with JWT token and options
 * The tool accepts either natural language or structured filters
 * @param token - JWT token for authentication
 * @param options - Agent options including pagination context
 */
export function createSearchJobsTool(token: string, options?: AgentOptions) {
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
          
          // Apply pagination from context if available
          if (options?.currentPage) {
            query.page = options.currentPage;
            if (process.env.NODE_ENV === 'development') {
              console.log('[TOOL DEBUG] Using page from context:', options.currentPage);
            }
          }
          
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
            const normalized = normalizeJobType(input.jobType);
            if (normalized) structuredFilters.jobType = normalized;
          }
          if (input.workMode && !query.workMode) {
            const normalized = normalizeWorkMode(input.workMode);
            if (normalized) structuredFilters.workMode = normalized;
          }
          if (input.experienceLevel && !query.experienceLevel) {
            const normalized = normalizeExperienceLevel(input.experienceLevel);
            if (normalized) structuredFilters.experienceLevel = normalized;
          }
          // Pagination: structured filters take precedence if provided
          if (input.page !== undefined) {
            structuredFilters.page = input.page;
          }
          if (input.limit !== undefined) {
            structuredFilters.limit = input.limit;
          }

          // Merge structured filters into the query
          // IMPORTANT: Remove 'page' from structured filters - page should ONLY come from context
          // The LLM sometimes passes 'page' which would override our pagination logic
          if (Object.keys(structuredFilters).length > 0) {
            const { page: _ignoredPage, ...filtersWithoutPage } = structuredFilters;
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[TOOL DEBUG] Merging structured filters:', JSON.stringify(filtersWithoutPage, null, 2));
              if (_ignoredPage !== undefined) {
                console.log('[TOOL DEBUG] Ignored page from LLM (using context page instead):', _ignoredPage);
              }
            }
            
            query = { ...query, ...filtersWithoutPage };
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
          if (input.jobType) {
            const normalized = normalizeJobType(input.jobType);
            if (normalized) filters.jobType = normalized;
          }
          if (input.workMode) {
            const normalized = normalizeWorkMode(input.workMode);
            if (normalized) filters.workMode = normalized;
          }
          if (input.experienceLevel) {
            const normalized = normalizeExperienceLevel(input.experienceLevel);
            if (normalized) filters.experienceLevel = normalized;
          }
          if (input.page !== undefined) filters.page = input.page;
          if (input.limit !== undefined) filters.limit = input.limit;

          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Structured filters:', JSON.stringify(filters, null, 2));
          }
          query = buildQueryFromFilters(filters);
          
          // Apply pagination from context if available
          if (options?.currentPage) {
            query.page = options.currentPage;
            if (process.env.NODE_ENV === 'development') {
              console.log('[TOOL DEBUG] Using page from context:', options.currentPage);
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[TOOL DEBUG] Built query from filters:', JSON.stringify(query, null, 2));
          }
        }

        // Call the backend API with retry logic AND smart pagination
        const allJobs: any[] = [];
        let currentPageToFetch = query.page || 1;
        const maxPagesToFetch = options?.maxPages || 100; // High limit, rely on backend metadata
        const targetJobCount = 20; // Fetch ~20 jobs per search (good balance)
        let totalJobsAvailable = 0;
        let totalPages = 1;
        let lastSuccessfulPage = 0; // Track the actual last page we fetched
        let consecutiveEmptyPages = 0; // Track consecutive pages with 0 results
        const maxConsecutiveEmptyPages = 3; // Reduced from 5 - stop faster if truly empty
        
        // Smart pagination: Use backend metadata to stop efficiently
        while (currentPageToFetch <= maxPagesToFetch && allJobs.length < targetJobCount) {
          // Update query page for this fetch
          const pageQuery = { ...query, page: currentPageToFetch };
          
          let result;
          let retryCount = 0;
          const maxRetries = 2;
          
          // Retry logic for each page fetch
          while (retryCount <= maxRetries) {
            try {
              result = await jobsApiClient.searchJobs(pageQuery, token);
              break; // Success, exit retry loop
            } catch (apiError) {
              retryCount++;
              
              // Check if this is a validation error we can fix
              const errorObj = apiError as { statusCode?: number; message?: string | string[] };
              const isValidationError = errorObj.statusCode === 400;
              const errorMessage = Array.isArray(errorObj.message) 
                ? errorObj.message.join(', ') 
                : (errorObj.message || '');
              
              if (isValidationError && retryCount <= maxRetries) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[TOOL DEBUG] Validation error on attempt ${retryCount}, checking for fixes...`);
                  console.log(`[TOOL DEBUG] Error message:`, errorMessage);
                }
                
                // Wait a bit before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
                continue;
              }
              
              // If we've exhausted retries or it's not a fixable error, return error response
              const errorMsg = errorObj.message 
                ? (Array.isArray(errorObj.message) ? errorObj.message.join(', ') : errorObj.message)
                : 'Unknown API error';
                
              if (process.env.NODE_ENV === 'development') {
                console.log(`[TOOL DEBUG] API error after ${retryCount} retries:`, errorMsg);
              }
              
              return JSON.stringify({
                success: false,
                error: `Backend API error: ${errorMsg}`,
                totalJobs: 0,
                jobsFound: 0,
                jobs: [],
                message: 'Unable to connect to job database. Please try again later.',
              });
            }
          }
          
          // If we got a result, add jobs to collection
          if (result && result.data && result.data.length > 0) {
            allJobs.push(...result.data);
            totalJobsAvailable = result.meta.totalItems;
            totalPages = result.meta.totalPages;
            lastSuccessfulPage = currentPageToFetch; // Track this as the last successful fetch
            consecutiveEmptyPages = 0; // Reset empty page counter
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[TOOL DEBUG] Fetched page ${currentPageToFetch}: ${result.data.length} jobs (total: ${allJobs.length}/${totalJobsAvailable}, pages: ${currentPageToFetch}/${totalPages})`);
            }
            
            // SMART STOP: Check if we've reached the last page based on backend metadata
            if (currentPageToFetch >= totalPages) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[TOOL DEBUG] Reached last page (${currentPageToFetch}/${totalPages}), stopping pagination`);
              }
              break;
            }
            
            // Continue if we haven't reached target job count and there are more pages
          } else {
            // No results on this page
            consecutiveEmptyPages++;
            totalJobsAvailable = result?.meta?.totalItems || 0;
            totalPages = result?.meta?.totalPages || 1;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[TOOL DEBUG] Page ${currentPageToFetch} empty (${consecutiveEmptyPages}/${maxConsecutiveEmptyPages}). Total jobs available: ${totalJobsAvailable}`);
            }
            
            // OPTIMIZATION: If backend says 0 total jobs, stop immediately
            if (totalJobsAvailable === 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[TOOL DEBUG] Backend reports 0 total jobs, stopping immediately`);
              }
              break;
            }
            
            // Stop if we've hit consecutive empty pages OR exceeded backend's totalPages
            if (consecutiveEmptyPages >= maxConsecutiveEmptyPages || currentPageToFetch >= totalPages) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[TOOL DEBUG] Stopping: ${consecutiveEmptyPages >= maxConsecutiveEmptyPages ? 'consecutive empty pages' : 'exceeded totalPages'}`);
              }
              break;
            }
            
            // Otherwise, continue to next page (might have results there)
            if (process.env.NODE_ENV === 'development') {
              console.log(`[TOOL DEBUG] Continuing to next page...`);
            }
          }
          
          // Move to next page for auto-pagination
          currentPageToFetch++;
        }

        // Check if we got any results - if not, try broadening the search
        if (allJobs.length === 0 && totalJobsAvailable === 0) {
          // AUTO-BROADENING: Try removing filters one by one to find jobs
          const broadeningStrategies = [
            { filter: 'experienceLevel', name: 'experience level requirement' },
            { filter: 'workMode', name: 'work mode requirement' },
            { filter: 'jobType', name: 'job type requirement' },
            { filter: 'salaryMin', name: 'minimum salary requirement' },
          ];
          
          for (const strategy of broadeningStrategies) {
            // Skip if this filter wasn't in the original query
            if (!(strategy.filter in query)) continue;
            
            // Create a broadened query without this filter
            const broadenedQuery = { ...query };
            delete broadenedQuery[strategy.filter as keyof GetJobsQueryDto];
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[TOOL DEBUG] No results found. Trying without ${strategy.name}...`);
            }
            
            // Try the broadened search
            try {
              const broadResult = await jobsApiClient.searchJobs(broadenedQuery, token);
              
              if (broadResult && broadResult.data && broadResult.data.length > 0) {
                // Found jobs with broadened search!
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[TOOL DEBUG] Found ${broadResult.data.length} jobs without ${strategy.name}!`);
                }
                
                return JSON.stringify({
                  success: true,
                  totalJobs: broadResult.meta.totalItems,
                  jobsFound: broadResult.data.length,
                  page: 1,
                  finalPage: 1,
                  totalPages: broadResult.meta.totalPages,
                  broadened: true,
                  removedFilter: strategy.name,
                  jobs: broadResult.data.map((job, index) => ({
                    id: job._id,
                    index: index + 1,
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
                    description: job.description.substring(0, 200) + '...',
                  })),
                });
              }
            } catch (error) {
              // If broadened search fails, continue to next strategy
              if (process.env.NODE_ENV === 'development') {
                console.log(`[TOOL DEBUG] Broadened search failed, trying next strategy...`);
              }
              continue;
            }
          }
          
          // If all broadening strategies failed, return 0 results
          return JSON.stringify({
            success: true,
            totalJobs: 0,
            jobsFound: 0,
            message: 'No jobs found matching the criteria, even with broadened search',
            jobs: [],
            finalPage: lastSuccessfulPage,
          });
        }

        // Format response for the agent with combined results
        // IMPORTANT: Include job IDs prominently so agent can extract them for follow-up questions
        return JSON.stringify({
          success: true,
          totalJobs: totalJobsAvailable,
          jobsFound: allJobs.length,
          page: query.page || 1,
          finalPage: lastSuccessfulPage, // Last page that was actually fetched successfully
          totalPages: totalPages,
          jobs: allJobs.map((job, index) => ({
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
