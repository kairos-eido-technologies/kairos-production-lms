import { getDb } from "../client";
import {
  users,
  enrollments,
  courses,
  checkpointProgress,
  discussionReplies,
  discussions,
  notifications,
  messages,
  certificates,
  submissions,
  submissionResponses,
  progress,
} from "../schema";
import { eq, desc, or } from "drizzle-orm";
import { toIsoDate, toIso } from "./helpers";

export interface RepositoryUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  status: "active" | "inactive";
  joinedAt: string;
  lastActive: string | null;
  avatar: string | null;
  phone: string | null;
  group?: string;
  isEmailVerified: boolean;
  passwordHash?: string;
  courseIds?: string[];
  emailVerificationCode?: string | null;
  resetPasswordCode?: string | null;
}

export const userRepository = {
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<RepositoryUser[]> {
    const db = getDb();
    const queryOptions: any = {
      orderBy: [desc(users.joinedAt)],
      with: {
        enrollments: true,
      },
    };

    if (params?.limit) {
      queryOptions.limit = params.limit;
      if (params.page) {
        queryOptions.offset = (params.page - 1) * params.limit;
      }
    }

    const allUsers = await db.query.users.findMany(queryOptions);

    return allUsers.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as "admin" | "teacher" | "student",
      status: u.status as "active" | "inactive",
      joinedAt: toIsoDate(u.joinedAt),
      lastActive: u.lastActive ? toIso(u.lastActive) : null,
      avatar: u.avatar || null,
      phone: u.phone || null,
      group: u.group || undefined,
      isEmailVerified: u.isEmailVerified,
      courseIds: Array.isArray(u.enrollments) ? u.enrollments.map((e: any) => e.courseId) : [],
    }));
  },

  async getUserById(id: string): Promise<RepositoryUser | null> {
    const db = getDb();
    const u = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as "admin" | "teacher" | "student",
      status: u.status as "active" | "inactive",
      joinedAt: toIso(u.joinedAt),
      lastActive: u.lastActive ? toIso(u.lastActive) : null,
      avatar: u.avatar || null,
      phone: u.phone || null,
      group: u.group || undefined,
      isEmailVerified: u.isEmailVerified,
      passwordHash: u.passwordHash,
      emailVerificationCode: u.emailVerificationCode,
      resetPasswordCode: u.resetPasswordCode,
    };
  },

  async getUserByEmail(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();
    const u = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });
    if (!u) return null;
    return u;
  },

  async createUser(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    group?: string | null;
    status?: string;
    joinedAt?: Date;
    isEmailVerified?: boolean;
    phone?: string | null;
  }): Promise<RepositoryUser | null> {
    const cleanEmail = data.email.toLowerCase().trim();
    const db = getDb();
    await db
      .insert(users)
      .values({
        id: data.id,
        name: data.name,
        email: cleanEmail,
        passwordHash: data.passwordHash,
        role: data.role,
        group: data.group || null,
        status: (data.status as any) || "active",
        joinedAt: data.joinedAt || new Date(),
        isEmailVerified: data.isEmailVerified ?? true,
        phone: data.phone || null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: data.name,
          email: cleanEmail,
          role: data.role,
          group: data.group || null,
          status: (data.status as any) || "active",
          phone: data.phone || null,
          updatedAt: new Date(),
        },
      });
    return this.getUserById(data.id);
  },

  async updateUser(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      role: string;
      group: string | null;
      status: string;
      avatar: string | null;
      phone: string | null;
      isEmailVerified: boolean;
      passwordHash: string;
      lastActive: Date | null;
      emailVerificationCode: string | null;
      resetPasswordCode: string | null;
    }>,
  ): Promise<RepositoryUser | null> {
    const db = getDb();
    const updatePayload: any = { ...data, updatedAt: new Date() };
    if (data.email) updatePayload.email = data.email.toLowerCase().trim();
    await db.update(users).set(updatePayload).where(eq(users.id, id));
    return this.getUserById(id);
  },

  async deleteUser(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(checkpointProgress).where(eq(checkpointProgress.studentId, id));
    await db.delete(discussionReplies).where(eq(discussionReplies.userId, id));
    await db.delete(discussions).where(eq(discussions.userId, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(messages).where(or(eq(messages.fromId, id), eq(messages.toId, id)));
    await db.delete(certificates).where(eq(certificates.studentId, id));
    const userSubs = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.studentId, id));
    for (const sub of userSubs) {
      await db.delete(submissionResponses).where(eq(submissionResponses.submissionId, sub.id));
    }
    await db.delete(submissions).where(eq(submissions.studentId, id));
    await db.delete(progress).where(eq(progress.studentId, id));
    await db.delete(enrollments).where(eq(enrollments.studentId, id));
    await db.update(courses).set({ teacherId: null }).where(eq(courses.teacherId, id));
    await db.delete(users).where(eq(users.id, id));
    return true;
  },
};
