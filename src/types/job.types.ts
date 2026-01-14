/**
 * Job Type Definitions
 * Matches backend JobResponseDto structure
 */

export interface JobListing {
  _id: string;
  source: string;
  title: string;
  company: string;
  description: string;
  url: string;
  logo: string;
  location?: string;
  salaryMax?: number | null;
  salaryMin?: number | null;
  jobType: string;
  tags: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  isCompanyEmail?: boolean;
  companyEmail?: string;
  emailSubject?: string;
  userFirstName?: string;
}

export interface PaginationMeta {
  itemsPerPage: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface PaginationLinks {
  first: string;
  last: string;
  current: string;
  next: string;
  prev: string;
}

export interface PaginatedJobsResponse {
  data: JobListing[];
  meta: PaginationMeta;
  links: PaginationLinks;
}
