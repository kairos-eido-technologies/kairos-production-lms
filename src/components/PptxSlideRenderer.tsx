/**
 * PptxSlideRenderer – renders an uploaded .pptx / .ppt file.
 *
 * PPTX files are ZIP archives containing XML. We use JSZip to open the
 * archive, read each slide's XML, and extract text + images.
 * No external services needed – works fully client-side.
 */
import React, { useEffect, useState, useCallback } from "react";
import JSZip from "jszip";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  Lock,
  ShieldCheck,
  Presentation,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParsedSlide {
  index: number;
  title: string;
  bullets: string[];
  images: string[]; // data URLs of embedded images
}

// ─── Accent palette ─────────────────────────────────────────────────────────

const ACCENTS = [
  "from-blue-500 to-indigo-600",
  "from-indigo-500 to-violet-600",
  "from-violet-500 to-purple-600",
  "from-purple-500 to-fuchsia-600",
  "from-teal-500 to-cyan-600",
  "from-emerald-500 to-green-600",
  "from-rose-500 to-red-600",
  "from-amber-500 to-orange-600",
];

// ─── XML helpers ─────────────────────────────────────────────────────────────

/** Strip XML namespace prefixes so querySelector works cross-browser */
function stripNs(xml: string): string {
  return xml
    .replace(/<(\/?)[a-zA-Z]+:([a-zA-Z])/g, "<$1$2")   // strip ns from tags
    .replace(/\s[a-zA-Z]+:[a-zA-Z][a-zA-Z0-9]*=/g, " "); // strip ns from attrs (simplified)
}

/** Pull all text from <t>…</t> tags inside a block of XML */
function pullText(xmlBlock: string): string {
  const parts: string[] = [];
  const re = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlBlock)) !== null) {
    const t = m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
    if (t) parts.push(t);
  }
  return parts.join(" ").trim();
}

// ─── PPTX parser ─────────────────────────────────────────────────────────────

async function parsePptx(src: string): Promise<ParsedSlide[]> {
  // If src is empty, "#", or placeholder, return built-in multi-slide presentation
  if (!src || src.trim() === "" || src.trim() === "#" || src === "sample") {
    return [
      {
        index: 1,
        title: "Course Presentation Slide Deck",
        bullets: [
          "Welcome to this interactive presentation module.",
          "Use the toolbar buttons or left/right arrow keys to browse through slides.",
          "This presentation viewer is copy-protected and download-restricted.",
          "Click the Fullscreen button above to view slides in full screen dark mode."
        ],
        images: []
      },
      {
        index: 2,
        title: "Module Learning Objectives",
        bullets: [
          "Master core architectural principles and technical concepts.",
          "Analyze component workflows and system performance metrics.",
          "Implement industry best practices for security and maintainability.",
          "Review practical case studies and enterprise deployment patterns."
        ],
        images: []
      },
      {
        index: 3,
        title: "System Architecture & Flow",
        bullets: [
          "Client Layer: React 19 components with type-safe state management.",
          "API Gateway: Fast server endpoints and request authentication.",
          "Storage Layer: Secure cloud file buckets with high-resolution slide caching.",
          "Protection Layer: Event listeners, print shields, and copy prevention."
        ],
        images: []
      },
      {
        index: 4,
        title: "Implementation Best Practices",
        bullets: [
          "Enforce strict TypeScript interfaces across all module boundaries.",
          "Keep component responsibilities modular and decoupled.",
          "Use responsive breakpoints and dark-mode styling tokens.",
          "Sanitize external input and sanitize user-generated rich text."
        ],
        images: []
      },
      {
        index: 5,
        title: "Summary & Completion",
        bullets: [
          "Review key takeaways from this lecture presentation.",
          "Proceed to the next lesson item or interactive laboratory exercise.",
          "Lesson completion is automatically recorded upon reaching this final slide."
        ],
        images: []
      }
    ];
  }

  // 1. Get raw bytes — either from data URL or by fetching
  let buf: ArrayBuffer;

  if (src.startsWith("data:")) {
    // data URL → decode base64
    const comma = src.indexOf(",");
    if (comma === -1) throw new Error("Not a valid data URL");
    const b64 = src.slice(comma + 1);
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    buf = bytes.buffer;
  } else {
    // Regular URL (server-relative or http) → fetch
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
    buf = await res.arrayBuffer();
  }

  // 2. Open as ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);

  } catch (e) {
    throw new Error("Could not open the file as a PowerPoint archive. Is it a valid .pptx?");
  }

  // 3. List slide XML files, sorted numerically
  const slideKeys = Object.keys(zip.files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt((a.match(/\d+/) ?? ["0"])[0], 10);
      const nb = parseInt((b.match(/\d+/) ?? ["0"])[0], 10);
      return na - nb;
    });

  if (slideKeys.length === 0) {
    throw new Error(
      "No slides found in this file. Make sure you uploaded a .pptx (not .ppt or .odp)."
    );
  }

  const slides: ParsedSlide[] = [];

  for (let si = 0; si < slideKeys.length; si++) {
    const key = slideKeys[si];
    const rawXml = await zip.file(key)!.async("string");
    const xml = stripNs(rawXml); // strip namespaces for easy querying

    // ── Extract slide shapes ──────────────────────────────────────────────
    let title = "";
    const bullets: string[] = [];

    // Match all <sp> ... </sp> blocks
    const spRe = /<sp(?:\s[^>]*)?>[\s\S]*?<\/sp>/g;
    let spMatch: RegExpExecArray | null;
    while ((spMatch = spRe.exec(xml)) !== null) {
      const spXml = spMatch[0];

      // Check if this is a title placeholder
      const isTitle =
        /type="(?:title|ctrTitle)"/.test(spXml) ||
        /type='(?:title|ctrTitle)'/.test(spXml);

      // Extract all <p> paragraphs within this shape's txBody
      const txBodyMatch = /<txBody[\s\S]*?<\/txBody>/.exec(spXml);
      if (!txBodyMatch) continue;
      const txXml = txBodyMatch[0];

      const paraRe = /<p(?:\s[^>]*)?>[\s\S]*?<\/p>/g;
      let pMatch: RegExpExecArray | null;
      const paraTexts: string[] = [];
      while ((pMatch = paraRe.exec(txXml)) !== null) {
        const t = pullText(pMatch[0]);
        if (t) paraTexts.push(t);
      }

      const combined = paraTexts.join(" ").trim();
      if (!combined) continue;

      if (isTitle && !title) {
        title = combined;
      } else {
        bullets.push(...paraTexts.filter(Boolean));
      }
    }

    // ── Extract embedded images via slide rels ────────────────────────────
    const images: string[] = [];
    const relsKey = key
      .replace("ppt/slides/", "ppt/slides/_rels/")
      .replace(".xml", ".xml.rels");

    const relsFile = zip.file(relsKey);
    if (relsFile) {
      const relsXml = await relsFile.async("string");

      // Find image relationships (Type ends with /image, Target is local)
      const relRe =
        /Type="[^"]*\/image"[^>]*Target="([^"]+)"/gi;
      let relMatch: RegExpExecArray | null;
      while ((relMatch = relRe.exec(relsXml)) !== null) {
        const target = relMatch[1];
        if (target.startsWith("http")) continue; // skip external URLs

        const imgPath = target.startsWith("../")
          ? "ppt/" + target.slice(3)
          : `ppt/slides/${target}`;

        const imgFile = zip.file(imgPath);
        if (!imgFile) continue;

        try {
          const b64img = await imgFile.async("base64");
          const ext = imgPath.split(".").pop()?.toLowerCase() ?? "png";
          const mimes: Record<string, string> = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            bmp: "image/bmp",
            webp: "image/webp",
            svg: "image/svg+xml",
          };
          images.push(`data:${mimes[ext] ?? "image/png"};base64,${b64img}`);
        } catch {
          // Ignore unreadable images
        }
      }
    }

    slides.push({ index: si + 1, title, bullets, images });
  }

  return slides;
}

// ─── Slide Card ──────────────────────────────────────────────────────────────

function SlideCard({ slide, accent }: { slide: ParsedSlide; accent: string }) {
  const hasAnyContent =
    slide.title || slide.bullets.length > 0 || slide.images.length > 0;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-gradient-to-br from-[#0d1117] via-[#0a0f1e] to-[#060b14] p-7 sm:p-10">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent} opacity-90`} />

      {/* Slide number */}
      <div className="absolute top-3 right-4 font-mono text-[10px] text-slate-600 border border-slate-700/60 px-2 py-0.5 rounded">
        {slide.index}
      </div>

      {!hasAnyContent && (
        <div className="flex-1 flex items-center justify-center">
          <Presentation className="h-16 w-16 text-slate-700" />
        </div>
      )}

      {hasAnyContent && (
        <div className="flex flex-col gap-5 flex-1 min-h-0 overflow-hidden">
          {/* Title */}
          {slide.title && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight pr-8">
                {slide.title}
              </h2>
              <div
                className={`mt-2.5 h-[3px] w-12 rounded-full bg-gradient-to-r ${accent}`}
              />
            </div>
          )}

          {/* Bullets */}
          {slide.bullets.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {slide.bullets.map((line, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-[5px] h-2 w-2 rounded-full bg-gradient-to-br ${accent} shrink-0`}
                  />
                  <p className="text-[15px] leading-relaxed text-slate-200 font-medium">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Images */}
          {slide.images.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1 shrink-0">
              {slide.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="max-h-40 max-w-sm rounded-lg border border-white/10 object-contain shadow-lg"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export interface PptxSlideRendererProps {
  /** data: URL (base64) or server-relative/absolute URL to a .pptx file */
  src: string;
  title: string;
  onComplete?: () => void;
}

export function PptxSlideRenderer({ src, title, onComplete }: PptxSlideRendererProps) {
  const [slides, setSlides] = useState<ParsedSlide[]>([]);
  const [current, setCurrent] = useState(1);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-trigger completion on last slide or 1-slide dwell
  useEffect(() => {
    if (status === "done" && slides.length > 0) {
      if (current >= slides.length) {
        onComplete?.();
      } else if (slides.length === 1) {
        const timer = setTimeout(() => {
          onComplete?.();
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [current, slides.length, status, onComplete]);

  // Parse on mount / src change
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSlides([]);
    setCurrent(1);
    setErrorMsg("");

    parsePptx(src)
      .then((result) => {
        if (cancelled) return;
        setSlides(result);
        setStatus("done");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Keyboard navigation
  const goNext = useCallback(
    () => setCurrent((c) => Math.min(c + 1, slides.length)),
    [slides.length]
  );
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const currentAccent = ACCENTS[(current - 1) % ACCENTS.length];

  return (
    <div
      className="space-y-3 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <style>{`@media print{body{display:none!important}}`}</style>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <Presentation className="h-4 w-4 text-warning shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">{title}</span>
          <Badge variant="secondary" className="text-[10px] bg-warning/15 text-warning border-0 font-medium shrink-0">
            PowerPoint
          </Badge>
          <span className="hidden sm:flex text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono items-center gap-1 shrink-0">
            <Lock className="h-2.5 w-2.5 text-primary" /> Protected
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Slide counter + arrows */}
          {status === "done" && slides.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={goPrev}
                disabled={current <= 1}
                className="h-8 w-8 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-16 text-center text-xs font-mono font-semibold text-foreground">
                {current} / {slides.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={goNext}
                disabled={current >= slides.length}
                className="h-8 w-8 rounded-lg cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen((f) => !f)}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            {isFullscreen ? (
              <><Minimize2 className="h-3.5 w-3.5" /> Exit</>
            ) : (
              <><Maximize2 className="h-3.5 w-3.5" /> Fullscreen</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Viewer ───────────────────────────────────────────────────────── */}
      <div
        className={
          isFullscreen
            ? "fixed inset-4 z-50 rounded-xl border-2 border-primary/50 overflow-hidden"
            : "relative w-full rounded-xl border border-border overflow-hidden"
        }
        style={isFullscreen ? {} : { height: "680px" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ── Loading ── */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0d1117]">
            <div className="h-16 w-16 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-warning animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Parsing your presentation…</p>
            <p className="text-xs text-slate-500">Extracting slides from PowerPoint file</p>
          </div>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center bg-[#0d1117]">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="space-y-3 max-w-sm">
              <p className="text-base font-bold text-white">Could not render presentation</p>
              <pre className="text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg p-3 text-left whitespace-pre-wrap break-words">
                {errorMsg}
              </pre>
              <p className="text-xs text-slate-400">
                Make sure the file is a valid <strong>.pptx</strong> (not password-protected or corrupted). Old <strong>.ppt</strong> binary format is not supported — please save as .pptx first.
              </p>
            </div>
          </div>
        )}

        {/* ── No slides ── */}
        {status === "done" && slides.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0d1117]">
            <Presentation className="h-14 w-14 text-slate-700" />
            <p className="text-sm font-semibold text-slate-300">No slides found</p>
            <p className="text-xs text-slate-500">The presentation may be empty or in an unsupported format.</p>
          </div>
        )}

        {/* ── Slides ── */}
        {status === "done" && slides.length > 0 && (
          <div className="relative w-full h-full group/pptx">
            {/* Left-side click zone */}
            {current > 1 && (
              <div
                onClick={goPrev}
                className="absolute left-0 top-0 bottom-12 w-28 sm:w-40 z-20 flex items-center justify-start pl-4 cursor-pointer group/prev transition-colors hover:bg-white/5"
                title="Previous Slide (Click Left / Left Arrow)"
              >
                <div className="h-11 w-11 rounded-full bg-black/70 text-white flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-md opacity-0 group-hover/prev:opacity-100 group-hover/pptx:opacity-40 hover:!opacity-100 transition-all transform -translate-x-2 group-hover/prev:translate-x-0">
                  <ChevronLeft className="h-6 w-6" />
                </div>
              </div>
            )}

            {/* Right-side click zone */}
            {current < slides.length && (
              <div
                onClick={goNext}
                className="absolute right-0 top-0 bottom-12 w-28 sm:w-40 z-20 flex items-center justify-end pr-4 cursor-pointer group/next transition-colors hover:bg-white/5"
                title="Next Slide (Click Right / Right Arrow)"
              >
                <div className="h-11 w-11 rounded-full bg-black/70 text-white flex items-center justify-center shadow-2xl border border-white/20 backdrop-blur-md opacity-0 group-hover/next:opacity-100 group-hover/pptx:opacity-40 hover:!opacity-100 transition-all transform translate-x-2 group-hover/next:translate-x-0">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            )}

            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 2) {
                  goPrev();
                } else {
                  goNext();
                }
              }}
              className="w-full h-full cursor-pointer"
            >
              <SlideCard
                slide={slides[current - 1]}
                accent={currentAccent}
              />
            </div>

            {/* Bottom navigation bar */}
            <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 bg-[#060b14]/95 border-t border-slate-800 backdrop-blur-sm">
              {/* Dot strip */}
              <div className="flex items-center gap-1.5 flex-wrap max-w-[55%]">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i + 1)}
                    title={`Slide ${i + 1}`}
                    className={`rounded-full transition-all duration-300 ${
                      current === i + 1
                        ? `w-6 h-2 bg-gradient-to-r ${currentAccent}`
                        : "w-2 h-2 bg-slate-700 hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                View Only
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
