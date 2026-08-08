import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Code, Minus, Undo2, Redo2, Palette, Highlighter,
  Type,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cmd(command: string, value?: string) {
  document.execCommand(command, false, value);
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];

const TEXT_COLORS = [
  "#ffffff", "#f43f5e", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#1e293b", "#000000",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#f5d0fe", "#fed7aa",
  "#fecaca", "transparent",
];

// ─── Toolbar button ────────────────────────────────────────────────────────────

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
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors text-sm
        ${active
          ? "bg-primary/20 text-primary"
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

// ─── Main Component ────────────────────────────────────────────────────────────

export function RichTextEditor({ value, onChange, placeholder = "Write your content here…", minHeight = 280 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showColors, setShowColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const savedRange = useRef<Range | null>(null);

  // Sync external value → DOM (only on mount / when value changes from outside)
  const lastHtml = useRef<string>(value);
  useEffect(() => {
    if (editorRef.current && value !== lastHtml.current) {
      editorRef.current.innerHTML = value;
      lastHtml.current = value;
    }
  }, [value]);

  // Save selection before dropdown opens (execCommand needs it)
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  // Re-check active formats on every selection change
  const refreshFormats = useCallback(() => {
    const active = new Set<string>();
    if (document.queryCommandState("bold")) active.add("bold");
    if (document.queryCommandState("italic")) active.add("italic");
    if (document.queryCommandState("underline")) active.add("underline");
    if (document.queryCommandState("strikeThrough")) active.add("strikeThrough");
    if (document.queryCommandState("insertOrderedList")) active.add("ol");
    if (document.queryCommandState("insertUnorderedList")) active.add("ul");
    const just = document.queryCommandValue("justifyLeft") === "true" ? "justifyLeft"
               : document.queryCommandValue("justifyCenter") === "true" ? "justifyCenter"
               : document.queryCommandValue("justifyRight") === "true" ? "justifyRight"
               : document.queryCommandValue("justifyFull") === "true" ? "justifyFull"
               : "justifyLeft";
    active.add(just);
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

  // Insert heading via formatBlock
  const insertHeading = (level: "h1" | "h2" | "h3" | "p") => {
    restoreSelection();
    cmd("formatBlock", level);
    editorRef.current?.focus();
    setShowHeadings(false);
    handleInput();
  };

  const applyFontSize = (size: string) => {
    restoreSelection();
    // execCommand fontSize only accepts 1-7; use a workaround with inline styles
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setShowFontSize(false); return; }
    const range = sel.getRangeAt(0);
    if (range.collapsed) { setShowFontSize(false); return; }
    const span = document.createElement("span");
    span.style.fontSize = size;
    range.surroundContents(span);
    setShowFontSize(false);
    handleInput();
  };

  const applyColor = (color: string) => {
    restoreSelection();
    cmd("foreColor", color);
    editorRef.current?.focus();
    setShowColors(false);
    handleInput();
  };

  const applyHighlight = (color: string) => {
    restoreSelection();
    if (color === "transparent") {
      cmd("hiliteColor", "transparent");
    } else {
      cmd("hiliteColor", color);
    }
    editorRef.current?.focus();
    setShowHighlights(false);
    handleInput();
  };

  const insertHR = () => {
    restoreSelection();
    cmd("insertHorizontalRule");
    editorRef.current?.focus();
    handleInput();
  };

  const insertCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const code = document.createElement("code");
    code.style.cssText = "background:rgba(99,102,241,0.15);color:#818cf8;padding:0 4px;border-radius:4px;font-family:monospace;font-size:0.875em";
    if (!range.collapsed) {
      code.appendChild(range.extractContents());
    } else {
      code.textContent = "code";
    }
    range.insertNode(code);
    sel.collapse(code, code.childNodes.length);
    handleInput();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = () => { setShowColors(false); setShowHighlights(false); setShowFontSize(false); setShowHeadings(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-secondary/20 focus-within:border-primary/50 transition-colors">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-secondary/40 px-2 py-1.5">

        {/* Undo / Redo */}
        <TBtn title="Undo (Ctrl+Z)" onClick={() => { cmd("undo"); handleInput(); }}><Undo2 className="h-3.5 w-3.5" /></TBtn>
        <TBtn title="Redo (Ctrl+Y)" onClick={() => { cmd("redo"); handleInput(); }}><Redo2 className="h-3.5 w-3.5" /></TBtn>

        <Divider />

        {/* Headings dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Heading"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowHeadings((v) => !v); setShowColors(false); setShowHighlights(false); setShowFontSize(false); }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Type className="h-3.5 w-3.5" />
            <span className="text-[10px]">▾</span>
          </button>
          {showHeadings && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl p-1 min-w-[140px]">
              {(["h1", "h2", "h3", "p"] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertHeading(tag); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-secondary/70 transition-colors text-left"
                >
                  {tag === "h1" && <Heading1 className="h-4 w-4 text-primary" />}
                  {tag === "h2" && <Heading2 className="h-4 w-4 text-primary" />}
                  {tag === "h3" && <Heading3 className="h-4 w-4 text-primary" />}
                  {tag === "p" && <span className="h-4 w-4 text-center text-muted-foreground text-xs font-mono">¶</span>}
                  <span className="text-sm">{tag === "p" ? "Paragraph" : tag.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Font size"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontSize((v) => !v); setShowColors(false); setShowHighlights(false); setShowHeadings(false); }}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xs font-medium">Aa</span>
            <span className="text-[10px]">▾</span>
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl p-1 min-w-[120px] max-h-60 overflow-y-auto">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFontSize(size); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 hover:bg-secondary/70 transition-colors"
                  style={{ fontSize: size }}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Bold / Italic / Underline / Strikethrough */}
        <TBtn title="Bold (Ctrl+B)" onClick={() => { cmd("bold"); handleInput(); }} active={activeFormats.has("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Italic (Ctrl+I)" onClick={() => { cmd("italic"); handleInput(); }} active={activeFormats.has("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Underline (Ctrl+U)" onClick={() => { cmd("underline"); handleInput(); }} active={activeFormats.has("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Strikethrough" onClick={() => { cmd("strikeThrough"); handleInput(); }} active={activeFormats.has("strikeThrough")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Text colour */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Text colour"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowColors((v) => !v); setShowHighlights(false); setShowFontSize(false); setShowHeadings(false); }}
            className="flex h-7 w-7 flex-col items-center justify-center rounded-md hover:bg-secondary/70 transition-colors"
          >
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl p-2">
              <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">Text colour</div>
              <div className="grid grid-cols-6 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onMouseDown={(e) => { e.preventDefault(); applyColor(color); }}
                    className="h-5 w-5 rounded-md border border-border/60 hover:scale-110 transition-transform"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Highlight"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowHighlights((v) => !v); setShowColors(false); setShowFontSize(false); setShowHeadings(false); }}
            className="flex h-7 w-7 flex-col items-center justify-center rounded-md hover:bg-secondary/70 transition-colors"
          >
            <Highlighter className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {showHighlights && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl p-2">
              <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">Highlight</div>
              <div className="flex gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color === "transparent" ? "Remove highlight" : color}
                    onMouseDown={(e) => { e.preventDefault(); applyHighlight(color); }}
                    className="h-5 w-5 rounded-md border border-border/60 hover:scale-110 transition-transform"
                    style={{ background: color === "transparent" ? "repeating-linear-gradient(-45deg,#999,#999 2px,#fff 2px,#fff 6px)" : color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* Alignments */}
        <TBtn title="Align left" onClick={() => { cmd("justifyLeft"); handleInput(); }} active={activeFormats.has("justifyLeft")}>
          <AlignLeft className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Align centre" onClick={() => { cmd("justifyCenter"); handleInput(); }} active={activeFormats.has("justifyCenter")}>
          <AlignCenter className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Align right" onClick={() => { cmd("justifyRight"); handleInput(); }} active={activeFormats.has("justifyRight")}>
          <AlignRight className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Justify" onClick={() => { cmd("justifyFull"); handleInput(); }} active={activeFormats.has("justifyFull")}>
          <AlignJustify className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Lists */}
        <TBtn title="Bullet list" onClick={() => { cmd("insertUnorderedList"); handleInput(); }} active={activeFormats.has("ul")}>
          <List className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Numbered list" onClick={() => { cmd("insertOrderedList"); handleInput(); }} active={activeFormats.has("ol")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Code & HR */}
        <TBtn title="Inline code" onClick={insertCode}>
          <Code className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn title="Horizontal rule" onClick={insertHR}>
          <Minus className="h-3.5 w-3.5" />
        </TBtn>
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(e) => {
          // Ctrl+B, I, U shortcuts are native; just sync after
          if (e.key === "Tab") { e.preventDefault(); cmd("insertText", "\u00a0\u00a0\u00a0\u00a0"); handleInput(); }
        }}
        className="outline-none px-4 py-3 text-sm leading-relaxed prose-rte"
        style={{
          minHeight,
          whiteSpace: "pre-wrap",
          overflowY: "auto",
          maxHeight: "60vh",
        }}
        data-placeholder={placeholder}
      />

      {/* Prose styles injected via a <style> tag */}
      <style>{`
        .prose-rte:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .prose-rte h1 { font-size: 1.75rem; font-weight: 700; margin: 0.75em 0 0.4em; line-height: 1.2; }
        .prose-rte h2 { font-size: 1.35rem; font-weight: 600; margin: 0.7em 0 0.35em; line-height: 1.3; }
        .prose-rte h3 { font-size: 1.1rem; font-weight: 600; margin: 0.6em 0 0.3em; }
        .prose-rte p { margin: 0.4em 0; }
        .prose-rte ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
        .prose-rte ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
        .prose-rte li { margin: 0.2em 0; }
        .prose-rte code { background: rgba(99,102,241,0.15); color: #818cf8; padding: 0 4px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
        .prose-rte hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1em 0; }
        .prose-rte a { color: hsl(var(--primary)); text-decoration: underline; }
        .prose-rte strong { font-weight: 700; }
        .prose-rte em { font-style: italic; }
        .prose-rte s { text-decoration: line-through; }
        .prose-rte u { text-decoration: underline; }
      `}</style>
    </div>
  );
}
