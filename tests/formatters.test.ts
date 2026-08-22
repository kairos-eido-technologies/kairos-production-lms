import { describe, it, expect } from "vitest";
import {
  courseProgressPct,
  submissionScore,
  maxScore,
  isCourseExpired,
  generateCertificateId,
  normalizeCertificateList,
  formatLastActive,
  formatIdleDuration,
} from "../src/lib/utils/formatters";
import type { Course, StoreAssessment, Submission, User } from "../src/lib/types/store";

describe("LMS Calculations & Formatters", () => {
  it("calculates course progress percentage accurately", () => {
    const mockCourse: Course = {
      id: "CRS-1",
      code: "REACT-101",
      name: "React 19 Mastery",
      description: "Full course",
      thumbnail: "",
      teacherId: "TCH-1",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      accessMode: "lifetime",
      status: "active",
      showInPreview: true,
      sections: [
        {
          id: "SEC-1",
          courseId: "CRS-1",
          title: "Introduction",
          order: 0,
          items: [
            { id: "ITEM-1", sectionId: "SEC-1", type: "video", title: "Setup", order: 0 },
            { id: "ITEM-2", sectionId: "SEC-1", type: "document", title: "Overview", order: 1 },
          ],
        },
        {
          id: "SEC-2",
          courseId: "CRS-1",
          title: "Advanced",
          order: 1,
          items: [
            { id: "ITEM-3", sectionId: "SEC-2", type: "video", title: "Hooks", order: 0 },
            { id: "ITEM-4", sectionId: "SEC-2", type: "quiz", title: "Final Quiz", order: 1 },
          ],
        },
      ],
    };

    const progress1 = { "STU-1:CRS-1": ["ITEM-1", "ITEM-2"] };
    expect(courseProgressPct(progress1, "STU-1", mockCourse)).toBe(50);

    const progressAll = { "STU-1:CRS-1": ["ITEM-1", "ITEM-2", "ITEM-3", "ITEM-4"] };
    expect(courseProgressPct(progressAll, "STU-1", mockCourse)).toBe(100);

    const progressNone = {};
    expect(courseProgressPct(progressNone, "STU-1", mockCourse)).toBe(0);
  });

  it("calculates assessment scores and percentages", () => {
    const mockAssessment: StoreAssessment = {
      id: "ASSESS-1",
      courseId: "CRS-1",
      title: "React Hooks Quiz",
      timeLimit: 15,
      passingScore: 70,
      attempts: 2,
      questionCount: 2,
      proctored: false,
      isFinal: false,
      questions: [
        {
          id: "Q1",
          type: "mcq",
          prompt: "What is useState?",
          options: ["Hook", "Class"],
          correctIndex: 0,
          points: 10,
        },
        {
          id: "Q2",
          type: "mcq",
          prompt: "What is useEffect?",
          options: ["Hook", "Variable"],
          correctIndex: 0,
          points: 10,
        },
      ],
    };

    const perfectSubmission: Submission = {
      id: "SUB-1",
      assessmentId: "ASSESS-1",
      studentId: "STU-1",
      submittedAt: "2026-08-15",
      status: "graded",
      responses: [
        { questionId: "Q1", response: "0", awarded: 10 },
        { questionId: "Q2", response: "0", awarded: 10 },
      ],
    };

    const scoreResult = submissionScore(mockAssessment, perfectSubmission);
    expect(scoreResult.earned).toBe(20);
    expect(scoreResult.max).toBe(20);
    expect(scoreResult.pct).toBe(100);
    expect(maxScore(mockAssessment)).toBe(20);
  });

  it("evaluates course expiration accurately", () => {
    const activeCourse: Course = {
      id: "CRS-1",
      code: "C1",
      name: "Course 1",
      description: "",
      thumbnail: "",
      teacherId: "TCH-1",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      accessMode: "limited",
      status: "active",
      showInPreview: true,
      sections: [],
      studentAccess: {
        "STU-ACTIVE": { accessMode: "limited", endDate: "2030-01-01" },
        "STU-EXPIRED": { accessMode: "limited", endDate: "2020-01-01" },
        "STU-LIFETIME": { accessMode: "lifetime" },
      },
    };

    expect(isCourseExpired(activeCourse, "STU-ACTIVE")).toBe(false);
    expect(isCourseExpired(activeCourse, "STU-EXPIRED")).toBe(true);
    expect(isCourseExpired(activeCourse, "STU-LIFETIME")).toBe(false);
  });

  it("generates formatted sequential certificate IDs", () => {
    const existing = [
      {
        id: "ITECH-2026-0001",
        studentId: "S1",
        courseId: "C1",
        score: 100,
        status: "approved" as const,
        requestedAt: "2026-01-01",
      },
      {
        id: "ITECH-2026-0005",
        studentId: "S2",
        courseId: "C1",
        score: 95,
        status: "approved" as const,
        requestedAt: "2026-01-01",
      },
    ];

    const nextId = generateCertificateId(existing);
    expect(nextId).toBe("ITECH-2026-0006");
  });
});
