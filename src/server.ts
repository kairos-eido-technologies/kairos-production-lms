import dns from "node:dns";
try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch (e) {}

import "./lib/error-capture";
import { authApiRoutes } from "./lib/api/routes/auth";
import { filesRoute } from "./lib/api/routes/files";
import { contentRoute } from "./lib/api/routes/content";
import { pptxSlidesRoute } from "./lib/api/routes/pptx-slides";
import { healthRoute } from "./lib/api/routes/health";
import { checkRateLimit } from "./lib/rate-limiter";
import { logger, createRequestLogger } from "./lib/logger";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function applySecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
      "worker-src 'self' blob: https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https://*.supabase.co https://cdnjs.cloudflare.com; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com;",
  );

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  logger.error({ error: consumeLastCapturedError() }, `h3 swallowed SSR error: ${body}`);
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const reqLog = createRequestLogger(request);
    try {
      const url = new URL(request.url);

      // Health check endpoint (bypasses rate limiting)
      if (url.pathname === "/api/health") {
        const hRes = await healthRoute(request);
        if (hRes) return applySecurityHeaders(hRes);
      }

      // Rate limit check for all API routes
      if (url.pathname.startsWith("/api/")) {
        const rateCheck = checkRateLimit(request);
        if (!rateCheck.allowed) {
          reqLog.warn({ retryAfter: rateCheck.retryAfter }, "Rate limit exceeded");
          return applySecurityHeaders(
            new Response(
              JSON.stringify({
                error: "Too many requests. Please slow down and try again later.",
                retryAfter: rateCheck.retryAfter,
              }),
              {
                status: 429,
                headers: {
                  "content-type": "application/json",
                  "Retry-After": String(rateCheck.retryAfter || 60),
                },
              },
            ),
          );
        }
      }

      // first, auth API routes (exact path matches)
      const routeHandlers = authApiRoutes[url.pathname];
      if (routeHandlers) {
        const routeHandler = routeHandlers[request.method];
        if (!routeHandler) {
          return applySecurityHeaders(
            new Response(null, {
              status: 405,
              headers: { Allow: Object.keys(routeHandlers).join(", ") },
            }),
          );
        }
        const res = await routeHandler(request);
        return applySecurityHeaders(res);
      }

      // files API (single endpoint /api/files handles POST upload and GET download?id=...)
      if (url.pathname === "/api/files") {
        const res = await filesRoute(request);
        return applySecurityHeaders(res);
      }

      if (url.pathname === "/api/pptx-slides") {
        const res = await pptxSlidesRoute(request);
        return applySecurityHeaders(res);
      }

      // content API (courses, sections, content items)
      if (url.pathname.startsWith("/api/")) {
        const res = await contentRoute(request);
        return applySecurityHeaders(res);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized);
    } catch (error) {
      reqLog.error({ err: error }, "Unhandled server error");
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
