import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/student")({ component: StudentLayout });

function StudentLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) nav({ to: "/login" });
    else if (user.isEmailVerified === false) nav({ to: "/verify-email" });
    else if (user.role !== "student") nav({ to: `/${user.role}` as any });
  }, [user, nav]);
  if (!user || user.isEmailVerified === false || user.role !== "student") return null;
  return <AppShell><Outlet /></AppShell>;
}
