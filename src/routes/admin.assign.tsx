import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GraduationCap, BookOpen, Users, Calendar, ShieldCheck, Search, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, CourseThumbnail } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/admin/assign")({
  component: CourseAssignmentPanel,
});

type EnrollmentRow = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  courseThumbnail: string;
  accessMode: "lifetime" | "limited";
  endDate?: string;
};

function CourseAssignmentPanel() {
  const { users, courses, assignCourse, revokeCourse } = useData();

  // Filter students and courses
  const studentsList = useMemo(() => users.filter((u) => u.role === "student"), [users]);
  const activeCourses = useMemo(() => courses.filter((c) => c.status === "active"), [courses]);

  // Form states
  const [enrollTargetType, setEnrollTargetType] = useState<"individual" | "group">("individual");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [accessMode, setAccessMode] = useState<"lifetime" | "limited">("lifetime");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available groups for students
  const availableGroups = useMemo(
    () => Array.from(new Set(studentsList.map((s) => s.group).filter(Boolean))) as string[],
    [studentsList]
  );

  // Student Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  // Course Search states
  const [courseSearch, setCourseSearch] = useState("");
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);

  // Active Enrollments Table Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Filter students based on input
  const filteredStudentsForSelect = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return studentsList;
    return studentsList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.group && s.group.toLowerCase().includes(q))
    );
  }, [studentsList, studentSearch]);

  // Filter courses based on input
  const filteredCoursesForSelect = useMemo(() => {
    const q = courseSearch.toLowerCase().trim();
    if (!q) return activeCourses;
    return activeCourses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [activeCourses, courseSearch]);

  // Revocation Modal state
  const [toRevoke, setToRevoke] = useState<EnrollmentRow | null>(null);

  // Flattened active enrollments list
  const activeEnrollments = useMemo(() => {
    const list: EnrollmentRow[] = [];
    for (const c of courses) {
      for (const sid of c.studentIds) {
        const student = users.find((u) => u.id === sid);
        if (student) {
          const sa = c.studentAccess?.[sid] ?? { accessMode: "lifetime" };
          list.push({
            studentId: sid,
            studentName: student.name,
            studentEmail: student.email,
            courseId: c.id,
            courseName: c.name,
            courseCode: c.code,
            courseThumbnail: c.thumbnail,
            accessMode: sa.accessMode,
            endDate: sa.endDate,
          });
        }
      }
    }
    return list.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [courses, users]);

  // Filter enrollments
  const filteredEnrollments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeEnrollments;
    return activeEnrollments.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.studentEmail.toLowerCase().includes(q) ||
        a.courseName.toLowerCase().includes(q) ||
        a.courseCode.toLowerCase().includes(q) ||
        a.studentId.toLowerCase().includes(q)
    );
  }, [activeEnrollments, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / PAGE_SIZE));
  const paginatedEnrollments = useMemo(
    () => filteredEnrollments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredEnrollments, page]
  );

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error("Please select a course.");
      return;
    }
    if (accessMode === "limited" && !endDate) {
      toast.error("Please specify an end date for limited access.");
      return;
    }

    if (enrollTargetType === "individual") {
      if (!selectedStudent) {
        toast.error("Please select a student.");
        return;
      }
      setIsSubmitting(true);
      try {
        await assignCourse(selectedStudent, selectedCourse, accessMode, endDate || undefined);
        toast.success("Student enrolled successfully.");
        setSelectedStudent("");
        setStudentSearch("");
        setEndDate("");
        setAccessMode("lifetime");
      } catch (err) {
        toast.error("Failed to enroll student.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!selectedGroup) {
        toast.error("Please select a student group / cohort.");
        return;
      }
      const groupStudents = studentsList.filter((s) => s.group === selectedGroup);
      if (groupStudents.length === 0) {
        toast.error("No students found in the selected group.");
        return;
      }
      setIsSubmitting(true);
      try {
        let count = 0;
        for (const s of groupStudents) {
          await assignCourse(s.id, selectedCourse, accessMode, endDate || undefined);
          count++;
        }
        toast.success(`Enrolled all ${count} students in group "${selectedGroup}"!`);
        setSelectedGroup("");
        setEndDate("");
        setAccessMode("lifetime");
      } catch (err) {
        toast.error("Failed to enroll student group.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleRevoke = async () => {
    if (!toRevoke) return;
    try {
      await revokeCourse(toRevoke.studentId, toRevoke.courseId);
      toast.success(`Access to ${toRevoke.courseName} revoked for ${toRevoke.studentName}.`);
      setToRevoke(null);
    } catch (err) {
      toast.error("Failed to revoke course access.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Course Enrollment Panel"
        subtitle="Manage student access modes and enrollments dynamically through the database."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Enrollment Form */}
        <GlassCard className="md:col-span-1 h-fit space-y-5">
          <div>
            <h3 className="font-semibold text-lg">New Enrollment</h3>
            <p className="text-xs text-muted-foreground">Enroll a student in a course with lifetime or date-limited access.</p>
          </div>

          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label>Enroll Target</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={enrollTargetType === "individual" ? "default" : "outline"}
                  className={`h-8 text-xs ${enrollTargetType === "individual" ? "gradient-primary text-primary-foreground border-0" : ""}`}
                  onClick={() => setEnrollTargetType("individual")}
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Single Student
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={enrollTargetType === "group" ? "default" : "outline"}
                  className={`h-8 text-xs ${enrollTargetType === "group" ? "gradient-primary text-primary-foreground border-0" : ""}`}
                  onClick={() => setEnrollTargetType("group")}
                >
                  <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                  Student Group
                </Button>
              </div>
            </div>

            {enrollTargetType === "individual" ? (
              <div className="space-y-2 relative">
                <Label>Student</Label>
                <div className="relative">
                  <Input
                    placeholder="Search student by name, email, or ID..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setStudentDropdownOpen(true);
                    }}
                    onFocus={() => setStudentDropdownOpen(true)}
                    className="w-full h-10 bg-secondary/30"
                  />
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent("");
                        setStudentSearch("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

              {/* Floating Autocomplete Dropdown */}
              <AnimatePresence>
                {studentDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setStudentDropdownOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-1.5"
                    >
                      {filteredStudentsForSelect.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">No students found</div>
                      ) : (
                        filteredStudentsForSelect.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s.id);
                              setStudentSearch(`${s.name} (${s.email})`);
                              setStudentDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-secondary/60 flex flex-col gap-0.5 transition ${
                              selectedStudent === s.id ? "bg-primary/10 text-primary" : "text-foreground"
                            }`}
                          >
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {s.email} · ID: {s.id}
                            </span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            ) : (
              <div className="space-y-2">
                <Label>Student Group / Cohort</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select student group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((grp) => {
                      const count = studentsList.filter((s) => s.group === grp).length;
                      return (
                        <SelectItem key={grp} value={grp}>
                          <span>{grp}</span>
                          <span className="text-[10px] opacity-65 ml-2">({count} students)</span>
                        </SelectItem>
                      );
                    })}
                    {availableGroups.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">No student groups found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 relative">
              <Label>Course</Label>
              <div className="relative">
                <Input
                  placeholder="Search & select course by title or code (e.g. FS101, PY201)..."
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value);
                    setCourseDropdownOpen(true);
                  }}
                  onFocus={() => setCourseDropdownOpen(true)}
                  className="w-full h-10 bg-secondary/30"
                />
                {selectedCourse && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse("");
                      setCourseSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Floating Course Autocomplete Dropdown */}
              <AnimatePresence>
                {courseDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setCourseDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg space-y-1"
                    >
                      {filteredCoursesForSelect.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">No courses found</div>
                      ) : (
                        filteredCoursesForSelect.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCourse(c.id);
                              setCourseSearch(`${c.name} (${c.code})`);
                              setCourseDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-secondary/60 flex flex-col gap-0.5 transition ${
                              selectedCourse === c.id ? "bg-primary/10 text-primary" : "text-foreground"
                            }`}
                          >
                            <span className="font-semibold flex items-center gap-1.5">
                              <span>{c.thumbnail}</span>
                              <span>{c.name}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Code: {c.code} · ID: {c.id}
                            </span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2.5">
              <Label>Access Mode</Label>
              <RadioGroup
                value={accessMode}
                onValueChange={(v) => setAccessMode(v as "lifetime" | "limited")}
                className="grid grid-cols-2 gap-2"
              >
                <Label className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs cursor-pointer hover:bg-secondary/40 transition">
                  <RadioGroupItem value="lifetime" id="form-lifetime" className="h-3.5 w-3.5" />
                  Lifetime Access
                </Label>
                <Label className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs cursor-pointer hover:bg-secondary/40 transition">
                  <RadioGroupItem value="limited" id="form-limited" className="h-3.5 w-3.5" />
                  Limited Time
                </Label>
              </RadioGroup>
            </div>

            {accessMode === "limited" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2 overflow-hidden"
              >
                <Label htmlFor="endDate">End Expiry Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gradient-primary text-primary-foreground border-0 glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Enroll Student
            </Button>
          </form>
        </GlassCard>

        {/* Enrollments List Table */}
        <GlassCard className="md:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg">Active Enrollments</h3>
              <p className="text-xs text-muted-foreground">List of all students currently enrolled in courses.</p>
            </div>
            
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or course..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Access Mode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEnrollments.map((a) => (
                  <TableRow key={`${a.studentId}:${a.courseId}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground select-all">
                      {a.studentId}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{a.studentName}</div>
                      <div className="text-[10px] text-muted-foreground font-light">{a.studentEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <CourseThumbnail thumbnail={a.courseThumbnail} name={a.courseName} className="h-6 w-6" textClassName="text-xs" />
                        <span>{a.courseName}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-light font-mono">{a.courseCode}</div>
                    </TableCell>
                    <TableCell>
                      {a.accessMode === "lifetime" ? (
                        <Badge variant="outline" className="border-success/40 text-success bg-success/5 text-[10px] py-0.5">
                          Lifetime
                        </Badge>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="border-warning/40 text-warning bg-warning/5 text-[10px] py-0.5">
                            Limited Expiry
                          </Badge>
                          <div className="text-[10px] text-muted-foreground font-light flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {a.endDate}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setToRevoke(a)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEnrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-16">
                      No active enrollments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls bar (10 per page) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs">
              <span className="text-muted-foreground font-mono">
                Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{totalPages}</strong> ({filteredEnrollments.length} total enrollments · 10 per page)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Revocation Alert Dialog */}
      <AlertDialog open={!!toRevoke} onOpenChange={(o) => !o && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Course Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke <strong>{toRevoke?.studentName}</strong>'s enrollment and progress in <strong>{toRevoke?.courseName}</strong> ({toRevoke?.courseCode}). They will lose all access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
