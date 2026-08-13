import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, GripVertical, Video, FileText, BookOpen, FlaskConical,
  Link2, Download, ChevronDown, Image as ImageIcon, Presentation, ClipboardList,
  Megaphone, Pin, MessageSquare, Send, CornerDownRight, Search, Eye, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, CourseThumbnail } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useData, type ContentType, type ContentItem } from "@/lib/data-store";
import { useAuth } from "@/lib/store";
import { FileUploadButton } from "@/components/FileUploadButton";
import { RichTextEditor } from "@/components/RichTextEditor";

const typeMeta: Record<ContentType, { icon: typeof Video; label: string; color: string }> = {
  video: { icon: Video, label: "Video", color: "text-primary" },
  pdf: { icon: FileText, label: "PDF", color: "text-warning" },
  reading: { icon: BookOpen, label: "Reading", color: "text-success" },
  lab: { icon: FlaskConical, label: "Lab", color: "text-primary" },
  link: { icon: Link2, label: "Link", color: "text-muted-foreground" },
  download: { icon: Download, label: "Download", color: "text-muted-foreground" },
  image: { icon: ImageIcon, label: "Image", color: "text-primary" },
  ppt: { icon: Presentation, label: "PowerPoint Presentation (.ppt, .pptx)", color: "text-warning" },
  assessment: { icon: ClipboardList, label: "Assignment / Quiz", color: "text-primary" },
};

type ItemDraft = { type: ContentType; title: string; url: string; duration: string; fileSize: string; body: string; assessmentId: string };
const emptyItem: ItemDraft = { type: "video", title: "", url: "", duration: "", fileSize: "", body: "", assessmentId: "" };

const fileSizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes > 1024 * 1024 ? 1 : 2)} MB`;

export function ContentBuilder() {
  const { user } = useAuth();
  const {
    courses, assessments, addSection, updateSection, deleteSection, addItem, updateItem, deleteItem, updateAssessment, updateCourse,
    announcements, discussions, discussionReplies, users, addAnnouncement, deleteAnnouncement, addDiscussion, deleteDiscussion, addDiscussionReply, deleteDiscussionReply,
    videoCheckpoints, addCheckpoint, deleteCheckpoint
  } = useData();

  const myCourses = useMemo(
    () => courses.filter((c) => !user || user.role !== "teacher" || c.teacherId === user.id),
    [courses, user],
  );
  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);

  const initialCourseId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("courseId") : null;
  const initialMatch = useMemo(() => courses.find((c) => c.id === initialCourseId), [courses, initialCourseId]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialMatch ? initialCourseId : null);
  const [courseFilter, setCourseFilter] = useState("");
  const [courseId, setCourseId] = useState<string>(initialMatch ? (initialCourseId || "") : "");

  const filteredCourses = useMemo(() => {
    if (!courseFilter.trim()) return myCourses;
    const q = courseFilter.trim().toLowerCase();
    return myCourses.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [myCourses, courseFilter]);

  useEffect(() => {
    const qCourseId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("courseId") : null;
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
    () => assessments.filter((a) => myCourseIds.has(a.courseId)),
    [assessments, myCourseIds],
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
      (d) => d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q)
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

  const [del, setDel] = useState<{ kind: "section" | "item"; sectionId: string; itemId?: string; label: string } | null>(null);

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
    setCpTimestamp(`${m}:${String(s).padStart(2, '0')}`);
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

  const openAddSection = () => { setEditingSection(null); setSectionTitle(""); setSectionDialog(true); };
  const openEditSection = (id: string, title: string) => { setEditingSection(id); setSectionTitle(title); setSectionDialog(true); };
  const saveSection = () => {
    if (!sectionTitle.trim()) { toast.error("Section title is required."); return; }
    if (!course) return;
    if (editingSection) { updateSection(course.id, editingSection, sectionTitle.trim()); toast.success("Section updated."); }
    else { addSection(course.id, sectionTitle.trim()); toast.success("Section added."); }
    setSectionDialog(false);
  };

  const openAddItem = (sectionId: string) => {
    setItemSectionId(sectionId); setEditingItemId(null); setItemDraft(emptyItem); setItemDialog(true);
  };
  const openEditItem = (sectionId: string, item: ContentItem) => {
    setItemSectionId(sectionId); setEditingItemId(item.id);
    setItemDraft({
      type: item.type, title: item.title, url: item.url ?? "",
      duration: item.duration ? String(item.duration) : "", fileSize: item.fileSize ?? "", body: item.body ?? "", assessmentId: item.assessmentId ?? "",
    });
    setItemDialog(true);
  };
  const saveItem = () => {
    if (!itemDraft.title.trim()) { toast.error("Title is required."); return; }
    if (!course) return;
    if (itemDraft.type === "assessment" && !itemDraft.assessmentId) { toast.error("Choose an assessment."); return; }
    const payload: Omit<ContentItem, "id"> = {
      type: itemDraft.type,
      title: itemDraft.title.trim(),
      url: itemDraft.url.trim() || undefined,
      duration: itemDraft.duration ? Number(itemDraft.duration) : undefined,
      fileSize: itemDraft.fileSize.trim() || undefined,
      body: itemDraft.body.trim() || undefined,
      assessmentId: itemDraft.type === "assessment" ? itemDraft.assessmentId || undefined : undefined,
    };
    if (editingItemId) { updateItem(course.id, itemSectionId, editingItemId, payload); toast.success("Content updated."); }
    else { addItem(course.id, itemSectionId, payload); toast.success("Content added."); }

    if (itemDraft.type === "assessment" && itemDraft.assessmentId) {
      const linked = assessments.find((a) => a.id === itemDraft.assessmentId);
      if (linked && linked.courseId !== course.id) updateAssessment(linked.id, { courseId: course.id });
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
              {courseFilter ? `No courses matching "${courseFilter}".` : "No courses assigned to you yet."}
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
                      <CourseThumbnail thumbnail={c.thumbnail} name={c.name} className="h-14 w-14 rounded-xl shadow-md" />
                      <Badge variant="outline" className="border-border text-xs font-mono">{c.code}</Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description || "No description provided."}</p>
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
                      <Link to="/student/courses/$courseId" params={{ courseId: c.id }} search={{ from: "list" }}>
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedCourseId(null);
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("courseId");
              window.history.pushState({}, "", url.toString());
            }
          }}
          className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All Courses
        </Button>
      </div>

      <PageHeader
        title={course ? course.name : "Content Builder"}
        subtitle={course ? `${course.code} · Build sections, lessons, assignments & materials.` : "Build sections with video, PDF, reading, labs, links & files."}
        actions={
          course && (
            activeTab === "content" ? (
              <Button onClick={openAddSection} className="gradient-primary text-primary-foreground border-0 glow">
                <Plus className="mr-2 h-4 w-4" />Add Section
              </Button>
            ) : activeTab === "announcements" ? (
              <Button onClick={() => setIsComposingAnn(!isComposingAnn)} className="gradient-primary text-primary-foreground border-0 glow">
                <Megaphone className="mr-2 h-4 w-4" />{isComposingAnn ? "View Announcements" : "New Announcement"}
              </Button>
            ) : null
          )
        }
      />

      <div className="flex flex-col gap-0 rounded-2xl overflow-hidden border border-border">
        <GlassCard className="flex flex-wrap items-center gap-4 border-0 rounded-b-none border-b border-border">
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
            <SelectTrigger className="w-72"><SelectValue placeholder="Select a course" /></SelectTrigger>
            <SelectContent>
              {myCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.thumbnail} {c.name}</SelectItem>)}
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
                <Link to="/student/courses/$courseId" params={{ courseId: course.id }} search={{ from: "editor" }}>
                  <Eye className="h-4 w-4" /> View as Student
                </Link>
              </Button>
              <Badge variant="outline" className="border-border">
                {course.sections.length} sections · {course.sections.reduce((n, s) => n + s.items.length, 0)} items
              </Badge>
            </div>
          )}
        </GlassCard>
        {course && activeTab === "content" && (
          <GlassCard className="flex flex-col sm:flex-row gap-4 items-end justify-between border-0 rounded-t-none bg-secondary/10">
            <div className="flex flex-col gap-1.5 w-full max-w-lg">
              <Label htmlFor="previewVideoUrl" className="text-xs font-semibold">Course Preview Video URL</Label>
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
              Setting this preview video allows non-registered visitors to watch a video introduction on the landing page catalog.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        <Button variant={activeTab === "content" ? "default" : "ghost"} size="sm" onClick={() => { setActiveTab("content"); setIsComposingAnn(false); }} className="h-9 text-xs">
          Modules & Content
        </Button>
        <Button variant={activeTab === "announcements" ? "default" : "ghost"} size="sm" onClick={() => { setActiveTab("announcements"); setIsComposingAnn(false); }} className="h-9 text-xs">
          Announcements
        </Button>
        <Button variant={activeTab === "discussion" ? "default" : "ghost"} size="sm" onClick={() => { setActiveTab("discussion"); setIsComposingAnn(false); }} className="h-9 text-xs">
          Q&A Discussions
        </Button>
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
              <p className="text-sm text-muted-foreground">No sections yet. Add your first section to start building.</p>
              <Button onClick={openAddSection} className="mt-4 gradient-primary text-primary-foreground border-0">
                <Plus className="mr-2 h-4 w-4" />Add Section
              </Button>
            </GlassCard>
          )}

          <div className="space-y-4">
            {course?.sections.map((sec, i) => {
              const isOpen = open[sec.id] ?? true;
              return (
                <motion.div key={sec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <GlassCard className="p-0 overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-border">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <button
                        className="flex items-center gap-2 flex-1 text-left"
                        onClick={() => setOpen((o) => ({ ...o, [sec.id]: !isOpen }))}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                        <span className="font-semibold">{sec.title}</span>
                        <Badge variant="outline" className="border-border text-xs">{sec.items.length}</Badge>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => openAddItem(sec.id)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />Content
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditSection(sec.id, sec.title)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                        onClick={() => setDel({ kind: "section", sectionId: sec.id, label: sec.title })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <div className="divide-y divide-border">
                            {sec.items.map((it) => {
                              const m = typeMeta[it.type];
                              const Icon = m.icon;
                              return (
                                <div key={it.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition">
                                  <div className={`h-8 w-8 grid place-items-center rounded-lg bg-secondary/60 ${m.color}`}>
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
                                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 shrink-0 font-medium text-xs px-2 h-8" onClick={() => openManageCheckpoints(it)}>
                                      <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Checkpoints
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => openEditItem(sec.id, it)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                                    onClick={() => setDel({ kind: "item", sectionId: sec.id, itemId: it.id, label: it.title })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                            {sec.items.length === 0 && (
                              <div className="px-5 py-6 text-center text-xs text-muted-foreground">No content yet — add a video, reading or lab.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "announcements" && course && (
        <div className="space-y-6">
          {isComposingAnn ? (
            <form onSubmit={handlePostAnnouncement} className="space-y-4 p-5 rounded-2xl border border-border bg-secondary/10">
              <div className="flex items-center gap-2 border-b border-border pb-3 mb-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Compose Course Announcement</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="anntitle">Announcement Title</Label>
                <Input
                  id="anntitle"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Schedule Update for Midterm Exam"
                  className="text-xs bg-secondary/30 animate-pulse-subtle focus:animate-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annbody">Announcement Body</Label>
                <Textarea
                  id="annbody"
                  rows={6}
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Write your announcement details here. Students will receive this by email and notification."
                  className="text-xs bg-secondary/30"
                />
              </div>
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="annpinned"
                  checked={annPinned}
                  onChange={(e) => setAnnPinned(e.target.checked)}
                  className="rounded border-border bg-secondary/30 text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="annpinned" className="text-xs cursor-pointer flex items-center gap-1.5 select-none">
                  <Pin className="h-3.5 w-3.5 text-primary" /> Pin this announcement to the top
                </Label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsComposingAnn(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gradient-primary text-primary-foreground border-0 glow">
                  Send Announcement
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground font-semibold">Course Announcements</h3>
              </div>

              {courseAnnouncements.length === 0 ? (
                <GlassCard className="text-center py-12 text-sm text-muted-foreground">
                  No announcements posted for this course. Click "New Announcement" to create one.
                </GlassCard>
              ) : (
                <div className="space-y-4">
                  {courseAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-5 rounded-2xl border transition ${ann.isPinned ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/10"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          {ann.isPinned && (
                            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 flex items-center gap-1 text-[10px]">
                              <Pin className="h-3 w-3 shrink-0" /> Pinned
                            </Badge>
                          )}
                          <h4 className="text-sm font-bold text-foreground leading-snug">{ann.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{new Date(ann.createdAt).toLocaleDateString()}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteAnnouncement(ann.id);
                              toast.success("Announcement deleted.");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{ann.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "discussion" && course && (
        <div className="space-y-6">
          {activeThread ? (
            <div className="space-y-6">
              <Button size="sm" variant="ghost" onClick={() => setActiveThreadId(null)} className="h-8 text-xs text-muted-foreground px-2">
                ← Back to discussions
              </Button>

              {/* Original Thread Post */}
              <div className="p-5 rounded-2xl border border-border/60 bg-secondary/10">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground leading-snug">{activeThread.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-primary">{getUserName(activeThread.userId)}</span>
                      <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1 py-0">{getUserRole(activeThread.userId)}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{new Date(activeThread.createdAt).toLocaleString()}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this thread?")) {
                          await deleteDiscussion(activeThread.id);
                          toast.success("Discussion thread deleted.");
                          setActiveThreadId(null);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border/40 pt-3">{activeThread.body}</p>
              </div>

              {/* Replies List */}
              <div className="space-y-3 pl-4 border-l-2 border-border/40">
                <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Replies ({activeReplies.length})</h5>

                {activeReplies.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-xl border border-border/40 bg-secondary/5 flex gap-3">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{getUserName(rep.userId)}</span>
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1 py-0">{getUserRole(rep.userId)}</Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-muted-foreground">{new Date(rep.createdAt).toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              deleteDiscussionReply(rep.id);
                              toast.success("Reply deleted.");
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{rep.body}</p>
                    </div>
                  </div>
                ))}

                {activeReplies.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2 pl-6">No replies yet.</p>
                )}
              </div>

              {/* Post Reply Form */}
              <form onSubmit={handlePostReply} className="space-y-2 pt-2">
                <Label className="text-xs font-bold">Write a Reply</Label>
                <Textarea
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your response or answer here..."
                  className="text-xs bg-secondary/30"
                />
                <Button type="submit" size="sm" className="gradient-primary text-primary-foreground border-0 glow">
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Post Reply
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground font-semibold">Course Discussions</h3>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discussions..."
                  className="pl-9 h-9 text-xs bg-secondary/30"
                />
              </div>

              {filteredDiscussions.length === 0 ? (
                <GlassCard className="text-center py-12 text-sm text-muted-foreground">
                  {searchQuery ? "No discussions matching search query." : "No discussions posted yet for this course."}
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {filteredDiscussions.map((disc) => {
                    const count = discussionReplies.filter((r) => r.discussionId === disc.id).length;
                    return (
                      <button
                        key={disc.id}
                        onClick={() => setActiveThreadId(disc.id)}
                        className="w-full text-left bg-transparent border-0 p-0 cursor-pointer block"
                      >
                        <GlassCard className="hover:border-primary/40 transition flex items-center justify-between p-4 gap-4 bg-secondary/5 border-border/60">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-foreground truncate">{disc.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-primary font-medium">{getUserName(disc.userId)}</span>
                              <span className="text-[9px] text-muted-foreground">• {new Date(disc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="border-border px-2 py-0.5 text-[10px] font-medium">
                              {count} repl{count === 1 ? "y" : "ies"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this thread?")) {
                                  await deleteDiscussion(disc.id);
                                  toast.success("Discussion thread deleted.");
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </GlassCard>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Rename section" : "Add section"}</DialogTitle>
            <DialogDescription>Sections group your content into modules.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="sectitle">Section title</Label>
            <Input id="sectitle" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="e.g. Getting Started" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>Cancel</Button>
            <Button onClick={saveSection} className="gradient-primary text-primary-foreground border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className={`max-h-[90vh] overflow-y-auto transition-all ${itemDraft.type === "reading" || itemDraft.type === "lab" ? "max-w-4xl sm:max-w-5xl" : "max-w-2xl"}`}>
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit content" : "Add content"}</DialogTitle>
            <DialogDescription>Choose a content type and fill in the details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={itemDraft.type} onValueChange={(v) => setItemDraft({ ...itemDraft, type: v as ContentType, url: "", body: "", assessmentId: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(typeMeta) as ContentType[]).map((t) => (
                    <SelectItem key={t} value={t}>{typeMeta[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ititle">Title</Label>
              <Input id="ititle" value={itemDraft.title} onChange={(e) => setItemDraft({ ...itemDraft, title: e.target.value })} placeholder="e.g. Welcome & Overview" />
            </div>
            {itemDraft.type === "reading" ? (
              <div className="space-y-2">
                <Label htmlFor="ibody" className="font-semibold text-sm">
                  Reading content (Document Editor)
                </Label>
                <RichTextEditor
                  value={itemDraft.body}
                  onChange={(html) => setItemDraft({ ...itemDraft, body: html })}
                  placeholder="Type or paste your reading material here — format headings, text colours, bullet points, and code blocks..."
                  minHeight={380}
                />
              </div>
            ) : itemDraft.type === "lab" ? (
              <div className="space-y-4 rounded-xl border border-border/80 bg-secondary/20 p-4">
                <div>
                  <Label className="font-semibold text-sm">Lab Material Options</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a PDF lab sheet, PowerPoint presentation, write Reading instructions, or provide a URL.</p>
                </div>

                <div className="space-y-4">
                  {/* File Uploads for PDF / PPT */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Option 1: Upload Lab Document / Presentation</Label>
                    <div className="flex flex-wrap gap-2">
                      <FileUploadButton
                        accept="application/pdf"
                        label="Upload Lab PDF (.pdf)"
                        onUpload={(dataUrl, file) => setItemDraft((d) => ({ ...d, url: dataUrl, fileSize: fileSizeLabel(file.size), title: d.title || file.name }))}
                      />
                      <FileUploadButton
                        accept=".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        label="Upload Lab Presentation (.ppt, .pptx)"
                        onUpload={(dataUrl, file) => setItemDraft((d) => ({ ...d, url: dataUrl, fileSize: fileSizeLabel(file.size), title: d.title || file.name }))}
                      />
                    </div>
                  </div>

                  {/* URL Input */}
                  <div className="space-y-2">
                    <Label htmlFor="iurl" className="text-xs font-semibold">Option 2: Lab Embed / Website URL</Label>
                    <Input id="iurl" value={itemDraft.url} onChange={(e) => setItemDraft({ ...itemDraft, url: e.target.value })} placeholder="https://..." />
                  </div>

                  {/* Rich Text Editor for Lab Reading Instructions */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label htmlFor="ibody" className="text-xs font-semibold">Option 3: Write Lab Reading Material / Instructions</Label>
                    <RichTextEditor
                      value={itemDraft.body}
                      onChange={(html) => setItemDraft({ ...itemDraft, body: html })}
                      placeholder="Write lab instructions, steps, requirements, and notes here..."
                      minHeight={280}
                    />
                  </div>
                </div>
              </div>
            ) : itemDraft.type === "assessment" ? (
              <div className="space-y-2">
                <Label>Assignment / Quiz</Label>
                <Select value={itemDraft.assessmentId} onValueChange={(v) => setItemDraft({ ...itemDraft, assessmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose an assignment or quiz" /></SelectTrigger>
                  <SelectContent>
                    {pickableAssessments.map((a) => {
                      const c = courses.find((x) => x.id === a.courseId);
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title}{a.isFinal ? " · Final" : ""}{c && c.id !== courseId ? ` (from ${c.name})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {pickableAssessments.length === 0 && <p className="text-xs text-muted-foreground">Create an assignment or quiz first from the Assignments & Quizzes page.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="iurl">Resource URL / Upload</Label>
                <Input id="iurl" value={itemDraft.url} onChange={(e) => setItemDraft({ ...itemDraft, url: e.target.value })} placeholder="https://..." />
                {(["video", "pdf", "image", "ppt", "download"] as ContentType[]).includes(itemDraft.type) && (
                  <>
                    <FileUploadButton
                      accept={itemDraft.type === "image" ? "image/*" : itemDraft.type === "ppt" ? ".ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" : itemDraft.type === "pdf" ? "application/pdf" : itemDraft.type === "video" ? "video/*" : "*/*"}
                      label={`Upload ${typeMeta[itemDraft.type].label}`}
                      onUpload={(dataUrl, file) => setItemDraft((d) => ({ ...d, url: dataUrl, fileSize: fileSizeLabel(file.size), title: d.title || file.name }))}
                    />
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {(itemDraft.type === "video" || itemDraft.type === "lab") && (
                <div className="space-y-2">
                  <Label htmlFor="idur">Duration (min)</Label>
                  <Input id="idur" type="number" value={itemDraft.duration} onChange={(e) => setItemDraft({ ...itemDraft, duration: e.target.value })} placeholder="12" />
                </div>
              )}
              {(["pdf", "download", "image", "ppt"] as ContentType[]).includes(itemDraft.type) && (
                <div className="space-y-2">
                  <Label htmlFor="isize">File size</Label>
                  <Input id="isize" value={itemDraft.fileSize} onChange={(e) => setItemDraft({ ...itemDraft, fileSize: e.target.value })} placeholder="2.4 MB" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} className="gradient-primary text-primary-foreground border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Checkpoints Dialog */}
      <Dialog open={!!checkpointVideoItem} onOpenChange={(o) => !o && setCheckpointVideoItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Video Checkpoints: {checkpointVideoItem?.title}</DialogTitle>
            <DialogDescription>
              Create questions that pause the video at a specific timestamp. Students must answer correctly to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2 py-4">
            {/* Left side: List of checkpoints */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Checkpoints ({itemCheckpoints.length})</h4>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {itemCheckpoints.map((cp) => {
                  const m = Math.floor(cp.timestamp / 60);
                  const s = cp.timestamp % 60;
                  const timeStr = `${m}:${String(s).padStart(2, '0')}`;
                  return (
                    <div key={cp.id} className="p-3.5 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/30 transition flex flex-col gap-2 relative group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="gradient-primary border-0 text-[10px] px-1.5 py-0.5">
                            {timeStr}
                          </Badge>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{cp.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCheckpoint(cp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { deleteCheckpoint(cp.id); toast.success("Checkpoint deleted."); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-foreground line-clamp-2">{cp.prompt}</p>
                      {cp.type === "mcq" && cp.options && (
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          {cp.options.map((opt, idx) => (
                            <div key={idx} className={idx === cp.correctIndex ? "text-primary font-bold" : ""}>
                              {idx + 1}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {cp.type === "truefalse" && (
                        <div className="text-[10px] text-muted-foreground">
                          Correct: <span className="text-primary font-bold">{cp.correctIndex === 0 ? "True" : "False"}</span>
                        </div>
                      )}
                      {cp.type === "short" && (
                        <div className="text-[10px] text-muted-foreground">
                          Answer: <span className="text-primary font-bold">{cp.correctText}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {itemCheckpoints.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    No checkpoints set for this video yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Add/Edit Form */}
            <form onSubmit={handleSaveCheckpoint} className="space-y-4 border-l border-border pl-0 md:pl-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                {editingCheckpointId ? "Edit Checkpoint" : "Add Checkpoint"}
              </h4>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cpTime" className="text-xs">Timestamp (MM:SS or Sec)</Label>
                    <Input id="cpTime" value={cpTimestamp} onChange={(e) => setCpTimestamp(e.target.value)} placeholder="e.g. 1:15 or 75" required className="text-xs h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Question Type</Label>
                    <Select value={cpType} onValueChange={(v: any) => { setCpType(v); setCpCorrectIndex("0"); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="truefalse">True / False</SelectItem>
                        <SelectItem value="short">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cpPrompt" className="text-xs">Question / Prompt</Label>
                  <Textarea id="cpPrompt" value={cpPrompt} onChange={(e) => setCpPrompt(e.target.value)} placeholder="Enter the question here..." rows={2} required className="text-xs" />
                </div>

                {cpType === "mcq" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options</Label>
                    <div className="grid gap-2">
                      {cpOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="text-[10px] text-muted-foreground w-4">{idx + 1}.</span>
                          <Input value={opt} onChange={(e) => {
                            const newOpts = [...cpOptions];
                            newOpts[idx] = e.target.value;
                            setCpOptions(newOpts);
                          }} placeholder={`Option ${idx + 1}`} required className="text-xs h-8 flex-1" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 mt-2">
                      <Label className="text-xs">Correct Index</Label>
                      <Select value={cpCorrectIndex} onValueChange={setCpCorrectIndex}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {cpOptions.map((_, idx) => (
                            <SelectItem key={idx} value={String(idx)}>Option {idx + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {cpType === "truefalse" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Correct Answer</Label>
                    <Select value={cpCorrectIndex} onValueChange={setCpCorrectIndex}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">True</SelectItem>
                        <SelectItem value="1">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {cpType === "short" && (
                  <div className="space-y-1">
                    <Label htmlFor="cpCorrectText" className="text-xs">Correct Answer (Case insensitive)</Label>
                    <Input id="cpCorrectText" value={cpCorrectText} onChange={(e) => setCpCorrectText(e.target.value)} placeholder="e.g. react" required className="text-xs h-8" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editingCheckpointId && (
                  <Button type="button" variant="outline" size="sm" onClick={resetCheckpointForm} className="h-8 text-xs">
                    Cancel Edit
                  </Button>
                )}
                <Button type="submit" size="sm" className="gradient-primary text-primary-foreground border-0 glow h-8 text-xs">
                  {editingCheckpointId ? "Update Checkpoint" : "Add Checkpoint"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {del?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              "{del?.label}" will be permanently removed{del?.kind === "section" ? " along with its content" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </Dialog>
    </div>
  );
}
