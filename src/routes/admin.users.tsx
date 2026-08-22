import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users as UsersIcon,
  GraduationCap,
  Shield,
  Download,
  Clock,
  Mail,
  AlertTriangle,
  Layers,
  BookOpen,
  Check,
} from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/store";
import {
  useData,
  courseProgressPct,
  submissionScore,
  isUserInactive,
  formatLastActive,
  formatIdleDuration,
  type User,
  type Role,
} from "@/lib/data-store";
import { downloadCSV } from "@/lib/exports";
import { Eye, EyeOff } from "lucide-react";
import { UserDialog, type UserDraft } from "@/components/admin-users/UserDialog";
import { BulkCourseModal, BulkGroupModal } from "@/components/admin-users/BulkActionsModal";
import { NudgeUserModal } from "@/components/admin-users/NudgeUserModal";

export const Route = createFileRoute("/admin/users")({ component: UserManagement });

const roleColors: Record<Role, string> = {
  admin: "border-primary/40 text-primary bg-primary/10",
  teacher: "border-warning/40 text-warning bg-warning/10",
  student: "border-success/40 text-success bg-success/10",
};

const emptyDraft: UserDraft = {
  name: "",
  email: "",
  password: "",
  role: "student",
  status: "active",
  phone: "",
  group: "",
};

function UserManagement() {
  const { user: currentUser } = useAuth();
  const {
    users,
    courses,
    assessments,
    submissions,
    certificates,
    progress,
    assignCourse,
    addUser,
    updateUser,
    deleteUser,
    sendMessage,
  } = useData();

  const [query, setQuery] = useState("");
  const [roleTab, setRoleTab] = useState<"all" | "idle" | Role>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "joined" | "active">("name");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Bulk Selection States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkCourseModalOpen, setBulkCourseModalOpen] = useState(false);
  const [bulkGroupModalOpen, setBulkGroupModalOpen] = useState(false);
  const [bulkSelectedCourse, setBulkSelectedCourse] = useState("");
  const [bulkAccessMode, setBulkAccessMode] = useState<"lifetime" | "limited">("lifetime");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkTargetGroup, setBulkTargetGroup] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [revealedRow, setRevealedRow] = useState<string | null>(null);
  const [nudgeUser, setNudgeUser] = useState<User | null>(null);
  const [nudgeMsg, setNudgeMsg] = useState("");

  const idleUsers = useMemo(() => users.filter((u) => isUserInactive(u)), [users]);

  // Extract unique student groups
  const availableGroups = useMemo(
    () => Array.from(new Set(users.map((u) => u.group).filter(Boolean))) as string[],
    [users],
  );

  const filtered = useMemo(() => {
    const list = users.filter((u) => {
      if (roleTab === "idle") return isUserInactive(u);
      const matchesRole = roleTab === "all" || u.role === roleTab;
      const matchesGroup =
        groupFilter === "all" ? true : groupFilter === "none" ? !u.group : u.group === groupFilter;
      const matchesStatus = statusFilter === "all" ? true : u.status === statusFilter;
      const matchesCourse =
        courseFilter === "all"
          ? true
          : courseFilter === "none"
            ? !u.courseIds || u.courseIds.length === 0
            : u.courseIds?.includes(courseFilter);
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.group && u.group.toLowerCase().includes(q));
      return matchesRole && matchesGroup && matchesStatus && matchesCourse && matchesQuery;
    });

    return list.sort((a, b) => {
      if (sortBy === "joined") return (b.joinedAt || "").localeCompare(a.joinedAt || "");
      if (sortBy === "active") return (b.lastActive || "").localeCompare(a.lastActive || "");
      return a.name.localeCompare(b.name);
    });
  }, [users, roleTab, groupFilter, statusFilter, courseFilter, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedUsers = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const counts = useMemo(
    () => ({
      admin: users.filter((u) => u.role === "admin").length,
      teacher: users.filter((u) => u.role === "teacher").length,
      student: users.filter((u) => u.role === "student").length,
      idle: idleUsers.length,
    }),
    [users, idleUsers],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setDraft({
      name: u.name,
      email: u.email,
      password: u.password ?? "",
      role: u.role,
      status: u.status,
      phone: u.phone ?? "",
      group: u.group ?? "",
    });
    setDialogOpen(true);
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedUsers.map((u) => u.id);
    const allSelected = pageIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedUserIds.length === 0) return;
    if (!bulkSelectedCourse) {
      toast.error("Please select a course to assign.");
      return;
    }
    if (bulkAccessMode === "limited" && !bulkEndDate) {
      toast.error("Please select an expiry date for limited access.");
      return;
    }

    const courseObj = courses.find((c) => c.id === bulkSelectedCourse);
    let count = 0;
    for (const uid of selectedUserIds) {
      await assignCourse(uid, bulkSelectedCourse, bulkAccessMode, bulkEndDate || undefined);
      count++;
    }
    toast.success(`Enrolled ${count} users into ${courseObj?.name ?? "the course"}!`);
    setBulkCourseModalOpen(false);
    setSelectedUserIds([]);
  };

  const handleBulkAssignGroup = () => {
    if (selectedUserIds.length === 0) return;
    if (!bulkTargetGroup.trim()) {
      toast.error("Please enter or select a group name.");
      return;
    }

    let count = 0;
    for (const uid of selectedUserIds) {
      const user = users.find((u) => u.id === uid);
      if (user) {
        updateUser(uid, { group: bulkTargetGroup.trim() });
        count++;
      }
    }
    toast.success(`Assigned group "${bulkTargetGroup.trim()}" to ${count} users!`);
    setBulkGroupModalOpen(false);
    setSelectedUserIds([]);
  };

  const save = () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!editing && draft.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (editing) {
      updateUser(editing.id, {
        name: draft.name,
        email: draft.email,
        role: draft.role,
        status: draft.status,
        phone: draft.phone,
        group: draft.group.trim() || undefined,
        ...(draft.password ? { password: draft.password } : {}),
      });
      toast.success(`Updated ${draft.name}.`);
    } else {
      addUser({
        name: draft.name,
        email: draft.email,
        password: draft.password,
        role: draft.role,
        status: draft.status,
        phone: draft.phone,
        group: draft.group.trim() || undefined,
        joinedAt: new Date().toISOString().slice(0, 10),
      });
      toast.success(`Created ${draft.name}.`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteUser(toDelete.id);
    toast.success(`Deleted ${toDelete.name}.`);
    setToDelete(null);
  };

  const sendNudge = async () => {
    if (!nudgeUser) return;
    const body =
      nudgeMsg.trim() ||
      "We noticed you haven't logged in recently. Jump back in to keep making progress on your courses!";
    const senderId = currentUser?.id || "ADM01";
    await sendMessage(senderId, nudgeUser.id, "Learning reminder", body);
    toast.success(`Nudge sent to ${nudgeUser.name}`);
    setNudgeUser(null);
    setNudgeMsg("");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        subtitle="Manage learners, instructors, and administrators across the platform."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadCSV("users.csv", [
                  ["ID", "Name", "Email", "Role", "Status", "Group", "Joined Date"],
                  ...users.map((u) => [
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.status,
                    u.group || "",
                    u.joinedAt || "",
                  ]),
                ])
              }
              className="gap-2 border-border"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              onClick={openCreate}
              className="gradient-primary text-primary-foreground border-0 glow gap-2"
            >
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={users.length} icon={UsersIcon} />
        <StatCard label="Students" value={counts.student} icon={GraduationCap} />
        <StatCard label="Teachers" value={counts.teacher} icon={UsersIcon} />
        <StatCard label="Admins" value={counts.admin} icon={Shield} />
      </div>

      {/* Main Table Card */}
      <GlassCard className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or group..."
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Group Filter */}
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Batch / Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="none">No Group</SelectItem>
                {availableGroups.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Course Filter */}
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Course Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="none">Not Enrolled</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="joined">Sort: Joined Date</SelectItem>
                <SelectItem value="active">Sort: Last Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Role Tabs */}
        <Tabs value={roleTab} onValueChange={(val: any) => setRoleTab(val)} className="w-full">
          <TabsList className="grid grid-cols-5 max-w-xl">
            <TabsTrigger value="all">All ({users.length})</TabsTrigger>
            <TabsTrigger value="student">Students ({counts.student})</TabsTrigger>
            <TabsTrigger value="teacher">Teachers ({counts.teacher})</TabsTrigger>
            <TabsTrigger value="admin">Admins ({counts.admin})</TabsTrigger>
            <TabsTrigger value="idle" className="text-amber-500">
              Idle ({counts.idle})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bulk Action Banner */}
        {selectedUserIds.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-primary/40 bg-primary/10 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>
                <strong>{selectedUserIds.length}</strong> user
                {selectedUserIds.length === 1 ? "" : "s"} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkCourseModalOpen(true)}
                className="h-8 gap-1.5 border-primary/40 bg-primary/20 text-foreground hover:bg-primary/30"
              >
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Bulk Assign Course
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkGroupModalOpen(true)}
                className="h-8 gap-1.5 border-primary/40 bg-primary/20 text-foreground hover:bg-primary/30"
              >
                <Layers className="h-3.5 w-3.5 text-primary" /> Assign Group
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedUserIds([])}
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Table View */}
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      paginatedUsers.length > 0 &&
                      paginatedUsers.every((u) => selectedUserIds.includes(u.id))
                    }
                    onCheckedChange={toggleSelectAllPage}
                  />
                </TableHead>
                <TableHead className="min-w-[180px]">User</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32">Group / Batch</TableHead>
                <TableHead className="w-36">Courses Enrolled</TableHead>
                <TableHead className="w-48">Last Active</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                const isIdle = isUserInactive(u);
                return (
                  <TableRow key={u.id} className={isSelected ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectUser(u.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${roleColors[u.role]}`}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.status === "active" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.group ? (
                        <Badge variant="outline" className="text-xs border-border">
                          {u.group}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-foreground">
                        {u.courseIds?.length || 0} Course{u.courseIds?.length === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          <span>{formatLastActive(u)}</span>
                        </div>
                        {isIdle && (
                          <div>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5 font-normal px-1.5 py-0 inline-flex items-center"
                            >
                              Idle {formatIdleDuration(u)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {isIdle ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setNudgeUser(u);
                              setNudgeMsg("");
                            }}
                            className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 shrink-0"
                            title="Send Nudge Email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="h-8 w-8 shrink-0" aria-hidden="true" />
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(u)}
                          className="h-8 w-8 shrink-0"
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setToDelete(u)}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    No users matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>
              Showing page {page} of {totalPages} ({filtered.length} total users)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* User Create/Edit Dialog */}
      <UserDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editing={editing}
        draft={draft}
        setDraft={setDraft}
        showPw={showPw}
        setShowPw={setShowPw}
        saveUser={save}
      />

      {/* Bulk Assign Course Modal */}
      <BulkCourseModal
        open={bulkCourseModalOpen}
        setOpen={setBulkCourseModalOpen}
        selectedCount={selectedUserIds.length}
        courses={courses.filter((c) => c.status === "active")}
        selectedCourse={bulkSelectedCourse}
        setSelectedCourse={setBulkSelectedCourse}
        accessMode={bulkAccessMode}
        setAccessMode={setBulkAccessMode}
        endDate={bulkEndDate}
        setEndDate={setBulkEndDate}
        handleBulkAssignCourse={handleBulkEnroll}
      />

      {/* Bulk Assign Group Modal */}
      <BulkGroupModal
        open={bulkGroupModalOpen}
        setOpen={setBulkGroupModalOpen}
        selectedCount={selectedUserIds.length}
        targetGroup={bulkTargetGroup}
        setTargetGroup={setBulkTargetGroup}
        handleBulkAssignGroup={handleBulkAssignGroup}
      />

      {/* Nudge Modal */}
      <NudgeUserModal
        nudgeUser={nudgeUser}
        setNudgeUser={setNudgeUser}
        nudgeMsg={nudgeMsg}
        setNudgeMsg={setNudgeMsg}
        handleSendNudge={sendNudge}
      />

      {/* Delete User Confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{toDelete?.name}</strong>? This
              will remove all their enrollments, submissions, and course data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
