import React, { useEffect, useState, useCallback } from "react";
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
import { PptxSlideRenderer } from "@/components/PptxSlideRenderer";

interface PptxFullViewerProps {
  url: string;
  title: string;
}

export function PptxFullViewer({ url, title }: PptxFullViewerProps) {
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Extract file ID if URL is /api/files?id=...
  let fileId: string | null = null;
  try {
    if (url.includes("/api/files?id=")) {
      const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");
      fileId = u.searchParams.get("id");
    }
  } catch {
    fileId = null;
  }

  useEffect(() => {
    let active = true;

    if (!fileId) {
      // Not a server file ID (e.g. data URL or external URL) -> fallback directly
      setUseFallback(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/pptx-slides?id=${encodeURIComponent(fileId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.ok && Array.isArray(data.slides) && data.slides.length > 0) {
          setSlideImages(data.slides);
          setCurrentSlide(1);
          setLoading(false);
        } else {
          // No slide images returned -> use XML fallback
          setUseFallback(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.warn("[PptxFullViewer] Server slide conversion not ready, using XML fallback:", err);
        setUseFallback(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fileId, url]);

  // If server slide conversion failed or not applicable, use XML-based client renderer
  if (useFallback) {
    return <PptxSlideRenderer src={url} title={title} />;
  }

  const totalSlides = slideImages.length;

  const handlePrev = () => {
    if (currentSlide > 1) setCurrentSlide((c) => c - 1);
  };

  const handleNext = () => {
    if (currentSlide < totalSlides) setCurrentSlide((c) => c + 1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") handleNext();
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") handlePrev();
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, totalSlides]);

  return (
    <div
      className="space-y-3 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <style>{`@media print { body { display: none !important; } }`}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-4 py-2.5 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-lg">
          <Presentation className="h-4 w-4 text-warning shrink-0" />
          <span className="truncate">{title}</span>
          <Badge variant="secondary" className="text-[10px] bg-warning/15 text-warning border-0 font-medium shrink-0">
            PowerPoint
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {!loading && totalSlides > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                disabled={currentSlide <= 1}
                className="h-8 w-8 rounded-lg border-border cursor-pointer"
                title="Previous Slide"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs font-mono font-semibold text-foreground whitespace-nowrap">
                Slide {currentSlide} of {totalSlides}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentSlide >= totalSlides}
                className="h-8 w-8 rounded-lg border-border cursor-pointer"
                title="Next Slide"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 text-xs gap-1.5 border-border cursor-pointer shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" /> Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Viewer Box */}
      <div
        className={`relative w-full rounded-xl border border-border overflow-hidden shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-4 z-50 h-[calc(100vh-32px)] border-2 border-primary/50"
            : "h-[680px]"
        } bg-slate-950`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-10">
            <div className="h-16 w-16 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-warning animate-spin" />
            </div>
            <p className="text-sm text-slate-300 font-semibold">Processing presentation slides...</p>
            <p className="text-xs text-slate-500">Generating high-fidelity slide previews</p>
          </div>
        )}

        {/* Render slide images */}
        {!loading && totalSlides > 0 && (
          <div className="relative w-full h-full flex flex-col justify-between items-center bg-black select-none p-4">
            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
              <img
                src={slideImages[currentSlide - 1]}
                alt={`Slide ${currentSlide}`}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl pointer-events-none"
                draggable={false}
              />
            </div>

            {/* Bottom dot indicators & protection label */}
            <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-950/90 border-t border-slate-800 rounded-b-lg mt-2">
              <div className="flex items-center gap-1.5 max-w-[60%] flex-wrap">
                {slideImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx + 1)}
                    className={`rounded-full transition-all duration-300 ${
                      currentSlide === idx + 1
                        ? "w-6 h-2 bg-warning shadow-sm shadow-warning/30"
                        : "w-2 h-2 bg-slate-700 hover:bg-slate-500"
                    }`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Protected View — Downloads disabled
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
