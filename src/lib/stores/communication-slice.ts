import { StateCreator } from "zustand";
import type {
  NotificationItem,
  Message,
  Announcement,
  Discussion,
  DiscussionReply,
} from "../types/store";

export interface CommunicationSlice {
  notifications: NotificationItem[];
  messages: Message[];
  announcements: Announcement[];
  discussions: Discussion[];
  discussionReplies: DiscussionReply[];

  markNotificationRead: (id: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  markAllNotifsRead: (userId: string) => void;
  addNotification: (n: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
  sendMessage: (
    fromIdOrObj: string | Omit<Message, "id" | "createdAt" | "read">,
    toId?: string,
    subject?: string,
    body?: string,
  ) => void;
  markMessageRead: (id: string) => void;

  addAnnouncement: (
    courseId: string,
    title: string,
    body: string,
    isPinned?: boolean,
  ) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  addDiscussion: (courseId: string, userId: string, title: string, body: string) => Promise<void>;
  deleteDiscussion: (id: string) => Promise<void>;

  addDiscussionReply: (discussionId: string, userId: string, body: string) => Promise<void>;
  deleteDiscussionReply: (id: string) => Promise<void>;
}

export const createCommunicationSlice: StateCreator<
  CommunicationSlice,
  [],
  [],
  CommunicationSlice
> = (set) => ({
  notifications: [],
  messages: [],
  announcements: [],
  discussions: [],
  discussionReplies: [],

  markNotificationRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    fetch(`/api/notifications/${id}/read`, { method: "PUT" }).catch((err) =>
      console.error("Failed to mark notification read:", err),
    );
  },

  markNotifRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    fetch(`/api/notifications/${id}/read`, { method: "PUT" }).catch((err) =>
      console.error("Failed to mark notification read:", err),
    );
  },

  markAllNotificationsRead: (userId) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    }));
    fetch("/api/notifications/read-all", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch((err) => console.error("Failed to mark all notifications read:", err));
  },

  markAllNotifsRead: (userId) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    }));
    fetch("/api/notifications/read-all", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch((err) => console.error("Failed to mark all notifications read:", err));
  },

  addNotification: (n) => {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(n),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.notification) {
          set((s) => ({ notifications: [data.notification, ...s.notifications] }));
        }
      })
      .catch((err) => console.error("Failed to add notification:", err));
  },

  sendMessage: (fromIdOrObj, toId, subject, body) => {
    const payload =
      typeof fromIdOrObj === "string"
        ? { fromId: fromIdOrObj, toId: toId!, subject: subject!, body: body! }
        : fromIdOrObj;

    fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          set((s) => ({ messages: [data.message, ...s.messages] }));
        }
      })
      .catch((err) => console.error("Failed to send message:", err));
  },

  markMessageRead: (id) => {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)),
    }));
    fetch(`/api/messages/${id}/read`, { method: "PUT" }).catch((err) =>
      console.error("Failed to mark message read:", err),
    );
  },

  addAnnouncement: async (courseId, title, body, isPinned = false) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, title, body, isPinned }),
      });
      const data = await res.json();
      if (data.announcement) {
        set((s) => ({ announcements: [data.announcement, ...s.announcements] }));
      }
    } catch (err) {
      console.error("Failed to add announcement:", err);
    }
  },

  deleteAnnouncement: async (id) => {
    set((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) }));
    fetch(`/api/announcements/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete announcement:", err),
    );
  },

  addDiscussion: async (courseId, userId, title, body) => {
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, userId, title, body }),
      });
      const data = await res.json();
      if (data.discussion) {
        set((s) => ({ discussions: [data.discussion, ...s.discussions] }));
      }
    } catch (err) {
      console.error("Failed to add discussion:", err);
    }
  },

  deleteDiscussion: async (id) => {
    set((s) => ({ discussions: s.discussions.filter((d) => d.id !== id) }));
    fetch(`/api/discussions/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete discussion:", err),
    );
  },

  addDiscussionReply: async (discussionId, userId, body) => {
    try {
      const res = await fetch("/api/discussion-replies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discussionId, userId, body }),
      });
      const data = await res.json();
      if (data.discussionReply) {
        set((s) => ({ discussionReplies: [...s.discussionReplies, data.discussionReply] }));
      }
    } catch (err) {
      console.error("Failed to add discussion reply:", err);
    }
  },

  deleteDiscussionReply: async (id) => {
    set((s) => ({ discussionReplies: s.discussionReplies.filter((r) => r.id !== id) }));
    fetch(`/api/discussion-replies/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete discussion reply:", err),
    );
  },
});
