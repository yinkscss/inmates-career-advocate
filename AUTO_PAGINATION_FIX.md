# Auto-Pagination & Page Persistence Fix

## Problem Statement

**User Feedback:**
> "if less than 5 jobs are found in a page, it should go to next page again, and combine the result"
> "agent is supposed to move to the next page... Agent stayed on page 2, same filters"

## Issues Identified

### Issue 1: No Auto-Pagination
**Problem:** Agent only fetches one page at a time, even if it returns fewer jobs than expected.

**Example:**
- Search returns 7 jobs (page 1)
- User expects at least 10 jobs
- Agent should automatically fetch page 2 and combine results

### Issue 2: Page Not Incrementing on "Show More"
**Problem:** When user says "show more" multiple times, page doesn't increment properly.

**Evidence from logs:**
```
First "show more" → page 2 ✅
Second "show more" → page 2 again ❌ (should be page 3)
```

**Root Cause:** Search context wasn't being updated with the actual final page number.

---

## Solution Implemented

### 1. Auto-Pagination Loop ✅

**New Behavior in `search-jobs.tool.ts`:**

```typescript
while (currentPageToFetch <= maxPages && allJobs.length < targetJobCount) {
  // Fetch page
  result = await jobsApiClient.searchJobs(pageQuery, token);
  
  // Add jobs to collection
  allJobs.push(...result.data);
  
  // If this page returned fewer jobs than limit, might be last page
  if (result.data.length < limit && currentPageToFetch >= totalPages) {
    break; // No more pages available
  }
  
  // Continue to next page if we need more jobs
  currentPageToFetch++;
}
```

**Example Flow:**
```
Request: "find me software engineer jobs"
↓
Fetch page 1 → 7 jobs (< 10 target)
↓
Auto-fetch page 2 → 3 jobs
↓
Combine: 7 + 3 = 10 jobs total
↓
Return combined results to user
```

---

### 2. Page Persistence Fix ✅

**Problem:** Search context stored starting page, not final page.

**Before:**
```typescript
searchContext: {
  currentPage: 1,  // Starting page
}
```

**After:**
```typescript
// Tool returns finalPage in response
return JSON.stringify({
  finalPage: currentPageToFetch - 1,  // Last page actually fetched
  jobs: allJobs
});

// Agent extracts finalPage from tool response
searchContext: {
  currentPage: finalPageFromTool || currentPage,  // Use actual final page
}
```

**Example:**
```
Search 1: Fetches pages 1+2 auto → finalPage = 2
  ↓ Context saved: currentPage = 2
  
"show more": Starts from page 3 (not page 2!)
```

---

## Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `targetJobCount` | 10 | Try to get at least 10 jobs |
| `maxPagesToFetch` | 3 | Max pages to fetch (30 jobs total) |
| `limit per page` | 10 | Jobs per page from backend |

---

## Expected Behavior

### Scenario 1: Auto-Pagination
```
User: "find me UI/UX jobs"
Backend page 1: 7 jobs
↓ (auto-fetch because 7 < 10)
Backend page 2: 5 jobs
↓
Agent returns: 12 jobs combined (7+5)
Context saved: currentPage = 2
```

### Scenario 2: "Show More" After Auto-Pagination
```
Previous search ended at page 2
User: "show more"
↓
Agent starts from page 3 (not page 2!)
Backend page 3: 3 jobs
↓
Agent returns: 3 more jobs
Context saved: currentPage = 3
```

### Scenario 3: Hit Max Pages
```
Pages fetched: 1, 2, 3 (max reached)
User: "show more"
↓
Agent resets to page 1 with broader filters
(removes some criteria for wider search)
```

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/agent/tools/search-jobs.tool.ts` | Auto-pagination loop with job combining | 158-330 |
| `src/services/agent.service.ts` | Extract finalPage from tool response | 64-88, 195-202 |

---

## Testing Recommendations

### Test 1: Auto-Pagination
```
Query: "find me junior developer jobs"
Expected:
- If page 1 has 7 jobs, auto-fetch page 2
- Return combined results (e.g., 7+3=10 jobs)
- Logs show: "Fetched page 1: 7 jobs", "Fetched page 2: 3 jobs"
```

### Test 2: "Show More" Incrementing
```
Query 1: "find me jobs" → Returns jobs from pages 1+2 (auto-paginated)
Query 2: "show more" → Fetches page 3 (not page 2 again!)
Query 3: "show more" → Resets to page 1 (broader search)
```

### Test 3: Max Pages Limit
```
Query: "developer jobs" 
Expected:
- Fetches up to 3 pages max (30 jobs)
- Stops even if more pages exist
- User can "show more" for broader search
```

---

## Critical Bug Fix: finalPage Calculation

### The Bug

**Problem:** Page doesn't increment on consecutive "find more" requests.

**Evidence:**
```bash
First "show more":  page 2 ✅
Second "find more": page 2 again ❌ (should be page 3!)
```

**Logs showed:**
```
[TOOL DEBUG] Fetched page 2: 2 jobs
[DEBUG] Final page from tool: 1  ❌ (WRONG!)
```

### Root Cause

**Before (BROKEN):**
```typescript
let currentPageToFetch = 2; // Start from page 2

// Fetch page 2
allJobs.push(...result.data);

// Check if last page
if (currentPageToFetch >= totalPages) {
  break; // Exit loop WITHOUT incrementing
}

// Return
return {
  finalPage: currentPageToFetch - 1  // 2 - 1 = 1 ❌
};
```

**Why it breaks:**
- We fetched page 2 successfully
- We broke out of loop WITHOUT incrementing `currentPageToFetch`
- `currentPageToFetch - 1 = 2 - 1 = 1` ❌
- Search context saves `currentPage: 1`
- Next "find more" starts from page 2 again!

### The Fix

**After (CORRECT):**
```typescript
let lastSuccessfulPage = 0; // Track actual last fetched page

// Fetch page 2
allJobs.push(...result.data);
lastSuccessfulPage = currentPageToFetch; // Save: lastSuccessfulPage = 2 ✅

// Return
return {
  finalPage: lastSuccessfulPage  // Returns 2 ✅
};
```

**Result:**
```
Fetch page 1 → finalPage = 1 → context saves currentPage: 1
"show more" → Fetch page 2 → finalPage = 2 → context saves currentPage: 2 ✅
"find more" → Fetch page 3 (not page 2 again!) ✅
```

---

## Impact

**Before:**
- Only 1 page fetched (max 10 jobs)
- Page 1 with 7 jobs = only 7 jobs shown
- "Show more" doesn't increment page properly (stuck on page 2)
- finalPage calculation wrong

**After:**
- ✅ Auto-fetch multiple pages (up to 3)
- ✅ Combine results (7+3=10 jobs)
- ✅ "Show more" properly increments (page 1 → page 2 → page 3)
- ✅ finalPage correctly tracked
- ✅ User gets maximum results with minimum effort

## Critical Bug Fix #2: LLM Overriding Page Number

### The Bug

**Problem:** Auto-pagination stops at page 2, never goes to page 3+

**Evidence:**
```bash
Context says: page 3 ✅
LLM passes: page 2 ❌
Final query: page 2 ❌ (OVERRIDDEN!)
```

**Logs:**
```
[TOOL DEBUG] Using page from context: 3  ✅
[TOOL DEBUG] Merging structured filters: { "page": 2 }  ❌
[TOOL DEBUG] Final merged query: { "page": 2 }  ❌
```

### Root Cause

The LLM decides what parameters to pass to the tool. When user says "show more", the LLM sees:
1. Previous search was on page 2
2. User wants more results
3. LLM thinks: "I should search page 2 again" (wrong!)
4. Passes `page: 2` in structured filters
5. This OVERWRITES the context's `page: 3`

**Code flow:**
```typescript
// 1. Set page from context
query.page = options?.currentPage || 1;  // page = 3 ✅

// 2. Merge structured filters (from LLM)
query = { ...query, ...structuredFilters };  // page = 2 ❌ OVERWRITE!
```

### The Fix

**Don't let LLM control pagination:**
```typescript
// Remove 'page' from structured filters before merging
const { page: _ignoredPage, ...filtersWithoutPage } = structuredFilters;

// Now merge without 'page'
query = { ...query, ...filtersWithoutPage };  // page = 3 ✅ PRESERVED!
```

**Result:**
- Page ONLY comes from context/options
- LLM cannot override it
- Pagination increments correctly: 1 → 2 → 3 → 4 → ...

---

## User Requirements Met

> "if less than 5 jobs are found in a page, it should go to next page again, and combine the result"

✅ **Implemented**: Auto-pagination fetches next page if results < 10, combines all results into one response.

> "it keeps stopping at page 2, i want it to keep increasing, search more pages"

✅ **Fixed**: 
1. finalPage calculation now correct
2. LLM cannot override page from context
3. Pagination continues: 1 → 2 → 3 → 4 → ...
