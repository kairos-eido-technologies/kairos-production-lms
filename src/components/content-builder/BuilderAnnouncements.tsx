import React from "react";
import { Plus, Megaphone, Pin, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Announcement } from "@/lib/data-store";

interface BuilderAnnouncementsProps {
  courseAnnouncements: Announcement[];
  isComposingAnn: boolean;
  setIsComposingAnn: (v: boolean) => void;
  annTitle: string;
  setAnnTitle: (v: string) => void;
  annBody: string;
  setAnnBody: (v: string) => void;
  annPinned: boolean;
  setAnnPinned: (v: boolean) => void;
  handlePostAnnouncement: (e: React.FormEvent) => void;
  deleteAnnouncement: (id: string) => void;
}

export function BuilderAnnouncements({
  courseAnnouncements,
  isComposingAnn,
  setIsComposingAnn,
  annTitle,
  setAnnTitle,
  annBody,
  setAnnBody,
  annPinned,
  setAnnPinned,
  handlePostAnnouncement,
  deleteAnnouncement,
}: BuilderAnnouncementsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Course Broadcasts & Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Post updates, schedule changes, and alerts to all enrolled students.
          </p>
        </div>
        {!isComposingAnn && (
          <Button
            onClick={() => setIsComposingAnn(true)}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        )}
      </div>

      {isComposingAnn && (
        <GlassCard className="p-6 border-primary/30">
          <form onSubmit={handlePostAnnouncement} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Compose Broadcast Announcement
            </h3>
            <div>
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Live Q&A Session Tomorrow at 6 PM"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ann-body">Message Body</Label>
              <Textarea
                id="ann-body"
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Write your announcement details..."
                rows={4}
                required
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ann-pinned"
                checked={annPinned}
                onChange={(e) => setAnnPinned(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="ann-pinned" className="cursor-pointer text-sm font-normal">
                Pin this announcement to top of course
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsComposingAnn(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Post Announcement
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {courseAnnouncements.length === 0 ? (
        <GlassCard className="py-12 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">
            No announcements published for this course yet.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Click "New Announcement" above to broadcast updates to students.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {courseAnnouncements.map((ann) => (
            <GlassCard
              key={ann.id}
              className={`p-5 relative ${ann.isPinned ? "border-amber-500/40 bg-amber-500/5" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {ann.isPinned && (
                      <Badge
                        variant="outline"
                        className="text-amber-400 border-amber-500/40 bg-amber-500/10 gap-1 text-xs"
                      >
                        <Pin className="h-3 w-3" /> PINNED
                      </Badge>
                    )}
                    <h4 className="font-semibold text-base text-foreground">{ann.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.body}</p>
                  <p className="text-xs text-muted-foreground/60 pt-2">
                    {new Date(ann.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteAnnouncement(ann.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
