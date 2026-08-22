import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadButton } from "@/components/FileUploadButton";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { ContentType, Assessment, Course } from "@/lib/data-store";

export type ItemDraft = {
  type: ContentType;
  title: string;
  url: string;
  duration: string;
  fileSize: string;
  body: string;
  assessmentId: string;
};

interface ItemEditorDialogProps {
  itemDialog: boolean;
  setItemDialog: (open: boolean) => void;
  editingItemId: string | null;
  itemDraft: ItemDraft;
  setItemDraft: React.Dispatch<React.SetStateAction<ItemDraft>>;
  typeMeta: Record<ContentType, { icon: any; label: string; color: string }>;
  pickableAssessments: Assessment[];
  courses: Course[];
  courseId: string;
  fileSizeLabel: (bytes: number) => string;
  saveItem: () => void;
}

export function ItemEditorDialog({
  itemDialog,
  setItemDialog,
  editingItemId,
  itemDraft,
  setItemDraft,
  typeMeta,
  pickableAssessments,
  courses,
  courseId,
  fileSizeLabel,
  saveItem,
}: ItemEditorDialogProps) {
  return (
    <Dialog open={itemDialog} onOpenChange={setItemDialog}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto transition-all ${
          itemDraft.type === "reading" || itemDraft.type === "lab"
            ? "max-w-4xl sm:max-w-5xl"
            : "max-w-2xl"
        }`}
      >
        <DialogHeader>
          <DialogTitle>{editingItemId ? "Edit content" : "Add content"}</DialogTitle>
          <DialogDescription>Choose a content type and fill in the details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={itemDraft.type}
              onValueChange={(v) =>
                setItemDraft({
                  ...itemDraft,
                  type: v as ContentType,
                  url: "",
                  body: "",
                  assessmentId: "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(typeMeta) as ContentType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeMeta[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ititle">Title</Label>
            <Input
              id="ititle"
              value={itemDraft.title}
              onChange={(e) => setItemDraft({ ...itemDraft, title: e.target.value })}
              placeholder="e.g. Welcome & Overview"
            />
          </div>
          {itemDraft.type === "reading" ? (
            <div className="space-y-2">
              <Label htmlFor="ibody" className="font-semibold text-sm">
                Reading content (Document Editor)
              </Label>
              <RichTextEditor
                value={itemDraft.body}
                onChange={(html) => setItemDraft({ ...itemDraft, body: html })}
                placeholder="Type or paste your reading material here — format headings, text colours, bullet points, and code blocks..."
                minHeight={380}
              />
            </div>
          ) : itemDraft.type === "lab" ? (
            <div className="space-y-4 rounded-xl border border-border/80 bg-secondary/20 p-4">
              <div>
                <Label className="font-semibold text-sm">Lab Material Options</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload a PDF lab sheet, PowerPoint presentation, write Reading instructions, or
                  provide a URL.
                </p>
              </div>

              <div className="space-y-4">
                {/* File Uploads for PDF / PPT */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    Option 1: Upload Lab Document / Presentation
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <FileUploadButton
                      accept="application/pdf"
                      label="Upload Lab PDF (.pdf)"
                      onUpload={(dataUrl, file) =>
                        setItemDraft((d) => ({
                          ...d,
                          url: dataUrl,
                          fileSize: fileSizeLabel(file.size),
                          title: d.title || file.name,
                        }))
                      }
                    />
                    <FileUploadButton
                      accept=".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      label="Upload Lab Presentation (.ppt, .pptx)"
                      onUpload={(dataUrl, file) =>
                        setItemDraft((d) => ({
                          ...d,
                          url: dataUrl,
                          fileSize: fileSizeLabel(file.size),
                          title: d.title || file.name,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="iurl" className="text-xs font-semibold">
                    Option 2: Lab Embed / Website URL
                  </Label>
                  <Input
                    id="iurl"
                    value={itemDraft.url}
                    onChange={(e) => setItemDraft({ ...itemDraft, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                {/* Rich Text Editor for Lab Reading Instructions */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label htmlFor="ibody" className="text-xs font-semibold">
                    Option 3: Write Lab Reading Material / Instructions
                  </Label>
                  <RichTextEditor
                    value={itemDraft.body}
                    onChange={(html) => setItemDraft({ ...itemDraft, body: html })}
                    placeholder="Write lab instructions, steps, requirements, and notes here..."
                    minHeight={280}
                  />
                </div>
              </div>
            </div>
          ) : itemDraft.type === "assessment" ? (
            <div className="space-y-2">
              <Label>Assignment / Quiz</Label>
              <Select
                value={itemDraft.assessmentId}
                onValueChange={(v) => setItemDraft({ ...itemDraft, assessmentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an assignment or quiz" />
                </SelectTrigger>
                <SelectContent>
                  {pickableAssessments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                      {a.isFinal ? " · Final Test" : " · Assessment / Quiz"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pickableAssessments.length === 0 && (
                <p className="text-xs text-amber-500/90 dark:text-amber-400 mt-1">
                  No assignments or quizzes found for this course. Please create an assessment for this course from the Assignments &amp; Quizzes page first.
                </p>
              )}
            </div>
          ) : itemDraft.type === "video" ? (
            <div className="space-y-3">
              <Label htmlFor="iurl" className="font-semibold text-sm flex items-center justify-between">
                <span>YouTube Video Link</span>
                <span className="text-[11px] font-normal text-muted-foreground">Paste unlisted / public URL</span>
              </Label>
              <Input
                id="iurl"
                value={itemDraft.url}
                onChange={(e) => setItemDraft({ ...itemDraft, url: e.target.value })}
                placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="bg-secondary/30"
              />
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 dark:bg-sky-950/40 p-4 text-xs text-sky-950 dark:text-sky-200 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 font-semibold text-sky-900 dark:text-sky-100">
                  <span className="text-base">📹</span>
                  <span>Video Upload Instructions:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-sky-900/90 dark:text-sky-200/90 text-xs leading-relaxed">
                  <li>
                    Upload your lesson video to <strong>YouTube Studio</strong> (<a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="underline font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100">studio.youtube.com</a>).
                  </li>
                  <li>
                    Set the video visibility to <strong>Unlisted</strong> (this keeps it private from public search and only accessible to enrolled students in this course).
                  </li>
                  <li>
                    Copy the video link (e.g. <code className="bg-sky-200/70 dark:bg-black/50 px-1.5 py-0.5 rounded text-sky-950 dark:text-sky-300 font-mono text-[11px]">https://youtu.be/xyz</code> or <code className="bg-sky-200/70 dark:bg-black/50 px-1.5 py-0.5 rounded text-sky-950 dark:text-sky-300 font-mono text-[11px]">https://www.youtube.com/watch?v=xyz</code>) and paste it in the box above.
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="iurl">Resource URL / Upload</Label>
              <Input
                id="iurl"
                value={itemDraft.url}
                onChange={(e) => setItemDraft({ ...itemDraft, url: e.target.value })}
                placeholder="https://..."
              />
              {(["pdf", "image", "ppt", "download"] as ContentType[]).includes(
                itemDraft.type,
              ) && (
                <>
                  <FileUploadButton
                    accept={
                      itemDraft.type === "image"
                        ? "image/*"
                        : itemDraft.type === "ppt"
                          ? ".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                          : itemDraft.type === "pdf"
                            ? "application/pdf"
                            : "*/*"
                    }
                    label={`Upload ${typeMeta[itemDraft.type].label}`}
                    onUpload={(dataUrl, file) =>
                      setItemDraft((d) => ({
                        ...d,
                        url: dataUrl,
                        fileSize: fileSizeLabel(file.size),
                        title: d.title || file.name,
                      }))
                    }
                  />
                  {itemDraft.type === "ppt" && (
                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-center gap-1.5 mt-1.5">
                      <span>💡</span>{" "}
                      <span>
                        <strong>Recommendation:</strong> Convert your presentation to{" "}
                        <strong>PDF format</strong> before uploading for best slide viewing
                        performance across all devices.
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {(itemDraft.type === "video" || itemDraft.type === "lab") && (
              <div className="space-y-2">
                <Label htmlFor="idur">Duration (min)</Label>
                <Input
                  id="idur"
                  type="number"
                  value={itemDraft.duration}
                  onChange={(e) => setItemDraft({ ...itemDraft, duration: e.target.value })}
                  placeholder="12"
                />
              </div>
            )}
            {(["pdf", "download", "image", "ppt"] as ContentType[]).includes(itemDraft.type) && (
              <div className="space-y-2">
                <Label htmlFor="isize">File size</Label>
                <Input
                  id="isize"
                  value={itemDraft.fileSize}
                  onChange={(e) => setItemDraft({ ...itemDraft, fileSize: e.target.value })}
                  placeholder="2.4 MB"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setItemDialog(false)}>
            Cancel
          </Button>
          <Button onClick={saveItem} className="gradient-primary text-primary-foreground border-0">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
