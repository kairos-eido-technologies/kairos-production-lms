import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Printer,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
} from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import { downloadCSV } from "@/lib/exports";
import type { Certificate } from "@/lib/mock-data";
import { GenerateCertModal } from "@/components/admin-certificates/GenerateCertModal";
import { RejectCertModal } from "@/components/admin-certificates/RejectCertModal";
import { VerifyCertSection } from "@/components/admin-certificates/VerifyCertSection";

export const Route = createFileRoute("/admin/certificates")({ component: AdminCertificates });

function AdminCertificates() {
  const {
    certificates,
    users,
    courses,
    assessments,
    submissions,
    approveCertificate,
    rejectCertificate,
    issueCertificateDirectly,
  } = useData();
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [rejecting, setRejecting] = useState<Certificate | null>(null);
  const [reason, setReason] = useState("");
  const [viewingLog, setViewingLog] = useState<Certificate | null>(null);
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; cert?: Certificate }>(
    null,
  );

  // Generate Certificate Modal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStudentId, setGenStudentId] = useState("");
  const [genCourseId, setGenCourseId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [genScore, setGenScore] = useState<number>(100);
  const [genNote, setGenNote] = useState("");

  // Preview & Print Modal State
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const userEmail = (id: string) => users.find((u) => u.id === id)?.email ?? "—";
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";

  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query),
    );
  }, [students, studentSearch]);

  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.code && c.code.toLowerCase().includes(query)) ||
        (c.description && c.description.toLowerCase().includes(query)),
    );
  }, [courses, courseSearch]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return certificates.filter((c) => {
      if (c.status !== tab) return false;
      if (!query) return true;
      return (
        userName(c.studentId).toLowerCase().includes(query) ||
        courseName(c.courseId).toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
    });
  }, [certificates, tab, q, users, courses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const counts = {
    pending: certificates.filter((c) => c.status === "pending").length,
    approved: certificates.filter((c) => c.status === "approved").length,
    rejected: certificates.filter((c) => c.status === "rejected").length,
  };

  const handleReject = () => {
    if (!rejecting) return;
    rejectCertificate(rejecting.id, reason.trim() || undefined);
    toast.success("Request rejected");
    setRejecting(null);
    setReason("");
  };

  const susTypes = new Set([
    "fullscreen_exit",
    "tab_blur",
    "visibility_hidden",
    "copy",
    "paste",
    "context_menu",
    "key_meta",
    "camera_denied",
    "camera_ended",
    "camera_motion",
    "multiple_faces",
  ]);

  const getCertProctorLog = (c: Certificate) => {
    if (c.proctorLog && Array.isArray(c.proctorLog) && c.proctorLog.length > 0) return c.proctorLog;
    const courseAssessments = assessments.filter((a) => a.courseId === c.courseId);
    const finalAssess = courseAssessments.find((a) => a.isFinal) || courseAssessments[0];
    if (finalAssess) {
      const sub = submissions.find(
        (s) => s.studentId === c.studentId && s.assessmentId === finalAssess.id,
      );
      if (sub?.proctorEvents && sub.proctorEvents.length > 0) return sub.proctorEvents;
    }
    return [];
  };

  const susCount = (c: Certificate) =>
    getCertProctorLog(c).filter((e: any) => susTypes.has(e.type)).length;

  const handlePrint = (c: Certificate) => {
    const course = courses.find((x) => x.id === c.courseId);
    openPrintableCertificate({
      id: c.id,
      studentName: userName(c.studentId),
      studentEmail: userEmail(c.studentId),
      courseName: courseName(c.courseId),
      courseCode: course?.code,
      teacherName: users.find((u) => u.id === course?.teacherId)?.name ?? "Instructor",
      score: c.score,
      issuedAt: c.issuedAt,
      requestedAt: c.requestedAt,
    });
  };

  const handleVerify = () => {
    const id = verifyId.trim().toLowerCase();
    const cert = certificates.find(
      (c) => c.id.trim().toLowerCase() === id && c.status === "approved",
    );
    setVerifyResult({ ok: !!cert, cert });
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genStudentId || !genCourseId) {
      toast.error("Please select both a student and a course.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const createdId = issueCertificateDirectly(genStudentId, genCourseId, genScore, genNote.trim());

    const newCert: Certificate = {
      id: createdId,
      studentId: genStudentId,
      courseId: genCourseId,
      score: genScore,
      status: "approved",
      requestedAt: today,
      issuedAt: today,
      teacherNote: genNote.trim() || "Issued by Administrator",
    };

    toast.success(`Certificate issued successfully! Unique ID: ${createdId}`);
    setVerifyId(createdId);
    setIsGenerating(false);
    setGenStudentId("");
    setGenCourseId("");
    setStudentSearch("");
    setCourseSearch("");
    setGenScore(100);
    setGenNote("");
    setTab("approved");
    setPage(1);

    setPreviewCert(newCert);
  };

  const exportAllCsv = () => {
    const rows: (string | number)[][] = [
      [
        "Certificate ID",
        "Student",
        "Email",
        "Course",
        "Course Code",
        "Score",
        "Status",
        "Requested",
        "Issued",
        "Suspicious Events",
        "Teacher Note",
        "Rejection Reason",
      ],
      ...certificates.map((c) => {
        const course = courses.find((x) => x.id === c.courseId);
        return [
          c.id,
          userName(c.studentId),
          userEmail(c.studentId),
          courseName(c.courseId),
          course?.code ?? "",
          c.score,
          c.status,
          c.requestedAt,
          c.issuedAt ?? "",
          susCount(c),
          c.teacherNote ?? "",
          c.rejectionReason ?? "",
        ];
      }),
    ];
    downloadCSV(`certificates-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certificate Approvals & Issuance"
        subtitle="Review teacher recommendations, inspect proctor logs, issue and verify unique certificates."
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="gradient-primary text-primary-foreground border-0 gap-1.5"
              onClick={() => setIsGenerating(true)}
            >
              <Plus className="h-4 w-4" /> Generate Certificate
            </Button>
            <Button variant="outline" onClick={exportAllCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending Approval" value={counts.pending} icon={Clock} />
        <StatCard
          label="Approved & Issued"
          value={counts.approved}
          icon={CheckCircle2}
          delay={0.05}
          accent
        />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} delay={0.1} />
      </div>

      {/* Verify Certificate Section */}
      <VerifyCertSection
        verifyId={verifyId}
        setVerifyId={setVerifyId}
        verifyResult={verifyResult}
        handleVerify={handleVerify}
        userName={userName}
        courseName={courseName}
        onPreview={(cert) => setPreviewCert(cert)}
      />

      {/* Main Tabs Card */}
      <GlassCard className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            value={tab}
            onValueChange={(val) => {
              setTab(val);
              setPage(1);
            }}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search student, course, ID..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Certificate list */}
        <div className="space-y-3">
          {paginated.map((c) => {
            const course = courses.find((x) => x.id === c.courseId);
            const teacher = users.find((u) => u.id === course?.teacherId);
            const sus = susCount(c);

            return (
              <div
                key={c.id}
                className="p-5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                      {c.id}
                    </Badge>
                    <span className="font-bold text-base text-foreground">
                      {userName(c.studentId)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({userEmail(c.studentId)})
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-x-2">
                    <span>
                      Course: <strong className="text-foreground">{courseName(c.courseId)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Instructor: <strong>{teacher?.name ?? "Assigned Teacher"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Score: <strong className="text-primary">{c.score}%</strong>
                    </span>
                  </div>

                  {c.teacherNote && (
                    <p className="text-xs text-foreground/80 bg-secondary/30 rounded-lg p-2 mt-1">
                      Teacher Note: "{c.teacherNote}"
                    </p>
                  )}
                  {c.rejectionReason && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2 mt-1">
                      Rejection Reason: "{c.rejectionReason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const log = getCertProctorLog(c);
                    if (log.length === 0) return null;
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingLog({ ...c, proctorLog: log })}
                        className={`h-8 text-xs cursor-pointer ${sus > 0 ? "border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : ""}`}
                      >
                        Proctor Log ({sus} alert{sus === 1 ? "" : "s"})
                      </Button>
                    );
                  })()}

                  {tab === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          approveCertificate(c.id);
                          toast.success(`Approved certificate for ${userName(c.studentId)}`);
                        }}
                        className="h-8 gradient-primary text-primary-foreground border-0 glow text-xs gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Issue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejecting(c);
                          setReason("");
                        }}
                        className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}

                  {tab === "approved" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewCert(c)}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrint(c)}
                        className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No {tab} certificates found.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({filtered.length} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Direct Generate Certificate Modal */}
      <GenerateCertModal
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        genStudentId={genStudentId}
        setGenStudentId={setGenStudentId}
        genCourseId={genCourseId}
        setGenCourseId={setGenCourseId}
        studentSearch={studentSearch}
        setStudentSearch={setStudentSearch}
        courseSearch={courseSearch}
        setCourseSearch={setCourseSearch}
        genScore={genScore}
        setGenScore={setGenScore}
        genNote={genNote}
        setGenNote={setGenNote}
        filteredStudents={filteredStudents}
        filteredCourses={filteredCourses}
        handleGenerate={handleGenerateSubmit}
      />

      {/* Reject Certificate Dialog */}
      <RejectCertModal
        rejecting={rejecting}
        setRejecting={setRejecting}
        reason={reason}
        setReason={setReason}
        studentName={rejecting ? userName(rejecting.studentId) : ""}
        handleReject={handleReject}
      />

      {/* Proctor Activity Log Modal */}
      <Dialog open={!!viewingLog} onOpenChange={(o) => !o && setViewingLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proctor activity log</DialogTitle>
            <DialogDescription>
              {viewingLog && (
                <>
                  {userName(viewingLog.studentId)} · {courseName(viewingLog.courseId)} ·{" "}
                  {viewingLog.proctorLog?.length ?? 0} events ·{" "}
                  {susCount(viewingLog)} flagged alerts
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-secondary/30 text-xs font-mono">
            {(viewingLog?.proctorLog ?? []).length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No proctor events recorded for this exam attempt.</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    <th className="text-left p-2.5">Time</th>
                    <th className="text-left p-2.5">Event</th>
                    <th className="text-left p-2.5">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {viewingLog!.proctorLog!.map((e: any, i: number) => {
                    const isSus = susTypes.has(e.type);
                    return (
                      <tr
                        key={i}
                        className={
                          isSus
                            ? "bg-amber-500/10 text-amber-500 font-semibold dark:bg-amber-500/15"
                            : "hover:bg-secondary/40"
                        }
                      >
                        <td className="p-2.5 whitespace-nowrap">
                          {new Date(e.at).toLocaleTimeString()}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={
                              isSus
                                ? "px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold"
                                : ""
                            }
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{e.detail ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Visual Preview Dialog */}
      <Dialog open={!!previewCert} onOpenChange={(open) => !open && setPreviewCert(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview: {previewCert?.id}</DialogTitle>
            <DialogDescription>
              Verified Certificate issued to {previewCert ? userName(previewCert.studentId) : ""}
            </DialogDescription>
          </DialogHeader>
          {previewCert && (
            <div className="space-y-4 py-2">
              <div className="p-8 rounded-2xl border-4 border-amber-500/40 bg-linear-to-b from-card to-secondary/30 text-center space-y-4 relative overflow-hidden">
                <div className="text-xs uppercase tracking-widest text-primary font-bold">
                  iTech Academy • Certificate of Completion
                </div>
                <h2 className="text-2xl font-extrabold text-foreground font-serif">
                  {userName(previewCert.studentId)}
                </h2>
                <p className="text-xs text-muted-foreground">
                  has successfully completed all requirements for
                </p>
                <h3 className="text-lg font-bold text-primary font-serif">
                  {courseName(previewCert.courseId)}
                </h3>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-6 border-t border-border/40 max-w-md mx-auto">
                  <div>
                    <div className="font-semibold text-foreground">
                      {previewCert.issuedAt ?? new Date().toISOString().slice(0, 10)}
                    </div>
                    <div>Issued Date</div>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] bg-background text-primary font-bold"
                  >
                    {previewCert.id}
                  </Badge>
                  <div>
                    <div className="font-semibold text-foreground">Ram Subramaniyan</div>
                    <div>Founder & Director</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewCert(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => handlePrint(previewCert)}
                  className="gradient-primary text-primary-foreground border-0 glow gap-2"
                >
                  <Printer className="h-4 w-4" /> Print Certificate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
