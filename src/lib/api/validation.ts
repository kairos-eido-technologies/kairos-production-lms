import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Valid email is required").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  phone: z.string().trim().max(30).optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  code: z.string().trim().length(6, "Verification code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const verifyEmailSchema = z.object({
  code: z.string().trim().length(6, "Verification code must be 6 digits"),
  email: z.string().trim().email().optional().nullable(),
});

export const createCourseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required"),
  code: z.string().trim().min(1, "Course code is required"),
  description: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  accessMode: z.enum(["lifetime", "limited"]).default("lifetime"),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  showInPreview: z.boolean().optional().default(false),
  previewVideoUrl: z.string().optional().nullable(),
  lockProgression: z.boolean().optional().nullable(),
  sequentialProgression: z.boolean().optional().nullable(),
  badgeTag: z.string().optional().nullable(),
  featuredBadgeText: z.string().optional().nullable(),
  durationText: z.string().optional().nullable(),
  projectsText: z.string().optional().nullable(),
  techStack: z.any().optional().nullable(),
  enrolledStudents: z.array(z.string()).optional(),
});

export const createAssessmentSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  title: z.string().trim().min(1, "Assessment title is required"),
  timeLimit: z.number().int().nonnegative().default(30),
  passingScore: z.number().int().min(0).max(100).default(70),
  attempts: z.number().int().positive().default(1),
  questionCount: z.number().int().nonnegative().default(0),
  proctored: z.boolean().default(false),
  isFinal: z.boolean().default(false),
  questions: z.array(z.any()).optional(),
});

export const createQuestionSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  type: z.enum(["mcq", "truefalse", "short"]).default("mcq"),
  prompt: z.string().trim().min(1, "Prompt is required"),
  options: z.array(z.string()).optional().nullable(),
  correctIndex: z.number().int().optional().nullable(),
  points: z.number().int().positive().default(1),
  imageUrl: z.string().optional().nullable(),
  order: z.number().int().default(0),
});

export const submitAssessmentSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  responses: z.array(
    z.object({
      questionId: z.string().min(1),
      response: z.string(),
    })
  ).optional().default([]),
  proctorEvents: z.any().optional(),
});

export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ data: T; errorResponse: null } | { data: null; errorResponse: Response }> {
  try {
    const raw = await request.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      const errorMessage = issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed";
      return {
        data: null,
        errorResponse: new Response(
          JSON.stringify({ error: errorMessage, details: result.error.issues }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        ),
      };
    }
    return { data: result.data, errorResponse: null };
  } catch {
    return {
      data: null,
      errorResponse: new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    };
  }
}
