import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Search, Mail, Download, ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct, submissionScore, isUserInactive, formatLastActive } from "@/lib/data-store";
import { downloadCSV } from "@/lib/exports";

const ITEMS_PER_PAGE = 20;

export const Route = createFileRoute("/teacher/students")({ component: TeacherStudents });

function TeacherStudents() {
  const { user } = useAuth();
  const { courses, users, progress, submissions, assessments, sendMessage, grantExtraAttempt } = useData();

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );

  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [progressFilter, setProgressFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filteredCourses = courseFilter === "all" ? myCourses : myCourses.filter((c) => c.id === courseFilter);

  // Build student rows: (student, course)
  const allRows = useMemo(() => {
    const r: Array<{ student: typeof users[number]; courseId: string; courseName: string; pct: number; avgQuiz: number | null }> = [];
    const query = q.trim().toLowerCase();

    for (const c of filteredCourses) {
      const courseAssessments = assessments.filter((a) => a.courseId === c.id);
      for (const sid of c.studentIds) {
        const st = users.find((u) => u.id === sid);
        if (!st) continue;

        // Search query filter
        if (query && !st.name.toLowerCase().includes(query) && !st.email.toLowerCase().includes(query)) continue;

        // Activity filter
        const isIdle = isUserInactive(st);
        if (activityFilter === "idle" && !isIdle) continue;
        if (activityFilter === "active" && isIdle) continue;

        const pct = courseProgressPct(progress, sid, c);

        // Progress filter
        if (progressFilter === "completed" && pct < 100) continue;
        if (progressFilter === "in_progress" && (pct === 0 || pct === 100)) continue;
        if (progressFilter === "not_started" && pct > 0) continue;

        const mySubs = submissions.filter((s) => s.studentId === sid && courseAssessments.some((a) => a.id === s.assessmentId));
        let avg: number | null = null;
        if (mySubs.length > 0) {
          let total = 0;
          for (const s of mySubs) {
            const a = courseAssessments.find((x) => x.id === s.assessmentId)!;
            total += submissionScore(a, s).pct;
          }
          avg = Math.round(total / mySubs.length);
        }

        // Score filter
        if (scoreFilter === "high" && (avg === null || avg < 80)) continue;
        if (scoreFilter === "average" && (avg === null || avg < 50 || avg >= 80)) continue;
        if (scoreFilter === "low" && (avg === null || avg >= 50)) continue;
        if (scoreFilter === "none" && avg !== null) continue;

        r.push({ student: st, courseId: c.id, courseName: c.name, pct, avgQuiz: avg });
      }
    }
    return r;
  }, [filteredCourses, users, progress, submissions, assessments, q, activityFilter, progressFilter, scoreFilter]);

  const totalStudents = new Set(allRows.map((r) => r.student.id)).size;
  const inactiveStudents = new Set(allRows.filter((r) => isUserInactive(r.student)).map((r) => r.student.id)).size;

  // Pagination calculation (20 per page)
  const totalPages = Math.ceil(allRows.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allRows.slice(start, start + ITEMS_PER_PAGE);
  }, [allRows, currentPage]);

  // Message dialog
  const [msgTo, setMsgTo] = useState<{ id: string; name: string } | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  // Extra attempt dialog
  const [attemptModalStudent, setAttemptModalStudent] = useState<{ id: string; name: string; courseId: string } | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");

  const handleSend = () => {
    if (!user || !msgTo || !msgSubject.trim() || !msgBody.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    sendMessage(user.id, msgTo.id, msgSubject.trim(), msgBody.trim());
    toast.success(`Message sent to ${msgTo.name}`);
    setMsgTo(null); setMsgSubject(""); setMsgBody("");
  };

  const handleGrantExtraAttempt = () => {
    if (!attemptModalStudent || !selectedAssessmentId) {
      toast.error("Please select an assessment.");
      return;
    }
    grantExtraAttempt(selectedAssessmentId, attemptModalStudent.id, 1);
    const assessTitle = assessments.find((a) => a.id === selectedAssessmentId)?.title ?? "assessment";
    toast.success(`Granted +1 extra attempt for ${attemptModalStudent.name} on "${assessTitle}".`);
    setAttemptModalStudent(null);
    setSelectedAssessmentId("");
  };

  const exportCsv = () => {
    const head = ["Student","Email","Course","Course Code","Progress %","Quiz Average %","Submissions"];
    const data: (string | number)[][] = [head, ...allRows.map((r) => [r.student.name, r.student.email, r.courseName, myCourses.find((c) => c.id === r.courseId)?.code ?? "", r.pct, r.avgQuiz ?? "", submissions.filter((s) => s.studentId === r.student.id && assessments.some((a) => a.id === s.assessmentId && a.courseId === r.courseId)).length])];
    downloadCSV(`student-progress-${new Date().toISOString().slice(0,10)}.csv`, data);
    toast.success("Exported CSV");
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Student Progress" subtitle="Track learners, filter performance, and manage retest attempts." actions={
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      } />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Unique Students" value={totalStudents} icon={Users} />
        <StatCard label="Idle learners" value={inactiveStudents} icon={Users} accent delay={0.05} />
        <StatCard label="Total Records" value={allRows.length} icon={Users} delay={0.1} />
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5 text-primary" /> Filter Learners</span>
          <span>{allRows.length} matching students</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <Select value={courseFilter} onValueChange={(val) => { setCourseFilter(val); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Courses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={progressFilter} onValueChange={(val) => { setProgressFilter(val); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Progress Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Progress Levels</SelectItem>
              <SelectItem value="completed">Completed (100%)</SelectItem>
              <SelectItem value="in_progress">In Progress (1-99%)</SelectItem>
              <SelectItem value="not_started">Not Started (0%)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={scoreFilter} onValueChange={(val) => { setScoreFilter(val); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Quiz Average" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="high">High Achievers (80%+)</SelectItem>
              <SelectItem value="average">Average (50-79%)</SelectItem>
              <SelectItem value="low">Struggling (&lt;50%)</SelectItem>
              <SelectItem value="none">No Quizzes Taken</SelectItem>
            </SelectContent>
          </Select>

          <Select value={activityFilter} onValueChange={(val) => { setActivityFilter(val); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Activity Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="active">Active Recently</SelectItem>
              <SelectItem value="idle">Idle (&gt;14 days)</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name/email" className="pl-9 h-9 text-xs" />
          </div>
        </div>
      </div>

      {allRows.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <div className="text-sm text-muted-foreground">No students matching the selected filters.</div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedRows.map((r) => (
              <GlassCard key={`${r.student.id}-${r.courseId}`} className="flex flex-wrap items-center gap-4">
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold shrink-0">
                  {r.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{r.student.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.student.email} · <span className="font-semibold text-foreground/80">{r.courseName}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>Last active: {formatLastActive(r.student)}</span>
                    {isUserInactive(r.student) && <span className="text-amber-500 font-semibold">(Idle)</span>}
                  </div>
                </div>
                <div className="w-36 shrink-0">
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span>{r.pct}%</span></div>
                  <Progress value={r.pct} className="h-1.5" />
                </div>
                <Badge variant="outline" className={`shrink-0 text-xs ${
                  r.avgQuiz !== null && r.avgQuiz < 50 ? "border-destructive/40 text-destructive bg-destructive/10" : "border-border"
                }`}>
                  Quiz avg: {r.avgQuiz === null ? "—" : `${r.avgQuiz}%`}
                </Badge>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1"
                    onClick={() => {
                      setAttemptModalStudent({ id: r.student.id, name: r.student.name, courseId: r.courseId });
                      const courseAss = assessments.filter((a) => a.courseId === r.courseId);
                      if (courseAss.length > 0) setSelectedAssessmentId(courseAss[0].id);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> +1 Attempt
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setMsgTo({ id: r.student.id, name: r.student.name })}>
                    <Mail className="h-3.5 w-3.5" /> Message
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination Controls (20 per page) */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <div>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, allRows.length)} of {allRows.length} students
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="font-semibold text-foreground px-2">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grant Extra Attempt Modal */}
      <Dialog open={!!attemptModalStudent} onOpenChange={(o) => !o && setAttemptModalStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Extra Retest Attempt</DialogTitle>
            <DialogDescription>
              Increase allowed test attempts for {attemptModalStudent?.name} if they keep failing a subject or need a retest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Assessment / Quiz</Label>
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger><SelectValue placeholder="Choose quiz or final test" /></SelectTrigger>
                <SelectContent>
                  {assessments
                    .filter((a) => a.courseId === attemptModalStudent?.courseId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.isFinal ? "[Final Test] " : ""}{a.title} ({a.attempts} base attempts)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttemptModalStudent(null)}>Cancel</Button>
            <Button onClick={handleGrantExtraAttempt} className="gradient-primary text-primary-foreground border-0">
              Grant +1 Attempt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={!!msgTo} onOpenChange={(o) => !o && setMsgTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {msgTo?.name}</DialogTitle>
            <DialogDescription>Send a direct message to this student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Subject</Label><Input value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} /></div>
            <div className="space-y-1"><Label>Message</Label><Textarea rows={4} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgTo(null)}>Cancel</Button>
            <Button onClick={handleSend} className="gradient-primary text-primary-foreground border-0">Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}