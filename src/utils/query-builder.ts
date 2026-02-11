/**
 * Query Builder
 * Converts natural language intent to structured job queries
 * Uses LangChain with structured output for intent extraction
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { config } from '../config/config.js';
import { GetJobsQueryDto, WorkMode, SortBy, SortOrder } from '../types/query.types.js';

/**
 * Intent extraction schema for structured output
 */
const IntentExtractionSchema = z.object({
  searchTerm: z
    .string()
    .optional()
    .describe(
      'Job role, title, or keywords. For specific roles use one term (e.g. "software engineer"). For broad categories (e.g. "media roles", "tech jobs") expand into specific job titles as a pipe-separated list so search matches any of them (e.g. "graphic design|photography|video editor|social media manager|content creator").'
    ),
  location: z
    .string()
    .optional()
    .describe('Location preference if mentioned (e.g., "San Francisco", "Remote", "New York")'),
  salaryMin: z
    .number()
    .optional()
    .describe('Minimum salary in USD if mentioned (extract numeric value, e.g., 80000 for "$80k" or "80,000")'),
  salaryMax: z
    .number()
    .optional()
    .describe('Maximum salary in USD if mentioned (extract numeric value, e.g., 120000 for "$120k")'),
  jobType: z
    .enum(['Full-time', 'Part-time', 'Contract', 'Freelance'])
    .optional()
    .describe('Job type if mentioned (full-time, part-time, contract, freelance)'),
  workMode: z
    .enum(['Remote', 'On-site', 'Hybrid'])
    .optional()
    .describe('Work mode if mentioned (remote, on-site, hybrid)'),
  experienceLevel: z
    .enum(['Junior', 'Mid', 'Senior'])
    .optional()
    .describe('Experience level if explicitly mentioned (junior, mid, senior, lead, principal)'),
  keywords: z
    .array(z.string())
    .optional()
    .describe('Technical skills or keywords mentioned (e.g., ["React", "Node.js", "Python"])'),
});

type ExtractedIntent = z.infer<typeof IntentExtractionSchema>;

/**
 * Initialize the LLM model for intent extraction
 */
function createIntentModel(): ChatOpenAI {
  return new ChatOpenAI({
    model: config.agentModel,
    temperature: config.agentTemperature,
    apiKey: config.openaiApiKey,
  });
}

/**
 * Extract intent from natural language using LLM with structured output
 */
export async function extractIntent(
  userMessage: string
): Promise<ExtractedIntent> {
  const model = createIntentModel();
  const structuredModel = model.withStructuredOutput(IntentExtractionSchema, {
    name: 'JobSearchIntent',
  });

  const systemPrompt = `You are an intent extraction system for a job search platform.
Your task is to extract structured information from user messages about job searches.

Rules:
- Only extract information that is EXPLICITLY mentioned in the user message, with one exception below.
- Do NOT assume or infer missing attributes (except for broad categories).
- If a value is ambiguous or unclear, omit it.
- **Broad job categories:** When the message describes a broad category (e.g. "media roles", "tech jobs", "creative jobs", "healthcare", "something in design"), expand it into specific job titles or keywords that commonly appear in job listings. Put the expanded list in searchTerm as a pipe-separated list (e.g. "graphic design|photography|video editor|social media manager|content creator") so the search can match any of these terms. Do not return the broad phrase verbatim if it is unlikely to match real job titles.
- For salary, convert text to numeric USD values (e.g., "$80k" → 80000, "six figures" → 100000)
- For job type, map variations: "full-time"/"full time"/"FT" → "Full-time"
- For work mode, map: "remote"/"work from home"/"WFH" → "Remote", "on-site"/"onsite"/"office" → "On-site"
- For experience, map: "junior"/"jr"/"entry-level" → "Junior", "mid"/"intermediate" → "Mid", "senior"/"sr"/"lead"/"principal" → "Senior"
- Extract technical skills as keywords array
- If location is mentioned as "remote" or similar, set workMode to "Remote" instead of location

Example of broad category expansion:
- Input: "can you find me a media role" or "media roles"
- Output searchTerm: "graphic design|photography|video editor|social media|content creator|videographer|media coordinator"`;

  try {
    const result = await structuredModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.log('[QUERY BUILDER DEBUG] Extracted intent:', JSON.stringify(result, null, 2));
    }
    return result;
  } catch (error) {
    // Fallback: return empty intent if extraction fails
    console.error('Intent extraction failed:', error);
    return {};
  }
}

/**
 * Normalize search term for common job title patterns
 * Handles hyphenation for better search results
 */
function normalizeSearchTerm(term: string): string {
  // Common multi-word job titles that should be hyphenated
  const hyphenatedPatterns: Record<string, string> = {
    'full stack': 'full-stack',
    'front end': 'front-end',
    'back end': 'back-end',
    'graphic designer': 'graphic-designer',
    'graphics designer': 'graphics-designer',
    'web developer': 'web-developer',
    'software engineer': 'software-engineer',
    'data scientist': 'data-scientist',
    'product manager': 'product-manager',
    'project manager': 'project-manager',
    'ui ux': 'ui-ux',
  };
  
  let normalized = term.toLowerCase();
  
  // Replace multi-word patterns with hyphenated versions
  for (const [pattern, replacement] of Object.entries(hyphenatedPatterns)) {
    normalized = normalized.replace(new RegExp(pattern, 'gi'), replacement);
  }
  
  return normalized;
}

/**
 * Normalize extracted intent to match backend query structure
 */
export function normalizeIntent(intent: ExtractedIntent): Partial<GetJobsQueryDto> {
  const query: Partial<GetJobsQueryDto> = {};

  // Search term: combine role and keywords (avoid duplicates)
  if (intent.searchTerm || intent.keywords) {
    const parts: string[] = [];
    const seen = new Set<string>();
    
    if (intent.searchTerm) {
      // Pipe-separated terms are from broad-category expansion: use as-is so backend regex OR works
      const isExpanded = intent.searchTerm.includes('|');
      const normalizedTerm = isExpanded
        ? intent.searchTerm.trim()
        : normalizeSearchTerm(intent.searchTerm);
      parts.push(normalizedTerm);
      // Add words from searchTerm to seen set to avoid duplicates
      normalizedTerm.toLowerCase().split(/\s+/).forEach(word => seen.add(word));
    }
    
    if (intent.keywords && intent.keywords.length > 0) {
      // Only add keywords that aren't already in searchTerm
      for (const keyword of intent.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (!seen.has(keywordLower)) {
          parts.push(keyword);
          seen.add(keywordLower);
        }
      }
    }
    
    if (parts.length > 0) {
      query.searchTerm = parts.join(' ');
    }
  }

  // Location
  if (intent.location) {
    // If location is "remote" or similar, prefer workMode instead
    const locationLower = intent.location.toLowerCase();
    if (locationLower.includes('remote') || locationLower.includes('wfh')) {
      query.workMode = WorkMode.REMOTE;
    } else {
      query.location = intent.location;
    }
  }

  // Work mode
  if (intent.workMode) {
    query.workMode = intent.workMode as WorkMode;
  }

  // Salary range
  if (intent.salaryMin !== undefined) {
    query.salaryMin = intent.salaryMin;
  }
  if (intent.salaryMax !== undefined) {
    query.salaryMax = intent.salaryMax;
  }

  // Job type
  if (intent.jobType) {
    query.jobType = intent.jobType;
  }

  // Experience level
  if (intent.experienceLevel) {
    query.experienceLevel = intent.experienceLevel;
  }

  // Default pagination
  query.page = 1;
  query.limit = 10;

  // Default sorting (most recent first)
  query.sortBy = SortBy.CREATED_AT;
  query.sortOrder = SortOrder.DESC;

  // Default date filter: last 7 days (convert to ISO string)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  query.startDate = sevenDaysAgo.toISOString();

  return query;
}

/**
 * Build query from natural language message
 * Main entry point for converting user input to structured query
 */
export async function buildQueryFromMessage(
  userMessage: string
): Promise<GetJobsQueryDto> {
  // Extract intent using LLM
  const intent = await extractIntent(userMessage);

  // Normalize to backend query structure
  const query = normalizeIntent(intent);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[QUERY BUILDER DEBUG] Final query:', JSON.stringify(query, null, 2));
  }

  return query as GetJobsQueryDto;
}

/**
 * Build query from explicit filters (for programmatic use)
 */
export function buildQueryFromFilters(
  filters: Partial<GetJobsQueryDto>
): GetJobsQueryDto {
  return {
    page: filters.page || 1,
    limit: filters.limit || 10,
    sortBy: filters.sortBy || SortBy.CREATED_AT,
    sortOrder: filters.sortOrder || SortOrder.DESC,
    ...filters,
  } as GetJobsQueryDto;
}
