import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, FileEdit, ClipboardCheck, Users, FileCheck,
  ShieldCheck, MessageSquare, Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { AppLaunchpad } from "@/components/AppLaunchpad";

const TEACHER_ITEMS = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/teacher/content", label: "Content Builder", icon: FileEdit },
  { to: "/teacher/assessments", label: "Assignments & Quizzes", icon: ClipboardCheck },
  { to: "/teacher/students", label: "Student Progress", icon: Users },
  { to: "/teacher/certificates", label: "Certificate Requests", icon: FileCheck },
  { to: "/verify", label: "Verify Certificate", icon: ShieldCheck },
  { to: "/teacher/messages", label: "Messages", icon: MessageSquare },
  { to: "/teacher/calendar", label: "Calendar", icon: Calendar },
] as const;

export const Route = createFileRoute("/teacher/")({ component: TeacherDashboard });

function TeacherDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="py-4">
      {/* Pure OS-Style App Suite Launchpad */}
      <AppLaunchpad items={TEACHER_ITEMS} userRole="teacher" userName={user.name} />
    </div>
  );
}
