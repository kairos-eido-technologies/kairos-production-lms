import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ArrowRight, Lock, Mail, AlertCircle, Phone, Loader2 } from "lucide-react";
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

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (user) nav({ to: `/${user.role}` as any });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "forgot") {
      if (forgotStep === "send-code") {
        if (!email.trim()) {
          setError("Email is required.");
          return;
        }
        const res = await forgotPassword(email);
        if (!res.ok) {
          setError(res.error);
          toast.error(res.error);
          return;
        }
        toast.success("Password reset code sent to your email!");
        setForgotStep("reset-pwd");
        return;
      }

      if (forgotStep === "reset-pwd") {
        if (!resetCode.trim() || !newPwd || !newConfirm) {
          setError("All fields are required.");
          return;
        }
        if (newPwd !== newConfirm) {
          setError("Passwords do not match.");
          return;
        }
        const res = await resetPassword({ email, code: resetCode, newPassword: newPwd });
        if (!res.ok) {
          setError(res.error);
          toast.error(res.error);
          return;
        }
        toast.success("Password reset successfully! Please sign in.");
        setMode("login");
        setForgotStep("send-code");
        setResetCode("");
        setNewPwd("");
        setNewConfirm("");
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

    if (!email.trim() || !pwd) {
      setError("Email and password are required.");
      return;
    }
    const res = await login(email, pwd);
    if (!res.ok) {
      setError(res.error);
      toast.error(res.error);
      return;
    }
    toast.success("Welcome back!");
    nav({ to: `/${res.role}` as any });
  };

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 overflow-hidden">
      <div className="relative hidden lg:flex flex-col justify-between p-12 border-r border-border bg-sidebar overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
        <div className="absolute top-1/4 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative"><Logo /></div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Private learning platform
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Learn fast.<br/>
            <span className="gradient-text">Build the future.</span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            iTech Academy is an invite-only learning environment. Three roles, one mission: mastery.
          </p>
        </div>

        <div className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} Kairos Eido Technologies</div>
      </div>

      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "forgot" ? (forgotStep === "send-code" ? "Forgot password" : "Reset password") : mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "forgot" ? (forgotStep === "send-code" ? "Enter your email to request a reset code." : "Enter the verification code and set your new password.") : mode === "login" ? "Sign in to access your learning dashboard." : "Join iTech Academy as a student."}
            </p>
          </div>

          {mode !== "forgot" && (
            <div className="grid grid-cols-2 rounded-xl bg-secondary/40 p-1">
              <button type="button" onClick={() => { setMode("login"); setError(null); }}
                className={`h-9 rounded-lg text-sm font-medium transition ${mode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>
                Sign in
              </button>
              <button type="button" onClick={() => { setMode("signup"); setError(null); }}
                className={`h-9 rounded-lg text-sm font-medium transition ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>
                Create account
              </button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "forgot" ? (
              forgotStep === "send-code" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" autoComplete="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9 h-11 bg-secondary/60" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-display">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email-display" type="email" value={email} disabled
                        className="pl-9 h-11 bg-secondary/30 opacity-70 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-code">Verification Code</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="reset-code" type="text" maxLength={6} value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="pl-9 h-11 bg-secondary/60 font-mono tracking-widest text-center" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pwd">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="new-pwd" type="password" value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-secondary/60" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-confirm">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="new-confirm" type="password" value={newConfirm}
                        onChange={(e) => setNewConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-secondary/60" />
                    </div>
                  </div>
                </>
              )
            ) : (
              <>
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 bg-secondary/60" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 99999 99999" className="pl-9 h-11 bg-secondary/60" />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" autoComplete="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9 h-11 bg-secondary/60" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="pwd">Password</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => { setMode("forgot"); setForgotStep("send-code"); setError(null); }}
                        className="text-xs text-primary hover:underline font-medium hover:text-primary/80 transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="pwd" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 h-11 bg-secondary/60" />
                  </div>
                </div>
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="confirm" type="password" value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-secondary/60" />
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full h-11 gradient-primary text-primary-foreground border-0 hover:opacity-90 glow group">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <>
                  {mode === "forgot" ? (forgotStep === "send-code" ? "Send verification code" : "Reset password") : mode === "login" ? "Sign in" : "Create account"}
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {mode === "login" && (
            <p className="text-sm text-muted-foreground">
              Use your registered account credentials to sign in.
            </p>
          )}

          {mode === "forgot" && (
            <div className="flex justify-between items-center text-sm pt-2 border-t border-border/40">
              {forgotStep === "reset-pwd" ? (
                <button type="button" onClick={async () => {
                  setError(null);
                  const res = await forgotPassword(email);
                  if (!res.ok) {
                    setError(res.error);
                    toast.error(res.error);
                  } else {
                    toast.success("A new code has been sent!");
                  }
                }}
                  className="text-primary hover:underline transition-colors font-medium">
                  Resend Code
                </button>
              ) : (
                <div />
              )}
              <button type="button" onClick={() => { setMode("login"); setError(null); setForgotStep("send-code"); }}
                className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                Back to Sign in
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
