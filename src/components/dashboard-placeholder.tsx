import { Sparkles } from "lucide-react";

export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">{title}</h1>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-16 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
        >
          <Sparkles className="h-6 w-6" style={{ color: "var(--primary)" }} />
        </div>
        <h2 className="mt-5 font-heading text-xl font-bold text-primary">Coming soon</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
