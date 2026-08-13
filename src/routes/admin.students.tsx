import { createFileRoute } from "@tanstack/react-router";
import { TeacherStudents } from "@/components/TeacherStudents";

export const Route = createFileRoute("/admin/students")({
  component: TeacherStudents,
});
