import { repository } from "../db/repository";
import { sendCourseAssignedEmail, sendTeacherCourseAssignedEmail } from "../mail";

export const courseService = {
  async listCourses(isAuthenticated = false) {
    return repository.getCourses(isAuthenticated);
  },

  async createCourseWithNotifications(body: any) {
    if (body.teacherId) {
      const teacher = await repository.getUserById(body.teacherId);
      if (!teacher) {
        throw new Error("The assigned instructor (teacherId) does not exist in the database.");
      }
    }

    const courseObj = await repository.createCourse(body);

    // Send email and in-app notification to the assigned teacher
    if (body.teacherId) {
      const teacher = await repository.getUserById(body.teacherId);
      if (teacher) {
        sendTeacherCourseAssignedEmail(
          teacher.email,
          teacher.name,
          body.name || "Untitled",
          body.code || "",
        ).catch(console.error);
        await repository.createNotification(
          teacher.id,
          "Course Assigned",
          `You have been assigned to teach course ${body.name || "Untitled"} (${body.code || ""}).`,
          `/teacher/content`,
        );
        await repository.createMessage(
          "ADM01",
          teacher.id,
          "Teaching Assignment: " + (body.name || "Untitled"),
          `Hello Instructor ${teacher.name},\n\nYou have been assigned as the primary instructor for the course: ${body.name || "Untitled"} (${body.code || ""}). You can now build sections, add content items, create assessments, and manage enrollments.`,
        );
      }
    }

    // Send emails and messages to enrolled students
    if (body.studentIds && Array.isArray(body.studentIds)) {
      for (const studentId of body.studentIds) {
        const student = await repository.getUserById(studentId);
        if (student) {
          const accessInfo = body.studentAccess?.[studentId];
          const accessMode = accessInfo?.accessMode || "lifetime";
          const endDate = accessInfo?.endDate || null;

          sendCourseAssignedEmail(
            student.email,
            student.name,
            body.name || "Untitled",
            body.code || "",
            accessMode,
            endDate,
          ).catch(console.error);

          const accessText =
            accessMode === "limited" && endDate
              ? ` Access is valid until ${new Date(endDate).toLocaleDateString()}.`
              : " Lifetime Access.";

          await repository.createNotification(
            student.id,
            "New Course Assigned",
            `You have been assigned to course ${body.name || "Untitled"} (${body.code || ""}).${accessText}`,
            `/student/courses/${courseObj?.id}`,
          );
          const senderId = body.teacherId || "ADM01";
          await repository.createMessage(
            senderId,
            student.id,
            "New Course Enrollment: " + (body.name || "Untitled"),
            `Hello ${student.name},\n\nYou have been enrolled in the course: ${body.name || "Untitled"} (${body.code || ""}).${accessText} You can access it on your student portal.`,
          );
        }
      }
    }

    return courseObj;
  },

  async updateCourseWithNotifications(id: string, body: any) {
    const existingCourse = (await repository.getCourses(true)).find((c) => c.id === id);
    const oldTeacherId = existingCourse?.teacherId;
    const oldStudentIds = new Set(existingCourse?.studentIds || []);

    if (body.teacherId) {
      const teacher = await repository.getUserById(body.teacherId);
      if (!teacher) {
        throw new Error("The assigned instructor (teacherId) does not exist in the database.");
      }
    }

    const updated = await repository.updateCourse(id, body);

    // Send email to newly assigned teacher
    if (updated && updated.teacherId && updated.teacherId !== oldTeacherId) {
      const teacher = await repository.getUserById(updated.teacherId);
      if (teacher) {
        sendTeacherCourseAssignedEmail(
          teacher.email,
          teacher.name,
          updated.name,
          updated.code,
        ).catch(console.error);
        await repository.createNotification(
          teacher.id,
          "Course Assigned",
          `You have been assigned to teach course ${updated.name} (${updated.code}).`,
          `/teacher/content`,
        );
        await repository.createMessage(
          "ADM01",
          teacher.id,
          "Teaching Assignment: " + updated.name,
          `Hello Instructor ${teacher.name},\n\nYou have been assigned as the primary instructor for the course: ${updated.name} (${updated.code}).`,
        );
      }
    }

    // Send emails and messages to newly enrolled students or students whose access has changed
    if (body.studentIds && Array.isArray(body.studentIds)) {
      const newlyEnrolled = body.studentIds.filter((sid: string) => !oldStudentIds.has(sid));
      const accessChanged = body.studentAccess
        ? Object.keys(body.studentAccess).filter((sid: string) => {
            if (newlyEnrolled.includes(sid)) return false;
            const oldAccess = existingCourse?.studentAccess?.[sid];
            const newAccess = body.studentAccess[sid];
            if (!oldAccess && newAccess) return true;
            if (
              oldAccess &&
              newAccess &&
              (oldAccess.accessMode !== newAccess.accessMode ||
                oldAccess.endDate !== newAccess.endDate)
            ) {
              return true;
            }
            return false;
          })
        : [];

      const studentsToNotify = Array.from(new Set([...newlyEnrolled, ...accessChanged]));

      for (const studentId of studentsToNotify) {
        const student = await repository.getUserById(studentId);
        if (student) {
          const courseName = updated?.name || existingCourse?.name || "Course";
          const courseCode = updated?.code || existingCourse?.code || "";
          const accessInfo = body.studentAccess?.[studentId] || updated?.studentAccess?.[studentId];
          const accessMode = accessInfo?.accessMode || "lifetime";
          const endDate = accessInfo?.endDate || null;

          sendCourseAssignedEmail(
            student.email,
            student.name,
            courseName,
            courseCode,
            accessMode,
            endDate,
          ).catch(console.error);

          const accessText =
            accessMode === "limited" && endDate
              ? ` Access is valid until ${new Date(endDate).toLocaleDateString()}.`
              : " Lifetime Access.";

          await repository.createNotification(
            student.id,
            "Course Enrollment Updated",
            `You have been assigned to course ${courseName} (${courseCode}).${accessText}`,
            `/student/courses/${id}`,
          );
          const senderId = updated?.teacherId || existingCourse?.teacherId || "ADM01";
          await repository.createMessage(
            senderId,
            student.id,
            "Course Enrollment: " + courseName,
            `Hello ${student.name},\n\nYou have been enrolled in the course: ${courseName} (${courseCode}).${accessText} You can now access your learning path on the student dashboard.`,
          );
        }
      }
    }

    return updated;
  },

  async deleteCourseWithCleanup(id: string) {
    return repository.deleteCourse(id);
  },
};
