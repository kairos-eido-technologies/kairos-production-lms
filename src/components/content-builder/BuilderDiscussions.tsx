import React from "react";
import { MessageSquare, Search, CornerDownRight, Trash2, Send } from "lucide-react";
import { GlassCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Discussion, DiscussionReply, User } from "@/lib/data-store";

interface BuilderDiscussionsProps {
  filteredDiscussions: Discussion[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeThreadId: string | null;
  setActiveThreadId: (v: string | null) => void;
  activeThread: Discussion | null | undefined;
  activeReplies: DiscussionReply[];
  replyBody: string;
  setReplyBody: (v: string) => void;
  handlePostReply: (e: React.FormEvent) => void;
  getUserName: (id: string) => string;
  getUserRole: (id: string) => string;
  deleteDiscussion: (id: string) => void;
  deleteDiscussionReply: (id: string) => void;
}

export function BuilderDiscussions({
  filteredDiscussions,
  searchQuery,
  setSearchQuery,
  activeThreadId,
  setActiveThreadId,
  activeThread,
  activeReplies,
  replyBody,
  setReplyBody,
  handlePostReply,
  getUserName,
  getUserRole,
  deleteDiscussion,
  deleteDiscussionReply,
}: BuilderDiscussionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Course Q&A & Student Discussions</h2>
          <p className="text-sm text-muted-foreground">
            Answer questions, guide students, and moderate discussions.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Thread List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">
            Topics ({filteredDiscussions.length})
          </h3>
          {filteredDiscussions.length === 0 ? (
            <GlassCard className="py-8 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No questions matching your search.</p>
            </GlassCard>
          ) : (
            filteredDiscussions.map((d) => (
              <div key={d.id} onClick={() => setActiveThreadId(d.id)} className="cursor-pointer">
                <GlassCard
                  className={`p-4 transition-all ${
                    activeThreadId === d.id
                      ? "border-primary bg-primary/10 shadow-md"
                      : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-sm line-clamp-1 text-foreground">
                      {d.title}
                    </h4>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDiscussion(d.id);
                        if (activeThreadId === d.id) setActiveThreadId(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.body}</p>
                  <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground/70">
                    <span className="font-medium">{getUserName(d.userId)}</span>
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </GlassCard>
              </div>
            ))
          )}
        </div>

        {/* Thread Detail & Replies */}
        <div className="md:col-span-2">
          {activeThread ? (
            <GlassCard className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {getUserRole(activeThread.userId)}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    {getUserName(activeThread.userId)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {new Date(activeThread.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-2">{activeThread.title}</h3>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-2">
                  {activeThread.body}
                </p>
              </div>

              {/* Replies Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">
                  Responses ({activeReplies.length})
                </h4>
                {activeReplies.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No responses yet. Be the first to answer!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeReplies.map((r) => (
                      <div
                        key={r.id}
                        className="bg-muted/40 p-4 rounded-xl border border-border/50 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getUserRole(r.userId) === "teacher" ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {getUserRole(r.userId)}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {getUserName(r.userId)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            onClick={() => deleteDiscussionReply(r.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">
                          {r.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <form
                  onSubmit={handlePostReply}
                  className="pt-4 border-t border-border flex flex-col gap-3"
                >
                  <Textarea
                    placeholder="Write an instructor response..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    className="w-full"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2 bg-primary text-primary-foreground">
                      <Send className="h-4 w-4" /> Send Reply
                    </Button>
                  </div>
                </form>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="py-20 text-center">
              <CornerDownRight className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Select a topic from the left to view questions and respond.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
