import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Lock, Presentation, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SecurePdfViewerProps {
  url: string;
  title: string;
  isPresentation?: boolean;
  onComplete?: () => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const SAMPLE_PDF_B64 =
  "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUiA0IDAgUl0KL0NvdW50IDIKPj4KZW5kb2JqCjMgMCBvYmoKPDAKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA1IDAgUgo+Pgo+PgovQ29udGVudHMgNiAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDAKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA1IDAgUgo+Pgo+PgovQ29udGVudHMgNyAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDAKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago2IDAgb2JqCjw8IC9MZW5ndGggMTc2ID4+CnN0cmVhbQpCVAovRjEgMjQgVGYKNzIgNzAwIFRkCihDb3Vyc2UgUERGIERvY3VtZW50IC0gUGFnZSAxKSBUagovRjEgMTQgVGYKMCAtNDAgVGQKKFdlbGNvbWUgdG8gdGhpcyBpbnRlcmFjdGl2ZSBQREYgbGVzc29uLikgVGoKMCAtMjUgVGQKKFVzZSB0b29sYmFyIGJ1dHRvbnMgb3IgYXJyb3cga2V5cyB0byBuYXZpZ2F0ZSBwYWdlcy4pIFRqCkVUCmVuZHN0cmVhbSBlbmRvYmoKNyAwIG9iago8PCAvTGVuZ3RoIDE4MCA+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjcyIDcwMCBUZAoocmVzb3VyY2UgUERGIERvY3VtZW50IC0gUGFnZSAyKSBUagovRjEgMTQgVGYKMCAtNDAgVGQKKFRoaXMgaXMgcGFnZSAyIG9mIHRoZSBjb3Vyc2UgZG9jdW1lbnQuKSBUagowIC0yNSBUZCAoQ29tcGxldGlvbiBpcyFhdXRvbWF0aWNhbGx5IHJlY29yZGVkIG9uIHJlYWNoaW5nIHRoaXMgcGFnZS4pIFRqCkVUCmVuZHN0cmVhbSBlbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAMDAwMCBuIAowMDAwMDAwMDU4IDAMDAwMCBuIAowMDAwMDAwMTE1IDAMDAwMCBuIAowMDAwMDAwMjQxIDAMDAwMCBuIAowMDAwMDAwMzY3IDAMDAwMCBuIAowMDAwMDAwNDQwIDAMDAwMCBuIAowMDAwMDAwNjY3IDAMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDggL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjg5OAolJUVPRg==";

export function SecurePdfViewer({ url, title, isPresentation = false, onComplete }: SecurePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [fitDimensions, setFitDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Auto-trigger completion when student reaches the last page or dwells on a 1-page PDF
  useEffect(() => {
    if (!loading && numPages > 0) {
      if (pageNum >= numPages) {
        onComplete?.();
      } else if (numPages === 1) {
        const timer = setTimeout(() => {
          onComplete?.();
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [pageNum, numPages, loading, onComplete]);

  // Reset page number, zoom, and load PDF.js script dynamically whenever url changes
  useEffect(() => {
    let isMounted = true;
    setPageNum(1);
    setZoom(1.0);
    setLoading(true);
    setPdfDoc(null);
    setUseIframeFallback(false);

    const loadPdfJs = async () => {
      try {
        if (!window.pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = () => resolve(true);
            script.onerror = (err) => reject(err);
          });

          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        let loadingTask;
        const targetUrl = !url || url.trim() === "" || url.trim() === "#" ? `data:application/pdf;base64,${SAMPLE_PDF_B64}` : url;

        if (targetUrl.startsWith("data:")) {
          const comma = targetUrl.indexOf(",");
          const b64 = targetUrl.slice(comma + 1);
          const binaryStr = atob(b64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          loadingTask = window.pdfjsLib.getDocument({ data: bytes });
        } else {
          const fullUrl = typeof window !== "undefined" && targetUrl.startsWith("/")
            ? window.location.origin + targetUrl
            : targetUrl;
          loadingTask = window.pdfjsLib.getDocument(fullUrl);
        }

        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          try {
            const binaryStr = atob(SAMPLE_PDF_B64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const fallbackTask = window.pdfjsLib.getDocument({ data: bytes });
            const doc = await fallbackTask.promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setLoading(false);
          } catch (fallbackErr) {
            setUseIframeFallback(true);
            setLoading(false);
          }
        }
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [url]);

  // Compute dynamic fit dimensions based on container width (Stable full-width fit across all pages)
  const calculateFit = useCallback((unscaledWidth: number, unscaledHeight: number) => {
    const container = containerRef.current;
    const containerWidth = (container?.clientWidth || 920) - 16;

    const fitScale = containerWidth / unscaledWidth;

    return {
      width: Math.floor(unscaledWidth * fitScale),
      height: Math.floor(unscaledHeight * fitScale),
    };
  }, []);

  // Render current page onto canvas at crisp 2x resolution
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate fit dimensions for current container size
        const fit = calculateFit(unscaledViewport.width, unscaledViewport.height);
        setFitDimensions(fit);

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render canvas at 2x crisp resolution for sharp rendering
        const crispScale = 2.0;
        const viewport = page.getViewport({ scale: crispScale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const context = canvas.getContext("2d");
        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          renderTask = page.render(renderContext);
          await renderTask.promise;
        }
      } catch (err) {
        console.error("Error rendering PDF page:", err);
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, calculateFit]);

  // Handle window resize dynamically
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc) return;
      pdfDoc.getPage(pageNum).then((page: any) => {
        const unscaled = page.getViewport({ scale: 1.0 });
        setFitDimensions(calculateFit(unscaled.width, unscaled.height));
      }).catch(() => {});
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc, pageNum, calculateFit]);

  // Panning & dragging for document pages & zoomed views
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePrevPage = useCallback(() => {
    setPageNum((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNum((prev) => (numPages > 0 ? Math.min(numPages, prev + 1) : prev + 1));
  }, [numPages]);

  // Keyboard navigation (Arrow keys & Page keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNextPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevPage, handleNextPage]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  const defaultZoom = 1.0;

  return (
    <div
      className="space-y-3 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Print-protection CSS tag */}
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/80 px-4 py-2.5 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md">
          {isPresentation && <Presentation className="h-4 w-4 text-warning shrink-0" />}
          <span className="truncate font-semibold">{title}</span>
          {isPresentation && (
            <Badge variant="secondary" className="text-[10px] bg-warning/15 text-warning border-0 font-medium shrink-0">
              PowerPoint
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevPage}
              disabled={pageNum <= 1 || !pdfDoc}
              className="h-8 w-8 rounded-lg border-border cursor-pointer"
              title={isPresentation ? "Previous Slide (Left Arrow / Click Left)" : "Previous Page (Left Arrow / Click Left)"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="px-2 text-xs font-mono font-medium text-foreground whitespace-nowrap">
              {isPresentation
                ? numPages > 0 ? `Slide ${pageNum} of ${numPages}` : "Slide 1 of 1"
                : numPages > 0 ? `${pageNum} / ${numPages}` : "1 / 1"}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={pageNum >= numPages || !pdfDoc}
              className="h-8 w-8 rounded-lg border-border cursor-pointer"
              title={isPresentation ? "Next Slide (Right Arrow / Click Right)" : "Next Page (Right Arrow / Click Right)"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.75}
              className="h-8 w-8 rounded-lg border-border cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3.0}
              className="h-8 w-8 rounded-lg border-border cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            {zoom !== defaultZoom && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetZoom}
                className="h-8 w-8 rounded-lg border-border cursor-pointer text-muted-foreground hover:text-foreground"
                title={`Reset Zoom (${Math.round(defaultZoom * 100)}%)`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Viewport Container - Dynamic seamless fit around PDF canvas without ash background window */}
      <div className="w-full rounded-xl bg-transparent border-0 overflow-hidden relative group/viewer flex flex-col items-center justify-center">
        {/* Left-side click zone overlay */}
        {!loading && numPages > 1 && pageNum > 1 && (
          <div
            onClick={handlePrevPage}
            className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 z-20 flex items-center justify-start pl-4 cursor-pointer group/prev transition-colors hover:bg-black/5"
            title="Previous Page (Click Left)"
          >
            <div className="h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-md opacity-0 group-hover/prev:opacity-100 group-hover/viewer:opacity-40 hover:!opacity-100 transition-all transform -translate-x-2 group-hover/prev:translate-x-0">
              <ChevronLeft className="h-6 w-6" />
            </div>
          </div>
        )}

        {/* Right-side click zone overlay */}
        {!loading && numPages > 1 && pageNum < numPages && (
          <div
            onClick={handleNextPage}
            className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 z-20 flex items-center justify-end pr-4 cursor-pointer group/next transition-colors hover:bg-black/5"
            title="Next Page (Click Right)"
          >
            <div className="h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-md opacity-0 group-hover/next:opacity-100 group-hover/viewer:opacity-40 hover:!opacity-100 transition-all transform translate-x-2 group-hover/next:translate-x-0">
              <ChevronRight className="h-6 w-6" />
            </div>
          </div>
        )}

        {/* Viewport Window */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full p-0 flex flex-col items-center justify-center ${
            zoom > 1 ? "overflow-auto cursor-grab active:cursor-grabbing max-h-[85vh]" : "overflow-hidden cursor-default"
          }`}
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center my-auto space-y-3 text-muted-foreground py-24">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-medium">Loading document...</p>
            </div>
          )}

          {!loading && !useIframeFallback && (
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 2) {
                  handlePrevPage();
                } else {
                  handleNextPage();
                }
              }}
              className="relative rounded-xl border border-border/80 shadow-2xl shrink-0 transition-all duration-150 ease-out m-auto flex items-center justify-center bg-white overflow-hidden cursor-pointer w-full"
              style={{
                width: fitDimensions.width ? `${Math.floor(fitDimensions.width * zoom)}px` : "100%",
                height: fitDimensions.height ? `${Math.floor(fitDimensions.height * zoom)}px` : "auto",
                maxWidth: "100%",
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-xl select-none pointer-events-none object-contain block"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          )}

          {!loading && useIframeFallback && (
            <div
              className="relative rounded-xl overflow-hidden bg-white shadow-2xl transition-all duration-150 ease-out shrink-0 m-auto"
              style={{
                width: `${100 * zoom}%`,
                height: `${600 * zoom}px`,
                minWidth: "100%",
              }}
            >
              <iframe
                src={`${url.startsWith("/") && typeof window !== "undefined" ? window.location.origin + url : url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${Math.round(zoom * 100)}`}
                className="w-full h-full border-0"
                title={title}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div
                className="absolute top-0 left-0 right-0 h-[56px] bg-transparent z-20 pointer-events-auto cursor-default"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
