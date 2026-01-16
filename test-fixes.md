# Test Fixes Applied

## Issues Found and Fixed

### 1. Query Normalization Tests

**Problem:**
- Tests were calling `normalizeIntent()` directly with raw objects like `{workMode: 'remote'}`
- `normalizeIntent()` expects `ExtractedIntent` type which has enum values from LLM extraction
- The normalization actually happens during `buildQueryFromMessage()` which calls `extractIntent()` then `normalizeIntent()`

**Fix:**
- Changed tests to use `buildQueryFromMessage()` for end-to-end testing
- Tests now pass natural language strings and verify the normalized output
- This tests the actual normalization flow as it's used in production

**Example:**
```typescript
// Before (incorrect):
normalizeIntent({ workMode: 'remote' }) // ❌ Doesn't work

// After (correct):
buildQueryFromMessage("Show me remote jobs") // ✅ Tests actual flow
```

### 2. API Client Error Tests

**Problem:**
- Tests expected `Error` instances: `error instanceof Error`
- API client actually throws `ApiError` objects (not Error instances)
- `ApiError` is a plain object with `{ error, message, statusCode? }` structure

**Fix:**
- Updated tests to check for `ApiError` objects: `error && typeof error === 'object' && 'error' in error`
- Tests now properly validate the error structure
- Added fallback check for `Error` instances for other error types

**Example:**
```typescript
// Before (incorrect):
if (error instanceof Error) { ... } // ❌ ApiError is not an Error instance

// After (correct):
if (error && typeof error === 'object' && 'error' in error) {
  const apiError = error as ApiError; // ✅ Checks ApiError structure
}
```

## Test Results After Fixes

### Expected Improvements:
- Query normalization tests: Should now pass (testing actual normalization flow)
- API client error tests: Should now properly detect ApiError objects

### Test Status:
- Run `npm run test:all` to see updated results
- Some tests may still show warnings if backend is unavailable (expected behavior)

## Files Modified

- `src/tests/unit/query-builder.test.ts` - Fixed normalization test approach
- `src/tests/unit/api-client.test.ts` - Fixed error type checking
- `task_plan.md` - Documented fixes
- `progress.md` - Updated with fix details
