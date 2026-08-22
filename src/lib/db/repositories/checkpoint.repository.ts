import { getDb } from "../client";
import { videoCheckpoints, checkpointProgress } from "../schema";
import { eq, and, desc } from "drizzle-orm";
import { makeId, toIso } from "./helpers";

export interface RepositoryVideoCheckpoint {
  id: string;
  contentItemId: string;
  timestamp: number;
  type: string;
  prompt: string;
  options: any;
  correctIndex: number | null;
  correctText: string | null;
}

export interface RepositoryCheckpointProgress {
  id: string;
  studentId: string;
  checkpointId: string;
  isCorrect: boolean;
  answeredAt: string;
}

export const checkpointRepository = {
  async getVideoCheckpoints(contentItemId?: string | null): Promise<RepositoryVideoCheckpoint[]> {
    const db = getDb();
    let query = db.select().from(videoCheckpoints);
    if (contentItemId) {
      query = query.where(eq(videoCheckpoints.contentItemId, contentItemId)) as any;
    }
    const list = await query.orderBy(videoCheckpoints.timestamp);

    return list.map((v) => ({
      id: v.id,
      contentItemId: v.contentItemId,
      timestamp: v.timestamp,
      type: v.type,
      prompt: v.prompt,
      options: v.options,
      correctIndex: v.correctIndex,
      correctText: v.correctText,
    }));
  },

  async saveVideoCheckpoint(data: any): Promise<RepositoryVideoCheckpoint> {
    const id = data.id || makeId();
    const db = getDb();
    await db
      .insert(videoCheckpoints)
      .values({
        id,
        contentItemId: data.contentItemId,
        timestamp: Number(data.timestamp),
        type: data.type || "mcq",
        prompt: data.prompt || "",
        options: data.options || null,
        correctIndex:
          data.correctIndex !== undefined && data.correctIndex !== null
            ? Number(data.correctIndex)
            : null,
        correctText: data.correctText || null,
      })
      .onConflictDoUpdate({
        target: videoCheckpoints.id,
        set: {
          timestamp: Number(data.timestamp),
          type: data.type || "mcq",
          prompt: data.prompt || "",
          options: data.options || null,
          correctIndex:
            data.correctIndex !== undefined && data.correctIndex !== null
              ? Number(data.correctIndex)
              : null,
          correctText: data.correctText || null,
          updatedAt: new Date(),
        },
      });
    return { id, ...data };
  },

  async deleteVideoCheckpoint(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(checkpointProgress).where(eq(checkpointProgress.checkpointId, id));
    await db.delete(videoCheckpoints).where(eq(videoCheckpoints.id, id));
    return true;
  },

  async getCheckpointProgress(studentId?: string | null): Promise<RepositoryCheckpointProgress[]> {
    const db = getDb();
    let query = db.select().from(checkpointProgress);
    if (studentId) {
      query = query.where(eq(checkpointProgress.studentId, studentId)) as any;
    }
    const list = await query.orderBy(desc(checkpointProgress.answeredAt));

    return list.map((cp) => ({
      id: cp.id,
      studentId: cp.studentId,
      checkpointId: cp.checkpointId,
      isCorrect: cp.isCorrect,
      answeredAt: toIso(cp.answeredAt),
    }));
  },

  async saveCheckpointProgress(data: {
    studentId: string;
    checkpointId: string;
    isCorrect: boolean;
  }): Promise<RepositoryCheckpointProgress> {
    const id = makeId();
    const db = getDb();
    const existing = await db.query.checkpointProgress.findFirst({
      where: and(
        eq(checkpointProgress.studentId, data.studentId),
        eq(checkpointProgress.checkpointId, data.checkpointId),
      ),
    });

    if (existing) {
      await db
        .update(checkpointProgress)
        .set({
          isCorrect: !!data.isCorrect,
          answeredAt: new Date(),
        })
        .where(eq(checkpointProgress.id, existing.id));
    } else {
      await db.insert(checkpointProgress).values({
        id,
        studentId: data.studentId,
        checkpointId: data.checkpointId,
        isCorrect: !!data.isCorrect,
      });
    }
    return { id, ...data, answeredAt: new Date().toISOString() };
  },
};
