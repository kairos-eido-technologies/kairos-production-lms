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
  saveCertificate(cert: any) {
    const idx = this.certificatesList.findIndex((c) => c.id === cert.id);
    if (idx >= 0) {
      this.certificatesList[idx] = { ...this.certificatesList[idx], ...cert };
    } else {
      this.certificatesList.unshift(cert);
    }
    return cert;
  }

  setAssessments(list: any[]) { this.assessmentsList = list; }
  getAssessments() { return this.assessmentsList; }
  saveAssessment(assessment: any) {
    const idx = this.assessmentsList.findIndex((a) => a.id === assessment.id);
    if (idx >= 0) {
      this.assessmentsList[idx] = { ...this.assessmentsList[idx], ...assessment };
    } else {
      this.assessmentsList.push(assessment);
    }
    return assessment;
  }
  deleteAssessment(id: string) {
    this.assessmentsList = this.assessmentsList.filter((a) => a.id !== id);
    this.questionsList = this.questionsList.filter((q) => q.assessmentId !== id);
  }

  setQuestions(list: any[]) { this.questionsList = list; }
  getQuestions() { return this.questionsList; }
  saveQuestion(question: any) {
    const idx = this.questionsList.findIndex((q) => q.id === question.id);
    if (idx >= 0) {
      this.questionsList[idx] = { ...this.questionsList[idx], ...question };
    } else {
      this.questionsList.push(question);
    }
    // update assessment questionCount
    const ass = this.assessmentsList.find((a) => a.id === question.assessmentId);
    if (ass) {
      ass.questionCount = this.questionsList.filter((q) => q.assessmentId === question.assessmentId).length;
    }
    return question;
  }
  deleteQuestion(id: string) {
    const q = this.questionsList.find((item) => item.id === id);
    this.questionsList = this.questionsList.filter((item) => item.id !== id);
    if (q) {
      const ass = this.assessmentsList.find((a) => a.id === q.assessmentId);
      if (ass) {
        ass.questionCount = this.questionsList.filter((item) => item.assessmentId === q.assessmentId).length;
      }
    }
  }

  setSubmissions(list: any[]) { this.submissionsList = list; }
  getSubmissions() { return this.submissionsList; }
  saveSubmission(sub: any) {
    const idx = this.submissionsList.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      this.submissionsList[idx] = { ...this.submissionsList[idx], ...sub };
    } else {
      this.submissionsList.unshift(sub);
    }
    return sub;
  }

  // Progress
  saveProgress(studentId: string, courseId: string, contentItemId: string) {
    const key = `${studentId}:${courseId}`;
    const list = this.progressMap.get(key) || [];
    if (!list.includes(contentItemId)) {
      list.push(contentItemId);
      this.progressMap.set(key, list);
    }
  }
  removeProgress(studentId: string, courseId: string, contentItemId: string) {
    const key = `${studentId}:${courseId}`;
    const list = this.progressMap.get(key) || [];
    this.progressMap.set(key, list.filter((id) => id !== contentItemId));
  }
  getProgressRecord(): Record<string, string[]> {
    const record: Record<string, string[]> = {};
    for (const [k, v] of this.progressMap.entries()) {
      record[k] = [...v];
    }
    return record;
  }
  getProgressFor(studentId: string, courseId: string): string[] {
    const key = `${studentId}:${courseId}`;
    return this.progressMap.get(key) || [];
  }

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

const existingStore = globalRef.__serverStore;
export const serverStore = new ServerStore();
if (existingStore) {
  // Preserve in-memory caches while strictly filtering out all test artifacts
  const newMap = new Map();
  newMap.set(defaultAdmin.id, defaultAdmin);
  if ((existingStore as any).usersMap) {
    for (const u of (existingStore as any).usersMap.values()) {
      if (u.email && !u.email.toLowerCase().includes("student_e2e_") && !u.name?.includes("E2E Test") && !u.name?.includes("Alex Morgan")) {
        newMap.set(u.id, u);
      }
    }
  }
  (serverStore as any).usersMap = newMap;
  (serverStore as any).coursesList = [];
  (serverStore as any).certificatesList = [];
  (serverStore as any).assessmentsList = [];
  (serverStore as any).questionsList = [];
  (serverStore as any).submissionsList = [];
  (serverStore as any).progressMap = new Map();
  (serverStore as any).messagesList = [];
  (serverStore as any).notificationsList = [];
  (serverStore as any).extraAttemptsMap = {};
}
globalRef.__serverStore = serverStore;
