import React, { useRef, useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Video,
  BookOpen,
  FlaskConical,
  Link2,
  Download,
  CheckCircle2,
  Circle,
  Play,
  Image as ImageIcon,
  Presentation,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useData, type StoreAssessment, submissionScore } from "@/lib/data-store";
import type { ContentItem, ContentType } from "@/lib/mock-data";
import { SecurePdfViewer } from "@/components/SecurePdfViewer";
import { SecurePptViewer } from "@/components/SecurePptViewer";
import { CheckpointVideoPlayer } from "./CheckpointVideoPlayer";
import { sanitizeHtml } from "@/lib/sanitize";

const typeMeta: Record<ContentType, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  video: { icon: Video, label: "Video" },
  pdf: { icon: FileText, label: "PDF Document" },
  reading: { icon: BookOpen, label: "Reading" },
  lab: { icon: FlaskConical, label: "Interactive Lab" },
  link: { icon: Link2, label: "External Link" },
  download: { icon: Download, label: "Download Resource" },
  image: { icon: ImageIcon, label: "Diagram / Image" },
  ppt: { icon: Presentation, label: "Slide Deck" },
  assessment: { icon: ClipboardList, label: "Assessment" },
};

export function ContentViewer({
  item,
  assessments,
  completed,
  onAutoComplete,
  userId,
  prevItem,
  nextItem,
  onNavigate,
  isSequentialLocked = false,
  isNextUnlocked = true,
}: {
  item: ContentItem;
  assessments: StoreAssessment[];
  completed: boolean;
  onAutoComplete: () => void;
  userId: string;
  prevItem: ContentItem | null;
  nextItem: ContentItem | null;
  onNavigate: (id: string) => void;
  isSequentialLocked?: boolean;
  isNextUnlocked?: boolean;
}) {
  const { videoCheckpoints, checkpointProgress, submitCheckpointAnswer, submissions } = useData();
  const M = typeMeta[item.type] || { icon: FileText, label: item.type || "Content" };
  const linkedAssessment =
    (item.assessmentId ? assessments.find((a) => a.id === item.assessmentId) : null) ||
    assessments.find(
      (a) =>
        a.title.trim().toLowerCase() === item.title.trim().toLowerCase() ||
        (item.title.toLowerCase().includes("final") && a.isFinal),
    ) ||
    null;

  const mySubs = useMemo(() => {
    if (!linkedAssessment) return [];
    return submissions.filter(
      (s) => s.studentId === userId && s.assessmentId === linkedAssessment.id,
    );
  }, [submissions, userId, linkedAssessment]);

  const gradedSubs = useMemo(() => {
    return mySubs.filter((s) => s.status === "graded");
  }, [mySubs]);

  const isAwaitingGrading = useMemo(() => {
    return mySubs.some((s) => s.status !== "graded") && !gradedSubs.some((s) => submissionScore(linkedAssessment!, s).pct >= linkedAssessment!.passingScore);
  }, [mySubs, gradedSubs, linkedAssessment]);

  const bestSub = useMemo(() => {
    if (!linkedAssessment || gradedSubs.length === 0) return null;
    let best = gradedSubs[0];
    let bestScore = -1;
    for (const s of gradedSubs) {
      const { pct } = submissionScore(linkedAssessment, s);
      if (pct > bestScore) {
        bestScore = pct;
        best = s;
      }
    }
    return best;
  }, [linkedAssessment, gradedSubs]);

  const bestScoreInfo = useMemo(() => {
    if (!linkedAssessment || !bestSub) return null;
    return submissionScore(linkedAssessment, bestSub);
  }, [linkedAssessment, bestSub]);

  const hasPassedAssessment = Boolean(
    bestScoreInfo && bestScoreInfo.pct >= (linkedAssessment?.passingScore ?? 70),
  );

  const readingRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLDivElement>(null);

  // Dynamic Auto-Completion for Reading Articles (Scroll depth or short article dwell)
  useEffect(() => {
    if (item.type !== "reading") return;

    const dwellTimer = setTimeout(() => {
      const el = readingRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 60) {
        onAutoComplete();
      }
    }, 4000);

    const handleScroll = () => {
      const el = readingRef.current;
      if (!el) return;
      const scrollRatio = (el.scrollTop + el.clientHeight) / el.scrollHeight;
      if (scrollRatio >= 0.88 || el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
        onAutoComplete();
      }
    };

    const el = readingRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
    }

    return () => {
      clearTimeout(dwellTimer);
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
    };
  }, [item.id, item.type, onAutoComplete]);

  // Dynamic Auto-Completion for Labs with Body text
  useEffect(() => {
    if (item.type !== "lab" || !item.body) return;

    const dwellTimer = setTimeout(() => {
      const el = labRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 60) {
        onAutoComplete();
      }
    }, 4000);

    const handleScroll = () => {
      const el = labRef.current;
      if (!el) return;
      const scrollRatio = (el.scrollTop + el.clientHeight) / el.scrollHeight;
      if (scrollRatio >= 0.88 || el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
        onAutoComplete();
      }
    };

    const el = labRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
    }

    return () => {
      clearTimeout(dwellTimer);
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
    };
  }, [item.id, item.type, item.body, onAutoComplete]);

  // Dynamic Auto-Completion for Image / Diagram Viewers (Dwell timer)
  useEffect(() => {
    if (item.type === "image") {
      const timer = setTimeout(() => {
        onAutoComplete();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [item.id, item.type, onAutoComplete]);

  const itemCheckpoints = useMemo(() => {
    return videoCheckpoints.filter((cp) => cp.contentItemId === item.id);
  }, [videoCheckpoints, item.id]);

  // Copy protection & shortcut blocking
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && ["p", "s", "u", "a"].includes(key)) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "k"].includes(key))
      ) {
        e.preventDefault();
        toast.error(
          "Content is copy-protected and cannot be inspected, downloaded, printed, or saved.",
        );
      }
    };
    window.addEventListener("keydown", blockKeys);
    return () => window.removeEventListener("keydown", blockKeys);
  }, []);

  const handleIframeLoad = () => {
    // Auto-complete lab after iframe load dwell
    setTimeout(() => {
      onAutoComplete();
    }, 5000);
  };

  return (
    <div
      className="space-y-4 select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        toast.error("Right-click menu is disabled for content security.");
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-border mb-2">
            {M.label}
          </Badge>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{item.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {prevItem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(prevItem.id)}
              className="border-border h-9 text-xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-1 text-muted-foreground" /> Prev
            </Button>
          )}
          {nextItem && (
            <Button
              variant="outline"
              size="sm"
              disabled={isSequentialLocked && !completed && !isNextUnlocked}
              onClick={() => {
                if (isSequentialLocked && !completed && !isNextUnlocked) {
                  toast.error("🔒 Complete and pass this lesson first to unlock the next one.");
                  return;
                }
                onNavigate(nextItem.id);
              }}
              className="border-border h-9 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next{" "}
              {isSequentialLocked && !completed && !isNextUnlocked ? (
                <LockKeyhole className="h-3.5 w-3.5 ml-1 text-amber-500" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-1 text-muted-foreground" />
              )}
            </Button>
          )}

          {/* Dynamic Completion Indicator - purely dynamic based on progress */}
          {completed ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold px-3 py-1.5 h-9 flex items-center gap-1.5 text-xs shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-border/80 text-muted-foreground px-3 py-1.5 h-9 flex items-center gap-1.5 text-xs"
            >
              <Circle className="h-3 w-3 text-muted-foreground" />
              In Progress
            </Badge>
          )}
        </div>
      </div>

      {item.type === "video" && item.url && (
        <CheckpointVideoPlayer
          key={item.id}
          url={item.url}
          title={item.title}
          checkpoints={itemCheckpoints}
          progress={checkpointProgress}
          userId={userId}
          onSubmitAnswer={submitCheckpointAnswer}
          onComplete={onAutoComplete}
        />
      )}

      {item.type === "pdf" && item.url && (
        <SecurePdfViewer
          key={item.id}
          url={item.url}
          title={item.title}
          onComplete={onAutoComplete}
        />
      )}

      {item.type === "image" && item.url && (
        <img
          key={item.id}
          src={item.url}
          alt={item.title}
          className="max-h-[640px] w-full rounded-xl border border-border object-contain bg-secondary/30"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}

      {item.type === "ppt" && (
        <SecurePptViewer
          key={item.id}
          url={item.url}
          title={item.title}
          onComplete={onAutoComplete}
        />
      )}

      {item.type === "assessment" &&
        (linkedAssessment ? (
          <div
            key={item.id}
            className={`rounded-2xl border p-6 sm:p-8 space-y-5 transition-all shadow-sm ${
              hasPassedAssessment
                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                : isAwaitingGrading
                ? "border-primary/30 bg-primary/5"
                : gradedSubs.length > 0
                ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      linkedAssessment.isFinal
                        ? "border-primary text-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {linkedAssessment.isFinal ? "🎓 Final Exam" : "📝 Practice Assessment"}
                  </Badge>
                  <span className="font-bold text-lg text-foreground">
                    {linkedAssessment.title}
                  </span>
                  {hasPassedAssessment ? (
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Passed (Highest: {bestScoreInfo?.pct}%)
                    </Badge>
                  ) : isAwaitingGrading ? (
                    <Badge className="bg-primary/20 text-primary border border-primary/40 text-xs font-semibold">
                      ⏳ Awaiting Teacher Grade
                    </Badge>
                  ) : gradedSubs.length > 0 ? (
                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 text-xs font-semibold">
                      Needs Retake (Score: {bestScoreInfo?.pct}% · Pass: {linkedAssessment.passingScore}%)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                      Not Attempted
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {linkedAssessment.questions.length} questions · {linkedAssessment.timeLimit} mins time limit · Passing Score requirement: {linkedAssessment.passingScore}%
                  {!linkedAssessment.isFinal && " · Unlimited retake attempts available"}
                </p>
              </div>
            </div>

            {/* Results or Guidance Banner */}
            {hasPassedAssessment ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm">
                    🎉 Excellent work! Your teacher has graded and passed this assessment with {bestScoreInfo?.pct}% ({bestScoreInfo?.earned}/{bestScoreInfo?.max} points).
                  </div>
                  <p className="text-muted-foreground dark:text-emerald-300/80">
                    The next lessons and forward modules have been unlocked. You can continue forward, or retake this quiz anytime to practice.
                  </p>
                </div>
              </div>
            ) : isAwaitingGrading ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs text-foreground flex items-start gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-primary">
                    Awaiting Teacher Review & Grading
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Your answers have been submitted to your teacher. Once your instructor reviews and grades your submission, you will receive an email notification and subsequent lessons in this course will unlock.
                  </p>
                </div>
              </div>
            ) : gradedSubs.length > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-3">
                <LockKeyhole className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sm">
                    Graded Score: {bestScoreInfo?.pct}% — Passing score required: {linkedAssessment.passingScore}%.
                  </div>
                  <p className="text-muted-foreground dark:text-amber-300/80">
                    {isSequentialLocked
                      ? "Subsequent lessons remain locked until you achieve a passing grade. Retake the quiz now to proceed to the next module!"
                      : "You can retake this quiz anytime to improve your score and achieve a passing grade."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-secondary/30 p-4 text-xs text-muted-foreground flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-foreground text-sm">
                    Ready to take this assessment?
                  </div>
                  <p>
                    Submit your answers for instructor grading. Once passed (minimum {linkedAssessment.passingScore}%),
                    subsequent lessons and forward modules will unlock.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {hasPassedAssessment && nextItem && (
                <Button
                  onClick={() => onNavigate(nextItem.id)}
                  className="gradient-primary text-primary-foreground border-0 shadow-md font-semibold text-xs h-10 px-5 cursor-pointer"
                >
                  Proceed to Next Lesson: {nextItem.title} →
                </Button>
              )}

              <Button
                asChild
                variant={hasPassedAssessment ? "outline" : "default"}
                className={
                  hasPassedAssessment
                    ? "border-primary/40 text-primary hover:bg-primary/10 text-xs h-10 px-4 cursor-pointer"
                    : "gradient-primary text-primary-foreground border-0 shadow-md font-semibold text-xs h-10 px-5 cursor-pointer"
                }
              >
                <Link
                  to="/student/assessments/$assessmentId"
                  params={{ assessmentId: linkedAssessment.id }}
                >
                  {hasPassedAssessment
                    ? "Retake Quiz (Improve Score)"
                    : isAwaitingGrading
                    ? "View Submission / Retake"
                    : gradedSubs.length > 0
                    ? "Retake Assessment Now →"
                    : `Start ${linkedAssessment.isFinal ? "Final Test" : "Assessment"} →`}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div
            key={item.id}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-600 dark:text-amber-400 text-xs"
          >
            <div className="font-semibold mb-1">Assessment Not Linked</div>
            <p>
              Your instructor has placed this assessment item in the course. You can also start it
              directly from the <strong>Course Final Test</strong> tab.
            </p>
          </div>
        ))}

      {item.type === "reading" && (
        <div
          key={item.id}
          className="rounded-2xl border border-border/70 bg-secondary/10 p-3 sm:p-6 shadow-inner"
        >
          <div
            ref={readingRef}
            className="prose-document max-w-none rounded-xl bg-card border border-border/80 p-6 sm:p-10 shadow-md text-foreground text-sm leading-relaxed mx-auto max-h-[750px] overflow-y-auto custom-scrollbar"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                item.body || "<p class='text-muted-foreground'>No content added yet.</p>",
              ),
            }}
          />
          <style>{`
            .prose-document h1 { font-size: 2rem !important; font-weight: 700 !important; margin: 0.8em 0 0.4em !important; line-height: 1.25 !important; }
            .prose-document h2 { font-size: 1.5rem !important; font-weight: 600 !important; margin: 0.7em 0 0.35em !important; line-height: 1.3 !important; }
            .prose-document h3 { font-size: 1.25rem !important; font-weight: 600 !important; margin: 0.6em 0 0.3em !important; }
            .prose-document p { margin: 0.6em 0 !important; line-height: 1.6 !important; }
            .prose-document strong, .prose-document b { font-weight: 700 !important; }
            .prose-document em, .prose-document i { font-style: italic !important; }
            .prose-document u { text-decoration: underline !important; }
            .prose-document s, .prose-document strike { text-decoration: line-through !important; }
            .prose-document ul { list-style-type: disc !important; padding-left: 1.5em !important; margin: 0.6em 0 !important; }
            .prose-document ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin: 0.6em 0 !important; }
            .prose-document li { margin: 0.25em 0 !important; }
            .prose-document code { background: rgba(99,102,241,0.15) !important; color: #818cf8 !important; padding: 2px 6px !important; border-radius: 4px !important; font-family: monospace !important; font-size: 0.9em !important; }
            .prose-document hr { border: none !important; border-top: 1px solid hsl(var(--border)) !important; margin: 1.2em 0 !important; }
            .prose-document img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 12px 0 !important; display: block !important; }
          `}</style>
        </div>
      )}

      {item.type === "lab" && (
        <div key={item.id} className="space-y-6">
          {item.url &&
          (item.url.endsWith(".pdf") ||
            item.url.includes("pdf") ||
            item.url.includes("data:application/pdf") ||
            item.url.includes("/api/files")) ? (
            <SecurePdfViewer
              key={item.id}
              url={item.url}
              title={item.title}
              onComplete={onAutoComplete}
            />
          ) : item.url &&
            (item.url.endsWith(".ppt") ||
              item.url.endsWith(".pptx") ||
              item.url.includes("ppt") ||
              item.url.includes("presentation")) ? (
            <SecurePptViewer
              key={item.id}
              url={item.url}
              title={item.title}
              onComplete={onAutoComplete}
            />
          ) : item.url ? (
            <iframe
              key={item.id}
              src={item.url}
              className="w-full h-[750px] rounded-xl border border-border"
              title={item.title}
              onLoad={handleIframeLoad}
            />
          ) : null}

          {item.body && (
            <div className="rounded-2xl border border-border/70 bg-secondary/10 p-3 sm:p-6 shadow-inner">
              <div
                ref={labRef}
                className="prose-document max-w-none rounded-xl bg-card border border-border/80 p-6 sm:p-10 shadow-md text-foreground text-sm leading-relaxed mx-auto max-h-[500px] overflow-y-auto custom-scrollbar"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }}
              />
            </div>
          )}
        </div>
      )}

      {(item.type === "link" || item.type === "download") &&
        item.url &&
        (item.type === "download" ? (
          <div
            onClick={() => onAutoComplete()}
            className="text-xs text-muted-foreground bg-secondary/30 border border-border/40 p-3.5 rounded-xl text-center cursor-pointer hover:bg-secondary/40 transition"
          >
            🔒 Protected File Resource. Click to register access.
          </div>
        ) : (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onAutoComplete()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm hover:border-primary/40 transition cursor-pointer"
          >
            <Play className="h-4 w-4 text-primary" /> Open {M.label.toLowerCase()}
          </a>
        ))}

      {!item.url && item.type !== "reading" && item.type !== "assessment" && (
        <div className="text-sm text-muted-foreground">No content URL provided.</div>
      )}
    </div>
  );
}
