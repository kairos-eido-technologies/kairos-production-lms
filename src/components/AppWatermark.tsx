import React from "react";
import { useRouterState } from "@tanstack/react-router";

export function AppWatermark() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Only show background watermark on the Apps Launchpad page (/admin, /teacher, /student)
  const isAppsPage =
    pathname === "/admin" ||
    pathname === "/admin/" ||
    pathname === "/teacher" ||
    pathname === "/teacher/" ||
    pathname === "/student" ||
    pathname === "/student/";

  // Hide background watermark completely on all other pages
  if (!isAppsPage) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.04] dark:opacity-[0.06] select-none transition-opacity duration-300"
    >
      {/* Text watermark: "iTech Academy" (Centered under iTech) */}
      <div className="flex flex-col items-center justify-center text-center scale-110 sm:scale-125">
        <span
          className="font-mono text-7xl font-black tracking-tight sm:text-9xl md:text-[130px] text-foreground leading-none text-center"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          iTech
        </span>
        <span
          className="font-mono text-xl font-extrabold tracking-[0.5em] pl-[0.5em] uppercase sm:text-3xl md:text-4xl text-foreground text-center mt-3"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          ACADEMY
        </span>
      </div>
    </div>
  );
}
