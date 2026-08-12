import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Lock, Presentation, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SecurePdfViewerProps {
  url: string;
  title: string;
  isPresentation?: boolean;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export function SecurePdfViewer({ url, title, isPresentation = false }: SecurePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(isPresentation ? 1.0 : 0.75);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [fitDimensions, setFitDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Load PDF.js script dynamically
  useEffect(() => {
    let isMounted = true;

    const loadPdfJs = async () => {
      try {
        if (!window.pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });

          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        const loadingTask = window.pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.warn("PDF.js loading failed or CORS blocked, using secure embedded viewer:", err);
        if (isMounted) {
          setUseIframeFallback(true);
          setLoading(false);
        }
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [url]);

  // Compute dynamic fit dimensions based on container size & page aspect ratio
  const calculateFit = useCallback((unscaledWidth: number, unscaledHeight: number) => {
    const container = containerRef.current;
    const containerWidth = (container?.clientWidth || 920) - 16;
    const containerHeight = (isPresentation ? 600 : (container?.clientHeight || 700)) - 16;

    const scaleX = containerWidth / unscaledWidth;
    const scaleY = containerHeight / unscaledHeight;

    // For PDF documents: fit-to-width (scaleX) so PDF spans 100% width like an embedded webpage document
    // For Presentations: fit-to-box Math.min(scaleX, scaleY)
    const fitScale = isPresentation ? Math.min(scaleX, scaleY) : scaleX;

    return {
      width: Math.floor(unscaledWidth * fitScale),
      height: Math.floor(unscaledHeight * fitScale),
    };
  }, [isPresentation]);

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
    if (isPresentation && zoom <= 1) return;
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
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePrevPage = () => {
    if (pageNum > 1) setPageNum(pageNum - 1);
  };

  const handleNextPage = () => {
    if (pageNum < numPages) setPageNum(pageNum + 1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleResetZoom = () => {
    setZoom(isPresentation ? 1.0 : 0.75);
  };

  const defaultZoom = isPresentation ? 1.0 : 0.75;

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
              title={isPresentation ? "Previous Slide" : "Previous Page"}
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
              title={isPresentation ? "Next Slide" : "Next Page"}
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

      {/* Outer Viewport Box - Clean transparent container without dark back layer sides */}
      <div className={`w-full ${isPresentation ? "h-[640px]" : "h-[750px]"} rounded-xl bg-transparent border-0 overflow-hidden relative`}>
        {/* Viewport Window */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full h-full overflow-auto p-0 flex flex-col items-center custom-scrollbar ${
            !isPresentation || zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
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
              className="relative rounded-xl border border-border shadow-xl shrink-0 transition-all duration-150 ease-out m-auto flex items-center justify-center bg-white overflow-hidden"
              style={{
                width: fitDimensions.width ? `${Math.floor(fitDimensions.width * zoom)}px` : "100%",
                height: fitDimensions.height ? `${Math.floor(fitDimensions.height * zoom)}px` : "auto",
                maxWidth: "100%",
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-xl select-none pointer-events-none object-contain"
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
                src={`${url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${Math.round(zoom * 100)}`}
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
