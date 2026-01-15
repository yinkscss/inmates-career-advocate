# Findings & Decisions

## Requirements
- Build conversational AI agent for job discovery using natural language
- Standalone API service that frontend can call
- Integrates with existing inmates-backend API for job data
- Uses LangChain TypeScript for agent implementation
- Must be grounded in backend data (no hallucinations)
- Session-scoped memory only (no long-term persistence)

## Research Findings

### Backend API Structure
- **Jobs Endpoint**: `GET /jobs/all-jobs` with query parameters:
  - `searchTerm`, `location`, `salaryMin`, `salaryMax`, `jobType`, `workMode`, `experienceLevel`, `page`, `limit`, `sortBy`, `sortOrder`
- **Job Details**: `GET /jobs/:id`
- **Authentication**: JWT Bearer token required
- **Caching**: Redis with 30-day TTL via JobCacheService

### Job Entity Structure
- Fields: `source`, `title`, `company`, `description`, `url`, `logo`, `location`, `salaryMin`, `salaryMax`, `jobType`, `workMode`, `tags`, `createdAt`, `updatedAt`
- Text search index on `title` and `description`

### LangChain TypeScript Patterns
- Use `@langchain/core` for core types
- Use `@langchain/openai` for OpenAI integration
- Use `createReactAgent` or custom agent with tools
- Tools should return structured data
- Agent should use low temperature (0.1) for deterministic responses

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Express for API server | More common, easier to find examples, good middleware ecosystem |
| OpenAI gpt-4o-mini | Cost-effective ($0.15/$0.60 per 1M tokens), fast, good tool-calling |
| In-memory session storage (MVP) | Simpler setup, can migrate to Redis for production |
| TypeScript strict mode | Better type safety, catches errors early |
| Zod for validation | Type-safe schema validation, works well with TypeScript |
| Axios for HTTP client | Reliable, good TypeScript support, easy error handling |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| .env.example file filtered by gitignore | Created manually, will be tracked in git |
| TypeScript ESM module resolution | Used .js extensions in imports (TypeScript requirement for ESM) |
| Missing controllers directory | Created src/controllers/ directory |
| TypeScript unused parameter warnings | Prefixed unused parameters with `_` (standard convention) |
| Backend API response wrapped in envelope | Added ApiEnvelope<T> type and unwrap response.data in jobs-api.ts |
| JWT token format issues | Added token cleaning (trim, remove quotes) and better error messages |
| Token extraction from curl response | Created extract-token.ts helper script |

## Resources
- Roadmap: `inmates-career-advocate/roadmap.md`
- Requirements: `inmates-career-advocate/requirements.md`
- LangChain Skill: `.claude/skills/langchain-typescript/SKILL.md`
- Backend API: `inmates-backend/src/jobs/controllers/jobs.controller.ts`
- Job Entity: `inmates-backend/src/jobs/entities/job.entity.ts`

## Visual/Browser Findings
- N/A - Working from codebase analysis

## Phase 1 Completion Summary
- ✅ Created complete TypeScript project structure
- ✅ Set up Express server with routes and middleware
- ✅ Configured ESLint, Prettier, and TypeScript
- ✅ Created all placeholder files for future phases
- ✅ Set up configuration management system
- ✅ Added authentication middleware skeleton
- ✅ Created health check endpoint
- ✅ Project ready for dependency installation

## Phase 2 Completion Summary
- ✅ Created comprehensive type definitions matching backend structure
- ✅ Implemented BackendApiClient with axios, error handling, and interceptors
- ✅ Implemented JobsApiClient with searchJobs and getJobById methods
- ✅ Created JWT authentication utilities
- ✅ Updated health check to test backend connectivity
- ✅ All TypeScript types match backend DTOs exactly
- ✅ Error handling with proper error types
- ✅ Fixed API response envelope handling (backend wraps responses in { success, data })
- ✅ API communication verified and working
- ✅ Ready for Phase 3: Natural Language to Query Mapping

## Phase 3 Implementation Summary
- ✅ Implemented intent extraction using LangChain with structured output (Zod schemas)
- ✅ Created query normalization to match backend enum values
- ✅ Built query builder utility with extractIntent and normalizeIntent functions
- ✅ Added test script for query builder verification
- ✅ Uses OpenAI gpt-4o-mini with low temperature (0.1) for deterministic extraction

## Phase 4 Implementation Summary
- ✅ Implemented LangChain ReAct agent using createReactAgent
- ✅ Created search_jobs tool with DynamicStructuredTool
  - Accepts natural language queries or structured filters
  - Uses query builder for intent extraction
  - Calls backend API and formats results
  - Handles API errors gracefully
- ✅ Created get_job_details tool for retrieving specific job information
- ✅ Created comprehensive agent prompts emphasizing grounding
- ✅ Built AgentService for orchestrating agent execution
- ✅ Tools return JSON strings for agent consumption
- ✅ Agent extracts jobs from tool results automatically
- ✅ Fixed Zod schema warnings (added .nullable() for OpenAI compatibility)
- ✅ Increased recursion limit to 50 for complex queries
- ✅ All TypeScript compilation verified

## Testing Results
- ✅ Agent successfully calls tools
- ✅ Agent handles errors gracefully when backend is unavailable
- ✅ Agent provides helpful error messages to users
- ⚠️  Backend must be running for full functionality
- ⚠️  Zod schema warnings (non-blocking, will be deprecated in future SDK versions)

---
*Update this file after every 2 view/browser/search operations*
