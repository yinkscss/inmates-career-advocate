/**
 * Enum Normalizer
 * Normalizes string values to match backend enum expectations
 */

import { WorkMode } from '../types/query.types.js';

/**
 * Normalize workMode to match backend enum values
 * Backend expects: "Remote", "On-site", "Hybrid" (capitalized)
 */
export function normalizeWorkMode(value: string | null | undefined): WorkMode | undefined {
  if (!value || typeof value !== 'string') return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  switch (normalized) {
    case 'remote':
    case 'wfh':
    case 'work from home':
      return WorkMode.REMOTE;
    case 'on-site':
    case 'onsite':
    case 'office':
    case 'on site':
      return WorkMode.ONSITE;
    case 'hybrid':
      return WorkMode.HYBRID;
    default:
      return undefined;
  }
}

/**
 * Normalize jobType to match backend enum values
 * Backend expects: "Full-time", "Part-time", "Contract", "Freelance" (capitalized with hyphens)
 */
export function normalizeJobType(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  switch (normalized) {
    case 'full-time':
    case 'full time':
    case 'fulltime':
    case 'ft':
      return 'Full-time';
    case 'part-time':
    case 'part time':
    case 'parttime':
    case 'pt':
      return 'Part-time';
    case 'contract':
    case 'contractor':
      return 'Contract';
    case 'freelance':
    case 'freelancer':
      return 'Freelance';
    default:
      return undefined;
  }
}

/**
 * Normalize experienceLevel to match backend enum values
 * Backend expects: "Junior", "Mid", "Senior" (capitalized)
 */
export function normalizeExperienceLevel(value: string | null | undefined): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  
  const normalized = value.toLowerCase().trim();
  
  switch (normalized) {
    case 'junior':
    case 'jr':
    case 'entry':
    case 'entry-level':
    case 'entry level':
      return 'Junior';
    case 'mid':
    case 'mid-level':
    case 'mid level':
    case 'intermediate':
      return 'Mid';
    case 'senior':
    case 'sr':
    case 'lead':
    case 'principal':
      return 'Senior';
    default:
      return undefined;
  }
}
