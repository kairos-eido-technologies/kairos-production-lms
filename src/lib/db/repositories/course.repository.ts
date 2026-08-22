import { getDb } from "../client";
import {
  courses,
  sections,
  contentItems,
  enrollments,
  events,
  announcements,
  discussions,
  discussionReplies,
  certificates,
  assessments,
  questions,
  submissions,
  submissionResponses,
  videoCheckpoints,
  checkpointProgress,
  progress,
} from "../schema";
import { eq } from "drizzle-orm";
import { makeId, toIsoDate } from "./helpers";

export interface RepositorySectionItem {
  id: string;
  sectionId: string;
  type: string;
  title: string;
  duration: number | null;
  fileSize: string | null;
  fileName: string | null;
  assessmentId: string | null;
  order: number;
  url: string | null;
  body: string | null;
}

export interface RepositorySection {
  id: string;
  courseId: string;
  title: string;
  order: number;
  items: RepositorySectionItem[];
}

export interface RepositoryCourse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  teacherId: string | null;
  status: string;
  showInPreview: boolean;
  previewVideoUrl: string;
  badgeTag: string;
  featuredBadgeText: string;
  durationText: string;
  projectsText: string;
  techStack: any;
  startDate: string;
  endDate: string;
  studentIds: string[];
  studentAccess: Record<string, { accessMode?: string; endDate?: string }>;
  sections: RepositorySection[];
}

export const courseRepository = {
  async getCourses(isAuthenticated = false): Promise<RepositoryCourse[]> {
    let dCourses: any[] = [];
    let dSections: any[] = [];
    let dItems: any[] = [];
    let dEnrollments: any[] = [];

    try {
      const db = getDb();
      dCourses = await db.query.courses.findMany();
      dSections = await db.query.sections.findMany();
      dItems = await db.query.contentItems.findMany();
      dEnrollments = await db.query.enrollments.findMany();
    } catch (dbErr) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.VITE_SUPABASE_URL || "https://pzmtbnsquhlplakcaezl.supabase.co";
        const key =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXRibnNxdWhscGxha2NhZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjAxNzYsImV4cCI6MjEwMjEzNjE3Nn0.ENqDZPXBDuS2FtRJt2Z6pLMHjVm1tqRMDKm-Y1EkM5w";
        const supabase = createClient(url, key);

        const [resCourses, resSections, resItems, resEnrollments] = await Promise.all([
          supabase.from("courses").select("*"),
          supabase.from("sections").select("*"),
          supabase.from("content_items").select("*"),
          supabase.from("enrollments").select("*"),
        ]);

        dCourses = (resCourses.data || []).map((c: any) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description,
          teacherId: c.teacher_id || c.teacherId,
          thumbnail: c.thumbnail,
          startDate: c.start_date || c.startDate,
          endDate: c.end_date || c.endDate,
          accessMode: c.access_mode || c.accessMode,
          status: c.status,
          showInPreview: c.show_in_preview ?? c.showInPreview ?? true,
          previewVideoUrl: c.preview_video_url || c.previewVideoUrl,
          lockProgression: c.lock_progression ?? c.lockProgression ?? false,
          sequentialProgression: c.lock_progression ?? c.lockProgression ?? false,
          badgeTag: c.badge_tag || c.badgeTag,
          featuredBadgeText: c.featured_badge_text || c.featuredBadgeText,
          durationText: c.duration_text || c.durationText,
          projectsText: c.projects_text || c.projectsText,
          techStack: c.tech_stack || c.techStack,
        }));

        dSections = (resSections.data || []).map((s: any) => ({
          id: s.id,
          courseId: s.course_id || s.courseId,
          title: s.title,
          order: s.order,
        }));

        dItems = (resItems.data || []).map((it: any) => ({
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
          order: it.order,
        }));

        dEnrollments = (resEnrollments.data || []).map((e: any) => ({
          id: e.id,
          studentId: e.student_id || e.studentId,
          courseId: e.course_id || e.courseId,
          accessMode: e.access_mode || e.accessMode,
          endDate: e.end_date || e.endDate,
        }));
      } catch (err) {
        console.error("Failed to query courses from Supabase:", err);
      }
    }

    const enrollmentsByCourse = new Map<string, any[]>();
    for (const e of dEnrollments) {
      const list = enrollmentsByCourse.get(e.courseId) || [];
      list.push(e);
      enrollmentsByCourse.set(e.courseId, list);
    }

    const sectionsByCourse = new Map<string, any[]>();
    for (const s of dSections) {
      const list = sectionsByCourse.get(s.courseId) || [];
      list.push(s);
      sectionsByCourse.set(s.courseId, list);
    }

    const itemsBySection = new Map<string, any[]>();
    for (const it of dItems) {
      const list = itemsBySection.get(it.sectionId) || [];
      list.push(it);
      itemsBySection.set(it.sectionId, list);
    }

    return dCourses.map((c) => {
      const courseEnrollments = enrollmentsByCourse.get(c.id) || [];
      const studentAccess: Record<string, any> = {};

      for (const e of courseEnrollments) {
        studentAccess[e.studentId] = {
          accessMode: e.accessMode,
          endDate: e.endDate ? toIsoDate(e.endDate) : undefined,
        };
      }

      const courseSections = sectionsByCourse.get(c.id) || [];

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        thumbnail: c.thumbnail,
        teacherId: c.teacherId,
        status: c.status || "active",
        showInPreview: c.showInPreview ?? true,
        previewVideoUrl: c.previewVideoUrl || "",
        lockProgression: c.lockProgression ?? c.sequentialProgression ?? false,
        sequentialProgression: c.lockProgression ?? c.sequentialProgression ?? false,
        badgeTag: c.badgeTag || "",
        featuredBadgeText: c.featuredBadgeText || "",
        durationText: c.durationText || "",
        projectsText: c.projectsText || "",
        techStack: c.techStack || [],
        startDate: toIsoDate(c.startDate),
        endDate: toIsoDate(c.endDate),
        studentIds: courseEnrollments.map((e) => e.studentId),
        studentAccess: studentAccess,
        sections: courseSections
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((s) => ({
            id: s.id,
            courseId: s.courseId,
            title: s.title,
            order: s.order ?? 0,
            items: (itemsBySection.get(s.id) || [])
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((it) => ({
                id: it.id,
                sectionId: it.sectionId,
                type: it.type,
                title: it.title,
                duration: it.duration,
                fileSize: it.fileSize,
                fileName: it.fileName,
                assessmentId: it.assessmentId,
                order: it.order ?? 0,
                url: it.url,
                body: it.body,
              })),
          })),
      };
    });
  },

  async createCourse(data: any): Promise<RepositoryCourse | undefined> {
    const id = data.id || makeId();
    const now = new Date();
    const db = getDb();

    await db.insert(courses).values({
      id,
      name: data.name || "Untitled",
      code: data.code || "",
      description: data.description || null,
      teacherId: data.teacherId || null,
      thumbnail: data.thumbnail || null,
      startDate: data.startDate ? new Date(data.startDate) : now,
      endDate: data.endDate ? new Date(data.endDate) : now,
      accessMode: data.accessMode || "lifetime",
      status: data.status || "draft",
      showInPreview: data.showInPreview ?? false,
      previewVideoUrl: data.previewVideoUrl || null,
      lockProgression: data.lockProgression ?? data.sequentialProgression ?? false,
      badgeTag: data.badgeTag !== undefined ? data.badgeTag : null,
      featuredBadgeText: data.featuredBadgeText !== undefined ? data.featuredBadgeText : null,
      durationText: data.durationText !== undefined ? data.durationText : null,
      projectsText: data.projectsText !== undefined ? data.projectsText : null,
      techStack: data.techStack ? data.techStack : null,
    });

    if (data.studentIds && Array.isArray(data.studentIds)) {
      for (const studentId of data.studentIds) {
        const access = data.studentAccess?.[studentId] || {};
        await db.insert(enrollments).values({
          id: makeId(),
          studentId,
          courseId: id,
          accessMode: access.accessMode || "lifetime",
          endDate: access.endDate ? new Date(access.endDate) : null,
        });
      }
    }

    return (await this.getCourses(true)).find((c) => c.id === id);
  },

  async updateCourse(id: string, data: any): Promise<RepositoryCourse | undefined> {
    const db = getDb();
    const updateData: any = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.teacherId !== undefined) updateData.teacherId = data.teacherId || null;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.accessMode !== undefined) updateData.accessMode = data.accessMode;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.showInPreview !== undefined) updateData.showInPreview = data.showInPreview;
    if (data.previewVideoUrl !== undefined) updateData.previewVideoUrl = data.previewVideoUrl;
    if (data.lockProgression !== undefined || data.sequentialProgression !== undefined) {
      updateData.lockProgression = data.lockProgression ?? data.sequentialProgression;
    }
    if (data.badgeTag !== undefined) updateData.badgeTag = data.badgeTag;
    if (data.featuredBadgeText !== undefined) updateData.featuredBadgeText = data.featuredBadgeText;
    if (data.durationText !== undefined) updateData.durationText = data.durationText;
    if (data.projectsText !== undefined) updateData.projectsText = data.projectsText;
    if (data.techStack !== undefined) updateData.techStack = data.techStack;

    await db.update(courses).set(updateData).where(eq(courses.id, id));

    if (data.studentIds && Array.isArray(data.studentIds)) {
      await db.delete(enrollments).where(eq(enrollments.courseId, id));
      for (const studentId of data.studentIds) {
        const access = data.studentAccess?.[studentId] || {};
        await db.insert(enrollments).values({
          id: makeId(),
          studentId,
          courseId: id,
          accessMode: access.accessMode || "lifetime",
          endDate: access.endDate ? new Date(access.endDate) : null,
        });
      }
    }

    return (await this.getCourses(true)).find((c) => c.id === id);
  },

  async deleteCourse(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(events).where(eq(events.courseId, id));
    await db.delete(announcements).where(eq(announcements.courseId, id));
    const courseDiscs = await db
      .select({ id: discussions.id })
      .from(discussions)
      .where(eq(discussions.courseId, id));
    for (const disc of courseDiscs) {
      await db.delete(discussionReplies).where(eq(discussionReplies.discussionId, disc.id));
    }
    await db.delete(discussions).where(eq(discussions.courseId, id));
    await db.delete(certificates).where(eq(certificates.courseId, id));
    const courseAssessments = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(eq(assessments.courseId, id));
    for (const a of courseAssessments) {
      const assessSubs = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.assessmentId, a.id));
      for (const sub of assessSubs) {
        await db.delete(submissionResponses).where(eq(submissionResponses.submissionId, sub.id));
      }
      await db.delete(submissions).where(eq(submissions.assessmentId, a.id));
      await db.delete(questions).where(eq(questions.assessmentId, a.id));
    }
    await db.delete(assessments).where(eq(assessments.courseId, id));
    const courseSections = await db
      .select({ id: sections.id })
      .from(sections)
      .where(eq(sections.courseId, id));
    for (const sec of courseSections) {
      const secItems = await db
        .select({ id: contentItems.id })
        .from(contentItems)
        .where(eq(contentItems.sectionId, sec.id));
      for (const item of secItems) {
        const cps = await db
          .select({ id: videoCheckpoints.id })
          .from(videoCheckpoints)
          .where(eq(videoCheckpoints.contentItemId, item.id));
        for (const cp of cps) {
          await db.delete(checkpointProgress).where(eq(checkpointProgress.checkpointId, cp.id));
        }
        await db.delete(videoCheckpoints).where(eq(videoCheckpoints.contentItemId, item.id));
        await db.delete(progress).where(eq(progress.contentItemId, item.id));
      }
      await db.delete(contentItems).where(eq(contentItems.sectionId, sec.id));
    }
    await db.delete(sections).where(eq(sections.courseId, id));
    await db.delete(progress).where(eq(progress.courseId, id));
    await db.delete(enrollments).where(eq(enrollments.courseId, id));
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  },

  async createSection(data: { courseId: string; title: string; order?: number }) {
    const id = makeId();
    const db = getDb();
    await db.insert(sections).values({
      id,
      courseId: data.courseId,
      title: data.title || "Untitled",
      order: data.order ?? 0,
    });
    return db.query.sections.findFirst({ where: eq(sections.id, id) });
  },

  async updateSection(id: string, data: { title?: string; order?: number }) {
    const db = getDb();
    await db.update(sections).set(data).where(eq(sections.id, id));
    return db.query.sections.findFirst({ where: eq(sections.id, id) });
  },

  async deleteSection(id: string): Promise<boolean> {
    const db = getDb();
    const items = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.sectionId, id));

    for (const item of items) {
      const cps = await db
        .select({ id: videoCheckpoints.id })
        .from(videoCheckpoints)
        .where(eq(videoCheckpoints.contentItemId, item.id));
      for (const cp of cps) {
        await db.delete(checkpointProgress).where(eq(checkpointProgress.checkpointId, cp.id));
      }
      await db.delete(videoCheckpoints).where(eq(videoCheckpoints.contentItemId, item.id));
      await db.delete(progress).where(eq(progress.contentItemId, item.id));
    }

    await db.delete(contentItems).where(eq(contentItems.sectionId, id));
    await db.delete(sections).where(eq(sections.id, id));
    return true;
  },

  async createContentItem(data: any) {
    const id = makeId();
    const db = getDb();
    await db.insert(contentItems).values({
      id,
      sectionId: data.sectionId,
      type: data.type,
      title: data.title || "",
      body: data.body || null,
      url: data.url || null,
      fileName: data.fileName || null,
      duration: data.duration ?? null,
      fileSize: data.fileSize || null,
      assessmentId: data.assessmentId || null,
      order: data.order ?? 0,
    });
    return db.query.contentItems.findFirst({ where: eq(contentItems.id, id) });
  },

  async updateContentItem(id: string, data: any) {
    const db = getDb();
    await db
      .update(contentItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, id));
    return db.query.contentItems.findFirst({ where: eq(contentItems.id, id) });
  },

  async deleteContentItem(id: string): Promise<boolean> {
    const db = getDb();
    const cps = await db
      .select({ id: videoCheckpoints.id })
      .from(videoCheckpoints)
      .where(eq(videoCheckpoints.contentItemId, id));
    for (const cp of cps) {
      await db.delete(checkpointProgress).where(eq(checkpointProgress.checkpointId, cp.id));
    }
    await db.delete(videoCheckpoints).where(eq(videoCheckpoints.contentItemId, id));
    await db.delete(progress).where(eq(progress.contentItemId, id));
    await db.delete(contentItems).where(eq(contentItems.id, id));
    return true;
  },
};
