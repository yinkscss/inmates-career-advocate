# Conversational History Testing

## Overview

Before Phase 7, we're testing how the agent handles conversational history, specifically:
1. **Job Search** → User asks for jobs
2. **Follow-up Details** → User asks for details on a specific job
3. **ID Extraction** → Agent extracts job ID from conversation history
4. **Job Summarization** → Agent summarizes job description
5. **Application Guidance** → Agent guides user on how to apply

## Test Scenarios

### Scenario 1: Complete Conversational Flow

**Flow:**
1. User: "Show me remote software engineer jobs"
2. Agent: Searches and presents jobs with IDs
3. User: "Tell me more about the first job"
4. Agent: Extracts job ID from history → Calls `get_job_details` → Summarizes → Provides application guidance
5. User: "How do I apply for this job?"
6. Agent: Provides clear application instructions with URL

**What We're Testing:**
- ✅ Agent can extract job IDs from previous search results
- ✅ Agent calls `get_job_details` tool correctly
- ✅ Agent summarizes job description effectively
- ✅ Agent provides application guidance with URLs

### Scenario 2: Job ID Extraction

**Test Cases:**
- "Tell me more about the first job"
- "What's the description for job [ID]?"
- "I want details on [ID]"
- "Tell me about job number 1"

**What We're Testing:**
- ✅ Agent extracts job ID from various phrasings
- ✅ Agent handles positional references ("first", "second", "number 1")
- ✅ Agent handles direct ID references

### Scenario 3: Job Description Summarization

**What We're Testing:**
- ✅ Agent provides comprehensive job description summary
- ✅ Agent highlights key requirements and qualifications
- ✅ Agent mentions important skills/experience needed
- ✅ Summary is substantial (not just title/company)

### Scenario 4: Application Guidance

**What We're Testing:**
- ✅ Agent provides clear application instructions
- ✅ Agent includes application URL
- ✅ Agent mentions alternative application methods (email if available)
- ✅ Guidance is actionable and clear

## Enhancements Made

### 1. Enhanced Agent Prompts

**Updated `SYSTEM_PROMPT` in `agent-prompts.ts`:**
- Added explicit instructions for extracting job IDs from conversation history
- Added guidance on handling positional references ("first job", "second job")
- Added instructions for application guidance

### 2. Enhanced Tool Descriptions

**Updated `search-jobs.tool.ts`:**
- Added `index` field to job results (1-based) for positional references
- Enhanced tool description to emphasize job IDs are available for follow-ups
- Instructions to include job IDs when presenting results

**Updated `get_job_details.tool.ts`:**
- Enhanced description with explicit instructions on extracting IDs from history
- Added guidance on handling positional references
- Added instructions for summarizing and providing application guidance

### 3. Test Suite Created

**File: `src/tests/integration/conversational-history.test.ts`**

**Tests:**
1. `testConversationalHistoryFlow()` - Complete flow test
2. `testJobIdExtraction()` - ID extraction from various phrasings
3. `testJobDescriptionSummarization()` - Description summarization quality
4. `testApplicationGuidance()` - Application guidance quality

## Running the Tests

```bash
# Run conversational history tests
npm run test:conversation

# Requires:
# - Backend API running
# - TEST_JWT_TOKEN in .env (dev-only, never set in production)
```

## Expected Behavior

### When User Asks for Job Details

**Input:** "Tell me more about the first job"

**Expected Agent Behavior:**
1. Looks at previous `search_jobs` results in conversation history
2. Extracts job ID of the first job (index: 1)
3. Calls `get_job_details` tool with that ID
4. Summarizes the job description
5. Highlights key requirements
6. Mentions application URL

**Example Response:**
```
Here are the details for the first job:

**Frontend Software Engineer 2** at NeueHealth

**Location:** Remote
**Work Mode:** Remote
**Salary:** $120,000 - $180,000

**Description:**
[Summarized description highlighting key points]

**Requirements:**
- [Key skills/experience needed]

**How to Apply:**
You can apply by visiting: [Application URL]
[If company email available: Alternatively, you can email your application to [email]]
```

### When User Asks How to Apply

**Input:** "How do I apply for this job?"

**Expected Agent Behavior:**
1. References the job from previous conversation
2. Provides the application URL
3. Gives clear, actionable instructions
4. Mentions alternative methods if available

## Potential Issues to Watch For

1. **ID Extraction Failure**
   - Agent may not extract job ID from history
   - Solution: Enhanced prompts and tool descriptions

2. **Missing Application URL**
   - Agent may not include URL in response
   - Solution: Enhanced prompts emphasize including URLs

3. **Incomplete Summarization**
   - Agent may not summarize description well
   - Solution: Tool provides full description, prompts guide summarization

4. **No Application Guidance**
   - Agent may not provide clear guidance
   - Solution: Enhanced prompts with explicit instructions

## Files Modified

- `src/agent/prompts/agent-prompts.ts` - Enhanced system prompt
- `src/agent/tools/search-jobs.tool.ts` - Added index field, enhanced description
- `src/agent/tools/get-job-details.tool.ts` - Enhanced description with ID extraction guidance
- `src/tests/integration/conversational-history.test.ts` - Created comprehensive test suite
- `package.json` - Added `test:conversation` script

## Next Steps

1. Run the tests: `npm run test:conversation`
2. Review test results
3. If issues found, enhance prompts further or adjust tool behavior
4. Once passing, proceed to Phase 7
