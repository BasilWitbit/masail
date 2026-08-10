import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "span",
  "br",
  "p",
  "div",
];

/**
 * Sanitizes rich-text HTML (bold / italic / underline / text color) before
 * rendering. Falls back to a conservative tag-stripping pass during SSR where
 * no DOM is available for DOMPurify.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined" || !("document" in globalThis)) {
    return html.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (match, tag: string) =>
      ALLOWED_TAGS.includes(tag.toLowerCase()) ? match.replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "") : "",
    );
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["style"],
    ALLOWED_URI_REGEXP: /^$/,
  });
}

/** Plain-text projection of rich-text HTML, for previews and truncation. */
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
