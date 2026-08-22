import type {
  User,
  Course,
  Submission,
  StoreAssessment,
  Assessment,
  Certificate,
} from "../types/store";

export const INACTIVITY_THRESHOLD_DAYS = 2;

export function getLastActiveDate(user: User): Date | null {
  if (!user || !user.lastActive) return null;
  const d = new Date(user.lastActive);
  return isNaN(d.getTime()) ? null : d;
}

export function isUserInactive(user: User, thresholdDays = INACTIVITY_THRESHOLD_DAYS): boolean {
  if (!user) return false;
  const lastActive = getLastActiveDate(user);
  const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;
  if (!lastActive) {
    const joined = user.joinedAt ? new Date(user.joinedAt) : new Date();
    return !isNaN(joined.getTime()) && joined.getTime() < cutoff;
  }
  return lastActive.getTime() < cutoff;
}

export function isUserOnline(user: User, thresholdMinutes = 30): boolean {
  if (!user) return false;
  const lastActive = getLastActiveDate(user);
  if (!lastActive) return false;
  return Date.now() - lastActive.getTime() < thresholdMinutes * 60 * 1000;
}

export function formatLastActive(user: User): string {
  if (!user) return "Never";
  const lastActive = getLastActiveDate(user);
  if (!lastActive) return "Never";
  const diffMs = Date.now() - lastActive.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function formatIdleDuration(user: User): string {
  if (!user) return "Never logged in";
  const lastActive = getLastActiveDate(user) || (user.joinedAt ? new Date(user.joinedAt) : null);
  if (!lastActive || isNaN(lastActive.getTime())) return "Never logged in";
  const diffDays = Math.floor((Date.now() - lastActive.getTime()) / 86400000);
  if (diffDays < 1) return "< 1 day";
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export function isCourseExpired(course: Course, studentId?: string | null): boolean {
  if (!course || !studentId) return false;
  const access = course.studentAccess?.[studentId];
  if (!access || access.accessMode === "lifetime") return false;
  if (!access.endDate) return false;
  return new Date(access.endDate) < new Date();
}

export function studentAccessFor(course: Course, studentId?: string | null) {
  if (!course || !studentId) return { accessMode: "lifetime" as const };
  return course.studentAccess?.[studentId] || { accessMode: "lifetime" as const };
}

export function courseProgressPct(
  progress: Record<string, string[]>,
  studentId: string,
  course: Course,
): number {
  if (!course || !course.sections) return 0;
  const allItems = course.sections.flatMap((s) => s.items || []);
  if (allItems.length === 0) return 0;
  const completed = (progress && progress[`${studentId}:${course.id}`]) || [];
  const validCompleted = completed.filter((id) => allItems.some((i) => i.id === id));
  return Math.min(100, Math.round((validCompleted.length / allItems.length) * 100));
}

export function submissionScore(
  assessment: StoreAssessment | Assessment | any,
  sub: Submission | any,
): { earned: number; max: number; pct: number } {
  if (!sub) return { earned: 0, max: 100, pct: 0 };
  
  const questionMap = new Map<string, any>();
  let totalMax = 0;
  if (assessment?.questions && Array.isArray(assessment.questions)) {
    for (const q of assessment.questions) {
      const qPts = Number(q.points) || 1;
      questionMap.set(q.id, q);
      totalMax += qPts;
    }
  }

  let totalEarned = 0;
  for (const r of sub.responses || []) {
    const q = questionMap.get(r.questionId);
    const qMax = q ? (Number(q.points) || 1) : 10;
    const awarded = Math.max(0, Math.min(qMax, Number(r.awarded) || 0));
    totalEarned += awarded;
  }

  const max = totalMax || (sub.responses || []).length * 10 || 100;
  const earned = Math.min(max, totalEarned);
  const pct = max > 0 ? Math.min(100, Math.round((earned / max) * 100)) : 100;
  return { earned, max, pct };
}

export function maxScore(assessment: StoreAssessment | Assessment | any): number {
  if (!assessment || !assessment.questions) return 100;
  return assessment.questions.reduce((sum: number, q: any) => sum + (q.points ?? 1), 0) || 100;
}

export function generateCertificateId(existingCerts: Certificate[]): string {
  const year = new Date().getFullYear();
  const prefix = `ITECH-${year}-`;
  let maxSeq = 0;
  for (const c of existingCerts ?? []) {
    if (c && c.id && c.id.toUpperCase().startsWith(prefix)) {
      const parts = c.id.toUpperCase().split("-");
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

export function normalizeCertificateList(raw: any[]): Certificate[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => ({
    id: c.id,
    studentId: c.studentId || c.student_id,
    courseId: c.courseId || c.course_id,
    score: typeof c.score === "number" ? c.score : 100,
    status: c.status || "pending",
    requestedAt: c.requestedAt || c.requested_at || new Date().toISOString().slice(0, 10),
    issuedAt: c.issuedAt || c.issued_at || undefined,
    teacherNote: c.teacherNote || c.teacher_note || undefined,
    rejectionReason: c.rejectionReason || c.rejection_reason || undefined,
    proctorLog: c.proctorLog || c.proctor_log || undefined,
  }));
}
