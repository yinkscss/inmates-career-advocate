# Inmates Career Advocate

Conversational AI agent for job discovery on the inmates.ai platform. This service provides a natural language interface for users to discover and explore job listings.

## Overview

The Career Advocate is a standalone API service that:
- Provides a conversational chat interface for job discovery
- Integrates with the inmates-backend API for job data
- Uses LangChain TypeScript for AI agent capabilities
- Validates and forwards JWT tokens for authentication

## Architecture

```
Frontend → Career Advocate API → Inmates Backend API
```

- **Frontend** calls Career Advocate endpoints (e.g., `POST /api/chat`)
- **Career Advocate** validates JWT tokens and forwards them to the backend
- **Backend** returns job data which the agent processes and formats conversationally

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Access to inmates-backend API
- OpenAI API key (or alternative LLM provider)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure `.env` file with your settings:
   - `BACKEND_API_BASE_URL`: Your inmates-backend API URL
   - `JWT_SECRET`: Must match the JWT secret used by inmates-backend
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PORT`: Server port (default: 3001)

### Development

Run in development mode with hot reload:
```bash
npm run dev
```

### Build

Build for production:
```bash
npm run build
```

Run production build:
```bash
npm start
```

## Project Structure

```
inmates-career-advocate/
├── src/
│   ├── server/          # API server (Express)
│   ├── agent/           # LangChain agent implementation
│   ├── api/             # Backend API client
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── dist/                # Compiled output
└── package.json
```

## API Endpoints

### POST /api/chat

Send a message to the conversational agent.

**Request:**
```json
{
  "message": "I'm a software engineer, show me remote jobs"
}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "response": "I found 15 remote software engineer positions...",
  "conversationId": "conv_123",
  "jobs": [...]
}
```

### POST /api/resume/build

Builds a resume PDF from structured resume content.

**Auth requirement:**
- Requires `Authorization: Bearer <jwt_token>`
- Endpoint is protected by JWT auth middleware (same auth flow as `/api/chat`)

**Request headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/pdf
```

**Request payload summary:**
- `personalInfo` (required): `firstName`, `lastName`, `email`, optional `phone`, `location`, `headline`
- `summary` or `objective` (at least one required)
- `experience` (required, min 1): role/company/date range, optional highlights
- `education` (required, min 1)
- `skills` (required, min 1)
- Optional arrays: `certifications`, `projects`, `links` (if provided, each must include at least one item)
- Unknown fields are rejected at all payload levels (strict schema validation)

**Success response (binary PDF):**
- Status: `200 OK`
- Body: raw binary PDF bytes (not JSON)
- Key response headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="<generated-or-default>.pdf"`

**Validation/auth error response:**
- Returns JSON errors (for example `400` validation failure, `401` auth failure)

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "uptime": 3600
}
```

## Development

### Code Quality

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Type Checking**: `npm run type-check`

### Testing API Connection

Test the connection to the inmates-backend API:

```bash
npm run test:api
```

This script will:
1. Test backend connectivity
2. Verify JWT token (if `TEST_JWT_TOKEN` is set in `.env`)
3. Test job search API
4. Test job retrieval by ID (if `TEST_JOB_ID` is set)
5. Test filtered search

**Setup for testing:**
1. Ensure your `.env` file has:
   - `BACKEND_API_BASE_URL` - Your backend API URL
   - `JWT_SECRET` - Must match backend JWT secret
   - `TEST_JWT_TOKEN` (optional, **dev-only**) - A valid JWT token for local testing
   - `TEST_JOB_ID` (optional) - A valid job ID for testing

2. Get a JWT token (dev only):
   - Log in through the frontend or backend auth endpoint
   - Copy the access token
   - Add it to `.env` as `TEST_JWT_TOKEN` (local development only)
   - **IMPORTANT**: Never set `TEST_JWT_TOKEN` in staging or production environments

### Testing
- Resume endpoint integration tests: `npm run test:resume`
- Full test suite: `npm run test:all`

## Environment Variables

See `.env.example` for all available configuration options.

**Important**: `TEST_JWT_TOKEN` is for local development and testing only. Never set this in staging or production environments. See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment security guidelines.

## License

Private - Internal use only
