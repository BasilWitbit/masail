import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

const MARGIN_RE = /^(m[trblxy]?|mt|mb|ml|mr|mx|my)-/;

function splitMarginClasses(className?: string) {
  const tokens = (className ?? "").split(/\s+/).filter(Boolean);
  const margin: string[] = [];
  const rest: string[] = [];
  for (const token of tokens) {
    if (MARGIN_RE.test(token)) margin.push(token);
    else rest.push(token);
  }
  return { margin: margin.join(" "), rest: rest.join(" ") };
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const { margin, rest } = splitMarginClasses(className);

    return (
      <div className={cn("relative", margin)}>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(rest, "pr-10")}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
