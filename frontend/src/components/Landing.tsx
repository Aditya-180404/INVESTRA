import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Cpu,
  Database,
  FileSearch,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  Menu,
  MapPin,
  Network,
  Phone,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  CONFIG                                                             */
/* ------------------------------------------------------------------ */
const LOGIN_ROUTE = "/police/login"; // <- your existing login route
const HERO_IMAGE = "/images/rashtrapati-bhavan.png"; // <- put your hero image in /public/images
const NAVY = "#0b3a66";

/* ------------------------------------------------------------------ */
/*  DATASET                                                            */
/* ------------------------------------------------------------------ */
const NAV_ITEMS = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Features", id: "features" },
  { label: "Technology", id: "technology" },
  { label: "Security", id: "security" },
  { label: "Contact", id: "contact" },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Secure & Trusted", text: "Government Grade Security" },
  { icon: Users, title: "Investigator-Centric", text: "Built for Field & Desk Officers" },
  { icon: BarChart3, title: "Data-Driven", text: "Faster, Informed Decisions" },
];

const HIGHLIGHTS = [
  { icon: FileSearch, title: "Unified Case View", text: "Connect fragmented records across departments.", tone: "bg-blue-100 text-blue-800" },
  { icon: Network, title: "Relationship Analysis", text: "Identify hidden links with AI-powered insights.", tone: "bg-sky-100 text-sky-800" },
  { icon: FileText, title: "Investigation Support", text: "Get actionable intelligence and evidence mapping.", tone: "bg-emerald-100 text-emerald-800" },
  { icon: ShieldCheck, title: "Secure & Compliant", text: "Designed for government use with robust security.", tone: "bg-indigo-100 text-indigo-800" },
];

const STEPS = [
  { icon: Database, title: "Collect", text: "Bring in FIRs, case diaries, call records, and reports from existing police systems." },
  { icon: Workflow, title: "Connect", text: "Match people, places, phones, and vehicles that appear across different records." },
  { icon: Sparkles, title: "Analyse", text: "AI highlights relationships and patterns an investigator may have missed." },
  { icon: FileText, title: "Decide", text: "Review evidence maps and leads, then act with a clear picture of the case." },
];

const FEATURES = [
  { icon: FileSearch, title: "Unified Case View", text: "One timeline for every record linked to a case, whichever department created it." },
  { icon: Network, title: "Relationship Graph", text: "See how suspects, victims, locations, and devices connect at a glance." },
  { icon: Sparkles, title: "AI Lead Suggestions", text: "Ranked leads with the source records that support each one." },
  { icon: FileText, title: "Evidence Mapping", text: "Attach evidence to people and events, then export it for review." },
  { icon: Users, title: "Team Collaboration", text: "Share case notes and tasks across desk and field officers." },
  { icon: BarChart3, title: "Case Dashboards", text: "Track case status, pending actions, and workload by unit." },
];

const ABOUT_STATS = [
  { value: "1 view", label: "for records spread across departments" },
  { value: "Role-based", label: "access for every officer" },
  { value: "Full audit", label: "trail on every search and edit" },
];

const TECHNOLOGY = [
  { icon: Cpu, title: "AI Entity Matching", text: "Links names, numbers, and addresses even when they are spelled differently." },
  { icon: Network, title: "Graph Analytics", text: "Maps relationships across thousands of records in seconds." },
  { icon: Server, title: "Secure Deployment", text: "Runs on government-approved infrastructure." },
  { icon: Database, title: "Open Integrations", text: "Connects to CCTNS and other existing systems through standard APIs." },
];

const SECURITY = [
  { icon: Lock, title: "End-to-end encryption", text: "Data is encrypted in transit and at rest." },
  { icon: KeyRound, title: "Role-based access", text: "Officers see only the cases they are authorised to view." },
  { icon: Fingerprint, title: "Multi-factor login", text: "Every sign-in is verified beyond a password." },
  { icon: FileText, title: "Complete audit logs", text: "Every action is recorded and can be reviewed." },
];

const FOOTER_LINKS = {
  "Quick Links": [
    { label: "Home", id: "home" },
    { label: "About", id: "about" },
    { label: "How It Works", id: "how-it-works" },
    { label: "Features", id: "features" },
  ],
  Platform: [
    { label: "Technology", id: "technology" },
    { label: "Security", id: "security" },
    { label: "Contact", id: "contact" },
  ],
};

const LEGAL_LINKS = ["Privacy Policy", "Terms of Use", "Accessibility Statement", "Help"];

const CONTACT = [
  { icon: Mail, text: "support@investra.gov.in" },
  { icon: Phone, text: "1800-000-0000 (Toll free)" },
  { icon: MapPin, text: "North Block, New Delhi - 110001" },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const setFontSize = (px: number) => {
  document.documentElement.style.fontSize = `${px}px`;
};

const SectionHeading = ({ label, title, text }: { label: string; title: string; text?: string }) => (
  <div>
    <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-[#0b3a66]">
      <span className="h-0.5 w-8 bg-sky-700" />
      {label}
    </div>
    <h2 className="mt-3 text-3xl font-extrabold text-[#0b3a66] md:text-4xl">{title}</h2>
    {text && <p className="mt-2 max-w-2xl text-lg text-slate-600">{text}</p>}
  </div>
);

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */
export interface LandingProps {
  loginUrl?: string;
  onLoginClick?: () => void;
}

export default function Landing({
  loginUrl = LOGIN_ROUTE,
  onLoginClick,
}: LandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("home");

  const goLogin = () => {
    if (onLoginClick) {
      onLoginClick();
      return;
    }

    window.location.href = loginUrl;
  };
  const goTo = (id: string) => {
    setActive(id);
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      {/* Government top bar */}
      <div className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <Landmark className="h-8 w-8 text-slate-500" aria-hidden />
            <div className="text-[11px] font-semibold leading-tight text-slate-700">
              <div className="text-xs tracking-wide">GOVERNMENT OF INDIA</div>
              <div className="text-slate-500">MINISTRY OF HOME AFFAIRS</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700 sm:gap-4">
            <a href="#main" className="hidden sm:inline">Screen Reader Access</a>
            <span className="hidden h-3 w-px bg-slate-400 sm:block" />
            <button onClick={() => setFontSize(14)} aria-label="Decrease text size">A-</button>
            <button onClick={() => setFontSize(16)} aria-label="Default text size">A</button>
            <button onClick={() => setFontSize(18)} aria-label="Increase text size">A+</button>
            <span className="h-3 w-px bg-slate-400" />
            <button className="flex items-center gap-1" aria-label="Language">
              <Globe className="h-3.5 w-3.5" /> English <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6">
          <button onClick={() => goTo("home")} className="flex items-center gap-3 text-left">
            <Shield className="h-10 w-10 fill-[#0b3a66] text-[#0b3a66]" aria-hidden />
            <span>
              <span className="block text-xl font-extrabold leading-none tracking-wide text-[#0b3a66]">INVESTRA</span>
              <span className="block text-[10px] font-semibold tracking-wider text-slate-500">INVESTIGATION INTELLIGENCE</span>
            </span>
          </button>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {NAV_ITEMS.map((n) => (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className={`border-b-2 py-2 text-sm font-semibold transition-colors ${
                  active === n.id ? "border-[#0b3a66] text-[#0b3a66]" : "border-transparent text-slate-700 hover:text-[#0b3a66]"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={goLogin}
              className="flex items-center gap-2 rounded-md bg-[#0b3a66] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#082c4d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Login <ArrowRight className="h-4 w-4" />
            </button>
            <button className="lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-slate-100 bg-white px-6 py-3 lg:hidden" aria-label="Mobile">
            {NAV_ITEMS.map((n) => (
              <button key={n.id} onClick={() => goTo(n.id)} className="block w-full py-2.5 text-left text-sm font-semibold text-slate-700">
                {n.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main id="main">
        {/* Hero */}
        <section id="home" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-white to-slate-50">
          <div
            className="absolute inset-y-0 right-0 hidden w-[60%] bg-cover bg-bottom lg:block"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 hidden w-[60%] bg-gradient-to-r from-white via-white/60 to-transparent lg:block" aria-hidden />

          <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:min-h-[444px] lg:grid-cols-[1fr_auto_auto] lg:py-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-sm font-bold tracking-wide text-[#0b3a66]">
                <span className="h-0.5 w-8 bg-sky-700" />
                SAFE COMMUNITIES <span>•</span> STRONGER INDIA
              </div>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.08] text-[#0b3a66] md:text-6xl">
                Smarter Investigations.
                <br />
                <span className="text-sky-700">Safer Communities.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                INVESTRA leverages AI to connect fragmented investigation records, identify relationships, and assist
                investigators with actionable intelligence for a safer and more secure India.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={goLogin}
                  className="flex items-center gap-3 rounded-md bg-[#0b3a66] px-8 py-3.5 font-semibold text-white transition hover:bg-[#082c4d]"
                >
                  Explore Platform <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goTo("how-it-works")}
                  className="flex items-center gap-3 rounded-md border border-[#0b3a66] bg-white px-8 py-3.5 font-semibold text-[#0b3a66] transition hover:bg-slate-50"
                >
                  How It Works <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-5">
                {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-sky-800" strokeWidth={1.5} />
                    <div>
                      <div className="text-sm font-bold text-[#0b3a66]">{title}</div>
                      <div className="text-xs text-slate-500">{text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tagline over image */}
            <div className="hidden self-center lg:block lg:w-40 lg:pl-6">
              <span className="mb-4 block h-0.5 w-8 bg-sky-700" />
              <p className="text-sm font-bold leading-7 tracking-[0.2em] text-sky-800/70">
                TECHNOLOGY FOR A SAFER TOMORROW
              </p>
            </div>

            {/* Emblem & values */}
            <div className="hidden flex-col items-center self-start pt-2 text-center lg:flex">
              <Landmark className="h-24 w-24 text-slate-300" strokeWidth={1} aria-hidden />
              <p className="mt-2 text-lg text-slate-300" lang="hi">सत्यमेव जयते</p>
              <p className="mt-3 text-xs font-bold leading-6 tracking-[0.3em] text-slate-400">
                PEOPLE<br />SAFETY<br />JUSTICE<br />TRUST
              </p>
            </div>
          </div>
        </section>

        {/* Highlight strip */}
        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-5">
                <span className={`flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-8 w-8" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="font-bold text-[#0b3a66]">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 bg-[#e8eff7] py-14">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                label="HOW IT WORKS"
                title="From Data to Decisions"
                text="A simple, secure, and intelligent workflow for investigation teams."
              />
              <button
                onClick={() => goTo("features")}
                className="flex items-center gap-3 rounded-md border border-[#0b3a66] bg-white px-6 py-3 text-sm font-semibold text-[#0b3a66] hover:bg-slate-50"
              >
                Learn More <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#0b3a66]">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </span>
                    <span className="text-sm font-bold text-slate-400">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#0b3a66]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-20 bg-white py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2">
            <div>
              <SectionHeading label="ABOUT INVESTRA" title="Built for the people who solve cases" />
              <p className="mt-4 max-w-xl leading-relaxed text-slate-600">
                Investigation records often sit in separate systems, files, and registers. INVESTRA brings them
                together so an officer can see the whole case, understand who and what is connected, and decide the
                next step with confidence.
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {ABOUT_STATS.map((s) => (
                <div key={s.value} className="rounded-lg border border-slate-200 p-5">
                  <dt className="text-xl font-extrabold text-[#0b3a66]">{s.value}</dt>
                  <dd className="mt-1 text-sm text-slate-600">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading label="FEATURES" title="Everything an investigation team needs" />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-slate-200 bg-white p-6">
                  <Icon className="h-7 w-7 text-sky-700" strokeWidth={1.5} />
                  <h3 className="mt-4 font-bold text-[#0b3a66]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology + Security */}
        <section id="technology" className="scroll-mt-20 bg-white py-16">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeading label="TECHNOLOGY" title="Modern AI, deployed responsibly" />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {TECHNOLOGY.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[#0b3a66]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-[#0b3a66]">{title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="scroll-mt-20 py-16 text-white" style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-sky-200">
              <span className="h-0.5 w-8 bg-sky-300" /> SECURITY
            </div>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Government-grade protection for sensitive data</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SECURITY.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-lg border border-white/15 bg-white/5 p-6">
                  <Icon className="h-7 w-7 text-sky-300" strokeWidth={1.5} />
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-sky-100/80">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section id="contact" className="scroll-mt-20 bg-white py-16">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-6">
            <div>
              <SectionHeading label="CONTACT" title="Ready to get started?" text="Officers can sign in with their department credentials." />
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {CONTACT.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-sky-700" /> {text}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={goLogin}
              className="flex items-center gap-3 rounded-md bg-[#0b3a66] px-8 py-4 font-semibold text-white hover:bg-[#082c4d]"
            >
              Login to INVESTRA <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#072944] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 text-white">
              <Shield className="h-9 w-9 fill-white/10" />
              <div>
                <div className="text-lg font-extrabold tracking-wide">INVESTRA</div>
                <div className="text-[10px] font-semibold tracking-wider text-slate-400">INVESTIGATION INTELLIGENCE</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              An AI-assisted investigation platform for the Ministry of Home Affairs, Government of India.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-bold text-white">{heading}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {links.map((l) => (
                  <li key={l.id}>
                    <button onClick={() => goTo(l.id)} className="hover:text-white">{l.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-sm font-bold text-white">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {CONTACT.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Ministry of Home Affairs, Government of India. All rights reserved.</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((l) => (
                <li key={l}><a href="#" className="hover:text-white">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
