/**
 * Response Formatter
 * Utilities for formatting job results and responses
 */

import type { JobListing } from '../types/job.types.js';

/**
 * Format a single job listing for display
 * Includes job ID for conversational history reference
 */
export function formatJobSummary(job: JobListing): string {
  const parts: string[] = [];

  // Title and company with job ID
  parts.push(`**${job.title}**`);
  if (job.company) {
    parts.push(`at ${job.company}`);
  }
  // Include job ID for conversational reference
  if (job._id) {
    parts.push(`(ID: ${job._id})`);
  }

  // Location
  if (job.location) {
    parts.push(`- Location: ${job.location}`);
  }

  // Work mode
  if (job.workMode) {
    parts.push(`- Work Mode: ${job.workMode}`);
  }

  // Job type
  if (job.jobType && job.jobType !== 'Unknown') {
    parts.push(`- Type: ${job.jobType}`);
  }

  // Salary range
  if (job.salaryMin || job.salaryMax) {
    const salaryRange = formatSalaryRange(job.salaryMin, job.salaryMax);
    parts.push(`- Salary: ${salaryRange}`);
  }

  // Tags (if available)
  if (job.tags && job.tags.length > 0) {
    const relevantTags = job.tags.slice(0, 5).join(', ');
    parts.push(`- Tags: ${relevantTags}`);
  }

  return parts.join('\n');
}

/**
 * Format salary range for display
 */
export function formatSalaryRange(
  salaryMin?: number | null,
  salaryMax?: number | null
): string {
  if (salaryMin && salaryMax) {
    return `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}`;
  } else if (salaryMin) {
    return `$${salaryMin.toLocaleString()}+`;
  } else if (salaryMax) {
    return `Up to $${salaryMax.toLocaleString()}`;
  }
  return 'Not specified';
}

/**
 * Group jobs by category (e.g., by work mode, job type, or tags)
 */
export function groupJobsByCategory(
  jobs: JobListing[],
  category: 'workMode' | 'jobType' | 'location' = 'workMode'
): Record<string, JobListing[]> {
  const grouped: Record<string, JobListing[]> = {};

  for (const job of jobs) {
    let key: string;
    
    switch (category) {
      case 'workMode':
        key = job.workMode || 'Not specified';
        break;
      case 'jobType':
        key = job.jobType || 'Unknown';
        break;
      case 'location':
        key = job.location || 'Not specified';
        break;
      default:
        key = 'Other';
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(job);
  }

  return grouped;
}

/**
 * Format multiple jobs into a readable list
 */
export function formatJobsList(jobs: JobListing[]): string {
  if (jobs.length === 0) {
    return 'No jobs found.';
  }

  const parts: string[] = [];
  
  if (jobs.length === 1) {
    parts.push('I found 1 job for you:\n');
    parts.push(formatJobSummary(jobs[0]));
  } else {
    parts.push(`I found ${jobs.length} jobs for you:\n`);
    jobs.forEach((job, index) => {
      parts.push(`\n${index + 1}. ${formatJobSummary(job)}`);
    });
  }

  return parts.join('\n');
}

/**
 * Extract key attributes from a job for highlighting
 */
export function extractJobHighlights(job: JobListing): {
  remote?: boolean;
  highSalary?: boolean;
  popularCompany?: boolean;
  tags: string[];
} {
  return {
    remote: job.workMode === 'Remote',
    highSalary: (job.salaryMin ?? 0) >= 100000 || (job.salaryMax ?? 0) >= 100000,
    popularCompany: false, // Could be enhanced with company popularity data
    tags: job.tags || [],
  };
}

/**
 * Format error message for user-friendly display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return "I'm having trouble authenticating. Please check your login and try again.";
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return "I couldn't find what you're looking for. Could you try rephrasing your request?";
    }
    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return "I'm experiencing technical difficulties. Please try again in a moment.";
    }
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return "I'm having trouble connecting to the job database. Please check your connection and try again.";
    }
    // Generic error
    return `I encountered an issue: ${error.message}. Please try again.`;
  }
  return "I encountered an unexpected error. Please try again.";
}

/**
 * Format "no jobs found" message with suggestions
 */
export function formatNoJobsMessage(filters?: {
  searchTerm?: string;
  location?: string;
  workMode?: string;
  salaryMin?: number;
}): string {
  const suggestions: string[] = [];
  
  if (filters?.searchTerm) {
    suggestions.push(`- Try broadening your search terms (e.g., "developer" instead of "${filters.searchTerm}")`);
  }
  if (filters?.location) {
    suggestions.push(`- Consider remote positions or nearby locations`);
  }
  if (filters?.workMode && filters.workMode !== 'Remote') {
    suggestions.push(`- Try searching for remote positions`);
  }
  if (filters?.salaryMin && filters.salaryMin > 100000) {
    suggestions.push(`- Consider adjusting your salary expectations`);
  }

  let message = "I couldn't find any jobs matching your criteria.";
  
  if (suggestions.length > 0) {
    message += "\n\nHere are some suggestions:\n" + suggestions.join('\n');
  } else {
    message += "\n\nTry adjusting your search criteria or broadening your terms.";
  }

  return message;
}
