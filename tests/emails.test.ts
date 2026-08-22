import { describe, it, expect } from "vitest";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCourseAssignedEmail,
  sendNudgeEmail,
  sendTeacherCourseAssignedEmail,
  sendNewSubmissionEmail,
  sendSubmissionGradedEmail,
  sendCertificateRequestedEmail,
  sendCertificateApprovedEmail,
  sendCertificateRejectedEmail,
  sendMessageNotificationEmail,
  sendAnnouncementEmail,
  sendCalendarEventEmail,
} from "../src/lib/mail";

describe("Email Notification System & Templates", () => {
  const testEmail = "kairoseidotechnologies@gmail.com";
  const testName = "Learner";

  it("1. sendVerificationEmail executes and returns success", async () => {
    const res = await sendVerificationEmail(testEmail, "123456", testName);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("2. sendPasswordResetEmail executes and returns success", async () => {
    const res = await sendPasswordResetEmail(testEmail, "654321", testName);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("3. sendCourseAssignedEmail executes and returns success", async () => {
    const res = await sendCourseAssignedEmail(
      testEmail,
      testName,
      "Full Stack Web Development",
      "FS-101",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("4. sendTeacherCourseAssignedEmail executes and returns success", async () => {
    const res = await sendTeacherCourseAssignedEmail(
      testEmail,
      "Instructor",
      "Full Stack Web Development",
      "FS-101",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("5. sendNudgeEmail executes and returns success", async () => {
    const res = await sendNudgeEmail(
      testEmail,
      testName,
      "We Miss You!",
      "Jump back into your lessons today.",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("6. sendNewSubmissionEmail executes and returns success", async () => {
    const res = await sendNewSubmissionEmail(
      testEmail,
      "Instructor",
      testName,
      "Midterm Quiz",
      "Full Stack Web Development",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("7. sendSubmissionGradedEmail executes and returns success", async () => {
    const res = await sendSubmissionGradedEmail(testEmail, testName, "Midterm Quiz", 95, 100);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("8. sendCertificateRequestedEmail executes and returns success", async () => {
    const res = await sendCertificateRequestedEmail(
      testEmail,
      "Instructor",
      testName,
      "Full Stack Web Development",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("9. sendCertificateApprovedEmail executes and returns success", async () => {
    const res = await sendCertificateApprovedEmail(
      testEmail,
      testName,
      "Full Stack Web Development",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("10. sendCertificateRejectedEmail executes and returns success", async () => {
    const res = await sendCertificateRejectedEmail(
      testEmail,
      testName,
      "Full Stack Web Development",
      "Please redo quiz 3.",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("11. sendMessageNotificationEmail executes and returns success", async () => {
    const res = await sendMessageNotificationEmail(
      testEmail,
      testName,
      "Instructor",
      "Question",
      "Here is the answer.",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("12. sendAnnouncementEmail executes and returns success", async () => {
    const res = await sendAnnouncementEmail(
      testEmail,
      testName,
      "Full Stack Web Development",
      "New Lecture Added",
      "Check Section 2.",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("13. sendCalendarEventEmail executes and returns success", async () => {
    const res = await sendCalendarEventEmail(
      testEmail,
      testName,
      "Full Stack Web Development",
      "Live Q&A",
      "2026-08-20",
      "Webinar details.",
    );
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});
