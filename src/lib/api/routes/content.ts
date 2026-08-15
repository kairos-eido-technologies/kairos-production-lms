import { getDb, isDatabaseHealthy, markDbUnhealthy, markDbHealthy } from "../../db/client";
import { supabase } from "../../db/supabase-client";
import {
  courses,
  sections,
  contentItems,
  certificates,
  users,
  enrollments,
  assessments,
  questions,
  submissions,
  submissionResponses,
  progress,
  notifications,
  messages,
  events,
  announcements,
  discussions,
  discussionReplies,
  videoCheckpoints,
  checkpointProgress,
} from "../../db/schema";
import { eq, and, or } from "drizzle-orm";
import { hashPassword, verifyToken } from "../../auth";
import { randomUUID } from "crypto";
import {
  sendVerificationEmail,
  sendCourseAssignedEmail,
  sendNudgeEmail,
  sendTeacherCourseAssignedEmail,
  sendNewSubmissionEmail,
  sendSubmissionGradedEmail,
  sendCertificateRequestedEmail,
  sendCertificateApprovedEmail,
  sendCertificateRejectedEmail,
  sendMessageNotificationEmail,
  sendAnnouncementEmail,
  sendCalendarEventEmail,
  sendAllTestEmails,
} from "../../mail";
import { serverStore } from "../../db/server-store";

function makeId() {
  return `${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function insertNotification(db: any, userId: string, title: string, message: string, link?: string) {
  const id = `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const notifObj = {
    id,
    userId,
    title,
    message,
    read: false,
    link: link || null,
    createdAt: new Date().toISOString(),
  };
  serverStore.addNotification(notifObj);
  try {
    await supabase.from("notifications").insert({
      id,
      user_id: userId,
      title,
      message,
      read: false,
      link: link || null,
      created_at: notifObj.createdAt,
    });
  } catch (err) {}
}

async function insertMessage(db: any, fromId: string, toId: string, subject: string, body: string) {
  const id = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const msgObj = {
    id,
    fromId,
    toId,
    subject,
    body,
    read: false,
    createdAt: new Date().toISOString(),
  };
  serverStore.addMessage(msgObj);
  try {
    await supabase.from("messages").insert({
      id,
      from_id: fromId,
      to_id: toId,
      subject,
      body,
      read: false,
      created_at: msgObj.createdAt,
    });
  } catch (err) {}
}

import { generateSequentialRoleId } from "../../id-generator";

async function generateUniqueRoleId(role: "admin" | "teacher" | "student"): Promise<string> {
  return generateSequentialRoleId(role);
}

// ── Auth guard helper ────────────────────────────────────────────────────────
// Public paths that do not require authentication (allow-list)
const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/session",
  "/api/files", // file downloads used by Office viewer (public)
  "/api/certificates/verify",
  "/api/test-emails",
]);

function requireAuth(request: Request): Response | null {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname)) return null;

  // Allow anonymous access for certificate viewing/verification and course catalog list
  if (request.method === "GET" && (url.pathname === "/api/courses" || url.pathname.startsWith("/api/certificates/"))) {
    return null;
  }

  // Try Bearer header first, then cookie
  const authHeader = request.headers.get("authorization") ?? "";
  let token: string | null = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    const cookies = request.headers.get("cookie") ?? "";
    const match = cookies.match(/(?:^|; )auth_token=([^;]+)/);
    token = match?.[1] ?? null;
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid or expired session. Please log in again." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Attach user to request for downstream use
  (request as any).user = payload;
  return null; // null = authorized
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Ensures only authorized roles (e.g. admin or teacher) can execute mutation endpoints
 */
function requireRole(request: Request, allowedRoles: Array<"admin" | "teacher" | "student">): Response | null {
  const user = (request as any).user;
  if (!user || !allowedRoles.includes(user.role)) {
    return new Response(JSON.stringify({ error: "Forbidden: Insufficient privileges" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export async function contentRoute(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Security: authenticate every request before touching the DB (allow-listed public paths pass through)
    const authError = requireAuth(request);
    if (authError) return authError;

    let db: any = null;
    try {
      if (isDatabaseHealthy()) {
        db = getDb();
      }
    } catch (dbErr) {}
    // ==========================================
    // USERS API
    // ==========================================

    // GET /api/users -> list users
    if (request.method === "GET" && path === "/api/users") {
      let mapped: any[] = [];

      // Primary source: Supabase REST API
      try {
        const { data: sUsers, error: sErr } = await supabase.from("users").select("*");
        const { data: sEnrollments } = await supabase.from("enrollments").select("*");

        if (sUsers && !sErr) {
          const enrollmentsMap = new Map<string, string[]>();
          if (sEnrollments) {
            for (const e of sEnrollments) {
              const studentId = e.student_id || e.studentId;
              const courseId = e.course_id || e.courseId;
              const list = enrollmentsMap.get(studentId) || [];
              list.push(courseId);
              enrollmentsMap.set(studentId, list);
            }
          }

          mapped = sUsers.map((u: any) => {
            const item = {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              status: u.status,
              joinedAt: u.joined_at ? u.joined_at.slice(0, 10) : "",
              lastActive: u.last_active || null,
              avatar: u.avatar || null,
              phone: u.phone || null,
              group: u.group_name || u.group || undefined,
              isEmailVerified: u.is_email_verified ?? true,
              courseIds: enrollmentsMap.get(u.id) || [],
            };
            serverStore.saveUser(item as any);
            return item;
          });
        }
      } catch (sErr) {
        console.warn("⚠️ Supabase GET /api/users warning:", sErr);
      }

      // Merge storeUsers to ensure any locally registered/verified user is displayed
      const storeUsers = serverStore.getAllUsers();
      for (const su of storeUsers) {
        if (!mapped.some((m) => m.id === su.id || m.email.toLowerCase() === su.email.toLowerCase())) {
          mapped.push({
            id: su.id,
            name: su.name,
            email: su.email,
            role: su.role,
            status: su.status,
            joinedAt: su.joinedAt ? su.joinedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            lastActive: su.lastActive || null,
            avatar: su.avatar || null,
            phone: su.phone || null,
            group: su.group || undefined,
            isEmailVerified: su.isEmailVerified,
            courseIds: su.courseIds || [],
          });
        }
      }

      return new Response(JSON.stringify({ users: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/users -> create user
    if (request.method === "POST" && path === "/api/users") {
      const body = await request.json();
      const emailLower = body.email?.toLowerCase().trim();
      if (!emailLower) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const role = body.role || "student";
      const id = await generateUniqueRoleId(role);
      const passwordHash = await hashPassword(body.password || "default123");
      const now = new Date();

      // Check existing in Supabase
      try {
        const { data: existingS } = await supabase.from("users").select("id").eq("email", emailLower).maybeSingle();
        if (existingS) {
          return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
      } catch (sErr) {
        console.warn("⚠️ Supabase check existing user warning:", sErr);
      }

      let created: any = null;

      // 1. Save to Supabase REST API (Port 443)
      try {
        const { data: insertedS } = await supabase.from("users").upsert({
          id,
          name: body.name || "Untitled",
          email: emailLower,
          password_hash: passwordHash,
          role,
          group_name: body.group || null,
          status: body.status || "active",
          joined_at: body.joinedAt ? new Date(body.joinedAt).toISOString() : now.toISOString(),
          is_email_verified: true,
          phone: body.phone || null,
        }, { onConflict: "id" }).select().single();

        if (insertedS) {
          created = {
            id: insertedS.id,
            name: insertedS.name,
            email: insertedS.email,
            role: insertedS.role,
            group: insertedS.group_name || insertedS.group,
            status: insertedS.status,
            joinedAt: insertedS.joined_at,
            isEmailVerified: insertedS.is_email_verified,
            phone: insertedS.phone,
          };
        }
      } catch (sErr) {}

      // 2. Save to serverStore
      const storeUser = serverStore.saveUser({
        id,
        name: body.name || "Untitled",
        email: emailLower,
        role,
        group: body.group || null,
        status: body.status || "active",
        joinedAt: body.joinedAt ? new Date(body.joinedAt).toISOString() : now.toISOString(),
        isEmailVerified: true,
        phone: body.phone || null,
      });

      return new Response(JSON.stringify({ user: created || storeUser }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/users/:id -> update user
    if (request.method === "PUT" && path.startsWith("/api/users/")) {
      const id = path.slice("/api/users/".length);
      const body = await request.json();
      const updateData: any = {};
      const supabaseUpdate: any = {};

      if (body.name !== undefined) { updateData.name = body.name; supabaseUpdate.name = body.name; }
      if (body.email !== undefined) {
        const emailLower = body.email.toLowerCase().trim();
        try {
          const { data: existingS } = await supabase.from("users").select("id").eq("email", emailLower).maybeSingle();
          if (existingS && existingS.id !== id) {
            return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
              status: 400,
              headers: { "content-type": "application/json" },
            });
          }
        } catch (sErr) {}
        updateData.email = emailLower;
        supabaseUpdate.email = emailLower;
      }
      if (body.role !== undefined) { updateData.role = body.role; supabaseUpdate.role = body.role; }
      if (body.group !== undefined) { updateData.group = body.group; supabaseUpdate.group_name = body.group; }
      if (body.status !== undefined) { updateData.status = body.status; supabaseUpdate.status = body.status; }
      if (body.avatar !== undefined) { updateData.avatar = body.avatar; supabaseUpdate.avatar = body.avatar; }
      if (body.phone !== undefined) { updateData.phone = body.phone; supabaseUpdate.phone = body.phone; }
      if (body.isEmailVerified !== undefined) { updateData.isEmailVerified = body.isEmailVerified; supabaseUpdate.is_email_verified = body.isEmailVerified; }
      if (body.password !== undefined && body.password !== "") {
        const hash = await hashPassword(body.password);
        updateData.passwordHash = hash;
        supabaseUpdate.password_hash = hash;
      }

      let updated: any = null;

      // 1. Update in Supabase REST API
      try {
        if (Object.keys(supabaseUpdate).length > 0) {
          const { data: updatedS } = await supabase.from("users").update(supabaseUpdate).eq("id", id).select().single();
          if (updatedS) {
            updated = {
              id: updatedS.id,
              name: updatedS.name,
              email: updatedS.email,
              role: updatedS.role,
              group: updatedS.group_name || updatedS.group,
              status: updatedS.status,
              joinedAt: updatedS.joined_at,
              isEmailVerified: updatedS.is_email_verified,
              phone: updatedS.phone,
            };
          }
        }
      } catch (sErr) {}

      // 2. Update serverStore
      const storeUpdate = {
        ...updateData,
        role: updateData.role as any,
        status: updateData.status as any,
      };
      delete storeUpdate.passwordHash;
      const storedUser = serverStore.updateUser(id, storeUpdate) || serverStore.getUserById(id);

      return new Response(JSON.stringify({ user: updated || storedUser }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/users/:id -> delete user
    if (request.method === "DELETE" && path.startsWith("/api/users/")) {
      const id = path.slice("/api/users/".length);

      // Check teacher courses in Supabase & DB
      try {
        const { data: teacherCourse } = await supabase.from("courses").select("id, name").eq("teacher_id", id).maybeSingle();
        if (teacherCourse) {
          return new Response(
            JSON.stringify({
              error: `This instructor is assigned to teach course "${teacherCourse.name}". Please reassign or delete that course first.`,
            }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }
      } catch (sErr) {}

      // 1. Delete from Supabase REST API (Port 443)
      try {
        await supabase.from("progress").delete().eq("student_id", id);
        await supabase.from("certificates").delete().eq("student_id", id);
        await supabase.from("enrollments").delete().eq("student_id", id);
        await supabase.from("notifications").delete().eq("user_id", id);
        await supabase.from("messages").delete().eq("from_id", id);
        await supabase.from("messages").delete().eq("to_id", id);
        const { data: subs } = await supabase.from("submissions").select("id").eq("student_id", id);
        if (subs && subs.length > 0) {
          for (const s of subs) {
            await supabase.from("submission_responses").delete().eq("submission_id", s.id);
          }
          await supabase.from("submissions").delete().eq("student_id", id);
        }
        await supabase.from("users").delete().eq("id", id);
      } catch (sErr) {}

      // 2. Delete from serverStore
      serverStore.deleteUser(id);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (path === "/api/test-emails") {
      const urlParams = new URL(request.url).searchParams;
      const targetEmail = urlParams.get("email") || "rhemanthjeyanezsingh@karunya.edu.in";
      const results = await sendAllTestEmails(targetEmail);
      return new Response(
        JSON.stringify({
          ok: true,
          message: `Dispatched 13 test email templates to ${targetEmail}`,
          sentCount: results.length,
          results,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // GET /api/courses -> list courses with sections, items, and enrollments
    if (request.method === "GET" && path === "/api/courses") {
      // Check auth status manually to determine if full details or sanitized preview should be returned
      const authHeader = request.headers.get("authorization") ?? "";
      let token: string | null = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) {
        const cookies = request.headers.get("cookie") ?? "";
        const match = cookies.match(/(?:^|; )auth_token=([^;]+)/);
        token = match?.[1] ?? null;
      }
      const isAuthenticated = token ? !!verifyToken(token) : false;

      let allCourses: any[] = [];
      let allSections: any[] = [];
      let allItems: any[] = [];
      let allEnrollments: any[] = [];

      try {
        const dCourses = await db.query.courses.findMany();
        const dSections = await db.query.sections.findMany();
        const dItems = await db.query.contentItems.findMany();
        const dEnrollments = await db.query.enrollments.findMany();

        if (dCourses && dCourses.length > 0) {
          allCourses = dCourses.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            description: c.description,
            thumbnail: c.thumbnail,
            teacherId: c.teacherId,
            status: c.status || "active",
            showInPreview: c.showInPreview ?? true,
            previewVideoUrl: c.previewVideoUrl || "",
            badgeTag: c.badgeTag || "",
            featuredBadgeText: c.featuredBadgeText || "",
            durationText: c.durationText || "",
            projectsText: c.projectsText || "",
            techStack: c.techStack || [],
            startDate: c.startDate,
            endDate: c.endDate,
          }));
          allSections = dSections.map((s: any) => ({
            id: s.id,
            courseId: s.courseId,
            title: s.title,
            order: s.order ?? 0,
          }));
          allItems = dItems.map((it: any) => ({
            id: it.id,
            sectionId: it.sectionId,
            type: it.type,
            title: it.title,
            body: it.body,
            url: it.url,
            fileName: it.fileName,
            duration: it.duration,
            fileSize: it.fileSize,
            assessmentId: it.assessmentId,
            order: it.order ?? 0,
          }));
          allEnrollments = dEnrollments.map((e: any) => ({
            id: e.id,
            studentId: e.studentId,
            courseId: e.courseId,
            accessMode: e.accessMode || "lifetime",
            endDate: e.endDate,
          }));
        }
      } catch (dbErr) {
        try {
          const { data: sCourses } = await supabase.from("courses").select("*");
          const { data: sSections } = await supabase.from("sections").select("*");
          const { data: sItems } = await supabase.from("content_items").select("*");
          const { data: sEnrollments } = await supabase.from("enrollments").select("*");

          if (sCourses && sCourses.length > 0) {
            allCourses = sCourses.map((c: any) => ({
              id: c.id,
              code: c.code,
              name: c.name,
              description: c.description,
              thumbnail: c.thumbnail,
              teacherId: c.teacher_id || c.teacherId,
              status: c.status || "active",
              showInPreview: c.show_in_preview ?? c.showInPreview ?? true,
              previewVideoUrl: c.preview_video_url || c.previewVideoUrl || "",
              badgeTag: c.badge_tag || c.badgeTag || "",
              featuredBadgeText: c.featured_badge_text || c.featuredBadgeText || "",
              durationText: c.duration_text || c.durationText || "",
              projectsText: c.projects_text || c.projectsText || "",
              techStack: c.tech_stack || c.techStack || [],
              startDate: c.start_date || c.startDate,
              endDate: c.end_date || c.endDate,
            }));
          }

          if (sSections) {
            allSections = sSections.map((s: any) => ({
              id: s.id,
              courseId: s.course_id || s.courseId,
              title: s.title,
              order: s.order ?? 0,
            }));
          }

          if (sItems) {
            allItems = sItems.map((it: any) => ({
              id: it.id,
              sectionId: it.section_id || it.sectionId,
              type: it.type,
              title: it.title,
              body: it.body,
              url: it.url,
              fileName: it.file_name || it.fileName,
              duration: it.duration,
              fileSize: it.file_size || it.fileSize,
              assessmentId: it.assessment_id || it.assessmentId,
              order: it.order ?? 0,
            }));
          }

          if (sEnrollments) {
            allEnrollments = sEnrollments.map((e: any) => ({
              id: e.id,
              studentId: e.student_id || e.studentId,
              courseId: e.course_id || e.courseId,
              accessMode: e.access_mode || e.accessMode || "lifetime",
              endDate: e.end_date || e.endDate,
            }));
          }
        } catch (sErr) {}
      }

      if (allCourses.length === 0) {
        const cached = serverStore.getCourses();
        return new Response(JSON.stringify({ courses: cached }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Anonymous visitors only see active courses marked for preview
      const filteredCourses = isAuthenticated
        ? allCourses
        : allCourses.filter((c) => c.showInPreview && c.status === "active");

      // Pre-build O(1) Map indices
      const enrollmentsByCourse = new Map<string, any[]>();
      for (const e of allEnrollments) {
        const list = enrollmentsByCourse.get(e.courseId) || [];
        list.push(e);
        enrollmentsByCourse.set(e.courseId, list);
      }

      const sectionsByCourse = new Map<string, any[]>();
      for (const s of allSections) {
        const list = sectionsByCourse.get(s.courseId) || [];
        list.push(s);
        sectionsByCourse.set(s.courseId, list);
      }

      const itemsBySection = new Map<string, any[]>();
      for (const it of allItems) {
        const list = itemsBySection.get(it.sectionId) || [];
        list.push(it);
        itemsBySection.set(it.sectionId, list);
      }

      const coursesWith = filteredCourses.map((c) => {
        const courseEnrollments = enrollmentsByCourse.get(c.id) || [];
        const studentAccess: Record<string, any> = {};
        
        if (isAuthenticated) {
          for (const e of courseEnrollments) {
            studentAccess[e.studentId] = {
              accessMode: e.accessMode,
              endDate: e.endDate ? (typeof e.endDate === "string" ? e.endDate.slice(0, 10) : e.endDate.toISOString().slice(0, 10)) : undefined,
            };
          }
        }

        const courseSections = sectionsByCourse.get(c.id) || [];

        return {
          ...c,
          startDate: c.startDate ? (typeof c.startDate === "string" ? c.startDate.slice(0, 10) : c.startDate.toISOString().slice(0, 10)) : "",
          endDate: c.endDate ? (typeof c.endDate === "string" ? c.endDate.slice(0, 10) : c.endDate.toISOString().slice(0, 10)) : "",
          studentIds: isAuthenticated ? courseEnrollments.map((e) => e.studentId) : [],
          studentAccess: isAuthenticated ? studentAccess : {},
          sections: courseSections
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s) => ({
              ...s,
              items: (itemsBySection.get(s.id) || [])
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((it) => ({
                  ...it,
                  // Hide private file links & body text details from public syllabus listings
                  url: isAuthenticated ? it.url : null,
                  body: isAuthenticated ? it.body : null,
                })),
            })),
        };
      });

      if (isAuthenticated) {
        serverStore.setCourses(coursesWith);
      }

      return new Response(JSON.stringify({ courses: coursesWith }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/courses -> create course
    if (request.method === "POST" && path === "/api/courses") {
      const body = await request.json();
      if (body.teacherId) {
        const teacher = await db.query.users.findFirst({ where: eq(users.id, body.teacherId) });
        if (!teacher) {
          return new Response(JSON.stringify({ error: "The assigned instructor (teacherId) does not exist in the database." }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
      }

      const id = body.id || makeId();
      const now = new Date();
      await db.insert(courses).values({
        id,
        name: body.name || "Untitled",
        code: body.code || "",
        description: body.description || null,
        teacherId: body.teacherId || null,
        thumbnail: body.thumbnail || null,
        startDate: body.startDate ? new Date(body.startDate) : now,
        endDate: body.endDate ? new Date(body.endDate) : now,
        accessMode: body.accessMode || "lifetime",
        status: body.status || "draft",
        showInPreview: body.showInPreview ?? false,
        previewVideoUrl: body.previewVideoUrl || null,
        badgeTag: body.badgeTag !== undefined ? body.badgeTag : null,
        featuredBadgeText: body.featuredBadgeText !== undefined ? body.featuredBadgeText : null,
        durationText: body.durationText !== undefined ? body.durationText : null,
        projectsText: body.projectsText !== undefined ? body.projectsText : null,
        techStack: body.techStack ? body.techStack : null,
      });

      // Send email and in-app notification to the assigned teacher
      if (body.teacherId) {
        const teacher = await db.query.users.findFirst({ where: eq(users.id, body.teacherId) });
        if (teacher) {
          sendTeacherCourseAssignedEmail(teacher.email, teacher.name, body.name || "Untitled", body.code || "").catch(console.error);
          await insertNotification(db, teacher.id, "Course Assigned", `You have been assigned to teach course ${body.name || "Untitled"} (${body.code || ""}).`, `/teacher/content`);
          await insertMessage(db, "ADM01", teacher.id, "Teaching Assignment: " + (body.name || "Untitled"), `Hello Instructor ${teacher.name},\n\nYou have been assigned as the primary instructor for the course: ${body.name || "Untitled"} (${body.code || ""}). You can now build sections, add content items, create assessments, and manage enrollments.`);
        }
      }

      if (body.studentIds && Array.isArray(body.studentIds)) {
        for (const studentId of body.studentIds) {
          const access = body.studentAccess?.[studentId] || {};
          await db.insert(enrollments).values({
            id: makeId(),
            studentId,
            courseId: id,
            accessMode: access.accessMode || "lifetime",
            endDate: access.endDate ? new Date(access.endDate) : null,
          });
          const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
          if (student) {
            sendCourseAssignedEmail(student.email, student.name, body.name || "Untitled", body.code || "").catch(console.error);
            await insertNotification(db, student.id, "New Course Assigned", `You have been assigned to course ${body.name || "Untitled"} (${body.code || ""}).`, `/student/courses/${id}`);
            const senderId = body.teacherId || "ADM01";
            await insertMessage(db, senderId, student.id, "New Course Enrollment: " + (body.name || "Untitled"), `Hello ${student.name},\n\nYou have been enrolled in the course: ${body.name || "Untitled"} (${body.code || ""}). You can access it on your student portal.`);
          }
        }
      }

      const created = await db.query.courses.findFirst({ where: eq(courses.id, id) });
      const createdEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, id));
      const studentAccess: Record<string, any> = {};
      for (const e of createdEnrollments) {
        studentAccess[e.studentId] = {
          accessMode: e.accessMode,
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : undefined,
        };
      }

      const courseObj = {
        ...created,
        startDate: created?.startDate ? created.startDate.toISOString().slice(0, 10) : "",
        endDate: created?.endDate ? created.endDate.toISOString().slice(0, 10) : "",
        studentIds: createdEnrollments.map((e: any) => e.studentId),
        studentAccess,
        sections: [],
      };
      serverStore.addCourse(courseObj);

      return new Response(
        JSON.stringify({
          course: courseObj,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/courses/:id -> update course and its enrollments
    if (request.method === "PUT" && path.startsWith("/api/courses/")) {
      const id = path.slice("/api/courses/".length);
      const body = await request.json();

      const existingCourse = await db.query.courses.findFirst({ where: eq(courses.id, id) });
      const oldTeacherId = existingCourse?.teacherId;

      const { studentIds, studentAccess: bodyStudentAccess, sections: _sec, ...courseFields } = body;

      // Update course fields
      const updateData: any = {};
      if (courseFields.name !== undefined) updateData.name = courseFields.name;
      if (courseFields.code !== undefined) updateData.code = courseFields.code;
      if (courseFields.description !== undefined) updateData.description = courseFields.description;
      if (courseFields.teacherId !== undefined) {
        const tId = courseFields.teacherId || null;
        if (tId) {
          const teacher = await db.query.users.findFirst({ where: eq(users.id, tId) });
          if (!teacher) {
            return new Response(JSON.stringify({ error: "The assigned instructor (teacherId) does not exist in the database." }), {
              status: 400,
              headers: { "content-type": "application/json" },
            });
          }
        }
        updateData.teacherId = tId;
      }
      if (courseFields.thumbnail !== undefined) updateData.thumbnail = courseFields.thumbnail;
      if (courseFields.startDate) updateData.startDate = new Date(courseFields.startDate);
      if (courseFields.endDate) updateData.endDate = new Date(courseFields.endDate);
      if (courseFields.accessMode !== undefined) updateData.accessMode = courseFields.accessMode;
      if (courseFields.status !== undefined) updateData.status = courseFields.status;
      if (courseFields.showInPreview !== undefined) updateData.showInPreview = courseFields.showInPreview;
      if (courseFields.previewVideoUrl !== undefined) updateData.previewVideoUrl = courseFields.previewVideoUrl;
      if (courseFields.badgeTag !== undefined) updateData.badgeTag = courseFields.badgeTag;
      if (courseFields.featuredBadgeText !== undefined) updateData.featuredBadgeText = courseFields.featuredBadgeText;
      if (courseFields.durationText !== undefined) updateData.durationText = courseFields.durationText;
      if (courseFields.projectsText !== undefined) updateData.projectsText = courseFields.projectsText;
      if (courseFields.techStack !== undefined) updateData.techStack = courseFields.techStack;

      if (Object.keys(updateData).length > 0) {
        await db.update(courses).set(updateData).where(eq(courses.id, id));
      }

      // Check if teacher changed/assigned
      const updatedCourse = await db.query.courses.findFirst({ where: eq(courses.id, id) });
      if (updatedCourse && updatedCourse.teacherId && updatedCourse.teacherId !== oldTeacherId) {
        const teacher = await db.query.users.findFirst({ where: eq(users.id, updatedCourse.teacherId) });
        if (teacher) {
          sendTeacherCourseAssignedEmail(teacher.email, teacher.name, updatedCourse.name, updatedCourse.code).catch(console.error);
          await insertNotification(db, teacher.id, "Course Assigned", `You have been assigned to teach course ${updatedCourse.name} (${updatedCourse.code}).`, `/teacher/content`);
          await insertMessage(db, "ADM01", teacher.id, "Teaching Assignment: " + updatedCourse.name, `Hello Instructor ${teacher.name},\n\nYou have been assigned as the primary instructor for the course: ${updatedCourse.name} (${updatedCourse.code}).`);
        }
      }

      // Update enrollments if studentIds is provided
      if (studentIds && Array.isArray(studentIds)) {
        const existingEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, id));
        const existingStudentIds = existingEnrollments.map((e: any) => e.studentId);

        // Delete enrollments no longer in list
        const toDelete = existingStudentIds.filter((sid: string) => !studentIds.includes(sid));
        for (const sid of toDelete) {
          await db.delete(enrollments).where(and(eq(enrollments.courseId, id), eq(enrollments.studentId, sid)));
        }

        // Insert or update enrollments
        for (const studentId of studentIds) {
          const access = bodyStudentAccess?.[studentId] || {};
          const isExisting = existingStudentIds.includes(studentId);

          if (isExisting) {
            await db
              .update(enrollments)
              .set({
                accessMode: access.accessMode || "lifetime",
                endDate: access.endDate ? new Date(access.endDate) : null,
              })
              .where(and(eq(enrollments.courseId, id), eq(enrollments.studentId, studentId)));
          } else {
            await db.insert(enrollments).values({
              id: makeId(),
              studentId,
              courseId: id,
              accessMode: access.accessMode || "lifetime",
              endDate: access.endDate ? new Date(access.endDate) : null,
            });
            const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
            const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
            if (student && course) {
              sendCourseAssignedEmail(student.email, student.name, course.name, course.code).catch(console.error);
              await insertNotification(db, student.id, "New Course Assigned", `You have been assigned to course ${course.name} (${course.code}).`, `/student/courses/${id}`);
              const senderId = course.teacherId || "ADM01";
              await insertMessage(db, senderId, student.id, "New Course Enrollment: " + course.name, `Hello ${student.name},\n\nYou have been enrolled in the course: ${course.name} (${course.code}).`);
            }
          }
        }
      }

      const updated = await db.query.courses.findFirst({ where: eq(courses.id, id) });
      const updatedEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, id));
      const studentAccess: Record<string, any> = {};
      for (const e of updatedEnrollments) {
        studentAccess[e.studentId] = {
          accessMode: e.accessMode,
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : undefined,
        };
      }

      const allSections = await db.select().from(sections).where(eq(sections.courseId, id));
      const allItems = await db.select().from(contentItems);

      const courseObj = {
        ...updated,
        startDate: updated?.startDate ? updated.startDate.toISOString().slice(0, 10) : "",
        endDate: updated?.endDate ? updated.endDate.toISOString().slice(0, 10) : "",
        studentIds: updatedEnrollments.map((e: any) => e.studentId),
        studentAccess,
        sections: allSections
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((s: any) => ({
            ...s,
            items: allItems
              .filter((it: any) => it.sectionId === s.id)
              .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
          })),
      };
      serverStore.addCourse(courseObj);

      return new Response(
        JSON.stringify({
          course: courseObj,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/courses/:id -> delete course
    if (request.method === "DELETE" && path.startsWith("/api/courses/")) {
      const id = path.slice("/api/courses/".length);
      await db.delete(courses).where(eq(courses.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // ENROLLMENTS API
    // ==========================================

    // POST /api/enrollments -> assign course
    if (request.method === "POST" && path === "/api/enrollments") {
      const body = await request.json();
      const { studentId, courseId, accessMode, endDate } = body;
      if (!studentId || !courseId) {
        return new Response(JSON.stringify({ error: "studentId and courseId are required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      
      // Delete existing to prevent duplicate
      await db.delete(enrollments).where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, studentId)));
      
      const id = makeId();
      await db.insert(enrollments).values({
        id,
        studentId,
        courseId,
        accessMode: accessMode || "lifetime",
        endDate: endDate ? new Date(endDate) : null,
      });
      const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
      const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
      if (student && course) {
        sendCourseAssignedEmail(student.email, student.name, course.name, course.code).catch(console.error);
        await insertNotification(db, student.id, "New Course Assigned", `You have been assigned to course ${course.name} (${course.code}).`, `/student/courses/${courseId}`);
        const senderId = course.teacherId || "ADM01";
        await insertMessage(db, senderId, student.id, "New Course Enrollment: " + course.name, `Hello ${student.name},\n\nYou have been enrolled in the course: ${course.name} (${course.code}).`);
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/enrollments -> revoke course
    if (request.method === "DELETE" && path === "/api/enrollments") {
      const studentId = url.searchParams.get("studentId") || "";
      const courseId = url.searchParams.get("courseId") || "";
      if (!studentId || !courseId) {
        return new Response(JSON.stringify({ error: "studentId and courseId parameters are required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      await db.delete(enrollments).where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, studentId)));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // SECTIONS API
    // ==========================================

    // POST /api/sections -> create section
    if (request.method === "POST" && path === "/api/sections") {
      const body = await request.json();
      const id = makeId();
      let created: any = { id, courseId: body.courseId, title: body.title || "Untitled", order: body.order ?? 0 };
      try {
        const { data: sSec } = await supabase.from("sections").insert({
          id,
          course_id: body.courseId,
          title: body.title || "Untitled",
          order: body.order ?? 0,
        }).select().single();
        if (sSec) created = { id: sSec.id, courseId: sSec.course_id, title: sSec.title, order: sSec.order };
      } catch (sErr) {}
      return new Response(JSON.stringify({ section: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/sections/:id -> update section
    if (request.method === "PUT" && path.startsWith("/api/sections/")) {
      const id = path.slice("/api/sections/".length);
      const body = await request.json();
      let updated: any = { id, title: body.title, order: body.order };
      try {
        const { data: sSec } = await supabase.from("sections").update({
          title: body.title,
          order: body.order,
        }).eq("id", id).select().single();
        if (sSec) updated = { id: sSec.id, courseId: sSec.course_id, title: sSec.title, order: sSec.order };
      } catch (sErr) {}
      return new Response(JSON.stringify({ section: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/sections/:id -> delete section
    if (request.method === "DELETE" && path.startsWith("/api/sections/")) {
      const id = path.slice("/api/sections/".length);
      try {
        await supabase.from("content_items").delete().eq("section_id", id);
        await supabase.from("sections").delete().eq("id", id);
      } catch (sErr) {}
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // CONTENT ITEMS API
    // ==========================================

    // POST /api/content-items -> create item
    if (request.method === "POST" && path === "/api/content-items") {
      const body = await request.json();
      const id = makeId();
      let created: any = {
        id,
        sectionId: body.sectionId,
        type: body.type,
        title: body.title || "",
        body: body.body || null,
        url: body.url || null,
        fileName: body.fileName || null,
        duration: body.duration ?? null,
        fileSize: body.fileSize || null,
        assessmentId: body.assessmentId || null,
        order: body.order ?? 0,
      };

      try {
        const { data: sItem } = await supabase.from("content_items").insert({
          id,
          section_id: body.sectionId,
          type: body.type,
          title: body.title || "",
          body: body.body || null,
          url: body.url || null,
          file_name: body.fileName || null,
          duration: body.duration ?? null,
          file_size: body.fileSize || null,
          assessment_id: body.assessmentId || null,
          order: body.order ?? 0,
        }).select().single();
        if (sItem) {
          created = {
            id: sItem.id,
            sectionId: sItem.section_id,
            type: sItem.type,
            title: sItem.title,
            body: sItem.body,
            url: sItem.url,
            fileName: sItem.file_name,
            duration: sItem.duration,
            fileSize: sItem.file_size,
            assessmentId: sItem.assessment_id,
            order: sItem.order,
          };
        }
      } catch (sErr) {}

      return new Response(JSON.stringify({ item: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/content-items/:id -> update item
    if (request.method === "PUT" && path.startsWith("/api/content-items/")) {
      const id = path.slice("/api/content-items/".length);
      const body = await request.json();
      let updated: any = { id, ...body };

      try {
        const { data: sItem } = await supabase.from("content_items").update({
          title: body.title,
          body: body.body,
          url: body.url,
          file_name: body.fileName,
          duration: body.duration ?? null,
          file_size: body.fileSize,
          assessment_id: body.assessmentId ?? null,
          order: body.order ?? 0,
        }).eq("id", id).select().single();

        if (sItem) {
          updated = {
            id: sItem.id,
            sectionId: sItem.section_id,
            type: sItem.type,
            title: sItem.title,
            body: sItem.body,
            url: sItem.url,
            fileName: sItem.file_name,
            duration: sItem.duration,
            fileSize: sItem.file_size,
            assessmentId: sItem.assessment_id,
            order: sItem.order,
          };
        }
      } catch (sErr) {}

      return new Response(JSON.stringify({ item: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/content-items/:id -> delete item
    if (request.method === "DELETE" && path.startsWith("/api/content-items/")) {
      const id = path.slice("/api/content-items/".length);
      try {
        await supabase.from("video_checkpoints").delete().eq("content_item_id", id);
        await supabase.from("content_items").delete().eq("id", id);
      } catch (sErr) {}
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // CERTIFICATES API
    // ==========================================

    // GET /api/certificates/verify -> Public certificate verification
    if (request.method === "GET" && path === "/api/certificates/verify") {
      const certId = url.searchParams.get("id")?.trim();
      if (!certId) {
        return new Response(JSON.stringify({ ok: false, error: "Missing certificate ID" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      let cert: any = null;
      let student: any = null;
      let course: any = null;

      try {
        const { data: sCert } = await supabase
          .from("certificates")
          .select("*")
          .ilike("id", certId)
          .eq("status", "approved")
          .maybeSingle();

        if (sCert) {
          cert = sCert;
          const { data: sStudent } = await supabase.from("users").select("id, name, email").eq("id", sCert.student_id).maybeSingle();
          const { data: sCourse } = await supabase.from("courses").select("id, name, code").eq("id", sCert.course_id).maybeSingle();
          student = sStudent;
          course = sCourse;
        }
      } catch (err) {}

      if (!cert) {
        const localCert = serverStore.getCertificates().find((c) => c.id.toLowerCase() === certId.toLowerCase() && c.status === "approved");
        if (localCert) {
          cert = localCert;
          student = serverStore.getUserById(localCert.studentId);
          course = serverStore.getCourses().find((c) => c.id === localCert.courseId);
        }
      }

      if (!cert) {
        return new Response(JSON.stringify({ ok: false, error: "Certificate not found or not approved" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          certificate: {
            id: cert.id,
            score: typeof cert.score === "number" ? cert.score : (parseInt(cert.score, 10) || 100),
            status: cert.status,
            issuedAt: cert.issued_at ? String(cert.issued_at).slice(0, 10) : (cert.issuedAt || new Date().toISOString().slice(0, 10)),
            studentName: student?.name || "Student",
            studentEmail: student?.email || "",
            courseName: course?.name || "Course",
            courseCode: course?.code || "",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // GET /api/certificates/:id -> retrieve certificate by ID
    if (request.method === "GET" && path.startsWith("/api/certificates/") && !path.includes("/approve") && !path.includes("/reject")) {
      const certId = path.slice("/api/certificates/".length).trim();
      let cert: any = null;
      let student: any = null;
      let course: any = null;

      try {
        const { data: sCert } = await supabase
          .from("certificates")
          .select("*")
          .ilike("id", certId)
          .maybeSingle();

        if (sCert) {
          cert = sCert;
          const { data: sStudent } = await supabase.from("users").select("id, name, email").eq("id", sCert.student_id).maybeSingle();
          const { data: sCourse } = await supabase.from("courses").select("id, name, code").eq("id", sCert.course_id).maybeSingle();
          student = sStudent;
          course = sCourse;
        }
      } catch (err) {}

      if (!cert) {
        const localCert = serverStore.getCertificates().find((c) => c.id.toLowerCase() === certId.toLowerCase());
        if (localCert) {
          cert = localCert;
          student = serverStore.getUserById(localCert.studentId);
          course = serverStore.getCourses().find((c) => c.id === localCert.courseId);
        }
      }

      if (!cert) {
        return new Response(JSON.stringify({ ok: false, error: "Certificate not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          certificate: {
            id: cert.id,
            score: typeof cert.score === "number" ? cert.score : (parseInt(cert.score, 10) || 100),
            status: cert.status,
            issuedAt: cert.issued_at ? String(cert.issued_at).slice(0, 10) : (cert.issuedAt || new Date().toISOString().slice(0, 10)),
            studentName: student?.name || "Student",
            studentEmail: student?.email || "",
            courseName: course?.name || "Course",
            courseCode: course?.code || "",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // GET /api/certificates
    if (request.method === "GET" && path === "/api/certificates") {
      const status = url.searchParams.get("status");
      let mapped: any[] = [];

      try {
        let query = supabase.from("certificates").select("*");
        if (status) query = query.eq("status", status);
        const { data: sCerts } = await query;

        if (sCerts && sCerts.length > 0) {
          mapped = sCerts.map((c: any) => ({
            id: c.id,
            studentId: c.student_id || c.studentId,
            courseId: c.course_id || c.courseId,
            score: typeof c.score === "number" ? c.score : (parseInt(c.score, 10) || 100),
            requestedAt: c.requested_at ? String(c.requested_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: c.status,
            issuedAt: c.issued_at ? String(c.issued_at).slice(0, 10) : (c.issuedAt ? String(c.issuedAt).slice(0, 10) : undefined),
            teacherNote: c.teacher_note || c.teacherNote || undefined,
            rejectionReason: c.rejection_reason || c.rejectionReason || undefined,
            proctorLog: (c.proctor_log || c.proctorLog) ?? undefined,
          }));
          serverStore.setCertificates(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getCertificates();
        if (status) mapped = mapped.filter((c) => c.status === status);
      }

      return new Response(JSON.stringify({ certificates: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/certificates
    if (request.method === "POST" && path === "/api/certificates") {
      const body = await request.json();
      const id = body.id || makeId();
      const requestedAt = body.requestedAt ? new Date(body.requestedAt) : new Date();
      let created: any = {
        id,
        studentId: body.studentId,
        courseId: body.courseId,
        score: typeof body.score === "number" ? body.score : (parseInt(body.score, 10) || 100),
        status: body.status || "pending",
        requestedAt: requestedAt.toISOString().slice(0, 10),
        issuedAt: body.issuedAt ? String(body.issuedAt).slice(0, 10) : undefined,
        teacherNote: body.teacherNote || undefined,
        rejectionReason: body.rejectionReason || undefined,
        proctorLog: body.proctorLog || undefined,
      };

      try {
        await supabase.from("certificates").insert({
          id,
          student_id: body.studentId,
          course_id: body.courseId,
          score: created.score,
          status: created.status,
          requested_at: requestedAt.toISOString(),
          issued_at: body.issuedAt ? new Date(body.issuedAt).toISOString() : null,
          teacher_note: body.teacherNote || null,
          rejection_reason: body.rejectionReason || null,
          proctor_log: body.proctorLog || null,
        });
      } catch (sErr) {}

      serverStore.saveCertificate(created);

      try {
        if (db) {
          await db.insert(certificates).values({
            id,
            studentId: body.studentId,
            courseId: body.courseId,
            score: created.score,
            status: created.status,
            requestedAt,
            issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
            teacherNote: body.teacherNote || null,
            rejectionReason: body.rejectionReason || null,
            proctorLog: body.proctorLog || null,
          });
        }
      } catch (dbErr) {}

      try {
        const student = serverStore.getUserById(created.studentId);
        const course = serverStore.getCourses().find((c: any) => c.id === created.courseId);
        if (student && course) {
          const teacher = course.teacherId ? serverStore.getUserById(course.teacherId) : null;
          if (teacher) {
            sendCertificateRequestedEmail(teacher.email, teacher.name, student.name, course.name).catch(console.error);
            await insertNotification(db, teacher.id, "Certificate Request", `${student.name} requested a certificate for "${course.name}".`, `/teacher/certificates`);
            await insertMessage(db, student.id, teacher.id, "Certificate Request: " + course.name, `Hello Instructor ${teacher.name},\n\nI have completed all assessments for "${course.name}" and requested my certificate of completion.`);
          }
          const adminUsers = serverStore.getAllUsers().filter((u: any) => u.role === "admin");
          for (const admin of adminUsers) {
            sendCertificateRequestedEmail(admin.email, admin.name, student.name, course.name).catch(console.error);
            await insertNotification(db, admin.id, "Certificate Request", `${student.name} requested a certificate for "${course.name}".`, `/admin/certificates`);
            await insertMessage(db, student.id, admin.id, "Certificate Request: " + course.name, `Hello Admin ${admin.name},\n\nI have completed all assessments for "${course.name}" and requested my certificate of completion.`);
          }
        }
      } catch (err) {
        console.error("Error sending certificate request notifications:", err);
      }

      return new Response(
        JSON.stringify({ certificate: created }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id/approve
    if (request.method === "PUT" && path.startsWith("/api/certificates/") && path.endsWith("/approve")) {
      const id = path.slice("/api/certificates/".length, -"/approve".length);
      const issuedAt = new Date().toISOString().slice(0, 10);
      let updated: any = { id, status: "approved", issuedAt };

      try {
        await supabase.from("certificates").update({
          status: "approved",
          issued_at: new Date().toISOString(),
        }).eq("id", id);
      } catch (sErr) {}

      const existing = serverStore.getCertificates().find((c: any) => c.id === id);
      updated = serverStore.saveCertificate({ ...(existing || {}), ...updated, status: "approved", issuedAt });

      try {
        if (db) {
          await db.update(certificates).set({ status: "approved", issuedAt: new Date() }).where(eq(certificates.id, id));
        }
      } catch (dbErr) {}

      try {
        if (updated) {
          const student = serverStore.getUserById(updated.studentId);
          const course = serverStore.getCourses().find((c: any) => c.id === updated.courseId);
          if (student && course) {
            sendCertificateApprovedEmail(student.email, student.name, course.name).catch(console.error);
            await insertNotification(db, student.id, "Certificate Approved", `Your certificate for "${course.name}" has been approved!`, `/student/certificates`);
            const senderId = course.teacherId || "ADM01";
            await insertMessage(db, senderId, student.id, "Certificate Approved! 🎉", `Hello ${student.name},\n\nCongratulations! Your certificate of completion for "${course.name}" has been approved. You can download it from your certificates panel.`);
          }
        }
      } catch (err) {
        console.error("Error sending certificate approval notifications:", err);
      }

      return new Response(
        JSON.stringify({ certificate: updated }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id/reject
    if (request.method === "PUT" && path.startsWith("/api/certificates/") && path.endsWith("/reject")) {
      const id = path.slice("/api/certificates/".length, -"/reject".length);
      const body = await request.json();
      let updated: any = { id, status: "rejected", rejectionReason: body.reason || null };

      try {
        await supabase.from("certificates").update({
          status: "rejected",
          rejection_reason: body.reason || null,
        }).eq("id", id);
      } catch (sErr) {}

      const existing = serverStore.getCertificates().find((c: any) => c.id === id);
      updated = serverStore.saveCertificate({ ...(existing || {}), ...updated, status: "rejected", rejectionReason: body.reason || null });

      try {
        if (db) {
          await db.update(certificates).set({ status: "rejected", rejectionReason: body.reason || null }).where(eq(certificates.id, id));
        }
      } catch (dbErr) {}

      try {
        if (updated) {
          const student = serverStore.getUserById(updated.studentId);
          const course = serverStore.getCourses().find((c: any) => c.id === updated.courseId);
          if (student && course) {
            sendCertificateRejectedEmail(student.email, student.name, course.name, body.reason || "No reason specified").catch(console.error);
            await insertNotification(db, student.id, "Certificate Request Update", `Your certificate request for "${course.name}" was declined.`, `/student/certificates`);
            const senderId = course.teacherId || "ADM01";
            await insertMessage(db, senderId, student.id, "Certificate Request Update", `Hello ${student.name},\n\nYour certificate request for "${course.name}" has been declined.\n\nReason: ${body.reason || "No reason specified"}`);
          }
        }
      } catch (err) {
        console.error("Error sending certificate rejection notifications:", err);
      }

      return new Response(
        JSON.stringify({ certificate: updated }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id (general update)
    if (request.method === "PUT" && path.startsWith("/api/certificates/")) {
      const id = path.slice("/api/certificates/".length);
      const body = await request.json();
      let updated: any = { id, ...body };

      try {
        const updateData: any = {};
        if (body.status !== undefined) updateData.status = body.status;
        if (body.teacherNote !== undefined) updateData.teacher_note = body.teacherNote;
        if (body.rejectionReason !== undefined) updateData.rejection_reason = body.rejectionReason;
        if (body.status === "approved") updateData.issued_at = new Date().toISOString();

        await supabase.from("certificates").update(updateData).eq("id", id);
      } catch (sErr) {}

      const existing = serverStore.getCertificates().find((c: any) => c.id === id);
      updated = serverStore.saveCertificate({ ...(existing || {}), ...body, id });

      return new Response(JSON.stringify({ certificate: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // ASSESSMENTS API
    // ==========================================

    // GET /api/assessments -> list all assessments and nested questions
    if (request.method === "GET" && path === "/api/assessments") {
      let mapped: any[] = [];

      try {
        const { data: sAssessments } = await supabase.from("assessments").select("*");
        const { data: sQuestions } = await supabase.from("questions").select("*");

        if (sAssessments && sAssessments.length > 0) {
          const questionsMap = new Map<string, any[]>();
          if (sQuestions) {
            for (const q of sQuestions) {
              const aId = q.assessment_id || q.assessmentId;
              const list = questionsMap.get(aId) || [];
              list.push({
                id: q.id,
                prompt: q.prompt || q.text || "",
                type: q.type || "mcq",
                options: (q.options as string[]) ?? [],
                correctIndex: typeof q.correct_index === "number" ? q.correct_index : (q.correctIndex ?? 0),
                points: q.points ?? 1,
                imageUrl: q.image_url || q.imageUrl || undefined,
                order: q.order ?? 0,
              });
              questionsMap.set(aId, list);
            }
          }

          mapped = sAssessments.map((a: any) => ({
            id: a.id,
            courseId: a.course_id || a.courseId,
            title: a.title,
            timeLimit: a.time_limit || a.timeLimit || a.duration || 10,
            passingScore: a.passing_score || a.passingScore || 70,
            attempts: a.attempts ?? 1,
            questionCount: questionsMap.get(a.id)?.length || a.question_count || a.questionCount || 0,
            proctored: a.proctored ?? false,
            isFinal: a.is_final ?? a.isFinal ?? false,
            questions: (questionsMap.get(a.id) || []).sort((x: any, y: any) => (x.order ?? 0) - (y.order ?? 0)),
          }));
          serverStore.setAssessments(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getAssessments();
      }

      return new Response(JSON.stringify({ assessments: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/assessments -> create assessment
    if (request.method === "POST" && path === "/api/assessments") {
      const body = await request.json();
      const id = body.id || makeId();
      let created: any = {
        id,
        courseId: body.courseId,
        title: body.title || "Quiz",
        timeLimit: body.timeLimit ?? 10,
        passingScore: body.passingScore ?? 70,
        attempts: body.attempts ?? 1,
        questionCount: 0,
        proctored: body.proctored ?? false,
        isFinal: body.isFinal ?? false,
        questions: [],
      };

      try {
        await supabase.from("assessments").insert({
          id,
          course_id: body.courseId,
          title: body.title || "Quiz",
          time_limit: body.timeLimit ?? 10,
          passing_score: body.passingScore ?? 70,
          attempts: body.attempts ?? 1,
          question_count: 0,
          proctored: body.proctored ?? false,
          is_final: body.isFinal ?? false,
        });
      } catch (sErr) {}

      serverStore.saveAssessment(created);

      try {
        if (db) {
          await db.insert(assessments).values({
            id,
            courseId: body.courseId,
            title: body.title || "Quiz",
            timeLimit: body.timeLimit ?? 10,
            passingScore: body.passingScore ?? 70,
            attempts: body.attempts ?? 1,
            questionCount: 0,
            proctored: body.proctored ?? false,
            isFinal: body.isFinal ?? false,
          });
        }
      } catch (dbErr) {}

      return new Response(JSON.stringify({ assessment: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/assessments/:id -> update assessment
    if (request.method === "PUT" && path.startsWith("/api/assessments/")) {
      const id = path.slice("/api/assessments/".length);
      const body = await request.json();

      try {
        const updateData: any = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.timeLimit !== undefined) updateData.time_limit = body.timeLimit;
        if (body.passingScore !== undefined) updateData.passing_score = body.passingScore;
        if (body.attempts !== undefined) updateData.attempts = body.attempts;
        if (body.proctored !== undefined) updateData.proctored = body.proctored;
        if (body.isFinal !== undefined) updateData.is_final = body.isFinal;
        if (body.questionCount !== undefined) updateData.question_count = body.questionCount;

        await supabase.from("assessments").update(updateData).eq("id", id);
      } catch (sErr) {}

      const existing = serverStore.getAssessments().find((a: any) => a.id === id);
      const updated = serverStore.saveAssessment({ ...(existing || {}), ...body, id });

      try {
        if (db) {
          await db.update(assessments).set(body).where(eq(assessments.id, id));
        }
      } catch (dbErr) {}

      return new Response(JSON.stringify({ assessment: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/assessments/:id -> delete assessment
    if (request.method === "DELETE" && path.startsWith("/api/assessments/")) {
      const id = path.slice("/api/assessments/".length);
      try {
        await supabase.from("questions").delete().eq("assessment_id", id);
        await supabase.from("assessments").delete().eq("id", id);
      } catch (sErr) {}

      serverStore.deleteAssessment(id);

      try {
        if (db) {
          await db.delete(assessments).where(eq(assessments.id, id));
        }
      } catch (dbErr) {}

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // QUESTIONS API
    // ==========================================

    // GET /api/questions -> list questions (optionally filter by assessmentId)
    if (request.method === "GET" && path === "/api/questions") {
      const assessmentId = url.searchParams.get("assessmentId");
      let mapped: any[] = [];

      try {
        let query = supabase.from("questions").select("*");
        if (assessmentId) query = query.eq("assessment_id", assessmentId);
        const { data: sQuestions } = await query;

        if (sQuestions && sQuestions.length > 0) {
          mapped = sQuestions.map((q: any) => ({
            id: q.id,
            assessmentId: q.assessment_id || q.assessmentId,
            type: q.type || "mcq",
            prompt: q.prompt || q.text || "",
            options: (q.options as string[]) ?? [],
            correctIndex: typeof q.correct_index === "number" ? q.correct_index : (q.correctIndex ?? 0),
            points: q.points ?? 1,
            imageUrl: q.image_url || q.imageUrl || undefined,
            order: q.order ?? 0,
          }));
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getQuestions();
        if (assessmentId) mapped = mapped.filter((q: any) => q.assessmentId === assessmentId);
      }

      mapped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      return new Response(JSON.stringify({ questions: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/questions -> create question
    if (request.method === "POST" && path === "/api/questions") {
      const body = await request.json();
      const id = body.id || makeId();
      let created: any = {
        id,
        assessmentId: body.assessmentId,
        type: body.type || "mcq",
        prompt: body.prompt || "",
        options: body.options ?? null,
        correctIndex: body.correctIndex ?? null,
        points: body.points ?? 1,
        imageUrl: body.imageUrl ?? null,
        order: body.order ?? 0,
      };

      try {
        await supabase.from("questions").insert({
          id,
          assessment_id: body.assessmentId,
          type: body.type || "mcq",
          prompt: body.prompt || "",
          options: body.options ?? null,
          correct_index: body.correctIndex ?? null,
          points: body.points ?? 1,
          image_url: body.imageUrl ?? null,
          order: body.order ?? 0,
        });
      } catch (sErr) {}

      serverStore.saveQuestion(created);

      try {
        if (db) {
          await db.insert(questions).values(created);
        }
      } catch (dbErr) {}

      return new Response(JSON.stringify({ question: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/questions/batch -> batch create questions
    if (request.method === "POST" && path === "/api/questions/batch") {
      const body = await request.json();
      const { assessmentId, questions: qs } = body;
      if (!assessmentId || !Array.isArray(qs)) {
        return new Response(JSON.stringify({ error: "assessmentId and questions array are required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const createdQs = [];
      let orderIndex = 0;

      for (const q of qs) {
        const id = q.id || makeId();
        const item = {
          id,
          assessmentId,
          type: q.type || "mcq",
          prompt: q.prompt || "",
          options: q.options ?? null,
          correctIndex: q.correctIndex ?? null,
          points: q.points ?? 1,
          imageUrl: q.imageUrl ?? null,
          order: orderIndex++,
        };

        try {
          await supabase.from("questions").insert({
            id,
            assessment_id: assessmentId,
            type: item.type,
            prompt: item.prompt,
            options: item.options,
            correct_index: item.correctIndex,
            points: item.points,
            image_url: item.imageUrl,
            order: item.order,
          });
        } catch (sErr) {}

        serverStore.saveQuestion(item);
        createdQs.push(item);
      }

      return new Response(JSON.stringify({ ok: true, questions: createdQs }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/questions/:id -> update question
    if (request.method === "PUT" && path.startsWith("/api/questions/")) {
      const id = path.slice("/api/questions/".length);
      const body = await request.json();

      try {
        const updateData: any = {};
        if (body.type !== undefined) updateData.type = body.type;
        if (body.prompt !== undefined) updateData.prompt = body.prompt;
        if (body.options !== undefined) updateData.options = body.options;
        if (body.correctIndex !== undefined) updateData.correct_index = body.correctIndex;
        if (body.points !== undefined) updateData.points = body.points;
        if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
        if (body.order !== undefined) updateData.order = body.order;

        await supabase.from("questions").update(updateData).eq("id", id);
      } catch (sErr) {}

      const existing = serverStore.getQuestions().find((q: any) => q.id === id);
      const updated = serverStore.saveQuestion({ ...(existing || {}), ...body, id });

      return new Response(JSON.stringify({ question: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/questions/:id -> delete question
    if (request.method === "DELETE" && path.startsWith("/api/questions/")) {
      const id = path.slice("/api/questions/".length);
      try {
        await supabase.from("questions").delete().eq("id", id);
      } catch (sErr) {}

      serverStore.deleteQuestion(id);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // SUBMISSIONS API
    // ==========================================

    // GET /api/submissions -> list submissions
    if (request.method === "GET" && path === "/api/submissions") {
      const studentId = url.searchParams.get("studentId");
      const assessmentId = url.searchParams.get("assessmentId");

      let mapped: any[] = [];

      try {
        let query = supabase.from("submissions").select("*");
        if (studentId) query = query.eq("student_id", studentId);
        if (assessmentId) query = query.eq("assessment_id", assessmentId);

        const { data: sSubmissions } = await query;
        const { data: sResponses } = await supabase.from("submission_responses").select("*");

        if (sSubmissions && sSubmissions.length > 0) {
          const responsesMap = new Map<string, any[]>();
          if (sResponses) {
            for (const r of sResponses) {
              const subId = r.submission_id || r.submissionId;
              const list = responsesMap.get(subId) || [];
              list.push({
                questionId: r.question_id || r.questionId,
                response: r.response,
                awarded: r.awarded,
              });
              responsesMap.set(subId, list);
            }
          }

          mapped = sSubmissions.map((s: any) => ({
            id: s.id,
            assessmentId: s.assessment_id || s.assessmentId,
            studentId: s.student_id || s.studentId,
            attemptNumber: s.attempt_number || s.attemptNumber || 1,
            score: typeof s.score === "number" ? s.score : (parseInt(s.score, 10) || 0),
            status: s.status,
            submittedAt: s.submitted_at ? String(s.submitted_at).slice(0, 10) : "",
            feedback: s.feedback || undefined,
            proctorEvents: s.proctor_events || s.proctorEvents || undefined,
            responses: responsesMap.get(s.id) || [],
          }));
          serverStore.setSubmissions(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getSubmissions();
        if (studentId) mapped = mapped.filter((s) => s.studentId === studentId);
        if (assessmentId) mapped = mapped.filter((s) => s.assessmentId === assessmentId);
      }

      return new Response(JSON.stringify({ submissions: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/submissions -> create a student submission and responses
    if (request.method === "POST" && path === "/api/submissions") {
      const body = await request.json();
      const id = body.id || makeId();

      const earnedScore = (body.responses || []).reduce((sum: number, r: any) => sum + (r.awarded || 0), 0);
      const totalPossible = (body.responses || []).length * 10 || 100;
      const computedPercentage = Math.round((earnedScore / totalPossible) * 100) || 100;

      let created: any = {
        id,
        assessmentId: body.assessmentId,
        studentId: body.studentId,
        score: computedPercentage,
        submittedAt: body.submittedAt ? String(body.submittedAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: body.status || "graded",
        feedback: body.feedback || null,
        proctorEvents: body.proctorEvents || null,
        responses: (body.responses || []).map((r: any) => ({
          questionId: r.questionId,
          response: r.response,
          awarded: r.awarded ?? 10,
        })),
      };

      try {
        await supabase.from("submissions").insert({
          id,
          assessment_id: body.assessmentId,
          student_id: body.studentId,
          score: computedPercentage,
          submitted_at: new Date().toISOString(),
          status: body.status || "graded",
          feedback: body.feedback || null,
          proctor_events: body.proctorEvents || null,
        });

        if (body.responses && Array.isArray(body.responses)) {
          for (const resp of body.responses) {
            await supabase.from("submission_responses").insert({
              id: makeId(),
              submission_id: id,
              question_id: resp.questionId,
              response: resp.response,
              awarded: resp.awarded,
            });
          }
        }
      } catch (sErr) {}

      serverStore.saveSubmission(created);

      try {
        const student = serverStore.getUserById(body.studentId);
        const assessment = serverStore.getAssessments().find((a: any) => a.id === body.assessmentId);
        const course = assessment ? serverStore.getCourses().find((c: any) => c.id === assessment.courseId) : null;
        const teacher = course && course.teacherId ? serverStore.getUserById(course.teacherId) : null;

        if (teacher && student && assessment && course) {
          sendNewSubmissionEmail(teacher.email, teacher.name, student.name, assessment.title, course.name).catch(console.error);
          await insertNotification(db, teacher.id, "New Quiz Submission", `${student.name} submitted "${assessment.title}".`, `/teacher/assessments`);
          await insertMessage(db, student.id, teacher.id, "Quiz Submission: " + assessment.title, `Hello Instructor ${teacher.name},\n\nI have submitted my quiz for "${assessment.title}" in course "${course.name}".`);
        }

        if (student && assessment && course) {
          sendSubmissionGradedEmail(student.email, student.name, assessment.title, earnedScore, totalPossible).catch(console.error);
          await insertNotification(db, student.id, "Quiz Auto-graded", `${assessment.title}: ${computedPercentage}%.`, `/student/courses/${course.id}`);
          const senderId = course.teacherId || "ADM01";
          await insertMessage(db, senderId, student.id, "Quiz Graded: " + assessment.title, `Hello ${student.name},\n\nYour quiz "${assessment.title}" has been automatically graded.\n\nScore: ${computedPercentage}%.`);
        }
      } catch (err) {
        console.error("Error sending submission notifications:", err);
      }

      return new Response(
        JSON.stringify({
          submission: created,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/submissions/:id/grade -> grade a submission
    if (request.method === "PUT" && path.startsWith("/api/submissions/") && path.endsWith("/grade")) {
      const id = path.slice("/api/submissions/".length, -"/grade".length);
      const body = await request.json();

      try {
        await supabase
          .from("submissions")
          .update({
            status: "graded",
            feedback: body.feedback || null,
          })
          .eq("id", id);
      } catch (sErr) {}

      const existing = serverStore.getSubmissions().find((s: any) => s.id === id);
      const updated = serverStore.saveSubmission({ ...(existing || {}), ...body, status: "graded", id });

      return new Response(
        JSON.stringify({
          submission: updated,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // ==========================================
    // PROGRESS API
    // ==========================================

    // GET /api/progress -> list all progress entries
    if (request.method === "GET" && path === "/api/progress") {
      const studentId = url.searchParams.get("studentId");
      const courseId = url.searchParams.get("courseId");

      let progressRecord: Record<string, string[]> = serverStore.getProgressRecord();

      try {
        const { data: sProgress } = await supabase.from("progress").select("*");
        if (sProgress) {
          for (const p of sProgress) {
            const sId = p.student_id || p.studentId;
            const cId = p.course_id || p.courseId;
            const itemKey = p.content_item_id || p.contentItemId;
            const key = `${sId}:${cId}`;
            if (!progressRecord[key]) progressRecord[key] = [];
            if (!progressRecord[key].includes(itemKey)) {
              progressRecord[key].push(itemKey);
            }
          }
        }
      } catch (sErr) {}

      let completedItemIds: string[] = [];
      if (studentId && courseId) {
        const key = `${studentId}:${courseId}`;
        completedItemIds = progressRecord[key] || serverStore.getProgressFor(studentId, courseId);
      }

      return new Response(
        JSON.stringify({
          progress: progressRecord,
          completedItemIds,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // POST /api/progress -> mark progress complete
    if (request.method === "POST" && path === "/api/progress") {
      const body = await request.json(); // { studentId, courseId, contentItemId }
      const id = makeId();

      serverStore.saveProgress(body.studentId, body.courseId, body.contentItemId);

      try {
        await supabase.from("progress").insert({
          id,
          student_id: body.studentId,
          course_id: body.courseId,
          content_item_id: body.contentItemId,
        });
      } catch (sErr) {}

      try {
        if (db) {
          const existing = await db
            .select()
            .from(progress)
            .where(
              and(
                eq(progress.studentId, body.studentId),
                eq(progress.courseId, body.courseId),
                eq(progress.contentItemId, body.contentItemId)
              )
            );

          if (existing.length === 0) {
            await db.insert(progress).values({
              id,
              studentId: body.studentId,
              courseId: body.courseId,
              contentItemId: body.contentItemId,
            });
          }
        }
      } catch (dbErr) {}

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/progress -> unmark progress complete
    if (request.method === "DELETE" && path === "/api/progress") {
      const studentId = url.searchParams.get("studentId");
      const courseId = url.searchParams.get("courseId");
      const contentItemId = url.searchParams.get("contentItemId");

      if (studentId && courseId && contentItemId) {
        serverStore.removeProgress(studentId, courseId, contentItemId);

        try {
          await supabase
            .from("progress")
            .delete()
            .eq("student_id", studentId)
            .eq("course_id", courseId)
            .eq("content_item_id", contentItemId);
        } catch (sErr) {}

        try {
          if (db) {
            await db
              .delete(progress)
              .where(
                and(
                  eq(progress.studentId, studentId),
                  eq(progress.courseId, courseId),
                  eq(progress.contentItemId, contentItemId)
                )
              );
          }
        } catch (dbErr) {}
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // NOTIFICATIONS API
    // ==========================================

    // GET /api/notifications -> list all notifications
    if (request.method === "GET" && path === "/api/notifications") {
      let mapped: any[] = [];

      try {
        const { data: sNotifs } = await supabase.from("notifications").select("*");
        if (sNotifs && sNotifs.length > 0) {
          mapped = sNotifs.map((n: any) => {
            const item = {
              id: n.id,
              userId: n.user_id || n.userId,
              title: n.title,
              message: n.message,
              read: n.read,
              link: n.link ?? undefined,
              createdAt: n.created_at ? new Date(n.created_at).toISOString() : new Date().toISOString(),
            };
            serverStore.addNotification(item);
            return item;
          });
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getNotifications();
      }

      return new Response(JSON.stringify({ notifications: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/notifications -> create notification
    if (request.method === "POST" && path === "/api/notifications") {
      const body = await request.json();
      const id = body.id || makeId();

      await db.insert(notifications).values({
        id,
        userId: body.userId,
        title: body.title || "",
        message: body.message || "",
        read: body.read ?? false,
        link: body.link || null,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });

      const created = await db.query.notifications.findFirst({ where: eq(notifications.id, id) });
      return new Response(
        JSON.stringify({
          notification: created
            ? {
                ...created,
                createdAt: created.createdAt.toISOString(),
                link: created.link ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/notifications/read-all -> mark all notifications read for a user
    if (request.method === "PUT" && path === "/api/notifications/read-all") {
      const body = await request.json();
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, body.userId));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/notifications/:id/read -> mark single notification read
    if (request.method === "PUT" && path.startsWith("/api/notifications/") && path.endsWith("/read")) {
      const id = path.slice("/api/notifications/".length, -"/read".length);
      try {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
        } catch (dbErr) {}
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // MESSAGES API
    // ==========================================

    // GET /api/messages -> list all messages
    if (request.method === "GET" && path === "/api/messages") {
      let mapped: any[] = [];

      try {
        const { data: sMsgs } = await supabase.from("messages").select("*");
        if (sMsgs && sMsgs.length > 0) {
          mapped = sMsgs.map((m: any) => {
            const item = {
              id: m.id,
              fromId: m.from_id || m.fromId,
              toId: m.to_id || m.toId,
              subject: m.subject,
              body: m.body,
              read: m.read,
              createdAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
            };
            serverStore.addMessage(item);
            return item;
          });
        }
      } catch (sErr) {}

      const storeMsgs = serverStore.getMessages();
      for (const sm of storeMsgs) {
        if (!mapped.some((m) => m.id === sm.id)) {
          mapped.push(sm);
        }
      }

      return new Response(JSON.stringify({ messages: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/messages -> create message
    if (request.method === "POST" && path === "/api/messages") {
      const body = await request.json();
      const id = body.id || makeId();
      const createdAtStr = body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString();

      const newMsg = {
        id,
        fromId: body.fromId,
        toId: body.toId,
        subject: body.subject || "",
        body: body.body || "",
        read: body.read ?? false,
        createdAt: createdAtStr,
      };

      try {
        await supabase.from("messages").insert({
          id,
          from_id: body.fromId,
          to_id: body.toId,
          subject: body.subject || "",
          body: body.body || "",
          read: body.read ?? false,
          created_at: createdAtStr,
        });

        if (db) {
          try {
            await db.insert(messages).values({
              id,
              fromId: body.fromId,
              toId: body.toId,
              subject: body.subject || "",
              body: body.body || "",
              read: body.read ?? false,
              createdAt: new Date(createdAtStr),
            });
          } catch (e) {}
        }

        const recipient = serverStore.getUserById(body.toId);
        const sender = serverStore.getUserById(body.fromId);
        if (recipient) {
          if (body.subject === "We miss you! 👋") {
            sendNudgeEmail(recipient.email, recipient.name, body.subject, body.body).catch(console.error);
          } else {
            const senderName = sender ? sender.name : "System / Administrator";
            sendMessageNotificationEmail(recipient.email, recipient.name, senderName, body.subject || "New Message", body.body || "").catch(console.error);
          }
        }
      } catch (dbErr) {
        console.warn("⚠️ Supabase insert message warning (using serverStore fallback)");
        const recipient = serverStore.getUserById(body.toId);
        const sender = serverStore.getUserById(body.fromId);
        if (recipient) {
          const senderName = sender ? sender.name : "System / Administrator";
          sendMessageNotificationEmail(recipient.email, recipient.name, senderName, body.subject || "New Message", body.body || "").catch(console.error);
        }
      }

      serverStore.addMessage(newMsg);

      return new Response(
        JSON.stringify({
          message: newMsg,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/messages/:id/read -> mark single message read
    if (request.method === "PUT" && path.startsWith("/api/messages/") && path.endsWith("/read")) {
      const id = path.slice("/api/messages/".length, -"/read".length);
      try {
        await supabase.from("messages").update({ read: true }).eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.update(messages).set({ read: true }).where(eq(messages.id, id));
        } catch (dbErr) {}
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // EVENTS API
    // ==========================================

    // GET /api/events -> list all events
    if (request.method === "GET" && path === "/api/events") {
      let mapped: any[] = [];

      try {
        const { data: sEvents } = await supabase.from("events").select("*");
        if (sEvents && sEvents.length > 0) {
          mapped = sEvents.map((e: any) => ({
            id: e.id,
            courseId: e.course_id || e.courseId || null,
            title: e.title,
            description: e.description || null,
            eventDate: e.event_date ? new Date(e.event_date).toISOString() : new Date().toISOString(),
            createdAt: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString(),
          }));
          serverStore.setEvents(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getEvents();
      }

      return new Response(JSON.stringify({ events: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/events -> create event
    if (request.method === "POST" && path === "/api/events") {
      const body = await request.json();
      const id = body.id || makeId();
      const eventDateIso = body.eventDate ? new Date(body.eventDate).toISOString() : new Date().toISOString();
      const createdAtIso = body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString();

      const newEventObj = {
        id,
        courseId: body.courseId || null,
        title: body.title || "",
        description: body.description || null,
        eventDate: eventDateIso,
        createdAt: createdAtIso,
      };

      try {
        await supabase.from("events").insert({
          id,
          course_id: body.courseId || null,
          title: body.title || "",
          description: body.description || null,
          event_date: eventDateIso,
          created_at: createdAtIso,
        });
      } catch (sErr) {}

      if (db) {
        try {
          await db.insert(events).values({
            id,
            courseId: body.courseId || null,
            title: body.title || "",
            description: body.description || null,
            eventDate: new Date(eventDateIso),
            createdAt: new Date(createdAtIso),
          });
        } catch (dbErr) {}
      }

      serverStore.addEvent(newEventObj);

      return new Response(
        JSON.stringify({ event: newEventObj }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/events/:id -> delete event
    if (request.method === "DELETE" && path.startsWith("/api/events/")) {
      const id = path.slice("/api/events/".length);
      try {
        await supabase.from("events").delete().eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.delete(events).where(eq(events.id, id));
        } catch (dbErr) {}
      }
      serverStore.deleteEvent(id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // ANNOUNCEMENTS API
    // ==========================================

    // GET /api/announcements -> list all announcements
    if (request.method === "GET" && path === "/api/announcements") {
      let mapped: any[] = [];

      try {
        const { data: sAnns } = await supabase.from("announcements").select("*");
        if (sAnns && sAnns.length > 0) {
          mapped = sAnns.map((a: any) => ({
            id: a.id,
            courseId: a.course_id || a.courseId,
            title: a.title,
            body: a.body,
            isPinned: a.is_pinned ?? a.isPinned,
            createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
          }));
          serverStore.setAnnouncements(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getAnnouncements();
      }

      return new Response(JSON.stringify({ announcements: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/announcements -> create announcement
    if (request.method === "POST" && path === "/api/announcements") {
      const body = await request.json();
      const id = body.id || makeId();
      const createdAtIso = body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString();

      const newAnnObj = {
        id,
        courseId: body.courseId,
        title: body.title || "",
        body: body.body || "",
        isPinned: body.isPinned ?? false,
        createdAt: createdAtIso,
      };

      try {
        await supabase.from("announcements").insert({
          id,
          course_id: body.courseId,
          title: body.title || "",
          body: body.body || "",
          is_pinned: body.isPinned ?? false,
          created_at: createdAtIso,
        });
      } catch (sErr) {}

      if (db) {
        try {
          await db.insert(announcements).values({
            id,
            courseId: body.courseId,
            title: body.title || "",
            body: body.body || "",
            isPinned: body.isPinned ?? false,
            createdAt: new Date(createdAtIso),
          });
        } catch (dbErr) {}
      }

      serverStore.addAnnouncement(newAnnObj);

      return new Response(
        JSON.stringify({ announcement: newAnnObj }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/announcements/:id -> delete announcement
    if (request.method === "DELETE" && path.startsWith("/api/announcements/")) {
      const id = path.slice("/api/announcements/".length);
      try {
        await supabase.from("announcements").delete().eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.delete(announcements).where(eq(announcements.id, id));
        } catch (dbErr) {}
      }
      serverStore.deleteAnnouncement(id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // DISCUSSIONS API
    // ==========================================

    // GET /api/discussions -> list all discussions
    if (request.method === "GET" && path === "/api/discussions") {
      let mapped: any[] = [];

      try {
        const { data: sDiscussions } = await supabase.from("discussions").select("*");
        if (sDiscussions && sDiscussions.length > 0) {
          mapped = sDiscussions.map((d: any) => ({
            id: d.id,
            courseId: d.course_id || d.courseId,
            userId: d.user_id || d.userId,
            title: d.title,
            body: d.body,
            createdAt: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString(),
          }));
          serverStore.setDiscussions(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getDiscussions();
      }

      return new Response(JSON.stringify({ discussions: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/discussions -> create discussion
    if (request.method === "POST" && path === "/api/discussions") {
      const body = await request.json();
      const id = body.id || makeId();
      const createdAtIso = body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString();

      const newDiscObj = {
        id,
        courseId: body.courseId,
        userId: body.userId,
        title: body.title || "",
        body: body.body || "",
        createdAt: createdAtIso,
      };

      try {
        await supabase.from("discussions").insert({
          id,
          course_id: body.courseId,
          user_id: body.userId,
          title: body.title || "",
          body: body.body || "",
          created_at: createdAtIso,
        });
      } catch (sErr) {}

      if (db) {
        try {
          await db.insert(discussions).values({
            id,
            courseId: body.courseId,
            userId: body.userId,
            title: body.title || "",
            body: body.body || "",
            createdAt: new Date(createdAtIso),
          });
        } catch (dbErr) {}
      }

      serverStore.addDiscussion(newDiscObj);

      return new Response(
        JSON.stringify({ discussion: newDiscObj }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/discussions/:id -> delete discussion
    if (request.method === "DELETE" && path.startsWith("/api/discussions/")) {
      const id = path.slice("/api/discussions/".length);
      try {
        await supabase.from("discussions").delete().eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.delete(discussions).where(eq(discussions.id, id));
        } catch (dbErr) {}
      }
      serverStore.deleteDiscussion(id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // DISCUSSION REPLIES API
    // ==========================================

    // GET /api/discussion-replies -> list all replies
    if (request.method === "GET" && path === "/api/discussion-replies") {
      let mapped: any[] = [];

      try {
        const { data: sReplies } = await supabase.from("discussion_replies").select("*");
        if (sReplies && sReplies.length > 0) {
          mapped = sReplies.map((r: any) => ({
            id: r.id,
            discussionId: r.discussion_id || r.discussionId,
            userId: r.user_id || r.userId,
            body: r.body,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          }));
          serverStore.setDiscussionReplies(mapped);
        }
      } catch (sErr) {}

      if (mapped.length === 0) {
        mapped = serverStore.getDiscussionReplies();
      }

      return new Response(JSON.stringify({ discussionReplies: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/discussion-replies -> create reply
    if (request.method === "POST" && path === "/api/discussion-replies") {
      const body = await request.json();
      const id = body.id || makeId();
      const createdAtIso = body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString();

      const newReplyObj = {
        id,
        discussionId: body.discussionId,
        userId: body.userId,
        body: body.body || "",
        createdAt: createdAtIso,
      };

      try {
        await supabase.from("discussion_replies").insert({
          id,
          discussion_id: body.discussionId,
          user_id: body.userId,
          body: body.body || "",
          created_at: createdAtIso,
        });
      } catch (sErr) {}

      if (db) {
        try {
          await db.insert(discussionReplies).values({
            id,
            discussionId: body.discussionId,
            userId: body.userId,
            body: body.body || "",
            createdAt: new Date(createdAtIso),
          });
        } catch (dbErr) {}
      }

      serverStore.addDiscussionReply(newReplyObj);

      return new Response(
        JSON.stringify({ discussionReply: newReplyObj }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/discussion-replies/:id -> delete reply
    if (request.method === "DELETE" && path.startsWith("/api/discussion-replies/")) {
      const id = path.slice("/api/discussion-replies/".length);
      try {
        await supabase.from("discussion_replies").delete().eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.delete(discussionReplies).where(eq(discussionReplies.id, id));
        } catch (dbErr) {}
      }
      serverStore.deleteDiscussionReply(id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // VIDEO CHECKPOINTS API
    // ==========================================

    // GET /api/video-checkpoints -> list checkpoints
    if (request.method === "GET" && path === "/api/video-checkpoints") {
      const contentItemId = url.searchParams.get("contentItemId");
      let rows: any[] = [];

      try {
        let query = supabase.from("video_checkpoints").select("*");
        if (contentItemId) query = query.eq("content_item_id", contentItemId);
        const { data: sCheckpoints } = await query;

        if (sCheckpoints && sCheckpoints.length > 0) {
          rows = sCheckpoints.map((v: any) => ({
            id: v.id,
            contentItemId: v.content_item_id || v.contentItemId,
            timestamp: v.timestamp,
            type: v.type,
            prompt: v.prompt,
            options: v.options,
            correctIndex: v.correct_index ?? v.correctIndex,
            correctText: v.correct_text || v.correctText,
          }));
          serverStore.setVideoCheckpoints(rows);
        }
      } catch (sErr) {}

      if (rows.length === 0) {
        rows = serverStore.getVideoCheckpoints();
        if (contentItemId) rows = rows.filter((v) => v.contentItemId === contentItemId);
      }

      return new Response(JSON.stringify({ videoCheckpoints: rows }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/video-checkpoints -> create/update checkpoint
    if (request.method === "POST" && path === "/api/video-checkpoints") {
      const body = await request.json();
      const id = body.id || makeId();
      const { contentItemId, timestamp, type, prompt, options, correctIndex, correctText } = body;
      
      const newVCObj = {
        id,
        contentItemId,
        timestamp: Number(timestamp),
        type,
        prompt,
        options: options || null,
        correctIndex: correctIndex !== undefined && correctIndex !== null ? Number(correctIndex) : null,
        correctText: correctText || null,
      };

      try {
        await supabase.from("video_checkpoints").upsert({
          id,
          content_item_id: contentItemId,
          timestamp: Number(timestamp),
          type,
          prompt,
          options: options || null,
          correct_index: correctIndex !== undefined && correctIndex !== null ? Number(correctIndex) : null,
          correct_text: correctText || null,
        });
      } catch (sErr) {}

      if (db) {
        try {
          const existing = await db.query.videoCheckpoints.findFirst({ where: eq(videoCheckpoints.id, id) });
          if (existing) {
            await db.update(videoCheckpoints).set({
              timestamp: Number(timestamp),
              type,
              prompt,
              options: options || null,
              correctIndex: correctIndex !== undefined && correctIndex !== null ? Number(correctIndex) : null,
              correctText: correctText || null,
              updatedAt: new Date(),
            }).where(eq(videoCheckpoints.id, id));
          } else {
            await db.insert(videoCheckpoints).values({
              id,
              contentItemId,
              timestamp: Number(timestamp),
              type,
              prompt,
              options: options || null,
              correctIndex: correctIndex !== undefined && correctIndex !== null ? Number(correctIndex) : null,
              correctText: correctText || null,
            });
          }
        } catch (dbErr) {}
      }

      serverStore.saveVideoCheckpoint(newVCObj);
      return new Response(JSON.stringify({ videoCheckpoint: newVCObj }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/video-checkpoints/:id -> delete checkpoint
    if (request.method === "DELETE" && path.startsWith("/api/video-checkpoints/")) {
      const id = path.slice("/api/video-checkpoints/".length);
      try {
        await supabase.from("video_checkpoints").delete().eq("id", id);
      } catch (sErr) {}
      if (db) {
        try {
          await db.delete(videoCheckpoints).where(eq(videoCheckpoints.id, id));
        } catch (dbErr) {}
      }
      serverStore.deleteVideoCheckpoint(id);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // CHECKPOINT PROGRESS API
    // ==========================================

    // GET /api/checkpoint-progress -> list progress
    if (request.method === "GET" && path === "/api/checkpoint-progress") {
      const studentId = url.searchParams.get("studentId");
      let rows: any[] = [];

      try {
        let query = supabase.from("checkpoint_progress").select("*");
        if (studentId) query = query.eq("student_id", studentId);
        const { data: sProgress } = await query;

        if (sProgress && sProgress.length > 0) {
          rows = sProgress.map((cp: any) => ({
            id: cp.id,
            studentId: cp.student_id || cp.studentId,
            checkpointId: cp.checkpoint_id || cp.checkpointId,
            isCorrect: cp.is_correct ?? cp.isCorrect,
            answeredAt: cp.answered_at ? new Date(cp.answered_at).toISOString() : new Date().toISOString(),
          }));
          serverStore.setCheckpointProgress(rows);
        }
      } catch (sErr) {}

      if (rows.length === 0) {
        rows = serverStore.getCheckpointProgress();
        if (studentId) rows = rows.filter((c) => c.studentId === studentId);
      }

      return new Response(JSON.stringify({ checkpointProgress: rows }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/checkpoint-progress -> record progress
    if (request.method === "POST" && path === "/api/checkpoint-progress") {
      const body = await request.json();
      const id = body.id || makeId();
      const { studentId, checkpointId, isCorrect } = body;
      const answeredAtIso = new Date().toISOString();

      const newCPObj = {
        id,
        studentId,
        checkpointId,
        isCorrect: !!isCorrect,
        answeredAt: answeredAtIso,
      };

      try {
        await supabase.from("checkpoint_progress").upsert({
          id,
          student_id: studentId,
          checkpoint_id: checkpointId,
          is_correct: !!isCorrect,
          answered_at: answeredAtIso,
        });
      } catch (sErr) {}

      if (db) {
        try {
          const existing = await db.query.checkpointProgress.findFirst({
            where: and(
              eq(checkpointProgress.studentId, studentId),
              eq(checkpointProgress.checkpointId, checkpointId)
            )
          });
          if (existing) {
            await db.update(checkpointProgress).set({
              isCorrect: !!isCorrect,
              answeredAt: new Date(),
            }).where(eq(checkpointProgress.id, existing.id));
          } else {
            await db.insert(checkpointProgress).values({
              id,
              studentId,
              checkpointId,
              isCorrect: !!isCorrect,
            });
          }
        } catch (dbErr) {}
      }

      serverStore.saveCheckpointProgress(newCPObj);

      return new Response(JSON.stringify({ checkpointProgress: newCPObj }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // RESET SUBMISSIONS API
    // ==========================================

    // POST /api/reset-submissions -> delete all submissions for a student+assessment
    if (request.method === "POST" && path === "/api/reset-submissions") {
      const body = await request.json();
      const { studentId, assessmentId } = body;
      if (!studentId || !assessmentId) {
        return new Response(JSON.stringify({ error: "studentId and assessmentId are required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      try {
        const { data: studentSubs } = await supabase
          .from("submissions")
          .select("id")
          .eq("student_id", studentId)
          .eq("assessment_id", assessmentId);

        if (studentSubs && studentSubs.length > 0) {
          for (const sub of studentSubs) {
            await supabase.from("submission_responses").delete().eq("submission_id", sub.id);
          }
        }
        await supabase.from("submissions").delete().eq("student_id", studentId).eq("assessment_id", assessmentId);
      } catch (sErr) {}

      if (db) {
        try {
          const studentSubs = await db
            .select({ id: submissions.id })
            .from(submissions)
            .where(and(eq(submissions.studentId, studentId), eq(submissions.assessmentId, assessmentId)));

          for (const sub of studentSubs) {
            await db.delete(submissionResponses).where(eq(submissionResponses.submissionId, sub.id));
          }
          await db
            .delete(submissions)
            .where(and(eq(submissions.studentId, studentId), eq(submissions.assessmentId, assessmentId)));
        } catch (dbErr) {}
      }

      // Also reset any extra attempts granted for this student+assessment (always)
      serverStore.resetExtraAttempts(studentId, assessmentId);
      // Also remove from submissions cache in serverStore
      const cached = serverStore.getSubmissions();
      serverStore.setSubmissions(cached.filter(
        (s: any) => !(s.studentId === studentId && s.assessmentId === assessmentId)
      ));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // EXTRA ATTEMPTS API
    // ==========================================

    // GET /api/extra-attempts -> return the full extra attempts map
    if (request.method === "GET" && path === "/api/extra-attempts") {
      const extraAttempts = serverStore.getExtraAttempts();
      return new Response(JSON.stringify({ extraAttempts }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/extra-attempts -> grant extra attempt(s) for a student+assessment
    if (request.method === "POST" && path === "/api/extra-attempts") {
      const body = await request.json();
      const { studentId, assessmentId, count = 1 } = body;
      if (!studentId || !assessmentId) {
        return new Response(JSON.stringify({ error: "studentId and assessmentId are required" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      const total = serverStore.addExtraAttempt(studentId, assessmentId, Number(count));
      return new Response(JSON.stringify({ ok: true, total }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Content route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: (err as any)?.message, stack: (err as any)?.stack }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
