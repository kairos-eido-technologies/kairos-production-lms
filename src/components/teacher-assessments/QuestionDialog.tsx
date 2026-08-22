import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { QuestionType } from "@/lib/data-store";

export type QuestionDraft = {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  correctAnswer: string;
  points: number;
};

interface QuestionDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  editingId: string | null;
  draft: QuestionDraft;
  setDraft: React.Dispatch<React.SetStateAction<QuestionDraft>>;
  typeLabel: Record<QuestionType, string>;
  saveQuestion: () => void;
}

export function QuestionDialog({
  open,
  setOpen,
  editingId,
  draft,
  setDraft,
  typeLabel,
  saveQuestion,
}: QuestionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Question" : "Add Question"}</DialogTitle>
          <DialogDescription>
            {editingId
              ? "Update question prompt, options, and points."
              : "Compose a new quiz question."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={draft.type}
                onValueChange={(val: any) =>
                  setDraft({
                    ...draft,
                    type: val,
                    options: val === "mcq" ? ["Option A", "Option B", "Option C", "Option D"] : [],
                    correctIndex: 0,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeLabel) as QuestionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabel[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points Awarded</Label>
              <Input
                id="points"
                type="number"
                min={1}
                value={draft.points}
                onChange={(e) =>
                  setDraft({ ...draft, points: Math.max(1, Number(e.target.value)) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Question Prompt</Label>
            <Textarea
              id="prompt"
              rows={3}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              placeholder="What is the primary function of...?"
            />
          </div>

          {draft.type === "mcq" && (
            <div className="space-y-3">
              <Label>Options & Correct Answer</Label>
              {draft.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-opt"
                    checked={draft.correctIndex === idx}
                    onChange={() => setDraft({ ...draft, correctIndex: idx })}
                    className="h-4 w-4 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...draft.options];
                      newOpts[idx] = e.target.value;
                      setDraft({ ...draft, options: newOpts });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          {draft.type === "truefalse" && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="tf-opt"
                    checked={draft.correctIndex === 0}
                    onChange={() => setDraft({ ...draft, correctIndex: 0 })}
                  />
                  True
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="tf-opt"
                    checked={draft.correctIndex === 1}
                    onChange={() => setDraft({ ...draft, correctIndex: 1 })}
                  />
                  False
                </label>
              </div>
            </div>
          )}

          {draft.type === "short" && (
            <div className="space-y-2">
              <Label htmlFor="short-ans">Expected Correct Answer (Keywords)</Label>
              <Input
                id="short-ans"
                value={draft.correctAnswer}
                onChange={(e) => setDraft({ ...draft, correctAnswer: e.target.value })}
                placeholder="e.g. photosynthesis, react hook"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={saveQuestion}
            className="gradient-primary text-primary-foreground border-0"
          >
            {editingId ? "Save Changes" : "Add Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
