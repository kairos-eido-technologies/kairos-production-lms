import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, BookOpen, BarChart3, Award, FileEdit, ClipboardCheck,
  GraduationCap, MessageSquare, Bell, Search, ChevronLeft, LogOut, Settings, FileCheck,
  Inbox, ShieldCheck, UserCheck, Calendar, Sun, Moon,
} from "lucide-react";
import { Logo } from "./Logo";
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

const navByRole = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users", icon: Users },
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
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout, initializeSession } = useAuth();
  const { notifications, messages, markAllNotifsRead, markNotifRead } = useData();
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

  // Refresh data on route transitions/navigation
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [pathname, user]);

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
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="sticky top-0 h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
          <Logo collapsed={collapsed} />
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {items.map((it) => {
            const exact = (it as { exact?: boolean }).exact;
            const active = exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-primary/12 text-foreground shadow-sm"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary"
                  />
                )}
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? "text-primary" : "group-hover:text-sidebar-foreground"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{it.label}</span>
                )}
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 rounded-md bg-popover border border-border text-xs text-popover-foreground shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                    {it.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-150"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-250 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 glass-strong flex items-center justify-between gap-4 px-6">
          {/* Search */}
          <form onSubmit={onSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
          </form>

          {/* Right controls */}
          <div className="flex items-center gap-1 ml-auto">
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
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
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
              <PopoverContent align="end" className="w-80 p-0 shadow-card">
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
              <DropdownMenuContent align="end" className="w-48 shadow-card">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 p-6 lg:p-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
