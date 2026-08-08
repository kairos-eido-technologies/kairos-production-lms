import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Search, Mail, Download } from "lucide-react";
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

export const Route = createFileRoute("/teacher/students")({ component: TeacherStudents });

function TeacherStudents() {
  const { user } = useAuth();
  const { courses, users, progress, submissions, assessments, sendMessage } = useData();

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const filteredCourses = courseFilter === "all" ? myCourses : myCourses.filter((c) => c.id === courseFilter);

  // Build student rows: (student, course)
  const rows = useMemo(() => {
    const r: Array<{ student: typeof users[number]; courseId: string; courseName: string; pct: number; avgQuiz: number | null }> = [];
    const query = q.trim().toLowerCase();
    for (const c of filteredCourses) {
      const courseAssessments = assessments.filter((a) => a.courseId === c.id);
      for (const sid of c.studentIds) {
        const st = users.find((u) => u.id === sid);
        if (!st) continue;
        if (query && !st.name.toLowerCase().includes(query) && !st.email.toLowerCase().includes(query)) continue;
        const pct = courseProgressPct(progress, sid, c);
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
        r.push({ student: st, courseId: c.id, courseName: c.name, pct, avgQuiz: avg });
      }
    }
    return r;
  }, [filteredCourses, users, progress, submissions, assessments, q]);

  const totalStudents = new Set(rows.map((r) => r.student.id)).size;
  const inactiveStudents = new Set(rows.filter((r) => isUserInactive(r.student)).map((r) => r.student.id)).size;

  // message dialog
  const [msgTo, setMsgTo] = useState<{ id: string; name: string } | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  const handleSend = () => {
    if (!user || !msgTo || !msgSubject.trim() || !msgBody.trim()) {
      toast.error("Subject and body are required.");
      return;
    }
    sendMessage(user.id, msgTo.id, msgSubject.trim(), msgBody.trim());
    toast.success(`Message sent to ${msgTo.name}`);
    setMsgTo(null); setMsgSubject(""); setMsgBody("");
  };

  const exportCsv = () => {
    const head = ["Student","Email","Course","Course Code","Progress %","Quiz Average %","Submissions"];
    const data: (string | number)[][] = [head, ...rows.map((r) => [r.student.name, r.student.email, r.courseName, myCourses.find((c) => c.id === r.courseId)?.code ?? "", r.pct, r.avgQuiz ?? "", submissions.filter((s) => s.studentId === r.student.id && assessments.some((a) => a.id === s.assessmentId && a.courseId === r.courseId)).length])];
    downloadCSV(`student-progress-${new Date().toISOString().slice(0,10)}.csv`, data);
    toast.success("Exported");
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Student Progress" subtitle="Track learners and message them directly." actions={
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      } />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Unique Students" value={totalStudents} icon={Users} />
        <StatCard label="Idle learners" value={inactiveStudents} icon={Users} accent delay={0.05} />
        <StatCard label="My Courses" value={myCourses.length} icon={Users} delay={0.1} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" className="pl-9" />
        </div>
      </div>

      {rows.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <div className="text-sm text-muted-foreground">No students enrolled yet in your courses.</div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <GlassCard key={`${r.student.id}-${r.courseId}`} className="flex flex-wrap items-center gap-4">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold shrink-0">
                {r.student.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.student.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.student.email} · {r.courseName}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Last active: {formatLastActive(r.student)}
                  {isUserInactive(r.student) && <span className="ml-2 text-warning">(Idle)</span>}
                </div>
              </div>
              <div className="w-40 shrink-0">
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span>{r.pct}%</span></div>
                <Progress value={r.pct} className="h-1.5" />
              </div>
              <Badge variant="outline" className="border-border shrink-0">
                Quiz avg: {r.avgQuiz === null ? "—" : `${r.avgQuiz}%`}
              </Badge>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => setMsgTo({ id: r.student.id, name: r.student.name })}>
                <Mail className="h-4 w-4 mr-1.5" />Message
              </Button>
            </GlassCard>
          ))}
        </div>
      )}

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