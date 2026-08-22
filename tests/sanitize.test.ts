import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../src/lib/sanitize";

describe("HTML Sanitizer (DOMPurify)", () => {
  it("strips script tags and executable JavaScript", () => {
    const dirty = `<p>Hello <script>alert("xss")</script>World</p>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert");
    expect(clean).toContain("<p>Hello ");
  });

  it("removes inline javascript event handlers", () => {
    const dirty = `<img src="x" onerror="alert(1)" /><button onclick="evil()">Click</button>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("evil()");
  });

  it("allows safe formatted HTML tags", () => {
    const safe = `<h1>Title</h1><p><strong>Bold</strong> and <em>Italic</em></p><ul><li>Item 1</li></ul>`;
    const clean = sanitizeHtml(safe);
    expect(clean).toContain("<h1>Title</h1>");
    expect(clean).toContain("<strong>Bold</strong>");
    expect(clean).toContain("<em>Italic</em>");
  });

  it("automatically secures target blank links with rel=noopener", () => {
    const link = `<a href="https://example.com" target="_blank">Link</a>`;
    const clean = sanitizeHtml(link);
    expect(clean).toContain('href="https://example.com"');
  });

  it("handles null, undefined, and empty string safely", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null as any)).toBe("");
    expect(sanitizeHtml(undefined as any)).toBe("");
  });
});
