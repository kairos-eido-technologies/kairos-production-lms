import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, Download, Clock, XCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import type { Certificate } from "@/lib/mock-data";

export const Route = createFileRoute("/student/certificates")({ component: StudentCertificates });

function StudentCertificates() {
  const { user } = useAuth();
  const { certificates, courses, users } = useData();

  const mine = useMemo(() => {
    if (!user) return [];
    return certificates.filter((c) => c.studentId === user.id);
  }, [certificates, user]);

  const approved = mine.filter((c) => c.status === "approved");
  const pending = mine.filter((c) => c.status === "pending");
  const rejected = mine.filter((c) => c.status === "rejected");

  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";
  const teacherName = (courseId: string) => {
    const c = courses.find((x) => x.id === courseId);
    return users.find((u) => u.id === c?.teacherId)?.name ?? "Instructor";
  };

  const [viewing, setViewing] = useState<Certificate | null>(null);

  const handleDownload = (c: Certificate) => {
    openPrintableCertificate({
      id: c.id,
      studentName: user?.name ?? "Student",
      studentEmail: user?.email,
      courseName: courseName(c.courseId),
      courseCode: courses.find((x) => x.id === c.courseId)?.code,
      teacherName: teacherName(c.courseId),
      score: c.score,
      issuedAt: c.issuedAt,
      requestedAt: c.requestedAt,
    });
    toast.success("Opened printable certificate");
  };

  return (
    <div className="space-y-8">
      <PageHeader title="My Certificates" subtitle="View, verify and download every certificate you've earned." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Issued" value={approved.length} icon={CheckCircle2} accent />
        <StatCard label="Pending" value={pending.length} icon={Clock} delay={0.05} />
        <StatCard label="Rejected" value={rejected.length} icon={XCircle} delay={0.1} />
      </div>

      {pending.length > 0 && (
        <GlassCard className="flex items-start gap-3 border-warning/40 bg-warning/10">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <div className="font-semibold">Verification in progress</div>
            <p className="mt-1 text-sm text-muted-foreground">{pending.length} certificate request{pending.length === 1 ? " is" : "s are"} awaiting admin approval.</p>
          </div>
        </GlassCard>
      )}

      {mine.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <div className="font-semibold">No certificates yet</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Pass a course quiz and your instructor will recommend you for certification.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {mine.map((c) => (
            <GlassCard key={c.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary glow text-primary-foreground">
                  <Award className="h-6 w-6" />
                </div>
                <Badge variant="outline" className={
                  c.status === "approved" ? "border-success/40 text-success bg-success/10"
                  : c.status === "rejected" ? "border-destructive/40 text-destructive bg-destructive/10"
                  : "border-warning/40 text-warning bg-warning/10"
                }>{c.status}</Badge>
              </div>
              <div className="mt-3 font-semibold leading-tight">{courseName(c.courseId)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Score {c.score}%</div>
              <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">{c.id}</div>
              {c.rejectionReason && (
                <div className="mt-2 text-xs text-destructive">{c.rejectionReason}</div>
              )}
              {c.status === "approved" ? (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewing(c)}>View</Button>
                  <Button size="sm" className="flex-1 gradient-primary text-primary-foreground border-0" onClick={() => handleDownload(c)}>
                    <Download className="h-3 w-3 mr-1.5" />Print
                  </Button>
                </div>
              ) : (
                <div className="mt-4 text-xs text-muted-foreground text-center py-2 rounded-lg bg-secondary/30">
                  {c.status === "pending" ? "Awaiting admin approval" : "Request declined"}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Certificate of Completion</DialogTitle>
            <DialogDescription>Verify at /verify with the certificate ID.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-background to-secondary/30 p-10 text-center">
              <Award className="mx-auto h-12 w-12 text-primary mb-4" />
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">iTech Academy</div>
              <div className="mt-1 text-sm text-muted-foreground">Certificate of Completion</div>
              <div className="mt-6 text-3xl font-bold gradient-text">{user?.name}</div>
              <div className="mt-4 text-sm text-muted-foreground">has successfully completed</div>
              <div className="mt-2 text-xl font-semibold">{courseName(viewing.courseId)}</div>
              <div className="mt-6 flex justify-around text-xs text-muted-foreground">
                <div><div className="font-bold text-foreground">{viewing.score}%</div>Final Score</div>
                <div><div className="font-bold text-foreground">{viewing.issuedAt ?? "—"}</div>Issued</div>
                <div><div className="font-bold text-foreground">{teacherName(viewing.courseId)}</div>Instructor</div>
              </div>
              <div className="mt-6 text-[10px] font-mono text-muted-foreground">ID: {viewing.id}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
