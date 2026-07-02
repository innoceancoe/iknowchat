import { serve } from "bun";
import index from "./index.html";

// ─── API Route Handlers ───────────────────────────────────────────────────────
import { POST as authPost, DELETE as authDelete } from "./api/routes/auth.routes";
import {
  listThreads,
  createThread,
  getThread,
  updateThread,
  deleteThread,
  getMessages,
} from "./api/routes/thread.routes";
import { sendMessage } from "./api/routes/chat.routes";
import { searchHandler } from "./api/routes/search.routes";
import { corsPreflightResponse } from "./api/middleware/response";

const server = serve({
  routes: {
    // ── Auth ──────────────────────────────────────────────────────────────────
    "/api/v1/auth/session": {
      POST: authPost,
      DELETE: authDelete,
      OPTIONS: () => corsPreflightResponse(),
    },

    // ── Threads ───────────────────────────────────────────────────────────────
    "/api/v1/threads": {
      GET: listThreads,
      POST: createThread,
      OPTIONS: () => corsPreflightResponse(),
    },

    "/api/v1/threads/:id": {
      GET: getThread,
      PATCH: updateThread,
      DELETE: deleteThread,
      OPTIONS: () => corsPreflightResponse(),
    },

    "/api/v1/threads/:id/messages": {
      GET: getMessages,
      OPTIONS: () => corsPreflightResponse(),
    },

    // ── Chat (SSE streaming) ──────────────────────────────────────────────────
    "/api/v1/chat": {
      POST: sendMessage,
      OPTIONS: () => corsPreflightResponse(),
    },

    // ── Search preview ────────────────────────────────────────────────────────
    "/api/v1/search": {
      GET: searchHandler,
      OPTIONS: () => corsPreflightResponse(),
    },

    // ── Public client config (safe to expose) ───────────────────────────────
    "/api/config": {
      GET: () => Response.json({
        clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
      }),
    },

    // ── Health check ──────────────────────────────────────────────────────────
    "/api/health": {
      GET: () => Response.json({ status: "ok", ts: new Date().toISOString() }),
    },

    // ── Frontend fallback (must be last) ──────────────────────────────────────
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 InnoChat server running at ${server.url}`);
console.log(`   API base: ${server.url}api/v1`);
