import { describe, it, expect } from "vitest";
import { userService } from "../src/lib/services/user.service";
import { courseService } from "../src/lib/services/course.service";
import { certificateService } from "../src/lib/services/certificate.service";
import { assessmentService } from "../src/lib/services/assessment.service";

describe("Service Layer Integration", () => {
  it("userService validates required email format", async () => {
    await expect(userService.createUser({ email: "", name: "Test" })).rejects.toThrow(
      "Email is required",
    );
  });

  it("courseService lists courses via repository", async () => {
    const list = await courseService.listCourses(true);
    expect(Array.isArray(list)).toBe(true);
  });

  it("assessmentService lists assessments and questions", async () => {
    const assessments = await assessmentService.listAssessments();
    expect(Array.isArray(assessments)).toBe(true);
  });

  it("certificateService returns null for non-existent certificate lookup", async () => {
    const cert = await certificateService.getCertificateById("non-existent-id-999");
    expect(cert).toBeNull();
  });
});
