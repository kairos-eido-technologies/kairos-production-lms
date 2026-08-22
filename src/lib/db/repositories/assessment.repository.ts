import { getDb, resetDbClient } from "../client";
import { assessments, questions, submissions, submissionResponses, contentItems } from "../schema";
import { eq, and, desc } from "drizzle-orm";
import { makeId, toIsoDate } from "./helpers";
import { progressRepository } from "./progress.repository";

export interface RepositoryQuestion {
  id: string;
  assessmentId?: string;
  prompt: string;
  type: string;
  options: string[];
  correctIndex: number | null;
  points: number;
  imageUrl?: string;
  order: number;
}

export interface RepositoryAssessment {
  id: string;
  courseId: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  attempts: number;
  questionCount: number;
  proctored: boolean;
  isFinal: boolean;
  questions: RepositoryQuestion[];
}

export interface RepositorySubmissionResponse {
  questionId: string;
  response: string;
  awarded: number | null;
}

export interface RepositorySubmission {
  id: string;
  assessmentId: string;
  studentId: string;
  attemptNumber: number;
  score: number;
  status: string;
  submittedAt: string;
  feedback?: string;
  proctorEvents?: any;
  responses: RepositorySubmissionResponse[];
}

export const assessmentRepository = {
  async getAssessments(courseId?: string | null): Promise<RepositoryAssessment[]> {
    let dAssessments: any[] = [];

    try {
      const db = getDb();
      dAssessments = await db.query.assessments.findMany({
        where: courseId ? eq(assessments.courseId, courseId) : undefined,
        with: {
          questions: {
            orderBy: [questions.order],
          },
        },
      });
    } catch (dbErr) {
      console.warn("Direct DB query failed for assessments, attempting Supabase fallback:", dbErr);
      resetDbClient();

      try {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.VITE_SUPABASE_URL || "https://pzmtbnsquhlplakcaezl.supabase.co";
        const key =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXRibnNxdWhscGxha2NhZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjAxNzYsImV4cCI6MjEwMjEzNjE3Nn0.ENqDZPXBDuS2FtRJt2Z6pLMHjVm1tqRMDKm-Y1EkM5w";
        const supabase = createClient(url, key);

        let query = supabase.from("assessments").select("*, questions(*)");
        if (courseId) {
          query = query.eq("course_id", courseId);
        }
        const { data, error } = await query;
        if (!error && data) {
          dAssessments = data.map((a: any) => ({
            id: a.id,
            courseId: a.course_id || a.courseId,
            title: a.title,
            timeLimit: a.time_limit ?? a.timeLimit,
            passingScore: a.passing_score ?? a.passingScore,
            attempts: a.attempts,
            questionCount: a.question_count ?? a.questionCount,
            proctored: a.proctored,
            isFinal: a.is_final ?? a.isFinal,
            questions: (a.questions || []).map((q: any) => ({
              id: q.id,
              assessmentId: q.assessment_id || q.assessmentId,
              prompt: q.prompt,
              type: q.type,
              options: q.options,
              correctIndex: q.correct_index ?? q.correctIndex,
              points: q.points,
              imageUrl: q.image_url || q.imageUrl,
              order: q.order,
            })),
          }));
        }
      } catch (err) {
        console.error("Failed to query assessments from Supabase fallback:", err);
      }
    }

    return dAssessments.map((a: any) => ({
      id: a.id,
      courseId: a.courseId,
      title: a.title,
      timeLimit: a.timeLimit ?? 10,
      passingScore: a.passingScore ?? 70,
      attempts: a.attempts ?? 1,
      questionCount: a.questions?.length || a.questionCount || 0,
      proctored: a.proctored ?? false,
      isFinal: a.isFinal ?? false,
      questions: (a.questions || []).map((q: any) => ({
        id: q.id,
        assessmentId: q.assessmentId,
        prompt: q.prompt,
        type: q.type || "mcq",
        options: (q.options as string[]) ?? [],
        correctIndex: q.correctIndex ?? 0,
        points: q.points ?? 1,
        imageUrl: q.imageUrl || undefined,
        order: q.order ?? 0,
      })),
    }));
  },

  async createAssessment(data: any): Promise<RepositoryAssessment | undefined> {
    const id = data.id || makeId();
    const db = getDb();
    await db.insert(assessments).values({
      id,
      courseId: data.courseId,
      title: data.title || "Quiz",
      timeLimit: data.timeLimit ?? 10,
      passingScore: data.passingScore ?? 70,
      attempts: data.attempts ?? 1,
      questionCount: 0,
      proctored: data.proctored ?? false,
      isFinal: data.isFinal ?? false,
    });
    return (await this.getAssessments()).find((a) => a.id === id);
  },

  async updateAssessment(id: string, data: any): Promise<RepositoryAssessment | undefined> {
    const db = getDb();
    await db
      .update(assessments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, id));
    return (await this.getAssessments()).find((a) => a.id === id);
  },

  async deleteAssessment(id: string): Promise<boolean> {
    const db = getDb();
    const assessSubs = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.assessmentId, id));
    for (const sub of assessSubs) {
      await db.delete(submissionResponses).where(eq(submissionResponses.submissionId, sub.id));
    }
    await db.delete(submissions).where(eq(submissions.assessmentId, id));
    await db.delete(questions).where(eq(questions.assessmentId, id));
    await db
      .update(contentItems)
      .set({ assessmentId: null })
      .where(eq(contentItems.assessmentId, id));
    await db.delete(assessments).where(eq(assessments.id, id));
    return true;
  },

  async getQuestions(assessmentId?: string | null): Promise<RepositoryQuestion[]> {
    const allAssessments = await this.getAssessments();
    if (assessmentId) {
      const match = allAssessments.find((a) => a.id === assessmentId);
      return match ? match.questions : [];
    }
    return allAssessments.flatMap((a) => a.questions);
  },

  async createQuestion(data: any) {
    const id = data.id || makeId();
    const db = getDb();
    await db.insert(questions).values({
      id,
      assessmentId: data.assessmentId,
      type: data.type || "mcq",
      prompt: data.prompt || "",
      options: data.options ?? null,
      correctIndex: data.correctIndex ?? null,
      points: data.points ?? 1,
      imageUrl: data.imageUrl ?? null,
      order: data.order ?? 0,
    });
    return { id, ...data };
  },

  async createQuestionsBatch(assessmentId: string, qs: any[]) {
    const createdList = [];
    let orderIndex = 0;
    for (const q of qs) {
      const id = q.id || makeId();
      await this.createQuestion({ ...q, id, assessmentId, order: orderIndex++ });
      createdList.push({ id, assessmentId, ...q, order: orderIndex - 1 });
    }
    return createdList;
  },

  async updateQuestion(id: string, data: any) {
    const db = getDb();
    await db
      .update(questions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, id));
    return { id, ...data };
  },

  async deleteQuestion(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(questions).where(eq(questions.id, id));
    return true;
  },

  async getSubmissions(
    studentId?: string | null,
    assessmentId?: string | null,
  ): Promise<RepositorySubmission[]> {
    const db = getDb();
    let whereClause: any = undefined;
    if (studentId && assessmentId) {
      whereClause = and(eq(submissions.studentId, studentId), eq(submissions.assessmentId, assessmentId));
    } else if (studentId) {
      whereClause = eq(submissions.studentId, studentId);
    } else if (assessmentId) {
      whereClause = eq(submissions.assessmentId, assessmentId);
    }

    const dSubs = await db.query.submissions.findMany({
      where: whereClause,
      orderBy: [desc(submissions.submittedAt)],
      with: {
        responses: true,
      },
    });

    return dSubs.map((s: any) => ({
      id: s.id,
      assessmentId: s.assessmentId,
      studentId: s.studentId,
      attemptNumber: 1,
      score: 100,
      status: s.status,
      submittedAt: toIsoDate(s.submittedAt),
      feedback: s.feedback || undefined,
      proctorEvents: s.proctorEvents || undefined,
      responses: (s.responses || []).map((r: any) => ({
        questionId: r.questionId,
        response: r.response,
        awarded: r.awarded,
      })),
    }));
  },

  async getSubmissionById(id: string): Promise<RepositorySubmission | undefined> {
    const db = getDb();
    const dSub = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      with: {
        responses: true,
      },
    });
    if (!dSub) return undefined;
    return {
      id: dSub.id,
      assessmentId: dSub.assessmentId,
      studentId: dSub.studentId,
      attemptNumber: 1,
      score: 100,
      status: dSub.status,
      submittedAt: toIsoDate(dSub.submittedAt),
      feedback: dSub.feedback || undefined,
      proctorEvents: dSub.proctorEvents || undefined,
      responses: (dSub.responses || []).map((r: any) => ({
        questionId: r.questionId,
        response: r.response,
        awarded: r.awarded,
      })),
    };
  },

  async createSubmission(data: any): Promise<RepositorySubmission | undefined> {
    const id = data.id || makeId();
    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const db = getDb();

    await db.insert(submissions).values({
      id,
      assessmentId: data.assessmentId,
      studentId: data.studentId,
      submittedAt,
      status: data.status || "graded",
      feedback: data.feedback || null,
      proctorEvents: data.proctorEvents || null,
    });

    if (data.responses && Array.isArray(data.responses)) {
      for (const resp of data.responses) {
        await db.insert(submissionResponses).values({
          id: makeId(),
          submissionId: id,
          questionId: resp.questionId,
          response: resp.response || "",
          awarded: resp.awarded !== undefined && resp.awarded !== null ? Number(resp.awarded) : 0,
        });
      }
    }

    const created = await this.getSubmissions(data.studentId, data.assessmentId);
    return created.find((s) => s.id === id);
  },

  async gradeSubmission(
    id: string,
    feedback: string,
    awards?: Record<string, number>,
  ): Promise<boolean> {
    const db = getDb();
    await db
      .update(submissions)
      .set({
        status: "graded",
        feedback: feedback || null,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, id));

    if (awards && typeof awards === "object") {
      for (const [questionId, awardedPoints] of Object.entries(awards)) {
        await db
          .update(submissionResponses)
          .set({ awarded: Number(awardedPoints) || 0 })
          .where(
            and(
              eq(submissionResponses.submissionId, id),
              eq(submissionResponses.questionId, questionId),
            ),
          );
      }
    }
    return true;
  },

  async resetSubmissions(studentId: string, assessmentId: string): Promise<boolean> {
    const db = getDb();
    const userSubs = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(and(eq(submissions.studentId, studentId), eq(submissions.assessmentId, assessmentId)));

    for (const sub of userSubs) {
      await db.delete(submissionResponses).where(eq(submissionResponses.submissionId, sub.id));
    }
    await db
      .delete(submissions)
      .where(and(eq(submissions.studentId, studentId), eq(submissions.assessmentId, assessmentId)));

    progressRepository.resetExtraAttempts(studentId, assessmentId);
    return true;
  },
};
