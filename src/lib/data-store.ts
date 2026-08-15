import { create } from "zustand";
import type {
  User, Role, Course, Section, ContentItem, ContentType,
  Assessment, Certificate, NotificationItem, Message, TechBadge,
} from "./mock-data";

// ---------- Extended types ----------
export type QuestionType = "mcq" | "truefalse" | "short";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  points: number;
  imageUrl?: string;
}

export interface VideoCheckpoint {
  id: string;
  contentItemId: string;
  timestamp: number; // in seconds
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  correctIndex: number | null;
  correctText: string | null;
}

export interface CheckpointProgress {
  id: string;
  studentId: string;
  checkpointId: string;
  isCorrect: boolean;
  answeredAt: string;
}

export interface StoreAssessment extends Assessment {
  questions: Question[];
}

export interface SubmissionResponse {
  questionId: string;
  response: string;
  awarded: number | null;
}

export interface ProctorEventRecord { at: string; type: string; detail?: string; }

export interface Submission {
  id: string;
  assessmentId: string;
  studentId: string;
  submittedAt: string;
  responses: SubmissionResponse[];
  status: "submitted" | "graded";
  feedback?: string;
  proctorEvents?: ProctorEventRecord[];
}

export interface CalendarEvent {
  id: string;
  courseId: string | null;
  title: string;
  description: string | null;
  eventDate: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  courseId: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

export interface Discussion {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export const INACTIVITY_THRESHOLD_DAYS = 2;

export function getLastActiveDate(user: User): Date | null {
  if (!user.lastActive) return null;
  const date = new Date(user.lastActive);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isUserInactive(user: User, thresholdDays = INACTIVITY_THRESHOLD_DAYS): boolean {
  const lastActive = getLastActiveDate(user);
  const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;
  if (!lastActive) {
    const joined = user.joinedAt ? new Date(user.joinedAt) : new Date();
    return joined.getTime() < cutoff;
  }
  return lastActive.getTime() < cutoff;
}

export function formatLastActive(user: User): string {
  const lastActive = getLastActiveDate(user);
  if (!lastActive) return "Never";
  const diffMs = Date.now() - lastActive.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 2) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

export function formatIdleDuration(user: User): string {
  const lastActive = getLastActiveDate(user);
  if (!lastActive) return "Never logged in";
  const diffDays = Math.floor((Date.now() - lastActive.getTime()) / 86_400_000);
  if (diffDays < 1) return "< 1 day";
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function generateCertificateId(existingCerts: Certificate[]): string {
  const year = new Date().getFullYear();
  const prefix = `ITECH-${year}-`;
  let maxSeq = 0;
  for (const c of existingCerts ?? []) {
    if (c && c.id && c.id.toUpperCase().startsWith(prefix)) {
      const parts = c.id.toUpperCase().split("-");
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

export function normalizeCertificateList(list: Certificate[]): Certificate[] {
  let seq = 1;
  const year = new Date().getFullYear();
  const mapId = new Map<string, string>();

  return (list || []).map((c) => {
    if (!c || !c.id) return c;
    const upperId = c.id.toUpperCase();
    if (/^ITECH-\d{4}-\d{4}$/.test(upperId)) {
      return { ...c, id: upperId };
    }
    if (!mapId.has(c.id)) {
      const newId = `ITECH-${year}-${String(seq++).padStart(4, "0")}`;
      mapId.set(c.id, newId);
    }
    return { ...c, id: mapId.get(c.id)! };
  });
}

// Seed users = start with an empty user list; auth is handled through the backend.
const seedUsers: User[] = [];

// Seed courses (disabled/empty to run purely on database)
const seedCourses: Course[] = [];

interface DataState {
  users: User[];
  courses: Course[];
  assessments: StoreAssessment[];
  submissions: Submission[];
  certificates: Certificate[];
  notifications: NotificationItem[];
  messages: Message[];
  // progress: completed item ids per student/course; key = `${studentId}:${courseId}`
  progress: Record<string, string[]>;
  events: CalendarEvent[];
  announcements: Announcement[];
  discussions: Discussion[];
  discussionReplies: DiscussionReply[];
  videoCheckpoints: VideoCheckpoint[];
  checkpointProgress: CheckpointProgress[];

  // checkpoint actions
  addCheckpoint: (checkpoint: Omit<VideoCheckpoint, "id"> & { id?: string }) => Promise<void>;
  deleteCheckpoint: (id: string) => Promise<void>;
  submitCheckpointAnswer: (studentId: string, checkpointId: string, isCorrect: boolean) => Promise<void>;

  // calendar events
  addEvent: (courseId: string | null, title: string, description: string | null, eventDate: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // announcements
  addAnnouncement: (courseId: string, title: string, body: string, isPinned?: boolean) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  // discussions
  addDiscussion: (courseId: string, userId: string, title: string, body: string) => Promise<void>;
  deleteDiscussion: (id: string) => Promise<void>;

  // discussion replies
  addDiscussionReply: (discussionId: string, userId: string, body: string) => Promise<void>;
  deleteDiscussionReply: (id: string) => Promise<void>;

  // users
  addUser: (u: Omit<User, "id">) => void;
  addUserRaw: (u: User) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // courses
  addCourse: (c: Omit<Course, "id" | "sections" | "studentIds"> & { studentIds?: string[] }) => void;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  assignCourse: (studentId: string, courseId: string, accessMode: "lifetime" | "limited", endDate?: string) => Promise<void>;
  revokeCourse: (studentId: string, courseId: string) => Promise<void>;

  addSection: (courseId: string, title: string) => void;
  updateSection: (courseId: string, sectionId: string, title: string) => void;
  deleteSection: (courseId: string, sectionId: string) => void;
  addItem: (courseId: string, sectionId: string, item: Omit<ContentItem, "id">) => void;
  updateItem: (courseId: string, sectionId: string, itemId: string, patch: Partial<ContentItem>) => void;
  deleteItem: (courseId: string, sectionId: string, itemId: string) => void;

  // assessments
  addAssessment: (a: Omit<StoreAssessment, "id" | "questions" | "questionCount">) => string;
  updateAssessment: (id: string, patch: Partial<StoreAssessment>) => void;
  deleteAssessment: (id: string) => void;
  addQuestion: (assessmentId: string, q: Omit<Question, "id">) => void;
  addQuestionsBatch: (assessmentId: string, questions: Omit<Question, "id">[]) => Promise<void>;
  updateQuestion: (assessmentId: string, questionId: string, patch: Partial<Question>) => void;
  deleteQuestion: (assessmentId: string, questionId: string) => void;

  // submissions
  submitQuiz: (assessmentId: string, studentId: string, answers: Record<string, string>, proctorEvents?: ProctorEventRecord[]) => string;
  gradeSubmission: (submissionId: string, awards: Record<string, number>, feedback?: string) => void;
  resetStudentSubmissions: (assessmentId: string, studentId: string) => Promise<void>;
  extraAttempts: Record<string, number>;
  grantExtraAttempt: (assessmentId: string, studentId: string, count?: number) => void;
  loadExtraAttempts: (map: Record<string, number>) => void;

  // certificates
  requestCertificate: (studentId: string, courseId: string, score: number, note?: string, proctorLog?: ProctorEventRecord[]) => void;
  approveCertificate: (id: string) => void;
  rejectCertificate: (id: string, reason?: string) => void;
  issueCertificateDirectly: (studentId: string, courseId: string, score: number, note?: string) => string;

  // progress
  markItemComplete: (studentId: string, courseId: string, itemId: string) => void;
  unmarkItemComplete: (studentId: string, courseId: string, itemId: string) => void;

  // notifications
  notify: (userId: string, title: string, message: string, link?: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: (userId: string) => void;

  // messages
  sendMessage: (fromId: string, toId: string, subject: string, body: string) => void;
  markMessageRead: (id: string) => void;

  resetData: () => void;
}

const initial = {
  users: seedUsers,
  courses: seedCourses,
  assessments: [] as StoreAssessment[],
  submissions: [] as Submission[],
  certificates: [] as Certificate[],
  notifications: [] as NotificationItem[],
  messages: [] as Message[],
  progress: {} as Record<string, string[]>,
  events: [] as CalendarEvent[],
  announcements: [] as Announcement[],
  discussions: [] as Discussion[],
  discussionReplies: [] as DiscussionReply[],
  videoCheckpoints: [] as VideoCheckpoint[],
  checkpointProgress: [] as CheckpointProgress[],
};

function ensureSeedCourses(courses: unknown): Course[] {
  const list = Array.isArray(courses) ? (courses as Course[]) : [];
  return seedCourses.reduce<Course[]>((acc, seed) => {
    const existing = acc.find((c) => c.id === seed.id);
    if (!existing) return [seed, ...acc];
    return acc.map((c) => {
      if (c.id !== seed.id) return c;
      return {
        ...seed,
        ...c,
        studentIds: Array.from(new Set([...(seed.studentIds ?? []), ...((c.studentIds ?? []) as string[])])),
        sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : seed.sections,
        accessMode: c.accessMode ?? seed.accessMode,
        status: c.status ?? seed.status,
      };
    });
  }, list);
}

const syncQuestionCount = (a: StoreAssessment): StoreAssessment => ({ ...a, questionCount: a.questions.length });

// Auto-issue a certificate request if the student passed and doesn't already have one
function maybeRequestCert(get: () => DataState, studentId: string, courseId: string, score: number, proctorLog?: ProctorEventRecord[]) {
  const existing = get().certificates.find(
    (c) => c.studentId === studentId && c.courseId === courseId && c.status !== "rejected",
  );
  if (existing) return;
  get().requestCertificate(studentId, courseId, score, "Auto-generated from passing final exam.", proctorLog);
}

export const useData = create<DataState>()((set, get) => ({
      ...initial,

      addCheckpoint: async (checkpoint) => {
        const id = checkpoint.id || uid("ch");
        const payload = { ...checkpoint, id };
        try {
          const resp = await fetch("/api/video-checkpoints", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error("Failed to save checkpoint");
          const json = await resp.json();
          const created = json.videoCheckpoint;
          set((s) => ({
            videoCheckpoints: [
              ...s.videoCheckpoints.filter((x) => x.id !== id),
              created,
            ],
          }));
        } catch (err) {
          console.error("addCheckpoint error", err);
          set((s) => ({
            videoCheckpoints: [
              ...s.videoCheckpoints.filter((x) => x.id !== id),
              { ...checkpoint, id } as VideoCheckpoint,
            ],
          }));
        }
      },

      deleteCheckpoint: async (id) => {
        try {
          await fetch(`/api/video-checkpoints/${encodeURIComponent(id)}`, { method: "DELETE" });
          set((s) => ({
            videoCheckpoints: s.videoCheckpoints.filter((x) => x.id !== id),
            checkpointProgress: s.checkpointProgress.filter((x) => x.checkpointId !== id),
          }));
        } catch (err) {
          console.error("deleteCheckpoint error", err);
          set((s) => ({
            videoCheckpoints: s.videoCheckpoints.filter((x) => x.id !== id),
            checkpointProgress: s.checkpointProgress.filter((x) => x.checkpointId !== id),
          }));
        }
      },

      submitCheckpointAnswer: async (studentId, checkpointId, isCorrect) => {
        const id = uid("chp");
        const payload = { studentId, checkpointId, isCorrect, id };
        try {
          const resp = await fetch("/api/checkpoint-progress", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error("Failed to save checkpoint progress");
          const json = await resp.json();
          const created = json.checkpointProgress;
          set((s) => ({
            checkpointProgress: [
              ...s.checkpointProgress.filter((x) => !(x.studentId === studentId && x.checkpointId === checkpointId)),
              created,
            ],
          }));
        } catch (err) {
          console.error("submitCheckpointAnswer error", err);
          set((s) => ({
            checkpointProgress: [
              ...s.checkpointProgress.filter((x) => !(x.studentId === studentId && x.checkpointId === checkpointId)),
              { id, studentId, checkpointId, isCorrect, answeredAt: new Date().toISOString() },
            ],
          }));
        }
      },

      addUser: (u) => {
        (async () => {
          try {
            const id = uid("u");
            const payload = { ...u, id };
            const resp = await fetch('/api/users', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error('Failed to create user');
            const json = await resp.json();
            const user = json.user;
            set((s) => ({ users: [ { ...user, courseIds: [] }, ...s.users ] }));
          } catch (err) {
            console.error('addUser error', err);
            set((s) => ({ users: [{ ...u, id: uid("u"), lastActive: u.lastActive ?? null, courseIds: [] }, ...s.users] }));
          }
        })();
      },
      addUserRaw: (u) => set((s) => ({ users: [u, ...s.users.filter((x) => x.id !== u.id)] })),
      updateUser: (id, patch) => {
        (async () => {
          try {
            const resp = await fetch(`/api/users/${encodeURIComponent(id)}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(patch)
            });
            if (!resp.ok) throw new Error('Failed to update user');
            const json = await resp.json();
            const user = json.user;
            set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...user } : x)) }));
          } catch (err) {
            console.error('updateUser error', err);
            set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          }
        })();
      },
      deleteUser: (id) => {
        (async () => {
          try {
            await fetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
            set((s) => ({
              users: s.users.filter((x) => x.id !== id),
              courses: s.courses.map((c) => ({
                ...c,
                studentIds: c.studentIds.filter((sid) => sid !== id),
                teacherId: c.teacherId === id ? "" : c.teacherId,
              })),
            }));
          } catch (err) {
            console.error('deleteUser error', err);
            set((s) => ({
              users: s.users.filter((x) => x.id !== id),
              courses: s.courses.map((c) => ({
                ...c,
                studentIds: c.studentIds.filter((sid) => sid !== id),
                teacherId: c.teacherId === id ? "" : c.teacherId,
              })),
            }));
          }
        })();
      },

      addCourse: (c) => {
        (async () => {
          try {
            const resp = await fetch('/api/courses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c) });
            if (!resp.ok) throw new Error('Failed to create course');
            const json = await resp.json();
            const course = json.course;
            set((s) => ({ courses: [ { ...course, sections: course.sections ?? [] }, ...s.courses ] }));
          } catch (err) {
            console.error('addCourse error', err);
            // fallback to local change
            set((s) => ({ courses: [{ ...c, id: uid('c'), sections: [], studentIds: c.studentIds ?? [] }, ...s.courses] }));
          }
        })();
      },
      updateCourse: (id, patch) => {
        (async () => {
          try {
            const resp = await fetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
            if (!resp.ok) throw new Error('Failed to update course');
            const json = await resp.json();
            const course = json.course;
            set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...course } : c)) }));
          } catch (err) {
            console.error('updateCourse error', err);
            set((s) => ({ courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
          }
        })();
      },
      deleteCourse: (id) => {
        (async () => {
          try {
            await fetch(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' });
            set((s) => ({
              courses: s.courses.filter((c) => c.id !== id),
              assessments: s.assessments.filter((a) => a.courseId !== id),
              certificates: s.certificates.filter((cert) => cert.courseId !== id),
            }));
          } catch (err) {
            console.error('deleteCourse error', err);
            set((s) => ({
              courses: s.courses.filter((c) => c.id !== id),
              assessments: s.assessments.filter((a) => a.courseId !== id),
              certificates: s.certificates.filter((cert) => cert.courseId !== id),
            }));
          }
        })();
      },
      assignCourse: async (studentId, courseId, accessMode, endDate) => {
        try {
          const resp = await fetch("/api/enrollments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ studentId, courseId, accessMode, endDate }),
          });
          if (!resp.ok) throw new Error("Failed to assign course");
          set((s) => ({
            courses: s.courses.map((c) => {
              if (c.id !== courseId) return c;
              const studentIds = c.studentIds.includes(studentId)
                ? c.studentIds
                : [...c.studentIds, studentId];
              const studentAccess = {
                ...(c.studentAccess ?? {}),
                [studentId]: { accessMode, endDate },
              };
              return { ...c, studentIds, studentAccess };
            }),
          }));
        } catch (err) {
          console.error("assignCourse error", err);
          set((s) => ({
            courses: s.courses.map((c) => {
              if (c.id !== courseId) return c;
              const studentIds = c.studentIds.includes(studentId)
                ? c.studentIds
                : [...c.studentIds, studentId];
              const studentAccess = {
                ...(c.studentAccess ?? {}),
                [studentId]: { accessMode, endDate },
              };
              return { ...c, studentIds, studentAccess };
            }),
          }));
        }
      },
      revokeCourse: async (studentId, courseId) => {
        try {
          const resp = await fetch(`/api/enrollments?studentId=${encodeURIComponent(studentId)}&courseId=${encodeURIComponent(courseId)}`, {
            method: "DELETE",
          });
          if (!resp.ok) throw new Error("Failed to revoke course assignment");
          set((s) => ({
            courses: s.courses.map((c) => {
              if (c.id !== courseId) return c;
              const studentIds = c.studentIds.filter((sid) => sid !== studentId);
              const studentAccess = { ...(c.studentAccess ?? {}) };
              delete studentAccess[studentId];
              return { ...c, studentIds, studentAccess };
            }),
          }));
        } catch (err) {
          console.error("revokeCourse error", err);
          set((s) => ({
            courses: s.courses.map((c) => {
              if (c.id !== courseId) return c;
              const studentIds = c.studentIds.filter((sid) => sid !== studentId);
              const studentAccess = { ...(c.studentAccess ?? {}) };
              delete studentAccess[studentId];
              return { ...c, studentIds, studentAccess };
            }),
          }));
        }
      },

      addSection: (courseId, title) => {
        (async () => {
          try {
            const resp = await fetch('/api/sections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ courseId, title }) });
            const json = await resp.json();
            const sec = json.section;
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: [...c.sections, { ...sec, items: [] }] } : c) }));
          } catch (err) {
            console.error('addSection error', err);
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: [...c.sections, { id: uid('sec'), title, items: [] }] } : c) }));
          }
        })();
      },
      updateSection: (courseId, sectionId, title) => {
        (async () => {
          try {
            const resp = await fetch(`/api/sections/${encodeURIComponent(sectionId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) });
            const json = await resp.json();
            const sec = json.section;
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec2) => sec2.id === sectionId ? { ...sec2, ...sec } : sec2) } : c) }));
          } catch (err) {
            console.error('updateSection error', err);
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, title } : sec) } : c) }));
          }
        })();
      },
      deleteSection: (courseId, sectionId) => {
        (async () => {
          try {
            await fetch(`/api/sections/${encodeURIComponent(sectionId)}`, { method: 'DELETE' });
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.filter((sec) => sec.id !== sectionId) } : c) }));
          } catch (err) {
            console.error('deleteSection error', err);
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.filter((sec) => sec.id !== sectionId) } : c) }));
          }
        })();
      },
      addItem: (courseId, sectionId, item) => {
        (async () => {
          try {
            const payload = { sectionId, type: item.type, title: item.title, body: item.body, url: item.url, fileName: item.fileName, duration: item.duration, fileSize: item.fileSize, assessmentId: item.assessmentId };
            const resp = await fetch('/api/content-items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
            const json = await resp.json();
            const it = json.item;
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, items: [...sec.items, it] } : sec) } : c) }));
          } catch (err) {
            console.error('addItem error', err);
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, items: [...sec.items, { ...item, id: uid('itm') }] } : sec) } : c) }));
          }
        })();
      },
      updateItem: (courseId, sectionId, itemId, patch) => {
        (async () => {
          try {
            const resp = await fetch(`/api/content-items/${encodeURIComponent(itemId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
            const json = await resp.json();
            const it = json.item;
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, items: sec.items.map((i) => i.id === itemId ? it : i) } : sec) } : c) }));
          } catch (err) {
            console.error('updateItem error', err);
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, items: sec.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) } : sec) } : c) }));
          }
        })();
      },
      deleteItem: (courseId, sectionId, itemId) => {
        (async () => {
          try {
            await fetch(`/api/content-items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, items: sec.items.filter((it) => it.id !== itemId) } : sec) } : c) }));
          } catch (err) {
            console.error('deleteItem error', err);
            set((s) => ({ courses: s.courses.map((c) => c.id === courseId ? { ...c, sections: c.sections.map((sec) => sec.id === sectionId ? { ...sec, items: sec.items.filter((it) => it.id !== itemId) } : sec) } : c) }));
          }
        })();
      },

      addAssessment: (a) => {
        const id = uid("a");
        (async () => {
          try {
            await fetch("/api/assessments", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...a, id }),
            });
          } catch (err) {
            console.error("addAssessment error", err);
          }
        })();
        set((s) => ({ assessments: [{ ...a, id, questions: [], questionCount: 0 }, ...s.assessments] }));
        return id;
      },
      updateAssessment: (id, patch) => {
        (async () => {
          try {
            await fetch(`/api/assessments/${encodeURIComponent(id)}`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(patch),
            });
          } catch (err) {
            console.error("updateAssessment error", err);
          }
        })();
        set((s) => ({ assessments: s.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },
      deleteAssessment: (id) => {
        (async () => {
          try {
            await fetch(`/api/assessments/${encodeURIComponent(id)}`, {
              method: "DELETE",
            });
          } catch (err) {
            console.error("deleteAssessment error", err);
          }
        })();
        set((s) => ({
          assessments: s.assessments.filter((a) => a.id !== id),
          submissions: s.submissions.filter((sub) => sub.assessmentId !== id),
        }));
      },
      addQuestion: (assessmentId, q) => {
        const id = uid("q");
        (async () => {
          try {
            await fetch("/api/questions", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ...q, id, assessmentId }),
            });
          } catch (err) {
            console.error("addQuestion error", err);
          }
        })();
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId ? syncQuestionCount({ ...a, questions: [...a.questions, { ...q, id }] }) : a,
          ),
        }));
      },
      addQuestionsBatch: async (assessmentId, qs) => {
        const qsWithIds = qs.map((q) => ({ ...q, id: uid("q") }));
        try {
          const resp = await fetch("/api/questions/batch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ assessmentId, questions: qsWithIds }),
          });
          if (!resp.ok) throw new Error("Failed to batch insert questions");
          const json = await resp.json();
          if (json.questions) {
            set((s) => ({
              assessments: s.assessments.map((a) =>
                a.id === assessmentId
                  ? syncQuestionCount({
                      ...a,
                      questions: [
                        ...a.questions.filter((existing) => !qsWithIds.some((newQ) => newQ.id === existing.id)),
                        ...json.questions,
                      ],
                    })
                  : a
              ),
            }));
            return;
          }
        } catch (err) {
          console.error("addQuestionsBatch error", err);
        }
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId
              ? syncQuestionCount({ ...a, questions: [...a.questions, ...qsWithIds] })
              : a
          ),
        }));
      },
      updateQuestion: (assessmentId, questionId, patch) => {
        (async () => {
          try {
            await fetch(`/api/questions/${encodeURIComponent(questionId)}`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(patch),
            });
          } catch (err) {
            console.error("updateQuestion error", err);
          }
        })();
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId
              ? { ...a, questions: a.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
              : a,
          ),
        }));
      },
      deleteQuestion: (assessmentId, questionId) => {
        (async () => {
          try {
            await fetch(`/api/questions/${encodeURIComponent(questionId)}`, {
              method: "DELETE",
            });
          } catch (err) {
            console.error("deleteQuestion error", err);
          }
        })();
        set((s) => ({
          assessments: s.assessments.map((a) =>
            a.id === assessmentId
              ? syncQuestionCount({ ...a, questions: a.questions.filter((q) => q.id !== questionId) })
              : a,
          ),
        }));
      },

      submitQuiz: (assessmentId, studentId, answers, proctorEvents) => {
        const a = get().assessments.find((x) => x.id === assessmentId);
        if (!a) return "";
        const responses: SubmissionResponse[] = a.questions.map((q) => {
          const response = answers[q.id] ?? "";
          if (q.type === "mcq" || q.type === "truefalse") {
            const correct = String(q.correctIndex) === response;
            return { questionId: q.id, response, awarded: correct ? q.points : 0 };
          }
          return { questionId: q.id, response, awarded: null };
        });
        const needsGrading = responses.some((r) => r.awarded === null);
        const id = uid("sub");
        const sub: Submission = {
          id,
          assessmentId,
          studentId,
          submittedAt: new Date().toISOString(),
          responses,
          status: needsGrading ? "submitted" : "graded",
          proctorEvents,
        };

        (async () => {
          try {
            await fetch("/api/submissions", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(sub),
            });
          } catch (err) {
            console.error("submitQuiz error", err);
          }
        })();

        set((s) => ({ submissions: [sub, ...s.submissions] }));

        const course = get().courses.find((c) => c.id === a.courseId);
        if (course?.teacherId) {
          get().notify(course.teacherId, "New quiz submission", `A student submitted "${a.title}".`);
        }
        if (!needsGrading) {
          const earned = responses.reduce((sum, r) => sum + (r.awarded ?? 0), 0);
          const max = a.questions.reduce((sum, q) => sum + q.points, 0);
          const pct = max ? Math.round((earned / max) * 100) : 0;
          get().notify(studentId, "Quiz auto-graded", `${a.title}: ${pct}% (${earned}/${max}).`);
          if (pct >= a.passingScore && a.isFinal) maybeRequestCert(get, studentId, a.courseId, pct, proctorEvents);
        }
        return id;
      },

      gradeSubmission: (submissionId, awards, feedback) => {
        (async () => {
          try {
            await fetch(`/api/submissions/${encodeURIComponent(submissionId)}/grade`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ awards, feedback }),
            });
          } catch (err) {
            console.error("gradeSubmission error", err);
          }
        })();

        set((s) => {
          const updated = s.submissions.map((sub) =>
            sub.id === submissionId
              ? {
                  ...sub,
                  status: "graded" as const,
                  feedback,
                  responses: sub.responses.map((r) =>
                    r.questionId in awards ? { ...r, awarded: awards[r.questionId] } : r,
                  ),
                }
              : sub,
          );
          const sub = updated.find((x) => x.id === submissionId);
          if (sub) {
            const a = s.assessments.find((x) => x.id === sub.assessmentId);
            const earned = sub.responses.reduce((acc, r) =>
              acc + (r.questionId in awards ? awards[r.questionId] : (r.awarded ?? 0)), 0);
            const max = a ? a.questions.reduce((sum, q) => sum + q.points, 0) : 0;
            const pct = max ? Math.round((earned / max) * 100) : 0;
            const note: NotificationItem = {
              id: uid("n"),
              userId: sub.studentId,
              title: "Quiz graded",
              message: `Your submission scored ${pct}% (${earned}/${max}).`,
              createdAt: new Date().toISOString(),
              read: false,
            };
            if (a && a.isFinal && pct >= a.passingScore) {
              setTimeout(() => maybeRequestCert(get, sub.studentId, a.courseId, pct, sub.proctorEvents), 0);
            }
            get().notify(sub.studentId, "Quiz graded", `Your submission scored ${pct}% (${earned}/${max}).`);
            return { submissions: updated };
          }
          return { submissions: updated };
        });
      },

      extraAttempts: {},
      grantExtraAttempt: (assessmentId, studentId, count = 1) => {
        const key = `${studentId}:${assessmentId}`;
        // Persist to server immediately
        fetch("/api/extra-attempts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ studentId, assessmentId, count }),
        }).catch((err) => console.error("grantExtraAttempt API error", err));

        set((s) => ({
          extraAttempts: {
            ...s.extraAttempts,
            [key]: (s.extraAttempts[key] ?? 0) + count,
          },
        }));
        const student = get().users.find((u) => u.id === studentId);
        const a = get().assessments.find((x) => x.id === assessmentId);
        if (student && a) {
          get().notify(studentId, "Extra Quiz Attempt Granted", `You have been granted +${count} extra attempt for "${a.title}".`);
        }
      },

      loadExtraAttempts: (map) => set({ extraAttempts: map }),

      resetStudentSubmissions: async (assessmentId, studentId) => {
        try {
          const resp = await fetch("/api/reset-submissions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ studentId, assessmentId }),
          });
          if (!resp.ok) throw new Error("Failed to reset submissions");
        } catch (err) {
          console.error("resetStudentSubmissions error", err);
        }
        // Always update local state regardless of API outcome
        set((s) => ({
          submissions: s.submissions.filter(
            (sub) => !(sub.studentId === studentId && sub.assessmentId === assessmentId)
          ),
          extraAttempts: (() => {
            const key = `${studentId}:${assessmentId}`;
            const updated = { ...s.extraAttempts };
            delete updated[key];
            return updated;
          })(),
        }));
      },

      requestCertificate: (studentId, courseId, score, note, proctorLog) => {

        const id = generateCertificateId(get().certificates);
        const cert: Certificate = {
          id, studentId, courseId, score,
          status: "pending",
          requestedAt: new Date().toISOString().slice(0, 10),
          teacherNote: note,
          proctorLog,
        };
        (async () => {
          try {
            const resp = await fetch("/api/certificates", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(cert),
            });
            if (!resp.ok) throw new Error("Failed to save certificate request");
            const json = await resp.json();
            const created = json.certificate ?? cert;
            set((s) => ({ certificates: [created, ...s.certificates] }));
          } catch (err) {
            console.error("requestCertificate error", err);
            set((s) => ({ certificates: [cert, ...s.certificates] }));
          }
        })();
        const susTypes = ["fullscreen_exit","tab_blur","visibility_hidden","copy","paste","context_menu","key_meta","camera_denied","camera_ended","multiple_faces","camera_motion"];
        const sus = (proctorLog ?? []).filter((e) => susTypes.includes(e.type)).length;
        const msg = sus > 0
          ? `New certificate request — ${sus} suspicious proctor event${sus === 1 ? "" : "s"} flagged.`
          : "A new certificate request is awaiting review.";
        get().users.filter((u) => u.role === "admin").forEach((a) => get().notify(a.id, "Certificate request", msg, "/admin/certificates"));
        const course = get().courses.find((c) => c.id === courseId);
        if (course?.teacherId) get().notify(course.teacherId, "Certificate request submitted", msg, "/teacher/certificates");
      },
      approveCertificate: (id) =>
        set((s) => {
          const updated = s.certificates.map((c) =>
            c.id === id ? { ...c, status: "approved" as const, issuedAt: new Date().toISOString().slice(0, 10) } : c,
          );
          (async () => {
            try {
              await fetch(`/api/certificates/${id}/approve`, { method: "PUT" });
            } catch (err) {
              console.error("approveCertificate error", err);
            }
          })();
          const cert = updated.find((c) => c.id === id);
          const notes = cert
            ? [
                {
                  id: uid("n"),
                  userId: cert.studentId,
                  title: "Certificate approved",
                  message: "Your certificate has been approved — download it now.",
                  createdAt: new Date().toISOString(),
                  read: false,
                  link: "/student/certificates",
                } as NotificationItem,
                ...s.notifications,
              ]
            : s.notifications;
          return { certificates: updated, notifications: notes };
        }),
      rejectCertificate: (id, reason) =>
        set((s) => {
          const updated = s.certificates.map((c) =>
            c.id === id ? { ...c, status: "rejected" as const, rejectionReason: reason } : c,
          );
          (async () => {
            try {
              await fetch(`/api/certificates/${id}/reject`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reason }),
              });
            } catch (err) {
              console.error("rejectCertificate error", err);
            }
          })();
          const cert = updated.find((c) => c.id === id);
          const notes = cert
            ? [
                {
                  id: uid("n"),
                  userId: cert.studentId,
                  title: "Certificate request declined",
                  message: reason || "Your certificate request was declined.",
                  createdAt: new Date().toISOString(),
                  read: false,
                } as NotificationItem,
                ...s.notifications,
              ]
            : s.notifications;
          return { certificates: updated, notifications: notes };
        }),
      issueCertificateDirectly: (studentId, courseId, score, note) => {
        const today = new Date().toISOString().slice(0, 10);
        const id = generateCertificateId(get().certificates);
        const cert: Certificate = {
          id,
          studentId,
          courseId,
          score,
          status: "approved",
          requestedAt: today,
          issuedAt: today,
          teacherNote: note || "Issued by Administrator",
        };
        (async () => {
          try {
            await fetch("/api/certificates", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(cert),
            });
          } catch (err) {
            console.error("issueCertificateDirectly error", err);
          }
        })();
        set((s) => ({ certificates: [cert, ...s.certificates] }));
        get().notify(studentId, "Certificate Issued", `You have been issued a certificate. ID: ${id}`, "/student/certificates");
        return id;
      },

      markItemComplete: (studentId, courseId, itemId) => {
        (async () => {
          try {
            await fetch("/api/progress", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ studentId, courseId, contentItemId: itemId }),
            });
          } catch (err) {
            console.error("markItemComplete error", err);
          }
        })();
        set((s) => {
          const key = `${studentId}:${courseId}`;
          const existing = s.progress[key] ?? [];
          if (existing.includes(itemId)) return s;
          return { progress: { ...s.progress, [key]: [...existing, itemId] } };
        });
      },
      unmarkItemComplete: (studentId, courseId, itemId) => {
        (async () => {
          try {
            await fetch(`/api/progress?studentId=${encodeURIComponent(studentId)}&courseId=${encodeURIComponent(courseId)}&contentItemId=${encodeURIComponent(itemId)}`, {
              method: "DELETE",
            });
          } catch (err) {
            console.error("unmarkItemComplete error", err);
          }
        })();
        set((s) => {
          const key = `${studentId}:${courseId}`;
          const existing = s.progress[key] ?? [];
          return { progress: { ...s.progress, [key]: existing.filter((x) => x !== itemId) } };
        });
      },

      notify: (userId, title, message, link) => {
        const id = uid("n");
        const notif = { id, userId, title, message, link, createdAt: new Date().toISOString(), read: false };
        (async () => {
          try {
            await fetch("/api/notifications", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(notif),
            });
          } catch (err) {
            console.error("notify error", err);
          }
        })();
        set((s) => ({
          notifications: [notif, ...s.notifications],
        }));
      },
      markNotifRead: (id) => {
        (async () => {
          try {
            await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" });
          } catch (err) {
            console.error("markNotifRead error", err);
          }
        })();
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      },
      markAllNotifsRead: (userId) => {
        (async () => {
          try {
            await fetch("/api/notifications/read-all", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ userId }),
            });
          } catch (err) {
            console.error("markAllNotifsRead error", err);
          }
        })();
        set((s) => ({
          notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
        }));
      },

      sendMessage: (fromId, toId, subject, body) => {
        const id = uid("m");
        const msg: Message = {
          id, fromId, toId, subject, body,
          createdAt: new Date().toISOString(), read: false,
        };
        (async () => {
          try {
            await fetch("/api/messages", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(msg),
            });
          } catch (err) {
            console.error("sendMessage error", err);
          }
        })();
        set((s) => ({ messages: [msg, ...s.messages] }));
        get().notify(toId, `New message: ${subject}`, body.slice(0, 80));
      },
      markMessageRead: (id) => {
        (async () => {
          try {
            await fetch(`/api/messages/${encodeURIComponent(id)}/read`, { method: "PUT" });
          } catch (err) {
            console.error("markMessageRead error", err);
          }
        })();
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) }));
      },

      addEvent: async (courseId, title, description, eventDate) => {
        try {
          const resp = await fetch("/api/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ courseId, title, description, eventDate }),
          });
          const json = await resp.json();
          if (json.event) {
            set((s) => ({ events: [json.event, ...s.events] }));
          }
        } catch (err) {
          console.error("addEvent error", err);
        }
      },
      deleteEvent: async (id) => {
        try {
          await fetch(`/api/events/${encodeURIComponent(id)}`, { method: "DELETE" });
          set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
        } catch (err) {
          console.error("deleteEvent error", err);
        }
      },

      addAnnouncement: async (courseId, title, body, isPinned = false) => {
        try {
          const resp = await fetch("/api/announcements", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ courseId, title, body, isPinned }),
          });
          const json = await resp.json();
          if (json.announcement) {
            set((s) => ({ announcements: [json.announcement, ...s.announcements] }));
          }
        } catch (err) {
          console.error("addAnnouncement error", err);
        }
      },
      deleteAnnouncement: async (id) => {
        try {
          await fetch(`/api/announcements/${encodeURIComponent(id)}`, { method: "DELETE" });
          set((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) }));
        } catch (err) {
          console.error("deleteAnnouncement error", err);
        }
      },

      addDiscussion: async (courseId, userId, title, body) => {
        try {
          const resp = await fetch("/api/discussions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ courseId, userId, title, body }),
          });
          const json = await resp.json();
          if (json.discussion) {
            set((s) => ({ discussions: [json.discussion, ...s.discussions] }));
          }
        } catch (err) {
          console.error("addDiscussion error", err);
        }
      },
      deleteDiscussion: async (id) => {
        try {
          await fetch(`/api/discussions/${encodeURIComponent(id)}`, { method: "DELETE" });
          set((s) => ({
            discussions: s.discussions.filter((d) => d.id !== id),
            discussionReplies: s.discussionReplies.filter((r) => r.discussionId !== id),
          }));
        } catch (err) {
          console.error("deleteDiscussion error", err);
        }
      },

      addDiscussionReply: async (discussionId, userId, body) => {
        try {
          const resp = await fetch("/api/discussion-replies", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ discussionId, userId, body }),
          });
          const json = await resp.json();
          if (json.discussionReply) {
            set((s) => ({ discussionReplies: [json.discussionReply, ...s.discussionReplies] }));
            const notifsResp = await fetch("/api/notifications");
            if (notifsResp.ok) {
              const notifsJson = await notifsResp.json();
              if (notifsJson.notifications) {
                set({ notifications: notifsJson.notifications });
              }
            }
          }
        } catch (err) {
          console.error("addDiscussionReply error", err);
        }
      },
      deleteDiscussionReply: async (id) => {
        try {
          await fetch(`/api/discussion-replies/${encodeURIComponent(id)}`, { method: "DELETE" });
          set((s) => ({ discussionReplies: s.discussionReplies.filter((r) => r.id !== id) }));
        } catch (err) {
          console.error("deleteDiscussionReply error", err);
        }
      },

      resetData: () => set({ ...initial }),
    })
  );

export function maxScore(a: StoreAssessment): number {
  return a.questions.reduce((sum, q) => sum + q.points, 0);
}

export function submissionScore(a: StoreAssessment, sub: Submission): { earned: number; max: number; pct: number } {
  const max = maxScore(a);
  const earned = sub.responses.reduce((sum, r) => sum + (r.awarded ?? 0), 0);
  return { earned, max, pct: max ? Math.round((earned / max) * 100) : 0 };
}

export function courseProgressPct(progress: Record<string, string[]>, studentId: string, course: Course): number {
  const allItems = course.sections.flatMap((s) => s.items);
  const lessonItems = allItems.filter((i) => i.type !== "assessment");
  const targetItems = lessonItems.length > 0 ? lessonItems : allItems;
  if (targetItems.length === 0) return 100;

  const doneSet = new Set(progress[`${studentId}:${course.id}`] ?? []);
  const completedCount = targetItems.filter((i) => doneSet.has(i.id)).length;
  return Math.min(100, Math.round((completedCount / targetItems.length) * 100));
}

export function studentAccessFor(course: Course, studentId?: string): { accessMode: "lifetime" | "limited"; endDate?: string } {
  const sa = studentId ? course.studentAccess?.[studentId] : undefined;
  if (sa) return { accessMode: sa.accessMode, endDate: sa.endDate };
  return { accessMode: course.accessMode ?? "lifetime", endDate: course.endDate };
}

export function isCourseExpired(course: Course, studentId?: string): boolean {
  if (!course) return false;
  const { accessMode, endDate } = studentAccessFor(course, studentId);
  if (accessMode === "lifetime") return false;
  if (!endDate) return false;
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > end;
}

export type { User, Role, Course, Section, ContentItem, ContentType, Certificate, NotificationItem, Message, TechBadge };
