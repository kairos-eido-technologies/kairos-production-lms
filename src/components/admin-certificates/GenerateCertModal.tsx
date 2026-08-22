import React from "react";
import { Search, Award } from "lucide-react";
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
import type { User, Course } from "@/lib/data-store";

interface GenerateCertModalProps {
  isGenerating: boolean;
  setIsGenerating: (open: boolean) => void;
  genStudentId: string;
  setGenStudentId: (id: string) => void;
  genCourseId: string;
  setGenCourseId: (id: string) => void;
  studentSearch: string;
  setStudentSearch: (q: string) => void;
  courseSearch: string;
  setCourseSearch: (q: string) => void;
  genScore: number;
  setGenScore: (s: number) => void;
  genNote: string;
  setGenNote: (n: string) => void;
  filteredStudents: User[];
  filteredCourses: Course[];
  handleGenerate: (e: React.FormEvent) => void;
}

export function GenerateCertModal({
  isGenerating,
  setIsGenerating,
  genStudentId,
  setGenStudentId,
  genCourseId,
  setGenCourseId,
  studentSearch,
  setStudentSearch,
  courseSearch,
  setCourseSearch,
  genScore,
  setGenScore,
  genNote,
  setGenNote,
  filteredStudents,
  filteredCourses,
  handleGenerate,
}: GenerateCertModalProps) {
  return (
    <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Generate Direct Certificate
          </DialogTitle>
          <DialogDescription>
            Directly issue an authentic, verifiable certificate of completion to a student.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-4 py-2">
          {/* Student Search & Select */}
          <div className="space-y-2">
            <Label>1. Select Recipient Student</Label>
            <div className="relative mb-1.5">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search student by name or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-secondary/30"
              />
            </div>
            <Select value={genStudentId} onValueChange={setGenStudentId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose student..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {filteredStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Search & Select */}
          <div className="space-y-2">
            <Label>2. Select Completed Course</Label>
            <div className="relative mb-1.5">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search course name or code..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-secondary/30"
              />
            </div>
            <Select value={genCourseId} onValueChange={setGenCourseId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose course..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {filteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.thumbnail} {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genScore">Final Grade / Score (%)</Label>
              <Input
                id="genScore"
                type="number"
                min={0}
                max={100}
                value={genScore}
                onChange={(e) => setGenScore(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genNote">Instructor Note (Optional)</Label>
              <Input
                id="genNote"
                placeholder="e.g. Completed with Distinction"
                value={genNote}
                onChange={(e) => setGenNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsGenerating(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-primary text-primary-foreground border-0 glow"
            >
              Generate & Issue Certificate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
