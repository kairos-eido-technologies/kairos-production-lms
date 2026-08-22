import { useState, useMemo } from "react";
import { Megaphone, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/data-store";

export function StudentCourseAnnouncements({ courseId }: { courseId: string }) {
  const { announcements } = useData();
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const courseAnns = useMemo(() => {
    return announcements
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, courseId]);

  const totalPages = Math.ceil(courseAnns.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedAnns = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return courseAnns.slice(start, start + ITEMS_PER_PAGE);
  }, [courseAnns, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Course Announcements</h3>
      </div>

      {courseAnns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No announcements have been posted for this course yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {paginatedAnns.map((ann) => (
              <div
                key={ann.id}
                className={`p-5 rounded-2xl border transition ${
                  ann.isPinned
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-secondary/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    {ann.isPinned && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary bg-primary/5 flex items-center gap-1 text-[10px]"
                      >
                        <Pin className="h-3 w-3 shrink-0" /> Pinned
                      </Badge>
                    )}
                    <h4 className="text-sm font-bold text-foreground leading-snug">{ann.title}</h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {ann.body}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, courseAnns.length)} of {courseAnns.length}{" "}
                announcements
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="font-semibold text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
