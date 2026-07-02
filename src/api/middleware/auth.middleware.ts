import { createClerkClient, verifyToken } from "@clerk/backend";
import { env } from "../config/env";

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export interface AuthContext {
  userId: string;
  email: string | undefined;
}

/**
 * Verify a Clerk JWT from the Authorization header.
 * Returns the auth context or throws a Response on failure.
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    const userId = payload.sub;

    // Get user details for email
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    return { userId, email };
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
