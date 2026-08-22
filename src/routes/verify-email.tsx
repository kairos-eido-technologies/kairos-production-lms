import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Mail, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Email — iTech Academy" },
      { name: "description", content: "Verify your email to access your iTech Academy account." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { user, verifyEmail, resendCode, logout } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      nav({ to: "/login" });
    } else if (user.isEmailVerified) {
      nav({ to: `/${user.role}` as any });
    }
  }, [user, nav]);

  if (!user || user.isEmailVerified) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (code.trim().length !== 6) {
      setError("Please enter a 6-digit verification code.");
      return;
    }

    const res = await verifyEmail(code.trim());
    if (res.ok) {
      toast.success("Email verified successfully! Welcome to iTech Academy.");
      nav({ to: `/${user.role}` as any });
    } else {
      setError(res.error);
      toast.error(res.error);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setSuccessMsg(null);

    const res = await resendCode();
    setIsResending(false);

    if (res.ok) {
      setSuccessMsg("A new verification code has been sent to your email.");
      toast.success("Verification code resent.");
    } else {
      setError(res.error);
      toast.error(res.error);
    }
  };

  return (
    <div className="min-h-screen relative grid place-items-center p-6">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
      <div className="absolute top-1/4 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-1/4 -right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification code to{" "}
            <span className="text-foreground font-semibold">{user.email}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="otp" className="text-xs uppercase tracking-wider text-muted-foreground">
              Verification Code
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="otp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="pl-9 h-12 bg-secondary/60 text-center font-mono text-xl tracking-widest"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 gradient-primary text-primary-foreground border-0 glow"
          >
            Verify Code
          </Button>

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-primary hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
              Resend Code
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Log out
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
