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

- ✅ **FIXED**: Job extraction from agent responses (Attempt 1)
  - Improved `extractJobsFromMessages()` to properly handle LangGraph BaseMessage types
  - Added support for BaseMessage.getContent() method
  - Enhanced tool name checking to identify job-related tools (`search_jobs`, `get_job_details`)
  - Fixed TypeScript type casting issues with BaseMessage types
  - Debug logging added to help diagnose extraction issues (gated behind NODE_ENV)
  - **Issue**: Still checking for `role === 'tool'` which LangGraph doesn't set

- ✅ **FIXED**: Job extraction from agent responses (Attempt 2 - FINAL FIX)
  - **Root Cause**: LangGraph `createReactAgent` doesn't set `role === 'tool'` on tool messages
  - **Solution**: Changed extraction to check `name === 'search_jobs'` or `name === 'get_job_details'` as PRIMARY identifier
  - Added fallback check for tool-related properties (`lc_direct_tool_output`, `tool_call_id`, `status`)
  - Try multiple content sources: `content`, `getContent()`, `lc_direct_tool_output`
  - Enhanced debug logging to show content type and preview when parsing fails
  - **Key Discovery**: Tool messages in LangGraph are identified by `name` property, not `role`
  - Jobs should now be extracted correctly from tool responses

## Phase 5 Implementation Summary
- ✅ Implemented response formatter utility (`src/utils/response-formatter.ts`)
  - Functions for formatting job summaries, salary ranges, job lists
  - Error message formatting for user-friendly display
  - Job grouping and highlighting utilities
- ✅ Enhanced error handling throughout the application
  - Agent service: Specific error type detection and user-friendly messages
  - Chat controller: Comprehensive error handling with appropriate HTTP status codes
  - Handles: authentication, network, rate limit, and generic errors
- ✅ Completed chat endpoint implementation (`POST /api/chat`)
  - Request validation (message required, non-empty)
  - Authentication token extraction and validation
  - Agent message processing
  - Structured response format with jobs, conversationId, suggestedActions
  - Error responses with appropriate status codes
- ✅ All TypeScript compilation verified

## Phase 6 Implementation Summary
- ✅ Created comprehensive unit tests
  - Query builder tests: extraction, normalization, deterministic queries, filter building
  - API client tests: error handling for network, 401, 404, timeout scenarios
- ✅ Created integration tests for agent validation
  - Zero hallucinations: Verifies agent only mentions jobs from retrieved data
  - Deterministic queries: Verifies consistent query structure
  - Grounded responses: Verifies all job details come from API
  - Natural conversation: Verifies conversational tone
- ✅ Created test runner (`src/tests/run-all-tests.ts`)
- ✅ All validation criteria met:
  - Zero hallucinated job listings ✅
  - Deterministic query generation ✅
  - Grounded in retrieved data ✅
  - Natural conversational tone ✅
- ✅ Test commands added to package.json:
  - `npm run test:unit:query` - Query builder tests
  - `npm run test:unit:api` - API client tests
  - `npm run test:integration` - Agent validation tests
  - `npm run test:all` - Run all tests
- ✅ All TypeScript compilation verified

## Pre-Phase 7: Conversational History Testing ✅

### Problem Identified
When testing conversational history, the agent was unable to extract job IDs from previous search results because:
1. Job IDs were not included in the agent's text responses
2. When conversation history was passed back, the agent couldn't see the job IDs
3. The agent called `get_job_details` multiple times with invalid/missing IDs, resulting in repeated failures

### Solution Implemented
1. **Enhanced Agent Prompt**: Added explicit instruction to always include job IDs in responses
2. **Enhanced Response Formatter**: Modified `formatJobSummary()` to include job IDs
3. **Automatic Job ID Injection**: Added logic in `agent.service.ts` to inject job IDs into responses if missing
4. **Enhanced Tool Descriptions**: Improved `get_job_details` tool with better error handling and ID extraction instructions

### Test Results ✅
**All tests passed: 12 passed, 0 failed**

**Verified Capabilities:**
- ✅ Agent includes job IDs in search responses: `**Job Title** at Company (ID: 696a1a3675d84991c4263b05)`
- ✅ Agent successfully extracts job IDs from conversation history
- ✅ Agent handles various phrasings:
  - "Tell me more about the first job" → Extracts first job ID ✅
  - "What's the description for job [ID]?" → Uses provided ID ✅
  - "I want details on [ID]" → Extracts ID from message ✅
  - "Tell me about job number 1" → Extracts first job ID ✅
- ✅ Agent successfully calls `get_job_details` with valid IDs (no repeated failures)
- ✅ Agent provides comprehensive job descriptions
- ✅ Agent provides application guidance with URLs

### Files Modified
- `src/agent/prompts/agent-prompts.ts` - Enhanced system prompt
- `src/utils/response-formatter.ts` - Added job ID to formatJobSummary
- `src/services/agent.service.ts` - Added automatic job ID injection
- `src/agent/tools/get-job-details.tool.ts` - Enhanced error handling and descriptions
- `src/tests/integration/conversational-history.test.ts` - Comprehensive test suite

### Key Insight
The critical fix was ensuring job IDs are visible in the conversation history. By including job IDs in the agent's text responses (either naturally via prompt or automatically via injection), the agent can now extract them when users ask follow-up questions. This enables true conversational flow where users can reference jobs from previous searches.

## Post-Phase 7: Response Quality Issues

### Issue 1: Verbose, Formal Response Format
**Problem**: Agent responses are too formal and verbose with bullet points and markdown formatting
**Example**:
```
I found some job opportunities for Junior Full-Stack Developers! Here are the details:

1. **Junior Full-Stack Developer** at **SMRTR Solutions**  
   - **Location**: Remote  
   - **Work Mode**: Remote  
   ...
```
**Desired**: More conversational, cleaner format like "I found 4 jobs for you. The first one is..."

### Issue 2: Duplicate Jobs
**Problem**: Backend returns same job 4 times with different IDs
**Example**: All 4 results are identical "Junior Full-Stack Developer at SMRTR Solutions"
**Solution**: Implement deduplication based on job content (title + company + description)

### Issue 3: Search Term Normalization
**Problem**: "graphics designer" should be normalized to "graphics-designer" for better search
**Analysis**: Common job titles often use hyphens (e.g., "full-stack", "front-end", "back-end")
**Solution**: Add normalization rule to convert common multi-word job titles to hyphenated format

### Issue 4: Conversation History Count
**Problem**: User expects 6 conversations but sees different count
**Analysis**: Need to verify conversation service is counting correctly (user messages + assistant messages)
**Note**: Conversation history count depends on the `addMessage()` calls in the chat controller. Each user message and assistant response should be counted as separate messages.

### Solutions Implemented

1. **Conversational Response Style** ✅
   - Updated system prompt to emphasize natural, flowing conversation
   - Removed excessive markdown and bullet points from examples
   - Added conversational examples showing cleaner output format
   - File: `src/agent/prompts/agent-prompts.ts`

2. **Job Deduplication** ✅
   - Implemented `deduplicateJobs()` method in AgentService
   - Creates content-based key: `title + company + description preview`
   - Keeps only first occurrence of each unique job
   - Handles backend returning same job with different IDs
   - File: `src/services/agent.service.ts`

3. **Hyphenated Job Title Normalization** ✅
   - Added `normalizeSearchTerm()` function to query builder
   - Converts common patterns: "graphics designer" → "graphics-designer"
   - Handles: full stack, front end, back end, web developer, etc.
   - Improves search accuracy for multi-word job titles
   - File: `src/utils/query-builder.ts`

### Expected Improvements
- Agent responses will be more conversational and cleaner
- Duplicate jobs will be filtered out automatically
- Search terms like "graphics designer" will be normalized to "graphics-designer" for better backend matching
- Overall better user experience with natural conversation flow

## New Issues Found (User Testing)

### Issue 1: Case Sensitivity Bug - workMode
**Problem:** Agent sends `workMode: "remote"` (lowercase) but backend expects `workMode: "Remote"` (capitalized)
**Error from logs:**
```
[API Error] 400: {
  message: ['workMode must be one of the following values: Remote, On-site, Hybrid']
}
```
**Root Cause:** The agent tool is passing lowercase "remote" when user says "remote", but backend enum requires capitalized values
**Solution:** Normalize enum values in the search_jobs tool before sending to API

### Issue 2: Missing Retry Logic
**Problem:** When API returns 400 errors (validation errors), agent gives up without retrying
**Expected Behavior:** 
- If backend returns validation error (e.g., wrong enum case), retry with corrected values
- Implement smart retry logic that fixes common issues (case sensitivity, enum values)
**Solution:** Add retry logic to API client with error-specific fixes

### Issue 3: Jobs Not Sent to Frontend
**Problem:** Agent found 9 jobs but frontend only shows 2-3
**Root Causes Found:**
1. ❌ **Frontend limitation**: `CareerAdvocate.jsx` line 156 used `.slice(0, 3)` to limit display to first 3 jobs
2. ❌ **Aggressive deduplication**: Content-based deduplication was removing jobs with similar titles/companies
**User Requirement:** ALL jobs found should be displayed programmatically for future features
**Solutions Implemented:**
1. ✅ Removed `.slice(0, 3)` from frontend - now displays ALL jobs in `message.jobs` array
2. ✅ Changed deduplication to ID-only - only removes exact same job ID duplicates
3. ✅ All jobs from backend are now sent and displayed in frontend

### Issue 4: finalPage Calculation Bug (✅ FIXED)
**Problem:** Page doesn't increment on "find more" - keeps fetching page 2 instead of moving to page 3
**Evidence from Logs:**
```
[TOOL DEBUG] Fetched page 2: 2 jobs
[DEBUG] Final page from tool: 1  ❌ (should be 2!)
```
**Root Cause:** 
- `finalPage: currentPageToFetch - 1` calculation is incorrect
- When we fetch page 2 and immediately break (last page), `currentPageToFetch` is still 2
- So `finalPage = 2 - 1 = 1` ❌ (should be 2)
**Solution:** 
- Track `lastSuccessfulPage` variable
- Update it on every successful fetch: `lastSuccessfulPage = currentPageToFetch`
- Return `finalPage: lastSuccessfulPage` instead of calculated value
**Result:**
- Page 1 → finalPage = 1 ✅
- Page 2 → finalPage = 2 ✅ (was 1 before)
- Next "find more" → starts from page 3 ✅ (was page 2 before)

### Issue 5: LLM Overrides Page from Context (✅ FIXED)
**Problem:** Auto-pagination stops at page 2, doesn't continue to page 3+
**Evidence from Logs:**
```
[TOOL DEBUG] Using page from context: 3  ✅ (correct!)
[TOOL DEBUG] Merging structured filters: {
  "page": 2,  ❌ (LLM passes page: 2)
}
[TOOL DEBUG] Final merged query: {
  "page": 2,  ❌ (overwrites context!)
}
```
**Root Cause:**
- The LLM decides what parameters to pass to the tool
- It sees conversation history and passes `page: 2` in structured filters
- This OVERRIDES the `page: 3` from search context
- Structured filters are merged AFTER setting page from context
**Solution:**
- Remove `page` from structured filters before merging
- Page should ONLY come from context/options, never from LLM
- This ensures consistent pagination control

### Issue 6: "Find More" Not Incrementing from finalPage
**Problem:** After first search ends at page 1, "find more" should start from page 2, but starts from page 1 again
**Evidence from Logs:**
```
First search: finalPage = 1
User: "can you find me more?"
[TOOL DEBUG] Using page from context: 1  ❌ (should be 2!)
```
**Root Cause:**
- `isFindMoreRequest` detection increments `currentPage` from `searchContext.currentPage`
- But if there's no search context, it defaults to page 1
- OR the increment logic isn't working correctly
**Solution:**
- Fix increment logic: `currentPage = (searchContext?.currentPage || 0) + 1`
- This ensures "find more" always moves to next page

### Issue 7: Stops After First Empty Page (✅ FIXED)
**Problem:** Auto-pagination stops immediately when a page returns 0 results
**User Requirement:** "if no results, keep on looking, keep increasing the page, until after 5 increments"
**Solution:**
- Track consecutive empty pages
- Keep fetching until 5 consecutive empty pages
- Only then stop and report no results

### Issue 8: "Find More" Regex Too Narrow
**Problem:** User says "can you search for more" but system doesn't recognize it as "find more" request
**Evidence:**
```
User: "can you search for more"
[AGENT SERVICE DEBUG] New search, starting from page 1  ❌
# Should detect as "find more" and increment page
```
**Root Cause:**
```typescript
// Current regex (TOO NARROW):
/find\s+more|show\s+more|see\s+more|more\s+jobs|next\s+page/i
// ❌ Doesn't match: "search for more", "find me more", "any more"
```
**User Requirement:** 
"So if it stops at five, then next time I see 'Show more,' it's going 5, 6, 7, 8, 9"
"It's just in a loop: 1 to 5, 1 to 5, 1 to 5. Keep increasing and increasing."
**Solution:**
- Let the LLM classify intent (already running, no extra cost)
- LLM determines: "find_more" vs "new_search"
- More robust and context-aware than keywords/regex

### Issue 9: LLM Classifies First Message as "find_more"
**Problem:** First message with no search context is classified as "find_more"
**Evidence:**
```
conversationId: "none" (first message)
LLM classified: find_more ❌
Result: Searches page 2 instead of page 1
```
**Root Cause:** 
- Intent classification runs even when there's no meaningful search context
- LLM sees "Show me" and incorrectly classifies as continuation
**Solution:**
- Only run LLM classification if searchContext exists AND has a valid currentPage
- For first messages, always treat as new_search

### Issue 10: LLM Mis-classifies New Search as "find_more"
**Problem:** User says "Show me remote software engineer jobs" but LLM thinks it's "find_more"
**Evidence:**
```
Previous context exists (page 1)
User: "Show me remote software engineer jobs" (NEW search!)
LLM: find_more ❌ (should be new_search)
```
**Root Cause:** LLM doesn't know what the previous search was about, so can't compare
**Solution:** Include previous search query in the classification prompt for comparison