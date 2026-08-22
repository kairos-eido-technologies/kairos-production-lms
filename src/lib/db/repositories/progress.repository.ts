import { getDb } from "../client";
import { progress, extraAttempts } from "../schema";
import { eq, and } from "drizzle-orm";
import { makeId } from "./helpers";

const extraAttemptsStore: Record<string, number> = {};

export const progressRepository = {
  async getProgress(studentId?: string | null, courseId?: string | null) {
    const db = getDb();
    let query = db.select().from(progress);
    if (studentId && courseId) {
      query = query.where(
        and(eq(progress.studentId, studentId), eq(progress.courseId, courseId)),
      ) as any;
    } else if (studentId) {
      query = query.where(eq(progress.studentId, studentId)) as any;
    } else if (courseId) {
      query = query.where(eq(progress.courseId, courseId)) as any;
    }
    const allProgress = await query;

    const progressRecord: Record<string, string[]> = {};
    for (const p of allProgress) {
      const key = `${p.studentId}:${p.courseId}`;
      if (!progressRecord[key]) progressRecord[key] = [];
      if (!progressRecord[key].includes(p.contentItemId)) {
        progressRecord[key].push(p.contentItemId);
      }
    }

    let completedItemIds: string[] = [];
    if (studentId && courseId) {
      completedItemIds = progressRecord[`${studentId}:${courseId}`] || [];
    }

    return { progress: progressRecord, completedItemIds };
  },

  async saveProgress(studentId: string, courseId: string, contentItemId: string): Promise<boolean> {
    const db = getDb();
    const existing = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.studentId, studentId),
          eq(progress.courseId, courseId),
          eq(progress.contentItemId, contentItemId),
        ),
      );

    if (existing.length === 0) {
      await db.insert(progress).values({
        id: makeId(),
        studentId,
        courseId,
        contentItemId,
      });
    }
    return true;
  },

  async removeProgress(
    studentId: string,
    courseId: string,
    contentItemId: string,
  ): Promise<boolean> {
    const db = getDb();
    await db
      .delete(progress)
      .where(
        and(
          eq(progress.studentId, studentId),
          eq(progress.courseId, courseId),
          eq(progress.contentItemId, contentItemId),
        ),
      );
    return true;
  },

  async getExtraAttempts(): Promise<Record<string, number>> {
    try {
      const db = getDb();
      const rows = await db.select().from(extraAttempts);
      const res: Record<string, number> = { ...extraAttemptsStore };
      for (const r of rows) {
        res[`${r.studentId}:${r.assessmentId}`] = r.count;
      }
      return res;
    } catch {
      return { ...extraAttemptsStore };
    }
  },

  async addExtraAttempt(studentId: string, assessmentId: string, count = 1): Promise<number> {
    const key = `${studentId}:${assessmentId}`;
    const curr = extraAttemptsStore[key] || 0;
    const newTotal = curr + count;
    extraAttemptsStore[key] = newTotal;

    try {
      const db = getDb();
      const existing = await db
        .select()
        .from(extraAttempts)
        .where(
          and(
            eq(extraAttempts.studentId, studentId),
            eq(extraAttempts.assessmentId, assessmentId),
          ),
        );

      if (existing.length > 0) {
        await db
          .update(extraAttempts)
          .set({ count: existing[0].count + count, updatedAt: new Date() })
          .where(eq(extraAttempts.id, existing[0].id));
      } else {
        await db.insert(extraAttempts).values({
          id: makeId(),
          studentId,
          assessmentId,
          count,
        });
      }
    } catch {}

    return newTotal;
  },

  async resetExtraAttempts(studentId: string, assessmentId: string): Promise<void> {
    delete extraAttemptsStore[`${studentId}:${assessmentId}`];
    try {
      const db = getDb();
      await db
        .delete(extraAttempts)
        .where(
          and(
            eq(extraAttempts.studentId, studentId),
            eq(extraAttempts.assessmentId, assessmentId),
          ),
        );
    } catch {}
  },
};

