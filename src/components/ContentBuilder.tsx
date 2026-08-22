import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Video,
  FileText,
  BookOpen,
  FlaskConical,
  Link2,
  Download,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Presentation,
  ClipboardList,
  Search,
  Eye,
  ArrowUp,
  ArrowDown,
  Copy,
  Lock,
  Unlock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, CourseThumbnail } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useData, type ContentType, type ContentItem } from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { BuilderAnnouncements } from "./content-builder/BuilderAnnouncements";
import { BuilderDiscussions } from "./content-builder/BuilderDiscussions";
import { CheckpointDialog } from "./content-builder/CheckpointDialog";
import { ItemEditorDialog, type ItemDraft } from "./content-builder/ItemEditorDialog";

const typeMeta: Record<ContentType, { icon: typeof Video; label: string; color: string }> = {
  video: { icon: Video, label: "Video", color: "text-primary" },
  pdf: { icon: FileText, label: "PDF", color: "text-warning" },
  reading: { icon: BookOpen, label: "Reading", color: "text-success" },
  lab: { icon: FlaskConical, label: "Lab", color: "text-primary" },
  link: { icon: Link2, label: "Link", color: "text-muted-foreground" },
  download: { icon: Download, label: "Download", color: "text-muted-foreground" },
  image: { icon: ImageIcon, label: "Image", color: "text-primary" },
  ppt: {
    icon: Presentation,
    label: "PowerPoint Presentation (.ppt, .pptx)",
    color: "text-warning",
  },
  assessment: { icon: ClipboardList, label: "Assignment / Quiz", color: "text-primary" },
};

const emptyItem: ItemDraft = {
  type: "video",
  title: "",
  url: "",
  duration: "",
  fileSize: "",
  body: "",
  assessmentId: "",
};
const fileSizeLabel = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB`;

export function ContentBuilder() {
  const { user } = useAuth();
  const {
    courses,
    assessments,
    addSection,
    updateSection,
    deleteSection,
    addItem,
    updateItem,
    deleteItem,
    reorderSections,
    reorderItems,
    updateAssessment,
    updateCourse,
    announcements,
    discussions,
    discussionReplies,
    users,
    addAnnouncement,
    deleteAnnouncement,
    addDiscussion,
    deleteDiscussion,
    addDiscussionReply,
    deleteDiscussionReply,
    videoCheckpoints,
    addCheckpoint,
    deleteCheckpoint,
  } = useData();

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);

  const initialCourseId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("courseId")
      : null;
  const initialMatch = useMemo(
    () => courses.find((c) => c.id === initialCourseId),
    [courses, initialCourseId],
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    initialMatch ? initialCourseId : null,
  );
  const [courseFilter, setCourseFilter] = useState("");
  const [courseId, setCourseId] = useState<string>(initialMatch ? initialCourseId || "" : "");

  const filteredCourses = useMemo(() => {
    if (!courseFilter.trim()) return myCourses;
    const q = courseFilter.trim().toLowerCase();
    return myCourses.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [myCourses, courseFilter]);

  useEffect(() => {
    const qCourseId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("courseId")
        : null;
    if (qCourseId) {
      const match = courses.find((c) => c.id === qCourseId);
      if (match) {
        setSelectedCourseId(qCourseId);
        setCourseId(qCourseId);
      } else {
        setSelectedCourseId(null);
        if (myCourses[0]) setCourseId(myCourses[0].id);
      }
    } else if (!courseId && myCourses[0]) {
      setCourseId(myCourses[0].id);
    }
  }, [myCourses, courses, courseId]);

  const course = courses.find((c) => c.id === courseId);

  // Sync course preview video URL
  const [videoUrl, setVideoUrl] = useState("");
  useEffect(() => {
    if (course) {
      setVideoUrl(course.previewVideoUrl ?? "");
    }
  }, [courseId, course?.previewVideoUrl]);

  const pickableAssessments = useMemo(
    () => assessments.filter((a) => a.courseId === courseId),
    [assessments, courseId],
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Tabs
  const [activeTab, setActiveTab] = useState<"content" | "announcements" | "discussion">("content");

  // Announcements state
  const [isComposingAnn, setIsComposingAnn] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annPinned, setAnnPinned] = useState(false);

  // Discussions state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const courseAnnouncements = useMemo(() => {
    if (!courseId) return [];
    return announcements
      .filter((a) => a.courseId === courseId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, courseId]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    if (!annTitle.trim() || !annBody.trim()) {
      toast.error("Title and message body are required.");
      return;
    }
    await addAnnouncement(courseId, annTitle.trim(), annBody.trim(), annPinned);
    toast.success("Announcement posted successfully!");
    setAnnTitle("");
    setAnnBody("");
    setAnnPinned(false);
    setIsComposingAnn(false);
  };

  const courseDiscussions = useMemo(() => {
    if (!courseId) return [];
    return discussions
      .filter((d) => d.courseId === courseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [discussions, courseId]);

  const filteredDiscussions = useMemo(() => {
    if (!searchQuery.trim()) return courseDiscussions;
    const q = searchQuery.toLowerCase();
    return courseDiscussions.filter(
      (d) => d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q),
    );
  }, [courseDiscussions, searchQuery]);

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unknown User";
  const getUserRole = (id: string) => users.find((u) => u.id === id)?.role ?? "";

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeThreadId) return;
    if (!replyBody.trim()) {
      toast.error("Reply body cannot be empty.");
      return;
    }
    await addDiscussionReply(activeThreadId, user.id, replyBody.trim());
    toast.success("Reply posted successfully!");
    setReplyBody("");
  };

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return discussions.find((d) => d.id === activeThreadId);
  }, [discussions, activeThreadId]);

  const activeReplies = useMemo(() => {
    if (!activeThreadId) return [];
    return discussionReplies
      .filter((r) => r.discussionId === activeThreadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [discussionReplies, activeThreadId]);

  // section dialog
  const [sectionDialog, setSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");

  // item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [itemSectionId, setItemSectionId] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItem);

  const [del, setDel] = useState<{
    kind: "section" | "item";
    sectionId: string;
    itemId?: string;
    label: string;
  } | null>(null);

  // Checkpoints State
  const [checkpointVideoItem, setCheckpointVideoItem] = useState<ContentItem | null>(null);
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null);

  // Checkpoint Draft fields
  const [cpTimestamp, setCpTimestamp] = useState("");
  const [cpType, setCpType] = useState<"mcq" | "truefalse" | "short">("mcq");
  const [cpPrompt, setCpPrompt] = useState("");
  const [cpOptions, setCpOptions] = useState<string[]>(["", "", "", ""]);
  const [cpCorrectIndex, setCpCorrectIndex] = useState("0");
  const [cpCorrectText, setCpCorrectText] = useState("");

  const itemCheckpoints = useMemo(() => {
    if (!checkpointVideoItem) return [];
    return videoCheckpoints
      .filter((cp) => cp.contentItemId === checkpointVideoItem.id)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [videoCheckpoints, checkpointVideoItem]);

  const openManageCheckpoints = (item: ContentItem) => {
    setCheckpointVideoItem(item);
    resetCheckpointForm();
  };

  const resetCheckpointForm = () => {
    setEditingCheckpointId(null);
    setCpTimestamp("");
    setCpType("mcq");
    setCpPrompt("");
    setCpOptions(["", "", "", ""]);
    setCpCorrectIndex("0");
    setCpCorrectText("");
  };

  const handleEditCheckpoint = (cp: any) => {
    setEditingCheckpointId(cp.id);
    const m = Math.floor(cp.timestamp / 60);
    const s = cp.timestamp % 60;
    setCpTimestamp(`${m}:${String(s).padStart(2, "0")}`);
    setCpType(cp.type);
    setCpPrompt(cp.prompt);
    if (cp.type === "mcq" && cp.options) {
      setCpOptions(cp.options);
    } else {
      setCpOptions(["", "", "", ""]);
    }
    setCpCorrectIndex(String(cp.correctIndex ?? 0));
    setCpCorrectText(cp.correctText ?? "");
  };

  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointVideoItem) return;

    let seconds = 0;
    if (cpTimestamp.includes(":")) {
      const parts = cpTimestamp.split(":");
      const mins = Number(parts[0]) || 0;
      const secs = Number(parts[1]) || 0;
      seconds = mins * 60 + secs;
    } else {
      seconds = Number(cpTimestamp) || 0;
    }

    if (seconds < 0 || (isNaN(seconds) && cpTimestamp !== "0")) {
      toast.error("Please enter a valid timestamp (e.g. 1:30 or 90).");
      return;
    }

    if (!cpPrompt.trim()) {
      toast.error("Please enter a prompt/question.");
      return;
    }

    let optionsPayload: string[] | null = null;
    let correctIndexPayload: number | null = null;
    let correctTextPayload: string | null = null;

    if (cpType === "mcq") {
      const filteredOptions = cpOptions.map((o) => o.trim()).filter(Boolean);
      if (filteredOptions.length < 2) {
        toast.error("MCQ must have at least 2 non-empty options.");
        return;
      }
      optionsPayload = cpOptions;
      correctIndexPayload = Number(cpCorrectIndex);
    } else if (cpType === "truefalse") {
      optionsPayload = ["True", "False"];
      correctIndexPayload = Number(cpCorrectIndex);
    } else {
      if (!cpCorrectText.trim()) {
        toast.error("Please enter the correct answer text.");
        return;
      }
      correctTextPayload = cpCorrectText.trim();
    }

    await addCheckpoint({
      id: editingCheckpointId || undefined,
      contentItemId: checkpointVideoItem.id,
      timestamp: seconds,
      type: cpType,
      prompt: cpPrompt.trim(),
      options: optionsPayload,
      correctIndex: correctIndexPayload,
      correctText: correctTextPayload,
    });

    toast.success(editingCheckpointId ? "Checkpoint updated." : "Checkpoint added.");
    resetCheckpointForm();
  };

  const openAddSection = () => {
    setEditingSection(null);
    setSectionTitle("");
    setSectionDialog(true);
  };
  const openEditSection = (id: string, title: string) => {
    setEditingSection(id);
    setSectionTitle(title);
    setSectionDialog(true);
  };
  const saveSection = () => {
    if (!sectionTitle.trim()) {
      toast.error("Section title is required.");
      return;
    }
    if (!course) return;
    if (editingSection) {
      updateSection(course.id, editingSection, sectionTitle.trim());
      toast.success("Section updated.");
    } else {
      addSection(course.id, sectionTitle.trim());
      toast.success("Section added.");
    }
    setSectionDialog(false);
  };

  const openAddItem = (sectionId: string) => {
    setItemSectionId(sectionId);
    setEditingItemId(null);
    setItemDraft(emptyItem);
    setItemDialog(true);
  };
  const openEditItem = (sectionId: string, item: ContentItem) => {
    setItemSectionId(sectionId);
    setEditingItemId(item.id);
    setItemDraft({
      type: item.type,
      title: item.title,
      url: item.url ?? "",
      duration: item.duration ? String(item.duration) : "",
      fileSize: item.fileSize ?? "",
      body: item.body ?? "",
      assessmentId: item.assessmentId ?? "",
    });
    setItemDialog(true);
  };
  const saveItem = () => {
    if (!itemDraft.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!course) return;
    if (itemDraft.type === "assessment" && !itemDraft.assessmentId) {
      toast.error("Choose an assessment.");
      return;
    }
    const payload: Omit<ContentItem, "id"> = {
      type: itemDraft.type,
      title: itemDraft.title.trim(),
      url: itemDraft.url.trim() || undefined,
      duration: itemDraft.duration ? Number(itemDraft.duration) : undefined,
      fileSize: itemDraft.fileSize.trim() || undefined,
      body: itemDraft.body.trim() || undefined,
      assessmentId:
        itemDraft.type === "assessment" ? itemDraft.assessmentId || undefined : undefined,
    };
    if (editingItemId) {
      updateItem(course.id, itemSectionId, editingItemId, payload);
      toast.success("Content updated.");
    } else {
      addItem(course.id, itemSectionId, payload);
      toast.success("Content added.");
    }

    if (itemDraft.type === "assessment" && itemDraft.assessmentId) {
      const linked = assessments.find((a) => a.id === itemDraft.assessmentId);
      if (linked && linked.courseId !== course.id)
        updateAssessment(linked.id, { courseId: course.id });
    }
    setItemDialog(false);
  };

  const confirmDelete = () => {
    if (!del || !course) return;
    if (del.kind === "section") deleteSection(course.id, del.sectionId);
    else if (del.itemId) deleteItem(course.id, del.sectionId, del.itemId);
    toast.success("Removed.");
    setDel(null);
  };

  if (!selectedCourseId) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Content Builder"
          subtitle="Select a course below to build modules, lessons, assignments & learning resources."
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            placeholder="Search courses by name or code..."
            className="pl-10 h-10 bg-secondary/30"
          />
        </div>

        {filteredCourses.length === 0 ? (
          <GlassCard className="text-center py-16">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <div className="font-semibold text-lg">No courses found</div>
            <p className="text-sm text-muted-foreground mt-1">
              {courseFilter
                ? `No courses matching "${courseFilter}".`
                : "No courses assigned to you yet."}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((c) => {
              const sectionCount = c.sections.length;
              const itemCount = c.sections.reduce((n, s) => n + s.items.length, 0);

              return (
                <GlassCard
                  key={c.id}
                  className="flex flex-col justify-between p-6 hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <CourseThumbnail
                        thumbnail={c.thumbnail}
                        name={c.name}
                        className="h-14 w-14 rounded-xl shadow-md"
                      />
                      <Badge variant="outline" className="border-border text-xs font-mono">
                        {c.code}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {c.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {sectionCount} {sectionCount === 1 ? "Section" : "Sections"}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {itemCount} {itemCount === 1 ? "Item" : "Items"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-6 border-t border-border/50 mt-4">
                    <Button
                      onClick={() => {
                        setCourseId(c.id);
                        setSelectedCourseId(c.id);
                        if (typeof window !== "undefined") {
                          const url = new URL(window.location.href);
                          url.searchParams.set("courseId", c.id);
                          window.history.pushState({}, "", url.toString());
                        }
                      }}
                      className="flex-1 gradient-primary text-primary-foreground border-0 glow gap-2 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" /> Manage Content
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      title="View as Student"
                      className="border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                    >
                      <Link
                        to="/student/courses/$courseId"
                        params={{ courseId: c.id }}
                        search={{ from: "list" }}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    if (!course) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= course.sections.length) return;
    const newSections = [...course.sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIdx, 0, moved);
    reorderSections(course.id, newSections);
    toast.success("Section reordered");
  };

  const moveItem = (sectionId: string, itemIdx: number, direction: "up" | "down") => {
    if (!course) return;
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const targetIdx = direction === "up" ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= section.items.length) return;
    const newItems = [...section.items];
    const [moved] = newItems.splice(itemIdx, 1);
    newItems.splice(targetIdx, 0, moved);
    reorderItems(course.id, sectionId, newItems);
    toast.success("Lesson reordered");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Content Builder"
          subtitle={
            course ? `Building modules & lessons for ${course.name}` : "Build modules & content"
          }
        />
        <Button
          variant="outline"
          onClick={() => {
            setSelectedCourseId(null);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("courseId");
              window.history.pushState({}, "", url.toString());
            }
          }}
          className="gap-2 border-border"
        >
          ← Back to All Courses
        </Button>
      </div>

      {/* Course selector bar */}
      <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-border">
        <GlassCard className="flex flex-wrap items-center gap-4 border-0 rounded-b-none border-b border-border/50">
          <Label className="text-sm">Editing course</Label>
          <Select
            value={courseId}
            onValueChange={(val) => {
              setCourseId(val);
              setSelectedCourseId(val);
              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.set("courseId", val);
                window.history.pushState({}, "", url.toString());
              }
            }}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {myCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.thumbnail} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {course && (
            <div className="ml-auto flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-2 border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
              >
                <Link
                  to="/student/courses/$courseId"
                  params={{ courseId: course.id }}
                  search={{ from: "editor" }}
                >
                  <Eye className="h-4 w-4" /> View as Student
                </Link>
              </Button>
              <Badge variant="outline" className="border-border">
                {course.sections.length} sections ·{" "}
                {course.sections.reduce((n, s) => n + s.items.length, 0)} items
              </Badge>
            </div>
          )}
        </GlassCard>
        {course && activeTab === "content" && (
          <GlassCard className="flex flex-col gap-4 border-0 rounded-t-none bg-secondary/10 p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
              <div className="flex flex-col gap-1.5 w-full max-w-lg">
                <Label htmlFor="previewVideoUrl" className="text-xs font-semibold">
                  Course Preview Video URL
                </Label>
                <div className="flex gap-2 w-full">
                  <Input
                    id="previewVideoUrl"
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="h-9 text-xs bg-secondary/30 flex-1"
                  />
                  <Button
                    onClick={() => {
                      updateCourse(course.id, { previewVideoUrl: videoUrl });
                      toast.success("Preview video updated.");
                    }}
                    size="sm"
                    className="h-9 gradient-primary text-primary-foreground border-0 glow"
                  >
                    Save Video
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-xs leading-normal pb-1">
                Setting this preview video allows non-registered visitors to watch a video
                introduction on the landing page catalog.
              </p>
            </div>

            {/* Sequential Module & Content Locking Settings */}
            {(() => {
              const isSequential = Boolean(
                course.lockProgression ?? course.sequentialProgression ?? false,
              );
              return (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-border/40">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 transition-colors ${
                        isSequential
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isSequential ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          Sequential Module & Lesson Progression
                        </span>
                        <Badge
                          variant={isSequential ? "default" : "outline"}
                          className={`text-[10px] h-4.5 font-mono ${
                            isSequential
                              ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/40"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isSequential ? "Active (Locked)" : "Disabled (Free Access)"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal max-w-xl">
                        {isSequential
                          ? "Students must complete each lesson in order to unlock subsequent lessons and modules."
                          : "Students can freely navigate and open any lesson or section without sequential completion."}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={isSequential ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const nextVal = !isSequential;
                      updateCourse(course.id, {
                        lockProgression: nextVal,
                        sequentialProgression: nextVal,
                      });
                      toast.success(
                        nextVal
                          ? "Sequential progression enabled! Students must finish each lesson to unlock the next."
                          : "Sequential progression disabled! Students can now access lessons in any order.",
                      );
                    }}
                    className={`h-8 text-xs font-medium cursor-pointer shrink-0 gap-1.5 transition-all ${
                      isSequential
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
                        : "border-border hover:bg-secondary/60 text-foreground"
                    }`}
                  >
                    {isSequential ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Lock Progression Active
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        Enable Lock Progression
                      </>
                    )}
                  </Button>
                </div>
              );
            })()}
          </GlassCard>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "content" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("content");
              setIsComposingAnn(false);
            }}
            className="h-9 text-xs"
          >
            Modules & Content
          </Button>
          <Button
            variant={activeTab === "announcements" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("announcements");
              setIsComposingAnn(false);
            }}
            className="h-9 text-xs"
          >
            Announcements
          </Button>
          <Button
            variant={activeTab === "discussion" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("discussion");
              setIsComposingAnn(false);
            }}
            className="h-9 text-xs"
          >
            Q&A Discussions
          </Button>
        </div>

        {course && activeTab === "content" && (
          <Button
            onClick={openAddSection}
            size="sm"
            className="gradient-primary text-primary-foreground border-0 glow gap-1.5 h-8 text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Section
          </Button>
        )}
      </div>

      {activeTab === "content" && (
        <>
          {myCourses.length === 0 && (
            <GlassCard className="text-center py-12 text-sm text-muted-foreground">
              No courses assigned to you yet.
            </GlassCard>
          )}

          {course && course.sections.length === 0 && (
            <GlassCard className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No sections yet. Add your first section to start building.
              </p>
              <Button
                onClick={openAddSection}
                className="mt-4 gradient-primary text-primary-foreground border-0"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </GlassCard>
          )}

          <div className="space-y-4">
            {course?.sections.map((sec, i) => {
              const isOpen = open[sec.id] ?? true;
              return (
                <motion.div
                  key={sec.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <GlassCard className="p-0 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-3 p-4 border-b border-border">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSection(i, "up")}
                          disabled={i === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed p-0.5"
                          title="Move section up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveSection(i, "down")}
                          disabled={i === course.sections.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed p-0.5"
                          title="Move section down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                        onClick={() => setOpen((o) => ({ ...o, [sec.id]: !isOpen }))}
                      >
                        <span className="font-semibold text-sm sm:text-base">{sec.title}</span>
                        <Badge variant="outline" className="border-border text-xs">
                          {sec.items.length}
                        </Badge>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAddItem(sec.id)}
                        className="h-8 text-xs"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Content
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditSection(sec.id, sec.title)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() =>
                          setDel({ kind: "section", sectionId: sec.id, label: sec.title })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <div className="divide-y divide-border">
                            {sec.items.map((it, itemIdx) => {
                              const m = typeMeta[it.type];
                              const Icon = m.icon;
                              return (
                                <div
                                  key={it.id}
                                  className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 hover:bg-secondary/30 transition"
                                >
                                  {/* Item Reorder Buttons */}
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <button
                                      onClick={() => moveItem(sec.id, itemIdx, "up")}
                                      disabled={itemIdx === 0}
                                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed p-0.5"
                                      title="Move lesson up"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => moveItem(sec.id, itemIdx, "down")}
                                      disabled={itemIdx === sec.items.length - 1}
                                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed p-0.5"
                                      title="Move lesson down"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </div>

                                  <div
                                    className={`h-8 w-8 grid place-items-center rounded-lg bg-secondary/60 ${m.color} shrink-0`}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{it.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {m.label}
                                      {it.duration ? ` · ${it.duration} min` : ""}
                                      {it.fileSize ? ` · ${it.fileSize}` : ""}
                                    </div>
                                  </div>
                                  {it.type === "video" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-primary hover:text-primary/80 shrink-0 font-medium text-xs px-2 h-8"
                                      onClick={() => openManageCheckpoints(it)}
                                    >
                                      <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Checkpoints
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditItem(sec.id, it)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive h-8 w-8"
                                    onClick={() =>
                                      setDel({
                                        kind: "item",
                                        sectionId: sec.id,
                                        itemId: it.id,
                                        label: it.title,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                            {sec.items.length === 0 && (
                              <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                                No content yet — add a video, reading or lab.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}

            {course && course.sections.length > 0 && (
              <Button
                variant="outline"
                onClick={openAddSection}
                className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Another Section / Module</span>
              </Button>
            )}
          </div>
        </>
      )}

      {activeTab === "announcements" && course && (
        <BuilderAnnouncements
          courseAnnouncements={courseAnnouncements}
          isComposingAnn={isComposingAnn}
          setIsComposingAnn={setIsComposingAnn}
          annTitle={annTitle}
          setAnnTitle={setAnnTitle}
          annBody={annBody}
          setAnnBody={setAnnBody}
          annPinned={annPinned}
          setAnnPinned={setAnnPinned}
          handlePostAnnouncement={handlePostAnnouncement}
          deleteAnnouncement={deleteAnnouncement}
        />
      )}

      {activeTab === "discussion" && course && (
        <BuilderDiscussions
          filteredDiscussions={filteredDiscussions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          activeThread={activeThread}
          activeReplies={activeReplies}
          replyBody={replyBody}
          setReplyBody={setReplyBody}
          handlePostReply={handlePostReply}
          getUserName={getUserName}
          getUserRole={getUserRole}
          deleteDiscussion={deleteDiscussion}
          deleteDiscussionReply={deleteDiscussionReply}
        />
      )}

      {/* Section dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit section" : "Add section"}</DialogTitle>
            <DialogDescription>
              Sections group your content into logical modules or weeks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="stitle">Section title</Label>
            <Input
              id="stitle"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder="e.g. Module 1: Introduction"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveSection}
              className="gradient-primary text-primary-foreground border-0"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modular Item Dialog */}
      <ItemEditorDialog
        itemDialog={itemDialog}
        setItemDialog={setItemDialog}
        editingItemId={editingItemId}
        itemDraft={itemDraft}
        setItemDraft={setItemDraft}
        typeMeta={typeMeta}
        pickableAssessments={pickableAssessments}
        courses={courses}
        courseId={courseId}
        fileSizeLabel={fileSizeLabel}
        saveItem={saveItem}
      />

      {/* Modular Checkpoints Dialog */}
      <CheckpointDialog
        checkpointVideoItem={checkpointVideoItem}
        setCheckpointVideoItem={setCheckpointVideoItem}
        itemCheckpoints={itemCheckpoints}
        editingCheckpointId={editingCheckpointId}
        cpTimestamp={cpTimestamp}
        setCpTimestamp={setCpTimestamp}
        cpType={cpType}
        setCpType={setCpType}
        cpPrompt={cpPrompt}
        setCpPrompt={setCpPrompt}
        cpOptions={cpOptions}
        setCpOptions={setCpOptions}
        cpCorrectIndex={cpCorrectIndex}
        setCpCorrectIndex={setCpCorrectIndex}
        cpCorrectText={cpCorrectText}
        setCpCorrectText={setCpCorrectText}
        handleEditCheckpoint={handleEditCheckpoint}
        handleSaveCheckpoint={handleSaveCheckpoint}
        resetCheckpointForm={resetCheckpointForm}
        deleteCheckpoint={deleteCheckpoint}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {del?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              "{del?.label}" will be permanently removed
              {del?.kind === "section" ? " along with its content" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
