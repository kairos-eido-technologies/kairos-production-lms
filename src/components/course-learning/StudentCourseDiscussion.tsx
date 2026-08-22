import React, { useState, useMemo } from "react";
import { Search, Send, CornerDownRight, MessageSquare as MsgIcon } from "lucide-react";
import { GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import { toast } from "sonner";

export function StudentCourseDiscussion({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { discussions, discussionReplies, users, addDiscussion, addDiscussionReply } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // New thread form
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // New reply form
  const [replyBody, setReplyBody] = useState("");

  const courseDiscussions = useMemo(() => {
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

  const handlePostThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error("Title and message body are required.");
      return;
    }
    await addDiscussion(courseId, user.id, newTitle.trim(), newBody.trim());
    toast.success("Discussion thread posted!");
    setNewTitle("");
    setNewBody("");
    setIsComposing(false);
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeThreadId) return;
    if (!replyBody.trim()) {
      toast.error("Reply message cannot be empty.");
      return;
    }
    await addDiscussionReply(activeThreadId, user.id, replyBody.trim());
    toast.success("Reply posted!");
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

  if (activeThread) {
    return (
      <div className="space-y-6">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setActiveThreadId(null)}
          className="h-8 text-xs text-muted-foreground px-2"
        >
          ← Back to discussions
        </Button>

        {/* Original Thread Post */}
        <div className="p-5 rounded-2xl border border-border/60 bg-secondary/10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground leading-snug">
                {activeThread.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold text-primary">
                  {getUserName(activeThread.userId)}
                </span>
                <Badge variant="outline" className="text-[8px] uppercase tracking-wider px-1 py-0">
                  {getUserRole(activeThread.userId)}
                </Badge>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date(activeThread.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border/40 pt-3">
            {activeThread.body}
          </p>
        </div>

        {/* Replies List */}
        <div className="space-y-3 pl-4 border-l-2 border-border/40">
          <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Replies ({activeReplies.length})
          </h5>

          {activeReplies.map((rep) => (
            <div
              key={rep.id}
              className="p-4 rounded-xl border border-border/40 bg-secondary/5 flex gap-3"
            >
              <CornerDownRight className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      {getUserName(rep.userId)}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[8px] uppercase tracking-wider px-1 py-0"
                    >
                      {getUserRole(rep.userId)}
                    </Badge>
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(rep.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {rep.body}
                </p>
              </div>
            </div>
          ))}

          {activeReplies.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2 pl-6">
              No replies yet. Be the first to answer!
            </p>
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
            className="text-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="gradient-primary text-primary-foreground border-0"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Reply
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Discussion tools */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MsgIcon className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">Course Discussions</h3>
        </div>
        {!isComposing && (
          <Button
            onClick={() => setIsComposing(true)}
            size="sm"
            className="gradient-primary text-primary-foreground border-0 font-medium"
          >
            Ask a Question
          </Button>
        )}
      </div>

      {isComposing ? (
        <form
          onSubmit={handlePostThread}
          className="space-y-4 p-5 rounded-2xl border border-border/80 bg-secondary/15"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            Ask a new question
          </h4>
          <div className="space-y-2">
            <Label htmlFor="qtitle" className="text-xs">
              Question Title
            </Label>
            <Input
              id="qtitle"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Summary of your question..."
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qbody" className="text-xs">
              Details
            </Label>
            <Textarea
              id="qbody"
              rows={4}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Provide full context..."
              className="text-xs"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsComposing(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gradient-primary text-primary-foreground border-0"
            >
              Post Question
            </Button>
          </div>
        </form>
      ) : (
        <>
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
            <div className="text-center py-12 text-muted-foreground text-sm">
              {searchQuery ? "No discussions matching search query." : "No discussions posted yet."}
            </div>
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
                    <GlassCard className="hover:border-primary/40 transition flex items-center justify-between p-4 gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground truncate">{disc.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-primary font-medium">
                            {getUserName(disc.userId)}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            • {new Date(disc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-border px-2 py-0.5 text-[10px] shrink-0 font-medium"
                      >
                        {count} repl{count === 1 ? "y" : "ies"}
                      </Badge>
                    </GlassCard>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
