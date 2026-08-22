import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, isInitialized, initializeSession } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
      return;
    }
    if (!user) nav({ to: "/login" });
    else if (user.isEmailVerified === false) nav({ to: "/verify-email" });
    else if (user.role !== "admin") nav({ to: `/${user.role}` as any });
  }, [user, isInitialized, nav, initializeSession]);

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

  if (!user || user.isEmailVerified === false || user.role !== "admin") return null;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
