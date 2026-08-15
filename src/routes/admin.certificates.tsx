import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, XCircle, Clock, Search, ShieldCheck, Printer, Download, Eye, ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import { downloadCSV } from "@/lib/exports";
import type { Certificate } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/certificates")({ component: AdminCertificates });

function AdminCertificates() {
  const { certificates, users, courses, approveCertificate, rejectCertificate, issueCertificateDirectly } = useData();
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [rejecting, setRejecting] = useState<Certificate | null>(null);
  const [reason, setReason] = useState("");
  const [viewingLog, setViewingLog] = useState<Certificate | null>(null);
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; cert?: Certificate }>(null);

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
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
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
    "fullscreen_exit", "tab_blur", "visibility_hidden", "copy", "paste",
    "context_menu", "key_meta", "camera_denied", "camera_ended", "camera_motion", "multiple_faces"
  ]);
  const susCount = (c: Certificate) => (c.proctorLog ?? []).filter((e) => susTypes.has(e.type)).length;

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

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const id = verifyId.trim().toLowerCase();
    const cert = certificates.find((c) => c.id.trim().toLowerCase() === id && c.status === "approved");
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

    // Prompt immediate visual certificate preview with print button
    setPreviewCert(newCert);
  };

  const exportAllCsv = () => {
    const rows: (string | number)[][] = [
      ["Certificate ID", "Student", "Email", "Course", "Course Code", "Score", "Status", "Requested", "Issued", "Suspicious Events", "Teacher Note", "Rejection Reason"],
      ...certificates.map((c) => {
        const course = courses.find((x) => x.id === c.courseId);
        return [
          c.id, userName(c.studentId), userEmail(c.studentId),
          courseName(c.courseId), course?.code ?? "",
          c.score, c.status, c.requestedAt, c.issuedAt ?? "",
          susCount(c), c.teacherNote ?? "", c.rejectionReason ?? "",
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
            <Button className="gradient-primary text-primary-foreground border-0 gap-1.5" onClick={() => setIsGenerating(true)}>
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
        <StatCard label="Approved & Issued" value={counts.approved} icon={CheckCircle2} delay={0.05} accent />
        <StatCard label="Rejected" value={counts.rejected} icon={XCircle} delay={0.1} />
      </div>

      {/* Verify Certificate by ID */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Verify a Certificate by Unique ID
        </div>
        <form onSubmit={handleVerify} className="flex gap-2">
          <Input
            value={verifyId}
            onChange={(e) => setVerifyId(e.target.value)}
            placeholder="Enter or paste certificate ID (e.g. ITECH-2026-0001)"
            className="font-mono text-xs uppercase"
          />
          <Button type="submit" className="gradient-primary text-primary-foreground border-0">
            Verify ID
          </Button>
        </form>

        {verifyResult && (
          verifyResult.ok && verifyResult.cert ? (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-success font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Valid Authentic Certificate Verified
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-background text-primary font-bold">
                  ID: {verifyResult.cert.id}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-background/60 border border-success/20 space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Student Name</div>
                <div className="text-lg font-bold text-foreground">{userName(verifyResult.cert.studentId)}</div>
                <div className="text-xs text-muted-foreground">{userEmail(verifyResult.cert.studentId)}</div>
              </div>
              <div className="text-foreground text-xs grid grid-cols-2 gap-2 pt-1">
                <div><strong>Course:</strong> {courseName(verifyResult.cert.courseId)}</div>
                <div><strong>Issued Date:</strong> {verifyResult.cert.issuedAt ?? "N/A"}</div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Button size="sm" variant="outline" onClick={() => handlePrint(verifyResult.cert!)}>
                  <Printer className="h-3 w-3 mr-1" /> Print Certificate
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewingLog(verifyResult.cert!)}>
                  <Eye className="h-3 w-3 mr-1" /> Inspect Logs
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>Certificate ID not found, not approved, or invalid verification code.</span>
            </div>
          )
        )}
      </GlassCard>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search student name, course, ID..."
            className="pl-9 pr-8 text-xs"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Certificate Requests & Issuances List */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsContent value={tab} className="mt-0 space-y-4">
          {filtered.length === 0 ? (
            <GlassCard className="text-center py-16">
              <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <div className="text-sm text-muted-foreground">No {tab} certificate records found.</div>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {paginated.map((c) => {
                const sus = susCount(c);
                return (
                  <GlassCard key={c.id} className="flex flex-wrap items-center gap-4">
                    <div className="h-10 w-10 grid place-items-center rounded-xl gradient-primary text-primary-foreground shrink-0">
                      <Award className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{userName(c.studentId)}</div>
                      <div className="text-xs text-muted-foreground truncate">{userEmail(c.studentId)} · {courseName(c.courseId)}</div>
                      {c.teacherNote && <div className="text-xs text-muted-foreground mt-1 italic">"{c.teacherNote}"</div>}
                      {c.rejectionReason && <div className="text-xs text-destructive mt-1">Reason: {c.rejectionReason}</div>}
                    </div>

                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs">
                        Score {c.score}%
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1">Requested: {c.requestedAt}</div>
                      {c.issuedAt && <div className="text-[10px] text-muted-foreground">Issued: {c.issuedAt}</div>}
                      <div className="text-[10px] text-primary/80 font-mono mt-0.5">{c.id}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto items-center">
                      {/* Inspect Log Button — ALWAYS accessible before approving */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingLog(c)}
                        className={`text-xs gap-1 ${sus > 0 ? "border-warning/50 text-warning bg-warning/10" : ""}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect Logs {sus > 0 ? `(${sus} flagged)` : ""}
                      </Button>

                      {c.status === "approved" && (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setPreviewCert(c)}>
                            <Eye className="h-4 w-4 mr-1 text-primary" /> View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handlePrint(c)}>
                            <Printer className="h-4 w-4 mr-1 text-primary" /> Print
                          </Button>
                        </div>
                      )}

                      {c.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30"
                            onClick={() => { setRejecting(c); setReason(""); }}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            className="gradient-primary text-primary-foreground border-0"
                            onClick={() => { approveCertificate(c.id); toast.success("Certificate approved & issued!"); }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <GlassCard className="flex items-center justify-between py-3 text-xs">
              <span className="text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} of {filtered.length} certificate records
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="font-medium px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 px-2.5"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Unlimited Certificates Dialog with Search */}
      <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Generate Unlimited Certificate
            </DialogTitle>
            <DialogDescription>
              Directly issue an official certificate to any student with searchable student and course selection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerateSubmit} className="space-y-4 py-2">
            {/* Searchable Student Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Select Student *</span>
                {genStudentId && (
                  <span className="text-[11px] text-primary font-normal">
                    Selected: {userName(genStudentId)}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student by name, email, or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border/60 bg-secondary/10 p-1 divide-y divide-border/20">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No students matching "{studentSearch}".
                  </div>
                ) : (
                  filteredStudents.slice(0, 15).map((s) => {
                    const isSelected = genStudentId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setGenStudentId(s.id);
                          setStudentSearch("");
                        }}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? "bg-primary/20 text-primary font-medium border border-primary/30"
                            : "hover:bg-accent/40"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{s.email} · {s.id}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Searchable Course Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Select Course *</span>
                {genCourseId && (
                  <span className="text-[11px] text-primary font-normal">
                    Selected: {courseName(genCourseId)}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search course by title, code, or ID..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border/60 bg-secondary/10 p-1 divide-y divide-border/20">
                {filteredCourses.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No courses matching "{courseSearch}".
                  </div>
                ) : (
                  filteredCourses.slice(0, 15).map((crs) => {
                    const isSelected = genCourseId === crs.id;
                    return (
                      <div
                        key={crs.id}
                        onClick={() => {
                          setGenCourseId(crs.id);
                          setCourseSearch("");
                        }}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? "bg-primary/20 text-primary font-medium border border-primary/30"
                            : "hover:bg-accent/40"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium truncate">{crs.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">Code: {crs.code || "N/A"}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Passing Score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={genScore}
                onChange={(e) => setGenScore(Number(e.target.value))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Admin Note (Optional)</Label>
              <Input
                placeholder="e.g. Issued for exceptional performance or fast-track completion"
                value={genNote}
                onChange={(e) => setGenNote(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsGenerating(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-primary-foreground border-0">
                Generate & Issue Certificate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Visual Certificate Preview & Print Dialog */}
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
              {/* Interactive Certificate Card Preview */}
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
                  {userName(previewCert.studentId)}
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
                    <div className="font-semibold text-foreground">
                      {users.find((u) => u.id === courses.find((x) => x.id === previewCert.courseId)?.teacherId)?.name ?? "Course Instructor"}
                    </div>
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

      {/* Reject Modal */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Certificate Request</DialogTitle>
            <DialogDescription>Optionally include a reason — the student will see it in their notifications.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspect Logs & Activity Dialog — Accessible BEFORE Approving */}
      <Dialog open={!!viewingLog} onOpenChange={(o) => !o && setViewingLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Certificate Inspection & Proctor Logs
            </DialogTitle>
            <DialogDescription>
              {viewingLog && (
                <span>
                  <strong>Student:</strong> {userName(viewingLog.studentId)} ({userEmail(viewingLog.studentId)}) · 
                  <strong> Course:</strong> {courseName(viewingLog.courseId)} · 
                  <strong> ID:</strong> <code className="font-mono">{viewingLog.id}</code>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewingLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-3 rounded-lg border border-border/40">
                <div><strong>Submission Score:</strong> {viewingLog.score}%</div>
                <div><strong>Status:</strong> <span className="capitalize font-semibold">{viewingLog.status}</span></div>
                <div><strong>Requested:</strong> {viewingLog.requestedAt}</div>
                <div><strong>Proctor Flagged Events:</strong> {susCount(viewingLog)}</div>
                {viewingLog.teacherNote && <div className="col-span-2"><strong>Teacher Note:</strong> "{viewingLog.teacherNote}"</div>}
              </div>

              <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border bg-secondary/20 text-xs font-mono">
                {(viewingLog.proctorLog ?? []).length === 0 ? (
                  <div className="p-4 text-muted-foreground text-center">No proctor activity logs recorded for this submission.</div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-secondary border-b border-border/40">
                      <tr>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Event</th>
                        <th className="text-left p-2">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingLog.proctorLog!.map((e, i) => (
                        <tr key={i} className={susTypes.has(e.type) ? "text-warning bg-warning/5" : ""}>
                          <td className="p-2 whitespace-nowrap">{new Date(e.at).toLocaleTimeString()}</td>
                          <td className="p-2 font-semibold">{e.type}</td>
                          <td className="p-2 text-muted-foreground">{e.detail ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {viewingLog && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const rows: (string | number)[][] = [["Time", "Event", "Detail"], ...(viewingLog.proctorLog ?? []).map((e) => [e.at, e.type, e.detail ?? ""])];
                  downloadCSV(`proctor-${viewingLog.id}.csv`, rows);
                }}
              >
                <Download className="h-4 w-4 mr-1.5" /> Export Log CSV
              </Button>
            )}

            <div className="flex gap-2">
              {viewingLog?.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30"
                    onClick={() => {
                      const certToReject = viewingLog;
                      setViewingLog(null);
                      setRejecting(certToReject);
                      setReason("");
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gradient-primary text-primary-foreground border-0"
                    onClick={() => {
                      approveCertificate(viewingLog.id);
                      toast.success("Certificate approved & issued!");
                      setViewingLog(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Certificate
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setViewingLog(null)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}