import React, { useState, useEffect } from "react";
import { StickyNote, Plus, Trash2, Download, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface NoteItem {
  id: string;
  timestamp: string;
  lessonId: string;
  lessonTitle: string;
  content: string;
  createdAt: number;
}

interface StudentNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  courseId: string;
  courseTitle: string;
  currentLessonId?: string;
  currentLessonTitle?: string;
}

export function StudentNotesDrawer({
  isOpen,
  onClose,
  userId,
  courseId,
  courseTitle,
  currentLessonId = "",
  currentLessonTitle = "General Notes",
}: StudentNotesDrawerProps) {
  const storageKey = `student_notes:${userId}:${courseId}`;
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNote, setNewNote] = useState("");

  // Load saved notes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setNotes(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Save notes
  const saveNotes = (updated: NoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const item: NoteItem = {
      id: "note_" + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      lessonId: currentLessonId,
      lessonTitle: currentLessonTitle,
      content: newNote.trim(),
      createdAt: Date.now(),
    };

    const next = [item, ...notes];
    saveNotes(next);
    setNewNote("");
    toast.success("Note saved successfully!");
  };

  const handleDelete = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    saveNotes(next);
    toast.info("Note deleted");
  };

  const handleExport = () => {
    if (notes.length === 0) {
      toast.error("No notes to export");
      return;
    }

    const header = `# Course Notes: ${courseTitle}\nExported on: ${new Date().toLocaleDateString()}\n\n---\n\n`;
    const body = notes
      .map((n) => `### ${n.lessonTitle} (${n.timestamp})\n${n.content}\n`)
      .join("\n---\n\n");

    const blob = new Blob([header + body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseTitle.toLowerCase().replace(/\s+/g, "-")}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported course notes as Markdown!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card/95 backdrop-blur-xl border-l border-border z-50 shadow-2xl flex flex-col animate-slideInRight">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Course Notes</h3>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {notes.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            disabled={notes.length === 0}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Export Notes as Markdown"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Note Input Box */}
      <div className="p-4 border-b border-border bg-background/50">
        <form onSubmit={handleAddNote} className="space-y-2.5">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-primary" />
            <span>
              Adding note for:{" "}
              <strong className="text-foreground truncate">{currentLessonTitle}</strong>
            </span>
          </div>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type your notes, ideas, or questions here..."
            className="text-xs resize-none min-h-[80px] bg-background border-border"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newNote.trim()}
              size="sm"
              className="gradient-primary text-primary-foreground border-0 h-7 text-xs px-3 gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Save Note
            </Button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <StickyNote className="h-8 w-8 mx-auto opacity-40 text-primary" />
            <p className="text-xs">No notes saved yet.</p>
            <p className="text-[11px] text-muted-foreground/70">
              Jot down thoughts while learning to review them anytime.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-xl border border-border/80 bg-card/60 p-3 text-xs space-y-1.5 shadow-xs hover:border-border transition-all"
            >
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-semibold text-primary truncate max-w-[70%]">
                  {note.lessonTitle}
                </span>
                <span>{note.timestamp}</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap text-[11px] leading-relaxed">
                {note.content}
              </p>
              <div className="flex justify-end pt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(note.id)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Note"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
