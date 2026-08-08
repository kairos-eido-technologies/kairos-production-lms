import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Video, FileText, BookOpen, FlaskConical, Link2, Download, CheckCircle2, Circle, Play, Image as ImageIcon, Presentation, ClipboardList, LockKeyhole, CalendarDays, Megaphone, Pin, Search, Send, CornerDownRight, MessageSquare as MsgIcon, ChevronLeft, ChevronRight, Minimize2, Maximize2 } from "lucide-react";
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
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/student/courses/$courseId")({ component: CourseLearning });

const typeMeta: Record<ContentType, { icon: any; label: string }> = {
  video: { icon: Video, label: "Video" },
  pdf: { icon: FileText, label: "PDF" },
  reading: { icon: BookOpen, label: "Reading" },
  lab: { icon: FlaskConical, label: "Lab" },
  link: { icon: Link2, label: "Link" },
  download: { icon: Download, label: "Download" },
  image: { icon: ImageIcon, label: "Image" },
  ppt: { icon: Presentation, label: "Slides" },
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
  const { courses, progress, markItemComplete, unmarkItemComplete, assessments } = useData();
  const course = courses.find((c) => c.id === courseId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "announcements" | "discussion">("content");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return null;
  if (!course) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">Course not found.</GlassCard>
      </div>
    );
  }
  if (!course.studentIds.includes(user.id)) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <GlassCard className="text-center py-12 text-muted-foreground">You're not enrolled in this course.</GlassCard>
      </div>
    );
  }
  if (isCourseExpired(course, user.id)) {
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

  const done = new Set(progress[`${user.id}:${course.id}`] ?? []);
  const allItems = course.sections.flatMap((s) => s.items);
  const active: ContentItem | null = activeId
    ? allItems.find((i) => i.id === activeId) ?? null
    : allItems[0] ?? null;
  const pct = courseProgressPct(progress, user.id, course);

  const toggle = (id: string) => {
    if (done.has(id)) { unmarkItemComplete(user.id, course.id, id); }
    else { markItemComplete(user.id, course.id, id); toast.success("Marked complete"); }
  };

  const currentIndex = active ? allItems.findIndex((i) => i.id === active.id) : -1;
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/student/courses"><ArrowLeft className="mr-2 h-4 w-4" />All courses</Link></Button>
      <PageHeader
        title={course.name}
        subtitle={`${course.code} · ${allItems.length} items · ${pct}% complete`}
      />
      <Progress value={pct} className="h-1.5" />

      {/* Tabs and Focus Mode Sidebar Toggle */}
      <div className="flex items-center justify-between border-b border-border pb-1 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button variant={activeTab === "content" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("content")} className="h-9 text-xs shrink-0">
            Modules & Content
          </Button>
          <Button variant={activeTab === "announcements" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("announcements")} className="h-9 text-xs shrink-0">
            Announcements
          </Button>
          <Button variant={activeTab === "discussion" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("discussion")} className="h-9 text-xs shrink-0">
            Q&A Discussions
          </Button>
        </div>

        {activeTab === "content" && allItems.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 text-xs gap-1.5 hidden lg:flex border-border/80 hover:bg-secondary/60 shrink-0 cursor-pointer select-none"
          >
            {sidebarOpen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-primary" />
                Focus Mode (Hide List)
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                Show Modules List
              </>
            )}
          </Button>
        )}
      </div>

      <div className={`grid gap-6 transition-all duration-300 ${sidebarOpen ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1"}`}>
        <GlassCard className="min-h-[400px]">
          {activeTab === "content" && (
            allItems.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="mx-auto h-10 w-10 opacity-40 mb-3" />
                No content yet — your teacher is still building this course.
              </div>
            ) : active ? (
              <ContentViewer 
                item={active} 
                assessments={assessments.filter((a) => a.courseId === course.id)} 
                onToggleComplete={() => toggle(active.id)} 
                completed={done.has(active.id)} 
                userId={user.id}
                prevItem={prevItem}
                nextItem={nextItem}
                onNavigate={setActiveId}
              />
            ) : null
          )}

          {activeTab === "announcements" && (
            <StudentCourseAnnouncements courseId={course.id} />
          )}

          {activeTab === "discussion" && (
            <StudentCourseDiscussion courseId={course.id} />
          )}
        </GlassCard>

        {sidebarOpen && (
          <div className="space-y-3">
            {course.sections.map((sec) => (
              <GlassCard key={sec.id} className="p-3">
                <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">{sec.title}</div>
                <div className="space-y-0.5">
                  {sec.items.map((it) => {
                    const M = typeMeta[it.type];
                    const Icon = M.icon;
                    const isDone = done.has(it.id);
                    const isActive = active?.id === it.id;
                    return (
                      <button
                        key={it.id}
                        onClick={() => setActiveId(it.id)}
                        className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                          isActive ? "bg-primary/15" : "hover:bg-secondary/40"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{it.title}</span>
                      </button>
                    );
                  })}
                  {sec.items.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">No items in this section.</div>
                  )}
                </div>
              </GlassCard>
            ))}
            {course.sections.length === 0 && (
              <GlassCard className="text-xs text-muted-foreground text-center py-6">No sections yet.</GlassCard>
            )}

            {(() => {
              const courseAssessments = assessments.filter((a) => a.courseId === course.id);
              const regular = courseAssessments.filter((a) => !a.isFinal);
              const finals = courseAssessments.filter((a) => a.isFinal);
              const courseComplete = pct >= 100 && allItems.length > 0;
              return (
                <>
                  {regular.length > 0 && (
                    <GlassCard className="p-3">
                      <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">Assignments & Quizzes</div>
                      <div className="space-y-0.5">
                        {regular.map((a) => (
                          <Link key={a.id} to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}
                            className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary/40 transition">
                            <ClipboardCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="flex-1 truncate">{a.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{a.timeLimit}m</span>
                          </Link>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                  {finals.length > 0 && (
                    <GlassCard className="p-3 border-primary/30">
                      <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-primary">Final Test</div>
                      {!courseComplete && (
                        <div className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
                          <LockKeyhole className="h-3 w-3" />Complete all course content ({pct}%) to unlock.
                        </div>
                      )}
                      <div className="space-y-0.5">
                        {finals.map((a) => (
                          courseComplete ? (
                            <Link key={a.id} to="/student/assessments/$assessmentId" params={{ assessmentId: a.id }}
                              className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary/40 transition">
                              <ClipboardCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="flex-1 truncate">{a.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{a.timeLimit}m</span>
                            </Link>
                          ) : (
                            <div key={a.id} className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm opacity-50 cursor-not-allowed">
                              <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 truncate">{a.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">{a.timeLimit}m</span>
                            </div>
                          )
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </>
              );
            })()}
          </div>
        )}
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
}: {
  url: string;
  title: string;
  checkpoints: VideoCheckpoint[];
  progress: CheckpointProgress[];
  userId: string;
  onSubmitAnswer: (studentId: string, checkpointId: string, isCorrect: boolean) => Promise<void>;
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
      }
    }, 250);

    return () => clearInterval(interval);
  }, [embed, ytPlayer]);

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
      isCorrect = correctAns === studentAns;
    }

    if (isCorrect) {
      setCorrectFeedback(true);
      await onSubmitAnswer(userId, activeCheckpoint.id, true);
      setAnsweredCheckpoints((prev) => new Set([...prev, activeCheckpoint.id]));
      toast.success("Correct answer! You may continue watching.");
    } else {
      setCorrectFeedback(false);
      toast.error("Incorrect answer. Please try again.");
    }
  };

  const handleContinue = () => {
    setActiveCheckpoint(null);
    if (embed && ytPlayer && typeof ytPlayer.playVideo === "function") {
      ytPlayer.playVideo();
    } else if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  const handleRewind = () => {
    setActiveCheckpoint(null);
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
            onTimeUpdate={handleTimeUpdate}
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
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-center gap-2.5 cursor-pointer pointer-events-auto ${
                        selectedMCQ === idx
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 hover:bg-secondary/40 text-muted-foreground"
                      } ${correctFeedback === true && idx === activeCheckpoint.correctIndex ? "border-success bg-success/15 text-success-foreground" : ""}`}
                    >
                      <span className={`h-4 w-4 rounded-full border grid place-items-center text-[9px] font-bold ${
                        selectedMCQ === idx ? "border-primary text-primary" : "border-muted-foreground/30"
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
                    className={`p-3 rounded-lg border text-xs font-semibold transition cursor-pointer pointer-events-auto ${
                      selectedMCQ === 0
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
                    className={`p-3 rounded-lg border text-xs font-semibold transition cursor-pointer pointer-events-auto ${
                      selectedMCQ === 1
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
  userId,
  prevItem,
  nextItem,
  onNavigate,
}: {
  item: ContentItem;
  assessments: StoreAssessment[];
  completed: boolean;
  onToggleComplete: () => void;
  userId: string;
  prevItem: ContentItem | null;
  nextItem: ContentItem | null;
  onNavigate: (id: string) => void;
}) {
  const { videoCheckpoints, checkpointProgress, submitCheckpointAnswer } = useData();
  const M = typeMeta[item.type];
  const linkedAssessment = item.assessmentId ? assessments.find((a) => a.id === item.assessmentId) : null;

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

  const officeUrl = item.type === "ppt" && absoluteUrl && !absoluteUrl.startsWith("data:")
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`
    : null;

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

  // Add protection event handlers for copy/paste/print/save keys
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ["p", "s", "c", "a"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault();
        toast.error("Content is copy-protected and cannot be downloaded, printed, or copied.");
      }
    };
    window.addEventListener("keydown", blockKeys);
    return () => window.removeEventListener("keydown", blockKeys);
  }, []);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
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
            <Button variant="outline" size="sm" onClick={() => onNavigate(prevItem.id)} className="border-border h-9 text-xs">
              <ChevronLeft className="h-4 w-4 mr-1 text-muted-foreground" /> Prev
            </Button>
          )}
          {nextItem && (
            <Button variant="outline" size="sm" onClick={() => onNavigate(nextItem.id)} className="border-border h-9 text-xs">
              Next <ChevronRight className="h-4 w-4 ml-1 text-muted-foreground" />
            </Button>
          )}
          <Button variant={completed ? "outline" : "default"}
            className={completed ? "h-9 text-xs" : "gradient-primary text-primary-foreground border-0 h-9 text-xs glow"}
            onClick={onToggleComplete}>
            {completed ? "Mark incomplete" : "Mark complete"}
          </Button>
        </div>
      </div>

      {item.type === "video" && item.url && (
        <CheckpointVideoPlayer
          url={item.url}
          title={item.title}
          checkpoints={itemCheckpoints}
          progress={checkpointProgress}
          userId={userId}
          onSubmitAnswer={submitCheckpointAnswer}
        />
      )}

      {item.type === "pdf" && item.url && (
        <div className="space-y-3">
          <div className="relative w-full h-[750px] rounded-xl border border-border bg-white overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
            <iframe
              src={`${item.url}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              title={item.title}
              onLoad={handleIframeLoad}
            />
            {/* Transparent cover blocking right-click menu & click selection inside browser PDF plugin */}
            <div
              className={`absolute inset-0 bg-transparent z-10 cursor-default ${pdfOverlayActive ? "pointer-events-auto" : "pointer-events-none"}`}
              onContextMenu={(e) => e.preventDefault()}
              onWheel={handlePdfWheel}
            />
            {/* Permanent transparent cover over the top 56px to block clicks to Chrome's native PDF download/print buttons */}
            <div
              className="absolute top-0 left-0 right-0 h-[56px] bg-transparent z-20 pointer-events-auto cursor-default"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      )}

      {item.type === "image" && item.url && (
        <img
          src={item.url}
          alt={item.title}
          className="max-h-[640px] w-full rounded-xl border border-border object-contain bg-secondary/30"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}

      {item.type === "ppt" && item.url && (
        officeUrl ? (
          <div className="space-y-3">
            <div className="relative w-full h-[750px] rounded-xl border border-border bg-white overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
              <iframe
                src={officeUrl}
                className="w-full h-full border-0"
                title={item.title}
                onLoad={handleIframeLoad}
              />
              {/* Cover the PowerPoint bottom-right status bar options (Download, Print, full options menu) */}
              <div 
                className="absolute bottom-0 right-0 w-[240px] h-[38px] bg-background/95 border-l border-t border-border z-20 pointer-events-auto flex items-center justify-center text-[10px] text-muted-foreground select-none font-semibold"
                onContextMenu={(e) => e.preventDefault()}
              >
                🔒 Protected View
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground bg-secondary/30 border border-border/40 p-3.5 rounded-xl text-center">
            🔒 Slides viewing is protected. Direct download is disabled.
          </div>
        )
      )}

      {item.type === "assessment" && (
        linkedAssessment ? (
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
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
        ) : <div className="text-sm text-muted-foreground">Assignment or quiz not linked.</div>
      )}

      {item.type === "reading" && (
        <div className="prose prose-invert max-w-none whitespace-pre-wrap rounded-xl bg-secondary/40 p-4 text-sm">
          {item.body || "No content."}
        </div>
      )}

      {item.type === "lab" && item.url && (
        <iframe src={item.url} className="w-full h-[750px] rounded-xl border border-border" title={item.title} onLoad={handleIframeLoad} />
      )}

      {(item.type === "link" || item.type === "download") && item.url && (
        item.type === "download" ? (
          <div className="text-xs text-muted-foreground bg-secondary/30 border border-border/40 p-3.5 rounded-xl text-center">
            🔒 Protected File Download. Direct downloading is disabled for security.
          </div>
        ) : (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm hover:border-primary/40 transition">
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
  const courseAnns = useMemo(() => {
    return announcements
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, courseId]);

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
          {courseAnns.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 rounded-2xl border transition ${
                ann.isPinned ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/10"
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
