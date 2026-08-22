import { getDb } from "../client";
import { notifications, messages, announcements, discussions, discussionReplies } from "../schema";
import { eq, desc, or } from "drizzle-orm";
import { makeId, toIso } from "./helpers";

export interface RepositoryNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface RepositoryMessage {
  id: string;
  fromId: string;
  toId: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface RepositoryAnnouncement {
  id: string;
  courseId: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

export interface RepositoryDiscussion {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface RepositoryDiscussionReply {
  id: string;
  discussionId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export const communicationRepository = {
  async getNotifications(userId?: string | null): Promise<RepositoryNotification[]> {
    const db = getDb();
    let query = db.select().from(notifications);
    if (userId) {
      query = query.where(eq(notifications.userId, userId)) as any;
    }
    const list = await query.orderBy(desc(notifications.createdAt));

    return list.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      read: n.read,
      link: n.link ?? undefined,
      createdAt: toIso(n.createdAt),
    }));
  },

  async createNotification(
    userId: string,
    title: string,
    message: string,
    link?: string | null,
  ): Promise<RepositoryNotification> {
    const id = `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const db = getDb();
    await db.insert(notifications).values({
      id,
      userId,
      title: title || "",
      message: message || "",
      read: false,
      link: link || null,
    });
    return {
      id,
      userId,
      title,
      message,
      read: false,
      link: link || undefined,
      createdAt: new Date().toISOString(),
    };
  },

  async markNotificationRead(id: string): Promise<boolean> {
    const db = getDb();
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
    return true;
  },

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const db = getDb();
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
    return true;
  },

  async getMessages(userId?: string | null): Promise<RepositoryMessage[]> {
    const db = getDb();
    let query = db.select().from(messages);
    if (userId) {
      query = query.where(or(eq(messages.fromId, userId), eq(messages.toId, userId))) as any;
    }
    const list = await query.orderBy(desc(messages.createdAt));

    return list.map((m) => ({
      id: m.id,
      fromId: m.fromId,
      toId: m.toId,
      subject: m.subject,
      body: m.body,
      read: m.read,
      createdAt: toIso(m.createdAt),
    }));
  },

  async createMessage(
    fromId: string,
    toId: string,
    subject: string,
    body: string,
  ): Promise<RepositoryMessage> {
    const id = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const db = getDb();
    await db.insert(messages).values({
      id,
      fromId,
      toId,
      subject: subject || "",
      body: body || "",
      read: false,
    });
    return { id, fromId, toId, subject, body, read: false, createdAt: new Date().toISOString() };
  },

  async markMessageRead(id: string): Promise<boolean> {
    const db = getDb();
    await db.update(messages).set({ read: true }).where(eq(messages.id, id));
    return true;
  },

  async getAnnouncements(): Promise<RepositoryAnnouncement[]> {
    const db = getDb();
    const list = await db.query.announcements.findMany({
      orderBy: [desc(announcements.createdAt)],
    });

    return list.map((a) => ({
      id: a.id,
      courseId: a.courseId,
      title: a.title,
      body: a.body,
      isPinned: a.isPinned,
      createdAt: toIso(a.createdAt),
    }));
  },

  async createAnnouncement(data: {
    courseId: string;
    title: string;
    body: string;
    isPinned?: boolean;
  }): Promise<RepositoryAnnouncement> {
    const id = makeId();
    const db = getDb();
    await db.insert(announcements).values({
      id,
      courseId: data.courseId,
      title: data.title || "",
      body: data.body || "",
      isPinned: data.isPinned ?? false,
    });
    return { id, ...data, isPinned: data.isPinned ?? false, createdAt: new Date().toISOString() };
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(announcements).where(eq(announcements.id, id));
    return true;
  },

  async getDiscussions(): Promise<RepositoryDiscussion[]> {
    const db = getDb();
    const list = await db.query.discussions.findMany({
      orderBy: [desc(discussions.createdAt)],
    });

    return list.map((d) => ({
      id: d.id,
      courseId: d.courseId,
      userId: d.userId,
      title: d.title,
      body: d.body,
      createdAt: toIso(d.createdAt),
    }));
  },

  async createDiscussion(data: {
    courseId: string;
    userId: string;
    title: string;
    body: string;
  }): Promise<RepositoryDiscussion> {
    const id = makeId();
    const db = getDb();
    await db.insert(discussions).values({
      id,
      courseId: data.courseId,
      userId: data.userId,
      title: data.title || "",
      body: data.body || "",
    });
    return { id, ...data, createdAt: new Date().toISOString() };
  },

  async deleteDiscussion(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(discussionReplies).where(eq(discussionReplies.discussionId, id));
    await db.delete(discussions).where(eq(discussions.id, id));
    return true;
  },

  async getDiscussionReplies(): Promise<RepositoryDiscussionReply[]> {
    const db = getDb();
    const list = await db.query.discussionReplies.findMany({
      orderBy: [desc(discussionReplies.createdAt)],
    });

    return list.map((r) => ({
      id: r.id,
      discussionId: r.discussionId,
      userId: r.userId,
      body: r.body,
      createdAt: toIso(r.createdAt),
    }));
  },

  async createDiscussionReply(data: {
    discussionId: string;
    userId: string;
    body: string;
  }): Promise<RepositoryDiscussionReply> {
    const id = makeId();
    const db = getDb();
    await db.insert(discussionReplies).values({
      id,
      discussionId: data.discussionId,
      userId: data.userId,
      body: data.body || "",
    });
    return { id, ...data, createdAt: new Date().toISOString() };
  },

  async deleteDiscussionReply(id: string): Promise<boolean> {
    const db = getDb();
    await db.delete(discussionReplies).where(eq(discussionReplies.id, id));
    return true;
  },
};
