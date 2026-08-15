import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  color?: string;
  description?: string;
}

interface AppSwitcherProps {
  items: readonly NavItem[];
  unreadMsgs?: number;
}

// Accent colors for app icons
const APP_COLORS: Record<string, string> = {
  Dashboard: "from-blue-500 to-indigo-600 text-blue-500",
  Users: "from-purple-500 to-pink-600 text-purple-500",
  Courses: "from-emerald-500 to-teal-600 text-emerald-500",
  "My Courses": "from-emerald-500 to-teal-600 text-emerald-500",
  "Enroll Students": "from-amber-500 to-orange-600 text-amber-500",
  "Content Builder": "from-rose-500 to-red-600 text-rose-500",
  "Assignments & Quizzes": "from-cyan-500 to-blue-600 text-cyan-500",
  Analytics: "from-violet-500 to-purple-600 text-violet-500",
  Progress: "from-violet-500 to-purple-600 text-violet-500",
  Certificates: "from-amber-500 to-yellow-600 text-amber-500",
  "Certificate Requests": "from-amber-500 to-yellow-600 text-amber-500",
  "Verify Certificate": "from-teal-500 to-emerald-600 text-teal-500",
  Messages: "from-red-500 to-rose-600 text-red-500",
  Calendar: "from-fuchsia-500 to-pink-600 text-fuchsia-500",
  "Student Progress": "from-indigo-500 to-purple-600 text-indigo-500",
};

export function AppSwitcher({ items, unreadMsgs = 0 }: AppSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 gap-2 rounded-lg border-border/80 bg-background/80 px-3 hover:border-primary/50 hover:bg-secondary/70 transition-all duration-200"
          aria-label="App Launcher"
          title="App Suite Launcher"
        >
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="hidden text-xs font-semibold sm:inline-block">Apps</span>
          {unreadMsgs > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white shadow-md animate-pulse">
              {unreadMsgs > 99 ? "99+" : unreadMsgs}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 sm:w-96 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur-md z-50"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/50 px-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              iTech App Suite
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {items.length} Modules
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 sm:gap-3.5 max-h-[380px] overflow-y-auto pr-1">
          {items.map((it) => {
            const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
            const Icon = it.icon;
            const colorClass = APP_COLORS[it.label] || "from-primary to-primary/80 text-primary";
            const isMessagesApp = it.label === "Messages";

            return (
              <Link
                key={it.to}
                to={it.to}
                preload="intent"
                onClick={() => setOpen(false)}
                className={`group relative flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-200 border ${
                  active
                    ? "border-primary/40 bg-primary/10 shadow-xs"
                    : "border-transparent hover:border-border/60 hover:bg-secondary/60"
                }`}
              >
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass.split(" ")[0]} ${colorClass.split(" ")[1]} text-white shadow-xs group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className="h-5 w-5" />
                  {isMessagesApp && unreadMsgs > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white shadow-md border-2 border-background">
                      {unreadMsgs > 99 ? "99+" : unreadMsgs}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-medium text-foreground truncate w-full">
                  {it.label}
                </span>
                {active && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
