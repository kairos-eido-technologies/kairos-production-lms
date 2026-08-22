import { repository } from "../db/repository";
import { sendNewSubmissionEmail, sendSubmissionGradedEmail } from "../mail";
import { certificateService } from "./certificate.service";

export const assessmentService = {
  async listAssessments() {
    return repository.getAssessments();
  },

  async createAssessment(data: any) {
    return repository.createAssessment(data);
  },

  async updateAssessment(id: string, data: any) {
    return repository.updateAssessment(id, data);
  },

  async deleteAssessment(id: string) {
    return repository.deleteAssessment(id);
  },

  async submitAssessmentWithGrading(body: any) {
    // 1. Fetch official assessment and its questions directly from database for tamper-proof grading
    const allAssessments = await repository.getAssessments();
    const assessment = allAssessments.find((a) => a.id === body.assessmentId);
    const dbQuestions = assessment ? assessment.questions : await repository.getQuestions(body.assessmentId);

    const questionMap = new Map<string, any>();
    for (const q of dbQuestions) {
      questionMap.set(q.id, q);
    }

    // 2. Server-side grading calculation (ignoring any client-supplied awarded values for auto-graded questions)
    let totalPossible = 0;
    let earnedScore = 0;
    let hasUngradedShortAnswer = false;

    const verifiedResponses = (body.responses || []).map((r: any) => {
      const q = questionMap.get(r.questionId);
      const pointsPossible = q?.points ?? 1;
      totalPossible += pointsPossible;

      let awarded: number | null = 0;
      if (q && q.type === "short") {
        awarded = r.awarded !== undefined && r.awarded !== null ? Number(r.awarded) : null;
        if (awarded === null) hasUngradedShortAnswer = true;
      } else if (q && q.correctIndex !== null && q.correctIndex !== undefined) {
        const studentChoice = parseInt(String(r.response).trim(), 10);
        if (!isNaN(studentChoice) && studentChoice === q.correctIndex) {
          awarded = pointsPossible;
        } else if (String(r.response).trim().toLowerCase() === String(q.options?.[q.correctIndex] || "").trim().toLowerCase()) {
          awarded = pointsPossible;
        }
      } else if (r.awarded !== undefined && r.awarded !== null) {
        awarded = Number(r.awarded) || 0;
      }

      if (awarded !== null) earnedScore += Math.max(0, Math.min(pointsPossible, awarded));
      return {
        questionId: r.questionId,
        response: String(r.response ?? ""),
        awarded: awarded !== null ? Math.max(0, Math.min(pointsPossible, awarded)) : null,
      };
    });

    if (totalPossible === 0) totalPossible = Math.max(100, verifiedResponses.length * 10);
    earnedScore = Math.min(totalPossible, earnedScore);
    const computedPercentage = Math.min(100, Math.round((earnedScore / totalPossible) * 100));

    // Sanitize proctoring events to prevent invalid injections or bloated payloads
    const sanitizedProctorEvents = Array.isArray(body.proctorEvents)
      ? body.proctorEvents
          .filter((e: any) => e && typeof e.type === "string")
          .map((e: any) => ({
            at: String(e.at || new Date().toISOString()),
            type: String(e.type).slice(0, 50),
            detail: e.detail ? String(e.detail).slice(0, 200) : undefined,
          }))
      : [];

    const isAutoGraded = !hasUngradedShortAnswer;
    const submissionStatus = isAutoGraded ? "graded" : "submitted";

    // 3. Save submission to database
    const submissionPayload = {
      ...body,
      responses: verifiedResponses,
      proctorEvents: sanitizedProctorEvents,
      status: submissionStatus,
    };
    const submission = await repository.createSubmission(submissionPayload);

    // 4. Send notifications & handle completion
    try {
      const student = await repository.getUserById(body.studentId);
      const allCourses = await repository.getCourses(true);
      const course = assessment ? allCourses.find((c) => c.id === assessment.courseId) : null;
      const teacher =
        course && course.teacherId ? await repository.getUserById(course.teacherId) : null;

      if (isAutoGraded) {
        const hasPassed = computedPercentage >= (assessment?.passingScore || 70);

        // Immediate graded email & notification to student
        if (student && assessment) {
          sendSubmissionGradedEmail(
            student.email,
            student.name,
            assessment.title,
            earnedScore,
            totalPossible,
          ).catch(console.error);

          if (course) {
            await repository.createNotification(
              student.id,
              hasPassed ? "Quiz Auto-graded: Passed! 🎉" : "Quiz Auto-graded",
              `${assessment.title}: ${computedPercentage}%. ${hasPassed ? "You passed! Next modules unlocked." : "Did not meet passing score."}`,
              `/student/courses/${course.id}`,
            );
          }
        }

        // If passed, auto-save course progress
        if (hasPassed && course && course.sections) {
          for (const s of course.sections) {
            for (const item of s.items) {
              if (
                item.assessmentId === assessment?.id ||
                item.id === assessment?.id ||
                item.title.trim().toLowerCase() === assessment?.title.trim().toLowerCase()
              ) {
                await repository.saveProgress(body.studentId, course.id, item.id);
              }
            }
          }
        }

        // If this was a Final Exam and passed, auto-generate Certificate Request directly!
        if (hasPassed && assessment?.isFinal && course) {
          try {
            const existingCerts = await repository.getCertificates();
            const alreadyRequested = existingCerts.some(
              (c) => c.studentId === body.studentId && c.courseId === course.id,
            );
            if (!alreadyRequested) {
              await certificateService.requestCertificate({
                studentId: body.studentId,
                courseId: course.id,
                score: computedPercentage,
                proctorLog: sanitizedProctorEvents,
              });
            }
          } catch (certErr) {
            console.error("⚠️ Failed to generate certificate request on auto-graded final exam pass:", certErr);
          }
        }

        // Notify teacher of completed submission
        if (teacher && student && assessment && course) {
          await repository.createNotification(
            teacher.id,
            "Quiz Completed",
            `${student.name} completed "${assessment.title}" (Score: ${computedPercentage}%).`,
            `/teacher/assessments`,
          );
        }
      } else {
        // Needs manual teacher review -> notify teacher
        if (teacher && student && assessment && course) {
          sendNewSubmissionEmail(
            teacher.email,
            teacher.name,
            student.name,
            assessment.title,
            course.name,
          ).catch(console.error);
          await repository.createNotification(
            teacher.id,
            "New Quiz Submission",
            `${student.name} submitted "${assessment.title}". Pending your grading.`,
            `/teacher/assessments`,
          );
          await repository.createMessage(
            student.id,
            teacher.id,
            "Quiz Submission: " + assessment.title,
            `Hello Instructor ${teacher.name},\n\nI have submitted my quiz for "${assessment.title}" in course "${course.name}". Please review and grade my submission.`,
          );
        }
      }
    } catch (err) {
      console.error("Error handling submission notifications & auto-grading:", err);
    }

    return submission;
  },

  async gradeAssessmentSubmission(id: string, feedback?: string, awards?: Record<string, number>) {
    // 1. Persist teacher grading in database
    await repository.gradeSubmission(id, feedback || "", awards);

    // 2. Fetch updated submission, assessment, and student info
    try {
      const sub = await repository.getSubmissionById(id);
      if (!sub) return { ok: true };

      const allAssessments = await repository.getAssessments();
      const assessment = allAssessments.find((a) => a.id === sub.assessmentId);
      const student = await repository.getUserById(sub.studentId);
      const allCourses = await repository.getCourses(true);
      const course = assessment ? allCourses.find((c) => c.id === assessment.courseId) : null;
      const teacher = course && course.teacherId ? await repository.getUserById(course.teacherId) : null;

      if (sub && assessment && student && course) {
        // Calculate final score
        let earnedScore = 0;
        let totalPossible = 0;

        for (const q of assessment.questions) {
          const qPoints = Number(q.points) || 1;
          totalPossible += qPoints;
          const resp = sub.responses.find((r) => r.questionId === q.id);
          if (resp && resp.awarded !== null && resp.awarded !== undefined) {
            earnedScore += Math.max(0, Math.min(qPoints, Number(resp.awarded) || 0));
          }
        }

        if (totalPossible === 0) totalPossible = Math.max(100, assessment.questions.length * 10);
        earnedScore = Math.min(totalPossible, earnedScore);
        const computedPercentage = Math.min(100, Math.round((earnedScore / totalPossible) * 100));
        const hasPassed = computedPercentage >= (assessment.passingScore || 70);

        // 3. Trigger Graded Email ONLY NOW when teacher grades it
        sendSubmissionGradedEmail(
          student.email,
          student.name,
          assessment.title,
          earnedScore,
          totalPossible,
        ).catch(console.error);

        // 4. Send in-app notification & message to student
        const senderId = teacher?.id || course.teacherId || "ADM01";
        await repository.createNotification(
          student.id,
          hasPassed ? "Quiz Graded: Passed! 🎉" : "Quiz Graded",
          `${assessment.title}: ${computedPercentage}%. ${hasPassed ? "You passed! Next modules unlocked." : "Did not meet passing score."}`,
          `/student/courses/${course.id}`,
        );

        await repository.createMessage(
          senderId,
          student.id,
          "Quiz Graded: " + assessment.title,
          `Hello ${student.name},\n\nYour submission for "${assessment.title}" has been graded.\n\nScore: ${earnedScore}/${totalPossible} (${computedPercentage}%)\nPassing requirement: ${assessment.passingScore}%\nResult: ${hasPassed ? "PASSED 🎉" : "NOT PASSED"}\nTeacher Feedback: ${feedback || "No feedback provided."}\n\n${hasPassed ? "Your next course lessons and modules are now unlocked!" : "Please retake the quiz to improve your score and unlock subsequent modules."}`,
        );

        // 5. If passed, unlock next modules by saving course progress
        if (hasPassed && course.sections) {
          for (const s of course.sections) {
            for (const item of s.items) {
              if (
                item.assessmentId === assessment.id ||
                item.id === assessment.id ||
                item.title.trim().toLowerCase() === assessment.title.trim().toLowerCase()
              ) {
                await repository.saveProgress(student.id, course.id, item.id);
              }
            }
          }
        }

        // 6. If this was a Final Exam and the student passed, automatically generate the Certificate Request
        if (assessment.isFinal && hasPassed) {
          try {
            const existingCerts = await repository.getCertificates();
            const alreadyRequested = existingCerts.some(
              (c) => c.studentId === sub.studentId && c.courseId === course.id,
            );
            if (!alreadyRequested) {
              await certificateService.requestCertificate({
                studentId: sub.studentId,
                courseId: course.id,
                score: computedPercentage,
                proctorLog: sub.proctorEvents,
              });
            }
          } catch (certErr) {
            console.error("⚠️ Failed to generate certificate request on final exam pass:", certErr);
          }
        }

        return {
          ok: true,
          score: computedPercentage,
          passed: hasPassed,
          earnedScore,
          totalPossible,
        };
      }
    } catch (err) {
      console.error("Error sending graded notification or unlocking progress:", err);
    }

    return { ok: true };
  },
};
