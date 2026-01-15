# Findings

## Backend Job Filtering Architecture

### Backend API (`inmates-backend`)
- **Endpoint**: `GET /jobs/all-jobs`
- **Query Parameters Supported**: 
  - `searchTerm` - Text search in title, company, description
  - `location` - Location filter (regex match)
  - `salaryMin` - Minimum salary in USD
  - `salaryMax` - Maximum salary in USD
  - `jobType` - Job type (Full-time, Part-time, Contract, Freelance)
  - `workMode` - Work mode (Remote, On-site, Hybrid)
  - `experienceLevel` - Experience level (Junior, Mid, Senior)
  - `sortBy` - Sort field (createdAt, salaryMax, salaryMin, title, company)
  - `sortOrder` - Sort order (asc, desc)
  - `page` - Page number
  - `limit` - Items per page
  - `startDate` - Start date filter
  - `endDate` - End date filter

- **Filtering Mechanism**: 
  - Server-side filtering via MongoDB queries
  - `JobQueryBuilderService.buildQuery()` builds MongoDB query from DTO
  - Filters are applied at database level, NOT client-side
  - Default date filter: last 30 days if no startDate provided

### Frontend Implementation (`Inmate-FrontEnd`)
- **Query Building**: Frontend builds query string from filters
- **Example**: `/jobs/all-jobs?searchTerm=Python&salaryMin=100000&experienceLevel=Senior`
- **Location**: `JobsContext.jsx` lines 72-86 builds `URLSearchParams` from filters
- **Filter Mapping**: Frontend maps UI filters to backend query parameters

## Current Issue: Agent Not Passing Query Parameters

### Problem
From test logs, the agent is calling `/jobs/all-jobs` without query parameters:
```
[API] GET /jobs/all-jobs
```

Expected behavior for "Show me senior Python jobs paying over $100k":
```
[API] GET /jobs/all-jobs?searchTerm=Python&experienceLevel=Senior&salaryMin=100000
```

### Root Cause Analysis

1. **Query Builder IS Working**: 
   - `buildQueryFromMessage()` uses LLM to extract intent
   - `normalizeIntent()` converts to `GetJobsQueryDto`
   - Should extract: `searchTerm: "Python"`, `experienceLevel: "Senior"`, `salaryMin: 100000`

2. **API Client IS Building Params**:
   - `jobsApiClient.searchJobs()` builds `params` object
   - Passes to `backendApiClient.get()` with `params` option
   - Axios should convert params to query string

3. **Possible Issues**:
   - Agent might not be calling tool with `query` parameter (natural language)
   - Agent might be calling tool with structured filters but they're empty
   - Query builder might not be extracting correctly
   - Params might not be serialized correctly by Axios

### Investigation Needed
- Check what the agent is actually passing to the `search_jobs` tool
- Verify query builder extraction results
- Check if Axios is properly serializing params
- Add logging to see actual query parameters being sent

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
- ✅ **RESOLVED**: Query parameters ARE being sent correctly
  - Investigation revealed this was a LOGGING issue, not a code issue
  - Query parameters are correctly extracted, built, and sent to backend
  - Enhanced logging now shows full URL with query string
  - Example: `GET /jobs/all-jobs?page=1&limit=10&searchTerm=software+engineer&workMode=Remote`
  - All steps working: query builder → tool → API client → HTTP request

- ✅ **FIXED**: Structured filter merging implemented
  - When agent passes both `query` (natural language) and structured filters, they are now merged
  - Structured filters are merged only if they weren't already extracted from natural language
  - Preserves explicit filters like `salaryMin` when agent passes both
  - Verified: Test query "Show me senior Python jobs paying over $100k" now includes `salaryMin=100000` in URL
  - Example: `GET /jobs/all-jobs?searchTerm=Python&salaryMin=100000&experienceLevel=Senior`
