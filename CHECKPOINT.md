# Project Checkpoint: Conversational Job Discovery AI Agent

**Date**: January 16, 2026  
**Status**: Phases 1-4 Complete, Phase 5 Pending  
**Repository**: `inmates-career-advocate`

---

## Executive Summary

This is a **standalone Node.js/TypeScript API service** that provides a conversational AI agent for job discovery. Users interact with the agent via natural language (e.g., "Show me remote Python jobs paying over $100k"), and the agent:

1. Extracts intent from natural language
2. Converts intent to structured queries
3. Calls the `inmates-backend` API to retrieve jobs
4. Responds conversationally with grounded results

**Key Architecture Points:**
- **Standalone service**: Has its own Express API server that the frontend calls
- **JWT token forwarding**: Validates JWT from frontend, forwards to backend
- **No hallucinations**: All job data comes from backend API calls
- **Session-scoped memory**: No persistent memory across sessions
- **LangChain + LangGraph**: Uses ReAct agent pattern with tool calling

---

## Project Goals & Constraints

### Goals
- Natural language job discovery interface
- Integration with existing `inmates-backend` API
- Conversational, grounded responses
- No hallucinations (all data from backend)

### Explicit Non-Goals (v1)
- No job applications (agent doesn't apply)
- No browser automation
- No external web search
- No long-term memory across sessions
- No resume editing/generation

### Critical Principle
> **"If the agent cannot ground a response in retrieved data, it must not say it."**

---

## Architecture Overview

```
Frontend (React/Next.js)
    ↓ POST /api/chat (JWT token)
Career Advocate API (Express)
    ↓ Validates JWT, manages conversation
LangChain Agent (ReAct pattern)
    ↓ Calls tools
Tools (search_jobs, get_job_details)
    ↓ GET /jobs/all-jobs (JWT forwarded)
Inmates Backend (NestJS)
    ↓ MongoDB queries, Redis cache
Job Data
```

### Key Components

1. **API Server** (`src/server/`)
   - Express server with routes and middleware
   - JWT validation middleware
   - Error handling middleware

2. **Agent** (`src/agent/`)
   - LangGraph ReAct agent (`createReactAgent`)
   - GPT-4o-mini with temperature 0.1
   - System prompts emphasizing grounding

3. **Tools** (`src/agent/tools/`)
   - `search_jobs`: Natural language → structured query → backend API
   - `get_job_details`: Retrieve full job by ID

4. **Query Builder** (`src/utils/query-builder.ts`)
   - LangChain structured output (Zod schema)
   - Extracts: searchTerm, location, salary, jobType, workMode, experienceLevel
   - Normalizes to backend enum values

5. **Backend API Client** (`src/api/`)
   - Axios-based client
   - JWT token forwarding
   - Handles backend response envelope `{ success, data }`

---

## Implementation Status

### ✅ Phase 1: Project Setup & Infrastructure (COMPLETE)

**What was built:**
- TypeScript project with ESM modules
- Express server skeleton
- Directory structure
- ESLint, Prettier, TypeScript config
- Environment configuration
- All placeholder files

**Key files:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config (strict mode, ESM)
- `.eslintrc.cjs`, `.prettierrc` - Linting/formatting
- `src/server/` - Express app, routes, middleware

**Dependencies installed:**
- `express`, `cors`, `helmet`
- `langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/langgraph`
- `axios`, `dotenv`, `zod`, `jsonwebtoken`

### ✅ Phase 2: Backend API Integration (COMPLETE)

**What was built:**
- Type definitions matching backend DTOs
- `BackendApiClient` class (Axios-based)
- `JobsApiClient` with `searchJobs()` and `getJobById()`
- JWT verification utilities
- Health check endpoint integration

**Key files:**
- `src/types/job.types.ts` - JobListing, PaginatedJobsResponse
- `src/types/query.types.ts` - GetJobsQueryDto with enums
- `src/types/api.types.ts` - ApiError, ApiEnvelope
- `src/api/client.ts` - Base API client
- `src/api/jobs-api.ts` - Jobs API client
- `src/api/auth.ts` - JWT utilities

**Important discovery:**
- Backend wraps responses in `{ success: boolean, data: T }` envelope
- Client must unwrap `response.data` before accessing `data`, `meta`, `links`

**Testing:**
- `src/test-api.ts` - Test script (`npm run test:api`)
- Verifies backend connectivity, JWT validation, job retrieval

### ✅ Phase 3: Natural Language to Query Mapping (COMPLETE)

**What was built:**
- LangChain structured output with Zod schema
- Intent extraction from natural language
- Query normalization (text → enums, salary conversion)
- Query builder functions

**Key files:**
- `src/utils/query-builder.ts` - Main query building logic
- `src/test-query-builder.ts` - Test script (`npm run test:query-builder`)

**Features:**
- Extracts: searchTerm, location, salaryMin/Max, jobType, workMode, experienceLevel, keywords
- Normalizes: "remote"/"WFH" → `WorkMode.REMOTE`, "$80k" → 80000
- Combines searchTerm and keywords intelligently
- Defaults: page=1, limit=10, sortBy=createdAt, sortOrder=desc

**Testing:**
- All test cases passing
- Handles edge cases (keyword duplication, salary ranges, etc.)

### ✅ Phase 4: LangChain Agent Implementation (COMPLETE)

**What was built:**
- LangGraph ReAct agent setup
- Two tools: `search_jobs`, `get_job_details`
- Agent prompts with grounding principles
- Agent service for orchestration
- Job extraction from agent responses

**Key files:**
- `src/agent/job-discovery-agent.ts` - Agent setup
- `src/agent/tools/search-jobs.tool.ts` - Search tool
- `src/agent/tools/get-job-details.tool.ts` - Details tool
- `src/agent/prompts/agent-prompts.ts` - System prompts
- `src/services/agent.service.ts` - Agent orchestration
- `src/test-agent.ts` - Test script (`npm run test:agent`)

**Technical details:**
- Uses `createReactAgent` from `@langchain/langgraph/prebuilt`
- Tools use `DynamicStructuredTool` with Zod schemas
- Tools return JSON strings for agent consumption
- Agent automatically extracts jobs from tool results

**Fixes applied:**
1. **Filter merging**: When agent passes both `query` (NL) and structured filters, they're merged
2. **Job extraction**: Fixed to handle LangGraph `BaseMessage` types correctly

**Testing:**
- Agent calls tools correctly
- Query parameters sent to backend
- Jobs extracted from responses
- Conversational responses generated

### ⏳ Phase 5: Response Generation & Formatting (PENDING)

**What needs to be built:**
- Response formatter for consistent output
- Error handling improvements
- Response synthesis logic
- API endpoint implementation (`POST /api/chat`)

**Status:** Not started

### ⏳ Phase 6: Testing & Validation (PENDING)

**What needs to be built:**
- Integration tests
- End-to-end tests
- Error scenario testing

**Status:** Not started

### ⏳ Phase 7: API/Interface Layer (PENDING)

**What needs to be built:**
- Complete API server setup
- Session management (in-memory or Redis)
- Frontend integration
- Health check improvements

**Status:** Partially done (skeleton exists)

---

## Key Files & Their Purposes

### Core Agent Files

**`src/agent/job-discovery-agent.ts`**
- Creates LangGraph ReAct agent
- Configures LLM (GPT-4o-mini, temp 0.1)
- Sets up message modifier with system prompt
- Returns agent executor

**`src/agent/tools/search-jobs.tool.ts`**
- Main search tool
- Accepts natural language `query` OR structured filters
- Uses `buildQueryFromMessage()` for NL queries
- Merges structured filters when both provided
- Calls `JobsApiClient.searchJobs()`
- Returns formatted JSON with job summaries

**`src/agent/tools/get-job-details.tool.ts`**
- Retrieves full job details by ID
- Calls `JobsApiClient.getJobById()`
- Returns complete job information

**`src/agent/prompts/agent-prompts.ts`**
- `SYSTEM_PROMPT`: Emphasizes grounding, no hallucinations
- Tool usage guidelines
- Conversational tone instructions

### Query Building

**`src/utils/query-builder.ts`**
- `buildQueryFromMessage(message: string)`: Main entry point
- `extractIntent(message: string)`: LLM-based extraction with Zod schema
- `normalizeIntent(intent)`: Maps to backend enums
- `buildQueryFromFilters(filters)`: Programmatic query building

**Key normalization rules:**
- Work mode: "remote"/"WFH" → `WorkMode.REMOTE`
- Job type: "full-time"/"FT" → "Full-time"
- Experience: "junior"/"jr" → "Junior", "senior"/"sr" → "Senior"
- Salary: "$80k" → 80000, "$100k-$150k" → { salaryMin: 100000, salaryMax: 150000 }

### Backend Integration

**`src/api/client.ts`**
- `BackendApiClient` class
- Axios instance with base URL
- Bearer token authentication
- Request/response interceptors
- Error handling with typed errors

**`src/api/jobs-api.ts`**
- `JobsApiClient` class
- `searchJobs(query: GetJobsQueryDto)`: Builds query params, calls backend
- `getJobById(id: string)`: Single job retrieval
- Handles response envelope unwrapping

**`src/api/auth.ts`**
- `verifyToken(token: string)`: JWT verification
- `extractTokenFromHeader(header: string)`: Token extraction
- `getUserIdFromToken(token: string)`: User ID extraction

### Services

**`src/services/agent.service.ts`**
- `processMessage(message: string, token: string, history?: Message[])`: Main entry point
- Manages conversation history
- Invokes agent
- Extracts jobs from agent responses
- Returns: `{ response: string, jobs: JobListing[] }`

**`extractJobsFromMessages(messages: BaseMessage[])`**:
- Parses LangGraph messages
- Finds tool messages with job data
- Extracts `jobs` array or single `job` object
- Maps to `JobListing` format

### Server

**`src/server/app.ts`**
- Express app setup
- Middleware (CORS, helmet, JSON parsing)
- Route registration

**`src/server/routes/chat.routes.ts`**
- `POST /api/chat` endpoint (skeleton, needs implementation)
- Should call `agent.service.processMessage()`

**`src/server/routes/health.routes.ts`**
- `GET /api/health` endpoint
- Tests backend connectivity

**`src/server/middleware/auth.middleware.ts`**
- JWT validation middleware
- Extracts token from Authorization header
- Validates and attaches to request

### Types

**`src/types/job.types.ts`**
- `JobListing`: Job data structure
- `PaginatedJobsResponse`: Backend pagination response
- `PaginationMeta`, `PaginationLinks`: Pagination types

**`src/types/query.types.ts`**
- `GetJobsQueryDto`: Query parameters
- Enums: `SortBy`, `SortOrder`, `WorkMode`

**`src/types/api.types.ts`**
- `ApiError`: Error structure
- `ApiEnvelope<T>`: Backend response wrapper
- `HealthCheckResponse`: Health check type

---

## Technical Patterns & Conventions

### TypeScript
- **ESM modules**: Uses `.js` extensions in imports (required for ESM)
- **Strict mode**: Enabled in tsconfig.json
- **Type safety**: All API responses typed

### Error Handling
- Typed errors via `ApiError` type
- Error middleware for consistent error responses
- Tool errors return helpful messages to agent

### Environment Variables
- Loaded via `dotenv` in `src/config/config.ts`
- Required variables:
  - `BACKEND_API_BASE_URL`
  - `JWT_SECRET` (must match backend)
  - `OPENAI_API_KEY`
  - `AGENT_MODEL` (default: gpt-4o-mini)
  - `AGENT_TEMPERATURE` (default: 0.1)
  - `PORT` (default: 3001)

### Debug Logging
- Gated behind `NODE_ENV === 'development'`
- Logs query extraction, tool calls, API requests
- Format: `[COMPONENT] Message`

### Testing Scripts
- `npm run test:api` - Backend API connectivity
- `npm run test:query-builder` - Query extraction
- `npm run test:agent` - Full agent test
- `npm run extract-token` - Helper to get JWT token

---

## Known Issues & Fixes Applied

### ✅ Fixed: Backend Response Envelope
**Issue:** Backend wraps responses in `{ success, data }`, but client expected direct response  
**Fix:** Updated `JobsApiClient` to unwrap `response.data` before accessing pagination

### ✅ Fixed: Filter Merging
**Issue:** When agent passed both `query` (NL) and structured filters, only `query` was used  
**Fix:** Updated `search-jobs.tool.ts` to merge structured filters with NL query result

### ✅ Fixed: Job Extraction
**Issue:** Jobs not extracted from agent responses (returned empty array)  
**Fix:** Updated `extractJobsFromMessages()` to handle LangGraph `BaseMessage` types correctly

### ⚠️ Known: JWT Token Expiration
**Issue:** JWT tokens expire (typically 1 hour)  
**Workaround:** Use `npm run extract-token` to get fresh token, update `.env`

### ⚠️ Known: Session Management
**Issue:** No persistent session management yet  
**Status:** Phase 7 will implement (in-memory or Redis)

---

## Testing Approach

### Manual Testing
1. **Backend API**: `npm run test:api`
   - Requires `TEST_JWT_TOKEN` in `.env` (dev-only, never set in production)
   - Tests connectivity, auth, job retrieval

2. **Query Builder**: `npm run test:query-builder`
   - Tests natural language extraction
   - No backend required

3. **Agent**: `npm run test:agent`
   - Requires `TEST_JWT_TOKEN` (dev-only) and backend running
   - Tests full agent flow

### Test Scripts Location
- `src/test-api.ts`
- `src/test-query-builder.ts`
- `src/test-agent.ts`

### Getting JWT Token
```bash
# Method 1: curl
curl -X POST http://localhost:6543/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}' \
  | jq -r '.data.accessToken'

# Method 2: Helper script
npm run extract-token
# Paste curl response JSON, script extracts token to .env
```

---

## Next Steps (Phase 5+)

### Phase 5: Response Generation & Formatting
1. Implement response formatter (`src/utils/response-formatter.ts`)
2. Improve error handling in agent service
3. Add response synthesis logic
4. Complete `POST /api/chat` endpoint

### Phase 6: Testing & Validation
1. Integration tests
2. End-to-end tests
3. Error scenario coverage

### Phase 7: API/Interface Layer
1. Session management (in-memory or Redis)
2. Frontend integration
3. WebSocket support (optional)
4. Rate limiting
5. Request logging

---

## Important Context & Gotchas

### JWT Secret Must Match
- `JWT_SECRET` in Career Advocate `.env` **must match** backend `.env`
- Token verification happens locally AND on backend
- Mismatch causes "Invalid token" errors

### Backend Response Format
- All backend responses wrapped: `{ success: boolean, data: T }`
- Client must unwrap: `response.data` before accessing inner data
- Pagination structure: `{ data: JobListing[], meta: PaginationMeta, links: PaginationLinks }`

### Query Parameter Building
- Backend supports: `searchTerm`, `location`, `salaryMin`, `salaryMax`, `jobType`, `workMode`, `experienceLevel`
- All filtering happens server-side (MongoDB queries)
- Client-side filtering is inefficient (returns all jobs)

### Agent Tool Calling
- Tools return JSON strings (not objects)
- Agent parses JSON and formats in response
- Job extraction happens after agent execution

### LangGraph Message Types
- Uses `BaseMessage` types from `@langchain/core`
- Tool results in messages with `role === 'tool'`
- Must use `message.getContent()` to access content

### Debug Logging
- Only enabled in development (`NODE_ENV === 'development'`)
- Logs show: query extraction, tool calls, API URLs, job extraction

### TypeScript ESM
- Imports must use `.js` extensions: `import { x } from './file.js'`
- This is required for ESM module resolution

---

## File Structure Reference

```
inmates-career-advocate/
├── src/
│   ├── agent/
│   │   ├── job-discovery-agent.ts      # Agent setup
│   │   ├── prompts/
│   │   │   └── agent-prompts.ts        # System prompts
│   │   └── tools/
│   │       ├── search-jobs.tool.ts     # Search tool
│   │       └── get-job-details.tool.ts # Details tool
│   ├── api/
│   │   ├── client.ts                   # Base API client
│   │   ├── jobs-api.ts                 # Jobs API client
│   │   └── auth.ts                     # JWT utilities
│   ├── config/
│   │   └── config.ts                   # Config loader
│   ├── controllers/
│   │   └── chat.controller.ts          # Chat controller (skeleton)
│   ├── server/
│   │   ├── app.ts                      # Express app
│   │   ├── server.ts                   # Server entry
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts       # JWT validation
│   │   │   └── error.middleware.ts     # Error handling
│   │   └── routes/
│   │       ├── chat.routes.ts          # POST /api/chat
│   │       └── health.routes.ts        # GET /api/health
│   ├── services/
│   │   ├── agent.service.ts            # Agent orchestration
│   │   └── conversation.service.ts     # Session management (skeleton)
│   ├── types/
│   │   ├── job.types.ts                # Job types
│   │   ├── query.types.ts              # Query types
│   │   └── api.types.ts                # API types
│   ├── utils/
│   │   ├── query-builder.ts            # NL → Query conversion
│   │   └── response-formatter.ts       # Response formatting (skeleton)
│   ├── index.ts                        # App entry point
│   ├── test-api.ts                     # API test script
│   ├── test-query-builder.ts           # Query builder test
│   ├── test-agent.ts                   # Agent test script
│   └── extract-token.ts                # Token extraction helper
├── .env                                # Environment variables
├── .env.example                        # Example env file
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── roadmap.md                          # Implementation roadmap
├── requirements.md                     # Product requirements
└── CHECKPOINT.md                       # This file
```

---

## Quick Start for New Agent

1. **Read this checkpoint document** (you're doing it!)

2. **Review key files:**
   - `roadmap.md` - Full implementation plan
   - `requirements.md` - Product requirements
   - `task_plan.md` - Current task status
   - `findings.md` - Research and decisions

3. **Understand the architecture:**
   - Standalone API service
   - JWT token forwarding
   - LangChain agent with tools
   - Backend API integration

4. **Set up environment:**
   ```bash
   cd inmates-career-advocate
   cp .env.example .env
   # Edit .env with your values
   npm install
   ```

5. **Test connectivity:**
   ```bash
   npm run test:api
   ```

6. **Continue with Phase 5:**
   - Implement response formatting
   - Complete API endpoints
   - Add error handling

---

## Questions to Ask User

If you need clarification:

1. **Session management**: In-memory or Redis? (for Phase 7)
2. **Frontend integration**: What's the expected API contract?
3. **Error handling**: How should errors be formatted for frontend?
4. **Rate limiting**: Should we implement rate limiting?
5. **WebSocket**: Do we need real-time updates?

---

## Success Criteria

The agent is working correctly when:

1. ✅ Natural language queries extract correct intent
2. ✅ Query parameters sent to backend correctly
3. ✅ Jobs retrieved from backend API
4. ✅ Jobs extracted from agent responses
5. ✅ Conversational responses generated
6. ✅ No hallucinations (all data from backend)
7. ✅ JWT authentication working
8. ✅ Error handling graceful

---

## Contact & Resources

- **Repository**: `inmates-career-advocate`
- **Backend**: `inmates-backend` (NestJS)
- **Frontend**: `Inmate-FrontEnd` or `inmate-admin`
- **Requirements**: See `requirements.md`
- **Roadmap**: See `roadmap.md`

---

**End of Checkpoint Document**

*This document should be updated as the project progresses. Last updated: January 16, 2026*
