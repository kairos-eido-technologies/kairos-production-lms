import { createFileRoute } from "@tanstack/react-router";
import { ContentBuilder } from "@/components/ContentBuilder";

export const Route = createFileRoute("/teacher/content")({
  component: ContentBuilder,
});
