import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { ok, err, notFound, withErrorHandler, type BunRequest } from "../middleware/response";
import { query, queryOne } from "../config/postgres";
import { clearContext } from "../services/memory.service";
import { v4 as uuidv4 } from "uuid";

type IdParam = { id: string };

// ─── Schemas ─────────────────────────────────────────────────────────────────

const CreateThreadSchema = z.object({
  title: z.string().max(500).optional(),
  model: z.string().max(100).optional(),
  search_enabled: z.boolean().optional(),
  system_prompt: z.string().optional(),
});

const UpdateThreadSchema = z.object({
  title: z.string().max(500).optional(),
  model: z.string().max(100).optional(),
  search_enabled: z.boolean().optional(),
  system_prompt: z.string().optional(),
});

// ─── GET /api/v1/threads ─────────────────────────────────────────────────────

export const listThreads = withErrorHandler(async (req: Request) => {
  const auth = await requireAuth(req);

  const threads = await query(
    `SELECT id, title, model, search_enabled, created_at, updated_at
     FROM threads
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 100`,
    [auth.userId]
  );

  return ok({ threads });
});

// ─── POST /api/v1/threads ────────────────────────────────────────────────────

export const createThread = withErrorHandler(async (req: Request) => {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => ({}));
  const parsed = CreateThreadSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.message);

  const { title = "New Chat", model = "gpt-4o", search_enabled = false, system_prompt } = parsed.data;
  const id = uuidv4();

  const thread = await queryOne(
    `INSERT INTO threads (id, user_id, title, model, search_enabled, system_prompt)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, model, search_enabled, system_prompt, created_at`,
    [id, auth.userId, title, model, search_enabled, system_prompt ?? null]
  );

  return ok({ thread }, 201);
});

// ─── GET /api/v1/threads/:id ─────────────────────────────────────────────────

export const getThread = withErrorHandler<IdParam>(async (req: BunRequest<IdParam>) => {
  const auth = await requireAuth(req);

  const thread = await queryOne(
    `SELECT id, title, model, search_enabled, system_prompt, created_at, updated_at
     FROM threads WHERE id = $1 AND user_id = $2`,
    [req.params.id, auth.userId]
  );

  if (!thread) return notFound("Thread");
  return ok({ thread });
});

// ─── PATCH /api/v1/threads/:id ───────────────────────────────────────────────

export const updateThread = withErrorHandler<IdParam>(async (req: BunRequest<IdParam>) => {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateThreadSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.message);

  const { title, model, search_enabled, system_prompt } = parsed.data;

  const thread = await queryOne(
    `UPDATE threads
     SET
       title          = COALESCE($3, title),
       model          = COALESCE($4, model),
       search_enabled = COALESCE($5, search_enabled),
       system_prompt  = COALESCE($6, system_prompt),
       updated_at     = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, title, model, search_enabled, system_prompt, updated_at`,
    [req.params.id, auth.userId, title ?? null, model ?? null, search_enabled ?? null, system_prompt ?? null]
  );

  if (!thread) return notFound("Thread");
  return ok({ thread });
});

// ─── DELETE /api/v1/threads/:id ──────────────────────────────────────────────

export const deleteThread = withErrorHandler<IdParam>(async (req: BunRequest<IdParam>) => {
  const auth = await requireAuth(req);

  const thread = await queryOne(
    `DELETE FROM threads WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, auth.userId]
  );

  if (!thread) return notFound("Thread");

  // Clear Redis context
  await clearContext(req.params.id);

  return ok({ message: "Thread deleted" });
});

// ─── GET /api/v1/threads/:id/messages ────────────────────────────────────────

export const getMessages = withErrorHandler<IdParam>(async (req: BunRequest<IdParam>) => {
  const auth = await requireAuth(req);

  // Verify thread belongs to user
  const thread = await queryOne(
    `SELECT id FROM threads WHERE id = $1 AND user_id = $2`,
    [req.params.id, auth.userId]
  );
  if (!thread) return notFound("Thread");

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const messages = await query(
    `SELECT id, role, content, tokens_used, search_used, sources, created_at
     FROM messages
     WHERE thread_id = $1
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [req.params.id, limit, offset]
  );

  return ok({ messages, limit, offset });
});
