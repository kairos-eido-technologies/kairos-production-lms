import { Button } from "@/components/ui/button";
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

interface BulkImportDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  importJson: string;
  setImportJson: (json: string) => void;
  handleImport: () => void;
}

export function BulkImportDialog({
  open,
  setOpen,
  importJson,
  setImportJson,
  handleImport,
}: BulkImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Questions (JSON Format)</DialogTitle>
          <DialogDescription>
            Paste a JSON array of questions to add multiple items simultaneously.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="json-input">JSON Payload</Label>
          <Textarea
            id="json-input"
            rows={10}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={`[
  {
    "type": "mcq",
    "prompt": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctIndex": 1,
    "points": 5
  }
]`}
            className="font-mono text-xs"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            className="gradient-primary text-primary-foreground border-0"
          >
            Import Questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
