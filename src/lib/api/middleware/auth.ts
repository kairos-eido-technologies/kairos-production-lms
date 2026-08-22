import { verifyToken, type JWTPayload } from "../../auth";
import { getTokenFromRequest } from "../auth-utils";

export const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-code",
  "/api/auth/session",
  "/api/files", // file downloads used by Office viewer (public)
  "/api/certificates/verify",
]);

/**
 * Validates request origin to protect against Cross-Site Request Forgery (CSRF)
 */
export function validateCsrf(request: Request): Response | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return null;
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const url = new URL(request.url);
  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== url.host) {
      return new Response(JSON.stringify({ error: "Forbidden: CSRF origin mismatch" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden: Invalid Origin header" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export function requireAuth(request: Request): Response | null {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname)) return null;

  // Allow anonymous access for certificate viewing/verification and course catalog list
  if (
    request.method === "GET" &&
    (url.pathname === "/api/courses" || url.pathname.startsWith("/api/certificates/"))
  ) {
    return null;
  }

  const token = getTokenFromRequest(request);

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }


  const payload = verifyToken(token);
  if (!payload) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }

  // Attach user to request for downstream use
  (request as any).user = payload;
  return null; // null = authorized
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Ensures only authorized roles (e.g. admin or teacher) can execute mutation endpoints
 */
export function requireRole(
  request: Request,
  allowedRoles: Array<"admin" | "teacher" | "student"> | ("admin" | "teacher" | "student"),
): Response | null {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  const user = (request as any).user as JWTPayload | undefined;
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!user || !rolesArray.includes(user.role as any)) {
    return new Response(JSON.stringify({ error: "Forbidden: Insufficient privileges" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}
