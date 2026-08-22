import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  Award,
  UserPlus,
  BookPlus,
  AlertCircle,
  Inbox,
  Clock,
  Radio,
  ShieldCheck,
  ArrowRight,
  Activity,
  Zap,
  CheckCircle2,
  Wifi,
  Mail,
} from "lucide-react";
import { PageHeader, StatCard, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData, isUserInactive, isUserOnline, formatLastActive } from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { motion } from "framer-motion";

export const Route = createFileRoute("/admin/mission-control")({
  component: MissionControlPage,
});

const roleBadges: Record<string, string> = {
  admin: "border-primary/40 text-primary bg-primary/10",
  teacher: "border-warning/40 text-warning bg-warning/10",
  student: "border-success/40 text-success bg-success/10",
};

function MissionControlPage() {
  const { user } = useAuth();
  const { users, courses, certificates, notifications } = useData();

  // Calculate live/online users (active in last 30m or current user)
  const onlineUsersList = useMemo(() => {
    return users.filter((u) => (user && u.id === user.id) || isUserOnline(u, 30));
  }, [users, user]);

  const liveUsersCount = onlineUsersList.length;
  const students = users.filter((u) => u.role === "student").length;
  const teachers = users.filter((u) => u.role === "teacher").length;
  const activeCourses = courses.filter((c) => c.status === "active").length;
  const pendingCerts = certificates.filter((c) => c.status === "pending").length;
  const inactiveUsers = users.filter((u) => isUserInactive(u)).length;

  // Cap activity feed to max 20 items for performance optimization
  const recentActivity = notifications.filter((n) => user && n.userId === user.id).slice(0, 20);

  return (
    <div className="space-y-8 py-2">
      <PageHeader
        title="Mission Control"
        subtitle="Live metrics, active telemetry, and administrative controls for iTech Academy."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-border">
              <Link to="/admin/courses">
                <BookPlus className="mr-2 h-4 w-4" />
                Add Course
              </Link>
            </Button>
            <Button asChild className="gradient-primary text-primary-foreground border-0 glow">
              <Link to="/admin/users">
                <UserPlus className="mr-2 h-4 w-4" />
                Onboard User
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Key System Metrics Grid ────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-stretch">
        <StatCard
          label="Live Now"
          value={liveUsersCount}
          icon={Radio}
          live
          to="/admin/users"
        />
        <StatCard
          label="Total Students"
          value={students}
          icon={Users}
          to="/admin/users"
          delay={0.03}
        />
        <StatCard
          label="Teachers"
          value={teachers}
          icon={GraduationCap}
          delay={0.06}
          to="/admin/users"
        />
        <StatCard
          label="Active Courses"
          value={activeCourses}
          icon={BookOpen}
          delay={0.09}
          to="/admin/courses"
        />
        <StatCard
          label="Pending Approvals"
          value={pendingCerts}
          icon={Award}
          accent={pendingCerts > 0}
          delay={0.12}
          to="/admin/certificates"
        />
        <StatCard
          label="Idle Users"
          value={inactiveUsers}
          icon={Clock}
          delay={0.15}
          to="/admin/users"
        />
      </div>

      {/* ── Action Banners ────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Idle Users Alert Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-between rounded-2xl border border-warning/40 bg-warning/10 p-5 space-y-4 shadow-md"
        >
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-warning/20 text-warning mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-warning">
                {inactiveUsers} Idle User{inactiveUsers === 1 ? "" : "s"} Detected
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Learners or instructors who haven't signed in for over 48 hours. Consider issuing an
                engagement nudge.
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="self-end border-warning/40 text-warning hover:bg-warning/10 cursor-pointer"
          >
            <Link to="/admin/users">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Manage Idle Users
            </Link>
          </Button>
        </motion.div>

        {/* Certificate Review Queue Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col justify-between rounded-2xl border border-primary/40 bg-primary/10 p-5 space-y-4 shadow-md"
        >
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-primary/20 text-primary animate-pulse-glow mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {pendingCerts} Certificate{pendingCerts === 1 ? "" : "s"} Awaiting Approval
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Course completion verifications requested by instructors ready for final admin
                authorization.
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="self-end gradient-primary text-primary-foreground border-0 glow cursor-pointer"
          >
            <Link to="/admin/certificates">
              Review Queue
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* ── Live Telemetry & Feed Grid ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Users Stream */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-base font-semibold">Live Users Stream</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                {liveUsersCount} Online Now
              </span>
            </div>

            {onlineUsersList.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-9 w-9 text-muted-foreground/40 mb-3" />
                <div className="font-medium text-sm">No other active users</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active sessions will appear here as users engage with the LMS.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {onlineUsersList.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl p-3 bg-secondary/30 hover:bg-secondary/60 border border-border/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-primary/20 text-primary font-bold text-xs grid place-items-center uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate text-foreground">
                            {u.name}
                          </span>
                          {u.id === user?.id && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className={`text-[10px] capitalize ${roleBadges[u.role] || ""}`}>
                        {u.role}
                      </Badge>
                      <span className="text-[10px] font-mono text-emerald-400 font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground">
            <span>Real-time session telemetry</span>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs cursor-pointer">
              <Link to="/admin/users">
                View All Users <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </GlassCard>

        {/* System Activity Telemetry Timeline */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold">Live Activity Telemetry</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2.5 py-1 rounded-full border border-border/60">
                Max 20 events
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="mx-auto h-9 w-9 text-muted-foreground/40 mb-3" />
                <div className="font-medium text-sm">No activity recorded yet</div>
                <p className="text-xs text-muted-foreground mt-1">
                  System events and admin notifications will stream here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {recentActivity.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-xl p-3 bg-secondary/30 hover:bg-secondary/60 border border-border/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-primary/15 text-primary text-xs font-bold">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{n.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{n.message}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0 ml-4">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground">
            <span>Automated event stream</span>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs cursor-pointer">
              <Link to="/admin/analytics">
                Full Analytics <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
