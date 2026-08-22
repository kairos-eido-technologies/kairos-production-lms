import { repository } from "../../../lib/db/repository";
import {
  sendNudgeEmail,
  sendMessageNotificationEmail,
  sendAnnouncementEmail,
} from "../../../lib/mail";
import { requireRole, requireAuth } from "../middleware/auth";

export async function communicationsRoute(request: Request, db: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!(request as any).user) {
    requireAuth(request);
  }
  const currentUser = (request as any).user;
  const isAdmin = currentUser?.role === "admin";

  // GET /api/notifications -> list notifications for current user (or filtered by admin)
  if (request.method === "GET" && path === "/api/notifications") {
    const targetUserId = isAdmin ? (url.searchParams.get("userId") || undefined) : currentUser?.userId;
    const notifications = await repository.getNotifications(targetUserId);
    return new Response(JSON.stringify({ notifications }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/notifications -> create notification
  if (request.method === "POST" && path === "/api/notifications") {
    const body = await request.json();
    const notification = await repository.createNotification(
      body.userId,
      body.title,
      body.message,
      body.link,
    );
    return new Response(JSON.stringify({ notification }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/notifications/read-all -> mark all notifications read for a user
  if (request.method === "PUT" && path === "/api/notifications/read-all") {
    const body = await request.json();
    const targetUserId = isAdmin ? body.userId : currentUser?.userId;
    if (targetUserId) {
      await repository.markAllNotificationsRead(targetUserId);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/notifications/:id/read -> mark single notification read
  if (
    request.method === "PUT" &&
    path.startsWith("/api/notifications/") &&
    path.endsWith("/read")
  ) {
    const id = path.slice("/api/notifications/".length, -"/read".length);
    await repository.markNotificationRead(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/messages -> list messages (scoped strictly to current user unless admin)
  if (request.method === "GET" && path === "/api/messages") {
    const targetUserId = isAdmin ? (url.searchParams.get("userId") || undefined) : currentUser?.userId;
    const messages = await repository.getMessages(targetUserId);
    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/messages -> create message
  if (request.method === "POST" && path === "/api/messages") {
    const body = await request.json();
    let fromId = body.fromId || currentUser?.userId;
    
    // Verify sender exists in the database
    let senderUser = fromId ? await repository.getUserById(fromId) : null;
    if (!senderUser) {
      // Fallback to active admin/instructor in database
      const allUsers = await repository.getUsers();
      const fallbackUser = allUsers.find(u => u.role === "admin" || u.role === "teacher") || allUsers[0];
      if (fallbackUser) {
        fromId = fallbackUser.id;
        senderUser = fallbackUser;
      }
    }
    
    if (!fromId) {
      return new Response(JSON.stringify({ error: "Sender user ID could not be determined" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const newMsg = await repository.createMessage(fromId, body.toId, body.subject, body.body);

    try {
      const recipient = await repository.getUserById(body.toId);
      const sender = await repository.getUserById(fromId);
      if (recipient) {
        if (body.subject === "We miss you! 👋") {
          sendNudgeEmail(recipient.email, recipient.name, body.subject, body.body).catch(
            console.error,
          );
        } else {
          const senderName = sender ? sender.name : "System / Administrator";
          sendMessageNotificationEmail(
            recipient.email,
            recipient.name,
            senderName,
            body.subject || "New Message",
            body.body || "",
          ).catch(console.error);
        }
      }
    } catch (e) {}

    return new Response(JSON.stringify({ message: newMsg }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/messages/:id/read -> mark single message read
  if (request.method === "PUT" && path.startsWith("/api/messages/") && path.endsWith("/read")) {
    const id = path.slice("/api/messages/".length, -"/read".length);
    await repository.markMessageRead(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/announcements -> list all announcements
  if (request.method === "GET" && path === "/api/announcements") {
    const announcements = await repository.getAnnouncements();
    return new Response(JSON.stringify({ announcements }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/announcements -> create announcement (teachers & admins only)
  if (request.method === "POST" && path === "/api/announcements") {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const body = await request.json();
    const announcement = await repository.createAnnouncement(body);

    // Broadcast email and notifications to enrolled students
    if (body.courseId) {
      try {
        const courses = await repository.getCourses(true);
        const targetCourse = courses.find((c) => c.id === body.courseId);
        if (targetCourse && targetCourse.studentIds) {
          for (const studentId of targetCourse.studentIds) {
            const student = await repository.getUserById(studentId);
            if (student) {
              sendAnnouncementEmail(
                student.email,
                student.name,
                targetCourse.name,
                body.title || "New Announcement",
                body.body || "",
              ).catch(console.error);
              await repository.createNotification(
                student.id,
                `Announcement: ${targetCourse.name}`,
                body.title || "New announcement published.",
                `/student/courses/${targetCourse.id}`,
              );
            }
          }
        }
      } catch (e) {
        console.error("Error broadcasting announcement emails:", e);
      }
    }

    return new Response(JSON.stringify({ announcement }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/announcements/:id -> delete announcement (teachers & admins only)
  if (request.method === "DELETE" && path.startsWith("/api/announcements/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/announcements/".length);
    await repository.deleteAnnouncement(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/discussions -> list all discussions
  if (request.method === "GET" && path === "/api/discussions") {
    const discussions = await repository.getDiscussions();
    return new Response(JSON.stringify({ discussions }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/discussions -> create discussion
  if (request.method === "POST" && path === "/api/discussions") {
    const body = await request.json();
    const authorId = isAdmin ? (body.authorId || currentUser?.userId) : currentUser?.userId;
    const discussion = await repository.createDiscussion({ ...body, authorId });
    return new Response(JSON.stringify({ discussion }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/discussions/:id -> delete discussion
  if (request.method === "DELETE" && path.startsWith("/api/discussions/")) {
    const id = path.slice("/api/discussions/".length);
    if (!isAdmin && currentUser?.role !== "teacher") {
      const allDiscussions = await repository.getDiscussions();
      const target = allDiscussions.find((d) => d.id === id);
      if (!target || target.userId !== currentUser?.userId) {
        return new Response(JSON.stringify({ error: "Forbidden: You can only delete your own discussions" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }
    await repository.deleteDiscussion(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // GET /api/discussion-replies -> list all replies
  if (request.method === "GET" && path === "/api/discussion-replies") {
    const discussionReplies = await repository.getDiscussionReplies();
    return new Response(JSON.stringify({ discussionReplies }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/discussion-replies -> create reply
  if (request.method === "POST" && path === "/api/discussion-replies") {
    const body = await request.json();
    const userId = isAdmin ? (body.userId || currentUser?.userId) : currentUser?.userId;
    const discussionReply = await repository.createDiscussionReply({ ...body, userId });
    return new Response(JSON.stringify({ discussionReply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // DELETE /api/discussion-replies/:id -> delete reply
  if (request.method === "DELETE" && path.startsWith("/api/discussion-replies/")) {
    const id = path.slice("/api/discussion-replies/".length);
    if (!isAdmin && currentUser?.role !== "teacher") {
      const allReplies = await repository.getDiscussionReplies();
      const target = allReplies.find((r) => r.id === id);
      if (!target || target.userId !== currentUser?.userId) {
        return new Response(JSON.stringify({ error: "Forbidden: You can only delete your own replies" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }
    await repository.deleteDiscussionReply(id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
