// In-memory Server Store Sync to guarantee instant 100% data availability
// and smooth local/production fallback for all LMS operations.

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: "admin" | "teacher" | "student";
  avatar?: string | null;
  status: "active" | "inactive";
  joinedAt: string;
  lastActive?: string | null;
  courseIds?: string[];
  group?: string | null;
  isEmailVerified: boolean;
  emailVerificationCode?: string | null;
  phone?: string | null;
  resetPasswordCode?: string | null;
}

export interface ServerMessage {
  id: string;
  fromId: string;
  toId: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ServerNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string | null;
}

// Initial seed users
const defaultAdmin: ServerUser = {
  id: "ADM01",
  name: "Administrator",
  email: "admin@itech.com",
  role: "admin",
  status: "active",
  joinedAt: "2025-01-01T00:00:00.000Z",
  isEmailVerified: true,
};

const defaultTeacher: ServerUser = {
  id: "TCH01",
  name: "Dr. Sarah Jenkins",
  email: "sarah.jenkins@itech.com",
  role: "teacher",
  status: "active",
  joinedAt: "2025-01-01T00:00:00.000Z",
  isEmailVerified: true,
};

class ServerStore {
  private usersMap = new Map<string, ServerUser>();
  private messagesList: ServerMessage[] = [];
  private notificationsList: ServerNotification[] = [];
  private coursesList: any[] = [];
  private certificatesList: any[] = [];
  private assessmentsList: any[] = [];
  private submissionsList: any[] = [];
  private progressMap = new Map<string, string[]>();
  private eventsList: any[] = [];
  private announcementsList: any[] = [];
  private discussionsList: any[] = [];
  private discussionRepliesList: any[] = [];
  private videoCheckpointsList: any[] = [];
  private checkpointProgressList: any[] = [];

  constructor() {
    this.saveUser(defaultAdmin);
    this.saveUser(defaultTeacher);
  }

  // User management
  saveUser(user: ServerUser) {
    const existing = this.usersMap.get(user.id) || Array.from(this.usersMap.values()).find(u => u.email.toLowerCase() === user.email.toLowerCase());
    const finalId = user.id || existing?.id || `STU-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const merged: ServerUser = {
      ...(existing || {}),
      ...user,
      id: finalId,
      email: user.email.toLowerCase().trim(),
    };
    this.usersMap.set(finalId, merged);
    return merged;
  }

  getUserById(id: string) {
    return this.usersMap.get(id) || null;
  }

  getUserByEmail(email: string) {
    const lower = email.toLowerCase().trim();
    return Array.from(this.usersMap.values()).find((u) => u.email.toLowerCase() === lower) || null;
  }

  getAllUsers(): ServerUser[] {
    return Array.from(this.usersMap.values());
  }

  updateUser(id: string, patch: Partial<ServerUser>) {
    const user = this.usersMap.get(id);
    if (user) {
      const updated = { ...user, ...patch };
      this.usersMap.set(id, updated);
      return updated;
    }
    return null;
  }

  deleteUser(id: string) {
    this.usersMap.delete(id);
    this.messagesList = this.messagesList.filter(m => m.fromId !== id && m.toId !== id);
  }

  // Messages
  addMessage(msg: ServerMessage) {
    const existing = this.messagesList.find(m => m.id === msg.id);
    if (!existing) {
      this.messagesList.unshift(msg);
    }
    return msg;
  }

  getMessages(): ServerMessage[] {
    return this.messagesList;
  }

  markMessageRead(id: string) {
    const msg = this.messagesList.find(m => m.id === id);
    if (msg) msg.read = true;
  }

  // Notifications
  addNotification(notif: ServerNotification) {
    const existing = this.notificationsList.find(n => n.id === notif.id);
    if (!existing) {
      this.notificationsList.unshift(notif);
    }
    return notif;
  }

  getNotifications(): ServerNotification[] {
    return this.notificationsList;
  }

  markNotificationRead(id: string) {
    const notif = this.notificationsList.find(n => n.id === id);
    if (notif) notif.read = true;
  }

  markAllNotificationsRead(userId: string) {
    for (const n of this.notificationsList) {
      if (n.userId === userId) n.read = true;
    }
  }

  // Courses
  getCourses() {
    return this.coursesList;
  }

  setCourses(courses: any[]) {
    this.coursesList = courses;
  }

  addCourse(course: any) {
    const existingIndex = this.coursesList.findIndex(c => c.id === course.id);
    if (existingIndex >= 0) {
      this.coursesList[existingIndex] = { ...this.coursesList[existingIndex], ...course };
    } else {
      this.coursesList.push(course);
    }
  }

  // General store getter / setters
  setCertificates(list: any[]) { this.certificatesList = list; }
  getCertificates() { return this.certificatesList; }

  setAssessments(list: any[]) { this.assessmentsList = list; }
  getAssessments() { return this.assessmentsList; }

  setSubmissions(list: any[]) { this.submissionsList = list; }
  getSubmissions() { return this.submissionsList; }

  setEvents(list: any[]) { this.eventsList = list; }
  getEvents() { return this.eventsList; }

  setAnnouncements(list: any[]) { this.announcementsList = list; }
  getAnnouncements() { return this.announcementsList; }

  setDiscussions(list: any[]) { this.discussionsList = list; }
  getDiscussions() { return this.discussionsList; }

  setDiscussionReplies(list: any[]) { this.discussionRepliesList = list; }
  getDiscussionReplies() { return this.discussionRepliesList; }

  setVideoCheckpoints(list: any[]) { this.videoCheckpointsList = list; }
  getVideoCheckpoints() { return this.videoCheckpointsList; }

  setCheckpointProgress(list: any[]) { this.checkpointProgressList = list; }
  getCheckpointProgress() { return this.checkpointProgressList; }
}

// Global singleton across hot-reloads
const globalRef = globalThis as unknown as { __serverStore?: ServerStore };

export const serverStore = globalRef.__serverStore || new ServerStore();
if (process.env.NODE_ENV !== "production") {
  globalRef.__serverStore = serverStore;
}
