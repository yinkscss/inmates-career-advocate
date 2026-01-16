# Conversational History Fixes

## Problem Identified

When testing conversational history, the agent was unable to extract job IDs from previous search results because:

1. **Job IDs not in conversation history**: The agent's response text didn't include job IDs, so when conversation history was passed back, the agent couldn't see them
2. **Agent calling get_job_details with invalid IDs**: The agent was attempting to call `get_job_details` multiple times but failing because it couldn't extract valid job IDs from the conversation

## Fixes Implemented

### 1. Enhanced Agent Prompt (`src/agent/prompts/agent-prompts.ts`)
- Added explicit instruction: **"CRITICAL: Always include job IDs when presenting jobs"**
- Added format example: `"**Software Engineer** at Company (ID: 696a1a3675d84991c4263b05)"`
- Enhanced instructions for extracting job IDs from conversation history

### 2. Enhanced Response Formatter (`src/utils/response-formatter.ts`)
- Modified `formatJobSummary()` to include job ID: `(ID: ${job._id})`
- Ensures job IDs are visible in formatted responses

### 3. Automatic Job ID Injection (`src/services/agent.service.ts`)
- Added logic to automatically inject job IDs into agent responses if they're missing
- Tries to inject IDs after job titles in the response
- Falls back to appending a job IDs list if title matching fails
- Format: `**Job IDs for reference:**\n1. Job Title at Company (ID: ...)`

### 4. Enhanced get_job_details Tool (`src/agent/tools/get-job-details.tool.ts`)
- Improved error handling with detailed error messages
- Enhanced tool description with explicit instructions on extracting job IDs
- Added guidance on job ID format (long alphanumeric strings)
- Instructions to look for "ID: [id]" or "Job ID: [id]" patterns in conversation history

### 5. Enhanced Tool Description for ID Extraction
- Updated `get_job_details` description to explain:
  - How to find job IDs in conversation history
  - What job ID format looks like
  - How to handle positional references ("first job", "second job")

## How It Works Now

### Flow:
1. **User searches**: "Show me remote software engineer jobs"
2. **Agent searches**: Calls `search_jobs` tool
3. **Agent responds**: Includes job IDs in response (either naturally or via injection)
   - Example: `**Frontend Software Engineer 2** at NeueHealth (ID: 696a1a3675d84991c4263b05)`
4. **Conversation history stored**: Includes the response with job IDs
5. **User asks follow-up**: "Tell me more about the first job"
6. **Agent extracts ID**: Looks for job ID in previous response (finds "ID: 696a1a3675d84991c4263b05")
7. **Agent calls tool**: `get_job_details` with the extracted ID
8. **Agent responds**: Provides detailed job information

## Testing

Run the conversational history tests:

```bash
npm run test:conversation
```

**What to look for:**
- ✅ Agent includes job IDs in initial search responses
- ✅ Agent successfully extracts job IDs from conversation history
- ✅ Agent calls `get_job_details` with valid job IDs (not multiple failed attempts)
- ✅ Agent provides detailed job information
- ✅ Agent provides application guidance

## Files Modified

1. `src/agent/prompts/agent-prompts.ts` - Enhanced system prompt
2. `src/utils/response-formatter.ts` - Added job ID to formatJobSummary
3. `src/services/agent.service.ts` - Added automatic job ID injection
4. `src/agent/tools/get-job-details.tool.ts` - Enhanced error handling and descriptions

## Next Steps

1. Run tests to verify fixes work
2. If agent still can't extract IDs, may need to:
   - Include tool results in conversation history (more complex)
   - Enhance prompt further with examples
   - Add explicit job ID extraction logic
