import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { NavItem } from "./AppSwitcher";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";

interface AppLaunchpadProps {
  items: readonly NavItem[];
  userRole: "admin" | "teacher" | "student";
  userName: string;
}

// Neon accent borders and glowing icon styles matching user reference image
const APP_TILE_ACCENTS: Record<string, { border: string; icon: string; glow: string }> = {
  Dashboard: { border: "hover:border-cyan-500/60", icon: "text-cyan-400", glow: "group-hover:shadow-cyan-500/20" },
  Users: { border: "hover:border-emerald-500/60", icon: "text-emerald-400", glow: "group-hover:shadow-emerald-500/20" },
  Courses: { border: "hover:border-teal-500/60", icon: "text-teal-400", glow: "group-hover:shadow-teal-500/20" },
  "My Courses": { border: "hover:border-teal-500/60", icon: "text-teal-400", glow: "group-hover:shadow-teal-500/20" },
  "Enroll Students": { border: "hover:border-amber-500/60", icon: "text-amber-400", glow: "group-hover:shadow-amber-500/20" },
  "Content Builder": { border: "hover:border-blue-500/60", icon: "text-blue-400", glow: "group-hover:shadow-blue-500/20" },
  "Assignments & Quizzes": { border: "hover:border-indigo-500/60", icon: "text-indigo-400", glow: "group-hover:shadow-indigo-500/20" },
  Analytics: { border: "hover:border-purple-500/60", icon: "text-purple-400", glow: "group-hover:shadow-purple-500/20" },
  Progress: { border: "hover:border-purple-500/60", icon: "text-purple-400", glow: "group-hover:shadow-purple-500/20" },
  Certificates: { border: "hover:border-amber-500/60", icon: "text-amber-400", glow: "group-hover:shadow-amber-500/20" },
  "Certificate Requests": { border: "hover:border-amber-500/60", icon: "text-amber-400", glow: "group-hover:shadow-amber-500/20" },
  "Verify Certificate": { border: "hover:border-emerald-500/60", icon: "text-emerald-400", glow: "group-hover:shadow-emerald-500/20" },
  Messages: { border: "hover:border-red-500/60", icon: "text-red-500", glow: "group-hover:shadow-red-500/20" },
  Calendar: { border: "hover:border-rose-500/60", icon: "text-rose-400", glow: "group-hover:shadow-rose-500/20" },
  "Student Progress": { border: "hover:border-violet-500/60", icon: "text-violet-400", glow: "group-hover:shadow-violet-500/20" },
};

const DEFAULT_ACCENT = { border: "hover:border-primary/60", icon: "text-primary", glow: "group-hover:shadow-primary/20" };

export function AppLaunchpad({ items }: AppLaunchpadProps) {
  const [filter, setFilter] = useState("");
  const { user } = useAuth();
  const { messages } = useData();

  const unreadMsgs = useMemo(
    () => (user ? messages.filter((m) => m.toId === user.id && !m.read).length : 0),
    [messages, user]
  );

  // Filter app modules by search query
  const appModules = items.filter(
    (it) =>
      it.label !== "Dashboard" &&
      it.label.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="relative w-full flex flex-col items-center justify-center min-h-[65vh] my-auto py-8 space-y-10">
      {/* Search Bar inside Interface */}
      <div className="relative w-full max-w-md mx-auto px-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search apps..."
            className="w-full h-11 pl-11 pr-4 rounded-full bg-secondary/40 border border-border/80 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 backdrop-blur-md transition-all duration-200 shadow-inner"
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              className="absolute right-3 text-xs text-muted-foreground hover:text-foreground bg-secondary px-2 py-0.5 rounded-full cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* App Grid Centered */}
      <div className="w-full max-w-4xl mx-auto px-4 flex justify-center">
        {appModules.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No apps found matching "{filter}"
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-y-12 gap-x-10 sm:gap-x-14 sm:gap-y-14 max-w-4xl px-2">
            {appModules.map((it) => {
              const Icon = it.icon;
              const accent = APP_TILE_ACCENTS[it.label] ?? DEFAULT_ACCENT;
              const isMessagesApp = it.label === "Messages";

              return (
                <div
                  key={it.to}
                  className="flex flex-col items-center px-1 py-1"
                >
                  <Link
                    to={it.to}
                    preload="intent"
                    className="group flex flex-col items-center text-center cursor-pointer select-none"
                  >
                    {/* Dark Glass Neon Icon Tile */}
                    <div
                      className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-card/70 border border-border/70 backdrop-blur-md ${accent.border} ${accent.glow} shadow-lg group-hover:scale-105 group-hover:bg-card/90 transition-all duration-200`}
                    >
                      <Icon className={`h-9 w-9 sm:h-10 sm:w-10 ${accent.icon} group-hover:scale-110 transition-transform duration-200 filter drop-shadow-sm`} />
                      {isMessagesApp && unreadMsgs > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-extrabold text-white shadow-lg border-2 border-background animate-pulse">
                          {unreadMsgs > 99 ? "99+" : unreadMsgs}
                        </span>
                      )}
                    </div>

                    {/* App Label */}
                    <span className="mt-3 text-xs sm:text-sm font-medium tracking-tight text-foreground/90 group-hover:text-primary transition-colors duration-200 max-w-[130px] leading-tight truncate">
                      {it.label}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
