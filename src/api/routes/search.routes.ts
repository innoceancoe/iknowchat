import { requireAuth } from "../middleware/auth.middleware";
import { ok, err, withErrorHandler } from "../middleware/response";
import { searchWeb } from "../services/search.service";

/**
 * GET /api/v1/search?q=query
 * Direct Serper search for UI preview (autocomplete, source preview, etc.)
 */
export const searchHandler = withErrorHandler(async (req: Request) => {
  await requireAuth(req);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) return err("Query parameter 'q' is required");
  if (q.length > 500) return err("Query too long (max 500 chars)");

  const results = await searchWeb(q, 5);
  return ok({ query: q, results });
});
