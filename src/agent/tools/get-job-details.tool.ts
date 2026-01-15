/**
 * Get Job Details Tool
 * LangChain tool for retrieving job details by ID
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { jobsApiClient } from '../../api/jobs-api.js';

// Simplified schema to avoid TypeScript deep instantiation issues
const GetJobDetailsInputSchema = z.object({
  jobId: z.string(),
});

/**
 * Create get job details tool with JWT token
 */
export function createGetJobDetailsTool(token: string) {
  // @ts-expect-error - TypeScript deep instantiation issue with complex Zod schemas
  return new DynamicStructuredTool({
    name: 'get_job_details',
    description: `Get detailed information about a specific job by its ID.
    
Use this tool when:
- User asks about a specific job (e.g., "tell me more about job ID 123")
- User wants to see full job description, requirements, or application details
- User needs complete information before applying

The tool returns comprehensive job information including:
- Full job description
- Company details
- Salary range
- Required skills/tags
- Application URL
- Company contact email (if available)

Always use this tool to get job details. Never make up job information.`,
    schema: GetJobDetailsInputSchema,
    func: async (input) => {
      try {
        const job = await jobsApiClient.getJobById(input.jobId, token);

        // Format response for the agent
        return JSON.stringify({
          success: true,
          job: {
            id: job._id,
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
            description: job.description,
            url: job.url,
            logo: job.logo,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            // Additional fields if available
            companyEmail: job.companyEmail,
            emailSubject: job.emailSubject,
            isCompanyEmail: job.isCompanyEmail,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: errorMessage,
        });
      }
    },
  });
}
