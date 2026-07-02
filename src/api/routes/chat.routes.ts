import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { err, tooManyRequests, serverError, withErrorHandler } from "../middleware/response";
import { query, queryOne } from "../config/postgres";
import {
  getContext,
  appendToContext,
  seedContext,
  contextExists,
  checkRateLimit,
} from "../services/memory.service";
import { searchWeb, shouldAutoSearch } from "../services/search.service";
import { buildMessages, streamChatCompletion } from "../services/ai.service";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";

// ─── Schema ───────────────────────────────────────────────────────────────────

const ChatSchema = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  useSearch: z.boolean().optional().default(false),
  model: z.string().max(100).optional(),
});

// ─── POST /api/v1/chat ────────────────────────────────────────────────────────

export const sendMessage = withErrorHandler(async (req: Request) => {
  const auth = await requireAuth(req);

  // Rate limit check
  const allowed = await checkRateLimit(auth.userId);
  if (!allowed) return tooManyRequests();

  // Parse + validate body
  const body = await req.json().catch(() => null);
  if (!body) return err("Invalid JSON body");
  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.message);

  const { threadId, message, useSearch, model } = parsed.data;
  const selectedModel = model ?? env.OPENAI_DEFAULT_MODEL;

  // Verify thread belongs to user and fetch settings
  const thread = await queryOne<{
    id: string;
    search_enabled: boolean;
    system_prompt: string | null;
    model: string;
  }>(
    `SELECT id, search_enabled, system_prompt, model FROM threads WHERE id = $1 AND user_id = $2`,
    [threadId, auth.userId]
  );
  if (!thread) return err("Thread not found or access denied", 404);

  // Warm Redis context from Postgres if cold
  const warm = await contextExists(threadId);
  if (!warm) {
    const dbMessages = await query<{ role: "user" | "assistant"; content: string }>(
      `SELECT role, content FROM messages
       WHERE thread_id = $1 ORDER BY created_at ASC
       LIMIT $2`,
      [threadId, env.CONTEXT_WINDOW_SIZE]
    );
    if (dbMessages.length) await seedContext(threadId, dbMessages);
  }

  // Fetch active context window
  const context = await getContext(threadId);

  // Web search (manual toggle or auto-detection)
  const doSearch = useSearch || thread.search_enabled || shouldAutoSearch(message);
  const searchResults = doSearch ? await searchWeb(message) : [];

  // Build messages array for OpenAI
  const messages = buildMessages(
    context,
    message,
    searchResults,
    thread.system_prompt ?? undefined
  );

  // SSE streaming response
  const encoder = new TextEncoder();
  let fullResponse = "";
  let tokenCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamChatCompletion(messages, selectedModel)) {
          fullResponse += token;
          tokenCount++;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }

        // Persist to Redis (context window)
        await appendToContext(threadId, { role: "user", content: message });
        await appendToContext(threadId, { role: "assistant", content: fullResponse });

        // Persist to PostgreSQL
        const userMsgId = uuidv4();
        const assistantMsgId = uuidv4();
        await query(
          `INSERT INTO messages (id, thread_id, role, content, search_used, sources)
           VALUES ($1, $2, 'user', $3, $4, $5)`,
          [userMsgId, threadId, message, doSearch, searchResults.length ? JSON.stringify(searchResults) : null]
        );
        await query(
          `INSERT INTO messages (id, thread_id, role, content, tokens_used, search_used)
           VALUES ($1, $2, 'assistant', $3, $4, $5)`,
          [assistantMsgId, threadId, fullResponse, tokenCount, doSearch]
        );

        // Update thread updated_at
        await query(`UPDATE threads SET updated_at = NOW() WHERE id = $1`, [threadId]);

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (e) {
        console.error("[Chat] Streaming error:", e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
