import { redis } from "../config/redis";
import { env } from "../config/env";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const contextKey = (threadId: string) => `chat:context:${threadId}`;
const threadMetaKey = (threadId: string) => `thread:meta:${threadId}`;

/**
 * Fetch the active context window for a thread.
 * Returns at most CONTEXT_WINDOW_SIZE messages.
 */
export async function getContext(threadId: string): Promise<ChatMessage[]> {
  const raw = await redis.lrange(contextKey(threadId), 0, env.CONTEXT_WINDOW_SIZE - 1);
  return raw.map((item) => JSON.parse(item) as ChatMessage);
}

/**
 * Push a new message into the context window and trim to the window size.
 * Also resets the TTL.
 */
export async function appendToContext(threadId: string, message: ChatMessage): Promise<void> {
  const key = contextKey(threadId);
  await redis.rpush(key, JSON.stringify(message));
  await redis.ltrim(key, -env.CONTEXT_WINDOW_SIZE, -1);
  await redis.expire(key, env.CONTEXT_TTL_SEC);
}

/**
 * Seed the Redis context from a list of messages (e.g. loaded from Postgres on cold start).
 */
export async function seedContext(threadId: string, messages: ChatMessage[]): Promise<void> {
  const key = contextKey(threadId);
  const pipeline = redis.pipeline();
  pipeline.del(key);
  const windowed = messages.slice(-env.CONTEXT_WINDOW_SIZE);
  for (const msg of windowed) {
    pipeline.rpush(key, JSON.stringify(msg));
  }
  pipeline.expire(key, env.CONTEXT_TTL_SEC);
  await pipeline.exec();
}

/**
 * Check if a context window exists in Redis for a given thread.
 */
export async function contextExists(threadId: string): Promise<boolean> {
  return (await redis.exists(contextKey(threadId))) === 1;
}

/**
 * Clear context for a thread (e.g. on thread delete).
 */
export async function clearContext(threadId: string): Promise<void> {
  await redis.del(contextKey(threadId));
  await redis.del(threadMetaKey(threadId));
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

const rateLimitKey = (userId: string) => `ratelimit:${userId}`;

/**
 * Check and increment per-user rate limit.
 * Returns true if the request is allowed, false if it's over limit.
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = rateLimitKey(userId);
  const count = await redis.incr(key);
  if (count === 1) {
    // First request in window — set expiry
    await redis.expire(key, env.RATE_LIMIT_WINDOW_SEC);
  }
  return count <= env.RATE_LIMIT_MAX_REQUESTS;
}

// ─── Search result caching ───────────────────────────────────────────────────

const searchCacheKey = (hash: string) => `search:cache:${hash}`;

export async function getCachedSearch(hash: string): Promise<string | null> {
  return redis.get(searchCacheKey(hash));
}

export async function cacheSearch(hash: string, value: string): Promise<void> {
  await redis.set(searchCacheKey(hash), value, "EX", 600); // 10 min
}
