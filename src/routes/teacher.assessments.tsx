import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  ArrowLeft,
  ShieldCheck,
  Clock,
  ListChecks,
  CheckCircle2,
  CircleDot,
  FileText,
  GraduationCap,
  AlertCircle,
  Upload,
  Download,
  Copy,
  Check,
  Loader2,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useData,
  maxScore,
  submissionScore,
  type StoreAssessment,
  type Question,
  type QuestionType,
  type Submission,
  type Course,
} from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { FileUploadButton } from "@/components/FileUploadButton";

export const Route = createFileRoute("/teacher/assessments")({ component: AssessmentsPage });

const typeLabel: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  truefalse: "True / False",
  short: "Short answer",
};

function AssessmentsPage() {
  const { user } = useAuth();
  const { courses, assessments, addAssessment, updateAssessment, deleteAssessment, submissions } =
    useData();

  const [initialTab, setInitialTab] = useState<"questions" | "grading">("questions");
  const [topTab, setTopTab] = useState<"assessments" | "grading">("assessments");

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);
  const myAssessments = useMemo(
    () => assessments.filter((a) => myCourseIds.has(a.courseId)),
    [assessments, myCourseIds],
  );
  const myAssessIds = useMemo(() => new Set(myAssessments.map((a) => a.id)), [myAssessments]);
  const mySubmissions = useMemo(
    () => submissions.filter((s) => myAssessIds.has(s.assessmentId)),
    [submissions, myAssessIds],
  );
  const pendingGradingCount = mySubmissions.filter((s) => s.status !== "graded").length;

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = assessments.find((a) => a.id === editingId) ?? null;

  const [assessTypeFilter, setAssessTypeFilter] = useState<"all" | "normal" | "final">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [proctorFilter, setProctorFilter] = useState<"all" | "proctored" | "unproctored">("all");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "questions" | "passingScore">("newest");
  const [assessSearch, setAssessSearch] = useState("");
  const [assessPage, setAssessPage] = useState(1);
  const ASSESS_ITEMS_PER_PAGE = 25;

  const normalAssessmentsCount = useMemo(
    () => myAssessments.filter((a) => !a.isFinal).length,
    [myAssessments],
  );
  const finalAssessmentsCount = useMemo(
    () => myAssessments.filter((a) => a.isFinal).length,
    [myAssessments],
  );

  const filteredMyAssessments = useMemo(() => {
    const q = assessSearch.trim().toLowerCase();
    let list = myAssessments.filter((a) => {
      if (assessTypeFilter === "normal" && a.isFinal) return false;
      if (assessTypeFilter === "final" && !a.isFinal) return false;
      if (courseFilter !== "all" && a.courseId !== courseFilter) return false;
      if (proctorFilter === "proctored" && !a.proctored) return false;
      if (proctorFilter === "unproctored" && a.proctored) return false;
      if (!q) return true;
      const c = courses.find((x) => x.id === a.courseId);
      const cName = (c?.name || "").toLowerCase();
      const cCode = (c?.code || "").toLowerCase();
      return a.title.toLowerCase().includes(q) || cName.includes(q) || cCode.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "questions") return b.questions.length - a.questions.length;
      if (sortBy === "passingScore") return b.passingScore - a.passingScore;
      return 0;
    });

    return list;
  }, [myAssessments, assessTypeFilter, courseFilter, proctorFilter, sortBy, assessSearch, courses]);

  const assessTotalPages = Math.ceil(filteredMyAssessments.length / ASSESS_ITEMS_PER_PAGE) || 1;
  const currentAssessPage = Math.min(assessPage, assessTotalPages);
  const paginatedMyAssessments = useMemo(() => {
    const start = (currentAssessPage - 1) * ASSESS_ITEMS_PER_PAGE;
    return filteredMyAssessments.slice(start, start + ASSESS_ITEMS_PER_PAGE);
  }, [filteredMyAssessments, currentAssessPage]);

  // assessment create/edit dialog
  const [dialog, setDialog] = useState(false);
  const [aDraft, setADraft] = useState({
    title: "",
    courseId: "",
    timeLimit: 30,
    passingScore: 70,
    attempts: 2,
    proctored: false,
    isFinal: false,
  });
  const [editTarget, setEditTarget] = useState<StoreAssessment | null>(null);
  const [toDelete, setToDelete] = useState<StoreAssessment | null>(null);

  const courseName = (id: string) => courses.find((c) => c.id === id)?.code ?? "—";

  const openCreate = () => {
    setEditTarget(null);
    setADraft({
      title: "",
      courseId: myCourses[0]?.id ?? "",
      timeLimit: 30,
      passingScore: 70,
      attempts: 2,
      proctored: false,
      isFinal: false,
    });
    setDialog(true);
  };
  const openEditMeta = (a: StoreAssessment) => {
    setEditTarget(a);
    setADraft({
      title: a.title,
      courseId: a.courseId,
      timeLimit: a.timeLimit,
      passingScore: a.passingScore,
      attempts: a.attempts,
      proctored: a.proctored,
      isFinal: a.isFinal ?? false,
    });
    setDialog(true);
  };
  const saveMeta = () => {
    if (!aDraft.title.trim() || !aDraft.courseId) {
      toast.error("Title and course are required.");
      return;
    }
    if (editTarget) {
      updateAssessment(editTarget.id, aDraft);
      toast.success("Assignment/Quiz updated.");
    } else {
      const id = addAssessment(aDraft);
      toast.success("Assignment/Quiz created — add some questions.");
      setEditingId(id);
    }
    setDialog(false);
  };
  const confirmDelete = () => {
    if (!toDelete) return;
    deleteAssessment(toDelete.id);
    if (editingId === toDelete.id) setEditingId(null);
    toast.success("Assignment/Quiz deleted.");
    setToDelete(null);
  };

  if (editing) {
    return (
      <AssessmentEditor
        assessment={editing}
        onBack={() => setEditingId(null)}
        courseName={courseName(editing.courseId)}
        initialTab={initialTab}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments & Quizzes"
        subtitle="Design proctored quizzes, exams, and homework assignments with rich question types."
        actions={
          <Button
            onClick={openCreate}
            className="gradient-primary text-primary-foreground border-0 glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Assignment / Quiz
          </Button>
        }
      />

      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)} className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 bg-muted/40 p-1">
          <TabsTrigger value="assessments" className="cursor-pointer gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Assignments & Quizzes ({myAssessments.length})
          </TabsTrigger>
          <TabsTrigger value="grading" className="cursor-pointer gap-2">
            <GraduationCap className="h-4 w-4" />
            Grading & Submissions ({mySubmissions.length})
            {pendingGradingCount > 0 && (
              <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-warning text-warning-foreground">
                {pendingGradingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-6 mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Assignments & Quizzes"
              value={myAssessments.length}
              icon={ClipboardCheck}
            />
            <StatCard
              label="Total Questions"
              value={myAssessments.reduce((n, a) => n + a.questions.length, 0)}
              icon={ListChecks}
              delay={0.05}
            />
            <StatCard
              label="Proctored"
              value={myAssessments.filter((a) => a.proctored).length}
              icon={ShieldCheck}
              delay={0.1}
            />
          </div>

          {/* Assessment Filter Bar */}
          <GlassCard className="p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={assessSearch}
                  onChange={(e) => {
                    setAssessSearch(e.target.value);
                    setAssessPage(1);
                  }}
                  placeholder="Search quiz title or course code..."
                  className="pl-9 pr-8 h-9 text-xs bg-secondary/30"
                />
                {assessSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssessSearch("");
                      setAssessPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Subject / Course Filter */}
                <Select
                  value={courseFilter}
                  onValueChange={(v) => {
                    setCourseFilter(v);
                    setAssessPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5 text-primary opacity-80" />
                    <SelectValue placeholder="All Subjects & Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects & Courses ({myCourses.length})</SelectItem>
                    {myCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Proctoring Filter */}
                <Select
                  value={proctorFilter}
                  onValueChange={(v) => {
                    setProctorFilter(v as any);
                    setAssessPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-primary opacity-80" />
                    <SelectValue placeholder="Proctoring" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Proctoring</SelectItem>
                    <SelectItem value="proctored">Proctored Only</SelectItem>
                    <SelectItem value="unproctored">Non-Proctored</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v as any);
                    setAssessPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-primary opacity-80" />
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="questions">Questions (Most)</SelectItem>
                    <SelectItem value="passingScore">Passing Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
              <div className="flex rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAssessTypeFilter("all");
                    setAssessPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    assessTypeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({myAssessments.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssessTypeFilter("normal");
                    setAssessPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    assessTypeFilter === "normal"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Normal Assessments ({normalAssessmentsCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssessTypeFilter("final");
                    setAssessPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    assessTypeFilter === "final"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Final Assessments ({finalAssessmentsCount})
                </button>
              </div>

              {(assessSearch ||
                courseFilter !== "all" ||
                assessTypeFilter !== "all" ||
                proctorFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setAssessSearch("");
                    setCourseFilter("all");
                    setAssessTypeFilter("all");
                    setProctorFilter("all");
                    setAssessPage(1);
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Reset all filters
                </button>
              )}
            </div>
          </GlassCard>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedMyAssessments.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard className="h-full flex flex-col hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold leading-tight">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {courseName(a.courseId)}
                      </div>
                    </div>
                    {a.proctored && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary bg-primary/10 shrink-0"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Proctored
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-secondary/40 py-2">
                      <div className="text-lg font-bold">{a.questions.length}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Questions
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary/40 py-2">
                      <div className="text-lg font-bold">{a.timeLimit}m</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Time
                      </div>
                    </div>
                    <div className="rounded-lg bg-secondary/40 py-2">
                      <div className="text-lg font-bold">{a.passingScore}%</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Pass
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-primary-foreground border-0 cursor-pointer"
                      onClick={() => {
                        setEditingId(a.id);
                        setInitialTab("questions");
                      }}
                    >
                      Questions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                      onClick={() => {
                        setEditingId(a.id);
                        setInitialTab("grading");
                      }}
                    >
                      Grading (
                      {a.questions.length > 0
                        ? submissions.filter((s) => s.assessmentId === a.id).length
                        : 0}
                      )
                    </Button>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditMeta(a)} className="cursor-pointer">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => setToDelete(a)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
            {paginatedMyAssessments.length === 0 && (
              <GlassCard className="md:col-span-2 xl:col-span-3 text-center py-12 text-sm text-muted-foreground">
                No assignments or quizzes match the current filters.
              </GlassCard>
            )}
          </div>

          {/* 25 per page pagination controls */}
          {assessTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-4 border-t border-border/40">
              <div>
                Showing{" "}
                <strong className="text-foreground font-semibold">
                  {(currentAssessPage - 1) * ASSESS_ITEMS_PER_PAGE + 1}–
                  {Math.min(currentAssessPage * ASSESS_ITEMS_PER_PAGE, filteredMyAssessments.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-foreground font-semibold">
                  {filteredMyAssessments.length}
                </strong>{" "}
                assignments & quizzes (Page {currentAssessPage} of {assessTotalPages})
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssessPage((p) => Math.max(1, p - 1))}
                  disabled={currentAssessPage <= 1}
                  className="h-8 px-2 text-xs cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: assessTotalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === assessTotalPages || Math.abs(p - currentAssessPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <div key={p} className="flex items-center">
                          {prev && p - prev > 1 && <span className="px-1 text-muted-foreground">...</span>}
                          <Button
                            variant={p === currentAssessPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAssessPage(p)}
                            className={`h-7 w-7 p-0 text-xs cursor-pointer ${
                              p === currentAssessPage ? "gradient-primary text-primary-foreground font-bold border-0" : ""
                            }`}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssessPage((p) => Math.min(assessTotalPages, p + 1))}
                  disabled={currentAssessPage >= assessTotalPages}
                  className="h-8 px-2 text-xs cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grading" className="mt-6">
          <AllGradingPanel assessments={myAssessments} courses={myCourses} />
        </TabsContent>
      </Tabs>

      {/* meta dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Assignment / Quiz" : "New Assignment / Quiz"}
            </DialogTitle>
            <DialogDescription>
              Configure the settings. Add questions in the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="atitle">Title</Label>
              <Input
                id="atitle"
                value={aDraft.title}
                onChange={(e) => setADraft({ ...aDraft, title: e.target.value })}
                placeholder="e.g. MERN-301 — Midterm Quiz"
              />
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={aDraft.courseId}
                onValueChange={(v) => setADraft({ ...aDraft, courseId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {myCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="atime">Time (min)</Label>
                <Input
                  id="atime"
                  type="number"
                  value={aDraft.timeLimit}
                  onChange={(e) => setADraft({ ...aDraft, timeLimit: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apass">Pass %</Label>
                <Input
                  id="apass"
                  type="number"
                  value={aDraft.passingScore}
                  onChange={(e) => setADraft({ ...aDraft, passingScore: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aatt">Attempts</Label>
                <Input
                  id="aatt"
                  type="number"
                  value={aDraft.attempts}
                  onChange={(e) => setADraft({ ...aDraft, attempts: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={aDraft.proctored}
                onCheckedChange={(c) => setADraft({ ...aDraft, proctored: c })}
              />
              <span className="text-sm">Enable proctoring</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={aDraft.isFinal}
                onCheckedChange={(c) =>
                  setADraft({ ...aDraft, isFinal: c, proctored: c || aDraft.proctored })
                }
              />
              <span className="text-sm">
                Final exam (passing it triggers a certificate request)
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveMeta}
              className="gradient-primary text-primary-foreground border-0"
            >
              {editTarget ? "Save" : "Create & Add Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment / Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.title}" and all its submissions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------- Editor ----------------
type QDraft = {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  points: number;
  imageUrl: string;
};
const blankQ: QDraft = {
  type: "mcq",
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  points: 4,
  imageUrl: "",
};

function AssessmentEditor({
  assessment,
  onBack,
  courseName,
  initialTab,
}: {
  assessment: StoreAssessment;
  onBack: () => void;
  courseName: string;
  initialTab: "questions" | "grading";
}) {
  const { addQuestion, updateQuestion, deleteQuestion, addQuestionsBatch } = useData();
  const [qDialog, setQDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "grading">(initialTab);
  const [csvDialog, setCsvDialog] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [qDraft, setQDraft] = useState<QDraft>(blankQ);
  const [delQ, setDelQ] = useState<Question | null>(null);

  const [qSearch, setQSearch] = useState("");
  const [qTypeFilter, setQTypeFilter] = useState<"all" | QuestionType>("all");
  const [qPage, setQPage] = useState(1);
  const QUESTIONS_PER_PAGE = 25;

  const filteredQuestions = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    return assessment.questions.filter((item) => {
      if (qTypeFilter !== "all" && item.type !== qTypeFilter) return false;
      if (!q) return true;
      return item.prompt.toLowerCase().includes(q) || item.options.some((o) => o.toLowerCase().includes(q));
    });
  }, [assessment.questions, qSearch, qTypeFilter]);

  const qTotalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE) || 1;
  const currentQPage = Math.min(qPage, qTotalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (currentQPage - 1) * QUESTIONS_PER_PAGE;
    return filteredQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [filteredQuestions, currentQPage]);

  const openAddQ = () => {
    setEditingQ(null);
    setQDraft(blankQ);
    setQDialog(true);
  };
  const openEditQ = (q: Question) => {
    setEditingQ(q);
    setQDraft({
      type: q.type,
      prompt: q.prompt,
      options:
        q.type === "short"
          ? ["", "", "", ""]
          : [...q.options, "", "", "", ""].slice(0, Math.max(2, q.options.length)),
      correctIndex: q.correctIndex,
      points: q.points,
      imageUrl: q.imageUrl ?? "",
    });
    setQDialog(true);
  };

  const setType = (type: QuestionType) => {
    if (type === "truefalse")
      setQDraft((d) => ({ ...d, type, options: ["True", "False"], correctIndex: 0 }));
    else if (type === "short") setQDraft((d) => ({ ...d, type, options: [], correctIndex: -1 }));
    else
      setQDraft((d) => ({
        ...d,
        type,
        options: d.options.length >= 2 ? d.options : ["", "", "", ""],
        correctIndex: 0,
      }));
  };

  const saveQ = () => {
    if (!qDraft.prompt.trim()) {
      toast.error("Question prompt is required.");
      return;
    }
    let options = qDraft.options;
    let correctIndex = qDraft.correctIndex;
    if (qDraft.type === "mcq") {
      options = qDraft.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) {
        toast.error("Add at least two options.");
        return;
      }
      if (correctIndex >= options.length) correctIndex = 0;
    } else if (qDraft.type === "truefalse") {
      options = ["True", "False"];
    } else {
      options = [];
      correctIndex = -1;
    }
    const payload = {
      type: qDraft.type,
      prompt: qDraft.prompt.trim(),
      options,
      correctIndex,
      points: Number(qDraft.points) || 1,
      imageUrl: qDraft.imageUrl || undefined,
    };
    if (editingQ) {
      updateQuestion(assessment.id, editingQ.id, payload);
      toast.success("Question updated.");
    } else {
      addQuestion(assessment.id, payload);
      toast.success("Question added.");
    }
    setQDialog(false);
  };

  const confirmDelQ = () => {
    if (!delQ) return;
    deleteQuestion(assessment.id, delQ.id);
    toast.success("Question removed.");
    setDelQ(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">{assessment.title}</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{courseName}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {assessment.timeLimit}m
            </span>
            <span>Pass {assessment.passingScore}%</span>
            <span>Worth {maxScore(assessment)} pts</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full flex justify-between bg-muted/30 p-1">
          <TabsTrigger value="questions">
            <ListChecks className="h-4 w-4 mr-1.5" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="grading">
            <GraduationCap className="h-4 w-4 mr-1.5" />
            Grading
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Question search & type filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={qSearch}
                  onChange={(e) => {
                    setQSearch(e.target.value);
                    setQPage(1);
                  }}
                  placeholder="Search questions or options..."
                  className="pl-8 pr-7 h-8 text-xs bg-secondary/30"
                />
                {qSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setQSearch("");
                      setQPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setQTypeFilter("all");
                    setQPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    qTypeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({assessment.questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQTypeFilter("mcq");
                    setQPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    qTypeFilter === "mcq"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  MCQ ({assessment.questions.filter((q) => q.type === "mcq").length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQTypeFilter("truefalse");
                    setQPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    qTypeFilter === "truefalse"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  True/False ({assessment.questions.filter((q) => q.type === "truefalse").length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQTypeFilter("short");
                    setQPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                    qTypeFilter === "short"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Short Answer ({assessment.questions.filter((q) => q.type === "short").length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setCsvDialog(true)}
                variant="outline"
                size="sm"
                className="h-8 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Import CSV
              </Button>
              <Button
                onClick={openAddQ}
                size="sm"
                className="h-8 gradient-primary text-primary-foreground border-0 glow cursor-pointer"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Question
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {paginatedQuestions.map((q, i) => {
              const globalIndex = (currentQPage - 1) * QUESTIONS_PER_PAGE + i + 1;
              return (
                <GlassCard key={q.id}>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 grid place-items-center rounded-lg bg-primary/15 text-primary text-xs font-bold shrink-0">
                      {globalIndex}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="border-border text-xs">
                          {typeLabel[q.type]}
                        </Badge>
                        <Badge variant="outline" className="border-border text-xs">
                          {q.points} pts
                        </Badge>
                      </div>
                      <div className="mt-2 font-medium">{q.prompt}</div>
                      {q.imageUrl && (
                        <img
                          src={q.imageUrl}
                          alt="Question reference"
                          className="mt-3 max-h-52 rounded-lg border border-border object-contain bg-secondary/30"
                        />
                      )}
                      {q.type !== "short" && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((o, oi) => (
                            <div
                              key={oi}
                              className={`flex items-center gap-2 text-sm ${oi === q.correctIndex ? "text-success" : "text-muted-foreground"}`}
                            >
                              {oi === q.correctIndex ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <CircleDot className="h-3.5 w-3.5 opacity-40" />
                              )}
                              {o}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === "short" && (
                        <div className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Manually graded
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditQ(q)} className="cursor-pointer">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive cursor-pointer"
                        onClick={() => setDelQ(q)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
            {paginatedQuestions.length === 0 && (
              <GlassCard className="text-center py-12 text-sm text-muted-foreground">
                No questions match the current filter or search.
              </GlassCard>
            )}
          </div>

          {/* 25 questions per page pagination */}
          {qTotalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-4 border-t border-border/40">
              <div>
                Showing{" "}
                <strong className="text-foreground font-semibold">
                  {(currentQPage - 1) * QUESTIONS_PER_PAGE + 1}–
                  {Math.min(currentQPage * QUESTIONS_PER_PAGE, filteredQuestions.length)}
                </strong>{" "}
                of <strong className="text-foreground font-semibold">{filteredQuestions.length}</strong> questions (Page {currentQPage} of {qTotalPages})
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQPage((p) => Math.max(1, p - 1))}
                  disabled={currentQPage <= 1}
                  className="h-8 px-2 text-xs cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: qTotalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === qTotalPages || Math.abs(p - currentQPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <div key={p} className="flex items-center">
                          {prev && p - prev > 1 && <span className="px-1 text-muted-foreground">...</span>}
                          <Button
                            variant={p === currentQPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQPage(p)}
                            className={`h-7 w-7 p-0 text-xs cursor-pointer ${
                              p === currentQPage ? "gradient-primary text-primary-foreground font-bold border-0" : ""
                            }`}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQPage((p) => Math.min(qTotalPages, p + 1))}
                  disabled={currentQPage >= qTotalPages}
                  className="h-8 px-2 text-xs cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grading" className="mt-6">
          <GradingPanel assessment={assessment} />
        </TabsContent>
      </Tabs>

      {/* question dialog */}
      <Dialog open={qDialog} onOpenChange={setQDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQ ? "Edit question" : "Add question"}</DialogTitle>
            <DialogDescription>
              Pick a type, write the prompt and mark the correct answer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={qDraft.type} onValueChange={(v) => setType(v as QuestionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple choice</SelectItem>
                    <SelectItem value="truefalse">True / False</SelectItem>
                    <SelectItem value="short">Short answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qpts">Points</Label>
                <Input
                  id="qpts"
                  type="number"
                  value={qDraft.points}
                  onChange={(e) => setQDraft({ ...qDraft, points: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qprompt">Prompt</Label>
              <Textarea
                id="qprompt"
                rows={2}
                value={qDraft.prompt}
                onChange={(e) => setQDraft({ ...qDraft, prompt: e.target.value })}
                placeholder="Ask the question..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qimage">Question image</Label>
              <div className="flex gap-2">
                <Input
                  id="qimage"
                  value={qDraft.imageUrl}
                  onChange={(e) => setQDraft({ ...qDraft, imageUrl: e.target.value })}
                  placeholder="Image URL or upload"
                />
                <FileUploadButton
                  accept="image/*"
                  label="Upload"
                  onUpload={(dataUrl) => setQDraft((d) => ({ ...d, imageUrl: dataUrl }))}
                />
              </div>
              {qDraft.imageUrl && (
                <img
                  src={qDraft.imageUrl}
                  alt="Question preview"
                  className="max-h-40 rounded-lg border border-border object-contain bg-secondary/30"
                />
              )}
            </div>

            {qDraft.type === "mcq" && (
              <div className="space-y-2">
                <Label>Options (select the correct one)</Label>
                {qDraft.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQDraft({ ...qDraft, correctIndex: oi })}
                      className={`h-5 w-5 rounded-full border grid place-items-center shrink-0 ${qDraft.correctIndex === oi ? "border-success bg-success/20" : "border-border"}`}
                    >
                      {qDraft.correctIndex === oi && (
                        <span className="h-2 w-2 rounded-full bg-success" />
                      )}
                    </button>
                    <Input
                      value={o}
                      onChange={(e) => {
                        const opts = [...qDraft.options];
                        opts[oi] = e.target.value;
                        setQDraft({ ...qDraft, options: opts });
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {qDraft.type === "truefalse" && (
              <div className="space-y-2">
                <Label>Correct answer</Label>
                <Select
                  value={String(qDraft.correctIndex)}
                  onValueChange={(v) => setQDraft({ ...qDraft, correctIndex: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">True</SelectItem>
                    <SelectItem value="1">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {qDraft.type === "short" && (
              <p className="text-sm text-muted-foreground">
                Short-answer responses are graded manually in the Grading tab.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveQ} className="gradient-primary text-primary-foreground border-0">
              Save question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delQ} onOpenChange={(o) => !o && setDelQ(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove question?</AlertDialogTitle>
            <AlertDialogDescription>
              This question will be permanently removed from the assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelQ}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {csvDialog && (
        <ImportCsvDialog
          open={csvDialog}
          onOpenChange={setCsvDialog}
          assessmentId={assessment.id}
          onImport={addQuestionsBatch}
        />
      )}
    </div>
  );
}

// ---------------- All Grading Overview ----------------
function AllGradingPanel({
  assessments,
  courses,
}: {
  assessments: StoreAssessment[];
  courses: Course[];
}) {
  const {
    submissions,
    users,
    certificates,
    requestCertificate,
    gradeSubmission,
    resetStudentSubmissions,
    grantExtraAttempt,
  } = useData();
  const assessMap = useMemo(() => new Map(assessments.map((a) => [a.id, a])), [assessments]);
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const assessIds = useMemo(() => new Set(assessments.map((a) => a.id)), [assessments]);
  const subs = useMemo(
    () =>
      submissions
        .filter((s) => assessIds.has(s.assessmentId))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [submissions, assessIds],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "normal" | "final">("all");
  const [selectedAssessId, setSelectedAssessId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "pending">("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [active, setActive] = useState<{ sub: Submission; a: StoreAssessment } | null>(null);

  const studentObj = (id: string) => users.find((u) => u.id === id);
  const studentName = (id: string) => studentObj(id)?.name ?? id;

  const filteredSubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subs.filter((sub) => {
      const a = assessMap.get(sub.assessmentId);
      if (selectedCourseId !== "all" && a?.courseId !== selectedCourseId) return false;
      if (typeFilter === "normal" && a?.isFinal) return false;
      if (typeFilter === "final" && !a?.isFinal) return false;
      if (selectedAssessId !== "all" && sub.assessmentId !== selectedAssessId) return false;
      if (statusFilter === "graded" && sub.status !== "graded") return false;
      if (statusFilter === "pending" && sub.status === "graded") return false;
      if (!q) return true;
      const student = studentObj(sub.studentId);
      const name = student?.name?.toLowerCase() || "";
      const email = student?.email?.toLowerCase() || "";
      const aTitle = a?.title?.toLowerCase() || "";
      const c = a ? courseMap.get(a.courseId) : null;
      const cName = (c?.name || "").toLowerCase();
      const cCode = (c?.code || "").toLowerCase();
      return name.includes(q) || email.includes(q) || aTitle.includes(q) || cName.includes(q) || cCode.includes(q);
    });
  }, [subs, users, searchQuery, selectedCourseId, selectedAssessId, statusFilter, typeFilter, assessMap, courseMap]);

  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedSubs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubs, currentPage]);

  const gradedCount = subs.filter((s) => s.status === "graded").length;
  const pendingCount = subs.length - gradedCount;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <GlassCard className="p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, email, or assessment..."
              className="pl-9 pr-8 h-9 text-xs bg-secondary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject / Course Filter Dropdown */}
            <Select
              value={selectedCourseId}
              onValueChange={(v) => {
                setSelectedCourseId(v);
                setSelectedAssessId("all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-1.5 text-primary opacity-80" />
                <SelectValue placeholder="All Subjects & Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects & Courses ({courses.length})</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assessment Select Dropdown */}
            <Select
              value={selectedAssessId}
              onValueChange={(v) => {
                setSelectedAssessId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px] h-8 text-xs">
                <SelectValue placeholder="All Assessments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assessments ({assessments.length})</SelectItem>
                {assessments
                  .filter((a) => {
                    if (selectedCourseId !== "all" && a.courseId !== selectedCourseId) return false;
                    if (typeFilter === "normal") return !a.isFinal;
                    if (typeFilter === "final") return a.isFinal;
                    return true;
                  })
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.isFinal ? "🎓 " : "📝 "}
                      {a.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second Row: Type & Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter (Normal vs Final) */}
            <div className="flex rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  typeFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("normal");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  typeFilter === "normal"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Normal Assessments
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("final");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  typeFilter === "final"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Final Assessments
              </button>
            </div>

            {/* Grading Status Filter */}
            <div className="flex rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({subs.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("graded");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  statusFilter === "graded"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Graded ({gradedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("pending");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  statusFilter === "pending"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>
          </div>

          {(searchQuery || selectedCourseId !== "all" || selectedAssessId !== "all" || typeFilter !== "all" || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCourseId("all");
                setSelectedAssessId("all");
                setTypeFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
              className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Reset all filters
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div>
            Showing{" "}
            <strong className="text-foreground font-semibold">
              {filteredSubs.length === 0
                ? "0"
                : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filteredSubs.length,
                  )}`}
            </strong>{" "}
            of <strong className="text-foreground font-semibold">{filteredSubs.length}</strong>{" "}
            submissions
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Submissions List */}
      {paginatedSubs.length === 0 ? (
        <GlassCard className="text-center py-10 text-sm text-muted-foreground">
          No submissions found matching criteria.
        </GlassCard>
      ) : (
        paginatedSubs.map((sub) => {
          const a = assessMap.get(sub.assessmentId);
          if (!a) return null;
          const { earned, max, pct } = submissionScore(a, sub);
          const passed = pct >= a.passingScore;
          const student = studentObj(sub.studentId);
          const course = courseMap.get(a.courseId);

          return (
            <GlassCard key={sub.id} className="flex flex-wrap items-center gap-4">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold shrink-0">
                {studentName(sub.studentId)
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {studentName(sub.studentId)}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {a.title}
                  </Badge>
                  {course && (
                    <span className="text-[10px] text-muted-foreground">({course.code})</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{student?.email || "No email"}</span>
                  <span>·</span>
                  <span>Submitted {sub.submittedAt}</span>
                </div>
              </div>
              {sub.status === "graded" ? (
                <Badge
                  variant="outline"
                  className={
                    passed
                      ? "border-success/40 text-success bg-success/10 font-semibold"
                      : "border-destructive/40 text-destructive bg-destructive/10 font-semibold"
                  }
                >
                  {earned}/{max} · {pct}% · {passed ? "Pass" : "Fail"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-warning/40 text-warning bg-warning/10 font-medium"
                >
                  Needs grading
                </Badge>
              )}
              <Button
                size="sm"
                variant={sub.status === "graded" ? "outline" : "default"}
                className={
                  sub.status === "graded"
                    ? "cursor-pointer text-xs"
                    : "gradient-primary text-primary-foreground border-0 cursor-pointer text-xs"
                }
                onClick={() => setActive({ sub, a })}
              >
                {sub.status === "graded" ? "Review" : "Grade"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1 cursor-pointer"
                onClick={() => {
                  grantExtraAttempt(a.id, sub.studentId, 1);
                  toast.success(`Granted +1 extra attempt to ${studentName(sub.studentId)}.`);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> +1 Attempt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs gap-1.5 cursor-pointer"
                onClick={async () => {
                  if (
                    confirm(
                      `Reset quiz attempt submissions for ${studentName(sub.studentId)} so they can take "${a.title}" again?`,
                    )
                  ) {
                    await resetStudentSubmissions(a.id, sub.studentId);
                    toast.success(
                      `Attempts reset! ${studentName(sub.studentId)} can now retake this test.`,
                    );
                  }
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Retest
              </Button>
            </GlassCard>
          );
        })
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} (25 submissions per page)
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs cursor-pointer disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {active && (
        <GradeDialog
          assessment={active.a}
          submission={active.sub}
          studentName={studentName(active.sub.studentId)}
          onClose={() => setActive(null)}
          onSave={(awards, feedback) => {
            gradeSubmission(active.sub.id, awards, feedback);
            const a = active.a;
            const sub = active.sub;
            const updatedResponses = awards
              ? sub.responses.map((r) => ({
                  ...r,
                  awarded: awards[r.questionId] !== undefined ? awards[r.questionId] : r.awarded,
                }))
              : sub.responses;
            const earned = updatedResponses.reduce((sum, r) => sum + (Number(r.awarded) || 0), 0);
            const max = a.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
            const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
            const passed = pct >= a.passingScore;

            if (a.isFinal && passed) {
              const alreadyRequested = certificates.some(
                (c) => c.studentId === sub.studentId && c.courseId === a.courseId,
              );
              if (!alreadyRequested) {
                requestCertificate(sub.studentId, a.courseId, pct, sub.proctorEvents);
                toast.success(`🎉 Final test passed (${pct}%)! Certificate request submitted for approval.`);
              } else {
                toast.success(`Submission graded (${pct}%). Certificate request is already pending.`);
              }
            } else {
              toast.success(`Submission graded (${pct}%).`);
            }
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------- Grading ----------------
function GradingPanel({ assessment }: { assessment: StoreAssessment }) {
  const {
    submissions,
    users,
    certificates,
    requestCertificate,
    gradeSubmission,
    resetStudentSubmissions,
    grantExtraAttempt,
  } = useData();
  const subs = useMemo(
    () =>
      submissions
        .filter((s) => s.assessmentId === assessment.id)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [submissions, assessment.id],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "pending">("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const [active, setActive] = useState<Submission | null>(null);

  const studentObj = (id: string) => users.find((u) => u.id === id);
  const studentName = (id: string) => studentObj(id)?.name ?? id;

  const filteredSubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subs.filter((sub) => {
      if (statusFilter === "graded" && sub.status !== "graded") return false;
      if (statusFilter === "pending" && sub.status === "graded") return false;
      if (!q) return true;
      const student = studentObj(sub.studentId);
      const name = student?.name?.toLowerCase() || "";
      const email = student?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });
  }, [subs, users, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredSubs.length / ITEMS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedSubs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubs, currentPage]);

  const gradedCount = subs.filter((s) => s.status === "graded").length;
  const pendingCount = subs.length - gradedCount;

  if (subs.length === 0) {
    return (
      <GlassCard className="text-center py-12 text-sm text-muted-foreground">
        No submissions yet for this assessment.
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <GlassCard className="p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search student by name or email..."
              className="pl-9 pr-8 h-9 text-xs bg-secondary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-secondary/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({subs.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("graded");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  statusFilter === "graded"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Graded ({gradedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("pending");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  statusFilter === "pending"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div>
            Showing{" "}
            <strong className="text-foreground font-semibold">
              {filteredSubs.length === 0
                ? "0"
                : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filteredSubs.length,
                  )}`}
            </strong>{" "}
            of <strong className="text-foreground font-semibold">{filteredSubs.length}</strong>{" "}
            submissions
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Submissions List */}
      {paginatedSubs.length === 0 ? (
        <GlassCard className="text-center py-10 text-sm text-muted-foreground">
          No students found matching "{searchQuery}".
        </GlassCard>
      ) : (
        paginatedSubs.map((sub) => {
          const { earned, max, pct } = submissionScore(assessment, sub);
          const passed = pct >= assessment.passingScore;
          const student = studentObj(sub.studentId);
          return (
            <GlassCard key={sub.id} className="flex flex-wrap items-center gap-4">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold shrink-0">
                {studentName(sub.studentId)
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {studentName(sub.studentId)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{student?.email || "No email"}</span>
                  <span>·</span>
                  <span>Submitted {sub.submittedAt}</span>
                </div>
              </div>
              {sub.status === "graded" ? (
                <Badge
                  variant="outline"
                  className={
                    passed
                      ? "border-success/40 text-success bg-success/10 font-semibold"
                      : "border-destructive/40 text-destructive bg-destructive/10 font-semibold"
                  }
                >
                  {earned}/{max} · {pct}% · {passed ? "Pass" : "Fail"}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10 font-medium">
                  Needs grading
                </Badge>
              )}
              <Button
                size="sm"
                variant={sub.status === "graded" ? "outline" : "default"}
                className={
                  sub.status === "graded" ? "cursor-pointer" : "gradient-primary text-primary-foreground border-0 cursor-pointer"
                }
                onClick={() => setActive(sub)}
              >
                {sub.status === "graded" ? "Review" : "Grade"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs gap-1 cursor-pointer"
                onClick={() => {
                  grantExtraAttempt(assessment.id, sub.studentId, 1);
                  toast.success(`Granted +1 extra attempt to ${studentName(sub.studentId)}.`);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> +1 Attempt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs gap-1.5 cursor-pointer"
                onClick={async () => {
                  if (
                    confirm(
                      `Reset quiz attempt submissions for ${studentName(sub.studentId)} so they can take the test again?`,
                    )
                  ) {
                    await resetStudentSubmissions(assessment.id, sub.studentId);
                    toast.success(
                      `Attempts reset! ${studentName(sub.studentId)} can now retake this test.`,
                    );
                  }
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Retest
              </Button>
            </GlassCard>
          );
        })
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} (25 submissions per page)
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs cursor-pointer disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {active && (
        <GradeDialog
          assessment={assessment}
          submission={active}
          studentName={studentName(active.studentId)}
          onClose={() => setActive(null)}
          onSave={(awards, feedback) => {
            gradeSubmission(active.id, awards, feedback);
            const a = assessment;
            const sub = active;
            const updatedResponses = awards
              ? sub.responses.map((r) => ({
                  ...r,
                  awarded: awards[r.questionId] !== undefined ? awards[r.questionId] : r.awarded,
                }))
              : sub.responses;
            const earned = updatedResponses.reduce((sum, r) => sum + (Number(r.awarded) || 0), 0);
            const max = a.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
            const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
            const passed = pct >= a.passingScore;

            if (a.isFinal && passed) {
              const alreadyRequested = certificates.some(
                (c) => c.studentId === sub.studentId && c.courseId === a.courseId,
              );
              if (!alreadyRequested) {
                requestCertificate(sub.studentId, a.courseId, pct, sub.proctorEvents);
                toast.success(`🎉 Final test passed (${pct}%)! Certificate request submitted for approval.`);
              } else {
                toast.success(`Submission graded (${pct}%). Certificate request is already pending.`);
              }
            } else {
              toast.success(`Submission graded (${pct}%).`);
            }
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

function GradeDialog({
  assessment,
  submission,
  studentName,
  onClose,
  onSave,
}: {
  assessment: StoreAssessment;
  submission: Submission;
  studentName: string;
  onClose: () => void;
  onSave: (awards: Record<string, number>, feedback?: string) => void;
}) {
  const [awards, setAwards] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const q of assessment.questions) {
      const resp = submission.responses.find((r) => r.questionId === q.id);
      const isCorrect = q.type !== "short" && Number(resp?.response) === q.correctIndex;
      const initialAward =
        resp?.awarded !== null && resp?.awarded !== undefined
          ? Number(resp.awarded)
          : isCorrect
            ? q.points
            : 0;
      init[q.id] = Math.max(0, Math.min(q.points, initialAward));
    }
    return init;
  });
  const [feedback, setFeedback] = useState(submission.feedback ?? "");

  const max = maxScore(assessment);
  const total = Math.min(max, assessment.questions.reduce((sum, q) => sum + (awards[q.id] ?? 0), 0));
  const pct = max ? Math.min(100, Math.round((total / max) * 100)) : 0;

  const responseFor = (qid: string) => submission.responses.find((r) => r.questionId === qid);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade — {studentName}</DialogTitle>
          <DialogDescription>
            Review answers and award points. Auto-graded items are pre-filled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {assessment.questions.map((q, i) => {
            const resp = responseFor(q.id);
            const respText =
              q.type === "short"
                ? resp?.response || "—"
                : (q.options[Number(resp?.response)] ?? "No answer");
            const isCorrect = q.type !== "short" && Number(resp?.response) === q.correctIndex;
            return (
              <div key={q.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Q{i + 1} · {typeLabel[q.type]} · {q.points} pts
                  </span>
                  {q.type !== "short" && (
                    <Badge
                      variant="outline"
                      className={
                        isCorrect
                          ? "border-success/40 text-success bg-success/10"
                          : "border-destructive/40 text-destructive bg-destructive/10"
                      }
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-medium">{q.prompt}</div>
                <div className="text-sm rounded-lg bg-secondary/40 px-3 py-2">
                  <span className="text-muted-foreground">Answer: </span>
                  {respText}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Award</Label>
                  <Input
                    type="number"
                    min={0}
                    max={q.points}
                    value={awards[q.id] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(q.points, Number(e.target.value)));
                      setAwards((a) => ({ ...a, [q.id]: v }));
                    }}
                    className="h-8 w-20"
                  />
                  <span className="text-xs text-muted-foreground">/ {q.points}</span>
                </div>
              </div>
            );
          })}
          <div className="space-y-2">
            <Label htmlFor="fb">Feedback (optional)</Label>
            <Textarea
              id="fb"
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Leave feedback for the student..."
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Total score</span>
            <span className="text-lg font-bold">
              {total}/{max} · {pct}%
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(awards, feedback.trim() || undefined)}
            className="gradient-primary text-primary-foreground border-0"
          >
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- CSV Importer Dialog ----------------

interface ParsedQuestion {
  selected: boolean;
  type: QuestionType;
  prompt: string;
  points: number;
  correctIndex: number;
  options: string[];
  imageUrl: string;
  error?: string;
}

function ImportCsvDialog({
  open,
  onOpenChange,
  assessmentId,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  onImport: (assessmentId: string, questions: Omit<Question, "id">[]) => Promise<void>;
}) {
  const [csvStep, setCsvStep] = useState<"upload" | "preview">("upload");
  const [parsedQs, setParsedQs] = useState<ParsedQuestion[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const SAMPLE_CSV_CONTENT = [
    "type,prompt,points,correctIndex,imageUrl,options",
    'mcq,"Which HTTP method is commonly used to update an existing resource in a RESTful API?",4,1,,"GET|PUT|DELETE|CONNECT"',
    'mcq,"What is the primary function of the React useEffect Hook?",4,0,,"Handle side effects and lifecycle events|Store persistent global state|Directly manipulate the browser DOM|Render JSX templates synchronously"',
    'truefalse,"PostgreSQL is an open-source relational database management system.",2,0,,',
    'truefalse,"HTML is primarily used as a backend server-side programming language.",2,1,,',
    'short,"Briefly explain the purpose of continuous integration (CI) in modern software development.",5,-1,,',
    'short,"What is the key difference between synchronous and asynchronous code execution?",5,-1,,',
  ].join("\n");

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "quiz_template_all_3_types.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded template CSV with examples of all 3 question types.");
  };

  const copySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_CONTENT);
    toast.success("Sample CSV with all 3 types copied to clipboard!");
  };

  const copyHeaders = () => {
    navigator.clipboard.writeText("type,prompt,points,correctIndex,imageUrl,options");
    toast.success("Headers copied to clipboard!");
  };

  const parseCSV = (text: string): string[][] => {
    const lines = [];
    const rows = text.split(/\r?\n/);
    for (const row of rows) {
      if (!row.trim()) continue;
      const cells = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      lines.push(cells.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"')));
    }
    return lines;
  };

  const handleParse = (csvText: string) => {
    if (!csvText.trim()) {
      toast.error("Please select a CSV file.");
      return;
    }
    try {
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        toast.error("CSV must contain at least a header row and one question row.");
        return;
      }
      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const typeIdx = headers.indexOf("type");
      const promptIdx = headers.indexOf("prompt");
      const pointsIdx = headers.indexOf("points");
      const correctIdx = headers.indexOf("correctindex");
      const imageIdx = headers.indexOf("imageurl");
      const optionsIdx = headers.indexOf("options");

      if (typeIdx === -1 || promptIdx === -1) {
        toast.error("CSV must contain at least 'type' and 'prompt' headers.");
        return;
      }

      const qs: ParsedQuestion[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const typeRaw = (row[typeIdx] || "").toLowerCase().trim();
        const type =
          typeRaw === "mcq" || typeRaw === "truefalse" || typeRaw === "short" ? typeRaw : "mcq";
        const prompt = row[promptIdx] || "";
        const pointsVal = pointsIdx !== -1 ? Number(row[pointsIdx]) : 1;
        const points = isNaN(pointsVal) ? 1 : pointsVal;

        const correctVal = correctIdx !== -1 ? Number(row[correctIdx]) : 0;
        const correctIndex = isNaN(correctVal) ? 0 : correctVal;
        const imageUrl = imageIdx !== -1 ? row[imageIdx] || "" : "";

        let options: string[] = [];
        if (type === "mcq" && optionsIdx !== -1) {
          options = (row[optionsIdx] || "")
            .split("|")
            .map((o) => o.trim())
            .filter(Boolean);
        } else if (type === "truefalse") {
          options = ["True", "False"];
        }

        let error = "";
        if (!prompt.trim()) {
          error = "Question prompt is empty.";
        } else if (type === "mcq" && options.length < 2) {
          error = "MCQ requires at least 2 options (separated by '|').";
        } else if (type === "mcq" && (correctIndex < 0 || correctIndex >= options.length)) {
          error = `correctIndex (${correctIndex}) is out of range.`;
        } else if (type === "truefalse" && correctIndex !== 0 && correctIndex !== 1) {
          error = "True/False correctIndex must be 0 or 1.";
        }

        qs.push({
          selected: !error,
          type,
          prompt,
          points,
          correctIndex,
          options,
          imageUrl,
          error,
        });
      }

      if (qs.length === 0) {
        toast.error("No valid question rows found in CSV.");
        return;
      }

      setParsedQs(qs);
      setCsvStep("preview");
    } catch {
      toast.error("Failed to parse CSV. Check your file format.");
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      handleParse(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const updateParsedQ = (idx: number, patch: Partial<ParsedQuestion>) => {
    setParsedQs((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const handleConfirmImport = async () => {
    const toImport = parsedQs.filter((q) => q.selected);
    if (toImport.length === 0) {
      toast.error("Select at least one question to import.");
      return;
    }

    const errorCount = toImport.filter((q) => q.error).length;
    if (errorCount > 0) {
      toast.error("Please fix or deselect questions with errors before importing.");
      return;
    }

    setIsImporting(true);
    try {
      const payload = toImport.map((q) => ({
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        correctIndex: q.correctIndex,
        options: q.options,
        imageUrl: q.imageUrl || undefined,
      }));
      await onImport(assessmentId, payload);
      toast.success(`Successfully imported ${toImport.length} questions.`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save imported questions.");
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = parsedQs.filter((q) => q.selected).length;
  const totalPoints = parsedQs.filter((q) => q.selected).reduce((sum, q) => sum + q.points, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Import Questions from CSV
          </DialogTitle>
          <DialogDescription>
            Import multiple multiple-choice, true/false, or short-answer questions.
          </DialogDescription>
        </DialogHeader>

        {csvStep === "upload" ? (
          <div className="space-y-6 py-2">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
              <div>
                <div className="font-semibold text-sm">Need a starter template?</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Includes ready-to-use examples of all 3 question types (Multiple Choice, True/False, Short Answer).
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyHeaders} className="text-xs">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Headers
                </Button>
                <Button variant="outline" size="sm" onClick={copySample} className="text-xs">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Sample Data
                </Button>
                <Button
                  size="sm"
                  onClick={downloadTemplate}
                  className="gradient-primary text-primary-foreground border-0 text-xs shadow-md"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download Template
                </Button>
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs font-semibold text-primary hover:bg-primary/5 shadow-none"
              >
                {showInstructions
                  ? "Hide CSV formatting instructions"
                  : "Show CSV formatting instructions & 3 question type examples"}
              </Button>
              {showInstructions && (
                <div className="mt-2 text-xs border border-border rounded-xl p-4 bg-secondary/20 overflow-x-auto space-y-4">
                  <div>
                    <div className="font-bold text-foreground mb-1.5">1. Column Headers:</div>
                    <code className="block bg-secondary/50 p-2.5 rounded-lg text-primary font-mono text-xs border border-border/60 select-all">
                      type,prompt,points,correctIndex,imageUrl,options
                    </code>
                  </div>

                  <div>
                    <div className="font-bold text-foreground mb-1.5">2. Field Specifications:</div>
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-border font-semibold text-muted-foreground">
                          <th className="pb-1.5 pr-2">Header</th>
                          <th className="pb-1.5 pr-2">Requirement</th>
                          <th className="pb-1.5">Details & Values</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td className="py-2 pr-2 font-mono text-primary font-medium">type</td>
                          <td className="py-2 pr-2 font-medium text-foreground">Required</td>
                          <td className="py-2">
                            <span className="font-mono bg-secondary/40 px-1 py-0.5 rounded text-foreground">mcq</span> (Multiple Choice),{" "}
                            <span className="font-mono bg-secondary/40 px-1 py-0.5 rounded text-foreground">truefalse</span> (True/False), or{" "}
                            <span className="font-mono bg-secondary/40 px-1 py-0.5 rounded text-foreground">short</span> (Short Answer).
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-2 font-mono text-primary font-medium">prompt</td>
                          <td className="py-2 pr-2 font-medium text-foreground">Required</td>
                          <td className="py-2">
                            The question text. Wrap in quotes if it contains commas or punctuation.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-2 font-mono text-primary font-medium">points</td>
                          <td className="py-2 pr-2 font-medium text-foreground">Optional</td>
                          <td className="py-2">Points awarded for answering correctly (defaults to 1).</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-2 font-mono text-primary font-medium">correctIndex</td>
                          <td className="py-2 pr-2 font-medium text-foreground">Conditional</td>
                          <td className="py-2">
                            <strong>mcq:</strong> 0-based index of the correct option (<code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">0</code> for 1st option, <code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">1</code> for 2nd option, etc.).<br />
                            <strong>truefalse:</strong> <code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">0</code> for True, <code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">1</code> for False.<br />
                            <strong>short:</strong> Use <code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">-1</code>.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-2 font-mono text-primary font-medium">imageUrl</td>
                          <td className="py-2 pr-2 font-medium text-foreground">Optional</td>
                          <td className="py-2">Optional image diagram or reference URL. Leave empty if none.</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-2 font-mono text-primary font-medium">options</td>
                          <td className="py-2 pr-2 font-medium text-foreground">Conditional</td>
                          <td className="py-2">
                            <strong>mcq:</strong> Choices separated by pipe <code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">|</code> (e.g. <code className="bg-secondary/40 px-1 py-0.5 rounded font-mono">Option 1|Option 2|Option 3|Option 4</code>).<br />
                            <strong>truefalse & short:</strong> Leave completely blank.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="font-bold text-foreground mb-1.5">3. Examples for All 3 Question Types:</div>
                    <pre className="p-3 bg-secondary/60 rounded-lg text-[11px] font-mono text-foreground overflow-x-auto border border-border/60 leading-relaxed select-all">
{`type,prompt,points,correctIndex,imageUrl,options
# Example 1: Multiple Choice Question (MCQ) with 4 options and Option 2 (index 1) correct
mcq,"Which HTTP method is commonly used to update an existing resource in a RESTful API?",4,1,,"GET|PUT|DELETE|CONNECT"

# Example 2: True / False Question with True (index 0) correct
truefalse,"PostgreSQL is an open-source relational database management system.",2,0,,

# Example 3: True / False Question with False (index 1) correct
truefalse,"HTML is primarily used as a backend server-side programming language.",2,1,,

# Example 4: Short Answer / Essay Question (index -1, options blank)
short,"Briefly explain the purpose of continuous integration (CI) in modern software development.",5,-1,,`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full mt-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-secondary/15"
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4 animate-bounce" />
                <div className="font-semibold text-sm">Drag and drop your CSV file here</div>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Only CSV files (.csv) are supported.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                  className="hidden"
                  id="csv-file-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("csv-file-input")?.click()}
                >
                  Choose File
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-sm font-semibold">Preview & Edit Parsed Questions</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCsvStep("upload")}
                className="text-xs shadow-none"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Upload Different File
              </Button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {parsedQs.map((q, index) => (
                <div
                  key={index}
                  className={`rounded-xl border p-4 space-y-3 transition ${
                    q.selected
                      ? "border-primary bg-primary/5"
                      : "border-border opacity-70 bg-secondary/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={q.selected}
                        onChange={(e) => updateParsedQ(index, { selected: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Badge variant="outline">Q{index + 1}</Badge>
                      {q.error && (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-1"
                        >
                          <AlertCircle className="h-3 w-3" /> {q.error}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`qtype-${index}`} className="text-xs text-muted-foreground">
                        Type
                      </Label>
                      <Select
                        value={q.type}
                        onValueChange={(val: QuestionType) => {
                          const defaults = val === "truefalse" ? ["True", "False"] : [];
                          updateParsedQ(index, {
                            type: val,
                            options: val === "mcq" ? ["Option 1", "Option 2"] : defaults,
                            correctIndex: val === "short" ? -1 : 0,
                            error: undefined,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice</SelectItem>
                          <SelectItem value="truefalse">True / False</SelectItem>
                          <SelectItem value="short">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Label
                        htmlFor={`qpts-${index}`}
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Pts
                      </Label>
                      <Input
                        id={`qpts-${index}`}
                        type="number"
                        min={1}
                        value={q.points}
                        onChange={(e) =>
                          updateParsedQ(index, { points: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="h-8 w-16"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`qprompt-${index}`} className="text-xs">
                      Prompt
                    </Label>
                    <Textarea
                      id={`qprompt-${index}`}
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => {
                        const err = e.target.value.trim() ? undefined : "Prompt is empty.";
                        updateParsedQ(index, { prompt: e.target.value, error: err });
                      }}
                      placeholder="Question text..."
                      className="text-sm"
                    />
                  </div>

                  {q.type === "mcq" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Options & Correct Selection (Radio)</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((option, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateParsedQ(index, { correctIndex: optIdx, error: undefined })
                              }
                              className={`h-5 w-5 rounded-full border grid place-items-center shrink-0 ${
                                q.correctIndex === optIdx
                                  ? "border-success bg-success/20"
                                  : "border-border"
                              }`}
                            >
                              {q.correctIndex === optIdx && (
                                <span className="h-2 w-2 rounded-full bg-success" />
                              )}
                            </button>
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOpts = [...q.options];
                                newOpts[optIdx] = e.target.value;
                                updateParsedQ(index, { options: newOpts });
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                              className="h-8"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newOpts = q.options.filter((_, oi) => oi !== optIdx);
                                const newCorrect =
                                  q.correctIndex >= newOpts.length ? 0 : q.correctIndex;
                                const err =
                                  newOpts.length < 2
                                    ? "MCQ requires at least 2 options."
                                    : undefined;
                                updateParsedQ(index, {
                                  options: newOpts,
                                  correctIndex: newCorrect,
                                  error: err,
                                });
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOpts = [...q.options, `Option ${q.options.length + 1}`];
                          const err = newOpts.length >= 2 && q.prompt.trim() ? undefined : q.error;
                          updateParsedQ(index, { options: newOpts, error: err });
                        }}
                        className="text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Option
                      </Button>
                    </div>
                  )}

                  {q.type === "truefalse" && (
                    <div className="space-y-1 max-w-[200px]">
                      <Label className="text-xs">Correct Answer</Label>
                      <Select
                        value={String(q.correctIndex)}
                        onValueChange={(val) =>
                          updateParsedQ(index, { correctIndex: Number(val), error: undefined })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">True</SelectItem>
                          <SelectItem value="1">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {q.type === "short" && (
                    <p className="text-xs text-muted-foreground">Short answer. Graded manually.</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-sm">
                Selected: <span className="font-semibold text-primary">{selectedCount}</span>{" "}
                questions · Total Points:{" "}
                <span className="font-semibold text-primary">{totalPoints}</span> pts
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCsvStep("upload")}
                  disabled={isImporting}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isImporting || selectedCount === 0}
                  className="gradient-primary text-primary-foreground border-0"
                >
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import Selected ({selectedCount})
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
