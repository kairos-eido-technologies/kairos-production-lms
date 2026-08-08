import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, CheckCircle2, XCircle, Clock, Search, ShieldCheck, Printer, Download, Eye } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import { downloadCSV } from "@/lib/exports";
import type { Certificate } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/certificates")({ component: AdminCertificates });

function AdminCertificates() {
  const { certificates, users, courses, approveCertificate, rejectCertificate } = useData();
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<Certificate | null>(null);
  const [reason, setReason] = useState("");
  const [viewingLog, setViewingLog] = useState<Certificate | null>(null);
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; cert?: Certificate }>(null);

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const userEmail = (id: string) => users.find((u) => u.id === id)?.email ?? "—";
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";

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

  const counts = {
    pending: certificates.filter((c) => c.status === "pending").length,
    approved: certificates.filter((c) => c.status === "approved").length,
    rejected: certificates.filter((c) => c.status === "rejected").length,
  };

  const handleReject = () => {
    if (!rejecting) return;
    rejectCertificate(rejecting.id, reason.trim() || undefined);
    toast.success("Request rejected");
    setRejecting(null); setReason("");
  };

  const susTypes = new Set(["fullscreen_exit","tab_blur","visibility_hidden","copy","paste","context_menu","key_meta","camera_denied","camera_ended","camera_motion","multiple_faces"]);
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
    const id = verifyId.trim();
    const cert = certificates.find((c) => c.id.toLowerCase() === id.toLowerCase() && c.status === "approved");
    setVerifyResult({ ok: !!cert, cert });
  };

  const exportAllCsv = () => {
    const rows: (string | number)[][] = [
      ["Certificate ID","Student","Email","Course","Course Code","Score","Status","Requested","Issued","Suspicious Events","Teacher Note","Rejection Reason"],
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
    downloadCSV(`certificates-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certificate Approvals"
        subtitle="Review teacher recommendations and issue certificates."
        actions={
          <Button variant="outline" onClick={exportAllCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
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
          <Input value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Paste certificate ID (e.g. itech-…)" className="font-mono" />
          <Button type="submit" className="gradient-primary text-primary-foreground border-0">Verify</Button>
        </form>
        {verifyResult && (
          verifyResult.ok && verifyResult.cert ? (
            <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-success font-semibold"><CheckCircle2 className="h-4 w-4" />Verified</div>
              <div className="mt-1 text-foreground">{userName(verifyResult.cert.studentId)} — {courseName(verifyResult.cert.courseId)} · {verifyResult.cert.score}% · Issued {verifyResult.cert.issuedAt ?? "—"}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handlePrint(verifyResult.cert!)}><Printer className="h-3 w-3 mr-1" />Print</Button>
                <Button size="sm" variant="outline" onClick={() => setViewingLog(verifyResult.cert!)}><Eye className="h-3 w-3 mr-1" />Proctor log</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Not found, not approved, or invalid ID.</div>
          )
        )}
      </GlassCard>

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value={tab} className="mt-0">
          {filtered.length === 0 ? (
            <GlassCard className="text-center py-16">
              <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <div className="text-sm text-muted-foreground">No {tab} requests.</div>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const sus = susCount(c);
                return (
                <GlassCard key={c.id} className="flex flex-wrap items-center gap-4">
                  <div className="h-10 w-10 grid place-items-center rounded-xl gradient-primary text-primary-foreground">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{userName(c.studentId)}</div>
                    <div className="text-xs text-muted-foreground truncate">{userEmail(c.studentId)} · {courseName(c.courseId)}</div>
                    {c.teacherNote && <div className="text-xs text-muted-foreground mt-1 italic">"{c.teacherNote}"</div>}
                    {c.rejectionReason && <div className="text-xs text-destructive mt-1">Reason: {c.rejectionReason}</div>}
                    {(c.proctorLog?.length ?? 0) > 0 && (
                      <button type="button" onClick={() => setViewingLog(c)} className={`mt-1 inline-flex items-center gap-1 text-xs ${sus > 0 ? "text-warning" : "text-muted-foreground"} hover:underline`}>
                        <Eye className="h-3 w-3" /> Proctor log · {c.proctorLog!.length} events{sus > 0 ? ` · ${sus} flagged` : ""}
                      </button>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">Score {c.score}%</Badge>
                    <div className="text-[10px] text-muted-foreground mt-1">Requested {c.requestedAt}</div>
                    {c.issuedAt && <div className="text-[10px] text-muted-foreground">Issued {c.issuedAt}</div>}
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.id}</div>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    {c.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => handlePrint(c)}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
                    )}
                    {c.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setRejecting(c); setReason(""); }}>
                          <XCircle className="h-4 w-4 mr-1.5" />Reject
                        </Button>
                        <Button size="sm" className="gradient-primary text-primary-foreground border-0"
                          onClick={() => { approveCertificate(c.id); toast.success("Certificate issued"); }}>
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
                        </Button>
                      </>
                    )}
                  </div>
                </GlassCard>
              );})}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject certificate request</DialogTitle>
            <DialogDescription>Optionally include a reason — the student will see it in their notifications.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingLog} onOpenChange={(o) => !o && setViewingLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proctor activity log</DialogTitle>
            <DialogDescription>
              {viewingLog && <>{userName(viewingLog.studentId)} · {courseName(viewingLog.courseId)} · {viewingLog.proctorLog?.length ?? 0} events · {viewingLog ? susCount(viewingLog) : 0} flagged</>}
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
            {viewingLog && (
              <Button variant="outline" onClick={() => {
                const rows: (string | number)[][] = [["Time","Event","Detail"], ...(viewingLog.proctorLog ?? []).map((e) => [e.at, e.type, e.detail ?? ""])];
                downloadCSV(`proctor-${viewingLog.id}.csv`, rows);
              }}><Download className="h-4 w-4 mr-1.5" />Export log</Button>
            )}
            <Button onClick={() => setViewingLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}