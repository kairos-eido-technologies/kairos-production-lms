import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart3, BookOpen, Play, ClipboardCheck } from "lucide-react";
import { PageHeader, GlassCard, StatCard, CourseThumbnail } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, submissionScore } from "@/lib/data-store";

export const Route = createFileRoute("/student/progress")({ component: StudentProgress });

function StudentProgress() {
  const { user } = useAuth();
  const { courses, assessments, submissions, progress } = useData();

  const my = useMemo(() => {
    if (!user) return [];
    return courses.filter((c) => c.studentIds.includes(user.id));
  }, [courses, user]);

  const mySubs = useMemo(() => {
    if (!user) return [];
    return submissions.filter((s) => s.studentId === user.id);
  }, [submissions, user]);

  const overall = my.length
    ? Math.round(my.reduce((sum, c) => sum + courseProgressPct(progress, user!.id, c), 0) / my.length)
    : 0;

  const quizAvg = (() => {
    const graded = mySubs.filter((s) => s.status === "graded");
    if (graded.length === 0) return null;
    let total = 0;
    for (const s of graded) {
      const a = assessments.find((x) => x.id === s.assessmentId);
      if (!a) continue;
      total += submissionScore(a, s).pct;
    }
    return Math.round(total / graded.length);
  })();

  return (
    <div className="space-y-8">
      <PageHeader title="My Progress" subtitle="Course completion and quiz performance." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled Courses" value={my.length} icon={BookOpen} />
        <StatCard label="Overall Completion" value={`${overall}%`} icon={BarChart3} delay={0.05} accent />
        <StatCard label="Quiz Average" value={quizAvg === null ? "—" : `${quizAvg}%`} icon={ClipboardCheck} delay={0.1} />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Course progress</h3>
        {my.length === 0 ? (
          <GlassCard className="text-center py-12 text-sm text-muted-foreground">No courses yet.</GlassCard>
        ) : (
          my.map((c) => {
            const pct = courseProgressPct(progress, user!.id, c);
            const totalItems = c.sections.reduce((n, s) => n + s.items.length, 0);
            const done = (progress[`${user!.id}:${c.id}`] ?? []).length;
            return (
              <GlassCard key={c.id}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <CourseThumbnail thumbnail={c.thumbnail} name={c.name} className="h-10 w-10" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{done}/{totalItems} items · {c.code}</div>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/student/courses/$courseId" params={{ courseId: c.id }}>
                      <Play className="h-3 w-3 mr-1.5 fill-current" />Continue
                    </Link>
                  </Button>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span>{pct}%</span></div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Quiz history</h3>
        {mySubs.length === 0 ? (
          <GlassCard className="text-center py-12 text-sm text-muted-foreground">
            No quiz submissions yet — head to <Link to="/student/courses" className="text-primary underline">My Courses</Link> to find an assessment.
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {mySubs.map((s) => {
              const a = assessments.find((x) => x.id === s.assessmentId);
              if (!a) return null;
              const c = courses.find((x) => x.id === a.courseId);
              const { earned, max, pct } = submissionScore(a, s);
              const passed = pct >= a.passingScore;
              return (
                <GlassCard key={s.id} className="flex flex-wrap items-center gap-4">
                  <ClipboardCheck className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{c?.name ?? "—"} · submitted {s.submittedAt}</div>
                    {s.feedback && <div className="text-xs text-muted-foreground italic mt-1">"{s.feedback}"</div>}
                  </div>
                  {s.status === "graded" ? (
                    <Badge variant="outline" className={passed ? "border-success/40 text-success bg-success/10" : "border-destructive/40 text-destructive bg-destructive/10"}>
                      {earned}/{max} · {pct}% · {passed ? "Pass" : "Fail"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10">Awaiting grade</Badge>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}