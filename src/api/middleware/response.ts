/** Standard JSON success response. */
export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/** Standard JSON error response. */
export function err(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/** 404 Not Found. */
export function notFound(resource = "Resource"): Response {
  return err(`${resource} not found`, 404);
}

/** 401 Unauthorized. */
export function unauthorized(message = "Unauthorized"): Response {
  return err(message, 401);
}

/** 429 Too Many Requests. */
export function tooManyRequests(): Response {
  return err("Rate limit exceeded. Try again in a moment.", 429);
}

/** 500 Internal Server Error. */
export function serverError(message = "Internal server error"): Response {
  return err(message, 500);
}

/** CORS + JSON headers for all API responses. */
export const API_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Handle OPTIONS preflight. */
export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: API_HEADERS });
}

// Bun's router injects params at runtime; this type reflects that.
export type BunRequest<P extends Record<string, string> = Record<string, never>> = Request & {
  params: P;
};

/**
 * Wraps a route handler with top-level error catching.
 * If the thrown value is a Response (e.g. from requireAuth), forward it.
 * Otherwise return a 500.
 *
 * Generic P allows parameterised routes (e.g. { id: string }) to stay typed.
 */
export function withErrorHandler<P extends Record<string, string> = Record<string, never>>(
  handler: (req: BunRequest<P>) => Promise<Response>
): (req: BunRequest<P>) => Promise<Response> {
  return async (req: BunRequest<P>) => {
    if (req.method === "OPTIONS") return corsPreflightResponse();
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("[API Error]", e);
      return serverError();
    }
  };
}
