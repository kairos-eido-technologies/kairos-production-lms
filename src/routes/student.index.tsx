import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, BarChart3, Award, MessageSquare, Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { AppLaunchpad } from "@/components/AppLaunchpad";

const STUDENT_ITEMS = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/student/courses", label: "My Courses", icon: BookOpen },
  { to: "/student/progress", label: "Progress", icon: BarChart3 },
  { to: "/student/certificates", label: "Certificates", icon: Award },
  { to: "/student/messages", label: "Messages", icon: MessageSquare },
  { to: "/student/calendar", label: "Calendar", icon: Calendar },
] as const;

export const Route = createFileRoute("/student/")({ component: StudentDashboard });

function StudentDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-4">
      {/* Pure OS-Style App Suite Launchpad */}
      <AppLaunchpad items={STUDENT_ITEMS} userRole="student" userName={user.name} />
    </div>
  );
}
