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
import type { User } from "@/lib/data-store";

interface NudgeUserModalProps {
  nudgeUser: User | null;
  setNudgeUser: (u: User | null) => void;
  nudgeMsg: string;
  setNudgeMsg: (msg: string) => void;
  handleSendNudge: () => void;
}

export function NudgeUserModal({
  nudgeUser,
  setNudgeUser,
  nudgeMsg,
  setNudgeMsg,
  handleSendNudge,
}: NudgeUserModalProps) {
  return (
    <Dialog open={!!nudgeUser} onOpenChange={(open) => !open && setNudgeUser(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Re-engagement Nudge</DialogTitle>
          <DialogDescription>
            Send an email reminder and direct message notification to{" "}
            <strong>{nudgeUser?.name}</strong> to encourage learning progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nudge-body">Custom Reminder Message</Label>
            <Textarea
              id="nudge-body"
              rows={4}
              value={nudgeMsg}
              onChange={(e) => setNudgeMsg(e.target.value)}
              placeholder="Enter personalized motivation or check-in notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setNudgeUser(null)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendNudge}
            className="gradient-primary text-primary-foreground border-0"
          >
            Send Nudge Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
