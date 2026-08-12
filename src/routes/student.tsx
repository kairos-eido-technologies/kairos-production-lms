import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/student")({ component: StudentLayout });

function StudentLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isStudentRoute = pathname.startsWith("/student");
  const isTeacherOrAdminPreview =
    (user?.role === "teacher" || user?.role === "admin") && isStudentRoute;

  useEffect(() => {
    if (!user) {
      nav({ to: "/login" });
    } else if (user.isEmailVerified === false) {
      nav({ to: "/verify-email" });
    } else if (isStudentRoute && user.role !== "student" && !isTeacherOrAdminPreview) {
      nav({ to: `/${user.role}` as any });
    }
  }, [user, nav, isStudentRoute, isTeacherOrAdminPreview]);

  if (!user || user.isEmailVerified === false) return null;
  if (isStudentRoute && user.role !== "student" && !isTeacherOrAdminPreview) return null;

  return <AppShell><Outlet /></AppShell>;
}
