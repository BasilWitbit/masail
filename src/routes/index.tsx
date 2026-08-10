import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, FileText, BookOpen, CheckCircle2, Facebook, Instagram, Youtube } from "lucide-react";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";
import { SiteHeader } from "@/components/site-header";
import { HeroIllustration } from "@/components/hero-illustration";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { ready: themeReady } = usePlatformThemeGate();
  const [query, setQuery] = useState("");

  if (!themeReady) return <ThemeLoadingScreen />;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader active="home" />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-surface">
        {/* Right-hand mihrab arch with embossed geometric texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[72%] opacity-35 sm:w-[62%] sm:opacity-50 md:w-[52%] md:opacity-80 lg:w-[46%]"
        >
          <HeroIllustration />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 md:py-32 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)] lg:py-40">
          <div className="max-w-3xl animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <span
              className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{
                background: "color-mix(in oklab, var(--secondary) 22%, transparent)",
                color: "var(--primary)",
              }}
            >
              Sakinah · Ihtiram
            </span>
            <h1 className="mt-8 font-heading text-4xl font-bold leading-[1.08] text-primary sm:text-5xl md:text-6xl">
              Seek Guidance from
              <br /> Your Local Scholars
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Connect directly with verified Imams and scholars from your community. Get reliable, faithful answers to
              your questions in a serene and confidential environment.
            </p>

            <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <Link to="/login">
                <button className="rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110">
                  Ask a Question
                </button>
              </Link>
              <Link to="/login">
                <button className="rounded-lg border-2 border-primary bg-transparent px-7 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary/5">
                  Browse Q&A
                </button>
              </Link>

            </div>
          </div>

          <div aria-hidden className="hidden lg:block" />
        </div>
      </section>


      {/* Divider ornament */}
      <div className="flex items-center justify-center py-16">
        <div className="h-px w-24 bg-border" />
        <div className="mx-4 h-4 w-4 rotate-45" style={{ background: "var(--secondary)" }} />
        <div className="h-px w-24 bg-border" />
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center">
          <h2 className="font-heading text-4xl font-bold text-primary">How Masail Works</h2>
          <p className="mt-3 text-muted-foreground">A simple, respectful process for spiritual guidance.</p>
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
              <SocialIcon>
                <Facebook className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon>
                <Instagram className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon>
                <Youtube className="h-4 w-4" />
              </SocialIcon>
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

function Step({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">{icon}</div>
      <h3 className="mt-6 font-heading text-lg font-bold text-foreground">
        <span style={{ color: "var(--secondary)" }}>{n}.</span> {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
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
