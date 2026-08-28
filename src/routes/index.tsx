import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  ChevronDown,
  BookOpen,
  Shield,
  Users,
} from "lucide-react";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { ready: themeReady } = usePlatformThemeGate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!themeReady) return <ThemeLoadingScreen />;

  return (
    <div
      className="min-h-screen font-sans selection:bg-[#DBEAFE] selection:text-[#0F172A]"
      style={{ backgroundColor: "#F8FAFC", color: "#0F172A" }}
    >
      <LandingHeader />

      <main>
        {/* Hero Section */}
        <section
          id="hero"
          className="relative overflow-hidden min-h-screen pt-32 px-6 flex items-center justify-center"
        >
          {/* Background image */}
          <img
            src="/bg2.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-70  pointer-events-none"
          />

          {/* Soft gradient wash */}
          <div className="absolute -top-[30%] -left-[15%] w-[60%] h-[70%] rounded-full bg-[#DBEAFE]/60 blur-[110px]" />
          <div className="absolute -top-[20%] -right-[15%] w-[55%] h-[65%] rounded-full bg-[#93C5FD]/35 blur-[110px]" />

          {/* Subtle dot-grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #93C5FD 1.4px, transparent 1.6px)",
              backgroundSize: "28px 28px",
              opacity: 0.4,
              WebkitMaskImage:
                "radial-gradient(ellipse 60% 50% at 50% 35%, black, transparent 90%)",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 35%, black, transparent 90%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <span
              className="animate-fade-up inline-block rounded-full bg-[#DBEAFE] px-4 py-1.5 text-sm font-semibold text-[#2563EB] mb-6"
              style={{ animationDelay: "0.1s" }}
            >
              Private • Verified • Local
            </span>
            <h1
              className="animate-fade-up text-5xl md:text-7xl font-extrabold tracking-tight text-[#0F172A] leading-tight mb-8"
              style={{ animationDelay: "0.2s" }}
            >
              Reliable Islamic Guidance, <br className="hidden md:block" /> Rooted in Your Community
            </h1>
            <p
              className="animate-fade-up mx-auto max-w-2xl text-lg md:text-xl text-[#64748B] mb-10 leading-relaxed"
              style={{ animationDelay: "0.3s" }}
            >
              Connect privately with verified local scholars to find answers to your questions. A
              serene, secure platform for faithful guidance.
            </p>
            <div
              className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ animationDelay: "0.4s" }}
            >
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium shadow-lg shadow-[#2563EB]/25 transition-all text-center"
              >
                Ask a Question
              </Link>
            </div>
          </div>
        </section>

        {/* About Us */}
        <section id="about" className="py-24 px-6 bg-white border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-[#DBEAFE] px-4 py-1.5 text-sm font-semibold text-[#2563EB] mb-6">
              Why Masail Matters
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-6">
              Every Muslim Has Questions <br className="hidden md:block" /> Authentic Guidance
              Shouldn't Be Hard to Find
            </h2>
            <p className="text-lg text-[#64748B] leading-relaxed mb-10">
              Many Muslims rely on anonymous forums with conflicting opinions, have limited access
              to their mosque during working hours, or feel uncomfortable discussing personal
              matters publicly. Masail brings trusted local scholarship online — connecting you
              directly with verified scholars from your own masjid, without replacing the role of
              the Imam.
            </p>

            {/* Pain points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[
                { problem: "Anonymous forums with conflicting religious opinions" },
                { problem: "Limited access to the mosque during working hours" },
                { problem: "Discomfort discussing personal matters publicly" },
                { problem: "No easy way to find trustworthy answers from the past" },
              ].map(({ problem }) => (
                <div
                  key={problem}
                  className="flex items-start gap-3 bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]"
                >
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#EF4444] text-xs font-bold">
                    ✕
                  </span>
                  <p className="text-sm text-[#475569]">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-6 relative">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <span className="inline-block rounded-full bg-[#DBEAFE] px-4 py-1.5 text-sm font-semibold text-[#2563EB] mb-6">
                The Big Picture
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
                How It Works, At a Glance
              </h2>
              <p className="text-[#64748B] text-lg max-w-xl mx-auto">
                Every question travels a short, trusted path — from you, to a verified scholar at
                your own masjid, and back again.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <FileText className="w-8 h-8 text-[#2563EB]" />,
                  step: "Step 1 & 2",
                  title: "Register & Choose Your Masjid",
                  desc: "Create your account securely, then select the local mosque you'd like to submit your question to.",
                },
                {
                  icon: <UserCheck className="w-8 h-8 text-[#2563EB]" />,
                  step: "Step 3 & 4",
                  title: "Submit Privately to a Scholar",
                  desc: "Ask openly or use the anonymous option. Your question is routed directly to a qualified, verified scholar at your masjid.",
                },
                {
                  icon: <CheckCircle2 className="w-8 h-8 text-[#2563EB]" />,
                  step: "Step 5 & 6",
                  title: "Peer-Reviewed & Delivered",
                  desc: "A second scholar reviews the answer for accuracy, then it's delivered privately to you through the platform.",
                },
                {
                  icon: <BookOpen className="w-8 h-8 text-[#2563EB]" />,
                  step: "Step 7",
                  title: "Grows the Knowledge Library",
                  desc: "With your permission, anonymised Q&As are added to a searchable library — helping future generations find trusted answers.",
                },
                {
                  icon: <Shield className="w-8 h-8 text-[#2563EB]" />,
                  step: "Always",
                  title: "Private by Default",
                  desc: "Your questions are only ever visible to the assigned scholar and reviewer — never public unless you explicitly choose to share.",
                },
                {
                  icon: <Users className="w-8 h-8 text-[#2563EB]" />,
                  step: "Always",
                  title: "Rooted in Your Community",
                  desc: "Every answer comes from a scholar affiliated with your own local masjid — guidance that understands your context.",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-lg hover:scale-105 transition-transform duration-300"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-16 h-16 bg-[#DBEAFE] rounded-2xl flex items-center justify-center flex-shrink-0">
                      {step.icon}
                    </div>
                    <span className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-full">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-3">{step.title}</h3>
                  <p className="text-[#64748B] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 bg-white border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <span className="inline-block rounded-full bg-[#DBEAFE] px-4 py-1.5 text-sm font-semibold text-[#2563EB] mb-6">
                Community Voices
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
                What Our Community Says
              </h2>
              <p className="text-[#64748B] text-lg">
                Real experiences from Muslims who found clarity through Masail.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Aisha R.",
                  location: "London, UK",
                  initials: "AR",
                  quote:
                    "I had a sensitive question about inheritance that I felt too embarrassed to ask in person. Masail let me ask anonymously and I received a thorough, compassionate answer from my local Imam within two days.",
                },
                {
                  name: "Yusuf M.",
                  location: "Birmingham, UK",
                  initials: "YM",
                  quote:
                    "What I love most is knowing the scholar is from my own masjid. It's not some random fatwa from the internet — it's guidance rooted in my community and context. That trust makes all the difference.",
                },
                {
                  name: "Fatima K.",
                  location: "Manchester, UK",
                  initials: "FK",
                  quote:
                    "As a working mother I rarely get to visit the mosque during the week. Masail has been a blessing — I can ask questions at any time and know a qualified scholar will respond with care.",
                },
              ].map((t, i) => (
                <div
                  key={i}
                  className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-8 flex flex-col gap-6 hover:shadow-md hover:scale-105 transition-all duration-300"
                >
                  {/* Stars */}
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, s) => (
                      <svg
                        key={s}
                        className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-[#475569] leading-relaxed flex-1">"{t.quote}"</p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-sm font-bold text-[#2563EB] flex-shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm">{t.name}</p>
                      <p className="text-[#94A3B8] text-xs">{t.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="py-24 px-6 bg-[#EFF6FF]">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <span className="inline-block rounded-full bg-[#DBEAFE] px-4 py-1.5 text-sm font-semibold text-[#2563EB] mb-6">
                FAQs
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-[#64748B] text-lg">Clear answers to help you feel comfortable.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-start">
              {[
                {
                  q: "Are my questions kept private?",
                  a: "Yes — private by default. Your questions are only visible to the assigned scholar and reviewer, never made public unless you explicitly choose to share. You can also use the anonymous option, meaning your name is never attached to a published answer.",
                },
                {
                  q: "How are the scholars verified?",
                  a: "Every scholar on Masail is vetted and approved by the local masjid admin before joining the platform. They are qualified scholars affiliated with your own mosque — not anonymous strangers from the internet.",
                },
                {
                  q: "What is the peer review process?",
                  a: "Where appropriate, a second scholar reviews the response for accuracy and consistency before it is delivered to you. This double-check ensures the guidance you receive is sound and reliable.",
                },
                {
                  q: "Will my question be published publicly?",
                  a: "Only with your explicit permission. If you consent, an anonymised version of your Q&A may be added to the searchable knowledge library to help future generations — but your personal details are always removed first.",
                },
                {
                  q: "Which masjid will answer my question?",
                  a: "You choose. During sign-up you select the local mosque you'd like to submit your question to, so your guidance always comes from scholars who know your community and context.",
                },
                {
                  q: "Who manages the platform at my mosque?",
                  a: "Each mosque has a designated Masjid Admin who oversees scholar accounts, approves new scholars, and manages the local knowledge base — keeping everything accountable at a community level.",
                },
              ].map((faq, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[#BFDBFE] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="w-full flex items-start justify-between p-6 gap-4 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center text-sm font-bold text-[#2563EB]">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-[#0F172A] leading-snug">{faq.q}</span>
                    </div>
                    <span
                      className={`flex-shrink-0 mt-1 transition-transform duration-300 ${openIndex === i ? "rotate-180" : ""}`}
                    >
                      <ChevronDown className="w-5 h-5 text-[#2563EB]" />
                    </span>
                  </button>
                  {openIndex === i && (
                    <div className="px-6 pb-6 ml-12 text-[#64748B] leading-relaxed border-t border-[#BFDBFE] pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-4xl bg-[#0F172A] rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2563EB] rounded-full blur-3xl opacity-30 translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to seek clarity?</h2>
              <p className="text-[#93C5FD] mb-10 text-lg max-w-xl mx-auto">
                Join our community to ask questions, learn from others, and deepen your
                understanding with confidence.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#3B82F6] text-white px-8 py-4 rounded-xl font-medium transition-colors"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12 px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 18h20" />
                  <path d="M9 18v-4a3 3 0 0 1 6 0v4" />
                  <path d="M12 11V7" />
                  <path d="M5 18V9l2-2 2 2v9" />
                  <path d="M15 18V9l2-2 2 2v9" />
                </svg>
              </div>
              <span className="font-bold text-2xl tracking-tight text-[#0F172A]">MASAIL</span>
            </Link>
            <p className="text-[#64748B] max-w-sm">
              Connecting communities with trusted Islamic knowledge in a modern, secure, and
              respectful environment.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4">Platform</h4>
            <ul className="space-y-3 text-[#64748B]">
              <li>
                <Link to="/login" className="hover:text-[#2563EB] transition-colors">
                  Ask a Question
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#2563EB] transition-colors">
                  Browse Q&A
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4">Legal</h4>
            <ul className="space-y-3 text-[#64748B]">
              <li>
                <a href="#" className="hover:text-[#2563EB] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#2563EB] transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-12 pt-8 border-t border-[#E2E8F0] text-center text-[#64748B] text-sm">
          © {new Date().getFullYear()} Masail. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-[#E2E8F0] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 18h20" />
              <path d="M9 18v-4a3 3 0 0 1 6 0v4" />
              <path d="M12 11V7" />
              <path d="M5 18V9l2-2 2 2v9" />
              <path d="M15 18V9l2-2 2 2v9" />
            </svg>
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#0F172A]">MASAIL</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#hero"
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Home
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            About Us
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#faqs"
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            FAQs
          </a>
          <a
            href="https://nikkah-plus-harmony.vercel.app/"
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            My local Masjid
          </a>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-lg font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
