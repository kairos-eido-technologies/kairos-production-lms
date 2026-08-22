import { repository } from "../../db/repository";
import { userService } from "../../services/user.service";
import { hashPassword } from "../../auth";
import { requireRole, requireAuth } from "../middleware/auth";

export async function usersRoute(request: Request, _db?: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!(request as any).user) {
    requireAuth(request);
  }

  // GET /api/users -> list users
  if (request.method === "GET" && path === "/api/users") {
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    const list = await userService.listUsers();
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(limitParam || "25", 10) || 25));
      const total = list.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paginated = list.slice((page - 1) * limit, page * limit);
      return new Response(JSON.stringify({ users: paginated, total, page, limit, totalPages }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ users: list }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/users -> create user
  if (request.method === "POST" && path === "/api/users") {
    const roleError = requireRole(request, "admin");
    if (roleError) return roleError;

    try {
      const body = await request.json();
      const user = await userService.createUser(body);

      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Failed to create user" }), {
        status: err.statusCode || 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // PUT /api/users/:id -> update user
  if (request.method === "PUT" && path.startsWith("/api/users/")) {
    const id = path.slice("/api/users/".length);
    const currentUser = (request as any).user;
    const isAdmin = currentUser?.role === "admin";

    // Non-admins can only update their own profile
    if (!isAdmin && currentUser?.userId !== id) {
      return new Response(JSON.stringify({ error: "Forbidden: You can only update your own profile" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await request.json();

    const updatePayload: any = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.avatar !== undefined) updatePayload.avatar = body.avatar;
    if (body.phone !== undefined) updatePayload.phone = body.phone;

    // Privileged fields can ONLY be changed by admins
    if (isAdmin) {
      if (body.email !== undefined) updatePayload.email = body.email;
      if (body.role !== undefined) updatePayload.role = body.role;
      if (body.group !== undefined || body.group_name !== undefined)
        updatePayload.group = body.group || body.group_name;
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.isEmailVerified !== undefined) updatePayload.isEmailVerified = body.isEmailVerified;
    }

    if (body.password && typeof body.password === "string" && body.password.trim()) {
      updatePayload.passwordHash = await hashPassword(body.password.trim());
    }

    const updated = await userService.updateUser(id, updatePayload);
    return new Response(JSON.stringify({ user: updated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/users/:id -> delete user
  if (request.method === "DELETE" && path.startsWith("/api/users/")) {
    const roleError = requireRole(request, "admin");
    if (roleError) return roleError;

    const id = path.slice("/api/users/".length);
    const targetUser = await repository.getUserById(id);

    if (targetUser && targetUser.email.toLowerCase() === "admin@itech.com") {
      return new Response(
        JSON.stringify({
          error:
            "The primary Super Administrator (admin@itech.com) is permanently protected and cannot be deleted.",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    await userService.deleteUser(id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const currentUser = (request as any).user;
  const isAdminOrTeacher = currentUser?.role === "admin" || currentUser?.role === "teacher";

  // GET /api/progress -> student progress
  if (request.method === "GET" && path === "/api/progress") {
    const studentId = isAdminOrTeacher ? url.searchParams.get("studentId") : currentUser?.userId;
    const courseId = url.searchParams.get("courseId");
    const result = await repository.getProgress(studentId, courseId);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/progress -> mark progress complete
  if (request.method === "POST" && path === "/api/progress") {
    const body = await request.json();
    const rawStudentId = body.studentId || body.student_id;
    const studentId = isAdminOrTeacher ? (rawStudentId || currentUser?.userId) : currentUser?.userId;
    const courseId = body.courseId || body.course_id;
    const contentItemId = body.contentItemId || body.content_item_id || body.itemId;

    if (studentId && courseId && contentItemId) {
      await repository.saveProgress(studentId, courseId, contentItemId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/progress -> unmark progress complete
  if (request.method === "DELETE" && path === "/api/progress") {
    let studentId = url.searchParams.get("studentId");
    let courseId = url.searchParams.get("courseId");
    let contentItemId = url.searchParams.get("contentItemId");

    if (!studentId || !courseId || !contentItemId) {
      try {
        const body = await request.json();
        studentId = studentId || body.studentId || body.student_id;
        courseId = courseId || body.courseId || body.course_id;
        contentItemId = contentItemId || body.contentItemId || body.content_item_id;
      } catch (e) {}
    }

    const targetStudentId = isAdminOrTeacher ? (studentId || currentUser?.userId) : currentUser?.userId;

    if (targetStudentId && courseId && contentItemId) {
      await repository.removeProgress(targetStudentId, courseId, contentItemId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/extra-attempts -> get extra attempts (scoped for student)
  if (request.method === "GET" && path === "/api/extra-attempts") {
    const allAttempts = await repository.getExtraAttempts();
    if (isAdminOrTeacher) {
      return new Response(JSON.stringify({ extraAttempts: allAttempts }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Filter to only this student's attempts
    const userAttempts: Record<string, number> = {};
    const prefix = `${currentUser?.userId}:`;
    for (const [k, v] of Object.entries(allAttempts)) {
      if (k.startsWith(prefix)) {
        userAttempts[k] = v;
      }
    }
    return new Response(JSON.stringify({ extraAttempts: userAttempts }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/extra-attempts -> grant extra attempt(s) for a student+assessment
  if (request.method === "POST" && path === "/api/extra-attempts") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const { studentId, assessmentId, count = 1 } = body;
    if (!studentId || !assessmentId) {
      return new Response(JSON.stringify({ error: "studentId and assessmentId are required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const total = await repository.addExtraAttempt(studentId, assessmentId, Number(count));
    return new Response(JSON.stringify({ ok: true, total }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}

