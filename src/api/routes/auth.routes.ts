import { requireAuth } from "../middleware/auth.middleware";
import { ok, withErrorHandler } from "../middleware/response";

/**
 * POST /api/v1/auth/session
 * Validates the Clerk JWT and returns the user profile.
 */
export const POST = withErrorHandler(async (req: Request) => {
  const auth = await requireAuth(req);
  return ok({
    userId: auth.userId,
    email: auth.email,
  });
});

/**
 * DELETE /api/v1/auth/session
 * Client-side logout — no server state to clear (JWT is stateless).
 * Included for API symmetry; clients should discard the token locally.
 */
export const DELETE = withErrorHandler(async (req: Request) => {
  await requireAuth(req);
  return ok({ message: "Signed out successfully" });
});
