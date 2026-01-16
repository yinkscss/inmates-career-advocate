# Job Extraction Fix Plan

## Problem
Jobs are not being extracted from agent responses. The `extractJobsFromMessages()` function exists but isn't finding jobs in the message array.

## Goal
Fix the job extraction to properly parse LangGraph message structure and extract job data from tool responses.

## Steps

### Step 1: Inspect Message Structure
- Add temporary debug logging to see actual message format
- Run test to capture message structure
- Document findings

### Step 2: Update Extraction Function
- Based on findings, update `extractJobsFromMessages()` to match actual format
- Handle different message types (tool messages, assistant messages with tool calls)
- Test extraction

### Step 3: Verify and Clean Up
- Remove debug logs (or gate behind NODE_ENV)
- Verify jobs are extracted correctly
- Update documentation

## Current Understanding
- Tool returns JSON string with `jobs` array
- LangGraph `createReactAgent` wraps this in messages
- Need to find where tool results are stored in message structure
