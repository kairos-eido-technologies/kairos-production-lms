import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GraduationCap, BookOpen, Award, UserPlus, BookPlus, AlertCircle, Inbox, Clock } from "lucide-react";
import { PageHeader, StatCard, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useData, isUserInactive } from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { motion } from "framer-motion";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { user } = useAuth();
  const { users, courses, certificates, notifications } = useData();
  const students = users.filter((u) => u.role === "student").length;
  const teachers = users.filter((u) => u.role === "teacher").length;
  const activeCourses = courses.filter((c) => c.status === "active").length;
  const pending = certificates.filter((c) => c.status === "pending").length;
  const inactiveUsers = users.filter((u) => isUserInactive(u)).length;

  const recent = notifications.filter((n) => user && n.userId === user.id).slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mission Control"
        subtitle={`Welcome back, ${user?.name ?? "Admin"} — here's what's happening on iTech Academy.`}
        actions={
          <>
            <Button asChild variant="outline" className="border-border">
              <Link to="/admin/courses"><BookPlus className="mr-2 h-4 w-4" />Courses</Link>
            </Button>
            <Button asChild className="gradient-primary text-primary-foreground border-0 glow">
              <Link to="/admin/users"><UserPlus className="mr-2 h-4 w-4" />Users</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Students" value={students} icon={Users} to="/admin/users" />
        <StatCard label="Teachers" value={teachers} icon={GraduationCap} delay={0.05} to="/admin/users" />
        <StatCard label="Active Courses" value={activeCourses} icon={BookOpen} delay={0.1} to="/admin/courses" />
        <StatCard label="Pending Approvals" value={pending} icon={Award} accent delay={0.15} to="/admin/certificates" />
        <StatCard label="Idle Users" value={inactiveUsers} icon={Clock} accent delay={0.2} to="/admin/users" />
      </div>

      {inactiveUsers > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between rounded-2xl border border-warning/40 bg-warning/10 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-xl bg-warning/20 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-warning">{inactiveUsers} idle user{inactiveUsers === 1 ? "" : "s"}</div>
              <div className="text-xs text-muted-foreground">Haven't logged in for over 2 days. Consider sending a nudge.</div>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-warning/40 text-warning hover:bg-warning/10">
            <Link to="/admin/users"><Clock className="mr-1.5 h-4 w-4" />View idle users</Link>
          </Button>
        </motion.div>
      )}

      {pending > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/20 text-primary animate-pulse-glow">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{pending} certificates awaiting your approval</div>
              <div className="text-xs text-muted-foreground">Review teacher recommendations.</div>
            </div>
          </div>
          <Button asChild size="sm" className="gradient-primary text-primary-foreground border-0">
            <Link to="/admin/certificates">Review queue</Link>
          </Button>
        </motion.div>
      )}

      <GlassCard>
        <div className="text-sm font-semibold mb-4">Recent activity</div>
        {recent.length === 0 ? (
          <EmptyState icon={Inbox} title="No activity yet" subtitle="Notifications appear here when things happen." />
        ) : (
          <div className="space-y-2">
            {recent.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-secondary/40 transition">
                <div className="h-8 w-8 grid place-items-center rounded-lg bg-primary/15 text-primary text-xs font-bold">
                  {n.title[0]?.toUpperCase() ?? "•"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {courses.length === 0 && (
        <GlassCard className="text-center py-12">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <div className="font-semibold">No courses yet</div>
          <p className="text-sm text-muted-foreground mt-1">Create your first course to start onboarding learners.</p>
          <Button asChild className="mt-4 gradient-primary text-primary-foreground border-0">
            <Link to="/admin/courses"><BookPlus className="mr-2 h-4 w-4" />Create your first course</Link>
          </Button>
        </GlassCard>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="text-center py-10">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
      <div className="font-medium">{title}</div>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
