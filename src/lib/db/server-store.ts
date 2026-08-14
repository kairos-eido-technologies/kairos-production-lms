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
  // key = `${studentId}:${assessmentId}`, value = extra attempt count
  private extraAttemptsMap: Record<string, number> = {};

  constructor() {
    this.saveUser(defaultAdmin);
  }

  // User management
  saveUser(user: ServerUser) {
    const existing = this.usersMap.get(user.id) || Array.from(this.usersMap.values()).find(u => u.email.toLowerCase() === user.email.toLowerCase());
    let finalId = user.id || existing?.id;
    if (!finalId) {
      const prefix = user.role === "teacher" ? "TCH" : user.role === "admin" ? "ADM" : "STU";
      const regex = new RegExp(`^${prefix}-?(\\d+)$`, "i");
      let maxNum = 0;
      for (const u of this.usersMap.values()) {
        if (u.role === user.role && u.id) {
          const m = u.id.match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
      finalId = `${prefix}-${maxNum + 1}`;
    }
    const merged: ServerUser = {
      ...(existing || {}),
      ...user,
      id: finalId,
      email: user.email.toLowerCase().trim(),
      passwordHash: user.passwordHash || existing?.passwordHash,
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
      const updated = {
        ...user,
        ...patch,
        passwordHash: patch.passwordHash || user.passwordHash,
      };
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
      if (this.messagesList.length > 1000) {
        this.messagesList = this.messagesList.slice(0, 1000);
      }
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
      if (this.notificationsList.length > 1000) {
        this.notificationsList = this.notificationsList.slice(0, 1000);
      }
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
  addEvent(event: any) {
    this.eventsList = this.eventsList.filter(e => e.id !== event.id);
    this.eventsList.unshift(event);
  }
  deleteEvent(id: string) {
    this.eventsList = this.eventsList.filter(e => e.id !== id);
  }

  setAnnouncements(list: any[]) { this.announcementsList = list; }
  getAnnouncements() { return this.announcementsList; }
  addAnnouncement(ann: any) {
    this.announcementsList = this.announcementsList.filter(a => a.id !== ann.id);
    this.announcementsList.unshift(ann);
  }
  deleteAnnouncement(id: string) {
    this.announcementsList = this.announcementsList.filter(a => a.id !== id);
  }

  setDiscussions(list: any[]) { this.discussionsList = list; }
  getDiscussions() { return this.discussionsList; }
  addDiscussion(disc: any) {
    this.discussionsList = this.discussionsList.filter(d => d.id !== disc.id);
    this.discussionsList.unshift(disc);
  }
  deleteDiscussion(id: string) {
    this.discussionsList = this.discussionsList.filter(d => d.id !== id);
  }

  setDiscussionReplies(list: any[]) { this.discussionRepliesList = list; }
  getDiscussionReplies() { return this.discussionRepliesList; }
  addDiscussionReply(reply: any) {
    this.discussionRepliesList = this.discussionRepliesList.filter(r => r.id !== reply.id);
    this.discussionRepliesList.push(reply);
  }
  deleteDiscussionReply(id: string) {
    this.discussionRepliesList = this.discussionRepliesList.filter(r => r.id !== id);
  }

  setVideoCheckpoints(list: any[]) { this.videoCheckpointsList = list; }
  getVideoCheckpoints() { return this.videoCheckpointsList; }
  saveVideoCheckpoint(vc: any) {
    this.videoCheckpointsList = this.videoCheckpointsList.filter(v => v.id !== vc.id);
    this.videoCheckpointsList.push(vc);
  }
  deleteVideoCheckpoint(id: string) {
    this.videoCheckpointsList = this.videoCheckpointsList.filter(v => v.id !== id);
  }

  setCheckpointProgress(list: any[]) { this.checkpointProgressList = list; }
  getCheckpointProgress() { return this.checkpointProgressList; }
  saveCheckpointProgress(cp: any) {
    this.checkpointProgressList = this.checkpointProgressList.filter(c => !(c.studentId === cp.studentId && c.checkpointId === cp.checkpointId));
    this.checkpointProgressList.push(cp);
  }

  // Extra Attempts
  getExtraAttempts(): Record<string, number> {
    return { ...this.extraAttemptsMap };
  }

  addExtraAttempt(studentId: string, assessmentId: string, count: number) {
    const key = `${studentId}:${assessmentId}`;
    this.extraAttemptsMap[key] = (this.extraAttemptsMap[key] ?? 0) + count;
    return this.extraAttemptsMap[key];
  }

  getExtraAttemptCount(studentId: string, assessmentId: string): number {
    const key = `${studentId}:${assessmentId}`;
    return this.extraAttemptsMap[key] ?? 0;
  }

  resetExtraAttempts(studentId: string, assessmentId: string) {
    const key = `${studentId}:${assessmentId}`;
    delete this.extraAttemptsMap[key];
  }
}

// Global singleton across hot-reloads
const globalRef = globalThis as unknown as { __serverStore?: ServerStore };

export const serverStore = globalRef.__serverStore || new ServerStore();
if (process.env.NODE_ENV !== "production") {
  globalRef.__serverStore = serverStore;
}
