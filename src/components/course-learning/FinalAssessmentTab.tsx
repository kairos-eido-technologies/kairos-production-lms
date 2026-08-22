import { Link } from "@tanstack/react-router";
import { LockKeyhole, CheckCircle2, ClipboardCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Course, StoreAssessment, ContentItem, Submission } from "@/lib/data-store";

interface FinalAssessmentTabProps {
  course: Course;
  assessments: StoreAssessment[];
  allItems: ContentItem[];
  done: Set<string>;
  pct: number;
  user: { id: string };
  submissions: Submission[];
}

export function FinalAssessmentTab({
  course,
  assessments,
  allItems,
  done,
  pct,
  user,
  submissions,
}: FinalAssessmentTabProps) {
  const courseAssessments = assessments.filter((a) => a.courseId === course.id);
  const lessonItems = allItems.filter((i) => i.type !== "assessment");
  const courseComplete =
    pct >= 100 ||
    (lessonItems.length > 0
      ? lessonItems.every((i) => done.has(i.id))
      : done.size >= allItems.length);

  if (courseAssessments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No assessments created for this course.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Course Final Test & Assessments
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Complete all lessons to unlock the Final Test.
        </p>
      </div>

      <div className="space-y-4">
        {!courseComplete && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
            <LockKeyhole className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold">Final Test Locked</div>
              <div>Complete all course content ({pct}% completed) to unlock your Final Test.</div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {courseAssessments.map((a) => {
            const canTake = !a.isFinal || courseComplete;
            const mySubsForAssess = submissions.filter(
              (s) => s.studentId === user.id && s.assessmentId === a.id,
            );
            const attemptsExhausted = mySubsForAssess.length >= a.attempts;
            return (
              <div
                key={a.id}
                className={`rounded-xl border p-5 transition ${
                  canTake
                    ? "border-primary/40 bg-card hover:border-primary"
                    : "border-border/60 bg-secondary/20 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] mb-1 ${
                        a.isFinal ? "border-primary text-primary" : "border-muted-foreground"
                      }`}
                    >
                      {a.isFinal ? "Final Test" : "Assignment / Quiz"}
                    </Badge>
                    <h4 className="font-bold text-sm text-foreground">{a.title}</h4>
                  </div>
                  {attemptsExhausted ? (
                    <LockKeyhole className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : canTake ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <LockKeyhole className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  {a.questions.length} questions · {a.timeLimit} min time limit · Pass{" "}
                  {a.passingScore}%
                </div>
                {attemptsExhausted ? (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full text-xs border-amber-500/40 text-amber-600 dark:text-amber-400"
                  >
                    <Link to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}>
                      Attempts Completed (View Details)
                    </Link>
                  </Button>
                ) : canTake ? (
                  <Button
                    asChild
                    className="w-full gradient-primary text-primary-foreground border-0 text-xs font-semibold"
                  >
                    <Link to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}>
                      Start {a.isFinal ? "Final Test" : "Assessment"}{" "}
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Button disabled variant="outline" className="w-full text-xs cursor-not-allowed">
                    Complete Lessons ({pct}%) to Unlock
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
