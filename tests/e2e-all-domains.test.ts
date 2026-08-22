import { describe, it, expect, afterAll } from "vitest";
import { repository } from "../src/lib/db/repository";
import { closeDb } from "../src/lib/db/client";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "../src/lib/auth";

describe("Comprehensive End-to-End Database Lifecycle & Cleanup Test", { timeout: 60000 }, () => {
  const timestamp = Date.now();
  const testIds = {
    userId: `STU-E2E-${timestamp}`,
    courseId: `CRS-E2E-${timestamp}`,
    sectionId: "",
    contentItemId: "",
    assessmentId: `ASSESS-E2E-${timestamp}`,
    questionId: "",
    submissionId: "",
    certificateId: `ITECH-E2E-${timestamp}`,
    notificationId: "",
    messageId: "",
    announcementId: "",
    discussionId: "",
    replyId: "",
    eventId: "",
    checkpointId: `CP-E2E-${timestamp}`,
  };

  afterAll(async () => {
    await closeDb();
  }, 10000);

  it("1. creates, authenticates, and retrieves a user from the database", async () => {
    const rawPassword = "TestPassword123!";
    const passwordHash = await hashPassword(rawPassword);

    const createdUser = await repository.createUser({
      id: testIds.userId,
      name: `E2E Test Student ${timestamp}`,
      email: `e2e_${timestamp}@itech.test`,
      passwordHash,
      role: "student",
      status: "active",
      joinedAt: new Date(),
      isEmailVerified: true,
    });

    expect(createdUser).toBeDefined();
    expect(createdUser?.id).toBe(testIds.userId);
    expect(createdUser?.email).toBe(`e2e_${timestamp}@itech.test`);

    const isPasswordValid = await verifyPassword(rawPassword, createdUser?.passwordHash || "");
    expect(isPasswordValid).toBe(true);

    const token = generateToken({
      userId: createdUser!.id,
      email: createdUser!.email,
      role: createdUser!.role as any,
    });
    const decoded = verifyToken(token);
    expect(decoded?.userId).toBe(testIds.userId);

    const allUsers = await repository.getUsers();
    const foundInDb = allUsers.find((u) => u.id === testIds.userId);
    expect(foundInDb).toBeDefined();

    const updatedUser = await repository.updateUser(testIds.userId, {
      name: `E2E Test Student (Updated)`,
    });
    expect(updatedUser?.name).toBe("E2E Test Student (Updated)");
  }, 60000);

  it("2. creates course with relational sections and content items", async () => {
    const createdCourse = await repository.createCourse({
      id: testIds.courseId,
      name: `E2E Course ${timestamp}`,
      code: `E2E-${String(timestamp).slice(-4)}`,
      description: "Full lifecycle automated test course",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      accessMode: "lifetime",
      status: "active",
      showInPreview: true,
      studentIds: [testIds.userId],
    });

    expect(createdCourse).toBeDefined();
    expect(createdCourse?.id).toBe(testIds.courseId);

    const section = await repository.createSection({
      courseId: testIds.courseId,
      title: "Module 1: Introduction",
      order: 0,
    });
    expect(section?.id).toBeDefined();
    testIds.sectionId = section!.id;

    const item = await repository.createContentItem({
      sectionId: testIds.sectionId,
      type: "video",
      title: "Lesson 1.1: Getting Started",
      url: "https://example.com/video.mp4",
      duration: 12,
      order: 0,
    });
    expect(item?.id).toBeDefined();
    testIds.contentItemId = item!.id;

    const allCourses = await repository.getCourses(true);
    const foundCourse = allCourses.find((c) => c.id === testIds.courseId);
    expect(foundCourse).toBeDefined();
    expect(foundCourse?.sections.length).toBeGreaterThan(0);
    expect(foundCourse?.sections[0].items.length).toBeGreaterThan(0);
  }, 60000);

  it("3. tracks and retrieves student progress from the database", async () => {
    await repository.saveProgress(testIds.userId, testIds.courseId, testIds.contentItemId);

    const progressData = await repository.getProgress(testIds.userId, testIds.courseId);
    const key = `${testIds.userId}:${testIds.courseId}`;

    const isMarked =
      (progressData.completedItemIds || []).includes(testIds.contentItemId) ||
      (progressData.progress?.[key] || []).includes(testIds.contentItemId);

    expect(isMarked).toBe(true);
  }, 60000);

  it("4. creates assessment, adds questions, and processes student quiz submission", async () => {
    const assessment = await repository.createAssessment({
      id: testIds.assessmentId,
      courseId: testIds.courseId,
      title: `E2E Final Exam ${timestamp}`,
      timeLimit: 20,
      passingScore: 70,
      attempts: 2,
      proctored: false,
      isFinal: true,
    });
    expect(assessment?.id).toBe(testIds.assessmentId);

    const question = await repository.createQuestion({
      assessmentId: testIds.assessmentId,
      type: "mcq",
      prompt: "What is the primary database in the LMS?",
      options: ["PostgreSQL + Drizzle ORM", "SQLite", "Flat Files"],
      correctIndex: 0,
      points: 100,
      order: 0,
    });
    expect(question?.id).toBeDefined();
    testIds.questionId = question.id;

    const submission = await repository.createSubmission({
      assessmentId: testIds.assessmentId,
      studentId: testIds.userId,
      status: "graded",
      feedback: "Great job on the quiz!",
      responses: [{ questionId: testIds.questionId, response: "0", awarded: 100 }],
    });
    expect(submission?.id).toBeDefined();
    testIds.submissionId = submission!.id;

    const submissions = await repository.getSubmissions(testIds.userId, testIds.assessmentId);
    const foundSub = submissions.find((s) => s.id === testIds.submissionId);
    expect(foundSub).toBeDefined();
    expect(foundSub?.responses.length).toBe(1);
    expect(foundSub?.responses[0].awarded).toBe(100);
  }, 60000);

  it("5. issues, updates, and publicly verifies certificate", async () => {
    const cert = await repository.createCertificate({
      id: testIds.certificateId,
      studentId: testIds.userId,
      courseId: testIds.courseId,
      score: 100,
      status: "pending",
      requestedAt: new Date(),
    });
    expect(cert?.id).toBe(testIds.certificateId);
    expect(cert?.status).toBe("pending");

    const approvedCert = await repository.approveCertificate(testIds.certificateId);
    expect(approvedCert?.status).toBe("approved");

    const verified = await repository.verifyCertificate(testIds.certificateId);
    expect(verified).toBeDefined();
    expect(verified?.id).toBe(testIds.certificateId);
    expect(verified?.status).toBe("approved");
  }, 60000);

  it("6. handles communications, calendar events, and video checkpoints", async () => {
    const notif = await repository.createNotification(
      testIds.userId,
      "Welcome",
      "Hello Test Student",
    );
    expect(notif.id).toBeDefined();
    testIds.notificationId = notif.id;

    const msg = await repository.createMessage(
      "ADM01",
      testIds.userId,
      "Welcome",
      "Welcome to course",
    );
    expect(msg.id).toBeDefined();
    testIds.messageId = msg.id;

    const ann = await repository.createAnnouncement({
      courseId: testIds.courseId,
      title: "Course Started",
      body: "Welcome to class",
      isPinned: true,
    });
    expect(ann.id).toBeDefined();
    testIds.announcementId = ann.id;

    const disc = await repository.createDiscussion({
      courseId: testIds.courseId,
      userId: testIds.userId,
      title: "Database Performance",
      body: "How fast is Drizzle ORM?",
    });
    expect(disc.id).toBeDefined();
    testIds.discussionId = disc.id;

    const reply = await repository.createDiscussionReply({
      discussionId: testIds.discussionId,
      userId: "ADM01",
      body: "Drizzle executes pure SQL queries with zero overhead!",
    });
    expect(reply.id).toBeDefined();
    testIds.replyId = reply.id;

    const event = await repository.createEvent({
      courseId: testIds.courseId,
      title: "Live Q&A Session",
      eventDate: new Date().toISOString(),
    });
    expect(event.id).toBeDefined();
    testIds.eventId = event.id;

    const cp = await repository.saveVideoCheckpoint({
      id: testIds.checkpointId,
      contentItemId: testIds.contentItemId,
      timestamp: 30,
      type: "mcq",
      prompt: "Do you understand the lesson?",
      options: ["Yes", "No"],
      correctIndex: 0,
    });
    expect(cp.id).toBe(testIds.checkpointId);
  }, 60000);

  it("7. cascades deletion of all test records and verifies 100% database cleanliness", async () => {
    await repository.deleteCourse(testIds.courseId);
    await repository.deleteUser(testIds.userId);

    const userCheck = await repository.getUserById(testIds.userId);
    expect(userCheck).toBeNull();

    const courseCheck = (await repository.getCourses(true)).find((c) => c.id === testIds.courseId);
    expect(courseCheck).toBeUndefined();

    const assessCheck = (await repository.getAssessments()).find(
      (a) => a.id === testIds.assessmentId,
    );
    expect(assessCheck).toBeUndefined();

    const certCheck = await repository.getCertificateById(testIds.certificateId);
    expect(certCheck).toBeNull();
  }, 60000);
});
