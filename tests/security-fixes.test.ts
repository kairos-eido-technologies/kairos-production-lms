import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { repository } from "../src/lib/db/repository";
import { closeDb } from "../src/lib/db/client";
import { generateToken, hashPassword } from "../src/lib/auth";
import { assessmentsRoute } from "../src/lib/api/routes/assessments";
import { coursesRoute } from "../src/lib/api/routes/courses";
import { usersRoute } from "../src/lib/api/routes/users";
import { communicationsRoute } from "../src/lib/api/routes/communications";
import { assessmentService } from "../src/lib/services/assessment.service";

describe("Security Fixes & Access Control Verification", { timeout: 60000 }, () => {
  const timestamp = Date.now();
  const testStudentId = `STU-SEC-${timestamp}`;
  const testAdminId = `ADM-SEC-${timestamp}`;
  const testCourseId = `CRS-SEC-${timestamp}`;
  const testAssessmentId = `ASSESS-SEC-${timestamp}`;
  let questionId = "";

  const studentToken = generateToken({
    userId: testStudentId,
    email: `student_${timestamp}@itech.test`,
    role: "student",
  });

  const adminToken = generateToken({
    userId: testAdminId,
    email: `admin_${timestamp}@itech.test`,
    role: "admin",
  });

  beforeAll(async () => {
    const dummyHash = await hashPassword("TestPass123!");
    await repository.createUser({
      id: testStudentId,
      name: `Test Student ${timestamp}`,
      email: `student_${timestamp}@itech.test`,
      passwordHash: dummyHash,
      role: "student",
      status: "active",
      joinedAt: new Date(),
      isEmailVerified: true,
    });
    await repository.createUser({
      id: testAdminId,
      name: `Test Admin ${timestamp}`,
      email: `admin_${timestamp}@itech.test`,
      passwordHash: dummyHash,
      role: "admin",
      status: "active",
      joinedAt: new Date(),
      isEmailVerified: true,
    });
  }, 30000);

  afterAll(async () => {
    try {
      await repository.deleteCourse(testCourseId);
      await repository.deleteUser(testStudentId);
      await repository.deleteUser(testAdminId);
    } catch (_) {}
    await closeDb();
  }, 30000);

  it("1. prevents student from creating or deleting courses (RBAC protection)", async () => {
    // Attempt course creation as student
    const createReq = new Request("http://localhost:5173/api/courses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        id: testCourseId,
        name: "Hacked Course",
        code: `HACK-${String(timestamp).slice(-4)}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      }),
    });

    const res = await coursesRoute(createReq);
    expect(res).toBeDefined();
    expect(res?.status).toBe(403);
    const json = await res?.json();
    expect(json.error).toContain("Forbidden");
  });

  it("2. allows admin to create course and sets up assessment for grading test", async () => {
    const createReq = new Request("http://localhost:5173/api/courses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        id: testCourseId,
        name: "Security Verified Course",
        code: `SEC-${String(timestamp).slice(-4)}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        accessMode: "lifetime",
        status: "active",
      }),
    });

    const res = await coursesRoute(createReq);
    expect(res?.status).toBe(200);

    const assessment = await repository.createAssessment({
      id: testAssessmentId,
      courseId: testCourseId,
      title: "Security Quiz",
      timeLimit: 15,
      passingScore: 70,
      attempts: 2,
    });
    expect(assessment?.id).toBe(testAssessmentId);

    const q = await repository.createQuestion({
      assessmentId: testAssessmentId,
      type: "mcq",
      prompt: "Which layer performs assessment grading?",
      options: ["Frontend Browser", "Backend Server", "Client LocalStorage"],
      correctIndex: 1, // Option 1: Backend Server is correct
      points: 100,
      order: 0,
    });
    questionId = q.id;
  });

  it("3. masks question answer key (correctIndex) when retrieved by a student", async () => {
    const studentReq = new Request(`http://localhost:5173/api/questions?assessmentId=${testAssessmentId}`, {
      method: "GET",
      headers: { authorization: `Bearer ${studentToken}` },
    });

    const res = await assessmentsRoute(studentReq);
    expect(res?.status).toBe(200);
    const data = await res?.json();
    expect(data.questions).toBeDefined();
    const studentQ = data.questions.find((x: any) => x.id === questionId);
    expect(studentQ).toBeDefined();
    expect(studentQ.correctIndex).toBeUndefined(); // Answer key is masked for students!
  });

  it("4. computes verified server-side grading and ignores client-forged scores", async () => {
    // Malicious student submits wrong answer (Option 0) but claims awarded: 100
    const submissionResult = await assessmentService.submitAssessmentWithGrading({
      assessmentId: testAssessmentId,
      studentId: testStudentId,
      responses: [
        {
          questionId,
          response: "0", // WRONG ANSWER
          awarded: 100,  // FORGED CLAIM
        },
      ],
    });

    expect(submissionResult).toBeDefined();
    const verifiedAwarded = submissionResult.responses[0].awarded;
    expect(verifiedAwarded).toBe(0); // Server calculated 0 points!

    // Now submit correct answer (Option 1)
    const validSubmission = await assessmentService.submitAssessmentWithGrading({
      assessmentId: testAssessmentId,
      studentId: testStudentId,
      responses: [
        {
          questionId,
          response: "1", // CORRECT ANSWER
          awarded: 0,   // Client claims 0
        },
      ],
    });

    expect(validSubmission.responses[0].awarded).toBe(100); // Server accurately awarded 100 points!
  });

  it("5. prevents non-admin from escalating role or modifying other users", async () => {
    const escalateReq = new Request(`http://localhost:5173/api/users/${testStudentId}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        role: "admin", // Malicious role escalation attempt
        name: "Hacked Name",
      }),
    });

    const res = await usersRoute(escalateReq);
    expect(res?.status).toBe(200);
    const data = await res?.json();
    // Non-admin can update name, but role remains student
    expect(data.user.role).toBe("student");
  });

  it("6. isolates user messages and prevents unauthorized message snooping", async () => {
    const studentMsgReq = new Request("http://localhost:5173/api/messages", {
      method: "GET",
      headers: { authorization: `Bearer ${studentToken}` },
    });

    const res = await communicationsRoute(studentMsgReq, null);
    expect(res?.status).toBe(200);
    const data = await res?.json();
    expect(Array.isArray(data.messages)).toBe(true);
    // Student only receives messages where they are sender or recipient
    for (const msg of data.messages) {
      expect(msg.fromId === testStudentId || msg.toId === testStudentId).toBe(true);
    }
  });

  it("7. blocks non-admin from accessing /api/test-emails (403 Forbidden)", async () => {
    const { emailsRoute } = await import("../src/lib/api/routes/emails");
    const studentEmailReq = new Request("http://localhost:5173/api/test-emails?email=attacker@test.com", {
      method: "POST",
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    const res = await emailsRoute(studentEmailReq);
    expect(res?.status).toBe(403);
  });

  it("8. rejects spoofed file upload with mismatched magic bytes", async () => {
    const { filesRoute } = await import("../src/lib/api/routes/files");
    const formData = new FormData();
    const fakePdf = new Blob(["NOT_A_REAL_PDF_HEADER_JUST_TEXT"], { type: "application/pdf" });
    formData.append("file", fakePdf, "malicious_payload.pdf");

    const uploadReq = new Request("http://localhost:5173/api/files", {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const res = await filesRoute(uploadReq);
    expect(res?.status).toBe(400);
    const data = await res?.json();
    expect(data.error).toContain("does not match the declared .pdf file format");
  });

  it("9. sanitizes proctoring telemetry entries during assessment submission", async () => {
    const dirtyProctorEvents = [
      { at: new Date().toISOString(), type: "fullscreen_enter", detail: "Entered fullscreen" },
      { at: "2026-08-20T10:00:00.000Z", type: "tab_blur", detail: "<script>alert(1)</script>" },
      { invalid: "no type field" },
    ];

    const submission = await assessmentService.submitAssessmentWithGrading({
      assessmentId: testAssessmentId,
      studentId: testStudentId,
      responses: [{ questionId, response: "1", awarded: 100 }],
      proctorEvents: dirtyProctorEvents,
    });

    expect(submission).toBeDefined();
    expect(Array.isArray(submission.proctorEvents)).toBe(true);
    expect(submission.proctorEvents.length).toBe(2); // Only valid typed events retained
    expect(submission.proctorEvents[1].type).toBe("tab_blur");
  });
});
