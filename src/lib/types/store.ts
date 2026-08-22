import type {
  User,
  Role,
  Course,
  Section,
  ContentItem,
  ContentType,
  Assessment,
  Certificate,
  NotificationItem,
  Message,
  TechBadge,
} from "../mock-data";

export type {
  User,
  Role,
  Course,
  Section,
  ContentItem,
  ContentType,
  Assessment,
  Certificate,
  NotificationItem,
  Message,
  TechBadge,
};

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
  timestamp: number;
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

export interface ProctorEventRecord {
  at: string;
  type: string;
  detail?: string;
}

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
