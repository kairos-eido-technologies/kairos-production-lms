import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Users as UsersIcon,
  GraduationCap,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader, GlassCard, StatCard, CourseThumbnail } from "@/components/ui-kit";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useData, type Course, type TechBadge } from "@/lib/data-store";
import { EmojiPicker } from "@/components/EmojiPicker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/admin/courses")({ component: CourseManagement });

const statusColors: Record<Course["status"], string> = {
  active: "border-success/40 text-success bg-success/10",
  draft: "border-warning/40 text-warning bg-warning/10",
  archived: "border-border text-muted-foreground bg-secondary/40",
};

type StudentAccessDraft = { accessMode: "lifetime" | "limited"; endDate?: string };
type Draft = {
  name: string;
  code: string;
  description: string;
  thumbnail: string;
  teacherId: string;
  status: Course["status"];
  studentIds: string[];
  studentAccess: Record<string, StudentAccessDraft>;
  showInPreview: boolean;
  previewVideoUrl: string;
  lockProgression: boolean;
  sequentialProgression: boolean;
  badgeTag: string;
  featuredBadgeText: string;
  durationText: string;
  projectsText: string;
  techStack: TechBadge[];
};
const emptyDraft: Draft = {
  name: "",
  code: "",
  description: "",
  thumbnail: "📘",
  teacherId: "",
  status: "draft",
  studentIds: [],
  studentAccess: {},
  showInPreview: false,
  previewVideoUrl: "",
  lockProgression: false,
  sequentialProgression: false,
  badgeTag: "",
  featuredBadgeText: "",
  durationText: "",
  projectsText: "",
  techStack: [],
};

function CourseManagement() {
  const { courses, users, addCourse, updateCourse, deleteCourse } = useData();
  const teachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);
  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [toDelete, setToDelete] = useState<Course | null>(null);

  // Student Search & Group filter state in Edit/Create course dialog
  const [studentSearchInEdit, setStudentSearchInEdit] = useState("");
  const [studentGroupFilterInEdit, setStudentGroupFilterInEdit] = useState("all");

  // New badge input state for custom tech badges
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeIcon, setNewBadgeIcon] = useState("⚡");

  const teacherName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unassigned";

  // Unique groups for students
  const availableStudentGroupsInEdit = useMemo(
    () => Array.from(new Set(students.map((s) => s.group).filter(Boolean))) as string[],
    [students],
  );

  // Filtered students inside edit/create course dialog
  const filteredStudentsInEdit = useMemo(() => {
    return students.filter((s) => {
      const matchesGroup =
        studentGroupFilterInEdit === "all"
          ? true
          : studentGroupFilterInEdit === "none"
            ? !s.group
            : s.group === studentGroupFilterInEdit;
      const q = studentSearchInEdit.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.group && s.group.toLowerCase().includes(q));
      return matchesGroup && matchesQuery;
    });
  }, [students, studentGroupFilterInEdit, studentSearchInEdit]);

  const toggleEnrollEntireGroup = (groupName: string) => {
    const groupStudents = students.filter((s) => s.group === groupName);
    const groupStudentIds = groupStudents.map((s) => s.id);
    const allEnrolled = groupStudentIds.every((id) => draft.studentIds.includes(id));

    if (allEnrolled) {
      // Unenroll all in group
      setDraft((prev) => ({
        ...prev,
        studentIds: prev.studentIds.filter((id) => !groupStudentIds.includes(id)),
      }));
      toast.success(`Unenrolled all students in group "${groupName}".`);
    } else {
      // Enroll all in group
      setDraft((prev) => ({
        ...prev,
        studentIds: Array.from(new Set([...prev.studentIds, ...groupStudentIds])),
      }));
      toast.success(`Enrolled all ${groupStudents.length} students in group "${groupName}"!`);
    }
  };

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const tName = teacherName(c.teacherId).toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        tName.includes(q)
      );
    });
  }, [courses, query, users]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft, teacherId: teachers[0]?.id ?? "" });
    setDialogOpen(true);
  };
  const openEdit = (c: Course) => {
    setEditing(c);
    setDraft({
      name: c.name || "",
      code: c.code || "",
      description: c.description || "",
      thumbnail: c.thumbnail || "📘",
      teacherId: c.teacherId || teachers[0]?.id || "",
      status: c.status || "active",
      studentIds: [...(c.studentIds || [])],
      studentAccess: { ...(c.studentAccess ?? {}) },
      showInPreview: c.showInPreview ?? true,
      previewVideoUrl: c.previewVideoUrl ?? "",
      lockProgression: c.lockProgression ?? c.sequentialProgression ?? false,
      sequentialProgression: c.lockProgression ?? c.sequentialProgression ?? false,
      badgeTag: c.badgeTag ?? "",
      featuredBadgeText: c.featuredBadgeText ?? "",
      durationText: c.durationText ?? "",
      projectsText: c.projectsText ?? "",
      techStack: Array.isArray(c.techStack)
        ? c.techStack
            .map((t: any) =>
              typeof t === "string"
                ? { name: t, icon: "⚡" }
                : { name: t?.name || "", icon: t?.icon || "⚡" },
            )
            .filter((t) => t.name)
        : [],
    });
    setDialogOpen(true);
  };

  const addTechBadge = () => {
    if (!newBadgeName.trim()) return;
    setDraft((d) => ({
      ...d,
      techStack: [...d.techStack, { name: newBadgeName.trim(), icon: newBadgeIcon || "⚡" }],
    }));
    setNewBadgeName("");
    setNewBadgeIcon("⚡");
  };

  const removeTechBadge = (index: number) => {
    setDraft((d) => ({
      ...d,
      techStack: d.techStack.filter((_, i) => i !== index),
    }));
  };

  const toggleStudent = (id: string) =>
    setDraft((d) => {
      const has = d.studentIds.includes(id);
      const studentIds = has ? d.studentIds.filter((s) => s !== id) : [...d.studentIds, id];
      const studentAccess = { ...d.studentAccess };
      if (has) delete studentAccess[id];
      else if (!studentAccess[id]) studentAccess[id] = { accessMode: "lifetime" };
      return { ...d, studentIds, studentAccess };
    });

  const setStudentAccess = (id: string, patch: Partial<StudentAccessDraft>) =>
    setDraft((d) => {
      const current: StudentAccessDraft = d.studentAccess[id] ?? { accessMode: "lifetime" };
      const next: StudentAccessDraft = { ...current, ...patch };
      return { ...d, studentAccess: { ...d.studentAccess, [id]: next } };
    });

  const save = () => {
    if (!draft.name.trim() || !draft.code.trim()) {
      toast.error("Course name and code are required.");
      return;
    }
    for (const sid of draft.studentIds) {
      const a = draft.studentAccess[sid];
      if (a?.accessMode === "limited" && !a.endDate) {
        toast.error(`Set an end date for ${users.find((u) => u.id === sid)?.name ?? "student"}.`);
        return;
      }
    }
    const { studentAccess, ...rest } = draft;
    const payload = {
      ...rest,
      studentAccess,
      // legacy fields kept for backward compat
      startDate: "",
      endDate: "",
      accessMode: "lifetime" as const,
    };
    if (editing) {
      updateCourse(editing.id, payload);
      toast.success(`Updated ${draft.name}.`);
    } else {
      addCourse(payload);
      toast.success(`Created ${draft.name}.`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteCourse(toDelete.id);
    toast.success(`Deleted ${toDelete.name}.`);
    setToDelete(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Course Management"
        subtitle="Create courses, assign teachers and enroll students."
        actions={
          <Button
            onClick={openCreate}
            className="gradient-primary text-primary-foreground border-0 glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Courses" value={courses.length} icon={BookOpen} />
        <StatCard
          label="Active"
          value={courses.filter((c) => c.status === "active").length}
          icon={GraduationCap}
          delay={0.05}
        />
        <StatCard
          label="Enrollments"
          value={courses.reduce((n, c) => n + c.studentIds.length, 0)}
          icon={UsersIcon}
          delay={0.1}
        />
      </div>

      {/* Course Search Bar */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] sm:min-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search courses by title, code, description, or instructor..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-8 h-10 bg-background/50 border-border/80 text-sm focus-visible:ring-primary/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Showing <span className="font-bold text-foreground">{filteredCourses.length}</span> of{" "}
          <span className="font-bold text-foreground">{courses.length}</span> courses
        </div>
      </GlassCard>

      {filteredCourses.length === 0 ? (
        <GlassCard className="text-center py-16">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <div className="font-semibold text-lg text-foreground">No courses found</div>
          <p className="text-sm text-muted-foreground mt-1">
            No courses match your search criteria "{query}".
          </p>
          <Button variant="outline" size="sm" onClick={() => setQuery("")} className="mt-4">
            Clear search
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedCourses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <GlassCard className="h-full flex flex-col hover:border-primary/40 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CourseThumbnail thumbnail={c.thumbnail} name={c.name} className="h-12 w-12" />
                      <div>
                        <div className="font-semibold leading-tight">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.code}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`capitalize ${statusColors[c.status]}`}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2 flex-1">
                    {c.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {teacherName(c.teacherId)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <UsersIcon className="h-3.5 w-3.5" />
                      {c.studentIds.length} students
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 cursor-pointer"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive cursor-pointer"
                      onClick={() => setToDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <GlassCard className="p-3 flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredCourses.length)} of{" "}
                <span className="font-bold text-foreground">{filteredCourses.length}</span> courses
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <span className="text-xs font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs cursor-pointer disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit course" : "Create course"}</DialogTitle>
            <DialogDescription>
              Set up course details, assign a teacher and enroll students.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cname">Course name</Label>
              <Input
                id="cname"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Full Stack MERN Development"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccode">Course code</Label>
              <Input
                id="ccode"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="e.g. ITA-101"
              />
            </div>
            <div className="space-y-2">
              <Label>Course Icon / Cover Image</Label>
              <EmojiPicker
                value={draft.thumbnail}
                onChange={(v) => setDraft({ ...draft, thumbnail: v })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cdesc">Description</Label>
              <Textarea
                id="cdesc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                placeholder="What learners will achieve"
              />
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select
                value={draft.teacherId}
                onValueChange={(v) => setDraft({ ...draft, teacherId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as Course["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="showInPreview"
                checked={draft.showInPreview}
                onCheckedChange={(checked) => setDraft({ ...draft, showInPreview: !!checked })}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="showInPreview" className="cursor-pointer text-sm font-medium">
                  Show in Preview Page
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allows non-registered users to preview this course syllabus.
                </p>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="previewVideoUrl">Preview Video URL (Optional)</Label>
              <Input
                id="previewVideoUrl"
                value={draft.previewVideoUrl}
                onChange={(e) => setDraft({ ...draft, previewVideoUrl: e.target.value })}
                placeholder="e.g. https://www.youtube.com/watch?v=... or direct link"
              />
            </div>

            {/* Custom Preview Card Settings Section */}
            <div className="space-y-4 sm:col-span-2 rounded-xl border border-border/60 bg-secondary/20 p-4">
              <div className="text-sm font-bold text-foreground">
                Landing Page Card Customization
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="badgeTag" className="text-xs">
                    Title Badge Tag
                  </Label>
                  <Input
                    id="badgeTag"
                    value={draft.badgeTag}
                    onChange={(e) => setDraft({ ...draft, badgeTag: e.target.value })}
                    placeholder="e.g. GenAI, Python 3.12, Advanced"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="featuredBadgeText" className="text-xs">
                    Top Featured Tag Label
                  </Label>
                  <Input
                    id="featuredBadgeText"
                    value={draft.featuredBadgeText}
                    onChange={(e) => setDraft({ ...draft, featuredBadgeText: e.target.value })}
                    placeholder="e.g. Featured, Bestseller, New"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="durationText" className="text-xs">
                    Meta Row 1 (Duration / Guidance)
                  </Label>
                  <Input
                    id="durationText"
                    value={draft.durationText}
                    onChange={(e) => setDraft({ ...draft, durationText: e.target.value })}
                    placeholder="e.g. 6 months self-paced & live guidance"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="projectsText" className="text-xs">
                    Meta Row 2 (Projects / Hands-on)
                  </Label>
                  <Input
                    id="projectsText"
                    value={draft.projectsText}
                    onChange={(e) => setDraft({ ...draft, projectsText: e.target.value })}
                    placeholder="e.g. 10+ real-time production projects"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Tech Stack Pills Customizer */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Tech Stack Marquee Pills ({draft.techStack.length})
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Leave empty to auto-extract from curriculum
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 py-1">
                  {draft.techStack.map((badge, idx) => (
                    <span
                      key={`${badge.name}-${idx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-foreground border border-border/60"
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                      <button
                        type="button"
                        onClick={() => removeTechBadge(idx)}
                        className="ml-1 text-muted-foreground hover:text-destructive text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {draft.techStack.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No custom tech pills (Auto-Extract active)
                    </span>
                  )}
                </div>

                <div className="flex gap-2 items-center pt-1">
                  <EmojiPicker value={newBadgeIcon} onChange={setNewBadgeIcon} />
                  <Input
                    value={newBadgeName}
                    onChange={(e) => setNewBadgeName(e.target.value)}
                    placeholder="Tech Name (e.g. Docker, Rust, PyTorch)"
                    className="h-9 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTechBadge();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addTechBadge}
                    className="h-8 text-xs"
                  >
                    + Add Badge
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>Enrolled students ({draft.studentIds.length})</Label>
                  <p className="text-xs text-muted-foreground">
                    Search and select students or enroll entire cohorts into this course.
                  </p>
                </div>
              </div>

              {/* Search & Group Filter Bar */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name, email, or ID..."
                    value={studentSearchInEdit}
                    onChange={(e) => setStudentSearchInEdit(e.target.value)}
                    className="pl-8 h-8 text-xs bg-secondary/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={studentGroupFilterInEdit}
                    onValueChange={setStudentGroupFilterInEdit}
                  >
                    <SelectTrigger className="h-8 text-xs bg-secondary/30">
                      <SelectValue placeholder="Filter by Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      <SelectItem value="none">No Group (Unassigned)</SelectItem>
                      {availableStudentGroupsInEdit.map((grp) => (
                        <SelectItem key={grp} value={grp}>
                          {grp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Group Batch Enroll Shortcut Buttons */}
              {availableStudentGroupsInEdit.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground font-medium mr-1">
                    Batch Enroll Group:
                  </span>
                  {availableStudentGroupsInEdit.map((grp) => {
                    const groupStudents = students.filter((s) => s.group === grp);
                    const allInGroupEnrolled =
                      groupStudents.length > 0 &&
                      groupStudents.every((s) => draft.studentIds.includes(s.id));
                    return (
                      <Button
                        key={grp}
                        type="button"
                        variant={allInGroupEnrolled ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleEnrollEntireGroup(grp)}
                        className={`h-7 text-xs ${allInGroupEnrolled ? "gradient-primary text-primary-foreground border-0" : "bg-secondary/40"}`}
                      >
                        {allInGroupEnrolled ? "✓ " : "+ "}
                        {grp} ({groupStudents.length})
                      </Button>
                    );
                  })}
                </div>
              )}

              <ScrollArea className="h-64 rounded-xl border border-border p-2">
                <div className="space-y-1">
                  {filteredStudentsInEdit.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No students match your search or filter.
                    </div>
                  ) : (
                    filteredStudentsInEdit.map((s) => {
                      const enrolled = draft.studentIds.includes(s.id);
                      const acc = draft.studentAccess[s.id] ?? { accessMode: "lifetime" as const };
                      return (
                        <div key={s.id} className="rounded-lg px-2 py-1.5 hover:bg-secondary/40">
                          <label className="flex items-center gap-2 text-sm cursor-pointer w-full">
                            <Checkbox
                              checked={enrolled}
                              onCheckedChange={() => toggleStudent(s.id)}
                            />
                            <span className="font-medium truncate">{s.name}</span>
                            {s.group && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 bg-secondary/50 font-normal"
                              >
                                {s.group}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono truncate ml-auto">
                              ({s.email} · ID: {s.id})
                            </span>
                          </label>
                          {enrolled && (
                            <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">
                              <RadioGroup
                                value={acc.accessMode}
                                onValueChange={(v) =>
                                  setStudentAccess(s.id, {
                                    accessMode: v as "lifetime" | "limited",
                                    endDate: v === "lifetime" ? undefined : acc.endDate,
                                  })
                                }
                                className="flex gap-2"
                              >
                                <Label className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs cursor-pointer">
                                  <RadioGroupItem
                                    value="lifetime"
                                    id={`life-${s.id}`}
                                    className="h-3.5 w-3.5"
                                  />
                                  Lifetime
                                </Label>
                                <Label className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs cursor-pointer">
                                  <RadioGroupItem
                                    value="limited"
                                    id={`lim-${s.id}`}
                                    className="h-3.5 w-3.5"
                                  />
                                  Limited
                                </Label>
                              </RadioGroup>
                              {acc.accessMode === "limited" && (
                                <Input
                                  type="date"
                                  value={acc.endDate ?? ""}
                                  onChange={(e) =>
                                    setStudentAccess(s.id, { endDate: e.target.value })
                                  }
                                  className="h-8 w-44 text-xs"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground border-0">
              {editing ? "Save changes" : "Create course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {toDelete?.name} along with its content and assessments.
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
