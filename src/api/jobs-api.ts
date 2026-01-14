/**
 * Jobs API Integration
 * Methods for calling inmates-backend jobs endpoints
 */

import { backendApiClient } from './client.js';
import { JobListing, PaginatedJobsResponse } from '../types/job.types.js';
import { GetJobsQueryDto } from '../types/query.types.js';
import { ApiEnvelope } from '../types/api.types.js';

export interface JobsApiClient {
  searchJobs(
    filters: GetJobsQueryDto,
    token: string
  ): Promise<PaginatedJobsResponse>;
  getJobById(jobId: string, token: string): Promise<JobListing>;
}

class JobsApiClientImpl implements JobsApiClient {
  /**
   * Search jobs with filters
   * Calls GET /jobs/all-jobs
   */
  async searchJobs(
    filters: GetJobsQueryDto,
    token: string
  ): Promise<PaginatedJobsResponse> {
    // Build query parameters
    const params: Record<string, unknown> = {};

    // Pagination
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;

    // Date filters
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    // Search filters
    if (filters.searchTerm) params.searchTerm = filters.searchTerm;
    if (filters.location) params.location = filters.location;
    if (filters.salaryMin !== undefined) params.salaryMin = filters.salaryMin;
    if (filters.salaryMax !== undefined) params.salaryMax = filters.salaryMax;
    if (filters.jobType) params.jobType = filters.jobType;
    if (filters.workMode) params.workMode = filters.workMode;
    if (filters.experienceLevel) params.experienceLevel = filters.experienceLevel;

    // Sorting
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await backendApiClient.get<ApiEnvelope<PaginatedJobsResponse>>(
      '/jobs/all-jobs',
      token,
      params
    );

    // Backend wraps payload in { success, data }
    return response.data;
  }

  /**
   * Get single job by ID
   * Calls GET /jobs/:id
   */
  async getJobById(jobId: string, token: string): Promise<JobListing> {
    const response = await backendApiClient.get<ApiEnvelope<JobListing>>(
      `/jobs/${jobId}`,
      token
    );
    return response.data;
  }
}

// Export singleton instance
export const jobsApiClient = new JobsApiClientImpl();
