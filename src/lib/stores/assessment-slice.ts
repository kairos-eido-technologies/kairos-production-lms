import { StateCreator } from "zustand";
import type {
  StoreAssessment,
  Submission,
  Question,
  SubmissionResponse,
  ProctorEventRecord,
} from "../types/store";

export interface AssessmentSlice {
  assessments: StoreAssessment[];
  submissions: Submission[];
  extraAttempts: Record<string, number>;

  addAssessment: (a: Omit<StoreAssessment, "id" | "questions" | "questionCount">) => string;
  updateAssessment: (id: string, patch: Partial<StoreAssessment>) => void;
  deleteAssessment: (id: string) => void;
  addQuestion: (assessmentId: string, q: Omit<Question, "id">) => void;
  addQuestionsBatch: (assessmentId: string, questions: Omit<Question, "id">[]) => Promise<void>;
  updateQuestion: (assessmentId: string, questionId: string, patch: Partial<Question>) => void;
  deleteQuestion: (assessmentId: string, questionId: string) => void;

  submitAssessment: (sub: Omit<Submission, "id" | "submittedAt" | "status">) => void;
  submitQuiz: (
    assessmentId: string,
    studentId: string,
    answers: Record<string, string> | SubmissionResponse[],
    proctorEvents?: ProctorEventRecord[],
  ) => string;
  gradeSubmission: (
    submissionId: string,
    awardsOrFeedback: Record<string, number> | string,
    feedback?: string,
  ) => void;
  resetAssessmentSubmissions: (studentId: string, assessmentId: string) => Promise<void>;
  resetStudentSubmissions: (studentId: string, assessmentId: string) => Promise<void>;

  grantExtraAttempt: (studentId: string, assessmentId: string, count?: number) => Promise<void>;
  loadExtraAttempts: (preloaded?: Record<string, number>) => Promise<void>;
}

export const createAssessmentSlice: StateCreator<AssessmentSlice, [], [], AssessmentSlice> = (
  set,
  get,
) => ({
  assessments: [],
  submissions: [],
  extraAttempts: {},

  addAssessment: (a) => {
    const tempId = `a-${Date.now().toString(36)}`;
    fetch("/api/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(a),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.assessment) {
          set((s) => ({
            assessments: [
              ...s.assessments.filter((x) => x.id !== tempId && x.id !== data.assessment.id),
              data.assessment,
            ],
          }));
        }
      })
      .catch((err) => console.error("Failed to add assessment:", err));

    const newAssessment: StoreAssessment = {
      ...a,
      id: tempId,
      questions: [],
      questionCount: 0,
    };
    set((s) => ({ assessments: [...s.assessments, newAssessment] }));
    return tempId;
  },

  updateAssessment: (id, patch) => {
    set((s) => ({
      assessments: s.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    fetch(`/api/assessments/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => console.error("Failed to update assessment:", err));
  },

  deleteAssessment: (id) => {
    set((s) => ({ assessments: s.assessments.filter((a) => a.id !== id) }));
    fetch(`/api/assessments/${id}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete assessment:", err),
    );
  },

  addQuestion: (assessmentId, q) => {
    fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...q, assessmentId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.question) {
          set((s) => ({
            assessments: s.assessments.map((a) => {
              if (a.id !== assessmentId) return a;
              const questions = [...a.questions, data.question];
              return { ...a, questions, questionCount: questions.length };
            }),
          }));
        }
      })
      .catch((err) => console.error("Failed to add question:", err));
  },

  addQuestionsBatch: async (assessmentId, questions) => {
    try {
      const res = await fetch("/api/questions/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId, questions }),
      });
      const data = await res.json();
      if (data.questions) {
        set((s) => ({
          assessments: s.assessments.map((a) => {
            if (a.id !== assessmentId) return a;
            const updatedQs = [...a.questions, ...data.questions];
            return { ...a, questions: updatedQs, questionCount: updatedQs.length };
          }),
        }));
      }
    } catch (err) {
      console.error("Failed to add questions batch:", err);
    }
  },

  updateQuestion: (assessmentId, questionId, patch) => {
    set((s) => ({
      assessments: s.assessments.map((a) => {
        if (a.id !== assessmentId) return a;
        return {
          ...a,
          questions: a.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
        };
      }),
    }));
    fetch(`/api/questions/${questionId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => console.error("Failed to update question:", err));
  },

  deleteQuestion: (assessmentId, questionId) => {
    set((s) => ({
      assessments: s.assessments.map((a) => {
        if (a.id !== assessmentId) return a;
        const questions = a.questions.filter((q) => q.id !== questionId);
        return { ...a, questions, questionCount: questions.length };
      }),
    }));
    fetch(`/api/questions/${questionId}`, { method: "DELETE" }).catch((err) =>
      console.error("Failed to delete question:", err),
    );
  },

  submitAssessment: (sub) => {
    fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.submission) {
          set((s) => ({
            submissions: [
              ...s.submissions.filter((x) => x.id !== data.submission.id),
              data.submission,
            ],
          }));
        }
      })
      .catch((err) => console.error("Failed to submit assessment:", err));
  },

  submitQuiz: (assessmentId, studentId, answers, proctorEvents) => {
    const id = `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const assessment = get().assessments.find((a) => a.id === assessmentId);

    let responsesList: SubmissionResponse[] = [];
    if (Array.isArray(answers)) {
      responsesList = answers;
    } else {
      responsesList = Object.entries(answers || {}).map(([questionId, response]) => {
        const question = (assessment?.questions || []).find((q) => q.id === questionId);
        let awarded: number | null = 0;
        if (question) {
          if (question.type === "mcq" || question.type === "truefalse") {
            const chosenIdx = parseInt(response, 10);
            awarded = chosenIdx === question.correctIndex ? question.points : 0;
          } else {
            awarded = null; // short answers require manual grading
          }
        }
        return { questionId, response, awarded };
      });
    }

    const hasShortAnswer = responsesList.some((r) => r.awarded === null);
    const status = hasShortAnswer ? "submitted" : "graded";

    const payload: Submission = {
      id,
      assessmentId,
      studentId,
      responses: responsesList,
      proctorEvents,
      submittedAt: new Date().toISOString().slice(0, 10),
      status,
    };

    set((s) => ({
      submissions: [...s.submissions.filter((x) => x.id !== id), payload],
    }));

    if (status === "graded" && assessment) {
      const earned = responsesList.reduce((sum, r) => sum + (Number(r.awarded) || 0), 0);
      const max = assessment.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
      const hasPassed = pct >= assessment.passingScore;

      if (hasPassed && assessment.isFinal) {
        const fullStore = get() as any;
        const existingCert = (fullStore.certificates || []).find(
          (c: any) => c.studentId === studentId && c.courseId === assessment.courseId,
        );
        if (!existingCert && typeof fullStore.requestCertificate === "function") {
          fullStore.requestCertificate(
            studentId,
            assessment.courseId,
            pct,
            proctorEvents,
          );
        }
      }
    }

    fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Failed to persist submission:", err));

    return id;
  },

  gradeSubmission: (submissionId, awardsOrFeedback, feedback) => {
    const awards = typeof awardsOrFeedback === "object" ? awardsOrFeedback : undefined;
    const finalFeedback = typeof awardsOrFeedback === "string" ? awardsOrFeedback : feedback || "";

    const targetSub = get().submissions.find((s) => s.id === submissionId);
    const targetAssessment = get().assessments.find((a) => a.id === targetSub?.assessmentId);

    set((s) => ({
      submissions: s.submissions.map((sub) => {
        if (sub.id !== submissionId) return sub;
        const responses = awards
          ? sub.responses.map((r) => ({
              ...r,
              awarded: awards[r.questionId] !== undefined ? awards[r.questionId] : r.awarded,
            }))
          : sub.responses;
        return { ...sub, responses, status: "graded", feedback: finalFeedback };
      }),
    }));

    if (targetSub && targetAssessment) {
      const updatedResponses = awards
        ? targetSub.responses.map((r) => ({
            ...r,
            awarded: awards[r.questionId] !== undefined ? awards[r.questionId] : r.awarded,
          }))
        : targetSub.responses;
      const earned = updatedResponses.reduce((sum, r) => sum + (Number(r.awarded) || 0), 0);
      const max = targetAssessment.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
      const hasPassed = pct >= targetAssessment.passingScore;

      if (targetAssessment.isFinal && hasPassed) {
        const fullStore = get() as any;
        const existingCert = (fullStore.certificates || []).find(
          (c: any) => c.studentId === targetSub.studentId && c.courseId === targetAssessment.courseId,
        );
        if (!existingCert && typeof fullStore.requestCertificate === "function") {
          fullStore.requestCertificate(
            targetSub.studentId,
            targetAssessment.courseId,
            pct,
            targetSub.proctorEvents,
          );
        }
      }
    }

    fetch(`/api/submissions/${submissionId}/grade`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feedback: finalFeedback, awards }),
    }).catch((err) => console.error("Failed to grade submission:", err));
  },

  resetAssessmentSubmissions: async (studentId, assessmentId) => {
    set((s) => ({
      submissions: s.submissions.filter(
        (sub) => !(sub.studentId === studentId && sub.assessmentId === assessmentId),
      ),
    }));
    try {
      await fetch("/api/reset-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, assessmentId }),
      });
    } catch (err) {
      console.error("Failed to reset submissions:", err);
    }
  },

  resetStudentSubmissions: async (studentId, assessmentId) => {
    return get().resetAssessmentSubmissions(studentId, assessmentId);
  },

  grantExtraAttempt: async (studentId, assessmentId, count = 1) => {
    const key = `${studentId}:${assessmentId}`;
    set((s) => ({
      extraAttempts: {
        ...s.extraAttempts,
        [key]: (s.extraAttempts[key] || 0) + count,
      },
    }));
    try {
      await fetch("/api/extra-attempts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId, assessmentId, count }),
      });
    } catch (err) {
      console.error("Failed to grant extra attempt:", err);
    }
  },

  loadExtraAttempts: async (preloaded) => {
    if (preloaded) {
      set({ extraAttempts: preloaded });
      return;
    }
    try {
      const res = await fetch("/api/extra-attempts");
      const data = await res.json();
      if (data.extraAttempts) {
        set({ extraAttempts: data.extraAttempts });
      }
    } catch (err) {
      console.error("Failed to load extra attempts:", err);
    }
  },
});
