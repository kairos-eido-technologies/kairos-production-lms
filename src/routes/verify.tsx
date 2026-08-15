import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify Certificate — iTech Academy" },
      { name: "description", content: "Verify the authenticity of an iTech Academy certificate." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { certificates, users, courses } = useData();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    studentName?: string;
    studentEmail?: string;
    courseName?: string;
    score?: number;
    issuedAt?: string;
    certId?: string;
  }>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim();
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
            studentName: c.studentName,
            studentEmail: c.studentEmail,
            courseName: c.courseName,
            score: c.score,
            issuedAt: c.issuedAt,
            certId: c.id,
          });
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Fallback to in-memory store
    const localCert = certificates.find(
      (c) => c.id.toLowerCase() === cleanId.toLowerCase() && c.status === "approved"
    );

    if (localCert) {
      const u = users.find((x) => x.id === localCert.studentId);
      const crs = courses.find((x) => x.id === localCert.courseId);
      setResult({
        ok: true,
        studentName: u?.name ?? "Student",
        studentEmail: u?.email ?? "",
        courseName: crs?.name ?? "Course",
        score: localCert.score,
        issuedAt: localCert.issuedAt ?? "—",
        certId: localCert.id,
      });
    } else {
      setResult({ ok: false });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative grid place-items-center p-6">
      <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <div className="absolute top-6 left-6">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg">
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex"><Logo /></div>
          <h1 className="text-3xl font-bold tracking-tight">Verify a Certificate</h1>
          <p className="text-sm text-muted-foreground">Enter the certificate ID to confirm its authenticity.</p>
        </div>

        <form onSubmit={verify} className="glass rounded-2xl p-6 space-y-4">
          <Input value={id} onChange={(e) => setId(e.target.value)}
            placeholder="Enter certificate ID"
            className="h-12 bg-secondary/60 text-center font-mono tracking-wider" />
          <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground border-0 glow">
            <ShieldCheck className="mr-2 h-4 w-4" /> {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-2xl border p-6 ${result.ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"}`}>
            {result.ok ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="font-semibold text-base">Verified Authentic Certificate</span>
                </div>
                <div className="p-4 rounded-xl bg-background/60 border border-success/30 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Student Name</div>
                    <div className="text-xl font-bold text-foreground">{result.studentName ?? "—"}</div>
                    {result.studentEmail && <div className="text-xs text-muted-foreground">{result.studentEmail}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                    <Info label="Course" value={result.courseName ?? "—"} />
                    <Info label="Issued Date" value={result.issuedAt ?? "—"} />
                    <Info label="Certificate ID" value={result.certId ?? id} className="font-mono font-bold text-primary col-span-2" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-6 w-6" />
                <div>
                  <div className="font-semibold">Certificate not found</div>
                  <div className="text-xs text-muted-foreground">Check the ID and try again.</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
