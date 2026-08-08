import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Award, CheckCircle2, ChevronRight, Play, Inbox } from "lucide-react";
import { PageHeader, StatCard, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/store";
import { useData, courseProgressPct } from "@/lib/data-store";
import { motion } from "framer-motion";

export const Route = createFileRoute("/student/")({ component: StudentDashboard });

function StudentDashboard() {
  const { user } = useAuth();
  const { courses, certificates, progress, users } = useData();
  if (!user) return null;

  const my = courses.filter((c) => c.studentIds.includes(user.id));
  const completed = my.filter((c) => courseProgressPct(progress, user.id, c) >= 100).length;
  const myCerts = certificates.filter((c) => c.studentId === user.id && c.status === "approved").length;

  return (
    <div className="space-y-8">
      <PageHeader title={`Hello, ${user.name} 👋`} subtitle={`Student ID: ${user.id} · Pick up where you left off.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Courses Enrolled" value={my.length} icon={BookOpen} to="/student/courses" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} delay={0.05} to="/student/progress" />
        <StatCard label="Certificates" value={myCerts} icon={Award} accent delay={0.1} to="/student/certificates" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Continue learning</h2>
          <Link to="/student/courses" className="text-xs text-primary inline-flex items-center">All courses <ChevronRight className="h-3 w-3" /></Link>
        </div>
        {my.length === 0 ? (
          <GlassCard className="text-center py-12">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <div className="font-semibold">You're not enrolled in any courses yet</div>
            <p className="text-sm text-muted-foreground mt-1">An admin will enroll you in courses soon.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {my.map((c, i) => {
              const p = courseProgressPct(progress, user.id, c);
              const teacher = users.find((u) => u.id === c.teacherId);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative overflow-hidden glass rounded-2xl p-5 hover:border-primary/40 transition"
                >
                  {c.thumbnail && !c.thumbnail.startsWith("http") && !c.thumbnail.startsWith("/") ? (
                    <div className="absolute -right-8 -top-8 text-7xl opacity-10 select-none">{c.thumbnail}</div>
                  ) : null}
                  <Badge variant="outline" className="border-border text-[10px]">{c.code}</Badge>
                  <h3 className="mt-3 font-semibold leading-tight">{c.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">by {teacher?.name ?? "Unassigned"}</p>

                  <div className="mt-5 flex items-center gap-4">
                    <div className="relative h-16 w-16">
                      <svg className="-rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#DC2626" strokeWidth="3"
                          strokeDasharray={`${(p / 100) * 94.25} 94.25`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{p}%</div>
                    </div>
                    <Button asChild size="sm" className="gradient-primary text-primary-foreground border-0 glow">
                      <Link to="/student/courses/$courseId" params={{ courseId: c.id }}>
                        <Play className="h-3 w-3 mr-1.5 fill-current" />Continue
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <GlassCard>
        <div className="text-sm font-semibold mb-4">Recent updates</div>
        <div className="text-center py-8">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <div className="text-sm text-muted-foreground">Updates appear here as you make progress.</div>
        </div>
      </GlassCard>
    </div>
  );
}
