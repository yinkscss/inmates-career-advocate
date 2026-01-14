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

---
*Update this file after every 2 view/browser/search operations*
