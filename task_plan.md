# Task Plan: Conversational Job Discovery Agent - Phase 1

## Goal
Set up the TypeScript project infrastructure for the Inmates Career Advocate standalone API service, including project structure, dependencies, and configuration files.

## Current Phase
Phase 4: LangChain Agent Implementation

## Phases

### Phase 1: Project Setup & Infrastructure
- [x] Create planning files (task_plan.md, findings.md, progress.md)
- [x] Initialize Node.js project with TypeScript
- [x] Set up build configuration (tsconfig.json)
- [x] Configure package.json with scripts
- [x] Set up ESLint and Prettier
- [x] Create project directory structure
- [x] Set up environment configuration (.env.example)
- [x] Create placeholder files for all modules
- [x] Install dependencies (run `npm install`) ✅
- [x] Create .env file ✅
- [x] Verify TypeScript compilation ✅
- **Status:** ✅ COMPLETE

### Phase 2: Backend API Integration
- [x] Implement API client for backend calls
- [x] Implement jobs API integration
- [x] Set up authentication utilities
- [x] Create type definitions
- [x] Update health check to use backend API client
- [x] Fix API response envelope handling (success/data wrapper)
- **Status:** ✅ COMPLETE

### Phase 3: Natural Language to Query Mapping
- [x] Implement intent extraction with LangChain structured output
- [x] Implement query normalization
- [x] Create query builder utility
- [x] Test script created for verification
- **Status:** ✅ COMPLETE

### Phase 4: LangChain Agent Implementation
- [ ] Set up LangChain agent
- [ ] Implement search_jobs tool
- [ ] Implement get_job_details tool
- [ ] Create agent prompts
- **Status:** pending (next phase)

### Phase 5: Response Generation & Formatting
- [ ] Implement response formatter
- [ ] Add error handling
- [ ] Create response synthesis logic
- **Status:** pending

### Phase 6: Testing & Validation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Validate against requirements
- **Status:** pending

### Phase 7: API Server Implementation
- [ ] Set up Express/Fastify server
- [ ] Implement chat endpoint
- [ ] Implement authentication middleware
- [ ] Implement session management
- [ ] Add health check endpoint
- **Status:** pending

## Key Questions
1. Should we use Express or Fastify? → Decision: Express (more common, easier to find examples)
2. Which LLM provider? → Decision: OpenAI (gpt-4o-mini for cost-effectiveness)
3. Session storage: In-memory or Redis? → Decision: Start with in-memory, add Redis later if needed

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Express over Fastify | More widely used, easier to find examples and support |
| OpenAI gpt-4o-mini | Cost-effective, fast, good tool-calling support |
| In-memory sessions initially | Simpler for MVP, can migrate to Redis later |
| TypeScript strict mode | Better type safety and error catching |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Backend API response wrapped in envelope | 1 | Added ApiEnvelope<T> type and unwrap response.data |
| JWT token format invalid | 1 | Added token cleaning (trim, remove quotes) |
| SearchTerm duplication (keywords + searchTerm) | 1 | Added deduplication logic using Set |

## Notes
- Following LangChain TypeScript skill patterns
- Using planning-with-files pattern for task management
- All code must integrate with existing inmates-backend API structure
