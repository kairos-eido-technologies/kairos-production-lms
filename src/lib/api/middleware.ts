import { createMiddleware } from "@tanstack/react-start";
import { verifyToken } from "../auth";

function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )auth_token=([^;]+)/);
  return match?.[1] ?? null;
}

export const withAuth = createMiddleware(async (opts) => {
  const token = getTokenFromRequest(opts.request);

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  (opts.request as any).user = payload;
  return opts.next();
});

export const withAdminAuth = createMiddleware(async (opts) => {
  const token = getTokenFromRequest(opts.request);

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  (opts.request as any).user = payload;
  return opts.next();
});
