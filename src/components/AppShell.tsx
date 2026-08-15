import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, BookOpen, BarChart3, Award, FileEdit, ClipboardCheck,
  MessageSquare, Bell, Search, LogOut, ShieldCheck, UserCheck, Calendar, Sun, Moon,
  FileCheck, Inbox, ArrowLeft, Radio,
} from "lucide-react";
import { Logo } from "./Logo";
import { AppSwitcher, type NavItem } from "./AppSwitcher";
import { AppWatermark } from "./AppWatermark";
import { ParticleLayer } from "@/components/effects/ParticleLayer";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { refreshData } from "@/lib/data-load-init";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme";

const navByRole: Record<"admin" | "teacher" | "student", readonly NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/mission-control", label: "Mission Control", icon: Radio },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/students", label: "Student Progress", icon: Users },
    { to: "/admin/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/assign", label: "Enroll Students", icon: UserCheck },
    { to: "/admin/content", label: "Content Builder", icon: FileEdit },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/certificates", label: "Certificates", icon: Award },
    { to: "/verify", label: "Verify Certificate", icon: ShieldCheck },
    { to: "/admin/messages", label: "Messages", icon: MessageSquare },
    { to: "/admin/calendar", label: "Calendar", icon: Calendar },
  ],
  teacher: [
    { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/teacher/content", label: "Content Builder", icon: FileEdit },
    { to: "/teacher/assessments", label: "Assignments & Quizzes", icon: ClipboardCheck },
    { to: "/teacher/students", label: "Student Progress", icon: Users },
    { to: "/teacher/certificates", label: "Certificate Requests", icon: FileCheck },
    { to: "/verify", label: "Verify Certificate", icon: ShieldCheck },
    { to: "/teacher/messages", label: "Messages", icon: MessageSquare },
    { to: "/teacher/calendar", label: "Calendar", icon: Calendar },
  ],
  student: [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/student/courses", label: "My Courses", icon: BookOpen },
    { to: "/student/progress", label: "Progress", icon: BarChart3 },
    { to: "/student/certificates", label: "Certificates", icon: Award },
    { to: "/student/messages", label: "Messages", icon: MessageSquare },
    { to: "/student/calendar", label: "Calendar", icon: Calendar },
  ],
} as const;

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-secondary/70 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center text-amber-400"
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.7 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center text-primary"
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const { user, logout, initializeSession } = useAuth();
  const notifications = useData((s) => s.notifications);
  const messages = useData((s) => s.messages);
  const markAllNotifsRead = useData((s) => s.markAllNotifsRead);
  const markNotifRead = useData((s) => s.markNotifRead);
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) {
      initializeSession();
    }
  }, [user, initializeSession]);

  // Periodically poll backend for updates, and refresh when user focus returns to the tab
  useEffect(() => {
    if (!user) return;
    refreshData();
    const interval = setInterval(refreshData, 12000); // 12 seconds poll

    const handleFocus = () => {
      refreshData();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [user]);

  const myNotifs = useMemo(
    () => notifications.filter((n) => user && n.userId === user.id),
    [notifications, user],
  );
  const unreadNotifs = myNotifs.filter((n) => !n.read);
  const myMessages = useMemo(
    () => (user ? messages.filter((m) => m.toId === user.id) : []),
    [messages, user],
  );
  const unreadMsgs = myMessages.filter((m) => !m.read).length;

  if (!user) return <>{children}</>;
  const items = navByRole[user.role];

  const handleLogout = async () => { await logout(); nav({ to: "/login" }); };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const q = encodeURIComponent(search.trim());
    if (user.role === "admin") nav({ to: "/admin/users", search: { q } as any });
    else if (user.role === "teacher") nav({ to: "/teacher/students", search: { q } as any });
    else nav({ to: "/student/courses", search: { q } as any });
  };

  const isAssessmentPage = pathname.startsWith("/student/assessments/");

  if (isAssessmentPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <ParticleLayer className="fixed inset-0 pointer-events-none z-0 opacity-40" />
        <AppWatermark />
        <main className="relative z-10 flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  // Active module title
  const activeItem = items.find((it) => (it.exact ? pathname === it.to : pathname.startsWith(it.to)));
  const activeTitle = activeItem ? activeItem.label : "App Suite";

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* ── Background Effects: Particle Layer + iTech Watermark ─────────────────── */}
      <ParticleLayer className="fixed inset-0 pointer-events-none z-0 opacity-45" />
      <AppWatermark />

      {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-16 glass-strong flex items-center justify-between gap-4 px-4 sm:px-6 border-b border-border/60">
        {/* Left: Brand Logo & App Launcher */}
        <div className="flex items-center gap-3">
          <Link to={user.role === "admin" ? "/admin" : user.role === "teacher" ? "/teacher" : "/student"} className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="h-5 w-px bg-border/80 hidden sm:block" />

          {/* Back to Apps Home or Content Builder Button */}
          {((user.role === "admin" || user.role === "teacher") && pathname.startsWith("/student/")) ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const fromSource = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("from") : null;
                const courseIdFromUrl = pathname.split("/student/courses/")[1]?.split("?")[0] || "";
                const basePath = user.role === "admin" ? "/admin/content" : "/teacher/content";
                const targetPath = (fromSource === "list" || !courseIdFromUrl) ? basePath : `${basePath}?courseId=${courseIdFromUrl}`;
                nav({ to: targetPath as any });
              }}
              className="gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-semibold transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-xs">Back to Content Builder</span>
            </Button>
          ) : pathname !== (user.role === "admin" ? "/admin" : user.role === "teacher" ? "/teacher" : "/student") && pathname !== (user.role === "admin" ? "/admin/" : user.role === "teacher" ? "/teacher/" : "/student/") ? (
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="gap-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-all duration-200"
            >
              <Link to={user.role === "admin" ? "/admin" : user.role === "teacher" ? "/teacher" : "/student"}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-xs">Back to Apps</span>
              </Link>
            </Button>
          ) : (
            <AppSwitcher items={items} unreadMsgs={unreadMsgs} />
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Messages */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => nav({ to: user.role === "teacher" ? "/teacher/messages" : user.role === "admin" ? "/admin/messages" : "/student/messages" })}
          >
            <MessageSquare className="h-4 w-4" />
            {unreadMsgs > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-extrabold text-white shadow-md animate-pulse">
                {unreadMsgs > 99 ? "99+" : unreadMsgs}
              </span>
            )}
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadNotifs.length > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground border-0 shadow-sm">
                    {unreadNotifs.length > 9 ? "9+" : unreadNotifs.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-card z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-sm font-semibold">Notifications</div>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={() => markAllNotifsRead(user.id)}
                    className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
                {myNotifs.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    <Inbox className="mx-auto h-6 w-6 mb-2 opacity-40" />
                    No new notifications
                  </div>
                ) : (
                  myNotifs.slice(0, 12).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotifRead(n.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors duration-100 ${
                        n.read ? "opacity-55" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-muted-foreground/70 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-lg pl-1 pr-3 py-1 hover:bg-secondary/60 transition-colors duration-150">
                <Avatar className="h-8 w-8 ring-2 ring-primary/35 ring-offset-1 ring-offset-background">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                    {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold">{user.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{user.role}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-card z-50">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Main Workspace Area ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
