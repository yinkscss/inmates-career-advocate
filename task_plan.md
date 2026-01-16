# Task Plan: Conversational Job Discovery Agent - Phase 1

## Goal
Set up the TypeScript project infrastructure for the Inmates Career Advocate standalone API service, including project structure, dependencies, and configuration files.

## Current Phase
Pre-Phase 7: Conversational History Testing (✅ COMPLETE - Ready for Phase 7)

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
- [x] Set up LangChain agent
- [x] Implement search_jobs tool
- [x] Implement get_job_details tool
- [x] Create agent prompts
- [x] Create agent service for orchestration
- [x] Create test script for agent
- **Status:** ✅ COMPLETE

### Phase 5: Response Generation & Formatting
- [x] Implement response formatter utility
- [x] Add comprehensive error handling
- [x] Complete chat endpoint implementation
- [x] Add response synthesis helpers
- **Status:** ✅ COMPLETE

### Phase 6: Testing & Validation
- [x] Write unit tests for query extraction logic
- [x] Write unit tests for query normalization
- [x] Write unit tests for API client error handling
- [x] Write unit tests for response formatting (already in Phase 5)
- [x] Write integration tests for agent validation
- [x] Write validation tests for zero hallucinations
- [x] Write validation tests for deterministic queries
- [x] Write validation tests for grounded responses
- [x] Write validation tests for natural conversation
- [x] Create test runner for all tests
- **Status:** ✅ COMPLETE

### Pre-Phase 7: Conversational History Testing
- [x] Create test suite for conversational history
- [x] Enhance agent prompts for ID extraction
- [x] Enhance tool descriptions for better ID handling
- [x] Add index field to search results for positional references
- [x] Fix job ID extraction from conversation history
  - [x] Enhanced agent prompt to include job IDs in responses
  - [x] Enhanced response formatter to include job IDs
  - [x] Added automatic job ID injection in agent service
  - [x] Enhanced get_job_details tool error handling
- [x] Run tests and verify behavior
- **Status:** ✅ COMPLETE
- **Test Results:** 12 passed, 0 failed
- **Key Achievements:**
  - Agent successfully extracts job IDs from conversation history
  - Agent handles various phrasings ("first job", "job number 1", direct IDs)
  - Agent successfully calls get_job_details with valid IDs
  - Agent provides detailed job descriptions and application guidance

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
| TypeScript deep instantiation errors with DynamicStructuredTool | 1 | Added @ts-expect-error comments (known TypeScript limitation) |
| Message type compatibility issues | 1 | Fixed type guards and message format conversion |
| Structured filters ignored when query parameter present | 1 | Implemented filter merging logic to preserve explicit structured filters |
| Jobs not extracted from agent responses | 1 | Improved extractJobsFromMessages() to handle LangGraph BaseMessage types and tool message structure |
| Jobs still not extracted (role check issue) | 2 | Fixed extraction to check `name` property instead of `role === 'tool'` (LangGraph doesn't set role on tool messages) |
| Query normalization tests failing | 1 | Fixed tests to use buildQueryFromMessage (end-to-end) instead of calling normalizeIntent directly with raw objects |
| API client error tests failing | 1 | Fixed tests to expect ApiError objects (not Error instances) as API client throws ApiError objects |

## Notes
- Following LangChain TypeScript skill patterns
- Using planning-with-files pattern for task management
- All code must integrate with existing inmates-backend API structure
