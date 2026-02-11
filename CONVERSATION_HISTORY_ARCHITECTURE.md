# Conversation History Architecture

## Overview

The Inmates Career Advocate uses a **backend-managed** conversation history system with **session-based isolation** to prevent user history mixing and manage memory efficiently.

---

## Architecture Diagram

```
Frontend (React)               Backend (Express/Node.js)
┌─────────────┐               ┌──────────────────────────┐
│             │               │  ConversationService     │
│  User 1     │──────────────▶│  ┌────────────────────┐  │
│  conv_123   │  API Request  │  │ Session: conv_123  │  │
│             │               │  │ - messages[]       │  │
└─────────────┘               │  │ - searchContext    │  │
                              │  │ - timestamp        │  │
                              │  └────────────────────┘  │
┌─────────────┐               │                          │
│             │               │  ┌────────────────────┐  │
│  User 2     │──────────────▶│  │ Session: conv_456  │  │
│  conv_456   │  API Request  │  │ - messages[]       │  │
│             │               │  │ - searchContext    │  │
└─────────────┘               │  │ - timestamp        │  │
                              │  └────────────────────┘  │
                              └──────────────────────────┘
```

---

## Current Implementation

### 1. **Backend Storage (In-Memory)**

**Location:** `src/services/conversation.service.ts`

```typescript
private sessions = new Map<string, ConversationSession>();

interface ConversationSession {
  conversationId: string;
  messages: ConversationMessage[];
  searchContext: SearchContext;
  lastActivity: Date;
}
```

**How it works:**
- Each conversation has a **unique ID** (e.g., `conv_1768840359291_orpqr2pjx`)
- Sessions stored in a **Map** (key = conversationId, value = session data)
- **Isolated by conversationId** - User 1 cannot access User 2's history

---

### 2. **Frontend Management**

**Location:** `Inmate-FrontEnd/src/Components/CareerAdvocate/CareerAdvocate.jsx`

```javascript
const [conversationId, setConversationId] = useState(null);

// First message: conversationId = "none"
// Backend returns: { conversationId: "conv_123..." }
// Frontend saves it and sends it with every subsequent request
```

**How it works:**
1. User opens chat → `conversationId = null`
2. First message → Frontend sends `conversationId: "none"`
3. Backend creates new session → Returns `conversationId: "conv_123..."`
4. Frontend saves it in state
5. All subsequent messages → Frontend sends same `conversationId`

---

### 3. **Session Lifecycle**

**Auto-Cleanup:**
```typescript
// sessions timeout after 30 minutes of inactivity
private sessionTimeout = 30 * 60 * 1000; // 30 mins

// Cleanup runs every 5 minutes
setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
```

**Flow:**
```
User starts chat
  ↓
Backend creates session in memory
  ↓
User inactive for 30 minutes
  ↓
Session auto-deleted from memory
  ↓
User sends new message
  ↓
Backend creates NEW session (fresh history)
```

---

## Security & Isolation

### ✅ **User Isolation**
- Each user gets a **unique conversationId**
- Sessions are **completely isolated** by ID
- User 1 cannot access User 2's history
- No shared state between conversations

### ✅ **Memory Management**
- Sessions stored **only while active**
- Auto-deleted after **30 minutes** of inactivity
- Cleanup runs **every 5 minutes**
- No persistent storage (no database bloat)

### ⚠️ **Current Limitations**

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **In-memory storage** | Lost on server restart | Move to Redis for production |
| **No authentication** | Anyone can guess conversationId | Add JWT user validation |
| **No rate limiting** | Potential abuse | Add rate limits per IP/user |
| **No persistence** | History lost after timeout | Add optional Redis/DB persistence |

---

## How Messages Are Passed

### Request Flow

```
1. Frontend sends:
{
  message: "find me jobs",
  conversationId: "conv_123"
}

2. Backend (chat.controller.ts):
- Validates JWT token
- Gets userId from token
- Retrieves conversation history from ConversationService
- Passes history to agent

3. Agent processes:
- Receives full conversation history
- Uses it for context (e.g., "find more" detection)
- Generates response

4. Backend saves:
- Adds user message to history
- Adds assistant response to history
- Updates searchContext

5. Frontend receives:
{
  response: "I found 6 jobs...",
  jobs: [...],
  conversationId: "conv_123"
}
```

---

## Code Locations

| Component | File | Responsibility |
|-----------|------|----------------|
| **Session Storage** | `src/services/conversation.service.ts` | In-memory Map, CRUD operations |
| **Session Management** | `src/controllers/chat.controller.ts` | Get/update session on each request |
| **Frontend State** | `Inmate-FrontEnd/src/Components/CareerAdvocate/CareerAdvocate.jsx` | Store conversationId in React state |
| **Search Context** | `src/services/conversation.service.ts` | Track pagination state per conversation |

---

## Production Recommendations

### 1. **Move to Redis**
```typescript
// Instead of in-memory Map:
import { createClient } from 'redis';

class ConversationService {
  private redis = createClient({ url: process.env.REDIS_URL });
  
  async getSession(id: string) {
    const data = await this.redis.get(`session:${id}`);
    return JSON.parse(data);
  }
  
  async saveSession(id: string, session: ConversationSession) {
    await this.redis.setEx(
      `session:${id}`, 
      1800, // 30 min TTL
      JSON.stringify(session)
    );
  }
}
```

**Benefits:**
- ✅ Survives server restarts
- ✅ Scales across multiple servers
- ✅ Built-in TTL (auto-expiration)
- ✅ Fast in-memory performance

### 2. **Add User Validation**
```typescript
// Validate conversationId belongs to user
const session = await conversationService.getSession(conversationId);
if (session && session.userId !== req.user.userId) {
  throw new UnauthorizedException('Access denied');
}
```

### 3. **Add Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please slow down'
});

app.use('/api/chat', chatLimiter);
```

---

## Summary

✅ **Current State:**
- Backend-managed (not frontend)
- Session-based with unique IDs
- In-memory storage (Map)
- Auto-cleanup every 5 minutes
- 30-minute timeout
- Fully isolated per conversation

⚠️ **For Production:**
- Migrate to Redis for persistence
- Add user validation for security
- Implement rate limiting
- Consider optional DB persistence for analytics

---

## Q&A

**Q: Is history on frontend or backend?**
A: **Backend**. Frontend only stores the `conversationId`.

**Q: Can users mix histories?**
A: **No**. Each conversation has a unique ID. Sessions are isolated.

**Q: What about caching/memory issues?**
A: Sessions auto-delete after 30 minutes. For production, use Redis with TTL.

**Q: What happens on server restart?**
A: In-memory sessions are lost. Use Redis for persistence.

**Q: Can someone guess a conversationId?**
A: Technically yes (current limitation). Add user validation for security.
