import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContentItem, VideoCheckpoint } from "@/lib/data-store";

interface CheckpointDialogProps {
  checkpointVideoItem: ContentItem | null;
  setCheckpointVideoItem: (item: ContentItem | null) => void;
  itemCheckpoints: VideoCheckpoint[];
  editingCheckpointId: string | null;
  cpTimestamp: string;
  setCpTimestamp: (v: string) => void;
  cpType: "mcq" | "truefalse" | "short";
  setCpType: (v: "mcq" | "truefalse" | "short") => void;
  cpPrompt: string;
  setCpPrompt: (v: string) => void;
  cpOptions: string[];
  setCpOptions: (v: string[]) => void;
  cpCorrectIndex: string;
  setCpCorrectIndex: (v: string) => void;
  cpCorrectText: string;
  setCpCorrectText: (v: string) => void;
  handleEditCheckpoint: (cp: any) => void;
  handleSaveCheckpoint: (e: React.FormEvent) => void;
  resetCheckpointForm: () => void;
  deleteCheckpoint: (id: string) => void;
}

export function CheckpointDialog({
  checkpointVideoItem,
  setCheckpointVideoItem,
  itemCheckpoints,
  editingCheckpointId,
  cpTimestamp,
  setCpTimestamp,
  cpType,
  setCpType,
  cpPrompt,
  setCpPrompt,
  cpOptions,
  setCpOptions,
  cpCorrectIndex,
  setCpCorrectIndex,
  cpCorrectText,
  setCpCorrectText,
  handleEditCheckpoint,
  handleSaveCheckpoint,
  resetCheckpointForm,
  deleteCheckpoint,
}: CheckpointDialogProps) {
  return (
    <Dialog
      open={!!checkpointVideoItem}
      onOpenChange={(open) => !open && setCheckpointVideoItem(null)}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Video Checkpoints: {checkpointVideoItem?.title}</DialogTitle>
          <DialogDescription>
            Create questions that pause the video at a specific timestamp. Students must answer
            correctly to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 py-4">
          {/* Left side: List of checkpoints */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Checkpoints ({itemCheckpoints.length})
            </h4>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {itemCheckpoints.map((cp) => {
                const m = Math.floor(cp.timestamp / 60);
                const s = cp.timestamp % 60;
                const timeStr = `${m}:${String(s).padStart(2, "0")}`;
                return (
                  <div
                    key={cp.id}
                    className="p-3.5 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/30 transition flex flex-col gap-2 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="gradient-primary border-0 text-[10px] px-1.5 py-0.5">
                          {timeStr}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {cp.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditCheckpoint(cp)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteCheckpoint(cp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-foreground line-clamp-2">{cp.prompt}</p>
                    {cp.type === "mcq" && cp.options && (
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        {cp.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={idx === cp.correctIndex ? "text-primary font-bold" : ""}
                          >
                            {idx + 1}. {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {cp.type === "truefalse" && (
                      <div className="text-[10px] text-muted-foreground">
                        Correct:{" "}
                        <span className="text-primary font-bold">
                          {cp.correctIndex === 0 ? "True" : "False"}
                        </span>
                      </div>
                    )}
                    {cp.type === "short" && (
                      <div className="text-[10px] text-muted-foreground">
                        Answer: <span className="text-primary font-bold">{cp.correctText}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {itemCheckpoints.length === 0 && (
                <div className="text-center py-12 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  No checkpoints set for this video yet.
                </div>
              )}
            </div>
          </div>

          {/* Right side: Add/Edit Form */}
          <form
            onSubmit={handleSaveCheckpoint}
            className="space-y-4 border-l border-border pl-0 md:pl-6"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              {editingCheckpointId ? "Edit Checkpoint" : "Add Checkpoint"}
            </h4>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cpTime" className="text-xs">
                    Timestamp (MM:SS or Sec)
                  </Label>
                  <Input
                    id="cpTime"
                    value={cpTimestamp}
                    onChange={(e) => setCpTimestamp(e.target.value)}
                    placeholder="e.g. 1:15 or 75"
                    required
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Question Type</Label>
                  <Select
                    value={cpType}
                    onValueChange={(v: any) => {
                      setCpType(v);
                      setCpCorrectIndex("0");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="truefalse">True / False</SelectItem>
                      <SelectItem value="short">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpPrompt" className="text-xs">
                  Question / Prompt
                </Label>
                <Textarea
                  id="cpPrompt"
                  value={cpPrompt}
                  onChange={(e) => setCpPrompt(e.target.value)}
                  placeholder="Enter the question here..."
                  rows={2}
                  required
                  className="text-xs"
                />
              </div>

              {cpType === "mcq" && (
                <div className="space-y-2">
                  <Label className="text-xs">Options</Label>
                  <div className="grid gap-2">
                    {cpOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-[10px] text-muted-foreground w-4">{idx + 1}.</span>
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...cpOptions];
                            newOpts[idx] = e.target.value;
                            setCpOptions(newOpts);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          required
                          className="text-xs h-8 flex-1"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 mt-2">
                    <Label className="text-xs">Correct Index</Label>
                    <Select value={cpCorrectIndex} onValueChange={setCpCorrectIndex}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cpOptions.map((_, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            Option {idx + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {cpType === "truefalse" && (
                <div className="space-y-1">
                  <Label className="text-xs">Correct Answer</Label>
                  <Select value={cpCorrectIndex} onValueChange={setCpCorrectIndex}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">True</SelectItem>
                      <SelectItem value="1">False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cpType === "short" && (
                <div className="space-y-1">
                  <Label htmlFor="cpCorrectText" className="text-xs">
                    Correct Answer (Case insensitive)
                  </Label>
                  <Input
                    id="cpCorrectText"
                    value={cpCorrectText}
                    onChange={(e) => setCpCorrectText(e.target.value)}
                    placeholder="e.g. react"
                    required
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {editingCheckpointId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetCheckpointForm}
                  className="h-8 text-xs"
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                className="gradient-primary text-primary-foreground border-0 glow h-8 text-xs"
              >
                {editingCheckpointId ? "Update Checkpoint" : "Add Checkpoint"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
