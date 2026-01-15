# Investigation Plan: Query Parameters Not Being Sent

## Goal
Determine why query parameters are not being sent to the backend API when the agent calls the search_jobs tool.

## Hypothesis
The agent is calling `/jobs/all-jobs` without query parameters, causing the backend to return all jobs instead of filtered results.

## Investigation Steps

### Step 1: Verify Query Builder Extraction
- Test `extractIntent()` with sample queries
- Verify it extracts: searchTerm, salaryMin, experienceLevel correctly
- Check if `normalizeIntent()` properly converts to GetJobsQueryDto

### Step 2: Verify Tool Input
- Add logging to see what the agent passes to `search_jobs` tool
- Check if agent uses `query` parameter (natural language) or structured filters
- Verify input schema matches what agent provides

### Step 3: Verify Query Building
- Add logging in `search-jobs.tool.ts` to see what query is built
- Verify `buildQueryFromMessage()` or `buildQueryFromFilters()` is called correctly
- Check if query object has the expected properties

### Step 4: Verify API Client
- Add logging to see what params are passed to `jobsApiClient.searchJobs()`
- Verify `params` object is built correctly
- Check if Axios serializes params to query string

### Step 5: Verify HTTP Request
- Add logging to see actual URL being called
- Verify query string is appended to URL
- Check if backend receives the parameters

## Expected vs Actual

**Expected for "Show me senior Python jobs paying over $100k":**
```
GET /jobs/all-jobs?searchTerm=Python&experienceLevel=Senior&salaryMin=100000
```

**Actual (from logs):**
```
GET /jobs/all-jobs
```

## Potential Issues

1. **Prompting Issue**: Agent not understanding it should pass structured filters
2. **Code Issue**: Query builder not extracting correctly
3. **Code Issue**: Params not being serialized correctly
4. **Code Issue**: Agent calling tool with wrong parameter format

## Success Criteria
- Query parameters appear in HTTP request logs
- Backend receives and processes filters correctly
- Agent gets filtered results instead of all jobs
