# Task Plan: Conversational Job Discovery Agent - Phase 1

## Goal
Set up the TypeScript project infrastructure for the Inmates Career Advocate standalone API service, including project structure, dependencies, and configuration files.

## Current Phase
Post-Phase 7.3.4: Auto-Broadening Search (✅ COMPLETE)

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
- [x] Set up Express/Fastify server (already existed, verified)
- [x] Implement chat endpoint (already existed, enhanced with session management)
- [x] Implement authentication middleware (already existed, verified)
- [x] Implement session management (conversation.service.ts)
- [x] Add health check endpoint (enhanced with LLM status)
- [x] Add request logging middleware
- **Status:** ✅ COMPLETE
- **Key Features:**
  - In-memory session management with 30-minute timeout
  - Automatic session cleanup every 5 minutes
  - Conversation history persistence per user
  - Enhanced health check with backend and LLM status
  - Request logging for development

### Post-Phase 7: Response Formatting & Quality Improvements
- [x] Update agent prompt for cleaner, more conversational responses
- [x] Implement duplicate job detection and filtering
- [x] Fix search term normalization for hyphenated job titles
- [x] Update frontend colors to match brand guidelines
- [x] Verify conversation history count accuracy
- **Status:** ✅ COMPLETE
- **Issues Addressed:**
  1. ✅ Agent responses too verbose/formal → Updated to conversational style
  2. ✅ Backend returning duplicate jobs → Implemented deduplication logic
  3. ✅ "graphics designer" normalization → Hyphenation support added
  4. ✅ Frontend purple colors → Updated to brand dark theme (peachy/tan accents)
- **Files Modified:**
  - `src/agent/prompts/agent-prompts.ts` - Conversational style
  - `src/services/agent.service.ts` - Job deduplication
  - `src/utils/query-builder.ts` - Hyphenated job titles
  - `Inmate-FrontEnd/src/Components/CareerAdvocate/CareerAdvocate.css` - Brand colors
- **Documentation:** See `POST_PHASE_7_IMPROVEMENTS.md` for details

### Post-Phase 7.1: Retry Logic & Jobs Payload Fix
- [x] Fix case sensitivity bug for workMode enum values
- [x] Implement retry logic for API validation errors
- [x] Ensure ALL jobs are sent in API response payload to frontend
- [x] Remove frontend display limit (was showing only 3 jobs)
- [x] Change deduplication to ID-only (not content-based)
- **Status:** ✅ COMPLETE
- **Issues Fixed:**
  1. ✅ Backend rejects lowercase "remote" → Enum normalizer added
  2. ✅ No retry when API returns 400 → Retry logic with backoff implemented
  3. ✅ Jobs found (9) but only 2-3 shown → Removed `.slice(0, 3)` limit
  4. ✅ Aggressive deduplication → Changed to ID-only deduplication
- **Files Modified:**
  - `src/utils/enum-normalizer.ts` (NEW) - Enum normalization
  - `src/agent/tools/search-jobs.tool.ts` - Enum normalization + retry logic
  - `src/services/agent.service.ts` - ID-only deduplication
  - `Inmate-FrontEnd/src/Components/CareerAdvocate/CareerAdvocate.jsx` - Removed slice limit

### Post-Phase 7.2: Formatting & Pagination Improvements
- [x] Remove ** markdown formatting from agent responses
- [x] Implement smart pagination with page tracking
- [x] Add automatic date filtering (last 7 days)
- [x] Implement "find more" context awareness (next page or broader search)
- **Status:** ✅ COMPLETE
- **Requirements Met:**
  1. ✅ Remove bold markdown (`**`) from responses
  2. ✅ Smart pagination: page 1 on first search, page 2/3 on "find more" (max 30 jobs)
  3. ✅ Auto-filter by date: last 7 days
  4. ✅ "Find more" behavior: try next page first, if exhausted do broader search
- **Files Modified:**
  - `src/agent/prompts/agent-prompts.ts` - No markdown formatting
  - `src/services/conversation.service.ts` - SearchContext tracking
  - `src/services/agent.service.ts` - "Find more" detection
  - `src/controllers/chat.controller.ts` - Pass searchContext
  - `src/utils/query-builder.ts` - Auto date filtering
  - `src/agent/tools/search-jobs.tool.ts` - Pagination support
  - `src/agent/job-discovery-agent.ts` - AgentOptions interface

### Post-Phase 7.3.1: Auto-Pagination & Page Persistence Fix
- [x] Implement auto-pagination to fetch multiple pages automatically
- [x] Combine results from multiple pages into single response
- [x] Fix page increment persistence (use finalPage from tool)
- [x] Fix finalPage calculation bug (was returning page-1 instead of actual page)
- [x] Prevent LLM from overriding page number from context
- [x] Fix "find more" page increment (was starting from page 1 again)
- [x] Keep searching through empty pages (up to 5 consecutive)
- **Status:** ✅ COMPLETE
- **Issues Fixed:**
  1. ✅ Single page fetching → Auto-fetch multiple pages until 10+ jobs or max pages (3)
  2. ✅ Page not incrementing on "show more" → Extract and save finalPage from tool
  3. ✅ Results not combined → Accumulate jobs from multiple pages in single response
  4. ✅ finalPage calculation wrong → Track lastSuccessfulPage explicitly
  5. ✅ LLM overriding page → Filter out 'page' from structured filters before merge
  6. ✅ "Find more" not incrementing → Use `(searchContext.currentPage || 0) + 1`
  7. ✅ Stops at first empty page → Track consecutive empty pages, continue up to 5
- **Files Modified:**
  - `src/agent/tools/search-jobs.tool.ts` - Auto-pagination + lastSuccessfulPage + filter page + consecutive empty pages
  - `src/services/agent.service.ts` - Extract finalPage + fix find more increment

### Post-Phase 7.3.2: Find More Detection & History Architecture
- [x] Expand "find more" regex to catch more variations
- [x] Replace regex/keywords with LLM-based intent classification
- [x] Document conversation history architecture and security
- **Status:** ✅ COMPLETE
- **Issues Fixed:**
  1. ✅ "Find more" regex too narrow → Replaced with LLM intent classification
  2. ✅ Loop behavior (1-5, 1-5, 1-5) → Now properly increments (1-5, 6-10, 11-15)
  3. ✅ Conversation history concerns → Documented architecture, isolation, security
  4. ✅ Bad practice (regex) → LLM handles it naturally
- **Files Modified:**
  - `src/services/agent.service.ts` - LLM-based intent classification with structured output
- **Documentation Added:**
  - `CONVERSATION_HISTORY_ARCHITECTURE.md` - Complete architecture guide

### Post-Phase 7.3.3: Hybrid Pagination Strategy
- [x] Remove hard page limits (3 → 100)
- [x] Implement smart stopping using backend totalPages
- [x] Optimize for 0 total jobs (stop immediately)
- [x] Increase target job count (10 → 20 per search)
- [x] Use metadata to avoid wasted API calls
- **Status:** ✅ COMPLETE
- **Strategy:**
  1. ✅ No hard limits - relies on backend metadata
  2. ✅ Progressive loading - ~20 jobs per search
  3. ✅ Smart stopping - uses totalPages and totalJobs
  4. ✅ Efficient - no wasted API calls
- **Files Modified:**
  - `src/services/agent.service.ts` - Increased maxPages to 100
  - `src/agent/tools/search-jobs.tool.ts` - Smart pagination with metadata checks

### Post-Phase 7.3.4: Auto-Broadening Search
- [x] Implement fallback strategy for 0 results
- [x] Try removing filters sequentially (experience → workMode → jobType → salary)
- [x] Return first successful broadened search
- [x] Include metadata about what was removed
- [x] Update agent prompt to explain broadening to users
- **Status:** ✅ COMPLETE
- **Strategy:**
  1. ✅ Initial search with all filters
  2. ✅ If 0 results, remove experience level
  3. ✅ If still 0, remove work mode
  4. ✅ Continue until jobs found or all filters tried
  5. ✅ Agent explains what was relaxed
- **Files Modified:**
  - `src/agent/tools/search-jobs.tool.ts` - Auto-broadening logic
  - `src/agent/prompts/agent-prompts.ts` - Updated prompt

### Post-Phase 7.3: Mobile UI & Scrollbar Fix
- [x] Fix scrollbar spacing (too close to chat bubbles)
- [x] Improve mobile responsiveness for tablets (768px)
- [x] Improve mobile responsiveness for phones (480px)
- [x] Handle very small screens (360px and below)
- **Status:** ✅ COMPLETE
- **Issues Fixed:**
  1. ✅ Scrollbar too close to messages → Added right padding (1.5rem) and improved styling
  2. ✅ Mobile layout issues → Added comprehensive breakpoints (768px, 480px, 360px)
  3. ✅ Mobile header too large → Reduced font sizes and padding
  4. ✅ Message bubbles too wide on mobile → Adjusted max-width (90%, 95%, 98%)
  5. ✅ Input/buttons too large on mobile → Scaled down appropriately
- **Files Modified:**
  - `Inmate-FrontEnd/src/Components/CareerAdvocate/CareerAdvocate.css` - Mobile responsive design

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
| conversationService.getSearchContext is not a function | 1 | Added missing methods to ConversationService class |
| startDate sent as Date object string instead of ISO | 1 | Convert Date to ISO string using `.toISOString()` before assigning to query |

## Notes
- Following LangChain TypeScript skill patterns
- Using planning-with-files pattern for task management
- All code must integrate with existing inmates-backend API structure
