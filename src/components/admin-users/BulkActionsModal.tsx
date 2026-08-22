import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Course } from "@/lib/data-store";

interface BulkCourseModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedCount: number;
  courses: Course[];
  selectedCourse: string;
  setSelectedCourse: (c: string) => void;
  accessMode: "lifetime" | "limited";
  setAccessMode: (mode: "lifetime" | "limited") => void;
  endDate: string;
  setEndDate: (date: string) => void;
  handleBulkAssignCourse: () => void;
}

export function BulkCourseModal({
  open,
  setOpen,
  selectedCount,
  courses,
  selectedCourse,
  setSelectedCourse,
  accessMode,
  setAccessMode,
  endDate,
  setEndDate,
  handleBulkAssignCourse,
}: BulkCourseModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Assign Course</DialogTitle>
          <DialogDescription>
            Assign a course to {selectedCount} selected student{selectedCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Select Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Access Duration</Label>
            <RadioGroup
              value={accessMode}
              onValueChange={(val: any) => setAccessMode(val)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lifetime" id="bulk-life" />
                <Label htmlFor="bulk-life" className="font-normal cursor-pointer text-xs">
                  Lifetime Access (No expiration)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="limited" id="bulk-limit" />
                <Label htmlFor="bulk-limit" className="font-normal cursor-pointer text-xs">
                  Limited Duration (Set expiry date)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {accessMode === "limited" && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="bulk-date" className="text-xs">
                Expiration End Date
              </Label>
              <Input
                id="bulk-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkAssignCourse}
            className="gradient-primary text-primary-foreground border-0"
          >
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BulkGroupModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedCount: number;
  targetGroup: string;
  setTargetGroup: (g: string) => void;
  handleBulkAssignGroup: () => void;
}

export function BulkGroupModal({
  open,
  setOpen,
  selectedCount,
  targetGroup,
  setTargetGroup,
  handleBulkAssignGroup,
}: BulkGroupModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Batch / Group</DialogTitle>
          <DialogDescription>
            Assign a batch or group name to {selectedCount} selected user
            {selectedCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="target-group">Batch / Group Name</Label>
            <Input
              id="target-group"
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              placeholder="e.g. Batch 2026-A, Section 1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkAssignGroup}
            className="gradient-primary text-primary-foreground border-0"
          >
            Save Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
