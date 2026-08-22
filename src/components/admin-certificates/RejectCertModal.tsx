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
import type { Certificate } from "@/lib/mock-data";

interface RejectCertModalProps {
  rejecting: Certificate | null;
  setRejecting: (c: Certificate | null) => void;
  reason: string;
  setReason: (r: string) => void;
  studentName: string;
  handleReject: () => void;
}

export function RejectCertModal({
  rejecting,
  setRejecting,
  reason,
  setReason,
  studentName,
  handleReject,
}: RejectCertModalProps) {
  return (
    <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Certificate Request</DialogTitle>
          <DialogDescription>
            Provide feedback explaining why the certificate request for{" "}
            <strong>{studentName}</strong> is being rejected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="reject-reason">Reason / Feedback for Student</Label>
          <Textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Please re-take the final quiz or complete all assigned lab exercises..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setRejecting(null)}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Reject Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
