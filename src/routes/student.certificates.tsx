import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Award, Download, Clock, XCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";
import logoSrc from "@/assets/logo.png";
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

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const totalPages = Math.max(1, Math.ceil(mine.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCertificates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return mine.slice(start, start + ITEMS_PER_PAGE);
  }, [mine, currentPage]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Certificates"
        subtitle="View, verify and download every certificate you've earned."
      />

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
            <p className="mt-1 text-sm text-muted-foreground">
              {pending.length} certificate request{pending.length === 1 ? " is" : "s are"} awaiting
              admin approval.
            </p>
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
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedCertificates.map((c) => (
              <GlassCard key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary glow text-primary-foreground">
                    <Award className="h-6 w-6" />
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.status === "approved"
                        ? "border-success/40 text-success bg-success/10"
                        : c.status === "rejected"
                          ? "border-destructive/40 text-destructive bg-destructive/10"
                          : "border-warning/40 text-warning bg-warning/10"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <div className="mt-3 font-semibold leading-tight">{courseName(c.courseId)}</div>
                <div className="mt-1 text-[11px] font-mono text-muted-foreground truncate">
                  Certificate ID: {c.id}
                </div>
                {c.rejectionReason && (
                  <div className="mt-2 text-xs text-destructive">{c.rejectionReason}</div>
                )}
                {c.status === "approved" ? (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setViewing(c)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-primary-foreground border-0"
                      onClick={() => handleDownload(c)}
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Print
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, mine.length)} of {mine.length} certificates
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs cursor-pointer disabled:opacity-40"
                >
                  Previous
                </Button>
                <span className="text-xs font-medium px-1">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs cursor-pointer disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Certificate of Completion</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-background to-secondary/30 p-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img src={logoSrc} alt="iTech Academy" className="h-10 w-auto object-contain" />
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                  iTech Academy
                </span>
              </div>
              <div className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
                Certificate of Completion
              </div>
              <div className="text-xs text-muted-foreground italic">
                This is proudly presented to
              </div>
              <div className="text-3xl font-extrabold text-foreground tracking-tight">
                {user?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                for successfully completing the course
              </div>
              <div className="text-xl font-bold text-primary">{courseName(viewing.courseId)}</div>

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/50 text-xs">
                <div>
                  <div className="font-semibold text-foreground">
                    {teacherName(viewing.courseId)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">Instructor</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {viewing.issuedAt ?? new Date().toISOString().slice(0, 10)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">Date Issued</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">Ram Subramaniyan</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Owner, iTech</div>
                </div>
              </div>
              <div className="pt-2 text-[11px] font-mono text-muted-foreground">
                Certificate ID: {viewing.id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
