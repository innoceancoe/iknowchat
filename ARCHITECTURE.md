# InnoChat — System Architecture Design

> **Version:** 1.0  
> **Date:** July 2026  
> **Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Tech Stack Summary](#3-tech-stack-summary)
4. [Frontend Architecture (Next.js + React)](#4-frontend-architecture-nextjs--react)
5. [Backend Architecture (Node.js)](#5-backend-architecture-nodejs)
6. [Authentication (Clerk / OAuth)](#6-authentication-clerk--oauth)
7. [AI & LLM Layer (OpenAI ChatGPT)](#7-ai--llm-layer-openai-chatgpt)
8. [Memory & Context Layer (Redis)](#8-memory--context-layer-redis)
9. [Database Layer (PostgreSQL)](#9-database-layer-postgresql)
10. [Web Search Integration (Serper API)](#10-web-search-integration-serper-api)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [API Design](#12-api-design)
13. [Database Schema](#13-database-schema)
14. [Caching Strategy](#14-caching-strategy)
15. [Security Model](#15-security-model)
16. [Scalability & Deployment](#16-scalability--deployment)
17. [Environment Variables Reference](#17-environment-variables-reference)

---

## 1. Overview

**InnoChat** is a custom-branded AI chat application that delivers a ChatGPT-powered conversational experience under a fully controlled UI/UX. It supports multi-turn conversations with persistent memory, real-time web search augmentation, and secure user management — all wrapped in a white-label design system.

### Core Goals

| Goal | Mechanism |
|---|---|
| Custom branding & UI | Next.js + custom design system |
| AI chat responses | OpenAI ChatGPT API (GPT-4o) |
| Persistent conversation memory | Redis (short-term) + PostgreSQL (long-term) |
| Real-time web search grounding | Serper.dev API |
| Secure user auth | Clerk (primary) or OAuth 2.0 |
| Scalable data store | PostgreSQL with connection pooling |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │         Next.js 14 App (React 19 + TypeScript)           │     │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐             │     │
│   │   │  Chat UI │  │ Settings │  │ History  │             │     │
│   │   └──────────┘  └──────────┘  └──────────┘             │     │
│   └──────────────────────────┬───────────────────────────────┘     │
└─────────────────────────────│───────────────────────────────────────┘
                               │  HTTPS / SSE
┌──────────────────────────────▼──────────────────────────────────────┐
│                        GATEWAY LAYER                                │
│              Reverse Proxy / Load Balancer (Nginx)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                       BACKEND LAYER (Node.js)                       │
│                                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Auth       │  │ Chat         │  │ Search     │  │ User &    │  │
│  │ Middleware │  │ Controller   │  │ Controller │  │ Session   │  │
│  └────────────┘  └──────────────┘  └────────────┘  └───────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Service Layer                              │ │
│  │  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐ │ │
│  │  │  AI Service  │  │ Memory Service│  │  Search Service    │ │ │
│  │  │  (OpenAI)    │  │ (Redis)       │  │  (Serper API)      │ │ │
│  │  └──────────────┘  └───────────────┘  └────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────┬───────────────────────┘
                       │                      │
         ┌─────────────▼──────┐   ┌───────────▼──────────┐
         │   Redis Cluster    │   │   PostgreSQL (Primary)│
         │  (Chat History +   │   │   (Users, Threads,    │
         │   Context Cache)   │   │    Messages, Config)  │
         └────────────────────┘   └───────────────────────┘
```

---

## 3. Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, React 19, TypeScript | App shell, SSR/SSG, routing |
| **Styling** | Tailwind CSS + custom design tokens | Brand-controlled UI |
| **State Management** | Zustand / React Context | Client-side state |
| **Backend** | Node.js (Express or Fastify) | REST API + SSE server |
| **Auth** | Clerk (primary) or OAuth 2.0 (Google/GitHub) | User identity & sessions |
| **AI** | OpenAI API (GPT-4o / GPT-4-turbo) | LLM completions + streaming |
| **Short-term Memory** | Redis 7 | Active conversation context |
| **Long-term Storage** | PostgreSQL 16 | Persistent threads, messages, users |
| **Web Search** | Serper.dev API | Real-time grounding |
| **Queue (optional)** | BullMQ (backed by Redis) | Async jobs (exports, webhooks) |
| **Deployment** | Docker + Docker Compose / Kubernetes | Container orchestration |

---

## 4. Frontend Architecture (Next.js + React)

### 4.1 Application Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (app)/
│   │   ├── chat/
│   │   │   ├── [threadId]/page.tsx   # Active chat thread
│   │   │   └── page.tsx              # New chat
│   │   ├── history/page.tsx          # Conversation history
│   │   └── settings/page.tsx         # User settings
│   ├── layout.tsx              # Root layout with theme/auth providers
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # Main message container
│   │   ├── MessageBubble.tsx   # Individual message (user/assistant)
│   │   ├── ChatInput.tsx       # Textarea + send controls
│   │   ├── TypingIndicator.tsx # Streaming animation
│   │   └── SearchBadge.tsx     # Web search result pill
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   └── ThreadList.tsx
│   └── ui/                     # Shared design system components
├── hooks/
│   ├── useChat.ts              # Streaming chat logic
│   ├── useThread.ts            # Thread CRUD
│   └── useSearch.ts            # Search toggle
├── lib/
│   ├── api.ts                  # Typed API client (fetch wrapper)
│   └── stream.ts               # SSE / ReadableStream parser
├── store/
│   └── chatStore.ts            # Zustand global state
└── types/
    └── index.ts
```

### 4.2 Streaming Chat UI

The frontend connects to the backend via **Server-Sent Events (SSE)** for streaming token output:

```
ChatInput → POST /api/chat
         ← SSE stream (text/event-stream)
         → Append tokens to MessageBubble in real-time
         ← [DONE] signal → finalize message
```

### 4.3 Custom Branding System

All brand tokens (colors, fonts, logo, copy) are isolated in a `brand.config.ts` file and injected as CSS custom properties at build time. This allows white-label deployments to be customized by swapping a single config.

---

## 5. Backend Architecture (Node.js)

### 5.1 Service Breakdown

```
backend/
├── src/
│   ├── server.ts               # Express/Fastify app bootstrap
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── thread.routes.ts
│   │   └── search.routes.ts
│   ├── controllers/
│   │   ├── chat.controller.ts
│   │   ├── thread.controller.ts
│   │   └── search.controller.ts
│   ├── services/
│   │   ├── ai.service.ts       # OpenAI API wrapper + streaming
│   │   ├── memory.service.ts   # Redis context management
│   │   ├── search.service.ts   # Serper API wrapper
│   │   └── db.service.ts       # PostgreSQL query layer
│   ├── middleware/
│   │   ├── auth.middleware.ts  # Clerk JWT verification
│   │   ├── rateLimit.ts        # Per-user rate limiting (Redis)
│   │   └── errorHandler.ts
│   └── config/
│       ├── openai.ts
│       ├── redis.ts
│       └── postgres.ts
```

### 5.2 Request Lifecycle (Chat Message)

```
1. POST /api/chat  ← { threadId, message, useSearch }
2. auth.middleware  → Verify Clerk JWT → extract userId
3. rateLimit        → Check per-user quota in Redis
4. memory.service   → Fetch last 20 messages from Redis for threadId
5. search.service   → (if useSearch) Query Serper → get snippets
6. ai.service       → Build system prompt + context + search results
                    → Stream GPT-4o completion via SSE
7. On completion:
   a. memory.service → RPUSH new messages + LTRIM to 20
   b. db.service     → INSERT full messages to PostgreSQL
```

---

## 6. Authentication (Clerk / OAuth)

### 6.1 Clerk (Recommended)

```
Client (Next.js)
  └── ClerkProvider wraps App
        ├── useAuth() → JWT injected in every API request header
        └── <SignIn /> / <SignUp /> hosted UI components

Backend (Node.js)
  └── auth.middleware.ts
        └── clerkClient.verifyToken(jwt) → { userId, email, ... }
```

### 6.2 Alternative: OAuth 2.0 (Passport.js)

```
Flow:     Authorization Code + PKCE
Provider: Google, GitHub
Session:  HTTP-only cookie containing signed JWT
Library:  passport-google-oauth20 / passport-github2
```

### 6.3 User Context

After token verification, `userId` is attached to every request and used as the partition key for all Redis and PostgreSQL queries — enforcing strict data isolation per user.

---

## 7. AI & LLM Layer (OpenAI ChatGPT)

### 7.1 Model Selection

| Use Case | Model |
|---|---|
| Default chat | `gpt-4o` |
| Fast / lightweight | `gpt-4o-mini` |
| Long-context threads | `gpt-4-turbo` (128k context) |

### 7.2 System Prompt Architecture

```
system_prompt = [
  BRAND_PERSONA_PROMPT,    // Custom personality & tone
  USER_CONTEXT_BLOCK,      // User name, preferences
  MEMORY_SUMMARY_BLOCK,    // Compressed past context (long threads)
  SEARCH_RESULTS_BLOCK,    // Injected Serper snippets (if enabled)
]
```

### 7.3 Streaming (SSE)

```typescript
// ai.service.ts (simplified)
const stream = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: buildMessages(context, userMessage),
  stream: true,
});

for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content ?? "";
  res.write(`data: ${JSON.stringify({ token })}\n\n`);
}
res.write("data: [DONE]\n\n");
res.end();
```

### 7.4 Token Management

- Context window capped at **last 20 messages** in Redis
- For long threads, a **summary compression** step calls GPT-4o-mini to compress older turns into a single `MEMORY_SUMMARY_BLOCK` before the active window

---

## 8. Memory & Context Layer (Redis)

### 8.1 Key Schema

| Key Pattern | Type | TTL | Content |
|---|---|---|---|
| `chat:context:{threadId}` | List | 2h | Sliding window of last 20 messages (JSON) |
| `user:session:{userId}` | Hash | 24h | Active session metadata |
| `ratelimit:{userId}` | String | 60s | Request count for rate limiting |
| `search:cache:{queryHash}` | String | 10m | Cached Serper results |
| `thread:meta:{threadId}` | Hash | 4h | Title, model, settings |

### 8.2 Context Window Flow

```
New Message arrives
      │
      ▼
LRANGE chat:context:{threadId} 0 19   ← Fetch last 20 msgs
      │
      ▼
Build OpenAI messages array → get response
      │
      ▼
RPUSH chat:context:{threadId} {newUserMsg}
RPUSH chat:context:{threadId} {assistantMsg}
LTRIM chat:context:{threadId} -20 -1   ← Keep only last 20
EXPIRE chat:context:{threadId} 7200     ← Reset TTL
```

### 8.3 Rate Limiting

```
INCR  ratelimit:{userId}
EXPIRE ratelimit:{userId} 60
→ count > 20 requests/min → reject 429
```

---

## 9. Database Layer (PostgreSQL)

PostgreSQL is the **source of truth** for all persistent data. Redis is a fast working-memory cache only. On session restore or cold start, the last 20 messages are rehydrated from PostgreSQL back into Redis to warm the context cache.

**Connection pooling** is handled by `pg-pool` or `Prisma` with a max pool of 20 connections per backend pod.

---

## 10. Web Search Integration (Serper API)

### 10.1 Trigger Conditions

| Trigger | Condition |
|---|---|
| Manual | User clicks "Search the Web" toggle |
| Auto | Message contains keywords: `latest`, `today`, `news`, `current`, `price` |

### 10.2 Search → Prompt Injection

```
user message → search.service.ts
  → POST https://google.serper.dev/search { q, num: 5 }
  ← { organic: [{ title, link, snippet }] }

Top 3 snippets injected into system prompt:
  "[WEB SEARCH RESULTS]
   1. {title}: {snippet} ({link})
   2. ...
  "
```

### 10.3 Result Caching

Serper results cached in Redis for **10 minutes** keyed by `MD5(query)` to avoid redundant API calls for the same query.

---

## 11. Data Flow Diagrams

### 11.1 First Message in a New Thread

```
User types message → Send
    │
    ├── POST /api/threads     → create thread in PostgreSQL
    │       └── returns { threadId }
    │
    └── POST /api/chat { threadId, message }
            ├── Verify JWT
            ├── Initialize Redis context list
            ├── (optional) Serper API call → inject to prompt
            ├── Stream OpenAI response via SSE
            └── On [DONE]:
                  ├── RPUSH user + assistant msgs to Redis
                  └── INSERT messages to PostgreSQL
```

### 11.2 Returning User — Session Restore

```
User opens app → Clerk session verified
    │
    ├── GET /api/threads       → PostgreSQL → thread list
    │
    └── User clicks thread → GET /api/threads/{id}/messages
            │
            ├── Redis EXISTS chat:context:{threadId}?
            │       ├── YES → use warm Redis context
            │       └── NO  → load last 20 from PostgreSQL
            │                  → RPUSH into Redis (cache warm)
            └── Render messages in ChatWindow
```

---

## 12. API Design

### Base URL: `/api/v1`

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/session` | Validate Clerk token, return user profile |
| `DELETE` | `/auth/session` | Sign out, clear server session |

#### Threads
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/threads` | List threads for authenticated user |
| `POST` | `/threads` | Create a new thread |
| `GET` | `/threads/:id` | Get thread metadata |
| `PATCH` | `/threads/:id` | Update title, model, settings |
| `DELETE` | `/threads/:id` | Delete thread + all messages |
| `GET` | `/threads/:id/messages` | Paginated message history |

#### Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send message → SSE stream response |

**Request Body:**
```json
{
  "threadId": "uuid",
  "message": "What is the latest news on AI?",
  "useSearch": true,
  "model": "gpt-4o"
}
```

#### Search
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/search?q=query` | Direct Serper search (UI preview) |

---

## 13. Database Schema

```sql
-- Users (synced from Clerk webhooks)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    VARCHAR(255) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(255),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Threads
CREATE TABLE threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(500) DEFAULT 'New Chat',
  model           VARCHAR(100) DEFAULT 'gpt-4o',
  search_enabled  BOOLEAN DEFAULT FALSE,
  system_prompt   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
  content     TEXT NOT NULL,
  tokens_used INTEGER,
  search_used BOOLEAN DEFAULT FALSE,
  sources     JSONB,        -- Serper result sources attached to this message
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings
CREATE TABLE user_settings (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_model     VARCHAR(100) DEFAULT 'gpt-4o',
  search_enabled    BOOLEAN DEFAULT FALSE,
  theme             VARCHAR(20) DEFAULT 'dark',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threads_user_id    ON threads(user_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created   ON messages(created_at DESC);
```

---

## 14. Caching Strategy

| Layer | What is Cached | TTL | Invalidation |
|---|---|---|---|
| Redis List | Active chat context (last 20 msgs) | 2h sliding | LTRIM on each new message |
| Redis Hash | Thread metadata | 4h | On PATCH /threads/:id |
| Redis String | Serper results (by MD5 query hash) | 10 min | Automatic TTL |
| Redis String | Rate limit counters | 60s | Automatic TTL |
| Next.js RSC Cache | Thread list | 30s stale-while-revalidate | On thread create/delete |

---

## 15. Security Model

### Authentication & Authorization
- All API routes require `Authorization: Bearer <clerk-jwt>`
- `userId` from token scopes all DB + Redis queries to that user
- PostgreSQL **Row-Level Security (RLS)** enabled as a second layer

### API Key Security
- `OPENAI_API_KEY` and `SERPER_API_KEY` are **server-side only** — never sent to the client
- All AI and search calls proxied through Node.js backend

### Rate Limiting
- Per-user: **20 req / 60s** via Redis INCR
- Global: Nginx connection rate limiting
- OpenAI: Exponential backoff on 429

### Input Validation
- Max message length: **4000 characters**
- Prompt injection patterns stripped before system prompt construction
- All inputs validated with Zod schemas at the API boundary

### Data Isolation
- Redis keys namespaced: `chat:context:{threadId}` — only accessible via `userId` verification
- Cross-user access prevented at the middleware level before any query executes

---

## 16. Scalability & Deployment

### Development (Docker Compose)

```yaml
services:
  frontend:       # Next.js        — port 3000
  backend:        # Node.js        — port 4000
  postgres:       # PostgreSQL 16  — port 5432
  redis:          # Redis 7        — port 6379
  pgadmin:        # (dev only)     — port 5050
  redis-insight:  # (dev only)     — port 8001
```

### Production Topology

```
                        ┌──────────────────┐
                        │   Cloudflare CDN │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   Nginx (LB)     │
                        └──┬───────────┬───┘
                           │           │
               ┌───────────▼──┐  ┌─────▼────────────┐
               │  Next.js     │  │  Node.js          │
               │  (2 pods)    │  │  (2–4 pods)       │
               └──────────────┘  └──────────────────-┘
                                         │
                      ┌──────────────────┼────────────────┐
                      │                  │                │
              ┌───────▼──────┐  ┌────────▼──────┐  ┌─────▼───────┐
              │  PostgreSQL  │  │  Redis Cluster│  │ OpenAI API  │
              │  (Primary +  │  │  (3 nodes HA) │  │  (external) │
              │   1 Replica) │  └───────────────┘  └─────────────┘
              └──────────────┘
```

### Scaling Notes
- **Backend** is stateless — all state in Redis/Postgres → any pod handles any request
- **Redis Cluster** (3 nodes) ensures HA for active context data
- **PostgreSQL** read replica offloads history and analytics queries

---

## 17. Environment Variables Reference

### Frontend `.env.local`
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_API_URL=https://api.innochat.app
NEXT_PUBLIC_APP_NAME=InnoChat
NEXT_PUBLIC_APP_LOGO_URL=/logo.png
```

### Backend `.env`
```bash
# Auth
CLERK_SECRET_KEY=sk_live_...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/innochat

# Redis
REDIS_URL=redis://localhost:6379

# AI
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2048

# Web Search
SERPER_API_KEY=...
SERPER_BASE_URL=https://google.serper.dev

# App
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://innochat.app
```

---

## Appendix: Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | SSR for fast first load, RSC for data fetching |
| Auth provider | Clerk | Fastest to integrate, handles OAuth + JWT + webhooks |
| LLM streaming | SSE over WebSocket | Simpler infra; no persistent WS connection needed |
| Context storage | Redis List (RPUSH/LTRIM) | O(1) push, automatic sliding window, sub-ms reads |
| Message persistence | PostgreSQL | ACID compliance, complex queries, long-term retention |
| Search provider | Serper.dev | Google results via REST; no scraping or headless browser |
| Rate limiting | Redis INCR + TTL | Atomic, fast, no extra service required |
| Container runtime | Docker Compose → K8s | Simple dev → scalable prod migration path |
