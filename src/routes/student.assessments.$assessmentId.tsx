import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Eye,
  RotateCcw,
  LockKeyhole,
} from "lucide-react";
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

export const Route = createFileRoute("/student/assessments/$assessmentId")({ component: QuizPage });

function QuizPage() {
  const { assessmentId } = useParams({ from: "/student/assessments/$assessmentId" });
  const { user } = useAuth();
  const nav = useNavigate();
  const {
    assessments,
    courses,
    submissions,
    submitQuiz,
    progress,
    extraAttempts,
    markItemComplete,
    requestCertificate,
  } = useData();

  const a = assessments.find((x) => x.id === assessmentId);
  const course = a ? courses.find((c) => c.id === a.courseId) : null;

  const mySubs = useMemo(() => {
    if (!user || !a) return [];
    return submissions.filter((s) => s.studentId === user.id && s.assessmentId === a.id);
  }, [submissions, user, a]);

  const isUnlimitedAttempts = a ? !a.isFinal : false;
  const grantedExtra = user && a ? (extraAttempts[`${user.id}:${a.id}`] ?? 0) : 0;
  const maxAttemptsAllowed = a ? (isUnlimitedAttempts ? Infinity : a.attempts + grantedExtra) : 0;
  const attemptsLeft = a
    ? isUnlimitedAttempts
      ? 999
      : Math.max(0, maxAttemptsAllowed - mySubs.length)
    : 0;
  const enrolled = !!(user && course?.studentIds.includes(user.id));

  const [started, setStarted] = useState(false);
  const [startRequested, setStartRequested] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  const isProctored = Boolean(a && (a.isFinal || a.proctored));
  const requiresCamera = Boolean(a && (a.isFinal || a.proctored));
  const proctor = useProctor({ enabled: (startRequested || started) && !done, camera: requiresCamera });

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

  function handleSubmit(auto = false) {
    if (!user || !a) return;
    proctor.stopCamera();
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    const finalEvent = {
      at: new Date().toISOString(),
      type: "submitted" as const,
      detail: auto ? "timeout" : "manual",
    };
    const finalEventsList = [...proctor.events, finalEvent];
    const id = submitQuiz(a.id, user.id, answers, finalEventsList);

    const hasShortAnswer = a.questions.some((q) => q.type === "short");

    if (hasShortAnswer) {
      if (auto) {
        toast.warning("Time's up — test auto-submitted to instructor for grading.");
      } else {
        toast.success("Submitted! Your quiz has been sent to your instructor for review.");
      }
    } else {
      // Auto-graded calculation
      const subObj = {
        id,
        assessmentId: a.id,
        studentId: user.id,
        responses: Object.entries(answers || {}).map(([questionId, response]) => {
          const question = (a.questions || []).find((q) => q.id === questionId);
          let awarded = 0;
          if (question && (question.type === "mcq" || question.type === "truefalse")) {
            awarded = parseInt(response, 10) === question.correctIndex ? question.points : 0;
          }
          return { questionId, response, awarded };
        }),
        submittedAt: new Date().toISOString(),
        status: "graded" as const,
      };
      const { pct } = submissionScore(a, subObj);
      const passed = pct >= a.passingScore;

      if (course && passed) {
        // Auto-mark content item completed in course
        const matchingItem = course.sections
          .flatMap((s) => s.items)
          .find(
            (item) =>
              item.assessmentId === a.id ||
              item.title.trim().toLowerCase() === a.title.trim().toLowerCase() ||
              (a.isFinal && item.type === "assessment" && item.title.toLowerCase().includes("final")),
          );
        if (matchingItem) {
          markItemComplete(user.id, course.id, matchingItem.id);
        }

        if (a.isFinal) {
          requestCertificate(user.id, course.id, pct, finalEventsList);
          toast.success(`🎉 Congratulations! Passed with ${pct}%. Certificate request submitted for approval.`);
        } else {
          toast.success(`🎉 Passed with ${pct}%! Next lesson unlocked.`);
        }
      } else if (!passed) {
        toast.error(`Score: ${pct}% (Pass mark is ${a.passingScore}%). Please retake to proceed.`);
      }
    }

    setDone(id);
  }

  if (!a || !course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost">
          <Link to="/student/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <GlassCard className="text-center py-12 text-muted-foreground">
          Assignment or quiz not found.
        </GlassCard>
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost">
          <Link to="/student/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <GlassCard className="text-center py-12 text-muted-foreground">
          You're not enrolled in this course.
        </GlassCard>
      </div>
    );
  }

  if (a.isFinal && user) {
    const allCourseItems = course.sections.flatMap((s) => s.items);
    // Prerequisite items are all lessons/items except this final test itself
    const prereqItems = allCourseItems.filter(
      (item) =>
        item.assessmentId !== a.id &&
        !(item.type === "assessment" && item.title.toLowerCase().includes("final")),
    );
    const doneIds = new Set(progress[`${user.id}:${course.id}`] ?? []);
    const completedPrereqs = prereqItems.every((item) => doneIds.has(item.id));
    const pct = courseProgressPct(progress, user.id, course);
    const isUnlocked = prereqItems.length === 0 || completedPrereqs || pct >= 100;

    if (!isUnlocked) {
      return (
        <div className="space-y-4">
          <Button asChild variant="ghost">
            <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to course
            </Link>
          </Button>
          <GlassCard className="mx-auto max-w-xl text-center py-14">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-warning/15 text-warning">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">Final test locked</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete every lesson in{" "}
              <span className="font-medium text-foreground">{course.name}</span> to unlock this
              final test.
            </p>
            <div className="mt-4 mx-auto max-w-xs">
              <Progress value={pct} className="h-2" />
              <div className="mt-1 text-xs text-muted-foreground">{pct}% complete</div>
            </div>
          </GlassCard>
        </div>
      );
    }
  }

  // Done view
  if (done) {
    const sub = submissions.find((s) => s.id === done) ?? mySubs[0];
    if (sub) {
      const isGraded = sub.status === "graded";
      const { earned, max, pct } = submissionScore(a, sub);
      const passed = isGraded && pct >= a.passingScore;

      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <PageHeader title="Submission received" subtitle={a.title} />
          <GlassCard className="text-center py-12">
            <div
              className={`mx-auto h-16 w-16 rounded-2xl grid place-items-center mb-4 ${
                isGraded
                  ? passed
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {isGraded ? (
                passed ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <AlertTriangle className="h-8 w-8" />
                )
              ) : (
                <Clock className="h-8 w-8 text-primary animate-pulse" />
              )}
            </div>

            {isGraded ? (
              <>
                <div className="text-4xl font-bold gradient-text">{pct}%</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {earned}/{max} points · Passing Score: {a.passingScore}%
                </div>
                <Badge
                  variant="outline"
                  className={`mt-4 ${
                    passed
                      ? "border-success/40 text-success bg-success/10"
                      : "border-destructive/40 text-destructive bg-destructive/10"
                  }`}
                >
                  {passed ? "Passed 🎉" : "Did not pass"}
                </Badge>
                {sub.feedback && (
                  <div className="mt-4 p-3 bg-secondary/30 rounded-xl max-w-md mx-auto text-xs text-muted-foreground italic border border-border/60">
                    Teacher Feedback: "{sub.feedback}"
                  </div>
                )}
                {passed ? (
                  <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✨ Assessment passed! Your next course lessons and modules are unlocked.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    🔒 Score is below {a.passingScore}%. Please retake this assessment to unlock forward lessons.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-foreground">Awaiting Teacher Grading</div>
                <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Your answers have been submitted to your instructor. Once your teacher reviews and grades your submission, you will receive an email notification with your final score and feedback, and subsequent lessons in the course will unlock.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Status: Pending Instructor Review
                </div>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {(!passed || isUnlimitedAttempts) && (
                <Button
                  onClick={() => {
                    setDone(null);
                    setStarted(false);
                    setStartRequested(false);
                    setAnswers({});
                    targetEndTimeRef.current = null;
                  }}
                  className="gradient-primary text-primary-foreground border-0 text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" /> Retake Test
                </Button>
              )}
              <Button asChild variant="outline" className="text-xs cursor-pointer">
                <Link to="/student/progress">View progress</Link>
              </Button>
              <Button
                asChild
                variant={passed ? "default" : "outline"}
                className={`text-xs cursor-pointer ${
                  passed ? "gradient-primary text-primary-foreground border-0" : ""
                }`}
              >
                <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>
                  Back to course
                </Link>
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
          <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course
          </Link>
        </Button>
        <PageHeader title={a.title} subtitle={`${course.name} · ${a.questions.length} questions`} />
        <GlassCard className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-secondary/40 p-4">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{a.timeLimit}m</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Time limit
              </div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="text-xl font-bold">{a.passingScore}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Pass mark
              </div>
            </div>
            <div className="rounded-xl bg-secondary/40 p-4">
              <div className="text-xl font-bold">
                {isUnlimitedAttempts ? "Unlimited" : `${attemptsLeft}/${maxAttemptsAllowed}`}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isUnlimitedAttempts ? "Attempts" : "Attempts left"}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg p-3">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Proctoring is enabled</div>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs text-foreground/80">
                <li>
                  The quiz will open in <strong>fullscreen</strong>. Exiting fullscreen is logged.
                </li>
                <li>Tab switches, copy/paste, right-click and shortcut keys are recorded.</li>
                {requiresCamera && (
                  <>
                    <li>
                      <strong>Camera access is required</strong> for this final exam. A live preview
                      will be visible while you take the test.
                    </li>
                    <li>Camera movement is monitored and logged as part of the proctor report.</li>
                  </>
                )}
                <li>
                  All suspicious activity is shared with your instructor and admin with the
                  certificate request.
                </li>
              </ul>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Worth {maxScore(a)} points across {a.questions.length} questions. Once started the timer
            cannot be paused.
          </div>
          {a.questions.length === 0 ? (
            <div className="text-sm text-destructive">
              This quiz has no questions yet — ask your instructor.
            </div>
          ) : !isUnlimitedAttempts && attemptsLeft <= 0 ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-destructive/15 grid place-items-center text-destructive">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div className="font-bold text-base text-foreground">
                Your attempts have been completed
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                You have used all {a.attempts} allowed attempt{a.attempts === 1 ? "" : "s"} for this
                assessment. If you want more attempts, please contact your teacher or message admin.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-primary/40 text-primary text-xs"
                >
                  <Link to="/student/courses/$courseId" params={{ courseId: course.id }}>
                    Back to Course
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={async () => {
                setStartRequested(true);
                setStarted(true);
                try {
                  await proctor.requestFullscreen();
                } catch (err) {
                  console.warn("Fullscreen request error:", err);
                }
                if (requiresCamera) {
                  try {
                    await proctor.requestCamera();
                  } catch (err) {
                    console.warn("Camera request error:", err);
                  }
                }
              }}
              className="w-full gradient-primary text-primary-foreground border-0 glow cursor-pointer font-bold py-3.5 text-base shadow-lg"
            >
              Start {a.isFinal ? "Final Exam (Proctored)" : a.proctored ? "Assessment (Proctored)" : "Assessment"} →
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

  const susCount = proctor.events.filter((e) =>
    [
      "fullscreen_exit",
      "tab_blur",
      "visibility_hidden",
      "copy",
      "paste",
      "context_menu",
      "key_meta",
      "camera_denied",
      "camera_ended",
      "camera_motion",
    ].includes(e.type),
  ).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Fullscreen Warning & Re-enter Banner */}
      {isProctored && !proctor.fullscreenActive && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3 text-xs font-semibold shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 animate-bounce" />
            <span>Fullscreen mode is required for this proctored assessment. Please click to restore fullscreen.</span>
          </div>
          <Button
            size="sm"
            onClick={() => proctor.requestFullscreen()}
            className="gradient-primary text-primary-foreground text-xs h-7 px-3 shrink-0 cursor-pointer shadow-xs font-semibold"
          >
            Re-enter Fullscreen
          </Button>
        </div>
      )}

      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md p-3.5 rounded-b-xl shadow-lg border-b border-border/80 mb-4 -mt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{a.title}</div>
            <Progress
              value={(answered / Math.max(1, a.questions.length)) * 100}
              className="h-1.5 mt-1.5"
            />
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span>
                {answered}/{a.questions.length} answered
              </span>
              <span>·</span>
              <span className={susCount > 0 ? "text-amber-500 font-semibold" : ""}>
                <Eye className="inline h-3 w-3 -mt-0.5 mr-1" />
                {susCount} flag{susCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shrink-0 ${
              lowTime
                ? "border-destructive/60 bg-destructive/15 text-destructive animate-pulse"
                : "border-primary/40 bg-primary/10 text-primary"
            }`}
          >
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </div>

      {requiresCamera && (
        <div className="fixed bottom-4 right-4 z-50 w-48 rounded-xl overflow-hidden border-2 border-primary/50 bg-black shadow-2xl">
          <div className="flex items-center justify-between px-2.5 py-1 bg-primary/90 text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Camera className="h-3 w-3" /> Proctor Camera
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <video
            ref={proctor.videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-32 object-cover bg-black"
          />
          {(!proctor.cameraReady || proctor.cameraError) && (
            <div className="p-2 text-center bg-card/90 border-t border-border">
              <p className="text-[10px] text-destructive mb-1.5">
                {proctor.cameraError || "Camera access is required for proctoring."}
              </p>
              <Button
                size="sm"
                onClick={() => proctor.requestCamera()}
                className="gradient-primary text-primary-foreground text-[10px] h-6 px-2 w-full font-semibold cursor-pointer"
              >
                Allow Camera Access
              </Button>
            </div>
          )}
        </div>
      )}

      {a.questions.map((q, i) => (
        <GlassCard key={q.id} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Question {i + 1} of {a.questions.length} · {q.points} pts
            </div>
          </div>
          <div className="font-medium">{q.prompt}</div>
          {q.imageUrl && (
            <img
              src={q.imageUrl}
              alt={`Question ${i + 1} reference`}
              className="max-h-80 w-full rounded-xl border border-border object-contain bg-secondary/30"
            />
          )}

          {q.type === "mcq" && (
            <RadioGroup
              value={answers[q.id] ?? ""}
              onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
            >
              {q.options.map((o, oi) => (
                <Label
                  key={oi}
                  htmlFor={`${q.id}-${oi}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition"
                >
                  <RadioGroupItem id={`${q.id}-${oi}`} value={String(oi)} />
                  <span className="text-sm">{o}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          {q.type === "truefalse" && (
            <RadioGroup
              value={answers[q.id] ?? ""}
              onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
            >
              {["True", "False"].map((label, oi) => (
                <Label
                  key={oi}
                  htmlFor={`${q.id}-${oi}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/40 transition"
                >
                  <RadioGroupItem id={`${q.id}-${oi}`} value={String(oi)} />
                  <span className="text-sm">{label}</span>
                </Label>
              ))}
            </RadioGroup>
          )}

          {q.type === "short" && (
            <Textarea
              rows={3}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Type your answer..."
            />
          )}
        </GlassCard>
      ))}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            if (confirm("Discard this attempt?"))
              nav({ to: "/student/courses/$courseId", params: { courseId: course.id } });
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmit(false)}
          className="flex-1 gradient-primary text-primary-foreground border-0 glow"
        >
          Submit assignment/quiz
        </Button>
      </div>
    </div>
  );
}
