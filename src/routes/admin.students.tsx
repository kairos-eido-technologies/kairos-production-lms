import { createFileRoute } from "@tanstack/react-router";
import { TeacherStudents } from "./teacher.students";

export const Route = createFileRoute("/admin/students")({
  component: TeacherStudents,
});
