import { pgTable, text, serial, timestamp, boolean, integer, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull(), // admin, teacher, student
  avatar: text("avatar"),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, inactive
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastActive: timestamp("last_active"),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerificationCode: varchar("email_verification_code", { length: 6 }),
  phone: varchar("phone", { length: 20 }),
  resetPasswordCode: varchar("reset_password_code", { length: 6 }),
});

// Courses table
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  teacherId: text("teacher_id").references(() => users.id),
  thumbnail: text("thumbnail"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  accessMode: varchar("access_mode", { length: 50 }).notNull().default("lifetime"), // lifetime, limited
  status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, active, archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  showInPreview: boolean("show_in_preview").notNull().default(false),
  previewVideoUrl: text("preview_video_url"),
  badgeTag: text("badge_tag"),
  featuredBadgeText: text("featured_badge_text"),
  durationText: text("duration_text"),
  projectsText: text("projects_text"),
  techStack: jsonb("tech_stack"),
});

// Course sections table
export const sections = pgTable("sections", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Content items (readings, videos, labs, etc.)
export const contentItems = pgTable("content_items", {
  id: text("id").primaryKey(),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // video, pdf, reading, lab, link, download, image, ppt, assessment
  title: text("title").notNull(),
  body: text("body"),
  url: text("url"),
  fileName: text("file_name"),
  duration: integer("duration"), // in minutes
  fileSize: varchar("file_size", { length: 50 }),
  assessmentId: text("assessment_id"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Files metadata (uploads)
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  mime: varchar("mime", { length: 255 }).notNull(),
  size: integer("size").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  storageType: varchar("storage_type", { length: 50 }).notNull().default("local"), // local, s3, gcs
  storageKey: text("storage_key").notNull(), // path or object key
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Student course enrollment
export const enrollments = pgTable("enrollments", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  accessMode: varchar("access_mode", { length: 50 }).notNull().default("lifetime"),
  endDate: timestamp("end_date"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Student progress (completed items)
export const progress = pgTable("progress", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  contentItemId: text("content_item_id").notNull().references(() => contentItems.id),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Questions (for assessments)
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // mcq, truefalse, short
  prompt: text("prompt").notNull(),
  options: jsonb("options"), // string[] for MCQ
  correctIndex: integer("correct_index"), // for MCQ
  points: integer("points").notNull().default(1),
  imageUrl: text("image_url"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Assessments (quizzes, exams)
export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  timeLimit: integer("time_limit").notNull(), // in minutes
  passingScore: integer("passing_score").notNull(),
  attempts: integer("attempts").notNull().default(1),
  questionCount: integer("question_count").notNull(),
  proctored: boolean("proctored").notNull().default(false),
  isFinal: boolean("is_final").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Submission responses (individual question answers)
export const submissionResponses = pgTable("submission_responses", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull(),
  questionId: text("question_id").notNull().references(() => questions.id),
  response: text("response").notNull(),
  awarded: integer("awarded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Student submissions (exam/quiz attempts)
export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id),
  studentId: text("student_id").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("submitted"), // submitted, graded
  feedback: text("feedback"),
  proctorEvents: jsonb("proctor_events"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Certificates
export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id),
  courseId: text("course_id").notNull().references(() => courses.id),
  score: integer("score").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  requestedAt: timestamp("requested_at").notNull(),
  issuedAt: timestamp("issued_at"),
  teacherNote: text("teacher_note"),
  rejectionReason: text("rejection_reason"),
  proctorLog: jsonb("proctor_log"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Messages (user-to-user)
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  fromId: text("from_id").notNull().references(() => users.id),
  toId: text("to_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Calendar Events
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Course Announcements
export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Q&A Discussions
export const discussions = pgTable("discussions", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Q&A Discussion Replies
export const discussionReplies = pgTable("discussion_replies", {
  id: text("id").primaryKey(),
  discussionId: text("discussion_id").notNull().references(() => discussions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Video Checkpoint Questions
export const videoCheckpoints = pgTable("video_checkpoints", {
  id: text("id").primaryKey(),
  contentItemId: text("content_item_id").notNull().references(() => contentItems.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(), // in seconds
  type: varchar("type", { length: 50 }).notNull(), // mcq, truefalse, short
  prompt: text("prompt").notNull(),
  options: jsonb("options"), // string[]
  correctIndex: integer("correct_index"),
  correctText: text("correct_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Student Checkpoint Progress
export const checkpointProgress = pgTable("checkpoint_progress", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkpointId: text("checkpoint_id").notNull().references(() => videoCheckpoints.id, { onDelete: "cascade" }),
  isCorrect: boolean("is_correct").notNull().default(false),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  coursesTeaching: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  messagesFrom: many(messages, { relationName: "from" }),
  messagesTo: many(messages, { relationName: "to" }),
  notifications: many(notifications),
  certificates: many(certificates),
  files: many(() => files),
  checkpointProgress: many(checkpointProgress),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  teacher: one(users, { fields: [courses.teacherId], references: [users.id] }),
  sections: many(sections),
  enrollments: many(enrollments),
  assessments: many(assessments),
  certificates: many(certificates),
  events: many(events),
  announcements: many(announcements),
  discussions: many(discussions),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, { fields: [sections.courseId], references: [courses.id] }),
  contentItems: many(contentItems),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, { fields: [enrollments.studentId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  student: one(users, { fields: [certificates.studentId], references: [users.id] }),
  course: one(courses, { fields: [certificates.courseId], references: [courses.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  from: one(users, { fields: [messages.fromId], references: [users.id], relationName: "from" }),
  to: one(users, { fields: [messages.toId], references: [users.id], relationName: "to" }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  course: one(courses, { fields: [events.courseId], references: [courses.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  course: one(courses, { fields: [announcements.courseId], references: [courses.id] }),
}));

export const discussionsRelations = relations(discussions, ({ one, many }) => ({
  course: one(courses, { fields: [discussions.courseId], references: [courses.id] }),
  user: one(users, { fields: [discussions.userId], references: [users.id] }),
  replies: many(discussionReplies),
}));

export const discussionRepliesRelations = relations(discussionReplies, ({ one }) => ({
  discussion: one(discussions, { fields: [discussionReplies.discussionId], references: [discussions.id] }),
  user: one(users, { fields: [discussionReplies.userId], references: [users.id] }),
}));

export const videoCheckpointsRelations = relations(videoCheckpoints, ({ one, many }) => ({
  contentItem: one(contentItems, { fields: [videoCheckpoints.contentItemId], references: [contentItems.id] }),
  progressRecords: many(checkpointProgress),
}));

export const checkpointProgressRelations = relations(checkpointProgress, ({ one }) => ({
  student: one(users, { fields: [checkpointProgress.studentId], references: [users.id] }),
  checkpoint: one(videoCheckpoints, { fields: [checkpointProgress.checkpointId], references: [videoCheckpoints.id] }),
}));

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  section: one(sections, { fields: [contentItems.sectionId], references: [sections.id] }),
  checkpoints: many(videoCheckpoints),
}));

