import { verifyToken, type JWTPayload } from "../auth";

/**
 * Extracts auth JWT token from Authorization header or cookies
 */
export function getTokenFromRequest(request: Request): string | null {
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("x-auth-token") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (authHeader && !authHeader.includes(" ")) {
    return authHeader.trim();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )auth_token=([^;]+)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).trim();
  }

  return null;
}

/**
 * Validates request authentication and returns payload or null
 */
export function getAuthenticatedUser(request: Request): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}
