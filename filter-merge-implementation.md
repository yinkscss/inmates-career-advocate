# Structured Filter Merging Implementation

## Problem
When the agent passed both `query` (natural language) and structured filters (e.g., `salaryMin`), the tool only processed the `query` parameter and ignored the structured filters.

## Solution
Implemented filter merging logic that:
1. Processes natural language query first using `buildQueryFromMessage()`
2. Merges structured filters that weren't already extracted from the natural language
3. Preserves explicit filters like `salaryMin` when agent passes both

## Implementation Details

### Location
`src/agent/tools/search-jobs.tool.ts`

### Changes Made

1. **Filter Merging Logic**
   - After building query from natural language, check for structured filters
   - Only merge filters that weren't already extracted (undefined in query result)
   - Structured filters take precedence for pagination (page, limit)

2. **Merged Filters**
   - `salaryMin` - Merged if not in query result
   - `salaryMax` - Merged if not in query result
   - `location` - Merged if not in query result
   - `jobType` - Merged if not in query result
   - `workMode` - Merged if not in query result
   - `experienceLevel` - Merged if not in query result
   - `page` - Structured filter always takes precedence
   - `limit` - Structured filter always takes precedence

3. **Tool Description Update**
   - Clarified that tool accepts natural language, structured filters, or both
   - Explained that structured filters complement natural language when both are provided

## Example Behavior

### Before Fix
```typescript
// Agent input
{
  query: "senior Python",
  salaryMin: 100000,
  experienceLevel: "senior"
}

// Result: Only query processed
// Final query: { searchTerm: "Python", experienceLevel: "Senior" }
// salaryMin: 100000 was IGNORED ❌
```

### After Fix
```typescript
// Agent input
{
  query: "senior Python",
  salaryMin: 100000,
  experienceLevel: "senior"
}

// Result: Query processed, then structured filters merged
// Final query: { 
//   searchTerm: "Python", 
//   experienceLevel: "Senior",
//   salaryMin: 100000  // ✅ MERGED from structured filters
// }
```

## Testing

### Test Case: "Show me senior Python jobs paying over $100k"
**Expected Behavior**:
- Natural language query extracts: `searchTerm: "Python"`, `experienceLevel: "Senior"`
- Structured filter `salaryMin: 100000` is merged
- Final query includes all three filters

**Verification**:
Run `npm run test:agent` and check that:
1. Query includes `salaryMin=100000` in URL parameters
2. Backend receives and processes salary filter
3. Results are filtered by salary

## Benefits

1. **Preserves Explicit Filters**: Agent's explicit structured filters are never lost
2. **Flexible**: Supports natural language, structured, or hybrid approaches
3. **Smart Merging**: Only merges filters that weren't already extracted
4. **Backward Compatible**: Existing behavior unchanged when only query or only structured filters are used

## Debug Logging

Enhanced debug logging shows:
- Natural language query processing
- Each filter being merged
- Final merged query

All debug logs are gated behind `NODE_ENV === 'development'`.
