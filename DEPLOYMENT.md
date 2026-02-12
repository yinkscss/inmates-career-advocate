# Deployment Guide

## Environment Variables

### Required Variables

- `BACKEND_API_BASE_URL` - Backend API URL (e.g., `https://api.inmates.ai/api`)
- `JWT_SECRET` - Must match the JWT secret used by the backend
- `OPENAI_API_KEY` - OpenAI API key (or use `ANTHROPIC_API_KEY` for alternative)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (`production`, `staging`, `development`)
- `CORS_ORIGINS` or `CORS_ORIGIN` - Allowed frontend origins (comma-separated for multiple)

### Optional Variables

- `AGENT_MODEL` - LLM model to use (default: `gpt-4o-mini`)
- `AGENT_TEMPERATURE` - Agent temperature (default: `0.1`)
- `MAX_ITERATIONS` - Max tool calls per conversation turn (default: `10`)
- `MAX_HISTORY_MESSAGES` - Max conversation history messages (default: `12`)

### Production CORS Configuration

For production deployments, set:

```
CORS_ORIGINS=https://inmates.ai,https://www.inmates.ai
```

This allows:
- Production frontend (`https://inmates.ai`)
- Production frontend with www (`https://www.inmates.ai`)

## Security Checklist

### DO NOT SET in Production/Staging

- **`TEST_JWT_TOKEN`** - This is for local development and integration tests only. Never set this in production or staging environment variables. If present in production envs, it is a misconfiguration and should be removed immediately.

### Production Environment Variables

Production deployments should only include:
- Required variables listed above
- Optional variables as needed
- **Never** include `TEST_JWT_TOKEN` or any test-specific tokens

## Deployment Steps

1. Ensure all required environment variables are set in your deployment platform's secret management
2. Verify `TEST_JWT_TOKEN` is **not** present in production/staging environments
3. Set `NODE_ENV=production` for production deployments
4. Configure `CORS_ORIGINS` to include all allowed frontend origins (comma-separated)
5. Deploy using your platform's deployment process (e.g., Docker, Railway, AWS, etc.)

## Testing in Production

For production troubleshooting:
1. Do not use `TEST_JWT_TOKEN` - it should not exist in production
2. Obtain a real JWT token by logging into the frontend application
3. Use the token temporarily in local test scripts (not in server-side envs)
4. Tests that require `TEST_JWT_TOKEN` will automatically skip when it's not set (this is expected and correct)

## Docker Deployment

The `captain-definition` file defines the Docker build process. Ensure environment variables are passed via your deployment platform's environment variable configuration, not hardcoded in Dockerfiles or checked into version control.
