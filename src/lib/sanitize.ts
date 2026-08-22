import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "wbr",
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "style",
  "width",
  "height",
  "target",
  "rel",
  "colspan",
  "rowspan",
  "start",
  "type",
  "align",
];

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target"],
  });
}

export function formatReadingHtml(content?: string | null): string {
  if (!content || typeof content !== "string" || !content.trim()) {
    return "<p class='text-muted-foreground'>No content added yet.</p>";
  }

  const trimmed = content.trim();
  const hasHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  if (hasHtml) {
    return sanitizeHtml(trimmed);
  }

  // Convert plain multiline text & points into formatted HTML
  const lines = trimmed.split(/\r?\n/);
  let result = "";
  let inUl = false;
  let inOl = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inUl) {
        result += "</ul>";
        inUl = false;
      }
      if (inOl) {
        result += "</ol>";
        inOl = false;
      }
      result += "<p><br></p>";
      continue;
    }

    // Bullet point: •, -, *, +
    if (/^[•\-\*\+]\s+/.test(line)) {
      if (inOl) {
        result += "</ol>";
        inOl = false;
      }
      if (!inUl) {
        result += "<ul style='list-style-type: disc; padding-left: 1.6em; margin: 0.6em 0;'>";
        inUl = true;
      }
      const text = line.replace(/^[•\-\*\+]\s+/, "");
      result += `<li style='margin: 0.3em 0;'>${text}</li>`;
      continue;
    }

    // Numbered list: 1., 2., etc.
    if (/^\d+[\.\)]\s+/.test(line)) {
      if (inUl) {
        result += "</ul>";
        inUl = false;
      }
      if (!inOl) {
        result += "<ol style='list-style-type: decimal; padding-left: 1.6em; margin: 0.6em 0;'>";
        inOl = true;
      }
      const text = line.replace(/^\d+[\.\)]\s+/, "");
      result += `<li style='margin: 0.3em 0;'>${text}</li>`;
      continue;
    }

    // Blockquote: > quote
    if (line.startsWith("> ")) {
      if (inUl) {
        result += "</ul>";
        inUl = false;
      }
      if (inOl) {
        result += "</ol>";
        inOl = false;
      }
      result += `<blockquote style='border-left: 3px solid #6366f1; padding-left: 1em; margin: 0.8em 0; color: #a1a1aa;'>${line.slice(2)}</blockquote>`;
      continue;
    }

    // Normal paragraph
    if (inUl) {
      result += "</ul>";
      inUl = false;
    }
    if (inOl) {
      result += "</ol>";
      inOl = false;
    }
    result += `<p style='margin: 0.5em 0; line-height: 1.65;'>${line}</p>`;
  }

  if (inUl) result += "</ul>";
  if (inOl) result += "</ol>";

  return sanitizeHtml(result);
}
