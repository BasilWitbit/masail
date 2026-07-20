import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, BookOpen, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformTheme } from "@/lib/use-platform-theme";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/qa/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Q&A — Masail" },
      {
        name: "description",
        content: "Read a verified answer from a local scholar on Masail.",
      },
      { property: "og:title", content: "Q&A — Masail" },
      {
        property: "og:description",
        content: "A verified answer from a local scholar.",
      },
    ],
  }),
  component: QADetailPage,
});

type QADetail = {
  id: string;
  generic_question: string;
  generic_answer: string;
  category_id: string | null;
  mosque_id: string | null;
  created_at: string;
  categories: { name: string }[] | null;
  mosques: { name: string }[] | null;
};

function QADetailPage() {
  usePlatformTheme();
  const { id } = Route.useParams();
  const [qa, setQa] = useState<QADetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("published_qa")
        .select(
          "id, generic_question, generic_answer, category_id, mosque_id, created_at, categories (name), mosques (name)"
        )
        .eq("id", id)
        .single();

      if (!active) return;
      if (!error && data) {
        setQa(data as QADetail);
      } else {
        setQa(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader active="qa" />

      <main className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <Link
          to="/qa"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Q&A Library
        </Link>

        {loading ? (
          <div className="mt-8 h-96 animate-pulse rounded-3xl bg-muted/60" />
        ) : !qa ? (
          <NotFound />
        ) : (
          const categoryName = qa.categories?.[0]?.name ?? null;
          const mosqueName = qa.mosques?.[0]?.name ?? null;

          return (
            <div className="mt-8 space-y-8">
              {/* Question card */}
              <article className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
                <div className="flex flex-wrap items-center gap-3">
                  {categoryName ? (
                    <span
                      className="inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold"
                      style={{
                        background: "color-mix(in oklab, var(--secondary) 22%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      {categoryName}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(qa.created_at)}
                  </span>
                </div>

                <h1 className="mt-6 font-heading text-3xl font-bold leading-tight text-primary md:text-4xl">
                  {qa.generic_question}
                </h1>

                {mosqueName ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Answered via{" "}
                    <span className="font-medium text-foreground">
                      {mosqueName}
                    </span>
                  </p>
                ) : null}

              <div className="mt-8 border-t border-border pt-8">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
                  <BookOpen className="h-4 w-4" />
                  Answer
                </div>
                <div className="text-lg leading-relaxed text-foreground">
                  <p className="whitespace-pre-wrap">{qa.generic_answer}</p>
                </div>
              </div>
            </article>

            {/* Disclaimer */}
            <div
              className="rounded-3xl border p-6 md:p-8"
              style={{
                background: "color-mix(in oklab, var(--secondary) 10%, #ffffff)",
                borderColor: "color-mix(in oklab, var(--secondary) 30%, transparent)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "color-mix(in oklab, var(--primary) 8%, transparent)",
                  }}
                >
                  <Info className="h-5 w-5" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-primary">
                    Religious guidance disclaimer
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    This answer is provided for general guidance. Rulings may vary depending on
                    context, madhhab (school of thought), and individual circumstances. For
                    matters specific to your situation, please consult your local mosque or a
                    qualified scholar directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mt-10 rounded-3xl border border-border bg-muted/40 p-12 text-center">
      <h2 className="font-heading text-2xl font-bold text-primary">Question not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The question you are looking for does not exist or has been removed.
      </p>
      <Link
        to="/qa"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
      >
        Back to Q&A Library
      </Link>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
