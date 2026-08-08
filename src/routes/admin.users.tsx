import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Users as UsersIcon, GraduationCap, Shield, Download, Clock, Mail, AlertTriangle } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useData, courseProgressPct, submissionScore, isUserInactive, formatLastActive, formatIdleDuration, type User, type Role } from "@/lib/data-store";
import { downloadCSV } from "@/lib/exports";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin/users")({ component: UserManagement });

const roleColors: Record<Role, string> = {
  admin: "border-primary/40 text-primary bg-primary/10",
  teacher: "border-warning/40 text-warning bg-warning/10",
  student: "border-success/40 text-success bg-success/10",
};

type Draft = { name: string; email: string; password: string; role: Role; status: "active" | "inactive"; phone: string };
const emptyDraft: Draft = { name: "", email: "", password: "", role: "student", status: "active", phone: "" };

function UserManagement() {
  const { users, courses, assessments, submissions, certificates, progress, addUser, updateUser, deleteUser, sendMessage } = useData();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok && active) {
          const json = await res.json();
          if (json.users) {
            useData.setState({ users: json.users });
          }
        }
      } catch (err) {
        console.error("Failed to load users on mount", err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const [query, setQuery] = useState("");
  const [roleTab, setRoleTab] = useState<"all" | "idle" | Role>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [revealedRow, setRevealedRow] = useState<string | null>(null);
  const [nudgeUser, setNudgeUser] = useState<User | null>(null);
  const [nudgeMsg, setNudgeMsg] = useState("");

  const idleUsers = useMemo(() => users.filter((u) => isUserInactive(u)), [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleTab === "idle") return isUserInactive(u);
      const matchesRole = roleTab === "all" || u.role === roleTab;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    }).filter((u) => {
      if (roleTab === "idle") return true; // already filtered
      const q = query.trim().toLowerCase();
      return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, roleTab, query]);

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
    setDraft({ name: u.name, email: u.email, password: u.password ?? "", role: u.role, status: u.status, phone: u.phone ?? "" });
    setDialogOpen(true);
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
      const patch: Partial<User> = { name: draft.name, email: draft.email, role: draft.role, status: draft.status, phone: draft.phone || undefined };
      if (draft.password) patch.password = draft.password;
      updateUser(editing.id, patch);
      toast.success(`Updated ${draft.name}.`);
    } else {
      addUser({ ...draft, joinedAt: new Date().toISOString().slice(0, 10), courseIds: [] });
      toast.success(`Added ${draft.name}.`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteUser(toDelete.id);
    toast.success(`Removed ${toDelete.name}.`);
    setToDelete(null);
  };

  const sendNudge = () => {
    if (!nudgeUser || !nudgeMsg.trim()) {
      toast.error("Please write a message before sending.");
      return;
    }
    // Send from first admin
    const admin = users.find((u) => u.role === "admin");
    if (admin) {
      sendMessage(admin.id, nudgeUser.id, "We miss you! 👋", nudgeMsg.trim());
    }
    toast.success(`Nudge sent to ${nudgeUser.name}`);
    setNudgeUser(null);
    setNudgeMsg("");
  };

  const exportUsersCsv = () => {
    const rows: (string | number)[][] = [
      ["ID","Name","Email","Phone","Role","Status","Last active","Joined","Enrolled Course IDs"],
      ...users.map((u) => [u.id, u.name, u.email, u.phone ?? "", u.role, u.status, formatLastActive(u), u.joinedAt, (u.courseIds ?? []).join(";")]),
    ];
    downloadCSV(`users-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  const exportAllData = () => {
    // Users
    const users_rows: (string | number)[][] = [
      ["ID","Name","Email","Phone","Role","Status","Last active","Joined"],
      ...users.map((u) => [u.id, u.name, u.email, u.phone ?? "", u.role, u.status, formatLastActive(u), u.joinedAt]),
    ];
    downloadCSV(`users-${new Date().toISOString().slice(0,10)}.csv`, users_rows);

    // Courses
    const courses_rows: (string | number)[][] = [
      ["ID","Code","Name","Teacher","Students","Status","Sections","Items"],
      ...courses.map((c) => [c.id, c.code, c.name, users.find((u) => u.id === c.teacherId)?.name ?? "", c.studentIds.length, c.status, c.sections.length, c.sections.reduce((n, s) => n + s.items.length, 0)]),
    ];
    downloadCSV(`courses-${new Date().toISOString().slice(0,10)}.csv`, courses_rows);

    // Scores
    const scores_rows: (string | number)[][] = [["Student","Email","Course","Course Code","Progress %","Quiz Average %","Certificate Status","Cert Score"]];
    for (const c of courses) {
      const courseAssessments = assessments.filter((a) => a.courseId === c.id);
      for (const sid of c.studentIds) {
        const st = users.find((u) => u.id === sid);
        if (!st) continue;
        const pct = courseProgressPct(progress, sid, c);
        const mySubs = submissions.filter((s) => s.studentId === sid && courseAssessments.some((a) => a.id === s.assessmentId));
        let avg: number | string = "";
        if (mySubs.length > 0) {
          let total = 0;
          for (const s of mySubs) { const a = courseAssessments.find((x) => x.id === s.assessmentId)!; total += submissionScore(a, s).pct; }
          avg = Math.round(total / mySubs.length);
        }
        const cert = certificates.find((x) => x.studentId === sid && x.courseId === c.id);
        scores_rows.push([st.name, st.email, c.name, c.code, pct, avg, cert?.status ?? "—", cert?.score ?? ""]);
      }
    }
    downloadCSV(`scores-${new Date().toISOString().slice(0,10)}.csv`, scores_rows);

    // Certificates
    const cert_rows: (string | number)[][] = [
      ["Certificate ID","Student","Email","Course","Score","Status","Requested","Issued","Suspicious Events"],
      ...certificates.map((c) => {
        const sus = (c.proctorLog ?? []).filter((e) => ["fullscreen_exit","tab_blur","visibility_hidden","copy","paste","context_menu","key_meta","camera_denied","camera_ended","camera_motion"].includes(e.type)).length;
        return [c.id, users.find((u) => u.id === c.studentId)?.name ?? "", users.find((u) => u.id === c.studentId)?.email ?? "", courses.find((x) => x.id === c.courseId)?.name ?? "", c.score, c.status, c.requestedAt, c.issuedAt ?? "", sus];
      }),
    ];
    downloadCSV(`certificates-${new Date().toISOString().slice(0,10)}.csv`, cert_rows);

    // Submissions
    const sub_rows: (string | number)[][] = [
      ["Submission ID","Student","Assessment","Course","Score %","Status","Submitted","Proctor Events"],
      ...submissions.map((s) => {
        const a = assessments.find((x) => x.id === s.assessmentId);
        const max = a?.questions.reduce((sum, q) => sum + q.points, 0) ?? 0;
        const earned = s.responses.reduce((sum, r) => sum + (r.awarded ?? 0), 0);
        const pct = max ? Math.round((earned / max) * 100) : 0;
        return [s.id, users.find((u) => u.id === s.studentId)?.name ?? "", a?.title ?? "", courses.find((x) => x.id === a?.courseId)?.name ?? "", pct, s.status, s.submittedAt, (s.proctorEvents ?? []).length];
      }),
    ];
    downloadCSV(`submissions-${new Date().toISOString().slice(0,10)}.csv`, sub_rows);
    toast.success("Exported 5 CSV files");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        subtitle="Create, edit and assign learners and staff."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportUsersCsv}><Download className="mr-2 h-4 w-4" />Users CSV</Button>
            <Button variant="outline" onClick={exportAllData}><Download className="mr-2 h-4 w-4" />Export All</Button>
            <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0 glow">
              <Plus className="mr-2 h-4 w-4" />Add User
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Students" value={counts.student} icon={UsersIcon} />
        <StatCard label="Teachers" value={counts.teacher} icon={GraduationCap} delay={0.05} />
        <StatCard label="Admins" value={counts.admin} icon={Shield} delay={0.1} />
        <StatCard label="Idle Users" value={counts.idle} icon={Clock} accent delay={0.15} />
      </div>

      {/* Idle Users alert banner */}
      <AnimatePresence>
        {counts.idle > 0 && roleTab !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-2xl border border-warning/40 bg-warning/10 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-warning/20 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-warning">{counts.idle} idle user{counts.idle === 1 ? "" : "s"} detected</div>
                <div className="text-xs text-muted-foreground">Users who haven't logged in for more than 2 days.</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-warning/40 text-warning hover:bg-warning/10 shrink-0"
              onClick={() => setRoleTab("idle")}
            >
              <Clock className="mr-1.5 h-4 w-4" />
              View idle users
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as typeof roleTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="student">Students</TabsTrigger>
              <TabsTrigger value="teacher">Teachers</TabsTrigger>
              <TabsTrigger value="admin">Admins</TabsTrigger>
              <TabsTrigger value="idle" className="data-[state=active]:text-warning data-[state=active]:border-warning">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Idle
                {counts.idle > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/20 text-warning text-[10px] px-1">
                    {counts.idle}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {roleTab !== "idle" && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
              />
            </div>
          )}
        </div>

        {/* Idle users rich view */}
        {roleTab === "idle" ? (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <div className="font-medium text-muted-foreground">No idle users</div>
                <p className="text-xs text-muted-foreground mt-1">All users have been active in the past 2 days.</p>
              </div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground pb-1">
                  Showing {filtered.length} user{filtered.length === 1 ? "" : "s"} inactive for 2+ days or who have never logged in
                </div>
                {filtered.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-wrap items-center gap-4 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3"
                  >
                    {/* Avatar */}
                    <div className="h-10 w-10 grid place-items-center rounded-xl bg-warning/15 text-warning text-xs font-bold shrink-0">
                      {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`capitalize text-[10px] py-0 ${roleColors[u.role]}`}>{u.role}</Badge>
                        <span className={`inline-flex items-center gap-1 text-[10px] ${u.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                          {u.status}
                        </span>
                      </div>
                    </div>

                    {/* Idle duration */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-warning text-sm font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {u.lastActive ? `Idle ${formatIdleDuration(u)}` : "Never logged in"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {u.lastActive ? `Last seen: ${formatLastActive(u)}` : "Account created but never used"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-warning/30 text-warning hover:bg-warning/10 h-8 text-xs"
                        onClick={() => { setNudgeUser(u); setNudgeMsg(`Hi ${u.name.split(" ")[0]}, we noticed you haven't logged in recently. Your courses are waiting for you — let's get back on track! 🚀`); }}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1" />Nudge
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        ) : (
          /* Regular table view */
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className={isUserInactive(u) ? "bg-warning/5" : ""}>
                    <TableCell className="font-mono text-xs text-muted-foreground select-all">{u.id}</TableCell>
                    <TableCell className="font-medium">
                      {u.name}
                      {isUserInactive(u) && (
                        <Badge variant="outline" className="ml-2 text-[9px] py-0 border-warning/40 text-warning bg-warning/10">
                          idle
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.phone || <span className="opacity-40">—</span>}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {u.password ? (
                        <button
                          type="button"
                          onClick={() => setRevealedRow(revealedRow === u.id ? null : u.id)}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          {revealedRow === u.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {revealedRow === u.id ? u.password : "••••••••"}
                        </button>
                      ) : <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${roleColors[u.role]}`}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs ${u.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{formatLastActive(u)}</div>
                      {isUserInactive(u) && <div className="text-[10px] text-warning">Idle {formatIdleDuration(u)}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.joinedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setToDelete(u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                      No users match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Nudge dialog */}
      <Dialog open={!!nudgeUser} onOpenChange={(o) => !o && setNudgeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send nudge to {nudgeUser?.name}</DialogTitle>
            <DialogDescription>
              This will appear as a direct message in their inbox. Last seen: {nudgeUser ? formatLastActive(nudgeUser) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={nudgeMsg}
                onChange={(e) => setNudgeMsg(e.target.value)}
                placeholder="Write an encouraging message..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNudgeUser(null)}>Cancel</Button>
            <Button onClick={sendNudge} className="gradient-primary text-primary-foreground border-0">
              <Mail className="mr-2 h-4 w-4" />Send nudge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the user's details below." : "Create a new learner or staff member."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+91 99999 99999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">{editing ? "Password (leave blank to keep current)" : "Password"}</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPw ? "text" : "password"}
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  placeholder={editing ? "••••••••" : "At least 6 characters"}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={draft.status === "active"}
                    onCheckedChange={(c) => setDraft({ ...draft, status: c ? "active" : "inactive" })}
                  />
                  <span className="text-sm text-muted-foreground">{draft.status === "active" ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-primary text-primary-foreground border-0">
              {editing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {toDelete?.name} and unenroll them from all courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
