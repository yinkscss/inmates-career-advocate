# Testing Guide

## Phase 5 Testing

### Quick Test

Run all Phase 5 tests:
```bash
npm run test:phase5
```

This tests:
- ✅ Response formatter utilities (10 tests)
- ⚠️  Chat endpoint (requires server running)

### Testing Response Formatters

Response formatter tests don't require the server to be running:
```bash
npm run test:phase5
```

**Tests included:**
1. `formatSalaryRange()` - Salary formatting (min/max, min only, max only, none)
2. `formatJobSummary()` - Single job formatting
3. `formatJobsList()` - Multiple jobs formatting
4. `groupJobsByCategory()` - Job grouping by work mode
5. `formatErrorMessage()` - Error message formatting
6. `formatNoJobsMessage()` - No jobs found message with suggestions

### Testing Chat Endpoint

The chat endpoint tests require:
1. Server running (`npm run dev`)
2. Backend API running (`http://localhost:6543/api`)
3. Valid JWT token in `.env` as `TEST_JWT_TOKEN` (dev-only, see note below)

**IMPORTANT: TEST_JWT_TOKEN is DEV-ONLY**
- `TEST_JWT_TOKEN` should **only** be set in local development environments
- **Never** set `TEST_JWT_TOKEN` in staging or production environment variables
- For production troubleshooting, obtain a token by logging into the real frontend or calling the backend auth endpoint, then paste it temporarily into a local `.env` file on your machine (not into server-side production envs)

**Steps:**

1. **Start the server:**
   ```bash
   npm run dev
   ```
   Server will run on port 3001 (or PORT from .env)

2. **Ensure backend is running:**
   - Backend should be accessible at `http://localhost:6543/api`
   - Health check: `curl http://localhost:6543/api/health`

3. **Get a JWT token (dev only):**
   ```bash
   npm run extract-token
   # Or manually add TEST_JWT_TOKEN to .env (local development only)
   ```

4. **Run endpoint tests:**
   ```bash
   npm run test:phase5
   ```

**Endpoint tests:**
- ✅ Valid chat request with authentication
- ✅ Missing message (400 error)
- ✅ Empty message (400 error)
- ✅ Missing authentication (401 error)

### Manual Testing

You can also test the endpoint manually with curl:

```bash
# Valid request
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me remote software engineer jobs"}'

# Missing message (should return 400)
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Missing auth (should return 401)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
```

### Expected Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "response": "Here are some remote software engineering jobs...",
    "jobs": [
      {
        "_id": "...",
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        ...
      }
    ],
    "conversationId": "conv_1234567890",
    "jobsCount": 10,
    "suggestedActions": ["View job details", "Refine search", "Apply to job"]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to process message",
  "message": "I'm having trouble authenticating. Please check your login and try again."
}
```

### Other Test Scripts

- `npm run test:api` - Test backend API connectivity
- `npm run test:query-builder` - Test natural language query extraction
- `npm run test:agent` - Test full agent with sample queries

### Troubleshooting

**Server not running:**
- Error: `ECONNREFUSED`
- Solution: Start server with `npm run dev`

**Backend not accessible:**
- Error: Network errors in agent
- Solution: Ensure backend is running on `http://localhost:6543/api`

**Invalid token:**
- Error: `401 Unauthorized`
- Solution: Get fresh token with `npm run extract-token` (dev only)

**Token expired:**
- Error: `Token expired`
- Solution: Get new token (tokens typically expire after 1 hour). Remember: `TEST_JWT_TOKEN` is for local development only.

**Production Testing:**
- Do not use `TEST_JWT_TOKEN` in production environments
- For production troubleshooting, use real JWTs obtained from authenticated frontend sessions
- Tests that require `TEST_JWT_TOKEN` will automatically skip when it's not set (this is expected in production)
