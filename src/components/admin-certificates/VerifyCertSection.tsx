import { ShieldCheck, CheckCircle2, XCircle, Eye } from "lucide-react";
import { GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Certificate } from "@/lib/mock-data";

interface VerifyCertSectionProps {
  verifyId: string;
  setVerifyId: (id: string) => void;
  verifyResult: null | { ok: boolean; cert?: Certificate };
  handleVerify: () => void;
  userName: (id: string) => string;
  courseName: (id: string) => string;
  onPreview: (cert: Certificate) => void;
}

export function VerifyCertSection({
  verifyId,
  setVerifyId,
  verifyResult,
  handleVerify,
  userName,
  courseName,
  onPreview,
}: VerifyCertSectionProps) {
  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-base font-bold text-foreground">
            Instant Certificate Authenticity Verification
          </h3>
          <p className="text-xs text-muted-foreground">
            Verify any student certificate ID against the immutable ledger.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <Input
          placeholder="Enter Certificate ID (e.g. CERT-2026-ABCD)..."
          value={verifyId}
          onChange={(e) => setVerifyId(e.target.value)}
          className="h-10 text-xs font-mono uppercase"
        />
        <Button
          onClick={handleVerify}
          className="gradient-primary text-primary-foreground border-0 glow shrink-0"
        >
          Verify Authenticity
        </Button>
      </div>

      {verifyResult && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            verifyResult.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-3">
            {verifyResult.ok ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {verifyResult.ok
                  ? "Valid & Verified Certificate"
                  : "Certificate Not Found or Invalid"}
              </div>
              {verifyResult.cert && (
                <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                  <span>
                    Recipient: <strong>{userName(verifyResult.cert.studentId)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Course: <strong>{courseName(verifyResult.cert.courseId)}</strong>
                  </span>
                  <span>•</span>
                  <span>Issued: {verifyResult.cert.issuedAt?.slice(0, 10)}</span>
                </div>
              )}
            </div>
          </div>

          {verifyResult.cert && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreview(verifyResult.cert!)}
              className="gap-1.5 text-xs shrink-0 border-emerald-500/40 hover:bg-emerald-500/20"
            >
              <Eye className="h-3.5 w-3.5" /> View Certificate
            </Button>
          )}
        </div>
      )}
    </GlassCard>
  );
}
