// Lightweight, resilient HTML sanitizer for rich text rendering & XSS prevention

const ALLOWED_TAGS = new Set([
  "a", "abbr", "b", "bdi", "bdo", "blockquote", "br", "caption", "cite", "code", "col", "colgroup",
  "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3",
  "h4", "h5", "h6", "hr", "i", "img", "ins", "kbd", "li", "mark", "ol", "p", "pre", "q", "rp", "rt",
  "ruby", "s", "samp", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "time", "tr", "u", "ul", "var", "wbr"
]);

const ALLOWED_ATTRS = new Set([
  "href", "src", "alt", "title", "class", "style", "width", "height", "target", "rel",
  "colspan", "rowspan", "start", "type", "align"
]);

export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  // 1. Remove dangerous script and iframe elements and their content
  let clean = dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");

  // 2. Remove inline event handlers (onerror=, onload=, onclick=, etc.)
  clean = clean.replace(/\son[a-zA-Z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, "");

  // 3. Remove javascript: and data: pseudo-protocols in links/sources (allow data:image for images)
  clean = clean.replace(/href\s*=\s*(['"]?)\s*javascript:[^'">]*\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"]?)\s*javascript:[^'">]*\1/gi, 'src=""');

  // 4. Strip out disallowed tags while keeping permitted HTML
  clean = clean.replace(/<\/?([a-zA-Z0-9_-]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return "";
    }

    const isClosing = match.startsWith("</");
    if (isClosing) {
      return `</${lowerTag}>`;
    }

    // Clean attributes for opening tags
    const sanitizedAttrs: string[] = [];
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s>]+)))?/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      let attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      if (ALLOWED_ATTRS.has(attrName)) {
        // Prevent javascript: in style or attributes
        if (attrVal.toLowerCase().includes("javascript:") || attrVal.toLowerCase().includes("expression(")) {
          continue;
        }

        // Auto-add rel="noopener noreferrer" for external target="_blank" links
        if (attrName === "target" && attrVal === "_blank") {
          sanitizedAttrs.push('target="_blank" rel="noopener noreferrer"');
          continue;
        }

        sanitizedAttrs.push(`${attrName}="${attrVal.replace(/"/g, "&quot;")}"`);
      }
    }

    const attrString = sanitizedAttrs.length > 0 ? " " + sanitizedAttrs.join(" ") : "";
    return `<${lowerTag}${attrString}>`;
  });

  return clean;
}
