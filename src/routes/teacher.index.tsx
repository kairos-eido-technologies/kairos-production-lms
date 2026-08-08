import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Users, ClipboardCheck, Award, BookPlus, Inbox } from "lucide-react";
import { PageHeader, StatCard, GlassCard, CourseThumbnail } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct } from "@/lib/data-store";
import { motion } from "framer-motion";

export const Route = createFileRoute("/teacher/")({ component: TeacherDashboard });

function TeacherDashboard() {
  const { user } = useAuth();
  const { courses, assessments, submissions, certificates, progress } = useData();
  if (!user) return null;

  const myCourses = courses.filter((c) => c.teacherId === user.id);
  const myCourseIds = new Set(myCourses.map((c) => c.id));
  const totalStudents = new Set(myCourses.flatMap((c) => c.studentIds)).size;
  const myAssessmentIds = new Set(assessments.filter((a) => myCourseIds.has(a.courseId)).map((a) => a.id));
  const pendingGrades = submissions.filter((s) => myAssessmentIds.has(s.assessmentId) && s.status === "submitted").length;
  const certRequests = certificates.filter((c) => myCourseIds.has(c.courseId) && c.status === "pending").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Studio"
        subtitle={`Welcome back, ${user.name}.`}
        actions={
          <Button asChild className="gradient-primary text-primary-foreground border-0 glow">
            <Link to="/teacher/content">Open Content Builder</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Courses" value={myCourses.length} icon={BookOpen} to="/teacher/content" />
        <StatCard label="Total Students" value={totalStudents} icon={Users} delay={0.05} to="/teacher/students" />
        <StatCard label="Pending Grades" value={pendingGrades} icon={ClipboardCheck} accent delay={0.1} to="/teacher/assessments" />
        <StatCard label="Cert. Requests" value={certRequests} icon={Award} delay={0.15} to="/teacher/certificates" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">My Courses</h2>
        {myCourses.length === 0 ? (
          <GlassCard className="text-center py-12">
            <BookPlus className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <div className="font-semibold">No courses assigned</div>
            <p className="text-sm text-muted-foreground mt-1">Ask an admin to assign you to a course, then build content here.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myCourses.map((c, i) => {
              const avg = c.studentIds.length === 0
                ? 0
                : Math.round(c.studentIds.reduce((acc, sid) => acc + courseProgressPct(progress, sid, c), 0) / c.studentIds.length);
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to="/teacher/content" className="block glass rounded-2xl p-5 hover:border-primary/40 transition">
                    <div className="flex items-start justify-between mb-3">
                      <CourseThumbnail thumbnail={c.thumbnail} name={c.name} className="h-10 w-10" />
                      <Badge variant="outline" className="border-border text-[10px]">{c.code}</Badge>
                    </div>
                    <h3 className="font-semibold leading-tight">{c.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Avg. completion</span>
                        <span className="font-medium">{avg}%</span>
                      </div>
                      <Progress value={avg} className="h-1.5" />
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">{c.studentIds.length} students enrolled</div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <GlassCard>
        <div className="text-sm font-semibold mb-4">Submissions awaiting grading</div>
        {pendingGrades === 0 ? (
          <div className="text-center py-8">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <div className="text-sm text-muted-foreground">No submissions to grade.</div>
          </div>
        ) : (
          <Button asChild variant="outline"><Link to="/teacher/assessments">Open Assessments to grade</Link></Button>
        )}
      </GlassCard>
    </div>
  );
}
