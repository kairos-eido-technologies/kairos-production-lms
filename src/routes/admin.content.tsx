import { createFileRoute } from "@tanstack/react-router";
import { ContentBuilder } from "@/components/ContentBuilder";

export const Route = createFileRoute("/admin/content")({
  component: ContentBuilder,
});
