import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { useData } from "@/lib/data-store";
import { MagneticButton } from "@/components/ui/magnetic-button";

type Status = "idle" | "verifying" | "found" | "missing";

const LINE_LABELS = ["STUDENT", "COURSE", "SCORE", "ISSUED"] as const;

export function VerifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { certificates, users, courses } = useData();
  const [id, setId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [certData, setCertData] = useState<any>(null);

  const submit = async () => {
    if (id.trim().length < 3) return;
    setStatus("verifying");
    setCertData(null);

    await new Promise((r) => window.setTimeout(r, 600));

    const cleanId = id.trim().toLowerCase();
    const cert = certificates.find(
      (c) => c && c.id && c.id.toLowerCase() === cleanId && c.status === "approved"
    );

    if (cert) {
      const student = users.find((u) => u.id === cert.studentId);
      const course = courses.find((c) => c.id === cert.courseId);
      setCertData({
        certificateId: cert.id,
        studentName: student?.name || (cert as any).studentName || "Student",
        courseName: course?.name || (cert as any).courseName || "Course",
        score: cert.score ?? null,
        issuedAt: cert.issuedAt || cert.requestedAt || new Date().toISOString(),
      });
      setStatus("found");
    } else {
      setStatus("missing");
    }
  };

  const lines =
    status === "found" && certData
      ? [
          certData.studentName,
          certData.courseName,
          certData.score === null || certData.score === undefined ? "—" : `${certData.score}%`,
          new Date(certData.issuedAt).toLocaleDateString(),
        ]
      : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-lg rounded-xl p-6 shadow-glow-strong bg-card"
            role="dialog"
            aria-modal="true"
            aria-label="Verify certificate"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-primary cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="data-chip text-primary">TERMINAL // CERT-VERIFY</span>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground">Verify a certificate</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Enter the certificate ID printed on the credential (e.g. ITECH-2026-0001).
            </p>

            <div className="relative mt-5 overflow-hidden rounded-lg">
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="ITECH-2026-0001"
                className="w-full rounded-lg border border-border bg-background/70 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] outline-none transition-colors focus:border-primary/60 text-foreground"
                style={{
                  borderColor: status === "missing" ? "var(--destructive)" : undefined,
                  animation: status === "missing" ? "glitch-flicker 0.5s steps(3) 2" : undefined,
                }}
              />
              {status === "verifying" && (
                <motion.span
                  aria-hidden="true"
                  initial={{ x: "-40%" }}
                  animate={{ x: "140%" }}
                  transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
                  className="pointer-events-none absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, color-mix(in oklab, var(--primary-glow) 35%, transparent), transparent)",
                  }}
                />
              )}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <MagneticButton onClick={submit} strength={0.14}>
                {status === "verifying" ? "VERIFYING..." : "Verify"}
              </MagneticButton>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {status === "verifying" ? "SCANNING REGISTRY" : "AWAITING INPUT"}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {status === "found" && certData && (
                <motion.div
                  key="found"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 rounded-lg border p-4 bg-emerald-500/5 border-emerald-500/30 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 14 }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.span>
                    <span
                      className="font-mono text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-500"
                    >
                      Certificate verified · {certData.certificateId}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2">
                    {LINE_LABELS.map((label, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                        className="flex justify-between gap-4 font-mono text-xs border-b border-border/40 pb-1.5 last:border-0"
                      >
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-right text-foreground font-semibold">{lines[i]}</dd>
                      </motion.div>
                    ))}
                  </dl>
                </motion.div>
              )}

              {status === "missing" && (
                <motion.p
                  key="missing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-red-500 font-semibold"
                >
                  Certificate not found in registry
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
