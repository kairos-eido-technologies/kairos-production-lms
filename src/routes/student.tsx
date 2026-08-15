import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/student")({ component: StudentLayout });

function StudentLayout() {
  const { user, isInitialized, initializeSession } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isStudentRoute = pathname.startsWith("/student");
  const isTeacherOrAdminPreview =
    (user?.role === "teacher" || user?.role === "admin") && isStudentRoute;

  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
      return;
    }
    if (!user) {
      nav({ to: "/login" });
    } else if (user.isEmailVerified === false) {
      nav({ to: "/verify-email" });
    } else if (isStudentRoute && user.role !== "student" && !isTeacherOrAdminPreview) {
      nav({ to: `/${user.role}` as any });
    }
  }, [user, isInitialized, nav, isStudentRoute, isTeacherOrAdminPreview, initializeSession]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user || user.isEmailVerified === false) return null;
  if (isStudentRoute && user.role !== "student" && !isTeacherOrAdminPreview) return null;

  return <AppShell><Outlet /></AppShell>;
}
