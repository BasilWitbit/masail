import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Calendar, ArrowRight, ArrowLeft, Inbox, BookOpen, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; name: string };
type QA = {
  id: string;
  generic_question: string;
  generic_answer: string;
  category_id: string | null;
  mosque_id: string | null;
  created_at: string;
};

export function QALibraryPanel({
  variant = "public",
}: {
  variant?: "public" | "embedded";
}) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<QA[] | null>(null);
  const [selectedQA, setSelectedQA] = useState<QA | null>(null);


  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: cats }, { data: qa }] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase
          .from("published_qa")
          .select("id, generic_question, generic_answer, category_id, mosque_id, created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setCategories((cats as Category[]) ?? []);
      setItems((qa as QA[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const catName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [categories]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat !== "all" && i.category_id !== activeCat) return false;
      if (q && !i.generic_question.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, activeCat]);

  const isEmbedded = variant === "embedded";

  return (
    <div>
      {isEmbedded ? (
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            Q&A Library
          </h1>
          <p className="mt-2 text-muted-foreground">
            Search verified answers from local scholars.
          </p>
        </div>
      ) : (
        <section className="bg-surface">
          <div className="mx-auto max-w-6xl px-6 pb-14 pt-16">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "color-mix(in oklab, var(--secondary) 20%, transparent)",
                color: "var(--primary)",
              }}
            >
              Public Library
            </span>
            <h1 className="mt-5 font-heading text-4xl font-bold text-primary md:text-5xl">
              Explore Verified Q&A
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Search a growing collection of questions answered by trusted local scholars.
            </p>
          </div>
        </section>
      )}

      <div className={isEmbedded ? "" : "mx-auto max-w-6xl px-6"}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
        >
          <div className="flex flex-1 items-center gap-3 px-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="w-full bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Pill active={activeCat === "all"} onClick={() => setActiveCat("all")}>
            All
          </Pill>
          {categories.map((c) => (
            <Pill
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </Pill>
          ))}
        </div>

        <div className="mt-8 pb-12">
          {filtered === null ? (
            <ResultsSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState hasFilters={query.length > 0 || activeCat !== "all"} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((qa) => (
                <QACard key={qa.id} qa={qa} categoryName={catName(qa.category_id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function QACard({ qa, categoryName }: { qa: QA; categoryName: string | null }) {
  return (
    <Link
      to="/qa/$id"
      params={{ id: qa.id }}
      className="group flex h-full flex-col justify-between rounded-lg border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          {categoryName ? (
            <span
              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{
                background: "color-mix(in oklab, var(--secondary) 22%, transparent)",
                color: "var(--primary)",
              }}
            >
              {categoryName}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(qa.created_at)}
          </span>
        </div>
        <h3 className="mt-4 font-heading text-lg font-semibold leading-snug text-foreground">
          {truncate(qa.generic_question, 140)}
        </h3>
      </div>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:gap-3">
        Read answer <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-muted/60" />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-16 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
      >
        <Inbox className="h-6 w-6" style={{ color: "var(--primary)" }} />
      </div>
      <h3 className="mt-5 font-heading text-xl font-bold text-primary">
        {hasFilters ? "No matching questions" : "Nothing published yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Try a different keyword or clear the category filter."
          : "No questions have been published yet — check back soon."}
      </p>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

function formatDate(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
