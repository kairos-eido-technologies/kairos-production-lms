import { describe, it, expect, afterAll } from "vitest";
import { repository } from "../src/lib/db/repository";
import { closeDb } from "../src/lib/db/client";

describe("Drizzle ORM & PostgreSQL Repository Layer", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("fetches active users from PostgreSQL", async () => {
    const users = await repository.getUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);

    const admin = users.find((u) => u.role === "admin");
    expect(admin).toBeDefined();
    expect(admin?.email).toBe("admin@itech.com");
  });

  it("fetches courses with relational sections and items", async () => {
    const courses = await repository.getCourses(true);
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBeGreaterThan(0);

    const firstCourse = courses[0];
    expect(firstCourse.id).toBeDefined();
    expect(firstCourse.name).toBeDefined();
    expect(Array.isArray(firstCourse.sections)).toBe(true);
  });

  it("fetches and verifies certificates accurately", async () => {
    const certs = await repository.getCertificates("approved");
    expect(Array.isArray(certs)).toBe(true);

    if (certs.length > 0) {
      const firstCert = certs[0];
      const verified = await repository.verifyCertificate(firstCert.id);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(firstCert.id);
      expect(verified?.status).toBe("approved");
    }
  });

  it("safely cascades deletion of sections and content items with progress and checkpoints attached", async () => {
    const time = Date.now();
    const testCourseId = `CRS-CAS-${time}`;
    const testUserId = `USR-CAS-${time}`;

    // Create course
    await repository.createCourse({
      id: testCourseId,
      name: "Cascade Test Course",
      code: `CAS-${String(time).slice(-4)}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
    });

    // Create section
    const section = await repository.createSection({
      courseId: testCourseId,
      title: "Test Section",
      order: 0,
    });
    expect(section).toBeDefined();

    // Create content item
    const item = await repository.createContentItem({
      sectionId: section!.id,
      type: "reading",
      title: "Test Reading",
      order: 0,
    });
    expect(item).toBeDefined();

    // Create user and progress record on this item
    await repository.createUser({
      id: testUserId,
      name: "Cascade Student",
      email: `cas_${time}@itech.test`,
      passwordHash: "dummy",
      role: "student",
      status: "active",
      joinedAt: new Date(),
      isEmailVerified: true,
    });
    await repository.saveProgress(testUserId, testCourseId, item!.id);

    // Create video checkpoint and student checkpoint progress
    const cp = await repository.saveVideoCheckpoint({
      contentItemId: item!.id,
      timestamp: 10,
      type: "mcq",
      prompt: "Checkpoint Prompt",
    });
    await repository.saveCheckpointProgress({
      studentId: testUserId,
      checkpointId: cp.id,
      isCorrect: true,
    });

    // Delete section - must cascade cleanly without foreign key error!
    const delSecRes = await repository.deleteSection(section!.id);
    expect(delSecRes).toBe(true);

    // Cleanup course and user
    await repository.deleteCourse(testCourseId);
    await repository.deleteUser(testUserId);
  });
});
