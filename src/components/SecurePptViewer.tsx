import React from "react";
import { PptxFullViewer } from "@/components/PptxFullViewer";
import { SecurePdfViewer } from "@/components/SecurePdfViewer";
import { Presentation, ShieldCheck } from "lucide-react";

interface SecurePptViewerProps {
  url?: string | null;
  title: string;
  onComplete?: () => void;
}

export function SecurePptViewer({ url, title, onComplete }: SecurePptViewerProps) {
  // ── No URL ────────────────────────────────────────────────────────────────
  if (!url || url.trim() === "") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-slate-950 h-[400px]">
        <Presentation className="h-12 w-12 text-slate-700" />
        <p className="text-sm text-slate-400">No presentation uploaded yet.</p>
      </div>
    );
  }

  const cleanUrl = url.trim();

  // ── Google Slides public link ─────────────────────────────────────────────
  if (cleanUrl.includes("docs.google.com/presentation")) {
    const embedUrl = cleanUrl.includes("/embed")
      ? cleanUrl
      : cleanUrl.replace(/\/edit.*$/, "/embed");
    return (
      <div className="relative w-full rounded-xl border border-border overflow-hidden" style={{ height: 680 }}>
        <iframe src={embedUrl} className="w-full h-full border-0" title={title} allowFullScreen onLoad={() => {
          setTimeout(() => onComplete?.(), 5000);
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-11 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400 font-semibold select-none">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> View Only — Downloading disabled
        </div>
      </div>
    );
  }

  // ── PDF File uploaded as Presentation ──────────────────────────────────────
  if (cleanUrl.toLowerCase().endsWith(".pdf") || cleanUrl.includes("data:application/pdf")) {
    return <SecurePdfViewer url={cleanUrl} title={title} isPresentation={true} onComplete={onComplete} />;
  }

  // ── Render PowerPoint presentation using PptxFullViewer engine ──────────────
  return <PptxFullViewer url={cleanUrl} title={title} onComplete={onComplete} />;
}
