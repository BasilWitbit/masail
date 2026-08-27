import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileText, CheckCircle2, UserCheck, ArrowRight, ChevronDown } from "lucide-react";
import { usePlatformThemeGate } from "@/lib/use-platform-theme";
import { ThemeLoadingScreen } from "@/components/theme-loading-screen";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { ready: themeReady } = usePlatformThemeGate();

  if (!themeReady) return <ThemeLoadingScreen />;

  return (
    <div className="min-h-screen font-sans selection:bg-[#DBEAFE] selection:text-[#0F172A]" style={{ backgroundColor: "#F8FAFC", color: "#0F172A" }}>
      <LandingHeader />
      
      <main>
        {/* <style>{`
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-up { animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        `}</style> */}

        {/* Hero Section */}
<section id="hero" className="relative overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-36 px-6 bg-[#F8FAFC]">
  
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
    WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 35%, black, transparent 90%)",
    maskImage: "radial-gradient(ellipse 60% 50% at 50% 35%, black, transparent 90%)"
  }}
/>

  {/* Single faint arch, centered behind headline, cropped at bottom */}
  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[520px] md:w-[720px] h-[420px] md:h-[580px] text-[#93C5FD] opacity-25 pointer-events-none">
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.4" preserveAspectRatio="none" className="w-full h-full">
      <path d="M 5 100 V 55 C 5 30 20 8 50 2 C 80 8 95 30 95 55 V 100" />
    </svg>
  </div>

  {/* Content */}
  <div className="relative z-10 mx-auto max-w-5xl text-center">
    <span className="animate-fade-up inline-block rounded-full bg-[#DBEAFE] px-4 py-1.5 text-sm font-semibold text-[#2563EB] mb-6" style={{ animationDelay: "0.1s" }}>
      Private • Verified • Local
    </span>
    <h1 className="animate-fade-up text-5xl md:text-7xl font-extrabold tracking-tight text-[#0F172A] leading-tight mb-8" style={{ animationDelay: "0.2s" }}>
      Reliable Islamic Guidance, <br className="hidden md:block"/> Rooted in Your Community
    </h1>
    <p className="animate-fade-up mx-auto max-w-2xl text-lg md:text-xl text-[#64748B] mb-10 leading-relaxed" style={{ animationDelay: "0.3s" }}>
      Connect privately with verified local scholars to find answers to your questions. A serene, secure platform for faithful guidance.
    </p>
    <div className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: "0.4s" }}>
      <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium shadow-lg shadow-[#2563EB]/25 transition-all text-center">
        Ask a Question
      </Link>
    </div>
  </div>
</section>

        {/* About Us */}
        <section id="about" className="py-24 px-6 bg-white border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-[#0F172A] mb-6">A Trustworthy Connection to Knowledge</h2>
            <p className="text-lg text-[#64748B] leading-relaxed">
              In an age of overwhelming information, finding reliable Islamic guidance can be challenging. We bridge the gap between everyday questions and verified local scholars. Our platform ensures your queries are handled with the utmost privacy, respect, and academic integrity by Imams who understand your community.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section id="how-it-works" className="py-24 px-6 relative">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[#0F172A] mb-4">How It Works</h2>
              <p className="text-[#64748B] text-lg">A simple, secure path to clarity.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  icon: <FileText className="w-8 h-8 text-[#2563EB]" />, 
                  title: "1. Submit Privately", 
                  desc: "Ask your question anonymously or share details securely. Your privacy is our priority." 
                },
                { 
                  icon: <UserCheck className="w-8 h-8 text-[#2563EB]" />, 
                  title: "2. Expert Review", 
                  desc: "A verified local scholar receives your query, ensuring a contextual and grounded response." 
                },
                { 
                  icon: <CheckCircle2 className="w-8 h-8 text-[#2563EB]" />, 
                  title: "3. Receive Guidance", 
                  desc: "Get notified when a comprehensive, reliable answer is ready for you." 
                }
              ].map((step, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-[#DBEAFE] rounded-2xl flex items-center justify-center mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-3">{step.title}</h3>
                  <p className="text-[#64748B] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="py-24 px-6 bg-white border-y border-[#E2E8F0]">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[#0F172A] mb-4">Frequently Asked Questions</h2>
              <p className="text-[#64748B] text-lg">Clear answers to help you feel comfortable.</p>
            </div>
            
            <div className="space-y-4">
              {[
                {
                  q: "Are my questions kept private and anonymous?",
                  a: "Yes. You have full control over your privacy. You can submit questions entirely anonymously, and even if you log in, only the verified scholars assigned to answer can view the necessary details to provide guidance."
                },
                {
                  q: "How are the scholars verified?",
                  a: "Every scholar on our platform undergoes a strict vetting process. We verify their academic credentials, community standing, and references to ensure you receive sound, reliable guidance."
                },
                {
                  q: "How long does it take to get an answer?",
                  a: "Response times vary depending on the complexity of the question and scholar availability. Most routine questions receive a response within 48-72 hours."
                },
                {
                  q: "Can this replace a formal fatwa or in-person consultation?",
                  a: "Our platform provides educational guidance and general answers. For highly sensitive, complex, or legally binding matters (like divorce or detailed inheritance), an in-person consultation with a scholar is always required."
                },
                {
                  q: "Can I choose which scholar answers my question?",
                  a: "You can direct your question to the general pool of verified local scholars, or if your local mosque is registered, route it directly to your specific Imam."
                }
              ].map((faq, i) => (
                <details key={i} className="group bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-[#0F172A]">
                    {faq.q}
                    <span className="transition group-open:rotate-180">
                      <ChevronDown className="w-5 h-5 text-[#64748B]" />
                    </span>
                  </summary>
                  <div className="px-6 pb-6 text-[#64748B] leading-relaxed border-t border-[#E2E8F0] pt-4 mt-2">
                    {faq.a}
                  </div>
                </details>
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
                Join our community to ask questions, learn from others, and deepen your understanding with confidence.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#3B82F6] text-white px-8 py-4 rounded-xl font-medium transition-colors">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              Connecting communities with trusted Islamic knowledge in a modern, secure, and respectful environment.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4">Platform</h4>
            <ul className="space-y-3 text-[#64748B]">
              <li><Link to="/login" className="hover:text-[#2563EB] transition-colors">Ask a Question</Link></li>
              <li><Link to="/login" className="hover:text-[#2563EB] transition-colors">Browse Q&A</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#0F172A] mb-4">Legal</h4>
            <ul className="space-y-3 text-[#64748B]">
              <li><a href="#" className="hover:text-[#2563EB] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#2563EB] transition-colors">Terms of Service</a></li>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <a href="#hero" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">Home</a>
          <a href="#about" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">About Us</a>
          <a href="#how-it-works" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">How It Works</a>
          <a href="#faqs" className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">FAQs</a>
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

