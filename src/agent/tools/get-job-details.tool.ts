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
- User asks about a specific job (e.g., "tell me more about job ID 123", "what's the first job?", "details on that job")
- User references a job from previous search results (e.g., "the first job", "job number 2", "that Python job")
- User wants to see full job description, requirements, or application details
- User needs complete information before applying

IMPORTANT: 
- Extract the job ID from previous search results in the conversation history
- Look for job IDs in the format "ID: [id]" or "Job ID: [id]" in previous assistant messages
- If user says "first job", look for the first job ID mentioned in previous search results (usually index: 1)
- If user says "second job", look for the second job ID mentioned
- If user provides a job ID directly (e.g., "job 696a1a3675d84991c4263b05"), use it exactly as provided
- Job IDs are typically long alphanumeric strings (e.g., "696a1a3675d84991c4263b05")
- Always use this tool to get fresh details - don't rely on memory from search results
- If you can't find a job ID, ask the user to specify which job they mean or provide the job ID

The tool returns comprehensive job information including:
- Full job description (complete, not truncated)
- Company details
- Salary range
- Required skills/tags
- Application URL (important for application guidance)
- Company contact email (if available)

When presenting job details:
- Summarize the key requirements and qualifications
- Highlight important skills or experience needed
- Always mention the application URL
- If company email is available, mention it as an alternative application method
- Provide guidance on how to apply (e.g., "You can apply by clicking the link above" or "Visit [URL] to apply")

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
        // Provide detailed error for debugging
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('[TOOL DEBUG] get_job_details error:', errorMessage);
          console.log('[TOOL DEBUG] Input jobId:', input.jobId);
        }
        
        return JSON.stringify({
          success: false,
          error: errorMessage,
          jobId: input.jobId, // Include jobId in error for debugging
        });
      }
    },
  });
}
