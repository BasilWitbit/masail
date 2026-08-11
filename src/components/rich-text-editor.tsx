import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize-html";

/**
 * Minimal rich text editor (bold / italic / underline / bullet list) that
 * outputs HTML. Deliberately dependency-free (contentEditable + execCommand)
 * to stay lightweight and React 19 / SSR safe.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here…",
  minHeight = 220,
  ariaLabel = "Rich text editor",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [empty, setEmpty] = useState(true);

  // Load the incoming HTML once (and whenever it diverges from an external reset).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = sanitizeRichText(value);
    if (el.innerHTML !== next) el.innerHTML = next;
    setEmpty(!el.textContent?.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    const el = ref.current;
    if (!el) return;
    setEmpty(!el.textContent?.trim());
    onChange(el.innerHTML === "<br>" ? "" : el.innerHTML);
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }

  return (
    <div className="rounded-lg border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div className="relative">
        {empty && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          style={{ minHeight }}
          className="rich-text w-full px-3 py-2 font-body text-sm leading-relaxed outline-none"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
