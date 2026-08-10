import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Palette } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize-html";

const SWATCHES = [
  { name: "Default", value: "inherit" },
  { name: "Ink", value: "#111827" },
  { name: "Slate", value: "#475569" },
  { name: "Green", value: "#0F5C4D" },
  { name: "Gold", value: "#8A6D1F" },
  { name: "Red", value: "#B91C1C" },
  { name: "Blue", value: "#1D4ED8" },
];

/**
 * Minimal rich text editor (bold / italic / underline / text color) that
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
  const [colorOpen, setColorOpen] = useState(false);
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

  useEffect(() => {
    if (!colorOpen) return;
    const close = () => setColorOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [colorOpen]);

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
        <div className="relative">
          <ToolbarButton
            label="Text color"
            onClick={(e) => {
              e.stopPropagation();
              setColorOpen((o) => !o);
            }}
          >
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          {colorOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-full z-30 mt-1 flex w-44 flex-wrap gap-1.5 rounded-lg border border-border bg-card p-2 shadow-lg"
            >
              {SWATCHES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  title={s.name}
                  aria-label={s.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec("foreColor", s.value === "inherit" ? "#111827" : s.value);
                    setColorOpen(false);
                  }}
                  className="h-6 w-6 rounded-lg border border-border"
                  style={{ background: s.value === "inherit" ? "#111827" : s.value }}
                />
              ))}
            </div>
          )}
        </div>
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
