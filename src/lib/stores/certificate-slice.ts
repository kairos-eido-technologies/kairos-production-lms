import { StateCreator } from "zustand";
import type { Certificate } from "../types/store";
import { normalizeCertificateList, generateCertificateId } from "../utils/formatters";

export interface CertificateSlice {
  certificates: Certificate[];
  requestCertificate: (
    studentId: string,
    courseId: string,
    score: number,
    proctorLogOrNote?: any[] | string,
    initialStatus?: "pending" | "approved",
    teacherNote?: string,
  ) => string;
  issueCertificateDirectly: (
    studentId: string,
    courseId: string,
    score: number,
    teacherNote?: string,
    proctorLog?: any[],
  ) => string;
  approveCertificate: (id: string) => Promise<void>;
  rejectCertificate: (id: string, reason?: string) => Promise<void>;
}

export const createCertificateSlice: StateCreator<CertificateSlice, [], [], CertificateSlice> = (
  set,
  get,
) => ({
  certificates: [],

  requestCertificate: (
    studentId,
    courseId,
    score,
    proctorLogOrNote,
    initialStatus = "pending",
    teacherNote,
  ) => {
    const existing = get().certificates.find(
      (c) => c.studentId === studentId && c.courseId === courseId,
    );
    if (existing) {
      if (initialStatus === "approved" && existing.status !== "approved") {
        get().approveCertificate(existing.id);
      }
      return existing.id;
    }

    const newId = generateCertificateId(get().certificates);
    const proctorLog = Array.isArray(proctorLogOrNote) ? proctorLogOrNote : undefined;
    const finalNote =
      typeof proctorLogOrNote === "string" ? proctorLogOrNote : teacherNote || undefined;
    const normalizedScore = Math.min(100, Math.round(Number(score) || 100));

    const payload: Certificate = {
      id: newId,
      studentId,
      courseId,
      score: normalizedScore,
      status: initialStatus,
      requestedAt: new Date().toISOString().slice(0, 10),
      issuedAt: initialStatus === "approved" ? new Date().toISOString().slice(0, 10) : undefined,
      teacherNote: finalNote,
      proctorLog: proctorLog || undefined,
    };

    set((s) => ({
      certificates: normalizeCertificateList([...s.certificates, payload]),
    }));

    const fullStore = get() as any;
    if (typeof fullStore.addNotification === "function") {
      fullStore.addNotification({
        userId: studentId,
        title: "Certificate Requested",
        message: `Your certificate request has been submitted for review.`,
        link: "/student/certificates",
      });
      fullStore.addNotification({
        userId: "ADM01",
        title: "Certificate Request Pending",
        message: `A certificate request has been submitted and is pending review.`,
        link: "/admin/certificates",
      });
    }

    fetch("/api/certificates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Failed to persist certificate:", err));

    return newId;
  },

  issueCertificateDirectly: (studentId, courseId, score, teacherNote, proctorLog) => {
    return get().requestCertificate(
      studentId,
      courseId,
      score,
      proctorLog,
      "approved",
      teacherNote,
    );
  },

  approveCertificate: async (id) => {
    set((s) => ({
      certificates: s.certificates.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "approved",
              issuedAt: new Date().toISOString().slice(0, 10),
            }
          : c,
      ),
    }));

    try {
      await fetch(`/api/certificates/${id}/approve`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      console.error("Failed to approve certificate:", err);
    }
  },

  rejectCertificate: async (id, reason) => {
    set((s) => ({
      certificates: s.certificates.map((c) =>
        c.id === id ? { ...c, status: "rejected", rejectionReason: reason } : c,
      ),
    }));

    try {
      await fetch(`/api/certificates/${id}/reject`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch (err) {
      console.error("Failed to reject certificate:", err);
    }
  },
});
