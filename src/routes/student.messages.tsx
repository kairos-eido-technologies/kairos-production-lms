import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Send, Reply } from "lucide-react";
import { PageHeader, GlassCard, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/student/messages")({ component: StudentMessages });

function StudentMessages() {
  const { user } = useAuth();
  const { messages, users, courses, sendMessage, markMessageRead } = useData();

  const inbox = useMemo(() => {
    if (!user) return [];
    return messages.filter((m) => m.toId === user.id);
  }, [messages, user]);

  const sent = useMemo(() => {
    if (!user) return [];
    return messages.filter((m) => m.fromId === user.id);
  }, [messages, user]);

  const unread = inbox.filter((m) => !m.read).length;

  // teachers of my enrolled courses + all admins
  const recipients = useMemo(() => {
    if (!user) return [];
    const ids = new Set<string>();
    for (const c of courses) if (c.studentIds.includes(user.id) && c.teacherId) ids.add(c.teacherId);
    const teachers = users.filter((u) => ids.has(u.id));
    const admins = users.filter((u) => u.role === "admin");
    return [...admins, ...teachers];
  }, [courses, users, user]);

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [composing, setComposing] = useState(false);
  const [toId, setToId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reading, setReading] = useState<string | null>(null);

  const compose = (presetTo?: string, presetSubject?: string) => {
    setToId(presetTo ?? ""); setSubject(presetSubject ?? ""); setBody("");
    setComposing(true);
  };

  const send = () => {
    if (!user) return;
    if (!toId || !subject.trim() || !body.trim()) { toast.error("Recipient, subject and message are required."); return; }
    sendMessage(user.id, toId, subject.trim(), body.trim());
    toast.success("Message sent");
    setComposing(false);
  };

  const openMessage = (id: string) => {
    markMessageRead(id);
    setReading(id);
  };

  const current = reading ? messages.find((m) => m.id === reading) : null;
  const list = tab === "inbox" ? inbox : sent;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Messages"
        subtitle="Chat with your instructors and the academy."
        actions={
          <Button onClick={() => compose()} className="gradient-primary text-primary-foreground border-0 glow">
            <Send className="mr-2 h-4 w-4" />New Message
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Inbox" value={inbox.length} icon={Mail} />
        <StatCard label="Unread" value={unread} icon={Mail} delay={0.05} accent />
        <StatCard label="Sent" value={sent.length} icon={Send} delay={0.1} />
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "inbox" ? "default" : "outline"} size="sm" onClick={() => setTab("inbox")}>Inbox ({inbox.length})</Button>
        <Button variant={tab === "sent" ? "default" : "outline"} size="sm" onClick={() => setTab("sent")}>Sent ({sent.length})</Button>
      </div>

      {list.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Mail className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <div className="text-sm text-muted-foreground">
            {tab === "inbox" ? "No messages yet." : "You haven't sent any messages yet."}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {list.map((m) => {
            const other = tab === "inbox" ? m.fromId : m.toId;
            return (
              <button key={m.id} onClick={() => openMessage(m.id)}
                className="w-full text-left">
                <GlassCard className={`flex items-center gap-4 hover:border-primary/40 transition ${tab === "inbox" && !m.read ? "border-primary/40" : ""}`}>
                  <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/15 text-primary text-xs font-bold">
                    {userName(other).split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${tab === "inbox" && !m.read ? "font-bold" : "font-medium"}`}>{userName(other)}</span>
                      {tab === "inbox" && !m.read && <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-[10px]">New</Badge>}
                    </div>
                    <div className="text-sm truncate">{m.subject}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.body}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{new Date(m.createdAt).toLocaleDateString()}</div>
                </GlassCard>
              </button>
            );
          })}
        </div>
      )}

      {/* Compose dialog */}
      <Dialog open={composing} onOpenChange={setComposing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>You can message any of your instructors.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>To</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  {recipients.length === 0 && <SelectItem value="-" disabled>No recipients available</SelectItem>}
                  {recipients.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div className="space-y-1"><Label>Message</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
            <Button onClick={send} className="gradient-primary text-primary-foreground border-0">Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reader dialog */}
      <Dialog open={!!current} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent>
          {current && (
            <>
              <DialogHeader>
                <DialogTitle>{current.subject}</DialogTitle>
                <DialogDescription>
                  From {userName(current.fromId)} → {userName(current.toId)} · {new Date(current.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm whitespace-pre-wrap rounded-lg bg-secondary/30 p-4">{current.body}</div>
              {tab === "inbox" && current.fromId !== user?.id && (
                <DialogFooter>
                  <Button onClick={() => { setReading(null); compose(current.fromId, `Re: ${current.subject}`); }} className="gradient-primary text-primary-foreground border-0">
                    <Reply className="h-4 w-4 mr-1.5" />Reply
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}