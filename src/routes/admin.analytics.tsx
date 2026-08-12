import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, BookOpen, ClipboardCheck, Award, GraduationCap, TrendingUp, Clock, AlertTriangle, ExternalLink, ChevronLeft, ChevronRight, Upload, Search, X } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, courseProgressPct, isUserInactive, formatLastActive, formatIdleDuration } from "@/lib/data-store";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

const roleColors: Record<string, string> = {
  admin: "border-primary/40 text-primary bg-primary/10",
  teacher: "border-warning/40 text-warning bg-warning/10",
  student: "border-success/40 text-success bg-success/10",
};

function AdminAnalytics() {
  const { users, courses, assessments, submissions, certificates, progress } = useData();

  // Pagination States for Performance & Clean Navigation
  const [topCoursesPage, setTopCoursesPage] = useState<number>(1);
  const [teacherLoadPage, setTeacherLoadPage] = useState<number>(1);
  const [idlePage, setIdlePage] = useState<number>(1);
  const [teacherMonitorPage, setTeacherMonitorPage] = useState<number>(1);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const pageSize = 10;

  const stats = useMemo(() => {
    const students = users.filter((u) => u.role === "student");
    const teachers = users.filter((u) => u.role === "teacher");
    const activeCourses = courses.filter((c) => c.status === "active");
    const issued = certificates.filter((c) => c.status === "approved");
    const pending = certificates.filter((c) => c.status === "pending");

    // overall completion across all enrolled student-course pairs
    let pctSum = 0, pairs = 0;
    for (const c of courses) {
      for (const sid of c.studentIds) { pctSum += courseProgressPct(progress, sid, c); pairs++; }
    }
    const avgCompletion = pairs ? Math.round(pctSum / pairs) : 0;

    const submitted = submissions.length;
    const graded = submissions.filter((s) => s.status === "graded").length;
    return { students, teachers, activeCourses, issued, pending, avgCompletion, submitted, graded };
  }, [users, courses, assessments, submissions, certificates, progress]);

  // All top courses sorted by enrolment
  const allTopCourses = useMemo(() => {
    return [...courses].sort((a, b) => b.studentIds.length - a.studentIds.length);
  }, [courses]);

  const totalTopCoursesPages = Math.max(1, Math.ceil(allTopCourses.length / pageSize));
  const paginatedTopCourses = useMemo(() => {
    const start = (topCoursesPage - 1) * pageSize;
    return allTopCourses.slice(start, start + pageSize);
  }, [allTopCourses, topCoursesPage]);

  // All teacher load sorted by student count
  const allTeacherLoad = useMemo(() => {
    return stats.teachers.map((t) => ({
      teacher: t,
      courseCount: courses.filter((c) => c.teacherId === t.id).length,
      studentCount: courses.filter((c) => c.teacherId === t.id).reduce((n, c) => n + c.studentIds.length, 0),
    })).sort((a, b) => b.studentCount - a.studentCount);
  }, [stats.teachers, courses]);

  const totalTeacherLoadPages = Math.max(1, Math.ceil(allTeacherLoad.length / pageSize));
  const paginatedTeacherLoad = useMemo(() => {
    const start = (teacherLoadPage - 1) * pageSize;
    return allTeacherLoad.slice(start, start + pageSize);
  }, [allTeacherLoad, teacherLoadPage]);

  // Idle users list
  const allIdleUsers = useMemo(
    () =>
      [...users]
        .filter((u) => isUserInactive(u))
        .sort((a, b) => {
          const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          return aDate - bDate; // longest idle first
        }),
    [users],
  );

  const totalIdlePages = Math.max(1, Math.ceil(allIdleUsers.length / pageSize));
  const paginatedIdleUsers = useMemo(() => {
    const start = (idlePage - 1) * pageSize;
    return allIdleUsers.slice(start, start + pageSize);
  }, [allIdleUsers, idlePage]);

  // Teacher activity monitor summary list
  const teacherMonitorList = useMemo(() => {
    return stats.teachers.map((t) => {
      const teacherCourses = courses.filter((c) => c.teacherId === t.id);
      const totalUploads = teacherCourses.reduce(
        (sum, c) => sum + c.sections.reduce((sCount, sec) => sCount + sec.items.length, 0),
        0
      );
      const totalStudentsTaught = teacherCourses.reduce((sum, c) => sum + c.studentIds.length, 0);
      return {
        teacher: t,
        coursesCount: teacherCourses.length,
        totalUploads,
        totalStudentsTaught,
      };
    });
  }, [stats.teachers, courses]);

  const filteredTeacherMonitorList = useMemo(() => {
    if (!teacherSearchQuery.trim()) return teacherMonitorList;
    const q = teacherSearchQuery.toLowerCase();
    return teacherMonitorList.filter(
      ({ teacher }) =>
        teacher.name.toLowerCase().includes(q) ||
        teacher.email.toLowerCase().includes(q)
    );
  }, [teacherMonitorList, teacherSearchQuery]);

  const totalTeacherMonitorPages = Math.max(1, Math.ceil(filteredTeacherMonitorList.length / pageSize));
  const paginatedTeacherMonitor = useMemo(() => {
    const start = (teacherMonitorPage - 1) * pageSize;
    return filteredTeacherMonitorList.slice(start, start + pageSize);
  }, [filteredTeacherMonitorList, teacherMonitorPage]);

  return (
    <div className="space-y-8">
      <PageHeader title="Platform Analytics" subtitle="Real-time insights across the entire academy." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={stats.students.length} icon={Users} />
        <StatCard label="Teachers" value={stats.teachers.length} icon={GraduationCap} delay={0.05} />
        <StatCard label="Active Courses" value={stats.activeCourses.length} icon={BookOpen} delay={0.1} />
        <StatCard label="Certificates Issued" value={stats.issued.length} icon={Award} delay={0.15} accent />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assessments" value={assessments.length} icon={ClipboardCheck} />
        <StatCard label="Quiz Submissions" value={stats.submitted} icon={TrendingUp} delay={0.05} />
        <StatCard label="Pending Approvals" value={stats.pending.length} icon={Award} delay={0.1} />
        <StatCard label="Avg Completion" value={`${stats.avgCompletion}%`} icon={TrendingUp} delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Courses Card (Paginated) */}
        <GlassCard className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">Top Courses by Enrolment</h3>
              <Badge variant="outline" className="border-border text-xs font-normal">
                {allTopCourses.length} courses total
              </Badge>
            </div>

            {allTopCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No courses yet.</p>
            ) : (
              <div className="space-y-3 min-h-[220px]">
                {paginatedTopCourses.map((c) => {
                  const max = Math.max(...allTopCourses.map((x) => x.studentIds.length), 1);
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">{c.thumbnail} {c.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">{c.studentIds.length} students</span>
                      </div>
                      <Progress value={(c.studentIds.length / max) * 100} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Courses Pagination */}
          {totalTopCoursesPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-4 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">
                Page {topCoursesPage} of {totalTopCoursesPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTopCoursesPage((p) => Math.max(1, p - 1))}
                  disabled={topCoursesPage === 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTopCoursesPage((p) => Math.min(totalTopCoursesPages, p + 1))}
                  disabled={topCoursesPage === totalTopCoursesPages}
                  className="h-7 px-2"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Teacher Load Card (Paginated) */}
        <GlassCard className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">Teacher Load</h3>
              <Badge variant="outline" className="border-border text-xs font-normal">
                {allTeacherLoad.length} teachers total
              </Badge>
            </div>

            {allTeacherLoad.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No teachers yet.</p>
            ) : (
              <div className="space-y-3 min-h-[220px]">
                {paginatedTeacherLoad.map(({ teacher, courseCount, studentCount }) => (
                  <div key={teacher.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="min-w-0">
                      <div className="font-medium truncate text-sm">{teacher.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{teacher.email}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="outline" className="w-24 justify-center border-border text-xs">
                        {courseCount} {courseCount === 1 ? "course" : "courses"}
                      </Badge>
                      <Badge variant="outline" className="w-28 justify-center border-primary/40 text-primary bg-primary/10 text-xs">
                        {studentCount} students
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Load Pagination */}
          {totalTeacherLoadPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-4 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">
                Page {teacherLoadPage} of {totalTeacherLoadPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTeacherLoadPage((p) => Math.max(1, p - 1))}
                  disabled={teacherLoadPage === 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTeacherLoadPage((p) => Math.min(totalTeacherLoadPages, p + 1))}
                  disabled={teacherLoadPage === totalTeacherLoadPages}
                  className="h-7 px-2"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Idle Users Section (Paginated) */}
      <GlassCard className="border-warning/20">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 grid place-items-center rounded-lg bg-warning/15 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Idle Users Monitor</h3>
              <p className="text-xs text-muted-foreground">Users inactive for more than 2 days — limited display to ensure fast performance.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10">
            {allIdleUsers.length} total idle
          </Badge>
        </div>

        {allIdleUsers.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">All users are active. 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {paginatedIdleUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-warning/5 border border-warning/15 px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 grid place-items-center rounded-xl bg-warning/15 text-warning text-xs font-bold shrink-0">
                    {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>

                  {/* Role badge */}
                  <Badge variant="outline" className={`capitalize text-[10px] py-0 shrink-0 ${roleColors[u.role]}`}>
                    {u.role}
                  </Badge>

                  {/* Idle duration */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-warning text-xs font-semibold">
                      <Clock className="h-3 w-3" />
                      {formatIdleDuration(u)} idle
                    </div>
                    <div className="text-[10px] text-muted-foreground">{formatLastActive(u)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalIdlePages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">
                  Showing {(idlePage - 1) * pageSize + 1} - {Math.min(idlePage * pageSize, allIdleUsers.length)} of {allIdleUsers.length} idle users
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIdlePage((p) => Math.max(1, p - 1))}
                    disabled={idlePage === 1}
                    className="h-8 px-2.5"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <span className="font-medium px-2">
                    Page {idlePage} of {totalIdlePages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIdlePage((p) => Math.min(totalIdlePages, p + 1))}
                    disabled={idlePage === totalIdlePages}
                    className="h-8 px-2.5"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Teacher Activity & Upload Monitor (Uniformly Aligned Overview Cards) */}
      <GlassCard className="border-primary/20 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 grid place-items-center rounded-lg bg-primary/15 text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">Teacher Activity & Upload Monitor</h3>
              <p className="text-xs text-muted-foreground">
                Overview of teachers. Click "View Analytics & Logs" to inspect course uploads & logs on a dedicated page.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            {stats.teachers.length} Teachers Registered
          </Badge>
        </div>

        {stats.teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No teachers registered.</p>
        ) : (
          <div className="space-y-4">
            {/* Search Input Bar */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teacher by name or email..."
                value={teacherSearchQuery}
                onChange={(e) => {
                  setTeacherSearchQuery(e.target.value);
                  setTeacherMonitorPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs"
              />
              {teacherSearchQuery && (
                <button
                  onClick={() => {
                    setTeacherSearchQuery("");
                    setTeacherMonitorPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredTeacherMonitorList.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border/60 rounded-xl">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No teachers found matching "{teacherSearchQuery}".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedTeacherMonitor.map(({ teacher: t, coursesCount, totalUploads, totalStudentsTaught }) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-4 border border-border/60 rounded-xl p-4 bg-secondary/10 hover:bg-secondary/20 transition"
                  >
                    {/* Left info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-sm font-bold shrink-0">
                        {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                      </div>
                    </div>

                    {/* Right badges & button container — Uniformly aligned */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <Badge variant="outline" className="w-24 justify-center py-1.5 border-border text-xs font-medium">
                        {coursesCount} {coursesCount === 1 ? "course" : "courses"}
                      </Badge>
                      <Badge variant="outline" className="w-28 justify-center py-1.5 border-primary/30 text-primary bg-primary/5 text-xs font-medium flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {totalUploads} uploads
                      </Badge>
                      <Badge variant="outline" className="w-28 justify-center py-1.5 border-success/30 text-success bg-success/5 text-xs font-medium">
                        {totalStudentsTaught} students
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-[175px] justify-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-medium"
                      >
                        <Link to="/admin/teacher-analytics/$teacherId" params={{ teacherId: t.id }}>
                          View Analytics & Logs <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls for Teachers List */}
            {totalTeacherMonitorPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">
                  Showing {(teacherMonitorPage - 1) * pageSize + 1} - {Math.min(teacherMonitorPage * pageSize, filteredTeacherMonitorList.length)} of {filteredTeacherMonitorList.length} teachers
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTeacherMonitorPage((p) => Math.max(1, p - 1))}
                    disabled={teacherMonitorPage === 1}
                    className="h-8 px-2.5"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <span className="font-medium px-2">
                    Page {teacherMonitorPage} of {totalTeacherMonitorPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTeacherMonitorPage((p) => Math.min(totalTeacherMonitorPages, p + 1))}
                    disabled={teacherMonitorPage === totalTeacherMonitorPages}
                    className="h-8 px-2.5"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}