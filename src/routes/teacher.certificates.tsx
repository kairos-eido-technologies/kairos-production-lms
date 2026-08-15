import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, Send, Clock, CheckCircle2, XCircle, ShieldCheck, Printer, Eye, Download } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, submissionScore } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import { downloadCSV } from "@/lib/exports";
import type { Certificate } from "@/lib/mock-data";

const ITEMS_PER_PAGE = 25;

export const Route = createFileRoute("/teacher/certificates")({ component: TeacherCertificates });

function TeacherCertificates() {
  const { user } = useAuth();
  const { courses, users, certificates, assessments, submissions, progress, requestCertificate } = useData();

  const [eligiblePage, setEligiblePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const myCerts = certificates.filter((c) => myCourseIds.has(c.courseId));

  // Build eligible students with no pending/approved cert yet for that course
  const eligible = useMemo(() => {
    const rows: Array<{ studentId: string; studentName: string; courseId: string; courseName: string; pct: number; avgQuiz: number | null }> = [];
    for (const c of myCourses) {
      const courseAssessments = assessments.filter((a) => a.courseId === c.id);
      for (const sid of c.studentIds) {
        const existing = certificates.find((cert) => cert.studentId === sid && cert.courseId === c.id && cert.status !== "rejected");
        if (existing) continue;
        const st = users.find((u) => u.id === sid);
        if (!st) continue;
        const pct = courseProgressPct(progress, sid, c);
        const mySubs = submissions.filter((s) => s.studentId === sid && courseAssessments.some((a) => a.id === s.assessmentId));
        let avg: number | null = null;
        if (mySubs.length > 0) {
          let total = 0;
          for (const s of mySubs) { const a = courseAssessments.find((x) => x.id === s.assessmentId)!; total += submissionScore(a, s).pct; }
          avg = Math.round(total / mySubs.length);
        }
        rows.push({ studentId: sid, studentName: st.name, courseId: c.id, courseName: c.name, pct, avgQuiz: avg });
      }
    }
    return rows;
  }, [myCourses, users, certificates, assessments, submissions, progress]);

  // Paginated lists
  const eligibleTotalPages = Math.ceil(eligible.length / ITEMS_PER_PAGE) || 1;
  const currentEligiblePage = Math.min(eligiblePage, eligibleTotalPages);
  const paginatedEligible = useMemo(() => {
    const start = (currentEligiblePage - 1) * ITEMS_PER_PAGE;
    return eligible.slice(start, start + ITEMS_PER_PAGE);
  }, [eligible, currentEligiblePage]);

  const historyTotalPages = Math.ceil(myCerts.length / ITEMS_PER_PAGE) || 1;
  const currentHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedHistory = useMemo(() => {
    const start = (currentHistoryPage - 1) * ITEMS_PER_PAGE;
    return myCerts.slice(start, start + ITEMS_PER_PAGE);
  }, [myCerts, currentHistoryPage]);

  // request dialog
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [teacherStudentSearch, setTeacherStudentSearch] = useState("");
  const [teacherCourseSearch, setTeacherCourseSearch] = useState("");
  const [score, setScore] = useState(85);
  const [note, setNote] = useState("");

  // Preview Certificate state
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  const openFor = (sid: string, cid: string, suggestedScore: number) => {
    setStudentId(sid); setCourseId(cid); setScore(suggestedScore); setNote("");
    setTeacherStudentSearch(""); setTeacherCourseSearch("");
    setOpen(true);
  };

  const submit = () => {
    if (!studentId || !courseId) { toast.error("Pick a student and course."); return; }
    if (score < 0 || score > 100) { toast.error("Score must be 0–100."); return; }
    requestCertificate(studentId, courseId, score, note.trim() || undefined);
    toast.success("Request submitted to admin for approval.");
    setOpen(false);
    setTeacherStudentSearch("");
    setTeacherCourseSearch("");
  };

  const counts = {
    pending: myCerts.filter((c) => c.status === "pending").length,
    approved: myCerts.filter((c) => c.status === "approved").length,
    rejected: myCerts.filter((c) => c.status === "rejected").length,
  };

  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";
  const studentName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const studentEmail = (id: string) => users.find((u) => u.id === id)?.email ?? "";

  const susTypes = new Set(["fullscreen_exit","tab_blur","visibility_hidden","copy","paste","context_menu","key_meta","camera_denied","camera_ended","camera_motion","multiple_faces"]);
  const susCount = (c: Certificate) => (c.proctorLog ?? []).filter((e) => susTypes.has(e.type)).length;

  const [viewingLog, setViewingLog] = useState<Certificate | null>(null);
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; cert?: Certificate }>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const id = verifyId.trim();
    const cert = certificates.find((c) => c.id.toLowerCase() === id.toLowerCase() && c.status === "approved");
    setVerifyResult({ ok: !!cert, cert });
  };

  const handlePrint = (c: Certificate) => {
    const course = courses.find((x) => x.id === c.courseId);
    openPrintableCertificate({
      id: c.id,
      studentName: studentName(c.studentId),
      studentEmail: studentEmail(c.studentId),
      courseName: courseName(c.courseId),
      courseCode: course?.code,
      teacherName: user?.name ?? "Instructor",
      score: c.score,
      issuedAt: c.issuedAt,
      requestedAt: c.requestedAt,
    });
  };

  const exportStudentsCsv = () => {
    const rows: (string | number)[][] = [
      ["Student","Email","Course","Course Code","Progress %","Quiz Average %","Certificate Status","Certificate Score","Suspicious Events","Certificate ID"],
    ];
    for (const c of myCourses) {
      const courseAssessments = assessments.filter((a) => a.courseId === c.id);
      for (const sid of c.studentIds) {
        const st = users.find((u) => u.id === sid);
        if (!st) continue;
        const pct = courseProgressPct(progress, sid, c);
        const mySubs = submissions.filter((s) => s.studentId === sid && courseAssessments.some((a) => a.id === s.assessmentId));
        let avg: number | string = "";
        if (mySubs.length > 0) {
          let total = 0;
          for (const s of mySubs) { const a = courseAssessments.find((x) => x.id === s.assessmentId)!; total += submissionScore(a, s).pct; }
          avg = Math.round(total / mySubs.length);
        }
        const cert = certificates.find((x) => x.studentId === sid && x.courseId === c.id);
        rows.push([st.name, st.email, c.name, c.code, pct, avg, cert?.status ?? "—", cert?.score ?? "", cert ? susCount(cert) : 0, cert?.id ?? ""]);
      }
    }
    downloadCSV(`students-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certificate Requests"
        subtitle="Recommend learners for certification — admins do the final approval."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportStudentsCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            <Button className="gradient-primary text-primary-foreground border-0 glow"
              onClick={() => { setStudentId(""); setCourseId(""); setScore(85); setNote(""); setOpen(true); }}>
              <Send className="mr-2 h-4 w-4" />New Request
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={counts.pending} icon={Clock} />
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} delay={0.05} accent />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} delay={0.1} />
      </div>

      <GlassCard className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Verify a certificate by ID</div>
        <form onSubmit={handleVerify} className="flex gap-2">
          <Input value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Paste certificate ID" className="font-mono" />
          <Button type="submit" className="gradient-primary text-primary-foreground border-0">Verify</Button>
        </form>
        {verifyResult && (
          verifyResult.ok && verifyResult.cert ? (
            <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-success font-semibold"><CheckCircle2 className="h-4 w-4" />Verified</div>
              <div className="mt-1">{studentName(verifyResult.cert.studentId)} — {courseName(verifyResult.cert.courseId)} · Issued {verifyResult.cert.issuedAt ?? "—"}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handlePrint(verifyResult.cert!)}><Printer className="h-3 w-3 mr-1" />Print</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Not found, not approved, or invalid ID.</div>
          )
        )}
      </GlassCard>

      <Tabs defaultValue="eligible">
        <TabsList>
          <TabsTrigger value="eligible">Eligible students ({eligible.length})</TabsTrigger>
          <TabsTrigger value="history">My requests ({myCerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="mt-6">
          {eligible.length === 0 ? (
            <GlassCard className="text-center py-12 text-sm text-muted-foreground">
              No eligible students right now. Once learners enrol and progress through your courses they'll show up here.
            </GlassCard>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {paginatedEligible.map((r) => (
                  <GlassCard key={`${r.studentId}-${r.courseId}`} className="flex flex-wrap items-center gap-4">
                    <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold">
                      {r.studentName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{r.studentName}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.courseName}</div>
                    </div>
                    <Badge variant="outline" className="border-border">{r.pct}% complete</Badge>
                    <Badge variant="outline" className="border-border">Quiz: {r.avgQuiz === null ? "—" : `${r.avgQuiz}%`}</Badge>
                    <Button size="sm" className="gradient-primary text-primary-foreground border-0"
                      onClick={() => openFor(r.studentId, r.courseId, r.avgQuiz ?? r.pct)}>
                      <Award className="h-4 w-4 mr-1.5" />Request
                    </Button>
                  </GlassCard>
                ))}
              </div>

              {eligibleTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  <span>Showing {((currentEligiblePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentEligiblePage * ITEMS_PER_PAGE, eligible.length)} of {eligible.length} students</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={currentEligiblePage === 1} onClick={() => setEligiblePage((p) => Math.max(1, p - 1))} className="h-7 text-xs">Previous</Button>
                    <span className="font-semibold text-foreground">Page {currentEligiblePage} of {eligibleTotalPages}</span>
                    <Button size="sm" variant="outline" disabled={currentEligiblePage === eligibleTotalPages} onClick={() => setEligiblePage((p) => Math.min(eligibleTotalPages, p + 1))} className="h-7 text-xs">Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {myCerts.length === 0 ? (
            <GlassCard className="text-center py-12 text-sm text-muted-foreground">No certificate requests yet.</GlassCard>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {paginatedHistory.map((c) => {
                  const sus = susCount(c);
                  return (
                  <GlassCard key={c.id} className="flex flex-wrap items-center gap-4">
                    <Award className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{studentName(c.studentId)}</div>
                      <div className="text-xs text-muted-foreground truncate">{courseName(c.courseId)} · {c.id}</div>
                      {c.rejectionReason && <div className="text-xs text-destructive mt-1">Rejected: {c.rejectionReason}</div>}
                      {(c.proctorLog?.length ?? 0) > 0 && (
                        <button type="button" onClick={() => setViewingLog(c)} className={`mt-1 inline-flex items-center gap-1 text-xs ${sus > 0 ? "text-warning" : "text-muted-foreground"} hover:underline`}>
                          <Eye className="h-3 w-3" /> Proctor log · {c.proctorLog!.length} events{sus > 0 ? ` · ${sus} flagged` : ""}
                        </button>
                      )}
                    </div>
                    <Badge variant="outline" className={
                      c.status === "approved" ? "border-success/40 text-success bg-success/10"
                      : c.status === "rejected" ? "border-destructive/40 text-destructive bg-destructive/10"
                      : "border-warning/40 text-warning bg-warning/10"
                    }>
                      {c.status}
                    </Badge>
                    <Badge variant="outline" className="border-border">{c.score}%</Badge>
                    {c.status === "approved" && (
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setPreviewCert(c)}>
                          <Eye className="h-4 w-4 mr-1 text-primary" />View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handlePrint(c)}>
                          <Printer className="h-4 w-4 mr-1 text-primary" />Print
                        </Button>
                      </div>
                    )}
                  </GlassCard>
                );})}
              </div>

              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  <span>Showing {((currentHistoryPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentHistoryPage * ITEMS_PER_PAGE, myCerts.length)} of {myCerts.length} requests</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={currentHistoryPage === 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">Previous</Button>
                    <span className="font-semibold text-foreground">Page {currentHistoryPage} of {historyTotalPages}</span>
                    <Button size="sm" variant="outline" disabled={currentHistoryPage === historyTotalPages} onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))} className="h-7 text-xs">Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Proctor Activity Log Modal */}
      <Dialog open={!!viewingLog} onOpenChange={(o) => !o && setViewingLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proctor activity log</DialogTitle>
            <DialogDescription>
              {viewingLog && <>{studentName(viewingLog.studentId)} · {courseName(viewingLog.courseId)} · {viewingLog.proctorLog?.length ?? 0} events · {viewingLog ? susCount(viewingLog) : 0} flagged</>}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-secondary/30 text-xs font-mono">
            {(viewingLog?.proctorLog ?? []).length === 0 ? (
              <div className="p-4 text-muted-foreground">No proctor events recorded.</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-secondary"><tr><th className="text-left p-2">Time</th><th className="text-left p-2">Event</th><th className="text-left p-2">Detail</th></tr></thead>
                <tbody>
                  {viewingLog!.proctorLog!.map((e, i) => (
                    <tr key={i} className={susTypes.has(e.type) ? "text-warning" : ""}>
                      <td className="p-2 whitespace-nowrap">{new Date(e.at).toLocaleTimeString()}</td>
                      <td className="p-2">{e.type}</td>
                      <td className="p-2 text-muted-foreground">{e.detail ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Request Dialog with Searchable Selectors */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Recommend for Certificate
            </DialogTitle>
            <DialogDescription>Admin approval required before the certificate is officially issued.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Searchable Course Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Select Course *</span>
                {courseId && (
                  <span className="text-[11px] text-primary font-normal">
                    Selected: {courseName(courseId)}
                  </span>
                )}
              </Label>
              <Input
                placeholder="Search course..."
                value={teacherCourseSearch}
                onChange={(e) => setTeacherCourseSearch(e.target.value)}
                className="text-xs h-8"
              />
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-secondary/10 p-1 divide-y divide-border/20">
                {myCourses
                  .filter((c) => {
                    const q = teacherCourseSearch.trim().toLowerCase();
                    return !q || c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q));
                  })
                  .map((c) => {
                    const isSelected = courseId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCourseId(c.id);
                          setStudentId(""); // reset student if course changes
                        }}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                          isSelected ? "bg-primary/20 text-primary font-medium border border-primary/30" : "hover:bg-accent/40"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.code}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Searchable Student Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Select Student *</span>
                {studentId && (
                  <span className="text-[11px] text-primary font-normal">
                    Selected: {studentName(studentId)}
                  </span>
                )}
              </Label>
              <Input
                placeholder="Search student..."
                value={teacherStudentSearch}
                onChange={(e) => setTeacherStudentSearch(e.target.value)}
                className="text-xs h-8"
              />
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border/60 bg-secondary/10 p-1 divide-y divide-border/20">
                {(() => {
                  const courseStudents = (courses.find((c) => c.id === courseId)?.studentIds ?? [])
                    .map((sid) => users.find((u) => u.id === sid))
                    .filter(Boolean);
                  const list = courseStudents.length > 0 ? courseStudents : users.filter((u) => u.role === "student");
                  const filtered = list.filter((s: any) => {
                    const q = teacherStudentSearch.trim().toLowerCase();
                    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
                  });
                  if (filtered.length === 0) {
                    return <div className="p-2 text-center text-xs text-muted-foreground">No students found</div>;
                  }
                  return filtered.map((s: any) => {
                    const isSelected = studentId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setStudentId(s.id)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                          isSelected ? "bg-primary/20 text-primary font-medium border border-primary/30" : "hover:bg-accent/40"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground">{s.email}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Passing Score (%)</Label>
              <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Note for admin (optional)</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this learner ready?" className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="gradient-primary text-primary-foreground border-0">Submit request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visual Certificate Preview & Print Dialog for Teacher */}
      <Dialog open={!!previewCert} onOpenChange={(o) => !o && setPreviewCert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Certificate of Completion
            </DialogTitle>
            <DialogDescription>
              Verified iTech Academy credential issued to student.
            </DialogDescription>
          </DialogHeader>

          {previewCert && (
            <div className="space-y-6 py-2">
              <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-card via-secondary/20 to-background p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold font-serif text-lg">
                    iT
                  </div>
                  <span className="text-sm font-bold uppercase tracking-[0.25em] text-foreground">iTech Academy</span>
                </div>
                <div className="text-xs uppercase tracking-[0.25em] text-primary font-bold">Official Certificate of Completion</div>
                <div className="text-xs text-muted-foreground italic">This certifies that</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {studentName(previewCert.studentId)}
                </div>
                <div className="text-xs text-muted-foreground">has successfully completed the curriculum and examinations for</div>
                <div className="text-lg sm:text-xl font-bold text-primary max-w-lg mx-auto leading-snug">
                  {courseName(previewCert.courseId)}
                </div>
                
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary my-1">
                  Grade Score: {previewCert.score}%
                </div>

                <div className="grid grid-cols-3 gap-2 pt-6 border-t border-border/50 text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{user?.name ?? "Course Instructor"}</div>
                    <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Instructor</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{previewCert.issuedAt ?? new Date().toISOString().slice(0, 10)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Date Issued</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Ram Subramaniyan</div>
                    <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Founder & MD</div>
                  </div>
                </div>

                <div className="pt-3 text-[11px] font-mono text-muted-foreground flex items-center justify-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  <span>Verified ID: <strong className="text-foreground">{previewCert.id}</strong></span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" onClick={() => setPreviewCert(null)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrint(previewCert)}
                    className="gradient-primary text-primary-foreground border-0 gap-1.5"
                  >
                    <Printer className="h-4 w-4" /> Print Certificate
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}