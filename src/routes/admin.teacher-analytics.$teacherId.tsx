import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Users,
  Upload,
  FileText,
  Video,
  ClipboardCheck,
  Award,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { PageHeader, GlassCard, StatCard, CourseThumbnail } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData, formatLastActive, formatIdleDuration, isUserInactive } from "@/lib/data-store";

export const Route = createFileRoute("/admin/teacher-analytics/$teacherId")({
  component: TeacherAnalyticsDetail,
});

interface ActivityLogItem {
  id: string;
  type: "upload" | "course" | "assessment" | "grading";
  title: string;
  subtitle: string;
  courseName: string;
  courseId: string;
  details?: string;
  timestamp?: string;
  contentType?: string;
}

function TeacherAnalyticsDetail() {
  const { teacherId } = Route.useParams();
  const { users, courses, assessments, submissions } = useData();

  // Search & Pagination state for logs
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Find target teacher
  const teacher = useMemo(
    () => users.find((u) => u.id === teacherId && u.role === "teacher"),
    [users, teacherId],
  );

  // Teacher's courses
  const teacherCourses = useMemo(
    () => courses.filter((c) => c.teacherId === teacherId),
    [courses, teacherId],
  );

  // Teacher's total students
  const totalStudents = useMemo(() => {
    const sIds = new Set<string>();
    for (const c of teacherCourses) {
      c.studentIds.forEach((id) => sIds.add(id));
    }
    return sIds.size;
  }, [teacherCourses]);

  // All uploaded content items across teacher's courses
  const allUploads = useMemo(() => {
    const items: Array<{ courseId: string; courseName: string; sectionTitle: string; item: any }> =
      [];
    for (const c of teacherCourses) {
      for (const s of c.sections) {
        for (const it of s.items) {
          items.push({ courseId: c.id, courseName: c.name, sectionTitle: s.title, item: it });
        }
      }
    }
    return items;
  }, [teacherCourses]);

  // Teacher's assessments
  const teacherAssessments = useMemo(() => {
    return assessments.filter((a) => teacherCourses.some((c) => c.id === a.courseId));
  }, [assessments, teacherCourses]);

  // Teacher's graded submissions
  const gradedSubmissions = useMemo(() => {
    const teacherAssessIds = new Set(teacherAssessments.map((a) => a.id));
    return submissions.filter((s) => teacherAssessIds.has(s.assessmentId) && s.status === "graded");
  }, [submissions, teacherAssessments]);

  // Compile full activity and log items
  const logs: ActivityLogItem[] = useMemo(() => {
    const logList: ActivityLogItem[] = [];

    // 1. Content uploads
    for (const u of allUploads) {
      logList.push({
        id: `upload-${u.item.id}`,
        type: "upload",
        title: u.item.title,
        subtitle: `Section: ${u.sectionTitle} (${u.item.type.toUpperCase()})`,
        courseName: u.courseName,
        courseId: u.courseId,
        contentType: u.item.type,
        details: u.item.fileName
          ? `${u.item.fileName} (${u.item.fileSize || "unknown size"})`
          : u.item.url
            ? u.item.url
            : "Text content",
      });
    }

    // 2. Assessments created
    for (const a of teacherAssessments) {
      const crs = teacherCourses.find((c) => c.id === a.courseId);
      logList.push({
        id: `assess-${a.id}`,
        type: "assessment",
        title: a.title,
        subtitle: `Assessment • ${a.questions.length} questions • ${a.timeLimit} mins`,
        courseName: crs ? crs.name : "Unassigned Course",
        courseId: a.courseId,
        details: `Pass score: ${a.passingScore}%`,
      });
    }

    // 3. Courses managed
    for (const c of teacherCourses) {
      logList.push({
        id: `course-${c.id}`,
        type: "course",
        title: `${c.name} (${c.code})`,
        subtitle: `Course Status: ${c.status.toUpperCase()}`,
        courseName: c.name,
        courseId: c.id,
        details: `${c.sections.length} sections, ${c.studentIds.length} enrolled students`,
      });
    }

    // 4. Submissions graded
    for (const sub of gradedSubmissions) {
      const ass = teacherAssessments.find((a) => a.id === sub.assessmentId);
      const crs = teacherCourses.find((c) => c.id === ass?.courseId);
      const student = users.find((u) => u.id === sub.studentId);
      logList.push({
        id: `sub-${sub.id}`,
        type: "grading",
        title: `Graded submission for ${ass?.title || "Quiz"}`,
        subtitle: `Student: ${student?.name || "Unknown"} (${student?.email || ""})`,
        courseName: crs ? crs.name : "Course",
        courseId: ass?.courseId || "",
        details: `Submitted: ${new Date(sub.submittedAt).toLocaleDateString()}`,
        timestamp: sub.submittedAt,
      });
    }

    return logList;
  }, [allUploads, teacherAssessments, teacherCourses, gradedSubmissions, users]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === "all" || log.type === typeFilter;
      const matchesCourse = courseFilter === "all" || log.courseId === courseFilter;

      return matchesSearch && matchesType && matchesCourse;
    });
  }, [logs, searchTerm, typeFilter, courseFilter]);

  // Paginated logs
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPageLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  if (!teacher) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/admin/analytics">
            <ArrowLeft className="h-4 w-4" /> Back to Analytics
          </Link>
        </Button>
        <GlassCard className="text-center py-12">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Teacher Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The requested teacher profile does not exist or was removed.
          </p>
        </GlassCard>
      </div>
    );
  }

  const isInactive = isUserInactive(teacher);

  return (
    <div className="space-y-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild size="sm" className="gap-2 border-border">
          <Link to="/admin/analytics">
            <ArrowLeft className="h-4 w-4" /> Back to Platform Analytics
          </Link>
        </Button>

        <Badge
          variant="outline"
          className={
            isInactive
              ? "border-warning/40 text-warning bg-warning/10"
              : "border-success/40 text-success bg-success/10"
          }
        >
          {isInactive ? `Idle (${formatIdleDuration(teacher)})` : "Active Now"}
        </Badge>
      </div>

      {/* Profile Header */}
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 grid place-items-center rounded-2xl bg-primary/15 text-primary text-xl font-bold">
              {teacher.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{teacher.name}</h1>
              <p className="text-sm text-muted-foreground">{teacher.email}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Joined:{" "}
                  {teacher.joinedAt ? new Date(teacher.joinedAt).toLocaleDateString() : "N/A"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Last Active: {formatLastActive(teacher)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned Courses" value={teacherCourses.length} icon={BookOpen} />
        <StatCard label="Total Students" value={totalStudents} icon={Users} delay={0.05} />
        <StatCard label="Uploaded Items" value={allUploads.length} icon={Upload} delay={0.1} />
        <StatCard
          label="Assessments / Quizzes"
          value={teacherAssessments.length}
          icon={ClipboardCheck}
          delay={0.15}
          accent
        />
      </div>

      {/* Courses Overview */}
      <GlassCard>
        <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" /> Teacher's Assigned Courses (
          {teacherCourses.length})
        </h3>
        {teacherCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No courses assigned to this teacher.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teacherCourses.map((c) => {
              const uploadsCount = c.sections.reduce((n, sec) => n + sec.items.length, 0);
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-border/60 bg-secondary/10 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <CourseThumbnail
                      thumbnail={c.thumbnail}
                      name={c.name}
                      className="h-7 w-7"
                      textClassName="text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <span>{c.studentIds.length} students</span>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {uploadsCount} upload items
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Logs & Activity Monitor with Pagination */}
      <GlassCard className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Activity & Upload Logs Monitor
            </h3>
            <p className="text-xs text-muted-foreground">
              Showing logs for content uploads, course creations, assessments, and grading.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            {filteredLogs.length} Total Logs
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-border/40">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs by title, detail..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Log Types</SelectItem>
              <SelectItem value="upload">Uploads</SelectItem>
              <SelectItem value="assessment">Assessments</SelectItem>
              <SelectItem value="course">Courses</SelectItem>
              <SelectItem value="grading">Grading</SelectItem>
            </SelectContent>
          </Select>

          {/* Course Filter */}
          {teacherCourses.length > 0 && (
            <Select
              value={courseFilter}
              onValueChange={(val) => {
                setCourseFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {teacherCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Page Size selector */}
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              setPageSize(Number(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <SelectValue placeholder="10 / page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="15">15 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table / List */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/60 rounded-xl">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No logs match your filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentPageLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 transition"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 grid place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    {log.type === "upload" ? (
                      log.contentType === "video" ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )
                    ) : log.type === "assessment" ? (
                      <ClipboardCheck className="h-4 w-4" />
                    ) : log.type === "grading" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{log.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{log.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <Badge variant="outline" className="text-[10px] border-border bg-background/50">
                      {log.courseName}
                    </Badge>
                    {log.details && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
