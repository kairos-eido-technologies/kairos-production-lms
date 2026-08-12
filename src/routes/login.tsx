import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ParticleLayer } from "@/components/effects/ParticleLayer";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Phone,
  Loader2,
  Zap,
  Shield,
  Trophy,
  Users,
  BookOpen,
  Star,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — iTech Academy" },
      { name: "description", content: "Access your iTech Academy learning portal." },
    ],
  }),
  component: LoginPage,
});

/** Same circuit traces as the preview hero */
function CircuitTraces() {
  const reduced = useReducedMotion();
  const paths = [
    "M0 120 H180 L230 70 H460 L520 130 H820",
    "M0 300 H120 L190 230 H520 L580 300 H1000",
    "M60 480 H300 L360 420 H700 L760 480 H1200",
    "M-20 620 H240 L300 560 H640 L700 620 H1100",
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-[0.3] pointer-events-none"
    >
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1"
          initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: reduced ? 0.01 : 3, delay: i * 0.3, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 60%, transparent))" }}
        />
      ))}
      {[[230, 70], [520, 130], [190, 230], [580, 300], [360, 420], [700, 620]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="var(--primary-glow)" opacity="0.75" />
      ))}
    </svg>
  );
}

const BENEFITS = [
  { icon: Zap, text: "30+ industry-mapped courses" },
  { icon: Shield, text: "Pearson VUE test centre" },
  { icon: Trophy, text: "100% placement support" },
  { icon: Users, text: "5,000+ students trained" },
  { icon: BookOpen, text: "Live projects from week one" },
  { icon: Star, text: "ISO 9001:2015 certified" },
];

/** Glass input wrapper */
const GlassInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input
    {...props}
    className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 backdrop-blur-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all h-11 ${className}`}
  />
);

function LoginPage() {
  const { user, login, register, initializeSession, forgotPassword, resetPassword, isLoading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<"send-code" | "reset-pwd">("send-code");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [phone, setPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newConfirm, setNewConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { initializeSession(); }, [initializeSession]);
  useEffect(() => { if (user) nav({ to: `/${user.role}` as any }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "forgot") {
      if (forgotStep === "send-code") {
        if (!email.trim()) { setError("Email is required."); return; }
        const res = await forgotPassword(email);
        if (!res.ok) { setError(res.error); toast.error(res.error); return; }
        toast.success("Password reset code sent to your email!");
        setForgotStep("reset-pwd");
        return;
      }
      if (forgotStep === "reset-pwd") {
        if (!resetCode.trim() || !newPwd || !newConfirm) { setError("All fields are required."); return; }
        if (newPwd !== newConfirm) { setError("Passwords do not match."); return; }
        const res = await resetPassword({ email, code: resetCode, newPassword: newPwd });
        if (!res.ok) { setError(res.error); toast.error(res.error); return; }
        toast.success("Password reset successfully! Please sign in.");
        setMode("login"); setForgotStep("send-code"); setResetCode(""); setNewPwd(""); setNewConfirm("");
        return;
      }
    }

    if (mode === "signup") {
      if (pwd !== confirm) { setError("Passwords do not match."); return; }
      const res = await register({ name, email, password: pwd, phone });
      if (!res.ok) { setError(res.error); toast.error(res.error); return; }
      toast.success("Account created — welcome!");
      nav({ to: "/student" });
      return;
    }

    if (!email.trim() || !pwd) { setError("Email and password are required."); return; }
    const res = await login(email, pwd);
    if (!res.ok) { setError(res.error); toast.error(res.error); return; }
    toast.success("Welcome back!");
    nav({ to: `/${res.role}` as any });
  };

  return (
    // ParticleLayer at root level — same as GitHub repo's index.tsx
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4 py-12">
      {/* Full-page particles — identical to preview page */}
      <ParticleLayer />
      <CircuitTraces />

      {/* Red radial glow matching hero */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%), radial-gradient(ellipse 60% 40% at 80% 100%, color-mix(in oklab, var(--primary) 6%, transparent), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent,color-mix(in_oklab,var(--background)_70%,transparent))]" />

      {/* ── Main glass card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo + brand */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-primary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {mode === "forgot" ? "Password Recovery" : mode === "signup" ? "Join the Academy" : "Secure Portal"}
          </div>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl border border-white/10 p-8 shadow-2xl"
          style={{
            background: "color-mix(in oklab, var(--card) 55%, transparent)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset, 0 32px 64px -16px rgba(0,0,0,0.4), 0 0 60px -20px color-mix(in oklab, var(--primary) 20%, transparent)",
          }}
        >
          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === "forgot"
                ? forgotStep === "send-code" ? "Forgot password" : "Reset password"
                : mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "forgot"
                ? forgotStep === "send-code"
                  ? "Enter your email to receive a reset code."
                  : "Enter the code we sent and set a new password."
                : mode === "login"
                ? "Sign in to access your iTech Academy dashboard."
                : "Join iTech Academy and start your tech journey today."}
            </p>
          </div>

          {/* Tab switcher — transparent glass pill */}
          {mode !== "forgot" && (
            <div className="relative flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md mb-6">
              {/* Sliding gradient indicator */}
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-in-out"
                style={{
                  left: mode === "login" ? "4px" : "calc(50%)",
                  background: "var(--gradient-primary)",
                  boxShadow: "0 0 18px -4px color-mix(in oklab, var(--primary) 55%, transparent)",
                }}
              />
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className={`relative z-10 flex-1 h-9 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                  mode === "login" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); }}
                className={`relative z-10 flex-1 h-9 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                  mode === "signup" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {mode === "forgot" ? (
              forgotStep === "send-code" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <GlassInput id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-display" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <GlassInput id="email-display" type="email" value={email} disabled className="pl-9 opacity-60 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-code" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification Code</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <GlassInput id="reset-code" type="text" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="Enter 6-digit code" className="pl-9 font-mono tracking-widest text-center" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pwd" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <GlassInput id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <GlassInput id="new-confirm" type="password" value={newConfirm} onChange={(e) => setNewConfirm(e.target.value)} placeholder="••••••••" className="pl-9" />
                    </div>
                  </div>
                </>
              )
            ) : (
              <>
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full name</Label>
                      <GlassInput id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        <GlassInput id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999" className="pl-9" />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <GlassInput id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="pwd" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => { setMode("forgot"); setForgotStep("send-code"); setError(null); }} className="text-xs text-primary hover:underline font-medium transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <GlassInput id="pwd" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" className="pl-9" />
                  </div>
                </div>
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                      <GlassInput id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="pl-9" />
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 gradient-primary text-primary-foreground border-0 hover:opacity-90 glow group active:scale-[0.98] transition-all mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  {mode === "forgot"
                    ? forgotStep === "send-code" ? "Send verification code" : "Reset password"
                    : mode === "login" ? "Sign in to dashboard" : "Create my account"}
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {mode === "login" && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(null); }} className="text-primary hover:underline font-medium transition-colors">
                Create one free
              </button>
            </p>
          )}

          {mode === "forgot" && (
            <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-white/10">
              {forgotStep === "reset-pwd" ? (
                <button type="button" onClick={async () => {
                  setError(null);
                  const res = await forgotPassword(email);
                  if (!res.ok) { setError(res.error); toast.error(res.error); }
                  else toast.success("A new code has been sent!");
                }} className="text-primary hover:underline transition-colors font-medium">
                  Resend Code
                </button>
              ) : <div />}
              <button type="button" onClick={() => { setMode("login"); setError(null); setForgotStep("send-code"); }} className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                Back to Sign in
              </button>
            </div>
          )}
        </div>

        {/* Benefits strip below card */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 px-2.5 py-2 backdrop-blur-sm"
              style={{ background: "color-mix(in oklab, var(--card) 30%, transparent)" }}
            >
              <Icon className="h-3 w-3 shrink-0 text-primary" />
              <span className="text-[10px] text-muted-foreground leading-tight">{text}</span>
            </div>
          ))}
        </div>

        {/* Powered by */}
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
          Powered by Kairos Eido Technologies
        </p>
      </motion.div>
    </div>
  );
}
