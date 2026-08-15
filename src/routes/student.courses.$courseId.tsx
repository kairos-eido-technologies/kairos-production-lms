import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Video, FileText, BookOpen, FlaskConical, Link2, Download, CheckCircle2, Circle, Play, Image as ImageIcon, Presentation, ClipboardList, LockKeyhole, CalendarDays, Megaphone, Pin, Search, Send, CornerDownRight, MessageSquare as MsgIcon, ChevronLeft, ChevronRight, Minimize2, Maximize2, Eye } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, isCourseExpired, studentAccessFor, type StoreAssessment, type VideoCheckpoint, type CheckpointProgress } from "@/lib/data-store";
import type { ContentItem, ContentType } from "@/lib/mock-data";
import { toast } from "sonner";
import { ClipboardCheck, ChevronDown, Layers } from "lucide-react";
import { SecurePdfViewer } from "@/components/SecurePdfViewer";
import { SecurePptViewer } from "@/components/SecurePptViewer";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/student/courses/$courseId")({ component: CourseLearning });

const typeMeta: Record<ContentType, { icon: any; label: string }> = {
  video: { icon: Video, label: "Video" },
  pdf: { icon: FileText, label: "PDF" },
  reading: { icon: BookOpen, label: "Reading" },
  lab: { icon: FlaskConical, label: "Lab" },
  link: { icon: Link2, label: "Link" },
  download: { icon: Download, label: "Download" },
  image: { icon: ImageIcon, label: "Image" },
  ppt: { icon: Presentation, label: "PowerPoint Presentation (.ppt, .pptx)" },
  assessment: { icon: ClipboardList, label: "Assignment / Quiz" },
};

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    return null;
  } catch { return null; }
}

function CourseLearning() {
  const { courseId } = useParams({ from: "/student/courses/$courseId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courses, progress, markItemComplete, unmarkItemComplete, assessments, submissions } = useData();
  const course = courses.find((c) => c.id === courseId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "announcements" | "discussion" | "final">("content");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;
  if (!course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">Course not found.</GlassCard>
      </div>
    );
  }
  const isInstructorOrAdmin = user.role === "admin" || user.role === "teacher" || course.teacherId === user.id;
  if (!course.studentIds.includes(user.id) && !isInstructorOrAdmin) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">You're not enrolled in this course.</GlassCard>
      </div>
    );
  }
  if (!isInstructorOrAdmin && isCourseExpired(course, user.id)) {
    const access = studentAccessFor(course, user.id);
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="mx-auto max-w-xl text-center py-14">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15 text-destructive">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold">Course access expired</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your access ended on {access.endDate || "the scheduled end date"}.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Contact your instructor to extend access.
          </div>
        </GlassCard>
      </div>
    );
  }

  const done = useMemo(() => new Set(progress[`${user.id}:${course.id}`] ?? []), [progress, user.id, course.id]);
  const allItems = useMemo(() => course.sections.flatMap((s) => s.items), [course.sections]);
  const active: ContentItem | null = useMemo(
    () => (activeId ? allItems.find((i) => i.id === activeId) ?? null : allItems[0] ?? null),
    [activeId, allItems]
  );
  const pct = useMemo(() => courseProgressPct(progress, user.id, course), [progress, user.id, course]);

  const toggle = (id: string) => {
    if (done.has(id)) { unmarkItemComplete(user.id, course.id, id); }
    else { markItemComplete(user.id, course.id, id); toast.success("Marked complete"); }
  };

  const autoComplete = (id: string) => {
    if (!done.has(id)) {
      markItemComplete(user.id, course.id, id);
      toast.success("🎉 Lesson completed! Progress updated.", { duration: 3000 });
    }
  };

  const currentIndex = useMemo(() => (active ? allItems.findIndex((i) => i.id === active.id) : -1), [active, allItems]);
  const prevItem = useMemo(() => (currentIndex > 0 ? allItems[currentIndex - 1] : null), [currentIndex, allItems]);
  const nextItem = useMemo(
    () => (currentIndex >= 0 && currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null),
    [currentIndex, allItems]
  );

  const fromSource = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") : null;
  const baseContentPath = user.role === "admin" ? "/admin/content" : "/teacher/content";
  const contentBuilderPath = fromSource === "list" ? baseContentPath : `${baseContentPath}?courseId=${course.id}`;

  return (
    <div className="space-y-6">
      {isInstructorOrAdmin && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-sm font-medium text-amber-400">
            <Eye className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Student Preview Mode — Viewing course exactly as seen by enrolled students</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: contentBuilderPath as any })}
            className="h-8 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs cursor-pointer gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Content Builder
          </Button>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (isInstructorOrAdmin) {
            navigate({ to: contentBuilderPath as any });
          } else {
            navigate({ to: "/student/courses" as any });
          }
        }}
        className="cursor-pointer"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {isInstructorOrAdmin ? "Back to Content Builder" : "All courses"}
      </Button>
      <PageHeader
        title={course.name}
        subtitle={`${course.code} · ${allItems.length} items · ${pct}% complete`}
      />
      <Progress value={pct} className="h-1.5" />

      {/* Tabs and Top Header Module Selector Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border pb-2 gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button variant={activeTab === "content" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("content")} className="h-9 text-xs shrink-0 cursor-pointer">
            Modules & Content
          </Button>
          <Button variant={activeTab === "announcements" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("announcements")} className="h-9 text-xs shrink-0 cursor-pointer">
            Announcements
          </Button>
          <Button variant={activeTab === "discussion" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("discussion")} className="h-9 text-xs shrink-0 cursor-pointer">
            Q&A Discussions
          </Button>
          {assessments.some((a) => a.courseId === course.id) && (
            <Button variant={activeTab === "final" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("final")} className="h-9 text-xs shrink-0 cursor-pointer relative">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1 text-primary" />
              Final Test / Quiz
              {pct >= 100 && (
                <span className="ml-1.5 flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Button>
          )}
        </div>

        {activeTab === "content" && allItems.length > 0 && active && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-medium cursor-pointer shadow-xs max-w-full sm:max-w-md truncate shrink-0"
              >
                <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {course.sections.find((s) => s.items.some((i) => i.id === active.id))?.title || "Modules"} :{" "}
                  <strong className="font-semibold text-foreground">{active.title}</strong>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] max-h-[480px] overflow-y-auto p-1.5 shadow-xl rounded-xl border-border">
              <DropdownMenuLabel className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center justify-between">
                <span>Course Modules & Lessons</span>
                <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md text-foreground font-semibold font-mono">{done.size} / {allItems.length} Completed</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {course.sections.map((sec) => (
                <DropdownMenuGroup key={sec.id} className="py-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-primary uppercase tracking-wider bg-secondary/40 rounded-md my-0.5">
                    {sec.title}
                  </div>
                  {sec.items.map((it) => {
                    const M = typeMeta[it.type] || { icon: FileText, label: it.type || "Content" };
                    const Icon = M.icon || FileText;
                    const isDone = done.has(it.id);
                    const isActive = active.id === it.id;
                    return (
                      <DropdownMenuItem
                        key={it.id}
                        onClick={() => setActiveId(it.id)}
                        className={`flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg cursor-pointer my-0.5 ${isActive
                            ? "bg-primary/15 font-semibold text-primary"
                            : "hover:bg-secondary/50 text-foreground"
                          }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{it.title}</span>
                        {isActive && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/20 text-primary border-0 font-medium">
                            Active
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="w-full">
        <GlassCard className="min-h-[400px] w-full overflow-hidden">
          {activeTab === "content" && (
            allItems.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="mx-auto h-10 w-10 opacity-40 mb-3" />
                No content yet — your teacher is still building this course.
              </div>
            ) : active ? (
              <div className="space-y-4">
                <ContentViewer
                  item={active}
                  assessments={assessments.filter((a) => a.courseId === course.id)}
                  onToggleComplete={() => toggle(active.id)}
                  onAutoComplete={() => autoComplete(active.id)}
                  completed={done.has(active.id)}
                  userId={user.id}
                  prevItem={prevItem}
                  nextItem={nextItem}
                  onNavigate={setActiveId}
                />
                
                {/* Course Completed Congratulatory Banner */}
                {pct >= 100 && (
                  <div className="mx-4 mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold text-sm">Congratulations! All course lessons completed.</div>
                        <div className="text-xs text-muted-foreground">Your Final Test is unlocked and ready to take.</div>
                      </div>
                    </div>
                    {assessments.some((a) => a.courseId === course.id) && (
                      <Button size="sm" onClick={() => setActiveTab("final")} className="bg-emerald-600 text-white hover:bg-emerald-700 border-0 text-xs font-semibold">
                        Take Final Test <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : null
          )}

          {activeTab === "announcements" && (
            <StudentCourseAnnouncements courseId={course.id} />
          )}

          {activeTab === "discussion" && (
            <StudentCourseDiscussion courseId={course.id} />
          )}

          {activeTab === "final" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Course Final Test & Assessments
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Complete all lessons to unlock the Final Test.</p>
              </div>

              {(() => {
                const courseAssessments = assessments.filter((a) => a.courseId === course.id);
                const lessonItems = allItems.filter((i) => i.type !== "assessment");
                const courseComplete = pct >= 100 || (lessonItems.length > 0 ? lessonItems.every((i) => done.has(i.id)) : done.size >= allItems.length);

                if (courseAssessments.length === 0) {
                  return <div className="text-sm text-muted-foreground py-8 text-center">No assessments created for this course.</div>;
                }

                return (
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
                        const mySubsForAssess = submissions.filter((s) => s.studentId === user.id && s.assessmentId === a.id);
                        const attemptsExhausted = mySubsForAssess.length >= a.attempts;
                        return (
                          <div key={a.id} className={`rounded-xl border p-5 transition ${canTake ? "border-primary/40 bg-card hover:border-primary" : "border-border/60 bg-secondary/20 opacity-70"}`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <Badge variant="outline" className={`text-[10px] mb-1 ${a.isFinal ? "border-primary text-primary" : "border-muted-foreground"}`}>
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
                              {a.questions.length} questions · {a.timeLimit} min time limit · Pass {a.passingScore}%
                            </div>
                            {attemptsExhausted ? (
                              <Button asChild variant="outline" className="w-full text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                                <Link to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}>
                                  Attempts Completed (View Details)
                                </Link>
                              </Button>
                            ) : canTake ? (
                              <Button asChild className="w-full gradient-primary text-primary-foreground border-0 text-xs font-semibold">
                                <Link to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}>
                                  Start {a.isFinal ? "Final Test" : "Assessment"}
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
                );
              })()}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function CheckpointVideoPlayer({
  url,
  title,
  checkpoints,
  progress,
  userId,
  onSubmitAnswer,
  onComplete,
}: {
  url: string;
  title: string;
  checkpoints: VideoCheckpoint[];
  progress: CheckpointProgress[];
  userId: string;
  onSubmitAnswer: (studentId: string, checkpointId: string, isCorrect: boolean) => Promise<void>;
  onComplete?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeCheckpoint, setActiveCheckpoint] = useState<VideoCheckpoint | null>(null);
  const [selectedMCQ, setSelectedMCQ] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [correctFeedback, setCorrectFeedback] = useState<boolean | null>(null);
  const [answeredCheckpoints, setAnsweredCheckpoints] = useState<Set<string>>(new Set());

  // YouTube player states
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const ytPlayerRef = useRef<any>(null);

  // Refs to prevent closure staleness in event listeners / intervals
  const checkpointsRef = useRef(checkpoints);
  const answeredCheckpointsRef = useRef(answeredCheckpoints);
  const lastTimeRef = useRef(0);
  const activeCheckpointRef = useRef(activeCheckpoint);

  useEffect(() => {
    checkpointsRef.current = checkpoints;
  }, [checkpoints]);

  useEffect(() => {
    answeredCheckpointsRef.current = answeredCheckpoints;
  }, [answeredCheckpoints]);

  useEffect(() => {
    activeCheckpointRef.current = activeCheckpoint;
  }, [activeCheckpoint]);

  useEffect(() => {
    const solved = new Set(
      progress
        .filter((p) => p.studentId === userId && p.isCorrect)
        .map((p) => p.checkpointId)
    );
    setAnsweredCheckpoints(solved);
  }, [progress, userId]);

  useEffect(() => {
    // Reset inputs when URL changes
    setActiveCheckpoint(null);
    setSelectedMCQ(null);
    setUserAnswer("");
    setCorrectFeedback(null);
    lastTimeRef.current = 0;
  }, [url]);

  const embed = toYouTubeEmbed(url);

  // YouTube API script loader
  useEffect(() => {
    if (embed) {
      if (typeof window !== "undefined" && !(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }
  }, [embed]);

  // YouTube Player Initializer
  useEffect(() => {
    if (!embed) return;

    let playerInstance: any = null;
    let checkInterval: any = null;

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        checkInterval = setTimeout(initPlayer, 100);
        return;
      }

      let videoId = "";
      try {
        const u = new URL(url);
        if (u.hostname.includes("youtube.com")) {
          videoId = u.searchParams.get("v") || "";
        } else if (u.hostname === "youtu.be") {
          videoId = u.pathname.slice(1);
        } else if (u.pathname.includes("/embed/")) {
          videoId = u.pathname.split("/embed/")[1];
        }
      } catch {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#\&\?]+)/);
        videoId = match ? match[1] : "";
      }

      if (!videoId) return;

      playerInstance = new (window as any).YT.Player("yt-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
      });

      ytPlayerRef.current = playerInstance;
      setYtPlayer(playerInstance);
    };

    initPlayer();

    return () => {
      if (checkInterval) clearTimeout(checkInterval);
      if (playerInstance && playerInstance.destroy) {
        playerInstance.destroy();
      }
    };
  }, [embed, url]);

  // YouTube Periodic Check Interval
  useEffect(() => {
    if (!embed || !ytPlayer) return;

    const interval = setInterval(() => {
      if (typeof ytPlayer.getCurrentTime !== "function") return;

      const currentTimeVal = ytPlayer.getCurrentTime();

      // Check if we crossed any checkpoint since last time update
      const crossedCheckpoint = checkpointsRef.current.find(
        (cp) => !answeredCheckpointsRef.current.has(cp.id) &&
          lastTimeRef.current < cp.timestamp &&
          currentTimeVal >= cp.timestamp
      );

      if (crossedCheckpoint) {
        // Pause and show checkpoint
        if (currentTimeVal > lastTimeRef.current + 2.5) {
          // Skip detected - snap back to checkpoint time
          ytPlayer.seekTo(crossedCheckpoint.timestamp, true);
          toast.warning("You must answer the checkpoint question before proceeding.");
        }
        ytPlayer.pauseVideo();
        if (!activeCheckpointRef.current || activeCheckpointRef.current.id !== crossedCheckpoint.id) {
          setActiveCheckpoint(crossedCheckpoint);
          setSelectedMCQ(null);
          setUserAnswer("");
          setCorrectFeedback(null);
        }
      } else {
        lastTimeRef.current = currentTimeVal;

        // Auto-complete check for YouTube: >= 90% watched + all checkpoints answered
        const totalDur = typeof ytPlayer.getDuration === "function" ? ytPlayer.getDuration() : 0;
        const allCheckpointsSolved = checkpointsRef.current.every((cp) => answeredCheckpointsRef.current.has(cp.id));
        if (totalDur > 0 && currentTimeVal / totalDur >= 0.90 && allCheckpointsSolved) {
          onComplete?.();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [embed, ytPlayer, onComplete]);

  // Native Video Time Update handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentTimeVal = videoRef.current.currentTime;

    // Check if we crossed any checkpoint since last time update
    const crossedCheckpoint = checkpointsRef.current.find(
      (cp) => !answeredCheckpointsRef.current.has(cp.id) &&
        lastTimeRef.current < cp.timestamp &&
        currentTimeVal >= cp.timestamp
    );

    if (crossedCheckpoint) {
      // Pause and show checkpoint
      if (currentTimeVal > lastTimeRef.current + 2.5) {
        // Skip detected - snap back to checkpoint time
        videoRef.current.currentTime = crossedCheckpoint.timestamp;
        toast.warning("You must answer the checkpoint question before proceeding.");
      }
      videoRef.current.pause();
      if (!activeCheckpointRef.current || activeCheckpointRef.current.id !== crossedCheckpoint.id) {
        setActiveCheckpoint(crossedCheckpoint);
        setSelectedMCQ(null);
        setUserAnswer("");
        setCorrectFeedback(null);
      }
    } else {
      lastTimeRef.current = currentTimeVal;

      // Auto-complete check for Native Video: >= 90% watched + all checkpoints answered
      const totalDur = videoRef.current.duration || 0;
      const allCheckpointsSolved = checkpointsRef.current.every((cp) => answeredCheckpointsRef.current.has(cp.id));
      if (totalDur > 0 && currentTimeVal / totalDur >= 0.90 && allCheckpointsSolved) {
        onComplete?.();
      }
    }
  };

  const handleVideoEnded = () => {
    const allCheckpointsSolved = checkpointsRef.current.every((cp) => answeredCheckpointsRef.current.has(cp.id));
    if (allCheckpointsSolved) {
      onComplete?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckpoint) return;

    let isCorrect = false;
    if (activeCheckpoint.type === "mcq" || activeCheckpoint.type === "truefalse") {
      isCorrect = selectedMCQ === activeCheckpoint.correctIndex;
    } else {
      const correctAns = (activeCheckpoint.correctText || "").trim().toLowerCase();
      const studentAns = userAnswer.trim().toLowerCase();
      isCorrect = studentAns === correctAns;
    }

    setCorrectFeedback(isCorrect);
    await onSubmitAnswer(userId, activeCheckpoint.id, isCorrect);

    if (isCorrect) {
      toast.success("Correct answer!");
      setAnsweredCheckpoints((prev) => new Set([...prev, activeCheckpoint.id]));
      setTimeout(() => {
        setActiveCheckpoint(null);
        setSelectedMCQ(null);
        setUserAnswer("");
        setCorrectFeedback(null);
        if (embed && ytPlayer && typeof ytPlayer.playVideo === "function") {
          ytPlayer.playVideo();
        } else if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      }, 1000);
    } else {
      toast.error("Incorrect. Review the lesson material and try again.");
    }
  };

  const handleContinue = () => {
    setActiveCheckpoint(null);
    setSelectedMCQ(null);
    setUserAnswer("");
    setCorrectFeedback(null);
    if (embed && ytPlayer && typeof ytPlayer.playVideo === "function") {
      ytPlayer.playVideo();
    } else if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  const handleRewind = () => {
    setActiveCheckpoint(null);
    setSelectedMCQ(null);
    setUserAnswer("");
    setCorrectFeedback(null);
    const targetTime = Math.max(0, lastTimeRef.current - 10);
    if (embed && ytPlayer && typeof ytPlayer.seekTo === "function") {
      ytPlayer.seekTo(targetTime, true);
      ytPlayer.playVideo();
    } else if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      videoRef.current.play().catch(console.error);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div key={url} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-border">
      {/* 
        Wrap the players in a div that toggles pointer-events-none when a checkpoint is active.
        This prevents iframe or native video elements from stealing mouse events.
      */}
      <div className={`w-full h-full ${activeCheckpoint ? "pointer-events-none" : ""}`}>
        {embed ? (
          <div className="w-full h-full" id="yt-player" />
        ) : (
          <video
            ref={videoRef}
            src={url}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {activeCheckpoint && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 backdrop-blur-sm z-[100] pointer-events-auto">
          <GlassCard className="max-w-md w-full p-5 flex flex-col gap-4 border-primary/30 pointer-events-auto">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Checkpoint Question</span>
              </div>
              <Badge className="gradient-primary border-0 text-[10px]">
                {formatTime(activeCheckpoint.timestamp)}
              </Badge>
            </div>

            <p className="text-xs font-medium text-foreground leading-relaxed">
              {activeCheckpoint.prompt}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeCheckpoint.type === "mcq" && activeCheckpoint.options && (
                <div className="space-y-2">
                  {activeCheckpoint.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMCQ(idx)}
                      disabled={correctFeedback === true}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-center gap-2.5 cursor-pointer pointer-events-auto ${selectedMCQ === idx
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                        } ${correctFeedback === true && idx === activeCheckpoint.correctIndex ? "border-success bg-success/15 text-success-foreground" : ""}`}
                    >
                      <span className={`h-4 w-4 rounded-full border grid place-items-center text-[9px] font-bold ${selectedMCQ === idx ? "border-primary text-primary" : "border-muted-foreground/30"
                        }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 truncate">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeCheckpoint.type === "truefalse" && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMCQ(0)}
                    disabled={correctFeedback === true}
                    className={`p-3 rounded-lg border text-xs font-semibold transition cursor-pointer pointer-events-auto ${selectedMCQ === 0
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                      }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMCQ(1)}
                    disabled={correctFeedback === true}
                    className={`p-3 rounded-lg border text-xs font-semibold transition cursor-pointer pointer-events-auto ${selectedMCQ === 1
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                      }`}
                  >
                    False
                  </button>
                </div>
              )}

              {activeCheckpoint.type === "short" && (
                <div className="space-y-1">
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    disabled={correctFeedback === true}
                    required
                    className="text-xs h-9 bg-secondary/30 pointer-events-auto"
                  />
                </div>
              )}

              {correctFeedback === null && (
                <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0 glow h-9 text-xs cursor-pointer pointer-events-auto">
                  Submit Answer
                </Button>
              )}

              {correctFeedback === true && (
                <Button type="button" onClick={handleContinue} className="w-full bg-success hover:bg-success/90 text-success-foreground border-0 h-9 text-xs cursor-pointer pointer-events-auto">
                  Continue Watching
                </Button>
              )}

              {correctFeedback === false && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleRewind} className="flex-1 h-9 text-xs cursor-pointer pointer-events-auto">
                    Rewind 10s & Review
                  </Button>
                  <Button type="submit" className="flex-1 gradient-primary text-primary-foreground border-0 h-9 text-xs animate-bounce-subtle cursor-pointer pointer-events-auto">
                    Try Again
                  </Button>
                </div>
              )}
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function ContentViewer({
  item,
  assessments,
  completed,
  onToggleComplete,
  onAutoComplete,
  userId,
  prevItem,
  nextItem,
  onNavigate,
}: {
  item: ContentItem;
  assessments: StoreAssessment[];
  completed: boolean;
  onToggleComplete: () => void;
  onAutoComplete: () => void;
  userId: string;
  prevItem: ContentItem | null;
  nextItem: ContentItem | null;
  onNavigate: (id: string) => void;
}) {
  const { videoCheckpoints, checkpointProgress, submitCheckpointAnswer } = useData();
  const M = typeMeta[item.type] || { icon: FileText, label: item.type || "Content" };
  const linkedAssessment = item.assessmentId ? assessments.find((a) => a.id === item.assessmentId) : null;

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

  const [absoluteUrl, setAbsoluteUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && item.url) {
      const abs = item.url.startsWith("/")
        ? window.location.origin + item.url
        : item.url;
      setAbsoluteUrl(abs);
    } else {
      setAbsoluteUrl("");
    }
  }, [item.url]);

  const [pdfOverlayActive, setPdfOverlayActive] = useState(true);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePdfWheel = () => {
    setPdfOverlayActive(false);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      setPdfOverlayActive(true);
    }, 500);
  };

  useEffect(() => {
    // Reset overlay state when item changes
    setPdfOverlayActive(true);
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [item.id]);

  const itemCheckpoints = useMemo(() => {
    return videoCheckpoints.filter((cp) => cp.contentItemId === item.id);
  }, [videoCheckpoints, item.id]);

  // Add protection event handlers for copy/paste/print/save/DevTools keys
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && ["p", "s", "u", "a"].includes(key)) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "k"].includes(key))
      ) {
        e.preventDefault();
        toast.error("Content is copy-protected and cannot be inspected, downloaded, printed, or saved.");
      }
    };
    window.addEventListener("keydown", blockKeys);
    return () => window.removeEventListener("keydown", blockKeys);
  }, []);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    // Auto-complete lab after iframe load dwell
    setTimeout(() => {
      onAutoComplete();
    }, 5000);

    try {
      const iframe = e.currentTarget;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        // Block context menus inside the iframe document
        iframeDoc.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
        });
        // Block key combos inside the iframe document
        iframeDoc.addEventListener("keydown", (evt: KeyboardEvent) => {
          if (
            (evt.ctrlKey && ["p", "s", "c", "a"].includes(evt.key.toLowerCase())) ||
            evt.key === "F12" ||
            (evt.ctrlKey && evt.shiftKey && evt.key === "I")
          ) {
            evt.preventDefault();
          }
        });
      }
    } catch (err) {
      // Ignore cross-origin blocking warnings for office apps live
    }
  };

  return (
    <div className="space-y-4 select-none" onContextMenu={(e) => { e.preventDefault(); toast.error("Right-click menu is disabled for content security."); }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-border mb-2">{M.label}</Badge>
          <h2 className="text-xl font-semibold tracking-tight">{item.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {prevItem && (
            <Button variant="outline" size="sm" onClick={() => onNavigate(prevItem.id)} className="border-border h-9 text-xs cursor-pointer">
              <ChevronLeft className="h-4 w-4 mr-1 text-muted-foreground" /> Prev
            </Button>
          )}
          {nextItem && (
            <Button variant="outline" size="sm" onClick={() => onNavigate(nextItem.id)} className="border-border h-9 text-xs cursor-pointer">
              Next <ChevronRight className="h-4 w-4 ml-1 text-muted-foreground" />
            </Button>
          )}

          {/* Dynamic Completion Indicator */}
          {completed ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold px-3 py-1.5 h-9 flex items-center gap-1.5 text-xs shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border/80 text-muted-foreground px-3 py-1.5 h-9 flex items-center gap-1.5 text-xs">
              <Circle className="h-3 w-3 text-muted-foreground" />
              In Progress
            </Badge>
          )}

          {/* Optional manual toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleComplete}
            className="text-[11px] text-muted-foreground hover:text-foreground h-9 px-2 cursor-pointer"
            title={completed ? "Mark as Incomplete" : "Mark as Complete"}
          >
            {completed ? "Reset" : "Mark done"}
          </Button>
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
        <SecurePdfViewer key={item.id} url={item.url} title={item.title} onComplete={onAutoComplete} />
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
        <SecurePptViewer key={item.id} url={item.url} title={item.title} onComplete={onAutoComplete} />
      )}


      {item.type === "assessment" && (
        linkedAssessment ? (
          <div key={item.id} className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{linkedAssessment.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{linkedAssessment.questions.length} questions · {linkedAssessment.timeLimit} min · Pass {linkedAssessment.passingScore}%</div>
              </div>
              <Button asChild className="gradient-primary text-primary-foreground border-0">
                <Link to="/student/assessments/$assessmentId" params={{ assessmentId: linkedAssessment.id }}>Start assignment/quiz</Link>
              </Button>
            </div>
          </div>
        ) : <div key={item.id} className="text-sm text-muted-foreground">Assignment or quiz not linked.</div>
      )}

      {item.type === "reading" && (
        <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/10 p-3 sm:p-6 shadow-inner">
          <div
            ref={readingRef}
            className="prose-document max-w-none rounded-xl bg-card border border-border/80 p-6 sm:p-10 shadow-md text-foreground text-sm leading-relaxed mx-auto max-h-[750px] overflow-y-auto custom-scrollbar"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body || "<p class='text-muted-foreground'>No content added yet.</p>") }}
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
          {item.url && (item.url.endsWith(".pdf") || item.url.includes("pdf") || item.url.includes("data:application/pdf")) ? (
            <SecurePdfViewer key={item.id} url={item.url} title={item.title} onComplete={onAutoComplete} />
          ) : item.url && (item.url.endsWith(".ppt") || item.url.endsWith(".pptx") || item.url.includes("ppt") || item.url.includes("presentation")) ? (
            <SecurePptViewer key={item.id} url={item.url} title={item.title} onComplete={onAutoComplete} />
          ) : item.url ? (
            <iframe key={item.id} src={item.url} className="w-full h-[750px] rounded-xl border border-border" title={item.title} onLoad={handleIframeLoad} />
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

      {(item.type === "link" || item.type === "download") && item.url && (
        item.type === "download" ? (
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
            <Play className="h-4 w-4 text-primary" />Open {M.label.toLowerCase()}
          </a>
        )
      )}

      {!item.url && item.type !== "reading" && (
        <div className="text-sm text-muted-foreground">No content URL provided.</div>
      )}
    </div>
  );
}

function StudentCourseAnnouncements({ courseId }: { courseId: string }) {
  const { announcements } = useData();
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const courseAnns = useMemo(() => {
    return announcements
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, courseId]);

  const totalPages = Math.ceil(courseAnns.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedAnns = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return courseAnns.slice(start, start + ITEMS_PER_PAGE);
  }, [courseAnns, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Course Announcements</h3>
      </div>

      {courseAnns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No announcements have been posted for this course yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {paginatedAnns.map((ann) => (
              <div
                key={ann.id}
                className={`p-5 rounded-2xl border transition ${ann.isPinned ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/10"
                  }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    {ann.isPinned && <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 flex items-center gap-1 text-[10px]"><Pin className="h-3 w-3 shrink-0" /> Pinned</Badge>}
                    <h4 className="text-sm font-bold text-foreground leading-snug">{ann.title}</h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{ann.body}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, courseAnns.length)} of {courseAnns.length} announcements</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">Previous</Button>
                <span className="font-semibold text-foreground">Page {currentPage} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-7 text-xs">Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentCourseDiscussion({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { discussions, discussionReplies, users, addDiscussion, addDiscussionReply } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // New thread form
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // New reply form
  const [replyBody, setReplyBody] = useState("");

  const courseDiscussions = useMemo(() => {
    return discussions
      .filter((d) => d.courseId === courseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [discussions, courseId]);

  const filteredDiscussions = useMemo(() => {
    if (!searchQuery.trim()) return courseDiscussions;
    const q = searchQuery.toLowerCase();
    return courseDiscussions.filter(
      (d) => d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q)
    );
  }, [courseDiscussions, searchQuery]);

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unknown User";
  const getUserRole = (id: string) => users.find((u) => u.id === id)?.role ?? "";

  const handlePostThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error("Title and message body are required.");
      return;
    }
    await addDiscussion(courseId, user.id, newTitle.trim(), newBody.trim());
    toast.success("Discussion thread posted!");
    setNewTitle("");
    setNewBody("");
    setIsComposing(false);
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeThreadId) return;
    if (!replyBody.trim()) {
      toast.error("Reply message cannot be empty.");
      return;
    }
    await addDiscussionReply(activeThreadId, user.id, replyBody.trim());
    toast.success("Reply posted!");
    setReplyBody("");
  };

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return discussions.find((d) => d.id === activeThreadId);
  }, [discussions, activeThreadId]);

  const activeReplies = useMemo(() => {
    if (!activeThreadId) return [];
    return discussionReplies
      .filter((r) => r.discussionId === activeThreadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [discussionReplies, activeThreadId]);

  if (activeThread) {
    return (
      <div className="space-y-6">
        <Button size="sm" variant="ghost" onClick={() => setActiveThreadId(null)} className="h-8 text-xs text-muted-foreground px-2">
          ← Back to discussions
        </Button>

        {/* Original Thread Post */}
        <div className="p-5 rounded-2xl border border-border/60 bg-secondary/10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground leading-snug">{activeThread.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold text-primary">{getUserName(activeThread.userId)}</span>
                <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1 py-0">{getUserRole(activeThread.userId)}</Badge>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{new Date(activeThread.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border/40 pt-3">{activeThread.body}</p>
        </div>

        {/* Replies List */}
        <div className="space-y-3 pl-4 border-l-2 border-border/40">
          <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Replies ({activeReplies.length})</h5>

          {activeReplies.map((rep) => (
            <div key={rep.id} className="p-4 rounded-xl border border-border/40 bg-secondary/5 flex gap-3">
              <CornerDownRight className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{getUserName(rep.userId)}</span>
                    <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1 py-0">{getUserRole(rep.userId)}</Badge>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{new Date(rep.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{rep.body}</p>
              </div>
            </div>
          ))}

          {activeReplies.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2 pl-6">No replies yet. Be the first to answer!</p>
          )}
        </div>

        {/* Post Reply Form */}
        <form onSubmit={handlePostReply} className="space-y-2 pt-2">
          <Label className="text-xs font-bold">Write a Reply</Label>
          <Textarea
            rows={3}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Type your response or answer here..."
            className="text-xs"
          />
          <Button type="submit" size="sm" className="gradient-primary text-primary-foreground border-0">
            <Send className="h-3.5 w-3.5 mr-1.5" /> Reply
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Discussion tools */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MsgIcon className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">Course Discussions</h3>
        </div>
        {!isComposing && (
          <Button onClick={() => setIsComposing(true)} size="sm" className="gradient-primary text-primary-foreground border-0 font-medium">
            Ask a Question
          </Button>
        )}
      </div>

      {isComposing ? (
        <form onSubmit={handlePostThread} className="space-y-4 p-5 rounded-2xl border border-border/80 bg-secondary/15">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Ask a new question</h4>
          <div className="space-y-2">
            <Label htmlFor="qtitle" className="text-xs">Question Title</Label>
            <Input id="qtitle" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Summary of your question..." className="text-xs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qbody" className="text-xs">Details</Label>
            <Textarea id="qbody" rows={4} value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Provide full context..." className="text-xs" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsComposing(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="gradient-primary text-primary-foreground border-0">Post Question</Button>
          </div>
        </form>
      ) : (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions..."
              className="pl-9 h-9 text-xs bg-secondary/30"
            />
          </div>

          {filteredDiscussions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery ? "No discussions matching search query." : "No discussions posted yet."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDiscussions.map((disc) => {
                const count = discussionReplies.filter((r) => r.discussionId === disc.id).length;
                return (
                  <button
                    key={disc.id}
                    onClick={() => setActiveThreadId(disc.id)}
                    className="w-full text-left bg-transparent border-0 p-0 cursor-pointer block"
                  >
                    <GlassCard className="hover:border-primary/40 transition flex items-center justify-between p-4 gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{disc.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-primary font-medium">{getUserName(disc.userId)}</span>
                          <span className="text-[9px] text-muted-foreground">• {new Date(disc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-border px-2 py-0.5 text-[10px] shrink-0 font-medium">
                        {count} repl{count === 1 ? "y" : "ies"}
                      </Badge>
                    </GlassCard>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
