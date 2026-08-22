import { getDb } from "../client";
import { certificates, users, courses } from "../schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { makeId, toIsoDate } from "./helpers";

export interface RepositoryCertificate {
  id: string;
  studentId: string;
  courseId: string;
  score: number;
  status: string;
  requestedAt: string;
  issuedAt?: string;
  teacherNote?: string;
  rejectionReason?: string;
  proctorLog?: any;
}

export const certificateRepository = {
  async getCertificates(status?: string | null): Promise<RepositoryCertificate[]> {
    const db = getDb();
    let query = db.select().from(certificates);
    if (status) {
      query = query.where(eq(certificates.status, status)) as any;
    }
    const list = await query.orderBy(desc(certificates.createdAt));

    return list.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      courseId: c.courseId,
      score: c.score,
      status: c.status,
      requestedAt: toIsoDate(c.requestedAt),
      issuedAt: c.issuedAt
        ? toIsoDate(c.issuedAt)
        : c.status === "approved"
          ? toIsoDate(c.requestedAt)
          : undefined,
      teacherNote: c.teacherNote || undefined,
      rejectionReason: c.rejectionReason || undefined,
      proctorLog: c.proctorLog ?? undefined,
    }));
  },

  async getCertificateById(id: string): Promise<RepositoryCertificate | null> {
    const db = getDb();
    const cleanId = id.trim().toLowerCase();
    const rows = await db
      .select()
      .from(certificates)
      .where(sql`lower(${certificates.id}) = ${cleanId}`);
    const cert = rows[0];
    if (!cert) return null;
    return {
      id: cert.id,
      studentId: cert.studentId,
      courseId: cert.courseId,
      score: cert.score,
      status: cert.status,
      requestedAt: toIsoDate(cert.requestedAt),
      issuedAt: cert.issuedAt ? toIsoDate(cert.issuedAt) : undefined,
      teacherNote: cert.teacherNote || undefined,
      rejectionReason: cert.rejectionReason || undefined,
      proctorLog: cert.proctorLog ?? undefined,
    };
  },

  async verifyCertificate(certId: string) {
    if (!certId) return null;
    const db = getDb();
    const cleanId = certId.trim().toLowerCase();
    const rows = await db
      .select()
      .from(certificates)
      .where(
        and(
          sql`lower(${certificates.id}) = ${cleanId}`,
          eq(certificates.status, "approved"),
        ),
      );
    const cert = rows[0];
    if (!cert) return null;

    const studentRows = await db.select().from(users).where(eq(users.id, cert.studentId));
    const student = studentRows[0];
    const courseRows = await db.select().from(courses).where(eq(courses.id, cert.courseId));
    const course = courseRows[0];

    return {
      id: cert.id,
      score: cert.score,
      status: cert.status,
      issuedAt: cert.issuedAt ? toIsoDate(cert.issuedAt) : toIsoDate(cert.requestedAt),
      studentName: student?.name || "Student",
      studentEmail: student?.email || "",
      courseName: course?.name || "Course",
      courseCode: course?.code || "",
    };
  },

  async createCertificate(data: any): Promise<RepositoryCertificate | null> {
    const id = data.id || makeId();
    const requestedAt = data.requestedAt ? new Date(data.requestedAt) : new Date();
    const issuedAt = data.issuedAt
      ? new Date(data.issuedAt)
      : data.status === "approved"
        ? new Date()
        : null;

    const db = getDb();
    await db
      .insert(certificates)
      .values({
        id,
        studentId: data.studentId,
        courseId: data.courseId,
        score: typeof data.score === "number" ? data.score : parseInt(data.score, 10) || 100,
        status: data.status || "pending",
        requestedAt,
        issuedAt,
        teacherNote: data.teacherNote || null,
        rejectionReason: data.rejectionReason || null,
        proctorLog: data.proctorLog || null,
      })
      .onConflictDoUpdate({
        target: certificates.id,
        set: {
          score: typeof data.score === "number" ? data.score : parseInt(data.score, 10) || 100,
          status: data.status || "pending",
          issuedAt,
          teacherNote: data.teacherNote || null,
          rejectionReason: data.rejectionReason || null,
          proctorLog: data.proctorLog || null,
          updatedAt: new Date(),
        },
      });
    return this.getCertificateById(id);
  },

  async approveCertificate(id: string): Promise<RepositoryCertificate | null> {
    const db = getDb();
    await db
      .update(certificates)
      .set({
        status: "approved",
        issuedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(certificates.id, id));
    return this.getCertificateById(id);
  },

  async rejectCertificate(id: string, reason?: string): Promise<RepositoryCertificate | null> {
    const db = getDb();
    await db
      .update(certificates)
      .set({
        status: "rejected",
        rejectionReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(certificates.id, id));
    return this.getCertificateById(id);
  },

  async updateCertificate(id: string, data: any): Promise<RepositoryCertificate | null> {
    const db = getDb();
    const updateData: any = { updatedAt: new Date() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.teacherNote !== undefined) updateData.teacherNote = data.teacherNote;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;
    if (data.score !== undefined)
      updateData.score =
        typeof data.score === "number" ? data.score : parseInt(data.score, 10) || 100;
    if (data.status === "approved") updateData.issuedAt = new Date();

    await db.update(certificates).set(updateData).where(eq(certificates.id, id));
    return this.getCertificateById(id);
  },
};
