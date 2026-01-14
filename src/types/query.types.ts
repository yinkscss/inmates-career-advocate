/**
 * Query Type Definitions
 * Types for job search queries matching backend GetJobsQueryDto
 */

export enum SortBy {
  CREATED_AT = 'createdAt',
  SALARY = 'salaryMax',
  SALARY_MIN = 'salaryMin',
  TITLE = 'title',
  COMPANY = 'company',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum WorkMode {
  REMOTE = 'Remote',
  ONSITE = 'On-site',
  HYBRID = 'Hybrid',
}

export interface GetJobsQueryDto {
  // Pagination
  page?: number;
  limit?: number;

  // Date filters
  startDate?: string;
  endDate?: string;

  // Search filters
  searchTerm?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  workMode?: WorkMode;
  experienceLevel?: string;

  // Sorting
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}
