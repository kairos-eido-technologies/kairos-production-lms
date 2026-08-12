import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, GraduationCap, BookOpen, Award, UserPlus, BookPlus, AlertCircle,
  Inbox, Clock, LayoutDashboard, BarChart3, FileEdit, ShieldCheck, UserCheck,
  Calendar, MessageSquare, Radio,
} from "lucide-react";
import { PageHeader, StatCard, GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useData, isUserInactive } from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { motion } from "framer-motion";

import { AppLaunchpad } from "@/components/AppLaunchpad";

const ADMIN_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/mission-control", label: "Mission Control", icon: Radio },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/assign", label: "Enroll Students", icon: UserCheck },
  { to: "/admin/content", label: "Content Builder", icon: FileEdit },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/verify", label: "Verify Certificate", icon: ShieldCheck },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/calendar", label: "Calendar", icon: Calendar },
] as const;

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="py-4">
      {/* Pure OS-Style App Suite Launchpad */}
      <AppLaunchpad items={ADMIN_ITEMS} userRole="admin" userName={user?.name ?? "Admin"} />
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
