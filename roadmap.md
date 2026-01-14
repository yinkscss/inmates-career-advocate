# Roadmap: Conversational Job Discovery & Guidance Agent

## Overview

This roadmap outlines the implementation plan for building a conversational AI agent that allows users to discover jobs using natural language. The agent will integrate with the existing `inmates-backend` API to retrieve and present job listings.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                 │
│              - Chat Interface                                │
│              - User Authentication                           │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ HTTP/WebSocket
                        │ POST /api/chat
                        │ (JWT Token from Frontend)
                        │
┌───────────────────────▼───────────────────────────────────────┐
│    Inmates Career Advocate (Standalone API Service)          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         API Server (Express/Fastify)                    │ │
│  │  - POST /api/chat - Chat endpoint                       │ │
│  │  - GET /api/health - Health check                       │ │
│  │  - Authentication middleware (validates JWT)            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         Conversational AI Agent (LangChain JS)          │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │  Intent Extraction & Query Generation            │ │ │
│  │  │  - Natural Language Understanding                │ │ │
│  │  │  - Structured Query Mapping                      │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │  Tools (LangChain Tools)                          │ │ │
│  │  │  - search_jobs(query)                            │ │ │
│  │  │  - get_job_details(job_id)                        │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │  Response Synthesis                               │ │ │
│  │  │  - Grounded in retrieved data                    │ │ │
│  │  │  - Conversational formatting                      │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │         Backend API Client                              │ │
│  │  - Calls Inmates Backend API                           │ │
│  │  - Authentication (JWT Bearer Token - passed through)  │ │
│  │  - Job Search API Integration                         │ │
│  │  - Error Handling & Retry Logic                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ REST API (Bearer Token)
                        │ GET /jobs/all-jobs
                        │ GET /jobs/:id
                        │
┌───────────────────────▼───────────────────────────────────────┐
│              Inmates Backend (NestJS)                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  GET /jobs/all-jobs                                     │ │
│  │  GET /jobs/:id                                          │ │
│  │  - AuthenticationGuard                                  │ │
│  │  - AuthorizationGuard                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  JobsService                                            │ │
│  │  - JobQueryBuilderService                               │ │
│  │  - MongoDB Query Building                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  JobCacheService (Redis)                                │ │
│  │  - 30-day TTL cache                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  MongoDB (Job Listings)                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Architecture Notes

- **Career Advocate** is a standalone Node.js/TypeScript service with its own API server
- **Frontend** calls Career Advocate API endpoints (e.g., `POST /api/chat`)
- **Career Advocate** calls Inmates Backend API for job data
- **JWT Token Flow**: Frontend → Career Advocate (validates) → Backend (forwards)
- **Session Management**: Career Advocate manages conversation sessions (in-memory or Redis)

## Phase 1: Project Setup & Infrastructure ✅ COMPLETE

**Status**: ✅ Complete - All tasks finished, dependencies installed, .env configured

### 1.1 Initialize TypeScript Project
- **Location**: `inmates-career-advocate/`
- **Tasks**:
  - Initialize Node.js project with TypeScript
  - Set up build configuration (tsconfig.json)
  - Configure package.json with scripts
  - Set up ESLint and Prettier
  - Create project structure:
    ```
    inmates-career-advocate/
    ├── src/
    │   ├── server/
    │   │   ├── app.ts              # Express/Fastify app setup
    │   │   ├── routes/
    │   │   │   ├── chat.routes.ts   # POST /api/chat endpoint
    │   │   │   └── health.routes.ts # GET /api/health
    │   │   ├── middleware/
    │   │   │   ├── auth.middleware.ts  # JWT validation
    │   │   │   └── error.middleware.ts
    │   │   └── server.ts           # Server entry point
    │   ├── agent/
    │   │   ├── job-discovery-agent.ts
    │   │   ├── tools/
    │   │   │   ├── search-jobs.tool.ts
    │   │   │   └── get-job-details.tool.ts
    │   │   └── prompts/
    │   │       └── agent-prompts.ts
    │   ├── api/
    │   │   ├── client.ts            # HTTP client for backend API
    │   │   ├── jobs-api.ts          # Backend jobs API integration
    │   │   └── auth.ts              # Auth utilities
    │   ├── services/
    │   │   ├── conversation.service.ts  # Session management
    │   │   └── agent.service.ts        # Agent orchestration
    │   ├── types/
    │   │   ├── job.types.ts
    │   │   ├── query.types.ts
    │   │   └── api.types.ts         # API request/response types
    │   ├── utils/
    │   │   ├── query-builder.ts
    │   │   └── response-formatter.ts
    │   └── index.ts
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    └── README.md
    ```

### 1.2 Install Dependencies
- **Dependencies**:
  - `express` or `fastify` - Web framework for API server
  - `langchain` - Core LangChain library
  - `@langchain/core` - Core types and utilities
  - `@langchain/openai` - OpenAI integration (or alternative LLM provider)
  - `axios` - HTTP client for backend API calls
  - `dotenv` - Environment variable management
  - `zod` - Schema validation
  - `jsonwebtoken` - JWT token validation (or `jose` for modern JWT)
  - `cors` - CORS middleware
  - `helmet` - Security headers
- **Dev Dependencies**:
  - `typescript`
  - `@types/node`
  - `@types/express` (if using Express)
  - `@types/jsonwebtoken`
  - `ts-node`
  - `nodemon` (for development)

### 1.3 Environment Configuration
- **File**: `.env.example` and `.env`
- **Variables**:
  ```env
  # Backend API Configuration
  BACKEND_API_BASE_URL=http://localhost:6543/api
  # Production: https://api.inmates.ai/api

  # JWT Configuration (must match backend JWT secret)
  JWT_SECRET=your_jwt_secret_here
  # Must be the same secret used by inmates-backend for token validation

  # LLM Configuration
  OPENAI_API_KEY=your_openai_api_key
  # Or alternative: ANTHROPIC_API_KEY=your_anthropic_api_key

  # Agent Configuration
  AGENT_MODEL=gpt-4o-mini  # or claude-3-haiku-20240307
  AGENT_TEMPERATURE=0.1  # Low temperature for deterministic responses
  MAX_ITERATIONS=10  # Max tool calls per conversation turn

  # Server Configuration
  PORT=3001  # Career Advocate API server port
  NODE_ENV=development
  CORS_ORIGIN=http://localhost:3000  # Frontend origin
  ```

**Phase 1 Completion Summary:**
- ✅ TypeScript project initialized with ESM module system
- ✅ Express server skeleton created with routes and middleware
- ✅ All project directories and placeholder files created
- ✅ ESLint, Prettier, and TypeScript configured
- ✅ Dependencies defined in package.json
- ✅ Environment configuration files created (.env.example)
- ✅ Dependencies installed via npm
- ✅ .env file created and configured
- ✅ TypeScript compilation verified (type-check passes)
- ✅ README.md with project documentation

## Phase 2: Backend API Integration ✅ COMPLETE

**Status**: ✅ Complete - All API integration tasks finished, types defined, client implemented

### 2.1 API Client Implementation
- **File**: `src/api/client.ts`
- **Purpose**: Base HTTP client with authentication
- **Features**:
  - Bearer token authentication
  - Request/response interceptors
  - Error handling and retry logic
  - TypeScript types for all requests/responses

### 2.2 Jobs API Integration
- **File**: `src/api/jobs-api.ts`
- **Endpoints to Integrate**:
  - `GET /jobs/all-jobs` - Search jobs with filters
    - Query parameters: `searchTerm`, `location`, `salaryMin`, `salaryMax`, `jobType`, `workMode`, `experienceLevel`, `page`, `limit`, `sortBy`, `sortOrder`
  - `GET /jobs/:id` - Get single job details
- **Implementation**:
  ```typescript
  interface JobsApiClient {
    searchJobs(filters: GetJobsQueryDto, token: string): Promise<PaginatedJobsResponse>;
    getJobById(jobId: string, token: string): Promise<JobResponseDto>;
  }
  ```

### 2.3 Type Definitions
- **File**: `src/types/job.types.ts`
- **Types to Define**:
  - `JobListing` - Matches backend `JobResponseDto`
  - `GetJobsQueryDto` - Matches backend query structure
  - `PaginatedJobsResponse` - Response with pagination metadata
  - `JobFilters` - Internal representation of filters

**Phase 2 Completion Summary:**
- ✅ Created comprehensive type definitions matching backend structure
  - `JobListing` interface matches `JobResponseDto`
  - `GetJobsQueryDto` with all query parameters and enums
  - `PaginatedJobsResponse` with meta and links
  - `ApiError` and `HealthCheckResponse` types
- ✅ Implemented `BackendApiClient` class with:
  - Axios-based HTTP client
  - Bearer token authentication
  - Request/response interceptors
  - Comprehensive error handling
  - Health check method
- ✅ Implemented `JobsApiClient` with:
  - `searchJobs()` method with full filter support
  - `getJobById()` method
  - Proper query parameter building
- ✅ Created authentication utilities:
  - `verifyToken()` - JWT verification
  - `extractTokenFromHeader()` - Token extraction
  - `getUserIdFromToken()` - User ID extraction
- ✅ Updated health check endpoint to test backend connectivity
- ✅ All TypeScript compilation verified

## Phase 3: Natural Language to Query Mapping ✅ COMPLETE

**Status**: ✅ Complete - Intent extraction and query normalization implemented

### 3.1 Intent Extraction
- **File**: `src/utils/query-builder.ts`
- **Purpose**: Convert natural language to structured query
- **Extraction Rules**:
  - **Job Role**: Extract from user message (e.g., "software engineer", "developer")
  - **Keywords/Skills**: Extract technical terms (e.g., "React", "Python", "Node.js")
  - **Job Type**: Map phrases like "full-time", "part-time", "contract" to `JobTypeEnum`
  - **Work Mode**: Map "remote", "on-site", "hybrid" to `WorkModeEnum`
  - **Location**: Extract location mentions
  - **Salary**: Extract salary ranges (e.g., "$80k-$120k", "six figures")
  - **Seniority**: Extract "junior", "mid", "senior", "lead", "principal"
- **Implementation Strategy**:
  - Use LLM with structured output (JSON schema) to extract intent
  - Validate extracted fields against backend enum values
  - Handle ambiguous or missing attributes gracefully

### 3.2 Query Normalization
- **Purpose**: Ensure extracted values match backend expectations
- **Normalization Rules**:
  - Job types: Map variations to `JobTypeEnum` values
  - Work modes: Map to `WorkModeEnum` (REMOTE, ONSITE, HYBRID)
  - Experience levels: Map to "Junior", "Mid", "Senior"
  - Salary: Convert text to numeric values (e.g., "80k" → 80000)

**Phase 3 Completion Summary:**
- ✅ Implemented intent extraction using LangChain with structured output
  - Uses `ChatOpenAI.withStructuredOutput()` with Zod schema
  - Extracts: searchTerm, location, salaryMin/Max, jobType, workMode, experienceLevel, keywords
  - Low temperature (0.1) for deterministic extraction
- ✅ Created query normalization function
  - Maps work mode variations (remote/WFH → Remote)
  - Maps job type variations (full-time/FT → Full-time)
  - Maps experience levels (junior/jr → Junior, senior/sr → Senior)
  - Converts salary text to numeric values
  - Combines searchTerm and keywords
  - Applies default pagination and sorting
- ✅ Built main query builder function
  - `buildQueryFromMessage()` - converts natural language to GetJobsQueryDto
  - `extractIntent()` - LLM-based intent extraction
  - `normalizeIntent()` - normalizes to backend query structure
  - `buildQueryFromFilters()` - programmatic query building
- ✅ Created test script for verification
- ✅ All TypeScript compilation verified

## Phase 4: LangChain Agent Implementation

### 4.1 Agent Setup
- **File**: `src/agent/job-discovery-agent.ts`
- **Agent Type**: Tool-calling agent (ReAct pattern)
- **Configuration**:
  - Model: GPT-4o-mini or Claude 3 Haiku (cost-effective, fast)
  - Temperature: 0.1 (deterministic, grounded responses)
  - System prompt: Emphasize grounding, no hallucinations
  - Max iterations: 10 (prevent infinite loops)

### 4.2 Tool: search_jobs
- **File**: `src/agent/tools/search-jobs.tool.ts`
- **Purpose**: Search jobs using structured query
- **Input Schema**:
  ```typescript
  {
    searchTerm?: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    jobType?: "Full-time" | "Part-time" | "Contract" | "Freelance";
    workMode?: "Remote" | "On-site" | "Hybrid";
    experienceLevel?: "Junior" | "Mid" | "Senior";
    page?: number;
    limit?: number;
  }
  ```
- **Implementation**:
  - Accept natural language or structured query
  - If natural language, extract intent first
  - Call backend API with structured query
  - Return formatted results

### 4.3 Tool: get_job_details
- **File**: `src/agent/tools/get-job-details.tool.ts`
- **Purpose**: Get detailed information about a specific job
- **Input Schema**:
  ```typescript
  {
    jobId: string;  // MongoDB ObjectId
  }
  ```
- **Implementation**:
  - Call `GET /jobs/:id` endpoint
  - Return full job details including description, requirements, application URL

### 4.4 Agent Prompts
- **File**: `src/agent/prompts/agent-prompts.ts`
- **System Prompt Guidelines**:
  - Emphasize grounding: "Only discuss jobs that were retrieved via tool calls"
  - No hallucinations: "If no jobs match, say so clearly"
  - Conversational tone: "Be helpful and natural, but always truthful"
  - Application guidance: "Explain how to apply, but do not initiate applications"

## Phase 5: Response Generation & Formatting

### 5.1 Response Synthesis
- **File**: `src/utils/response-formatter.ts`
- **Purpose**: Format job results into conversational responses
- **Features**:
  - Summarize multiple jobs
  - Highlight key attributes (remote, salary, company)
  - Group jobs by category (e.g., frontend, backend, full-stack)
  - Present job details in readable format
  - Include application guidance

### 5.2 Error Handling
- **Scenarios to Handle**:
  - No matching jobs: "I couldn't find any jobs matching your criteria. Would you like to try different filters?"
  - Backend API errors: "I'm having trouble accessing the job database right now. Please try again in a moment."
  - Ambiguous intent: "I need a bit more information. Are you looking for remote or on-site positions?"
  - Invalid job ID: "I couldn't find that job. Could you try searching again?"

## Phase 6: Testing & Validation

### 6.1 Unit Tests
- Test query extraction logic
- Test query normalization
- Test API client error handling
- Test response formatting

### 6.2 Integration Tests
- Test agent with mock backend responses
- Test end-to-end conversation flows
- Test error scenarios

### 6.3 Validation Criteria
- **Zero Hallucinations**: Agent never mentions jobs not in retrieved data
- **Deterministic Queries**: Same input produces same query structure
- **Grounded Responses**: All job details come from API responses
- **Natural Conversation**: Responses feel conversational, not robotic

## Phase 7: API Server Implementation

### 7.1 API Server Setup
- **File**: `src/server/app.ts`
- **Framework**: Express or Fastify
- **Features**:
  - CORS configuration for frontend
  - Security headers (Helmet)
  - Request logging
  - Error handling middleware
  - Body parsing

### 7.2 Chat Endpoint
- **File**: `src/server/routes/chat.routes.ts`
- **Endpoint**: `POST /api/chat`
- **Authentication**: Validates JWT token from frontend
- **Request**:
  ```typescript
  {
    message: string;
    conversationId?: string;  // For session continuity
    // JWT token in Authorization header
  }
  ```
- **Response**:
  ```typescript
  {
    response: string;
    conversationId: string;  // For session management
    jobs?: JobListing[];  // If jobs were retrieved
    suggestedActions?: string[];  // e.g., ["View job details", "Refine search"]
  }
  ```
- **Implementation Flow**:
  1. Validate JWT token from Authorization header
  2. Extract user ID from token
  3. Load/create conversation session
  4. Call agent with message and conversation history
  5. Agent processes message (may call backend API)
  6. Return formatted response

### 7.3 Authentication Middleware
- **File**: `src/server/middleware/auth.middleware.ts`
- **Purpose**: Validate JWT tokens from frontend
- **Implementation**:
  - Extract token from `Authorization: Bearer <token>` header
  - Verify token signature (using same secret as backend)
  - Attach user info to request object
  - Forward token to backend API calls

### 7.4 Session Management
- **File**: `src/services/conversation.service.ts`
- **Purpose**: Manage conversation state per user
- **Storage Options**:
  - In-memory (simple, for MVP)
  - Redis (recommended for production, scales better)
- **Session Data**:
  ```typescript
  {
    conversationId: string;
    userId: string;
    messages: Array<{role: "user" | "assistant", content: string}>;
    createdAt: Date;
    lastActivity: Date;
  }
  ```

### 7.5 Health Check Endpoint
- **File**: `src/server/routes/health.routes.ts`
- **Endpoint**: `GET /api/health`
- **Response**:
  ```typescript
  {
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime: number;
    services: {
      backend: "connected" | "disconnected";
      llm: "available" | "unavailable";
    }
  }
  ```

### 7.6 WebSocket Support (Optional - Future)
- Real-time conversation
- Streaming responses
- Better UX for longer conversations

## Integration Points with Existing Backend

### Backend API Endpoints Used

1. **GET /jobs/all-jobs**
   - **Authentication**: Bearer token (JWT) required
   - **Query Parameters**:
     - `searchTerm` (string): Text search in title, company, description
     - `location` (string): Location filter
     - `salaryMin` (number): Minimum salary
     - `salaryMax` (number): Maximum salary
     - `jobType` (string): "Full-time", "Part-time", "Contract", "Freelance"
     - `workMode` (string): "Remote", "On-site", "Hybrid"
     - `experienceLevel` (string): "Junior", "Mid", "Senior"
     - `page` (number): Pagination page number
     - `limit` (number): Results per page
     - `sortBy` (string): "createdAt", "salaryMax", "title", "company"
     - `sortOrder` (string): "asc" | "desc"
   - **Response**: Paginated jobs with metadata

2. **GET /jobs/:id**
   - **Authentication**: Bearer token (JWT) required
   - **Response**: Single job with full details including:
     - Basic info (title, company, description, url, logo)
     - Location, salary range
     - Job type, work mode
     - Tags/skills
     - Company email (if extracted)
     - Email subject suggestion

### Authentication Flow

1. **Frontend → Career Advocate**:
   - User logs in via frontend (gets JWT from inmates-backend)
   - Frontend stores JWT token
   - Frontend sends requests to Career Advocate with: `Authorization: Bearer <token>`
   - Career Advocate validates token (same JWT secret as backend)

2. **Career Advocate → Backend**:
   - Career Advocate forwards the same JWT token to backend
   - Backend validates token via `AuthenticationGuard`
   - Backend returns job data

3. **Token Validation**:
   - Career Advocate validates token signature and expiration
   - Extracts user ID from token payload
   - Uses same JWT secret as backend (shared secret)

### Caching Strategy

- **Backend**: Jobs cached in Redis with 30-day TTL via `JobCacheService`
- **Agent**: Consider short-term caching (5-10 minutes) for repeated queries
- **Cache Invalidation**: When new jobs are fetched, backend invalidates cache

## Data Flow Example

```
Frontend User: "I'm a software engineer, show me remote jobs"

1. Frontend sends POST /api/chat
   Headers: Authorization: Bearer <user_jwt_token>
   Body: { message: "I'm a software engineer, show me remote jobs" }

2. Career Advocate API Server:
   - Validates JWT token
   - Extracts user ID
   - Loads conversation session (or creates new)
   - Passes message to agent service

3. Agent Service:
   - Receives message + conversation history
   - Calls LangChain agent

4. LangChain Agent:
   - Intent extraction:
     - Role: "software engineer" → searchTerm
     - Work mode: "remote" → workMode: "Remote"
   - Query generation:
     {
       searchTerm: "software engineer",
       workMode: "Remote",
       page: 1,
       limit: 10
     }
   - Tool call: search_jobs(query)

5. Backend API Client (in Career Advocate):
   - Calls GET /jobs/all-jobs?searchTerm=software+engineer&workMode=Remote
   - Headers: Authorization: Bearer <user_jwt_token> (forwarded)
   - Backend:
     - Validates token
     - Checks Redis cache
     - If miss, queries MongoDB
     - Returns paginated results

6. Agent receives jobs array from backend

7. Response synthesis:
   "I found 15 remote software engineer positions. Here are the top matches:
   - Senior Software Engineer at Tech Corp (Remote, $120k-$150k)
   - Full-Stack Developer at StartupXYZ (Remote, $90k-$120k)
   ..."

8. Career Advocate API:
   - Saves message + response to conversation session
   - Returns response to frontend

9. Frontend displays conversational response with job listings
```

## Technical Constraints

### From Requirements
- ✅ No job applications (agent only guides)
- ✅ No external web browsing
- ✅ No hallucinations (all data from backend)
- ✅ Session-scoped memory only (no long-term persistence)
- ✅ TypeScript implementation
- ✅ LangChain JS (lightweight, no LangGraph required)

### From Backend Integration
- ✅ Must use JWT Bearer token authentication
- ✅ Must respect backend query parameter structure
- ✅ Must handle pagination correctly
- ✅ Must handle backend errors gracefully

## Success Metrics

1. **Accuracy**: Zero hallucinated job listings
2. **Relevance**: Retrieved jobs match user intent
3. **Naturalness**: Conversations feel natural, not robotic
4. **Performance**: Response time < 3 seconds for typical queries
5. **Reliability**: 99%+ successful API calls

## Future Enhancements (Post-v1)

- Long-term conversation memory (user preferences)
- Job recommendations based on user profile
- Multi-turn refinement (e.g., "show me more like the first one")
- Integration with application executor (when built)
- Voice interface support
- Multi-language support

## Dependencies on Backend

### Required Backend Features (Already Available)
- ✅ Job search API with filtering
- ✅ Job detail retrieval
- ✅ Authentication/authorization
- ✅ Redis caching
- ✅ MongoDB job storage

### Potential Backend Enhancements (Nice to Have)
- Full-text search improvements (if needed for better relevance)
- Job embedding vectors for semantic search (future)
- Rate limiting per user (if needed)

## Implementation Timeline Estimate

- **Phase 1**: 1-2 days (Setup)
- **Phase 2**: 2-3 days (API Integration)
- **Phase 3**: 3-4 days (Query Mapping)
- **Phase 4**: 4-5 days (Agent Implementation)
- **Phase 5**: 2-3 days (Response Formatting)
- **Phase 6**: 3-4 days (Testing)
- **Phase 7**: 4-5 days (API Server, Routes, Middleware, Session Management)

**Total**: ~21-29 days for complete implementation

## Next Steps

1. Review and approve this roadmap
2. Set up project structure (Phase 1)
3. Begin backend API integration (Phase 2)
4. Iterate on agent implementation (Phases 3-4)
5. Test and refine (Phases 5-6)

---

**Note**: This roadmap is designed to work seamlessly with the existing `inmates-backend` infrastructure. All API endpoints, authentication mechanisms, and data structures are based on the current backend implementation.
