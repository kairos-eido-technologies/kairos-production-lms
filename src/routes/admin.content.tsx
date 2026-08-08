import { createFileRoute } from "@tanstack/react-router";
import { ContentBuilder } from "./teacher.content";

export const Route = createFileRoute("/admin/content")({
  component: ContentBuilder,
});
