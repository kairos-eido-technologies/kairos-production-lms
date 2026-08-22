import { repository } from "../../../lib/db/repository";
import { sendCalendarEventEmail } from "../../../lib/mail";
import { requireRole, requireAuth } from "../middleware/auth";

export async function calendarRoute(request: Request, db: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!(request as any).user) {
    requireAuth(request);
  }

  // GET /api/events -> list all events
  if (request.method === "GET" && path === "/api/events") {
    const events = await repository.getEvents();
    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/events -> create event (teachers & admins only)
  if (request.method === "POST" && path === "/api/events") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const event = await repository.createEvent(body);

    if (body.courseId) {
      try {
        const courses = await repository.getCourses(true);
        const targetCourse = courses.find((c) => c.id === body.courseId);
        if (targetCourse && targetCourse.studentIds) {
          for (const studentId of targetCourse.studentIds) {
            const student = await repository.getUserById(studentId);
            if (student) {
              sendCalendarEventEmail(
                student.email,
                student.name,
                targetCourse.name,
                body.title || "Upcoming Session",
                body.eventDate ? new Date(body.eventDate).toLocaleString() : "TBD",
                body.description || "A new calendar event has been added to your schedule.",
              ).catch(console.error);
              await repository.createNotification(
                student.id,
                `Event: ${body.title || "New Schedule"}`,
                `Scheduled in ${targetCourse.name}: ${body.description || ""}`,
                `/student/calendar`,
              );
            }
          }
        }
      } catch (e) {
        console.error("Error broadcasting calendar event emails:", e);
      }
    }

    return new Response(JSON.stringify({ event }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/events/:id -> delete event (teachers & admins only)
  if (request.method === "DELETE" && path.startsWith("/api/events/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/events/".length);
    await repository.deleteEvent(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
