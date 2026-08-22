import { repository } from "../../../lib/db/repository";
import { requireRole, requireAuth } from "../middleware/auth";

export async function checkpointsRoute(request: Request, db: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!(request as any).user) {
    requireAuth(request);
  }
  const currentUser = (request as any).user;
  const isAdminOrTeacher = currentUser?.role === "admin" || currentUser?.role === "teacher";

  // GET /api/video-checkpoints -> list checkpoints
  if (request.method === "GET" && path === "/api/video-checkpoints") {
    const contentItemId = url.searchParams.get("contentItemId");
    const videoCheckpoints = await repository.getVideoCheckpoints(contentItemId);
    return new Response(JSON.stringify({ videoCheckpoints }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/video-checkpoints -> create/update checkpoint (teachers & admins only)
  if (request.method === "POST" && path === "/api/video-checkpoints") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const videoCheckpoint = await repository.saveVideoCheckpoint(body);
    return new Response(JSON.stringify({ videoCheckpoint }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/video-checkpoints/:id -> delete checkpoint (teachers & admins only)
  if (request.method === "DELETE" && path.startsWith("/api/video-checkpoints/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/video-checkpoints/".length);
    await repository.deleteVideoCheckpoint(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/checkpoint-progress -> list progress
  if (request.method === "GET" && path === "/api/checkpoint-progress") {
    const studentId = isAdminOrTeacher ? url.searchParams.get("studentId") : currentUser?.userId;
    const checkpointProgress = await repository.getCheckpointProgress(studentId);
    return new Response(JSON.stringify({ checkpointProgress }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/checkpoint-progress -> record progress
  if (request.method === "POST" && path === "/api/checkpoint-progress") {
    const body = await request.json();
    const studentId = isAdminOrTeacher ? (body.studentId || currentUser?.userId) : currentUser?.userId;
    const checkpointProgress = await repository.saveCheckpointProgress({ ...body, studentId });
    return new Response(JSON.stringify({ checkpointProgress }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
