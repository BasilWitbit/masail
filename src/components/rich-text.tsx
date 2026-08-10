import { sanitizeRichText } from "@/lib/sanitize-html";

/** Renders sanitized rich-text HTML produced by the answer editor. */
export function RichText({
  html,
  className = "",
}: {
  html: string | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={`rich-text font-body ${className}`}
      // Content is sanitized with DOMPurify (allow-list: b/i/u/span[style] only).
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
