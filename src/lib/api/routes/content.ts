import { getDb } from "../../db/client";
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
    await db.insert(notifications).values({
      id,
      userId,
      title,
      message,
      read: false,
      link: link || null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("⚠️ insertNotification DB warning:", err);
  }
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
    await db.insert(messages).values({
      id,
      fromId,
      toId,
      subject,
      body,
      read: false,
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn("⚠️ insertMessage DB warning:", err);
  }
}

async function generateUniqueRoleId(role: "admin" | "teacher" | "student"): Promise<string> {
  let prefix = "STU";
  if (role === "teacher") prefix = "TCH";
  else if (role === "admin") prefix = "ADM";
  // Use UUID suffix — no sequential scan, no race condition
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
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
  "/api/test-emails",
]);

function requireAuth(request: Request): Response | null {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname)) return null;

  // Allow anonymous access only for fetching the course catalog list (GET /api/courses)
  if (request.method === "GET" && url.pathname === "/api/courses") {
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

    // ── Security: authenticate every request before touching the DB ───────────
    const authError = requireAuth(request);
    if (authError) return authError;

    const db = getDb();

    // ==========================================
    // USERS API
    // ==========================================

    // GET /api/users -> list users
    if (request.method === "GET" && path === "/api/users") {
      let mapped: any[] = [];
      try {
        const allUsers = await db.select().from(users);
        const allEnrollments = await db.select().from(enrollments);

        // Pre-build O(1) Map index for enrollments
        const enrollmentsMap = new Map<string, string[]>();
        for (const e of allEnrollments) {
          const list = enrollmentsMap.get(e.studentId) || [];
          list.push(e.courseId);
          enrollmentsMap.set(e.studentId, list);
        }

        mapped = allUsers.map((u) => {
          const item = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            joinedAt: u.joinedAt ? u.joinedAt.toISOString().slice(0, 10) : "",
            lastActive: u.lastActive ? u.lastActive.toISOString() : null,
            avatar: u.avatar,
            phone: u.phone,
            group: u.group || undefined,
            isEmailVerified: u.isEmailVerified,
            courseIds: enrollmentsMap.get(u.id) || [],
          };
          serverStore.saveUser(item as any);
          return item;
        });
      } catch (dbErr) {
        console.warn("⚠️ Database query timed out in GET /api/users (using serverStore fallback)");
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
        } else {
          // Update isEmailVerified flag if store has updated status
          const existing = mapped.find((m) => m.id === su.id || m.email.toLowerCase() === su.email.toLowerCase());
          if (existing && su.isEmailVerified !== undefined) {
            existing.isEmailVerified = su.isEmailVerified;
          }
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

      let created: any = null;
      try {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, emailLower),
        });
        if (existingUser) {
          return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        await db.insert(users).values({
          id,
          name: body.name || "Untitled",
          email: emailLower,
          passwordHash,
          role,
          group: body.group || null,
          status: body.status || "active",
          joinedAt: body.joinedAt ? new Date(body.joinedAt) : now,
          lastActive: null,
          isEmailVerified: true,
          emailVerificationCode: null,
          phone: body.phone || null,
        });
        created = await db.query.users.findFirst({ where: eq(users.id, id) });
      } catch (dbErr) {
        console.warn("⚠️ Database insert user timed out (using serverStore fallback)");
      }

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
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) {
        const emailLower = body.email.toLowerCase().trim();
        try {
          const existingWithEmail = await db.query.users.findFirst({
            where: eq(users.email, emailLower),
          });
          if (existingWithEmail && existingWithEmail.id !== id) {
            return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
              status: 400,
              headers: { "content-type": "application/json" },
            });
          }
        } catch (dbErr) {
          console.warn("⚠️ Email uniqueness check timed out for PUT /api/users/:id");
        }
        updateData.email = emailLower;
      }
      if (body.role !== undefined) updateData.role = body.role;
      if (body.group !== undefined) updateData.group = body.group;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.avatar !== undefined) updateData.avatar = body.avatar;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.isEmailVerified !== undefined) updateData.isEmailVerified = body.isEmailVerified;
      if (body.password !== undefined && body.password !== "") {
        updateData.passwordHash = await hashPassword(body.password);
      }

      let updated: any = null;
      try {
        await db.update(users).set(updateData).where(eq(users.id, id));
        updated = await db.query.users.findFirst({ where: eq(users.id, id) });
      } catch (dbErr) {
        console.warn("⚠️ Database update timed out in PUT /api/users/:id (using serverStore fallback)");
      }

      // Always sync serverStore for subsequent fallbacks
      const storeUpdate = {
        ...updateData,
        role: updateData.role as any,
        status: updateData.status as any,
      };
      delete storeUpdate.passwordHash; // Don't expose hash
      const storedUser = serverStore.updateUser(id, storeUpdate) || serverStore.getUserById(id);

      return new Response(JSON.stringify({ user: updated || storedUser }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/users/:id -> delete user
    if (request.method === "DELETE" && path.startsWith("/api/users/")) {
      const id = path.slice("/api/users/".length);

      try {
        // Check if teacher is assigned to courses
        const isTeacherOfCourses = await db.query.courses.findFirst({
          where: eq(courses.teacherId, id),
        });
        if (isTeacherOfCourses) {
          return new Response(
            JSON.stringify({
              error: `This instructor is assigned to teach course "${isTeacherOfCourses.name}". Please reassign or delete that course first.`,
            }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        // Cleanup student-related records
        await db.delete(progress).where(eq(progress.studentId, id));
        await db.delete(certificates).where(eq(certificates.studentId, id));
        await db.delete(enrollments).where(eq(enrollments.studentId, id));
        await db.delete(notifications).where(eq(notifications.userId, id));
        await db.delete(messages).where(or(eq(messages.fromId, id), eq(messages.toId, id)));

        // Cleanup submissions and submission responses
        const studentSubmissions = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.studentId, id));
        const subIds = studentSubmissions.map((s) => s.id);
        if (subIds.length > 0) {
          for (const subId of subIds) {
            await db.delete(submissionResponses).where(eq(submissionResponses.submissionId, subId));
          }
          await db.delete(submissions).where(eq(submissions.studentId, id));
        }

        await db.delete(users).where(eq(users.id, id));
      } catch (dbErr) {
        console.warn("⚠️ Database delete timed out in DELETE /api/users/:id (using serverStore fallback)");
      }

      // Always clean up serverStore regardless of DB outcome
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
        allCourses = await db.select().from(courses);
        allSections = await db.select().from(sections);
        allItems = await db.select().from(contentItems);
        allEnrollments = await db.select().from(enrollments);
      } catch (dbError: any) {
        console.warn("⚠️ Database query timed out in GET /api/courses (using serverStore fallback)");
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
              endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : undefined,
            };
          }
        }

        const courseSections = sectionsByCourse.get(c.id) || [];

        return {
          ...c,
          startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : "",
          endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : "",
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

      return new Response(
        JSON.stringify({
          course: {
            ...created,
            startDate: created?.startDate ? created.startDate.toISOString().slice(0, 10) : "",
            endDate: created?.endDate ? created.endDate.toISOString().slice(0, 10) : "",
            studentIds: createdEnrollments.map((e) => e.studentId),
            studentAccess,
            sections: [],
          },
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
        const existingStudentIds = existingEnrollments.map((e) => e.studentId);

        // Delete enrollments no longer in list
        const toDelete = existingStudentIds.filter((sid) => !studentIds.includes(sid));
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

      return new Response(
        JSON.stringify({
          course: {
            ...updated,
            startDate: updated?.startDate ? updated.startDate.toISOString().slice(0, 10) : "",
            endDate: updated?.endDate ? updated.endDate.toISOString().slice(0, 10) : "",
            studentIds: updatedEnrollments.map((e) => e.studentId),
            studentAccess,
            sections: allSections
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((s) => ({
                ...s,
                items: allItems
                  .filter((it) => it.sectionId === s.id)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
              })),
          },
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
      await db.insert(sections).values({
        id,
        courseId: body.courseId,
        title: body.title || "Untitled",
        order: body.order ?? 0,
      });
      const created = await db.query.sections.findFirst({ where: eq(sections.id, id) });
      return new Response(JSON.stringify({ section: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/sections/:id -> update section
    if (request.method === "PUT" && path.startsWith("/api/sections/")) {
      const id = path.slice("/api/sections/".length);
      const body = await request.json();
      await db.update(sections).set({ title: body.title, order: body.order }).where(eq(sections.id, id));
      const updated = await db.query.sections.findFirst({ where: eq(sections.id, id) });
      return new Response(JSON.stringify({ section: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/sections/:id -> delete section
    if (request.method === "DELETE" && path.startsWith("/api/sections/")) {
      const id = path.slice("/api/sections/".length);
      await db.delete(sections).where(eq(sections.id, id));
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
      await db.insert(contentItems).values({
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
      });
      const created = await db.query.contentItems.findFirst({ where: eq(contentItems.id, id) });
      return new Response(JSON.stringify({ item: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/content-items/:id -> update item
    if (request.method === "PUT" && path.startsWith("/api/content-items/")) {
      const id = path.slice("/api/content-items/".length);
      const body = await request.json();
      await db
        .update(contentItems)
        .set({
          title: body.title,
          body: body.body,
          url: body.url,
          fileName: body.fileName,
          duration: body.duration ?? null,
          fileSize: body.fileSize,
          assessmentId: body.assessmentId ?? null,
          order: body.order ?? 0,
        })
        .where(eq(contentItems.id, id));
      const updated = await db.query.contentItems.findFirst({ where: eq(contentItems.id, id) });
      return new Response(JSON.stringify({ item: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/content-items/:id -> delete item
    if (request.method === "DELETE" && path.startsWith("/api/content-items/")) {
      const id = path.slice("/api/content-items/".length);
      await db.delete(contentItems).where(eq(contentItems.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // CERTIFICATES API
    // ==========================================

    // GET /api/certificates
    if (request.method === "GET" && path === "/api/certificates") {
      const status = url.searchParams.get("status");
      const rows = status
        ? await db.query.certificates.findMany({ where: eq(certificates.status, status) })
        : await db.select().from(certificates);

      const mapped = rows.map((c) => ({
        ...c,
        requestedAt: c.requestedAt.toISOString().slice(0, 10),
        issuedAt: c.issuedAt ? c.issuedAt.toISOString().slice(0, 10) : undefined,
        proctorLog: (c.proctorLog as any[]) ?? undefined,
      }));

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
      await db.insert(certificates).values({
        id,
        studentId: body.studentId,
        courseId: body.courseId,
        score: body.score,
        status: body.status || "pending",
        requestedAt,
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
        teacherNote: body.teacherNote || null,
        rejectionReason: body.rejectionReason || null,
        proctorLog: body.proctorLog || null,
      });
      const created = await db.query.certificates.findFirst({ where: eq(certificates.id, id) });

      try {
        if (created) {
          const student = await db.query.users.findFirst({ where: eq(users.id, created.studentId) });
          const course = await db.query.courses.findFirst({ where: eq(courses.id, created.courseId) });
          if (student && course) {
            const teacher = course.teacherId ? await db.query.users.findFirst({ where: eq(users.id, course.teacherId) }) : null;
            if (teacher) {
              sendCertificateRequestedEmail(teacher.email, teacher.name, student.name, course.name).catch(console.error);
              await insertNotification(db, teacher.id, "Certificate Request", `${student.name} requested a certificate for "${course.name}".`, `/teacher/certificates`);
              await insertMessage(db, student.id, teacher.id, "Certificate Request: " + course.name, `Hello Instructor ${teacher.name},\n\nI have completed all assessments for "${course.name}" and requested my certificate of completion.`);
            }
            const adminUsers = await db.select().from(users).where(eq(users.role, "admin"));
            for (const admin of adminUsers) {
              sendCertificateRequestedEmail(admin.email, admin.name, student.name, course.name).catch(console.error);
              await insertNotification(db, admin.id, "Certificate Request", `${student.name} requested a certificate for "${course.name}".`, `/admin/certificates`);
              await insertMessage(db, student.id, admin.id, "Certificate Request: " + course.name, `Hello Admin ${admin.name},\n\nI have completed all assessments for "${course.name}" and requested my certificate of completion.`);
            }
          }
        }
      } catch (err) {
        console.error("Error sending certificate request notifications:", err);
      }

      return new Response(
        JSON.stringify({
          certificate: created
            ? {
                ...created,
                requestedAt: created.requestedAt.toISOString().slice(0, 10),
                issuedAt: created.issuedAt ? created.issuedAt.toISOString().slice(0, 10) : undefined,
                proctorLog: (created.proctorLog as any[]) ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id/approve
    if (request.method === "PUT" && path.startsWith("/api/certificates/") && path.endsWith("/approve")) {
      const id = path.slice("/api/certificates/".length, -"/approve".length);
      await db.update(certificates).set({ status: "approved", issuedAt: new Date() }).where(eq(certificates.id, id));
      const updated = await db.query.certificates.findFirst({ where: eq(certificates.id, id) });

      try {
        if (updated) {
          const student = await db.query.users.findFirst({ where: eq(users.id, updated.studentId) });
          const course = await db.query.courses.findFirst({ where: eq(courses.id, updated.courseId) });
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
        JSON.stringify({
          certificate: updated
            ? {
                ...updated,
                requestedAt: updated.requestedAt.toISOString().slice(0, 10),
                issuedAt: updated.issuedAt ? updated.issuedAt.toISOString().slice(0, 10) : undefined,
                proctorLog: (updated.proctorLog as any[]) ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/certificates/:id/reject
    if (request.method === "PUT" && path.startsWith("/api/certificates/") && path.endsWith("/reject")) {
      const id = path.slice("/api/certificates/".length, -"/reject".length);
      const body = await request.json();
      await db
        .update(certificates)
        .set({ status: "rejected", rejectionReason: body.reason || null })
        .where(eq(certificates.id, id));
      const updated = await db.query.certificates.findFirst({ where: eq(certificates.id, id) });

      try {
        if (updated) {
          const student = await db.query.users.findFirst({ where: eq(users.id, updated.studentId) });
          const course = await db.query.courses.findFirst({ where: eq(courses.id, updated.courseId) });
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
        JSON.stringify({
          certificate: updated
            ? {
                ...updated,
                requestedAt: updated.requestedAt.toISOString().slice(0, 10),
                issuedAt: updated.issuedAt ? updated.issuedAt.toISOString().slice(0, 10) : undefined,
                proctorLog: (updated.proctorLog as any[]) ?? undefined,
              }
            : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // ==========================================
    // ASSESSMENTS API
    // ==========================================

    // GET /api/assessments -> list all assessments and nested questions
    if (request.method === "GET" && path === "/api/assessments") {
      let mapped: any[] = [];
      try {
        const allAssessments = await db.select().from(assessments);
        const allQuestions = await db.select().from(questions);

        // Pre-build O(1) Map index for questions
        const questionsMap = new Map<string, any[]>();
        for (const q of allQuestions) {
          const list = questionsMap.get(q.assessmentId) || [];
          list.push(q);
          questionsMap.set(q.assessmentId, list);
        }

        mapped = allAssessments.map((a) => ({
          ...a,
          questions: (questionsMap.get(a.id) || [])
            .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
            .map((q) => ({
              id: q.id,
              type: q.type,
              prompt: q.prompt,
              options: (q.options as string[]) ?? [],
              correctIndex: q.correctIndex ?? 0,
              points: q.points,
              imageUrl: q.imageUrl ?? undefined,
            })),
        }));
        // Cache in serverStore for fallback
        serverStore.setAssessments(mapped);
      } catch (dbErr) {
        console.warn("⚠️ Database query timed out in GET /api/assessments (using serverStore fallback)");
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

      const created = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
      return new Response(JSON.stringify({ assessment: { ...created, questions: [], questionCount: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/assessments/:id -> update assessment
    if (request.method === "PUT" && path.startsWith("/api/assessments/")) {
      const id = path.slice("/api/assessments/".length);
      const body = await request.json();

      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.timeLimit !== undefined) updateData.timeLimit = body.timeLimit;
      if (body.passingScore !== undefined) updateData.passingScore = body.passingScore;
      if (body.attempts !== undefined) updateData.attempts = body.attempts;
      if (body.proctored !== undefined) updateData.proctored = body.proctored;
      if (body.isFinal !== undefined) updateData.isFinal = body.isFinal;
      if (body.questionCount !== undefined) updateData.questionCount = body.questionCount;

      await db.update(assessments).set(updateData).where(eq(assessments.id, id));
      const updated = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
      return new Response(JSON.stringify({ assessment: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/assessments/:id -> delete assessment
    if (request.method === "DELETE" && path.startsWith("/api/assessments/")) {
      const id = path.slice("/api/assessments/".length);
      await db.delete(assessments).where(eq(assessments.id, id));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // QUESTIONS API
    // ==========================================

    // POST /api/questions -> create question
    if (request.method === "POST" && path === "/api/questions") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(questions).values({
        id,
        assessmentId: body.assessmentId,
        type: body.type,
        prompt: body.prompt || "",
        options: body.options ?? null,
        correctIndex: body.correctIndex ?? null,
        points: body.points ?? 1,
        imageUrl: body.imageUrl ?? null,
        order: body.order ?? 0,
      });

      // Update question count on assessment
      const assId = body.assessmentId;
      const countResult = await db.select().from(questions).where(eq(questions.assessmentId, assId));
      await db
        .update(assessments)
        .set({ questionCount: countResult.length })
        .where(eq(assessments.id, assId));

      const created = await db.query.questions.findFirst({ where: eq(questions.id, id) });
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

      const existingQs = await db.select().from(questions).where(eq(questions.assessmentId, assessmentId));
      let currentOrder = existingQs.length;
      const createdQs = [];

      for (const q of qs) {
        const id = q.id || makeId();
        await db.insert(questions).values({
          id,
          assessmentId,
          type: q.type,
          prompt: q.prompt || "",
          options: q.options ?? null,
          correctIndex: q.correctIndex ?? null,
          points: q.points ?? 1,
          imageUrl: q.imageUrl ?? null,
          order: currentOrder++,
        });
        const created = await db.query.questions.findFirst({ where: eq(questions.id, id) });
        if (created) createdQs.push(created);
      }

      // Update question count on assessment
      await db
        .update(assessments)
        .set({ questionCount: currentOrder })
        .where(eq(assessments.id, assessmentId));

      return new Response(JSON.stringify({ ok: true, questions: createdQs }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // PUT /api/questions/:id -> update question
    if (request.method === "PUT" && path.startsWith("/api/questions/")) {
      const id = path.slice("/api/questions/".length);
      const body = await request.json();

      const updateData: any = {};
      if (body.type !== undefined) updateData.type = body.type;
      if (body.prompt !== undefined) updateData.prompt = body.prompt;
      if (body.options !== undefined) updateData.options = body.options;
      if (body.correctIndex !== undefined) updateData.correctIndex = body.correctIndex;
      if (body.points !== undefined) updateData.points = body.points;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.order !== undefined) updateData.order = body.order;

      await db.update(questions).set(updateData).where(eq(questions.id, id));
      const updated = await db.query.questions.findFirst({ where: eq(questions.id, id) });
      return new Response(JSON.stringify({ question: updated }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/questions/:id -> delete question
    if (request.method === "DELETE" && path.startsWith("/api/questions/")) {
      const id = path.slice("/api/questions/".length);
      const qRow = await db.query.questions.findFirst({ where: eq(questions.id, id) });

      await db.delete(questions).where(eq(questions.id, id));

      if (qRow) {
        const countResult = await db
          .select()
          .from(questions)
          .where(eq(questions.assessmentId, qRow.assessmentId));
        await db
          .update(assessments)
          .set({ questionCount: countResult.length })
          .where(eq(assessments.id, qRow.assessmentId));
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // ==========================================
    // SUBMISSIONS API
    // ==========================================

    // GET /api/submissions -> list submissions and their question responses
    if (request.method === "GET" && path === "/api/submissions") {
      let mapped: any[] = [];
      try {
        const allSubmissions = await db.select().from(submissions);
        const allResponses = await db.select().from(submissionResponses);

        // Pre-build O(1) Map index for responses
        const responsesMap = new Map<string, any[]>();
        for (const r of allResponses) {
          const list = responsesMap.get(r.submissionId) || [];
          list.push(r);
          responsesMap.set(r.submissionId, list);
        }

        mapped = allSubmissions.map((s) => ({
          id: s.id,
          assessmentId: s.assessmentId,
          studentId: s.studentId,
          submittedAt: s.submittedAt.toISOString().slice(0, 10),
          status: s.status as "submitted" | "graded",
          feedback: s.feedback ?? undefined,
          proctorEvents: (s.proctorEvents as any[]) ?? undefined,
          responses: (responsesMap.get(s.id) || [])
            .map((r) => ({
              questionId: r.questionId,
              response: r.response,
              awarded: r.awarded,
            })),
        }));
        // Cache in serverStore for fallback
        serverStore.setSubmissions(mapped);
      } catch (dbErr) {
        console.warn("⚠️ Database query timed out in GET /api/submissions (using serverStore fallback)");
        mapped = serverStore.getSubmissions();
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

      await db.insert(submissions).values({
        id,
        assessmentId: body.assessmentId,
        studentId: body.studentId,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
        status: body.status || "submitted",
        feedback: body.feedback || null,
        proctorEvents: body.proctorEvents || null,
      });

      if (body.responses && Array.isArray(body.responses)) {
        for (const resp of body.responses) {
          await db.insert(submissionResponses).values({
            id: makeId(),
            submissionId: id,
            questionId: resp.questionId,
            response: resp.response,
            awarded: resp.awarded,
          });
        }
      }

      const created = await db.query.submissions.findFirst({ where: eq(submissions.id, id) });

      try {
        const student = await db.query.users.findFirst({ where: eq(users.id, body.studentId) });
        const assessment = await db.query.assessments.findFirst({ where: eq(assessments.id, body.assessmentId) });
        const course = assessment ? await db.query.courses.findFirst({ where: eq(courses.id, assessment.courseId) }) : null;
        const teacher = course && course.teacherId ? await db.query.users.findFirst({ where: eq(users.id, course.teacherId) }) : null;

        if (teacher && student && assessment && course) {
          sendNewSubmissionEmail(teacher.email, teacher.name, student.name, assessment.title, course.name).catch(console.error);
          await insertNotification(db, teacher.id, "New Quiz Submission", `${student.name} submitted "${assessment.title}".`, `/teacher/assessments`);
          await insertMessage(db, student.id, teacher.id, "Quiz Submission: " + assessment.title, `Hello Instructor ${teacher.name},\n\nI have submitted my quiz for "${assessment.title}" in course "${course.name}".`);
        }

        if (body.status === "graded" && student && assessment && course) {
          const qsList = await db.select().from(questions).where(eq(questions.assessmentId, assessment.id));
          const maxScore = qsList.reduce((sum, q) => sum + q.points, 0);
          const earned = (body.responses || []).reduce((sum: number, r: any) => sum + (r.awarded || 0), 0);
          sendSubmissionGradedEmail(student.email, student.name, assessment.title, earned, maxScore).catch(console.error);
          await insertNotification(db, student.id, "Quiz Auto-graded", `${assessment.title}: ${Math.round((earned / (maxScore || 1)) * 100)}% (${earned}/${maxScore}).`, `/student/courses/${course.id}`);
          const senderId = course.teacherId || "ADM01";
          await insertMessage(db, senderId, student.id, "Quiz Graded: " + assessment.title, `Hello ${student.name},\n\nYour quiz "${assessment.title}" has been automatically graded.\n\nScore: ${earned} / ${maxScore} points.`);
        }
      } catch (err) {
        console.error("Error sending submission notifications:", err);
      }

      const createdResponses = await db
        .select()
        .from(submissionResponses)
        .where(eq(submissionResponses.submissionId, id));

      return new Response(
        JSON.stringify({
          submission: {
            ...created,
            submittedAt: created?.submittedAt.toISOString().slice(0, 10),
            responses: createdResponses.map((r) => ({
              questionId: r.questionId,
              response: r.response,
              awarded: r.awarded,
            })),
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // PUT /api/submissions/:id/grade -> grade a submission (update awarded points per response)
    if (request.method === "PUT" && path.startsWith("/api/submissions/") && path.endsWith("/grade")) {
      const id = path.slice("/api/submissions/".length, -"/grade".length);
      const body = await request.json(); // { awards: Record<string, number>, feedback?: string }

      await db
        .update(submissions)
        .set({
          status: "graded",
          feedback: body.feedback || null,
        })
        .where(eq(submissions.id, id));

      if (body.awards) {
        for (const qId of Object.keys(body.awards)) {
          const points = body.awards[qId];
          await db
            .update(submissionResponses)
            .set({ awarded: points })
            .where(
              and(
                eq(submissionResponses.submissionId, id),
                eq(submissionResponses.questionId, qId)
              )
            );
        }
      }

      const updated = await db.query.submissions.findFirst({ where: eq(submissions.id, id) });
      const updatedResponses = await db
        .select()
        .from(submissionResponses)
        .where(eq(submissionResponses.submissionId, id));

      try {
        if (updated) {
          const student = await db.query.users.findFirst({ where: eq(users.id, updated.studentId) });
          const assessment = await db.query.assessments.findFirst({ where: eq(assessments.id, updated.assessmentId) });
          if (student && assessment) {
            const qsList = await db.select().from(questions).where(eq(questions.assessmentId, assessment.id));
            const maxScore = qsList.reduce((sum, q) => sum + q.points, 0);
            const earned = updatedResponses.reduce((sum, r) => sum + (r.awarded || 0), 0);
            sendSubmissionGradedEmail(student.email, student.name, assessment.title, earned, maxScore).catch(console.error);
            await insertNotification(db, student.id, "Quiz Graded", `Your quiz "${assessment.title}" has been graded: ${earned}/${maxScore} (${Math.round((earned / (maxScore || 1)) * 100)}%).`, `/student/courses/${assessment.courseId}`);
            const courseObj = await db.query.courses.findFirst({ where: eq(courses.id, assessment.courseId) });
            const senderId = courseObj?.teacherId || "ADM01";
            await insertMessage(db, senderId, student.id, "Quiz Graded: " + assessment.title, `Hello ${student.name},\n\nYour quiz "${assessment.title}" has been graded by the instructor.\n\nScore: ${earned} / ${maxScore} points.\nFeedback: ${updated.feedback || "None"}`);
          }
        }
      } catch (err) {
        console.error("Error sending graded notifications:", err);
      }

      return new Response(
        JSON.stringify({
          submission: {
            ...updated,
            submittedAt: updated?.submittedAt.toISOString().slice(0, 10),
            responses: updatedResponses.map((r) => ({
              questionId: r.questionId,
              response: r.response,
              awarded: r.awarded,
            })),
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // ==========================================
    // PROGRESS API
    // ==========================================

    // GET /api/progress -> list all progress entries
    if (request.method === "GET" && path === "/api/progress") {
      let progressRecord: Record<string, string[]> = {};
      try {
        const allProgress = await db.select().from(progress);
        for (const p of allProgress) {
          const key = `${p.studentId}:${p.courseId}`;
          if (!progressRecord[key]) progressRecord[key] = [];
          if (!progressRecord[key].includes(p.contentItemId)) {
            progressRecord[key].push(p.contentItemId);
          }
        }
      } catch (dbErr) {
        console.warn("⚠️ Database query timed out in GET /api/progress (using serverStore fallback)");
        // progressRecord remains {} — client will use its own in-memory state
      }

      return new Response(JSON.stringify({ progress: progressRecord }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/progress -> mark progress complete
    if (request.method === "POST" && path === "/api/progress") {
      const body = await request.json(); // { studentId, courseId, contentItemId }
      const id = makeId();

      // Check if it already exists
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
        const allNotifs = await db.select().from(notifications);
        mapped = allNotifs.map((n) => {
          const item = {
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            read: n.read,
            link: n.link ?? undefined,
            createdAt: n.createdAt.toISOString(),
          };
          serverStore.addNotification(item);
          return item;
        });
      } catch (dbErr) {
        console.warn("⚠️ Database query timed out in GET /api/notifications (using serverStore fallback)");
        // Merge serverStore fallback
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
      await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));

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
        const allMsgs = await db.select().from(messages);
        mapped = allMsgs.map((m) => {
          const item = {
            id: m.id,
            fromId: m.fromId,
            toId: m.toId,
            subject: m.subject,
            body: m.body,
            read: m.read,
            createdAt: m.createdAt.toISOString(),
          };
          serverStore.addMessage(item);
          return item;
        });
      } catch (dbErr) {
        console.warn("⚠️ Database query timed out in GET /api/messages (using serverStore fallback)");
      }

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
        await db.insert(messages).values({
          id,
          fromId: body.fromId,
          toId: body.toId,
          subject: body.subject || "",
          body: body.body || "",
          read: body.read ?? false,
          createdAt: new Date(createdAtStr),
        });

        const recipient = (await db.query.users.findFirst({ where: eq(users.id, body.toId) })) || serverStore.getUserById(body.toId);
        const sender = (await db.query.users.findFirst({ where: eq(users.id, body.fromId) })) || serverStore.getUserById(body.fromId);
        if (recipient) {
          if (body.subject === "We miss you! 👋") {
            sendNudgeEmail(recipient.email, recipient.name, body.subject, body.body).catch(console.error);
          } else {
            const senderName = sender ? sender.name : "System / Administrator";
            sendMessageNotificationEmail(recipient.email, recipient.name, senderName, body.subject || "New Message", body.body || "").catch(console.error);
          }
        }
      } catch (dbErr) {
        console.warn("⚠️ Database insert message timed out (using serverStore fallback)");
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
      await db.update(messages).set({ read: true }).where(eq(messages.id, id));

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
      const allEvents = await db.select().from(events);
      const mapped = allEvents.map((e) => ({
        id: e.id,
        courseId: e.courseId || null,
        title: e.title,
        description: e.description || null,
        eventDate: e.eventDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
      }));
      return new Response(JSON.stringify({ events: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/events -> create event
    if (request.method === "POST" && path === "/api/events") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(events).values({
        id,
        courseId: body.courseId || null,
        title: body.title || "",
        description: body.description || null,
        eventDate: body.eventDate ? new Date(body.eventDate) : new Date(),
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });
      const created = await db.query.events.findFirst({ where: eq(events.id, id) });
      if (created) {
        if (created.courseId) {
          const course = await db.query.courses.findFirst({ where: eq(courses.id, created.courseId) });
          if (course) {
            const studentEnrollments = await db.select().from(enrollments).where(eq(enrollments.courseId, course.id));
            const dateStr = created.eventDate.toLocaleString();
            for (const e of studentEnrollments) {
              const student = await db.query.users.findFirst({ where: eq(users.id, e.studentId) });
              if (student) {
                sendCalendarEventEmail(
                  student.email,
                  student.name,
                  course.name,
                  created.title,
                  created.description || "No description provided.",
                  dateStr
                ).catch(console.error);
              }
            }
          }
        } else {
          const allStudents = await db.select().from(users).where(eq(users.role, "student"));
          const dateStr = created.eventDate.toLocaleString();
          for (const student of allStudents) {
            sendCalendarEventEmail(
              student.email,
              student.name,
              "General Academy Event",
              created.title,
              created.description || "No description provided.",
              dateStr
            ).catch(console.error);
          }
        }
      }
      return new Response(
        JSON.stringify({
          event: created ? { ...created, eventDate: created.eventDate.toISOString(), createdAt: created.createdAt.toISOString() } : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/events/:id -> delete event
    if (request.method === "DELETE" && path.startsWith("/api/events/")) {
      const id = path.slice("/api/events/".length);
      await db.delete(events).where(eq(events.id, id));
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
      const allAnnouncements = await db.select().from(announcements);
      const mapped = allAnnouncements.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        title: a.title,
        body: a.body,
        isPinned: a.isPinned,
        createdAt: a.createdAt.toISOString(),
      }));
      return new Response(JSON.stringify({ announcements: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/announcements -> create announcement
    if (request.method === "POST" && path === "/api/announcements") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(announcements).values({
        id,
        courseId: body.courseId,
        title: body.title || "",
        body: body.body || "",
        isPinned: body.isPinned ?? false,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });

      // Send email notifications to all students enrolled in this course
      try {
        const courseRow = await db.query.courses.findFirst({ where: eq(courses.id, body.courseId) });
        if (courseRow) {
          const courseName = courseRow.name;
          const courseEnrolls = await db.select().from(enrollments).where(eq(enrollments.courseId, body.courseId));
          for (const enroll of courseEnrolls) {
            const student = await db.query.users.findFirst({ where: eq(users.id, enroll.studentId) });
            if (student) {
              // Trigger in-app notification
              await insertNotification(db, student.id, `Announcement: ${body.title}`, `New announcement in ${courseName}.`, `/student/courses/${body.courseId}`);
              // Trigger email
              sendAnnouncementEmail(student.email, student.name, courseName, body.title, body.body).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Announcement notification error:", err);
      }

      const created = await db.query.announcements.findFirst({ where: eq(announcements.id, id) });
      return new Response(
        JSON.stringify({
          announcement: created ? { ...created, createdAt: created.createdAt.toISOString() } : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/announcements/:id -> delete announcement
    if (request.method === "DELETE" && path.startsWith("/api/announcements/")) {
      const id = path.slice("/api/announcements/".length);
      await db.delete(announcements).where(eq(announcements.id, id));
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
      const allDiscussions = await db.select().from(discussions);
      const mapped = allDiscussions.map((d) => ({
        id: d.id,
        courseId: d.courseId,
        userId: d.userId,
        title: d.title,
        body: d.body,
        createdAt: d.createdAt.toISOString(),
      }));
      return new Response(JSON.stringify({ discussions: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/discussions -> create discussion
    if (request.method === "POST" && path === "/api/discussions") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(discussions).values({
        id,
        courseId: body.courseId,
        userId: body.userId,
        title: body.title || "",
        body: body.body || "",
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });
      const created = await db.query.discussions.findFirst({ where: eq(discussions.id, id) });
      return new Response(
        JSON.stringify({
          discussion: created ? { ...created, createdAt: created.createdAt.toISOString() } : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/discussions/:id -> delete discussion
    if (request.method === "DELETE" && path.startsWith("/api/discussions/")) {
      const id = path.slice("/api/discussions/".length);
      await db.delete(discussions).where(eq(discussions.id, id));
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
      const allReplies = await db.select().from(discussionReplies);
      const mapped = allReplies.map((r) => ({
        id: r.id,
        discussionId: r.discussionId,
        userId: r.userId,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      }));
      return new Response(JSON.stringify({ discussionReplies: mapped }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // POST /api/discussion-replies -> create reply
    if (request.method === "POST" && path === "/api/discussion-replies") {
      const body = await request.json();
      const id = body.id || makeId();
      await db.insert(discussionReplies).values({
        id,
        discussionId: body.discussionId,
        userId: body.userId,
        body: body.body || "",
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      });

      // Send in-app notification to the thread author
      try {
        const discussion = await db.query.discussions.findFirst({ where: eq(discussions.id, body.discussionId) });
        if (discussion && discussion.userId !== body.userId) {
          const author = await db.query.users.findFirst({ where: eq(users.id, discussion.userId) });
          const replier = await db.query.users.findFirst({ where: eq(users.id, body.userId) });
          if (author && replier) {
            await insertNotification(db, author.id, `New Reply on Discussion`, `${replier.name} replied to "${discussion.title}".`, `/student/courses/${discussion.courseId}`);
          }
        }
      } catch (err) {
        console.error("Discussion reply notification error:", err);
      }

      const created = await db.query.discussionReplies.findFirst({ where: eq(discussionReplies.id, id) });
      return new Response(
        JSON.stringify({
          discussionReply: created ? { ...created, createdAt: created.createdAt.toISOString() } : null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // DELETE /api/discussion-replies/:id -> delete reply
    if (request.method === "DELETE" && path.startsWith("/api/discussion-replies/")) {
      const id = path.slice("/api/discussion-replies/".length);
      await db.delete(discussionReplies).where(eq(discussionReplies.id, id));
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
      let rows;
      if (contentItemId) {
        rows = await db.select().from(videoCheckpoints).where(eq(videoCheckpoints.contentItemId, contentItemId));
      } else {
        rows = await db.select().from(videoCheckpoints);
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
      
      const created = await db.query.videoCheckpoints.findFirst({ where: eq(videoCheckpoints.id, id) });
      return new Response(JSON.stringify({ videoCheckpoint: created }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // DELETE /api/video-checkpoints/:id -> delete checkpoint
    if (request.method === "DELETE" && path.startsWith("/api/video-checkpoints/")) {
      const id = path.slice("/api/video-checkpoints/".length);
      await db.delete(videoCheckpoints).where(eq(videoCheckpoints.id, id));
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
      let rows;
      if (studentId) {
        rows = await db.select().from(checkpointProgress).where(eq(checkpointProgress.studentId, studentId));
      } else {
        rows = await db.select().from(checkpointProgress);
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
      
      const created = await db.query.checkpointProgress.findFirst({
        where: existing ? eq(checkpointProgress.id, existing.id) : eq(checkpointProgress.id, id)
      });
      return new Response(JSON.stringify({ checkpointProgress: created }), {
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
        // Find and delete all submission responses first, then the submissions
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
      } catch (dbErr) {
        console.warn("⚠️ Database delete timed out in POST /api/reset-submissions (serverStore state cleared)");
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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
