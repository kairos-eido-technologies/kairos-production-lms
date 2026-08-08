// iTech Academy — types only. Authentication and data now rely on backend services.
export type Role = "admin" | "teacher" | "student";
export type ContentType =
  | "video" | "pdf" | "reading" | "lab" | "link" | "download"
  | "image" | "ppt" | "assessment";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  status: "active" | "inactive";
  joinedAt: string;
  lastActive?: string;
  courseIds?: string[];
  isEmailVerified?: boolean;
  emailVerificationCode?: string;
  phone?: string;
  resetPasswordCode?: string;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
  fileName?: string;
  assessmentId?: string;
  duration?: number;
  fileSize?: string;
  body?: string;
}

export interface Section {
  id: string;
  title: string;
  items: ContentItem[];
}

export interface StudentAccess {
  accessMode: "lifetime" | "limited";
  endDate?: string;
}

export interface TechBadge {
  name: string;
  icon: string;
  bg?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  teacherId: string;
  studentIds: string[];
  /** Per-student access settings (configured at enrollment time). */
  studentAccess?: Record<string, StudentAccess>;
  thumbnail: string;
  startDate: string;
  endDate: string;
  accessMode: "lifetime" | "limited";
  status: "active" | "draft" | "archived";
  sections: Section[];
  showInPreview?: boolean;
  previewVideoUrl?: string;
  badgeTag?: string;
  featuredBadgeText?: string;
  durationText?: string;
  projectsText?: string;
  techStack?: TechBadge[];
}

export interface Assessment {
  id: string;
  courseId: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  attempts: number;
  questionCount: number;
  proctored: boolean;
  isFinal: boolean;
}

export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  score: number;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  issuedAt?: string;
  teacherNote?: string;
  rejectionReason?: string;
  /** Proctoring events captured during the final exam (if any). */
  proctorLog?: Array<{ at: string; type: string; detail?: string }>;
}

export interface NotificationItem {
  id: string;
  userId: string;          // target user
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
}
