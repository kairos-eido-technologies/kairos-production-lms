import { repository } from "../../../lib/db/repository";
import { courseService } from "../../../lib/services/course.service";
import { verifyToken } from "../../../lib/auth";
import { requireRole } from "../middleware/auth";

export async function coursesRoute(request: Request, _db?: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/courses -> list courses with sections, items, and enrollments
  if (request.method === "GET" && path === "/api/courses") {
    const authHeader = request.headers.get("authorization") ?? "";
    let token: string | null = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      const cookies = request.headers.get("cookie") ?? "";
      const match = cookies.match(/(?:^|; )auth_token=([^;]+)/);
      token = match?.[1] ?? null;
    }
    const isAuthenticated = token ? !!verifyToken(token) : false;

    const courses = await courseService.listCourses(isAuthenticated);
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    const cacheControlHeader = isAuthenticated
      ? "private, no-cache"
      : "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(limitParam || "25", 10) || 25));
      const total = courses.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paginated = courses.slice((page - 1) * limit, page * limit);
      return new Response(JSON.stringify({ courses: paginated, total, page, limit, totalPages }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": cacheControlHeader,
        },
      });
    }

    return new Response(JSON.stringify({ courses }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": cacheControlHeader,
      },
    });
  }

  // POST /api/courses -> create course
  if (request.method === "POST" && path === "/api/courses") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    try {
      const body = await request.json();
      const courseObj = await courseService.createCourseWithNotifications(body);

      return new Response(JSON.stringify({ course: courseObj }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Failed to create course" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // PUT /api/courses/:id -> update course and its enrollments
  if (request.method === "PUT" && path.startsWith("/api/courses/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    try {
      const id = path.slice("/api/courses/".length);
      const body = await request.json();
      const updated = await courseService.updateCourseWithNotifications(id, body);

      return new Response(JSON.stringify({ course: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Failed to update course" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // DELETE /api/courses/:id -> delete course
  if (request.method === "DELETE" && path.startsWith("/api/courses/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/courses/".length);
    await courseService.deleteCourseWithCleanup(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/sections -> create section
  if (request.method === "POST" && path === "/api/sections") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const section = await repository.createSection(body);
    return new Response(JSON.stringify({ section }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/sections/:id -> update section
  if (request.method === "PUT" && path.startsWith("/api/sections/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/sections/".length);
    const body = await request.json();
    const section = await repository.updateSection(id, body);
    return new Response(JSON.stringify({ section }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/sections/:id -> delete section
  if (request.method === "DELETE" && path.startsWith("/api/sections/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/sections/".length);
    await repository.deleteSection(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/content-items -> create item
  if (request.method === "POST" && path === "/api/content-items") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const item = await repository.createContentItem(body);
    return new Response(JSON.stringify({ item }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/content-items/:id -> update item
  if (request.method === "PUT" && path.startsWith("/api/content-items/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/content-items/".length);
    const body = await request.json();
    const item = await repository.updateContentItem(id, body);
    return new Response(JSON.stringify({ item }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/content-items/:id -> delete item
  if (request.method === "DELETE" && path.startsWith("/api/content-items/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/content-items/".length);
    await repository.deleteContentItem(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
