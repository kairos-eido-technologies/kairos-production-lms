import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Minus,
  Undo2,
  Redo2,
  Palette,
  Highlighter,
  Type,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon,
  Quote,
  Sparkles,
  RemoveFormatting,
  Code2,
  Maximize2,
  Minimize2,
  Info,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const FONT_SIZES = [
  { label: "Small (12px)", value: "12px" },
  { label: "Normal (14px)", value: "14px" },
  { label: "Medium (16px)", value: "16px" },
  { label: "Large (18px)", value: "18px" },
  { label: "XL (20px)", value: "20px" },
  { label: "2XL (24px)", value: "24px" },
  { label: "3XL (30px)", value: "30px" },
  { label: "Hero (36px)", value: "36px" },
];

const TEXT_COLORS = [
  { name: "Default", color: "#f4f4f5" },
  { name: "Muted Grey", color: "#a1a1aa" },
  { name: "Bright White", color: "#ffffff" },
  { name: "Crimson Red", color: "#ef4444" },
  { name: "Flame Orange", color: "#f97316" },
  { name: "Amber Gold", color: "#f59e0b" },
  { name: "Emerald Green", color: "#10b981" },
  { name: "Sky Blue", color: "#0ea5e9" },
  { name: "Indigo Blue", color: "#6366f1" },
  { name: "Purple Neon", color: "#a855f7" },
  { name: "Hot Pink", color: "#ec4899" },
  { name: "Dark Pitch", color: "#18181b" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow Highlight", color: "#fef08a", textColor: "#713f12" },
  { name: "Green Highlight", color: "#bbf7d0", textColor: "#14532d" },
  { name: "Blue Highlight", color: "#bfdbfe", textColor: "#1e3a8a" },
  { name: "Purple Highlight", color: "#f3e8ff", textColor: "#581c87" },
  { name: "Orange Highlight", color: "#fed7aa", textColor: "#7c2d12" },
  { name: "Pink Highlight", color: "#fce7f3", textColor: "#831843" },
  { name: "None", color: "transparent", textColor: "inherit" },
];

function TBtn({
  title,
  onClick,
  active,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-all text-sm cursor-pointer select-none
        ${
          active
            ? "bg-primary/25 text-primary font-bold shadow-xs border border-primary/30"
            : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
        } ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-border/70 mx-0.5 shrink-0 self-center" />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type or paste your content here...",
  minHeight = 360,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showColors, setShowColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const [showCallouts, setShowCallouts] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value || "");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Link Dialog Modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Statistics
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 1 });

  // Sync external value -> editor DOM when not actively typing
  const isTypingRef = useRef(false);
  useEffect(() => {
    if (editorRef.current && !isTypingRef.current) {
      const currentVal = value || "";
      if (editorRef.current.innerHTML !== currentVal) {
        editorRef.current.innerHTML = currentVal;
        calculateStats(currentVal);
      }
    }
  }, [value]);

  const calculateStats = (html: string) => {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    setStats({ words, chars, readTime });
  };

  // Keep selection range updated
  const saveCurrentSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreCurrentSelection = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch {
        // Selection fallback
      }
    }
  }, []);

  const ensureStyleWithCSS = () => {
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {}
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    isTypingRef.current = true;
    const html = editorRef.current.innerHTML;
    setHtmlSource(html);
    calculateStats(html);
    onChange(html);
    setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  };

  const refreshFormats = useCallback(() => {
    saveCurrentSelection();
    const active = new Set<string>();
    try {
      if (document.queryCommandState("bold")) active.add("bold");
      if (document.queryCommandState("italic")) active.add("italic");
      if (document.queryCommandState("underline")) active.add("underline");
      if (document.queryCommandState("strikeThrough")) active.add("strikeThrough");
      if (document.queryCommandState("insertOrderedList")) active.add("ol");
      if (document.queryCommandState("insertUnorderedList")) active.add("ul");
      if (document.queryCommandState("justifyCenter")) active.add("center");
      if (document.queryCommandState("justifyRight")) active.add("right");
      if (document.queryCommandState("justifyLeft")) active.add("left");
      if (document.queryCommandState("justifyFull")) active.add("justify");
    } catch {}
    setActiveFormats(active);
  }, [saveCurrentSelection]);

  useEffect(() => {
    const onSelectionChange = () => {
      refreshFormats();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [refreshFormats]);

  const exec = (command: string, val?: string) => {
    restoreCurrentSelection();
    ensureStyleWithCSS();
    document.execCommand(command, false, val);
    handleInput();
    refreshFormats();
  };

  const insertHeading = (level: "h1" | "h2" | "h3" | "p" | "blockquote" | "pre") => {
    restoreCurrentSelection();
    ensureStyleWithCSS();
    if (level === "blockquote") {
      document.execCommand("formatBlock", false, "<blockquote>");
    } else if (level === "pre") {
      document.execCommand("formatBlock", false, "<pre>");
    } else if (level === "p") {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      try {
        document.execCommand("formatBlock", false, `<${level}>`);
      } catch {
        document.execCommand("formatBlock", false, level);
      }
    }
    setShowHeadings(false);
    handleInput();
  };

  const applyFontSize = (size: string) => {
    restoreCurrentSelection();
    ensureStyleWithCSS();
    document.execCommand("fontSize", false, "7");
    if (editorRef.current) {
      const fontTags = editorRef.current.querySelectorAll("font[size='7']");
      fontTags.forEach((el) => {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.innerHTML = el.innerHTML;
        el.parentNode?.replaceChild(span, el);
      });
      const largeSpans = editorRef.current.querySelectorAll("span[style*='xxx-large']");
      largeSpans.forEach((el) => {
        (el as HTMLElement).style.fontSize = size;
      });
    }
    setShowFontSize(false);
    handleInput();
  };

  const applyColor = (color: string) => {
    restoreCurrentSelection();
    ensureStyleWithCSS();
    document.execCommand("foreColor", false, color);
    setShowColors(false);
    handleInput();
  };

  const applyHighlight = (highlight: { color: string; textColor: string }) => {
    restoreCurrentSelection();
    ensureStyleWithCSS();
    if (highlight.color === "transparent") {
      document.execCommand("removeFormat", false, undefined);
    } else {
      const ok = document.execCommand("hiliteColor", false, highlight.color);
      if (!ok) {
        document.execCommand("backColor", false, highlight.color);
      }
    }
    setShowHighlights(false);
    handleInput();
  };

  const insertHR = () => {
    restoreCurrentSelection();
    document.execCommand("insertHorizontalRule", false, undefined);
    handleInput();
  };

  const insertInlineCode = () => {
    restoreCurrentSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const code = document.createElement("code");
    code.className = "px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs";
    if (!range.collapsed) {
      code.appendChild(range.extractContents());
    } else {
      code.textContent = "code";
    }
    range.insertNode(code);
    handleInput();
  };

  const insertCallout = (type: "tip" | "note" | "warning") => {
    restoreCurrentSelection();
    const config = {
      tip: {
        icon: "💡",
        title: "Pro Tip",
        border: "border-sky-500/40 bg-sky-500/10 text-sky-200",
      },
      note: {
        icon: "📌",
        title: "Important Note",
        border: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      },
      warning: {
        icon: "⚠️",
        title: "Caution / Warning",
        border: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      },
    }[type];

    const html = `
      <div class="my-4 p-4 rounded-xl border ${config.border} flex items-start gap-3 shadow-xs">
        <span style="font-size: 1.35rem; line-height: 1;">${config.icon}</span>
        <div style="flex: 1;">
          <strong style="display:block; font-size: 0.95rem; margin-bottom: 2px;">${config.title}</strong>
          <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">Add your message and notes here...</p>
        </div>
      </div>
      <p><br></p>
    `;
    document.execCommand("insertHTML", false, html);
    setShowCallouts(false);
    handleInput();
  };

  const insertTable = (rows = 3, cols = 3) => {
    restoreCurrentSelection();
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid rgba(255,255,255,0.15); border-radius:8px; overflow:hidden;"><thead><tr style="background:rgba(255,255,255,0.06);">`;
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th style="border:1px solid rgba(255,255,255,0.15); padding:10px 14px; font-weight:600; text-align:left;">Header ${c + 1}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < rows - 1; r++) {
      tableHtml += `<tr style="${r % 2 === 1 ? "background:rgba(255,255,255,0.02);" : ""}">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="border:1px solid rgba(255,255,255,0.15); padding:10px 14px;">Cell data</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;
    document.execCommand("insertHTML", false, tableHtml);
    handleInput();
  };

  const openLinkModal = () => {
    saveCurrentSelection();
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString() : "";
    setLinkText(selectedText);
    setLinkUrl("");
    setLinkModalOpen(true);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) return;
    restoreCurrentSelection();
    const validUrl =
      linkUrl.startsWith("http://") ||
      linkUrl.startsWith("https://") ||
      linkUrl.startsWith("mailto:")
        ? linkUrl
        : `https://${linkUrl}`;

    if (linkText.trim()) {
      const html = `<a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: underline; font-weight: 500;">${linkText.trim()}</a>`;
      document.execCommand("insertHTML", false, html);
    } else {
      document.execCommand("createLink", false, validUrl);
    }
    setLinkModalOpen(false);
    handleInput();
  };

  const insertImageSrc = (src: string) => {
    restoreCurrentSelection();
    const imgHtml = `<img src="${src}" alt="document-image" style="max-width:100%; height:auto; border-radius:8px; margin:14px 0; display:block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />`;
    document.execCommand("insertHTML", false, imgHtml);
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") insertImageSrc(reader.result);
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") insertImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlSource;
      }
      onChange(htmlSource);
      calculateStats(htmlSource);
    } else {
      if (editorRef.current) {
        setHtmlSource(editorRef.current.innerHTML);
      }
    }
    setIsHtmlMode(!isHtmlMode);
  };

  // Close dropdown popovers on outside click
  useEffect(() => {
    const handler = () => {
      setShowColors(false);
      setShowHighlights(false);
      setShowFontSize(false);
      setShowHeadings(false);
      setShowCallouts(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div
      className={`rounded-xl border border-border overflow-hidden bg-card shadow-xs focus-within:border-primary/50 transition-all ${
        isFullscreen
          ? "fixed inset-4 z-50 flex flex-col bg-background/95 backdrop-blur-xl border-primary/40 shadow-2xl"
          : "relative"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* ── Top Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/35 px-3 py-2 select-none relative z-20">
        {/* Undo / Redo */}
        <TBtn title="Undo (Ctrl+Z)" onClick={() => exec("undo")}>
          <Undo2 className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Redo (Ctrl+Y)" onClick={() => exec("redo")}>
          <Redo2 className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Headings dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Heading Style"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
              setShowHeadings((v) => !v);
              setShowColors(false);
              setShowHighlights(false);
              setShowFontSize(false);
              setShowCallouts(false);
            }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
          >
            <Type className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px]">▾</span>
          </button>
          {showHeadings && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-1 min-w-[150px] text-popover-foreground">
              {[
                { tag: "h1", label: "Heading 1", icon: Heading1 },
                { tag: "h2", label: "Heading 2", icon: Heading2 },
                { tag: "h3", label: "Heading 3", icon: Heading3 },
                { tag: "p", label: "Normal Paragraph", icon: Type },
                { tag: "blockquote", label: "Blockquote", icon: Quote },
                { tag: "pre", label: "Code Block", icon: Code },
              ].map(({ tag, label, icon: Icon }) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertHeading(tag as any);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer text-xs"
                >
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Font Size"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
              setShowFontSize((v) => !v);
              setShowColors(false);
              setShowHighlights(false);
              setShowHeadings(false);
              setShowCallouts(false);
            }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
          >
            <span className="text-xs font-medium">Size</span>
            <span className="text-[10px]">▾</span>
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-1 min-w-[140px] max-h-60 overflow-y-auto text-popover-foreground">
              {FONT_SIZES.map(({ label, value: size }) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFontSize(size);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Basic formatting */}
        <TBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")} active={activeFormats.has("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Italic (Ctrl+I)"
          onClick={() => exec("italic")}
          active={activeFormats.has("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Underline (Ctrl+U)"
          onClick={() => exec("underline")}
          active={activeFormats.has("underline")}
        >
          <Underline className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Strikethrough"
          onClick={() => exec("strikeThrough")}
          active={activeFormats.has("strikeThrough")}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Text Colour dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Text Colour"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
              setShowColors((v) => !v);
              setShowHighlights(false);
              setShowFontSize(false);
              setShowHeadings(false);
              setShowCallouts(false);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary/80 transition-colors cursor-pointer text-primary"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-3 min-w-[220px] text-popover-foreground">
              <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center justify-between">
                <span>Text Colour</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {TEXT_COLORS.map(({ name, color }) => (
                  <button
                    key={color}
                    type="button"
                    title={name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyColor(color);
                    }}
                    className="h-6 w-6 rounded-full border border-border/60 hover:scale-120 transition-transform cursor-pointer shadow-xs"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Highlight Colour"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
              setShowHighlights((v) => !v);
              setShowColors(false);
              setShowFontSize(false);
              setShowHeadings(false);
              setShowCallouts(false);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary/80 transition-colors cursor-pointer text-amber-400"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>
          {showHighlights && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-3 min-w-[210px] text-popover-foreground">
              <div className="text-[11px] font-semibold text-foreground mb-2">Highlight Marker</div>
              <div className="flex flex-wrap gap-1.5">
                {HIGHLIGHT_COLORS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    title={item.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHighlight(item);
                    }}
                    className="h-6 w-6 rounded-full border border-border/60 hover:scale-120 transition-transform cursor-pointer shadow-xs"
                    style={{
                      background:
                        item.color === "transparent"
                          ? "repeating-linear-gradient(-45deg,#888,#888 2px,#fff 2px,#fff 6px)"
                          : item.color,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* Alignment */}
        <TBtn
          title="Align Left"
          onClick={() => exec("justifyLeft")}
          active={activeFormats.has("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Align Centre"
          onClick={() => exec("justifyCenter")}
          active={activeFormats.has("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Align Right"
          onClick={() => exec("justifyRight")}
          active={activeFormats.has("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Justify Text"
          onClick={() => exec("justifyFull")}
          active={activeFormats.has("justify")}
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Lists */}
        <TBtn
          title="Bulleted List"
          onClick={() => exec("insertUnorderedList")}
          active={activeFormats.has("ul")}
        >
          <List className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn
          title="Numbered List"
          onClick={() => exec("insertOrderedList")}
          active={activeFormats.has("ol")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Callout Boxes */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Callout Box"
            onMouseDown={(e) => {
              e.preventDefault();
              saveCurrentSelection();
              setShowCallouts((v) => !v);
              setShowColors(false);
              setShowHighlights(false);
              setShowFontSize(false);
              setShowHeadings(false);
            }}
            className="flex h-7 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px]">▾</span>
          </button>
          {showCallouts && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-1 min-w-[150px] text-popover-foreground">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCallout("tip");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-left text-xs cursor-pointer"
              >
                <Lightbulb className="h-3.5 w-3.5 text-sky-400" />
                <span>Pro Tip Box</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCallout("note");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-left text-xs cursor-pointer"
              >
                <Info className="h-3.5 w-3.5 text-emerald-400" />
                <span>Note Box</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertCallout("warning");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors text-left text-xs cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Warning Box</span>
              </button>
            </div>
          )}
        </div>

        {/* Hyperlink */}
        <TBtn title="Insert Link (Ctrl+K)" onClick={openLinkModal}>
          <LinkIcon className="h-3.5 w-3.5" />
        </TBtn>

        {/* Table */}
        <TBtn title="Insert Table (3x3)" onClick={() => insertTable(3, 3)}>
          <TableIcon className="h-3.5 w-3.5" />
        </TBtn>

        {/* Image upload */}
        <TBtn
          title="Upload / Insert Image"
          onClick={() => {
            saveCurrentSelection();
            fileInputRef.current?.click();
          }}
        >
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
        </TBtn>

        {/* Code & Line */}
        <TBtn title="Inline Code" onClick={insertInlineCode}>
          <Code className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Horizontal Line" onClick={insertHR}>
          <Minus className="h-3.5 w-3.5" />
        </TBtn>

        {/* Clear formatting */}
        <TBtn title="Clear Formatting" onClick={() => exec("removeFormat")}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </TBtn>

        <div className="ml-auto flex items-center gap-1">
          {/* HTML Source Toggle */}
          <TBtn
            title={isHtmlMode ? "Visual WYSIWYG View" : "Edit HTML Source Code"}
            onClick={toggleHtmlMode}
            active={isHtmlMode}
            className="text-primary"
          >
            <Code2 className="h-3.5 w-3.5" />
          </TBtn>

          {/* Fullscreen Toggle */}
          <TBtn
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus Mode"}
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </TBtn>
        </div>
      </div>

      {/* ── Document Paper Editable Area ── */}
      <div
        className={`p-4 sm:p-6 bg-secondary/15 overflow-y-auto ${
          isFullscreen ? "flex-1 max-h-none" : "max-h-[65vh]"
        } relative z-10`}
      >
        {isHtmlMode ? (
          <textarea
            value={htmlSource}
            onChange={(e) => {
              setHtmlSource(e.target.value);
              onChange(e.target.value);
              calculateStats(e.target.value);
            }}
            className="w-full font-mono text-xs p-5 bg-background text-foreground rounded-xl border border-border outline-none focus:border-primary/60 transition-colors resize-y leading-relaxed shadow-sm min-h-[380px]"
            style={{ minHeight }}
            placeholder="Edit raw HTML code..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={handlePaste}
            onBlur={handleInput}
            onKeyUp={saveCurrentSelection}
            onMouseUp={saveCurrentSelection}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                document.execCommand("insertText", false, "\u00a0\u00a0\u00a0\u00a0");
                handleInput();
              }
              if (e.ctrlKey || e.metaKey) {
                if (e.key === "b" || e.key === "B") {
                  e.preventDefault();
                  exec("bold");
                } else if (e.key === "i" || e.key === "I") {
                  e.preventDefault();
                  exec("italic");
                } else if (e.key === "u" || e.key === "U") {
                  e.preventDefault();
                  exec("underline");
                } else if (e.key === "k" || e.key === "K") {
                  e.preventDefault();
                  openLinkModal();
                }
              }
            }}
            className="outline-none p-6 sm:p-10 text-sm leading-relaxed prose-rte bg-card text-card-foreground rounded-xl border border-border/80 shadow-md max-w-4xl mx-auto min-h-[380px]"
            style={{ minHeight }}
            data-placeholder={placeholder}
          />
        )}
      </div>

      {/* ── Status Bar / Statistics ── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/60 bg-secondary/30 text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          <span>{stats.words} words</span>
          <span>•</span>
          <span>{stats.chars} characters</span>
          <span>•</span>
          <span>~{stats.readTime} min read</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span>{isHtmlMode ? "HTML MODE" : "VISUAL WYSIWYG"}</span>
        </div>
      </div>

      {/* ── Insert Link Modal ── */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Hyperlink</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Display Text</label>
              <Input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="e.g. Visit Documentation"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Destination URL</label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyLink}
              className="gradient-primary text-primary-foreground border-0"
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .prose-rte:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .prose-rte h1 { font-size: 1.85rem; font-weight: 700; margin: 0.8em 0 0.4em; line-height: 1.25; color: hsl(var(--foreground)); }
        .prose-rte h2 { font-size: 1.45rem; font-weight: 600; margin: 0.7em 0 0.35em; line-height: 1.3; color: hsl(var(--foreground)); }
        .prose-rte h3 { font-size: 1.2rem; font-weight: 600; margin: 0.6em 0 0.3em; color: hsl(var(--foreground)); }
        .prose-rte p { margin: 0.5em 0; line-height: 1.65; }
        .prose-rte ul { list-style-type: disc; padding-left: 1.6em; margin: 0.6em 0; }
        .prose-rte ol { list-style-type: decimal; padding-left: 1.6em; margin: 0.6em 0; }
        .prose-rte li { margin: 0.25em 0; }
        .prose-rte blockquote { border-left: 3px solid hsl(var(--primary)); padding-left: 1em; margin: 0.8em 0; font-style: italic; color: hsl(var(--muted-foreground)); }
        .prose-rte pre { background: rgba(0,0,0,0.35); border: 1px solid hsl(var(--border)); padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; overflow-x: auto; margin: 0.8em 0; }
        .prose-rte code { background: rgba(99,102,241,0.15); color: #818cf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .prose-rte hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.4em 0; }
        .prose-rte a { color: hsl(var(--primary)); text-decoration: underline; font-weight: 500; }
        .prose-rte strong { font-weight: 700; color: inherit; }
        .prose-rte em { font-style: italic; }
        .prose-rte s { text-decoration: line-through; }
        .prose-rte u { text-decoration: underline; }
        .prose-rte img { max-width: 100%; height: auto; border-radius: 8px; margin: 14px 0; display: block; }
        .prose-rte table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        .prose-rte th, .prose-rte td { border: 1px solid hsl(var(--border)); padding: 8px 12px; }
      `}</style>
    </div>
  );
}
