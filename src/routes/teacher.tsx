import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/teacher")({ component: TeacherLayout });

function TeacherLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) nav({ to: "/login" });
    else if (user.isEmailVerified === false) nav({ to: "/verify-email" });
    else if (user.role !== "teacher") nav({ to: `/${user.role}` as any });
  }, [user, nav]);
  if (!user || user.isEmailVerified === false || user.role !== "teacher") return null;
  return <AppShell><Outlet /></AppShell>;
}
