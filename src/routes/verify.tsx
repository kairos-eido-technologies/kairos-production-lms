import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldCheck, ArrowLeft, Printer, Clock } from "lucide-react";
import { useData } from "@/lib/data-store";
import { openPrintableCertificate } from "@/lib/certificate";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify Certificate — iTech Academy" },
      { name: "description", content: "Verify the authenticity of an iTech Academy certificate." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const search = Route.useSearch();
  const { certificates, users, courses } = useData();
  const [id, setId] = useState(search.id || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    status?: "approved" | "pending" | "rejected";
    studentName?: string;
    studentEmail?: string;
    courseName?: string;
    courseCode?: string;
    score?: number;
    issuedAt?: string;
    certId?: string;
    rawCert?: any;
  }>(null);

  const runVerify = useCallback(
    async (targetId: string) => {
      const cleanId = targetId.trim();
      if (!cleanId) return;

      setLoading(true);

      // 1. Try public server API first
      try {
        const res = await fetch(`/api/certificates/verify?id=${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.certificate) {
            const c = data.certificate;
            setResult({
              ok: true,
              status: "approved",
              studentName: c.studentName,
              studentEmail: c.studentEmail,
              courseName: c.courseName,
              courseCode: c.courseCode,
              score: c.score,
              issuedAt: c.issuedAt,
              certId: c.id,
              rawCert: c,
            });
            setLoading(false);
            return;
          }
        }
      } catch (_) {}

      // 2. Fallback to in-memory store
      const localCert = certificates.find(
        (c) => c.id.trim().toLowerCase() === cleanId.toLowerCase(),
      );

      if (localCert) {
        const u = users.find((x) => x.id === localCert.studentId);
        const crs = courses.find((x) => x.id === localCert.courseId);
        setResult({
          ok: localCert.status === "approved",
          status: localCert.status as any,
          studentName: u?.name ?? "Student",
          studentEmail: u?.email ?? "",
          courseName: crs?.name ?? "Course",
          courseCode: crs?.code ?? "",
          score: localCert.score,
          issuedAt: localCert.issuedAt ?? localCert.requestedAt ?? "—",
          certId: localCert.id,
          rawCert: localCert,
        });
      } else {
        setResult({ ok: false });
      }

      setLoading(false);
    },
    [certificates, users, courses],
  );

  useEffect(() => {
    if (search.id && search.id.trim()) {
      setId(search.id.trim());
      runVerify(search.id.trim());
    }
  }, [search.id, runVerify]);

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    runVerify(id);
  };

  const handlePrint = () => {
    if (!result) return;
    openPrintableCertificate({
      id: result.certId || id,
      studentName: result.studentName || "Student",
      studentEmail: result.studentEmail || "",
      courseName: result.courseName || "Course",
      courseCode: result.courseCode,
      teacherName: "Instructor",
      score: result.score ?? 100,
      issuedAt: result.issuedAt,
      requestedAt: result.issuedAt,
    });
  };

  return (
    <div className="min-h-screen relative grid place-items-center p-6">
      <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Verify a Certificate</h1>
          <p className="text-sm text-muted-foreground">
            Enter any certificate ID (e.g. <span className="font-mono text-primary font-semibold">ITECH-2026-XXXX</span>) to verify its authenticity.
          </p>
        </div>

        <form onSubmit={verify} className="glass rounded-2xl p-6 space-y-4 shadow-xl">
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter certificate ID (e.g. ITECH-2026-8889)"
            className="h-12 bg-secondary/60 text-center font-mono tracking-wider text-base"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 gradient-primary text-primary-foreground border-0 glow cursor-pointer font-bold shadow-lg"
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> {loading ? "Verifying..." : "Verify Certificate"}
          </Button>
        </form>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-2xl border p-6 shadow-xl ${
              result.ok
                ? "border-success/40 bg-success/10 backdrop-blur-md"
                : result.status === "pending"
                  ? "border-amber-500/40 bg-amber-500/10 backdrop-blur-md"
                  : "border-destructive/40 bg-destructive/10 backdrop-blur-md"
            }`}
          >
            {result.ok ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-success font-bold text-base">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <span>Verified Authentic Certificate</span>
                  </div>
                  <Badge variant="outline" className="border-success/40 text-success bg-success/10 font-mono">
                    VALID
                  </Badge>
                </div>
                <div className="p-4 rounded-xl bg-card/80 border border-success/30 space-y-3 shadow-inner">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Student Name
                    </div>
                    <div className="text-xl font-bold text-foreground">
                      {result.studentName ?? "—"}
                    </div>
                    {result.studentEmail && (
                      <div className="text-xs text-muted-foreground">{result.studentEmail}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                    <Info label="Course" value={result.courseName ?? "—"} />
                    <Info label="Issued Date" value={result.issuedAt ?? "—"} />
                    <Info label="Final Score" value={`${result.score ?? 100}%`} />
                    <Info
                      label="Certificate ID"
                      value={result.certId ?? id}
                      className="font-mono font-bold text-primary"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handlePrint}
                    className="gradient-primary text-primary-foreground border-0 glow text-xs gap-1.5 cursor-pointer font-semibold shadow-md"
                  >
                    <Printer className="h-4 w-4" /> View & Print Certificate
                  </Button>
                </div>
              </div>
            ) : result.status === "pending" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-500 font-bold">
                  <Clock className="h-6 w-6 shrink-0" />
                  <span>Certificate Request Pending</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  A certificate with ID <strong className="text-foreground font-mono">{id}</strong> has been requested for{" "}
                  <strong>{result.studentName}</strong> in <strong>{result.courseName}</strong> and is awaiting instructor/admin approval.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-destructive">
                <XCircle className="h-6 w-6 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-base">Certificate Not Found</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    No verified certificate exists with ID <strong className="font-mono text-foreground">{id}</strong>. Please check the ID for typos and try again.
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function Info({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
