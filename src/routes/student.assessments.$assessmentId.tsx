import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, ShieldCheck, AlertTriangle, CheckCircle2, Camera, Eye } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/store";
import { useData, maxScore, submissionScore, courseProgressPct } from "@/lib/data-store";
import { useProctor } from "@/lib/proctor";
import { LockKeyhole } from "lucide-react";

export const Route = createFileRoute("/student/assessments/$assessmentId")({ component: QuizPage });

function QuizPage() {
  const { assessmentId } = useParams({ from: "/student/assessments/$assessmentId" });
  const { user } = useAuth();
  const nav = useNavigate();
  const { assessments, courses, submissions, submitQuiz, progress, extraAttempts, markItemComplete } = useData();

  const a = assessments.find((x) => x.id === assessmentId);
  const course = a ? courses.find((c) => c.id === a.courseId) : null;

  const mySubs = useMemo(() => {
    if (!user || !a) return [];
    return submissions.filter((s) => s.studentId === user.id && s.assessmentId === a.id);
  }, [submissions, user, a]);

  const grantedExtra = (user && a ? extraAttempts[`${user.id}:${a.id}`] ?? 0 : 0);
  const maxAttemptsAllowed = a ? a.attempts + grantedExtra : 0;
  const attemptsLeft = a ? Math.max(0, maxAttemptsAllowed - mySubs.length) : 0;
  const enrolled = !!(user && course?.studentIds.includes(user.id));

  const [started, setStarted] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  const requiresCamera = !!(a && a.isFinal);
  const proctor = useProctor({ enabled: startRequested && !done, camera: requiresCamera });
  const proctorReady = proctor.fullscreenActive && (!requiresCamera || proctor.cameraReady);

  const targetEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (started && !done && a) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + a.timeLimit * 60 * 1000;
        setRemaining(a.timeLimit * 60);
      }
    } else if (done) {
      targetEndTimeRef.current = null;
    }
  }, [started, done, a]);

  useEffect(() => {
    if (!startRequested || done || started) return;
    if (proctorReady) {
      setStarted(true);
    }
  }, [proctorReady, startRequested, done, started]);

  useEffect(() => {
    if (!started || done) return;
    const t = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const diffMs = targetEndTimeRef.current - Date.now();
      const diffSecs = Math.max(0, Math.ceil(diffMs / 1000));
      setRemaining(diffSecs);
      if (diffSecs <= 0) {
        clearInterval(t);
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [started, done]);

  if (!a || !course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">Assignment or quiz not found.</GlassCard>
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">You're not enrolled in this course.</GlassCard>
      </div>
    );
  }

  if (a.isFinal && user) {
    const pct = courseProgressPct(progress, user.id, course);
    const totalItems = course.sections.reduce((n, s) => n + s.items.length, 0);
    if (pct < 100 || totalItems === 0) {
      return (
        <div className="space-y-4">
          <Button asChild variant="ghost"><Link to="/student/courses/$courseId" params={{ courseId: course.id }}><ArrowLeft className="mr-2 h-4 w-4" />Back to course</Link></Button>
          <GlassCard className="mx-auto max-w-xl text-center py-14">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">Final test locked</h2>
            <p className="mt-2 text-sm text-muted-foreground">Complete every item in <span className="font-medium text-foreground">{course.name}</span> to unlock this final test.</p>
            <div className="mt-4 mx-auto max-w-xs">
              <Progress value={pct} className="h-2" />
              <div className="mt-1 text-xs text-muted-foreground">{pct}% complete</div>
            </div>
          </GlassCard>
        </div>
      );
    }
  }

  function handleSubmit(auto = false) {
    if (!user || !a) return;
    proctor.stopCamera();
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    const finalEvent = { at: new Date().toISOString(), type: "submitted" as const, detail: auto ? "timeout" : "manual" };
    const finalEventsList = [...proctor.events, finalEvent];
    const id = submitQuiz(a.id, user.id, answers, finalEventsList);

    // Auto-mark any matching content item as completed
    if (course) {
      const matchingItem = course.sections.flatMap((s) => s.items).find((item) => item.assessmentId === a.id);
      if (matchingItem) {
        markItemComplete(user.id, course.id, matchingItem.id);
      }
    }

    if (auto) toast.warning("Time's up — auto-submitted");
    else toast.success("Submitted!");
    setDone(id);
  }

  // Done view
  if (done) {
    const sub = submissions.find((s) => s.id === done) ?? mySubs[0];
    if (sub) {
      const { earned, max, pct } = submissionScore(a, sub);
      const passed = pct >= a.passingScore;
      const auto = sub.status === "graded";
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <PageHeader title="Submission received" subtitle={a.title} />
          <GlassCard className="text-center py-12">
            <div className={`mx-auto h-16 w-16 rounded-2xl grid place-items-center mb-4 ${passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {passed ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
            </div>
            {auto ? (
              <>
                <div className="text-4xl font-bold gradient-text">{pct}%</div>
                <div className="mt-2 text-sm text-muted-foreground">{earned}/{max} points</div>
                <Badge variant="outline" className={`mt-4 ${passed ? "border-success/40 text-success bg-success/10" : "border-destructive/40 text-destructive bg-destructive/10"}`}>
                  {passed ? "Passed" : "Did not pass"}
                </Badge>
                {passed && <p className="mt-3 text-xs text-muted-foreground">A certificate request was sent to admin for approval.</p>}
              </>
            ) : (
              <>
                <div className="font-semibold">Awaiting teacher grading</div>
                <p className="mt-2 text-sm text-muted-foreground">Short-answer responses need manual review.</p>
              </>
            )}
            <div className="mt-6 flex gap-2 justify-center">
              <Button asChild variant="outline"><Link to="/student/progress">View progress</Link></Button>
              <Button asChild className="gradient-primary text-primary-foreground border-0">
                <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>Back to course</Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }
  }

  // Intro view
  if (!started) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button asChild variant="ghost" size="sm">
          <Link to="/student/courses/$courseId" params={{ courseId: course.id }}><ArrowLeft className="mr-2 h-4 w-4" />Back to course</Link>
        </Button>
        <PageHeader title={a.title} subtitle={`${course.name} · ${a.questions.length} questions`} />
        <GlassCard className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-secondary/40 p-4">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{a.timeLimit}m</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Time limit</div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="text-xl font-bold">{a.passingScore}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pass mark</div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="text-xl font-bold">{attemptsLeft}/{maxAttemptsAllowed}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Attempts left</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg p-3">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Proctoring is enabled</div>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs text-foreground/80">
                <li>The quiz will open in <strong>fullscreen</strong>. Exiting fullscreen is logged.</li>
                <li>Tab switches, copy/paste, right-click and shortcut keys are recorded.</li>
                {requiresCamera && <>
                  <li><strong>Camera access is required</strong> for this final exam. A live preview will be visible while you take the test.</li>
                  <li>Camera movement is monitored and logged as part of the proctor report.</li>
                </>}
                <li>All suspicious activity is shared with your instructor and admin with the certificate request.</li>
              </ul>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Worth {maxScore(a)} points across {a.questions.length} questions. Once started the timer cannot be paused.
          </div>
          {a.questions.length === 0 ? (
            <div className="text-sm text-destructive">This quiz has no questions yet — ask your instructor.</div>
          ) : attemptsLeft === 0 ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-destructive/15 grid place-items-center text-destructive">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div className="font-bold text-base text-foreground">Your attempts have been completed</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                You have used all {a.attempts} allowed attempt{a.attempts === 1 ? "" : "s"} for this assessment. If you want more attempts, please contact your teacher or message admin.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <Button asChild size="sm" variant="outline" className="border-primary/40 text-primary text-xs">
                  <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>Back to Course</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={async () => {
                setStartRequested(true);
                setStarted(true);
                proctor.requestFullscreen();
                if (requiresCamera) proctor.requestCamera();
              }}
              className="w-full gradient-primary text-primary-foreground border-0 glow cursor-pointer font-bold py-3 text-base shadow-lg"
            >
              Start assignment/quiz
            </Button>
          )}
          {mySubs.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Previous attempts: {mySubs.map((s) => `${submissionScore(a, s).pct}%`).join(", ")}
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  const answered = a.questions.filter((q) => (answers[q.id] ?? "").length > 0).length;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const lowTime = remaining < 60;

  const susCount = proctor.events.filter((e) => ["fullscreen_exit","tab_blur","visibility_hidden","copy","paste","context_menu","key_meta","camera_denied","camera_ended","camera_motion"].includes(e.type)).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md p-3.5 rounded-b-xl shadow-lg border-b border-border/80 mb-4 -mt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{a.title}</div>
            <Progress value={(answered / Math.max(1, a.questions.length)) * 100} className="h-1.5 mt-1.5" />
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span>{answered}/{a.questions.length} answered</span>
              <span>·</span>
              <span className={susCount > 0 ? "text-amber-500 font-semibold" : ""}>
                <Eye className="inline h-3 w-3 -mt-0.5 mr-1" />
                {susCount} flag{susCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shrink-0 ${
            lowTime ? "border-destructive/60 bg-destructive/15 text-destructive animate-pulse" : "border-primary/40 bg-primary/10 text-primary"
          }`}>
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </div>

      {requiresCamera && (
        <div className="fixed bottom-4 right-4 z-50 w-44 rounded-xl overflow-hidden border-2 border-primary/50 bg-black shadow-2xl">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/90 text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
            <Camera className="h-3 w-3" /> Proctor camera
          </div>
          <video ref={proctor.videoRef} autoPlay muted playsInline className="w-full h-32 object-cover bg-black" />
          {proctor.cameraError && <div className="px-2 py-1 text-[10px] text-destructive bg-destructive/10">{proctor.cameraError}</div>}
        </div>
      )}

      {a.questions.map((q, i) => (
        <GlassCard key={q.id} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs text-muted-foreground">Question {i + 1} of {a.questions.length} · {q.points} pts</div>
          </div>
          <div className="font-medium">{q.prompt}</div>
          {q.imageUrl && <img src={q.imageUrl} alt={`Question ${i + 1} reference`} className="max-h-80 w-full rounded-xl border border-border object-contain bg-secondary/30" />}

          {q.type === "mcq" && (
            <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
              {q.options.map((o, oi) => (
                <Label key={oi} htmlFor={`${q.id}-${oi}`} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition">
                  <RadioGroupItem id={`${q.id}-${oi}`} value={String(oi)} />
                  <span className="text-sm">{o}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          {q.type === "truefalse" && (
            <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
              {["True", "False"].map((label, oi) => (
                <Label key={oi} htmlFor={`${q.id}-${oi}`} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition">
                  <RadioGroupItem id={`${q.id}-${oi}`} value={String(oi)} />
                  <span className="text-sm">{label}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          {q.type === "short" && (
            <Textarea rows={3} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Type your answer..." />
          )}
        </GlassCard>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { if (confirm("Discard this attempt?")) nav({ to: "/student/courses/$courseId", params: { courseId: course.id } }); }}>
          Cancel
        </Button>
        <Button onClick={() => handleSubmit(false)} className="flex-1 gradient-primary text-primary-foreground border-0 glow">
          Submit assignment/quiz
        </Button>
      </div>
    </div>
  );
}