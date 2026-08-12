import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Code, Minus, Undo2, Redo2, Palette, Highlighter,
  Type, Image as ImageIcon, Upload,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];

const TEXT_COLORS = [
  "#000000", "#1e293b", "#475569", "#dc2626", "#ea580c",
  "#d97706", "#16a34a", "#0284c7", "#2563eb", "#7c3aed",
  "#c026d3", "#db2777",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#f5d0fe", "#fed7aa",
  "#fecaca", "transparent",
];

function TBtn({
  title, onClick, active, children,
}: {
  title: string; onClick: () => void; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors text-sm cursor-pointer
        ${active
          ? "bg-primary/20 text-primary font-bold"
          : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
        }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-border mx-0.5 shrink-0" />;
}

export function RichTextEditor({ value, onChange, placeholder = "Type or paste your content here...", minHeight = 360 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showColors, setShowColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const savedRange = useRef<Range | null>(null);

  // Sync external value -> DOM
  const lastHtml = useRef<string>("");
  useEffect(() => {
    if (editorRef.current) {
      const targetHtml = value || "";
      if (editorRef.current.innerHTML !== targetHtml) {
        editorRef.current.innerHTML = targetHtml;
        lastHtml.current = targetHtml;
      }
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      } catch {
        // Range fallback
      }
    }
  };

  const refreshFormats = useCallback(() => {
    const active = new Set<string>();
    try {
      if (document.queryCommandState("bold")) active.add("bold");
      if (document.queryCommandState("italic")) active.add("italic");
      if (document.queryCommandState("underline")) active.add("underline");
      if (document.queryCommandState("strikeThrough")) active.add("strikeThrough");
      if (document.queryCommandState("insertOrderedList")) active.add("ol");
      if (document.queryCommandState("insertUnorderedList")) active.add("ul");
    } catch {
      // Ignore query errors
    }
    setActiveFormats(active);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshFormats);
    return () => document.removeEventListener("selectionchange", refreshFormats);
  }, [refreshFormats]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastHtml.current = html;
    onChange(html);
  };

  const exec = (command: string, val?: string) => {
    restoreSelection();
    document.execCommand(command, false, val);
    handleInput();
    refreshFormats();
  };

  const insertHeading = (level: "h1" | "h2" | "h3" | "p") => {
    restoreSelection();
    document.execCommand("formatBlock", false, level);
    setShowHeadings(false);
    handleInput();
  };

  const applyFontSize = (size: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
    }
    setShowFontSize(false);
    handleInput();
  };

  const applyColor = (color: string) => {
    restoreSelection();
    document.execCommand("foreColor", false, color);
    setShowColors(false);
    handleInput();
  };

  const applyHighlight = (color: string) => {
    restoreSelection();
    document.execCommand("hiliteColor", false, color);
    setShowHighlights(false);
    handleInput();
  };

  const insertHR = () => {
    restoreSelection();
    document.execCommand("insertHorizontalRule", false, undefined);
    handleInput();
  };

  const insertCode = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const code = document.createElement("code");
    code.style.cssText = "background:rgba(99,102,241,0.15);color:#818cf8;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;";
    if (!range.collapsed) {
      code.appendChild(range.extractContents());
    } else {
      code.textContent = "code";
    }
    range.insertNode(code);
    handleInput();
  };

  // Image paste & upload handler (MS Word style image copy-paste)
  const insertImageSrc = (src: string) => {
    restoreSelection();
    const imgHtml = `<img src="${src}" alt="document-image" style="max-width:100%; height:auto; border-radius:8px; margin:12px 0; display:block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />`;
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

  // Close dropdown popovers on outside click
  useEffect(() => {
    const handler = () => {
      setShowColors(false);
      setShowHighlights(false);
      setShowFontSize(false);
      setShowHeadings(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs focus-within:border-primary/50 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/30 px-3 py-2 select-none relative z-20">

        {/* Undo / Redo */}
        <TBtn title="Undo (Ctrl+Z)" onClick={() => exec("undo")}><Undo2 className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Redo (Ctrl+Y)" onClick={() => exec("redo")}><Redo2 className="h-3.5 w-3.5" /></TBtn>

        <Divider />

        {/* Headings dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Heading Style"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowHeadings((v) => !v); setShowColors(false); setShowHighlights(false); setShowFontSize(false); }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-secondary/70 text-foreground transition-colors cursor-pointer"
          >
            <Type className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px]">▾</span>
          </button>
          {showHeadings && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-1 min-w-[140px] text-popover-foreground">
              {(["h1", "h2", "h3", "p"] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertHeading(tag); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors text-left cursor-pointer"
                >
                  {tag === "h1" && <Heading1 className="h-4 w-4 text-primary" />}
                  {tag === "h2" && <Heading2 className="h-4 w-4 text-primary" />}
                  {tag === "h3" && <Heading3 className="h-4 w-4 text-primary" />}
                  {tag === "p" && <span className="h-4 w-4 text-center text-muted-foreground text-xs font-mono">¶</span>}
                  <span className="text-xs font-medium">{tag === "p" ? "Normal Text" : tag.toUpperCase()}</span>
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
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontSize((v) => !v); setShowColors(false); setShowHighlights(false); setShowHeadings(false); }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-secondary/70 text-foreground transition-colors cursor-pointer"
          >
            <span className="text-xs font-semibold">Size</span>
            <span className="text-[10px]">▾</span>
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-1 min-w-[120px] max-h-60 overflow-y-auto text-popover-foreground">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFontSize(size); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <span>{size}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Basic formatting */}
        <TBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")} active={activeFormats.has("bold")}><Bold className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Italic (Ctrl+I)" onClick={() => exec("italic")} active={activeFormats.has("italic")}><Italic className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Underline (Ctrl+U)" onClick={() => exec("underline")} active={activeFormats.has("underline")}><Underline className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Strikethrough" onClick={() => exec("strikeThrough")} active={activeFormats.has("strikeThrough")}><Strikethrough className="h-3.5 w-3.5" /></TBtn>

        <Divider />

        {/* Text Colour dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Text Colour"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowColors((v) => !v); setShowHighlights(false); setShowFontSize(false); setShowHeadings(false); }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary/70 transition-colors cursor-pointer"
          >
            <Palette className="h-3.5 w-3.5 text-primary" />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-3 min-w-[210px] text-popover-foreground">
              <div className="text-[11px] font-semibold text-foreground mb-2">Text Colour</div>
              <div className="grid grid-cols-6 gap-1.5">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onMouseDown={(e) => { e.preventDefault(); applyColor(color); }}
                    className="h-6 w-6 rounded-full border border-border/60 hover:scale-115 transition-transform cursor-pointer shadow-xs"
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
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowHighlights((v) => !v); setShowColors(false); setShowFontSize(false); setShowHeadings(false); }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary/70 transition-colors cursor-pointer"
          >
            <Highlighter className="h-3.5 w-3.5 text-warning" />
          </button>
          {showHighlights && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-popover shadow-2xl p-3 min-w-[210px] text-popover-foreground">
              <div className="text-[11px] font-semibold text-foreground mb-2">Highlight Colour</div>
              <div className="flex flex-wrap gap-1.5">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color === "transparent" ? "Remove highlight" : color}
                    onMouseDown={(e) => { e.preventDefault(); applyHighlight(color); }}
                    className="h-6 w-6 rounded-full border border-border/60 hover:scale-115 transition-transform cursor-pointer shadow-xs"
                    style={{ background: color === "transparent" ? "repeating-linear-gradient(-45deg,#999,#999 2px,#fff 2px,#fff 6px)" : color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* Alignment */}
        <TBtn title="Align left" onClick={() => exec("justifyLeft")}><AlignLeft className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Align centre" onClick={() => exec("justifyCenter")}><AlignCenter className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Align right" onClick={() => exec("justifyRight")}><AlignRight className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Justify" onClick={() => exec("justifyFull")}><AlignJustify className="h-3.5 w-3.5" /></TBtn>

        <Divider />

        {/* Lists */}
        <TBtn title="Bullet list" onClick={() => exec("insertUnorderedList")} active={activeFormats.has("ul")}><List className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Numbered list" onClick={() => exec("insertOrderedList")} active={activeFormats.has("ol")}><ListOrdered className="h-3.5 w-3.5" /></TBtn>

        <Divider />

        {/* Image upload / Copy-paste */}
        <TBtn title="Insert Image" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-3.5 w-3.5 text-primary" /></TBtn>
        <TBtn title="Inline code" onClick={insertCode}><Code className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Horizontal rule" onClick={insertHR}><Minus className="h-3.5 w-3.5" /></TBtn>
      </div>

      {/* ── Document Paper Editable Area ── */}
      <div className="p-4 sm:p-6 bg-secondary/10 overflow-y-auto max-h-[65vh] relative z-10">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onBlur={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              document.execCommand("insertText", false, "\u00a0\u00a0\u00a0\u00a0");
              handleInput();
            }
          }}
          className="outline-none p-6 sm:p-10 text-sm leading-relaxed prose-rte bg-card text-card-foreground rounded-xl border border-border shadow-sm max-w-none mx-auto min-h-[380px]"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      </div>

      <style>{`
        .prose-rte:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .prose-rte h1 { font-size: 1.85rem; font-weight: 700; margin: 0.8em 0 0.4em; line-height: 1.25; }
        .prose-rte h2 { font-size: 1.45rem; font-weight: 600; margin: 0.7em 0 0.35em; line-height: 1.3; }
        .prose-rte h3 { font-size: 1.2rem; font-weight: 600; margin: 0.6em 0 0.3em; }
        .prose-rte p { margin: 0.5em 0; line-height: 1.6; }
        .prose-rte ul { list-style-type: disc; padding-left: 1.5em; margin: 0.6em 0; }
        .prose-rte ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.6em 0; }
        .prose-rte li { margin: 0.25em 0; }
        .prose-rte code { background: rgba(99,102,241,0.15); color: #818cf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .prose-rte hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.2em 0; }
        .prose-rte a { color: hsl(var(--primary)); text-decoration: underline; }
        .prose-rte strong { font-weight: 700; }
        .prose-rte em { font-style: italic; }
        .prose-rte s { text-decoration: line-through; }
        .prose-rte u { text-decoration: underline; }
        .prose-rte img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block; }
      `}</style>
    </div>
  );
}
