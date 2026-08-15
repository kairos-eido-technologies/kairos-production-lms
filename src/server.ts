import "./lib/error-capture";
import { authApiRoutes } from "./lib/api/routes/auth";
import { filesRoute } from "./lib/api/routes/files";
import { contentRoute } from "./lib/api/routes/content";
import { pptxSlidesRoute } from "./lib/api/routes/pptx-slides";
import { checkRateLimit } from "./lib/rate-limiter";

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

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Rate limit check for all API routes
      if (url.pathname.startsWith("/api/")) {
        const rateCheck = checkRateLimit(request);
        if (!rateCheck.allowed) {
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
              }
            )
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
            })
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
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        })
      );
    }
  },
};
