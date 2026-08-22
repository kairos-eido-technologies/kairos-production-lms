import { repository } from "../db/repository";
import {
  sendCertificateRequestedEmail,
  sendCertificateApprovedEmail,
  sendCertificateRejectedEmail,
} from "../mail";

export const certificateService = {
  async verifyCertificate(certId: string) {
    return repository.verifyCertificate(certId);
  },

  async getCertificateById(id: string) {
    const cert = await repository.getCertificateById(id);
    if (!cert) return null;

    const student = await repository.getUserById(cert.studentId);
    const allCourses = await repository.getCourses(true);
    const course = allCourses.find((c) => c.id === cert.courseId);

    return {
      ...cert,
      studentName: student?.name || "Student",
      studentEmail: student?.email || "",
      courseName: course?.name || "Course",
      courseCode: course?.code || "",
    };
  },

  async listCertificates(status?: string | null) {
    return repository.getCertificates(status);
  },

  async requestCertificate(data: any) {
    const cert = await repository.createCertificate(data);
    if (cert) {
      const student = await repository.getUserById(data.studentId);
      const allCourses = await repository.getCourses(true);
      const course = allCourses.find((c) => c.id === data.courseId);
      const score = Math.min(100, Math.round(Number(data.score) || 100));

      if (student && course) {
        sendCertificateRequestedEmail(student.email, student.name, student.name, course.name).catch(
          console.error,
        );

        // 1. Notify Student
        await repository.createNotification(
          student.id,
          "Certificate Requested",
          `Your certificate request for ${course.name} has been submitted for instructor and admin review.`,
          `/student/certificates`,
        );

        // 2. Notify & Message Teacher
        if (course.teacherId) {
          await repository.createNotification(
            course.teacherId,
            "Certificate Request Pending",
            `${student.name} completed "${course.name}" (${score}%). Certificate pending review.`,
            `/teacher/certificates`,
          );
          await repository.createMessage(
            student.id,
            course.teacherId,
            "Certificate Request: " + course.name,
            `Hello Instructor,\n\nI have passed the final exam for "${course.name}" with a score of ${score}%. My certificate request is now pending your review and issuance.\n\nThank you!`,
          );
        }

        // 3. Notify & Message Admin
        await repository.createNotification(
          "ADM01",
          "Certificate Request Pending",
          `${student.name} requested a certificate for "${course.name}" (${score}%).`,
          `/admin/certificates`,
        );
        await repository.createMessage(
          student.id,
          "ADM01",
          "Certificate Request: " + course.name,
          `Hello Admin,\n\nI have completed the course "${course.name}" with a final score of ${score}%. My certificate request is ready for approval.\n\nThank you!`,
        );
      }
    }
    return cert;
  },

  async approveCertificate(id: string, teacherNote?: string) {
    const updated = await repository.approveCertificate(id);
    if (teacherNote) {
      await repository.updateCertificate(id, { teacherNote });
    }

    if (updated) {
      const student = await repository.getUserById(updated.studentId);
      const allCourses = await repository.getCourses(true);
      const course = allCourses.find((c) => c.id === updated.courseId);

      if (student && course) {
        sendCertificateApprovedEmail(student.email, student.name, course.name).catch(console.error);

        await repository.createNotification(
          student.id,
          "Certificate Approved! 🎓",
          `Congratulations! Your certificate for ${course.name} has been approved and issued.`,
          `/student/certificates`,
        );

        const senderId = course.teacherId || "ADM01";
        await repository.createMessage(
          senderId,
          student.id,
          `Certificate Approved: ${course.name}`,
          `Dear ${student.name},\n\nCongratulations on successfully completing ${course.name}! Your verified certificate has been issued and is available for download and public verification.\n\nScore: ${updated.score}%\nCertificate ID: ${updated.id}`,
        );
      }
    }

    return updated;
  },

  async rejectCertificate(id: string, reason?: string) {
    const updated = await repository.rejectCertificate(id, reason);
    if (updated) {
      const student = await repository.getUserById(updated.studentId);
      const allCourses = await repository.getCourses(true);
      const course = allCourses.find((c) => c.id === updated.courseId);

      if (student && course) {
        sendCertificateRejectedEmail(
          student.email,
          student.name,
          course.name,
          reason || "Requirements not fully met.",
        ).catch(console.error);

        await repository.createNotification(
          student.id,
          "Certificate Update",
          `Your certificate request for ${course.name} was not approved: ${reason || "Requirements not met."}`,
          `/student/certificates`,
        );
      }
    }
    return updated;
  },
};
