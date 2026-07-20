import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, FileText, BookOpen, CheckCircle2, Facebook, Instagram, Youtube } from "lucide-react";
import { usePlatformTheme } from "@/lib/use-platform-theme";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  usePlatformTheme();
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader active="home" />


      {/* Hero */}
      <section className="relative overflow-hidden bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.12] md:block"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 40%, var(--primary) 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "color-mix(in oklab, var(--secondary) 20%, transparent)",
                color: "var(--primary)",
              }}
            >
              Sakinah · Ihtiram
            </span>
            <h1 className="mt-6 font-heading text-5xl font-bold leading-[1.1] text-primary md:text-6xl">
              Seek Guidance from
              <br /> Your Local Scholars
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Connect directly with verified Imams and scholars from your community.
              Get reliable, faithful answers to your questions in a serene and
              confidential environment.
            </p>

            {/* Search bar */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
            >
              <div className="flex flex-1 items-center gap-3 px-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the public Q&A library…"
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

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
                Ask a Question
              </button>
              <button className="rounded-lg border-2 border-primary bg-transparent px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5">
                Browse Q&A
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Divider ornament */}
      <div className="flex items-center justify-center py-16">
        <div className="h-px w-24 bg-border" />
        <div
          className="mx-4 h-4 w-4 rotate-45"
          style={{ background: "var(--secondary)" }}
        />
        <div className="h-px w-24 bg-border" />
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center">
          <h2 className="font-heading text-4xl font-bold text-primary">How Masail Works</h2>
          <p className="mt-3 text-muted-foreground">
            A simple, respectful process for spiritual guidance.
          </p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          <Step
            n={1}
            icon={<FileText className="h-8 w-8" style={{ color: "var(--primary)" }} />}
            title="Submit Question"
            body="Write your question clearly. You can choose to remain anonymous or direct it to a specific local scholar."
          />
          <Step
            n={2}
            icon={<BookOpen className="h-8 w-8" style={{ color: "var(--primary)" }} />}
            title="Scholar Reviews"
            body="A verified local scholar receives your question, researches it if necessary, and prepares a grounded response."
          />
          <Step
            n={3}
            icon={<CheckCircle2 className="h-8 w-8" style={{ color: "var(--primary)" }} />}
            title="Receive Answer"
            body="Get notified when your detailed, verified answer is ready. Learn and grow in your faith with confidence."
          />
        </div>
      </section>

      {/* CTA card */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl bg-muted px-8 py-14 text-center">
          <h3 className="font-heading text-3xl font-bold text-primary">Have a question?</h3>
          <p className="mt-2 text-muted-foreground">Our scholars are here to help.</p>
          <button className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
            Ask a Question
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
          <div>
            <div className="font-heading text-2xl font-bold text-primary">Masail</div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Connecting communities with trusted Islamic knowledge.
            </p>
            <div className="mt-5 flex gap-3">
              <SocialIcon><Facebook className="h-4 w-4" /></SocialIcon>
              <SocialIcon><Instagram className="h-4 w-4" /></SocialIcon>
              <SocialIcon><Youtube className="h-4 w-4" /></SocialIcon>
            </div>
          </div>
          <FooterCol title="Platform" items={["Public Q&A", "Ask a Question", "Scholars"]} />
          <FooterCol title="Resources" items={["Guidelines", "Help Center"]} />
          <FooterCol title="Legal" items={["Privacy Policy", "Terms of Use"]} />
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Masail. All rights reserved.
        </div>
      </footer>
    </div>
  );
}




function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="mt-6 font-heading text-lg font-bold text-foreground">
        <span style={{ color: "var(--secondary)" }}>{n}.</span> {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function SocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-80"
    >
      {children}
    </a>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-bold text-foreground">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>
            <a href="#" className="hover:text-primary">
              {i}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
