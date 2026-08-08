import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import "@/lib/data-load-init";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Lock, ChevronRight, X, CheckCircle2, XCircle,
  FileText, Search, Clock, Monitor, Star, ArrowRight, Award, Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: LandingPage });

// ─── helpers ──────────────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  try {
    const urlObj = new URL(cleanUrl);
    if (urlObj.hostname === "youtu.be") {
      const id = urlObj.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (urlObj.hostname.includes("youtube.com")) {
      if (urlObj.pathname.startsWith("/shorts/")) {
        const id = urlObj.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const id = urlObj.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (urlObj.pathname.startsWith("/embed/")) return cleanUrl;
    }
    if (urlObj.hostname.includes("vimeo.com")) {
      const m = urlObj.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch {
    const m = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/i);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function getBadgeColor(name: string) {
  const palettes = [
    "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

const TECH_CATALOG: Record<string, { name: string; icon: string; bg: string }> = {
  aws: { name: "AWS", icon: "☁️", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  ec2: { name: "EC2", icon: "🖥️", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  s3: { name: "S3", icon: "🪣", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  lambda: { name: "Lambda", icon: "⚡", bg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
  dynamodb: { name: "DynamoDB", icon: "🗄️", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  cloudwatch: { name: "CloudWatch", icon: "📊", bg: "bg-red-500/15 text-red-700 dark:text-red-300" },
  devops: { name: "DevOps", icon: "♾️", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  docker: { name: "Docker", icon: "🐳", bg: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  kubernetes: { name: "K8s", icon: "☸️", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  terraform: { name: "Terraform", icon: "🏗️", bg: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  java: { name: "Java", icon: "☕", bg: "bg-red-500/15 text-red-700 dark:text-red-300" },
  spring: { name: "Spring Boot", icon: "🍃", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  python: { name: "Python", icon: "🐍", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  django: { name: "Django", icon: "🎯", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  fastapi: { name: "FastAPI", icon: "⚡", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  react: { name: "React JS", icon: "⚛️", bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  typescript: { name: "TypeScript", icon: "🟦", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  javascript: { name: "JavaScript", icon: "🟨", bg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
  tailwind: { name: "Tailwind", icon: "🌊", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  node: { name: "Node.js", icon: "🟢", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  rust: { name: "Rust", icon: "🦀", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  go: { name: "Go Lang", icon: "🐹", bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
  ai: { name: "GenAI", icon: "🤖", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  ml: { name: "ML / AI", icon: "🧠", bg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  sql: { name: "SQL DB", icon: "🗄️", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  pointers: { name: "Pointers", icon: "📍", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  recursion: { name: "Recursion", icon: "🔄", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  "c lang": { name: "C Lang", icon: "⚡", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
};

function getTechStack(c: any): Array<{ name: string; icon: string; bg: string }> {
  let parsed = c.techStack;
  if (typeof parsed === "string") { try { parsed = JSON.parse(parsed); } catch { parsed = null; } }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((t: any) => ({
      name: typeof t === "string" ? t : (t?.name || ""),
      icon: t?.icon || "⚡",
      bg: t?.bg || getBadgeColor(typeof t === "string" ? t : (t?.name || "")),
    }));
  }
  const text = [c.name, c.code, c.description, ...(c.sections || []).map((s: any) => s?.title)].join(" ").toLowerCase();
  const found: Array<{ name: string; icon: string; bg: string }> = [];
  const seen = new Set<string>();
  for (const [key, item] of Object.entries(TECH_CATALOG)) {
    if (text.includes(key) && !seen.has(item.name)) { seen.add(item.name); found.push(item); }
  }
  if (found.length >= 4) return found.slice(0, 10);
  if (text.includes("aws") || text.includes("cloud")) return [
    { name: "AWS", icon: "☁️", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    { name: "EC2", icon: "🖥️", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
    { name: "S3", icon: "🪣", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    { name: "Lambda", icon: "⚡", bg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
    { name: "DynamoDB", icon: "🗄️", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    { name: "CloudWatch", icon: "📊", bg: "bg-red-500/15 text-red-700 dark:text-red-300" },
    { name: "IAM", icon: "🔑", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
    { name: "DevOps", icon: "♾️", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
    { name: "Docker", icon: "🐳", bg: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
    { name: "Terraform", icon: "🏗️", bg: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  ];
  if (text.includes("java")) return [
    { name: "Java", icon: "☕", bg: "bg-red-500/15 text-red-700 dark:text-red-300" },
    { name: "Spring Boot", icon: "🍃", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { name: "Hibernate", icon: "📦", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    { name: "Maven", icon: "⚙️", bg: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
    { name: "MySQL", icon: "🐬", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    { name: "REST API", icon: "🌐", bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
    { name: "JPA", icon: "🗄️", bg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
    { name: "Microservices", icon: "🧩", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
    { name: "Security", icon: "🔒", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
    { name: "JUnit", icon: "🧪", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  ];
  if (text.includes("python")) return [
    { name: "Python", icon: "🐍", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    { name: "Django", icon: "🎯", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { name: "FastAPI", icon: "⚡", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
    { name: "NumPy", icon: "🔢", bg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
    { name: "Pandas", icon: "🐼", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
    { name: "PostgreSQL", icon: "🐘", bg: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
    { name: "Flask", icon: "🧪", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    { name: "PyTest", icon: "✅", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { name: "Matplotlib", icon: "📊", bg: "bg-red-500/15 text-red-700 dark:text-red-300" },
    { name: "Docker", icon: "🐳", bg: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  ];
  return [
    { name: "React JS", icon: "⚛️", bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
    { name: "JavaScript", icon: "🟨", bg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
    { name: "TypeScript", icon: "🟦", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    { name: "Tailwind", icon: "🌊", bg: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
    { name: "HTML5", icon: "📄", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
    { name: "CSS3", icon: "🎨", bg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
    { name: "Next.js", icon: "▲", bg: "bg-slate-700/15 text-slate-800 dark:text-slate-200" },
    { name: "Node.js", icon: "🟢", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    { name: "Redux", icon: "🟣", bg: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
    { name: "REST APIs", icon: "🌐", bg: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  ];
}

// ─── Reveal-on-scroll wrapper ─────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Section label pill ──────────────────────────────────────────────────────
function SectionPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary mb-3">
      {icon}{label}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function LandingPage() {
  const { user } = useAuth();
  const { courses, certificates, users } = useData();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [certId, setCertId] = useState("");
  const [certResult, setCertResult] = useState<null | { ok: boolean; cert?: any }>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { scrollYProgress } = useScroll();
  const scrollBar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const previewCourses = courses.filter((c) => c && c.showInPreview && c.status === "active");
  const displayCourses = useMemo(() => {
    let list = courses.filter((c) => c && c.status === "active");
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        if (!c) return false;
        return [(c.name || ""), (c.code || ""), (c.description || ""), (c.badgeTag || ""),
          Array.isArray(c.techStack) ? c.techStack.map((t: any) => (typeof t === "string" ? t : t?.name || "")).join(" ") : "",
        ].join(" ").toLowerCase().includes(q);
      });
    } else if (previewCourses.length > 0) list = previewCourses;
    return list;
  }, [courses, previewCourses, searchQuery]);

  const verifyCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;
    const cert = certificates.find((c) => c.id.toLowerCase() === certId.trim().toLowerCase() && c.status === "approved");
    setCertResult({ ok: !!cert, cert });
  };
  const closeVerify = () => { setVerifyOpen(false); setCertId(""); setCertResult(null); };

  const COURSE_THEMES = [
    { accent: "#6366f1", bg: "from-indigo-500/[0.08] to-purple-500/[0.05]", border: "border-indigo-500/20 hover:border-indigo-400/50", pill: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-400/20", link: "text-indigo-600 dark:text-indigo-400", glow: "rgba(99,102,241,0.12)" },
    { accent: "#f59e0b", bg: "from-amber-500/[0.08] to-orange-500/[0.05]", border: "border-amber-500/20 hover:border-amber-400/50", pill: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/20", link: "text-amber-600 dark:text-amber-400", glow: "rgba(245,158,11,0.12)" },
    { accent: "#10b981", bg: "from-emerald-500/[0.08] to-teal-500/[0.05]", border: "border-emerald-500/20 hover:border-emerald-400/50", pill: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/20", link: "text-emerald-600 dark:text-emerald-400", glow: "rgba(16,185,129,0.12)" },
    { accent: "#06b6d4", bg: "from-cyan-500/[0.08] to-blue-500/[0.05]", border: "border-cyan-500/20 hover:border-cyan-400/50", pill: "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-400/20", link: "text-cyan-600 dark:text-cyan-400", glow: "rgba(6,182,212,0.12)" },
  ];

  const highlights = [
    { e: "🏆", t: "#1 in Tirunelveli", d: "Highest placement record for 5 consecutive years in the region.", c: "from-amber-500/10", b: "border-amber-500/25 hover:border-amber-400/50" },
    { e: "📚", t: "30+ Professional Courses", d: "From basic computing to advanced AI, Cloud & DevOps — every domain covered.", c: "from-indigo-500/10", b: "border-indigo-500/25 hover:border-indigo-400/50" },
    { e: "🏅", t: "ISO 9001:2015 Certified", d: "Quality-assured programs meeting international standards.", c: "from-emerald-500/10", b: "border-emerald-500/25 hover:border-emerald-400/50" },
    { e: "👨‍🏫", t: "Industry-Certified Trainers", d: "Learn from professionals with real-world certifications and hands-on expertise.", c: "from-purple-500/10", b: "border-purple-500/25 hover:border-purple-400/50" },
    { e: "🛠️", t: "Hands-on Project Learning", d: "Real projects and practical assignments build job-ready skills from day one.", c: "from-cyan-500/10", b: "border-cyan-500/25 hover:border-cyan-400/50" },
    { e: "💼", t: "100% Placement Assistance", d: "Resume building, mock interviews and direct company connections.", c: "from-rose-500/10", b: "border-rose-500/25 hover:border-rose-400/50" },
    { e: "🚀", t: "Live Projects & Internships", d: "Work on live industry projects with our partner companies.", c: "from-orange-500/10", b: "border-orange-500/25 hover:border-orange-400/50" },
    { e: "🎓", t: "Govt Recognized Certs", d: "Certificates recognized by government bodies and top companies across India.", c: "from-sky-500/10", b: "border-sky-500/25 hover:border-sky-400/50" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        /* Marquee */
        @keyframes mq-up   { from { transform:translateY(0)    } to { transform:translateY(-50%) } }
        @keyframes mq-down { from { transform:translateY(-50%) } to { transform:translateY(0)    } }
        .mq-up   { animation: mq-up   9s linear infinite; will-change: transform; }
        .mq-down { animation: mq-down 9s linear infinite; will-change: transform; }

        /* Hero gradient text */
        @keyframes hue-shift {
          0%   { filter: hue-rotate(0deg);   }
          100% { filter: hue-rotate(360deg); }
        }

        /* Radial spotlight that follows cursor via CSS variable */
        .hero-spotlight {
          background: radial-gradient(600px circle at var(--x,50%) var(--y,30%), oklch(0.52 0.22 25 / 0.08), transparent 60%);
          pointer-events: none;
        }

        /* Glass card shine */
        @keyframes card-shine {
          0%   { left: -80%; }
          60%, 100% { left: 160%; }
        }
        .card-shine::after {
          content: '';
          position: absolute;
          top: -50%; left: -80%;
          width: 50%; height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
          transform: skewX(-20deg);
          animation: card-shine 4s ease-in-out infinite;
        }

        /* Scroll-progress bar */
        .scroll-bar { background: var(--gradient-primary); }

        /* Orb pulse */
        @keyframes orb { 0%,100%{transform:scale(1) translate(0,0);opacity:.55} 50%{transform:scale(1.08) translate(10px,-15px);opacity:.8} }
        .orb1 { animation: orb 8s ease-in-out infinite; }
        .orb2 { animation: orb 10s ease-in-out infinite 2s reverse; }
        .orb3 { animation: orb 12s ease-in-out infinite 4s; }

        /* Badge pulse dot */
        @keyframes badge-dot { 0%,100%{box-shadow:0 0 0 0 oklch(0.52 0.22 25 / .5)} 70%{box-shadow:0 0 0 6px oklch(0.52 0.22 25 / 0)} }
        .badge-dot { animation: badge-dot 2s ease-out infinite; }

        /* Hero underline */
        @keyframes line-grow { from{width:0;opacity:0} to{width:100%;opacity:1} }
        .underline-anim { animation: line-grow 0.9s 0.8s ease forwards; width:0; opacity:0; }

        /* Number counter glow */
        .stat-num { text-shadow: 0 0 30px currentColor; }
      `}</style>

      {/* ── SCROLL PROGRESS ── */}
      <motion.div className="scroll-bar fixed top-0 left-0 h-[3px] z-[100] origin-left" style={{ scaleX: scrollYProgress }} />

      {/* ── BACKGROUND ORBS ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="orb1 absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
        <div className="orb2 absolute top-[30%] -right-32 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-indigo-500/15 via-purple-500/5 to-transparent blur-3xl" />
        <div className="orb3 absolute bottom-0 left-[30%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.022]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-[58px]">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setVerifyOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />Verify Certificate
            </button>
            <div className="hidden sm:block h-4 w-px bg-border/60" />
            {user ? (
              <Button asChild size="sm" className="gradient-primary text-primary-foreground border-0 glow h-8 text-xs px-4">
                <Link to={`/${user.role}` as any}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-foreground">
                  <Link to="/login" search={{ mode: "login" }}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className="gradient-primary text-primary-foreground border-0 glow h-8 text-xs px-4">
                  <Link to="/login" search={{ mode: "signup" }}>Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          ── HERO ──
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[88vh] flex flex-col items-center justify-center text-center px-5 sm:px-8 py-20 overflow-hidden">
        {/* Spotlight overlay */}
        <div className="hero-spotlight absolute inset-0" />

        {/* Live badge */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/[0.08] text-xs font-semibold text-primary mb-8">
          <span className="badge-dot h-1.5 w-1.5 rounded-full bg-primary inline-block" />
          Tirunelveli's #1 Tech Training Institute
          <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-[10px] font-bold">ISO Certified</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[-0.03em] leading-[1.0] max-w-4xl mb-6">
          <span className="block text-foreground">Launch Your</span>
          <span className="block relative">
            <span className="gradient-text">Tech Career</span>
            <span className="underline-anim absolute -bottom-2 left-0 h-[4px] rounded-full bg-gradient-to-r from-primary via-rose-400 to-orange-400" />
          </span>
          <span className="block text-foreground/80 mt-1">with iTech</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.25 }}
          className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-10 font-light">
          From foundational coding to cutting-edge AI, Cloud & DevOps — iTech Academy delivers
          {" "}<strong className="text-foreground font-semibold">industry-grade training</strong>,
          {" "}<strong className="text-foreground font-semibold">real projects</strong>, and
          {" "}<strong className="text-foreground font-semibold">100% placement support</strong> — all in one place.
        </motion.p>

        {/* CTA buttons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 mb-14">
          <Button asChild className="gradient-primary text-primary-foreground border-0 glow h-12 px-8 text-sm font-bold rounded-xl">
            <Link to="/login" search={{ mode: "signup" }}>
              Start Learning Free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <button onClick={() => setVerifyOpen(true)}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-border bg-card/70 backdrop-blur-sm text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-all cursor-pointer">
            <ShieldCheck className="h-4 w-4 text-primary" />Verify Certificate
          </button>
        </motion.div>

        {/* ── STAT PILLS ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full">
          {[
            { n: "5000+", l: "Students Trained", icon: "👨‍💻", color: "text-primary" },
            { n: "#1", l: "in Tirunelveli", icon: "🏆", color: "text-amber-500" },
            { n: "30+", l: "Courses Offered", icon: "📚", color: "text-indigo-500" },
            { n: "100%", l: "Placement Support", icon: "💼", color: "text-emerald-500" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.07 }}
              className="flex flex-col items-center gap-1 bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl py-4 px-3 shadow-sm">
              <span className="text-xl">{s.icon}</span>
              <span className={`stat-num text-2xl font-black ${s.color}`}>{s.n}</span>
              <span className="text-[10px] text-muted-foreground font-medium text-center">{s.l}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
          className="mt-10 w-full max-w-xs space-y-2">
          <div className="relative">
            <input type="text" placeholder="Search courses…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-8 pr-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-md text-xs font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition" />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["All", "React", "Python", "Java", "AWS"].map((tag) => (
              <button key={tag} type="button" onClick={() => setSearchQuery(tag === "All" ? "" : tag)}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold cursor-pointer transition-all ${
                  (tag === "All" && !searchQuery) || searchQuery.toLowerCase() === tag.toLowerCase()
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}>
                {tag}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ── PEARSON VUE BANNER ──
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/35 shadow-2xl">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/12 via-background/95 to-blue-500/12" />
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-blue-400/10 blur-2xl translate-y-1/2 -translate-x-1/4" />
            {/* Stripes decoration */}
            <div className="absolute inset-y-0 right-0 w-64 opacity-[0.04]"
              style={{ backgroundImage: "repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 0, transparent 12px)" }} />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-9">
              <div className="space-y-3 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  🏛️ Official Certification Partner
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Pearson VUE Authorized Testing Center
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                  Schedule and sit your globally recognized Pearson VUE certification exams right here in Tirunelveli — in our professionally managed, secure testing lab.
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
                  {["CompTIA", "Microsoft", "Cisco", "AWS", "Oracle"].map(v => (
                    <span key={v} className="px-2.5 py-0.5 rounded-full bg-background/80 border border-border/60 text-xs font-semibold text-muted-foreground">{v}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 grid grid-cols-2 gap-3">
                {[{ e: "📍", t: "Tirunelveli", s: "On-site Testing Lab" }, { e: "🌐", t: "Global Certs", s: "Pearson VUE Network" }, { e: "🔒", t: "Secure Exams", s: "Proctored Environment" }, { e: "📅", t: "Flexible Booking", s: "Easy Scheduling" }].map((card) => (
                  <div key={card.t} className="flex items-center gap-2.5 bg-background/80 backdrop-blur-md px-3 py-2.5 rounded-2xl border border-border/50">
                    <span className="text-xl">{card.e}</span>
                    <div>
                      <div className="text-xs font-bold text-foreground">{card.t}</div>
                      <div className="text-[10px] text-muted-foreground">{card.s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ── WHY ITECH ──
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-16 space-y-10">
        <Reveal className="text-center">
          <SectionPill icon={<Award className="h-3.5 w-3.5" />} label="Why Choose iTech Academy" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Everything You Need to <span className="gradient-text">Succeed</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Real skills, real projects, real mentors — and a team that celebrates every placement milestone with you.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <motion.div whileHover={{ y: -5, transition: { duration: 0.18 } }}
                className={`relative group h-full rounded-2xl border ${h.b} bg-gradient-to-br ${h.c} to-transparent overflow-hidden p-5 transition-shadow hover:shadow-xl`}>
                {/* inner shine */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none rounded-2xl" />
                <div className="text-3xl mb-3">{h.e}</div>
                <h3 className="text-sm font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">{h.t}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{h.d}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ── COURSES ──
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pb-20 space-y-10">
        <Reveal className="text-center">
          <SectionPill icon={<Zap className="h-3.5 w-3.5" />} label="Industry Curriculum" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Featured Courses</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Production-grade training programs with live mentorship, real industry projects, and AI-powered workflows.
          </p>
        </Reveal>

        {displayCourses.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">🔍</div>
            <p className="text-sm text-muted-foreground">No results for "<span className="font-semibold text-foreground">{searchQuery}</span>"</p>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="text-xs mt-2">Clear Search</Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {displayCourses.map((c, index) => {
              const sections = Array.isArray(c.sections) ? c.sections : [];
              const totalItems = sections.reduce((n: number, s: any) => n + (Array.isArray(s?.items) ? s.items.length : 0), 0);
              const isExpanded = expanded === c.id;
              const embedUrl = c.previewVideoUrl ? getEmbedUrl(c.previewVideoUrl) : null;

              const stack = getTechStack(c);
              let full = stack;
              while (full.length < 8) full = [...full, ...stack];
              const half = Math.ceil(full.length / 2);
              const col1 = [...full.slice(0, half), ...full.slice(0, half)];
              const col2 = [...full.slice(half), ...full.slice(half)];

              const badgeTag = (typeof c.badgeTag === "string" && c.badgeTag.trim()) ? c.badgeTag : "GenAI";
              const feat = (typeof c.featuredBadgeText === "string" && c.featuredBadgeText.trim()) ? c.featuredBadgeText : "Featured";
              const dur = (typeof c.durationText === "string" && c.durationText.trim()) ? c.durationText : "6 months self-paced & live";
              const proj = (typeof c.projectsText === "string" && c.projectsText.trim()) ? c.projectsText : "10+ real-time projects";
              const T = COURSE_THEMES[index % 4];

              return (
                <Reveal key={c.id} delay={(index % 2) * 0.08}>
                  <motion.div whileHover={{ y: -4, boxShadow: `0 24px 60px -10px ${T.glow}` }}
                    transition={{ duration: 0.2 }}
                    className={`card-shine relative overflow-hidden rounded-2xl border ${T.border} bg-gradient-to-br ${T.bg} to-transparent backdrop-blur-sm flex flex-col h-full transition-all duration-300`}>
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${T.pill}`}>
                          <Zap className="h-2.5 w-2.5" />{badgeTag}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${T.badge}`}>{feat}</span>
                      </div>

                      {/* Content row */}
                      <div className="flex gap-4 flex-1">
                        {/* Left */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <h3 className="text-base sm:text-lg font-bold leading-tight text-foreground">{c.name}</h3>
                          {c.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                          )}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" style={{ color: T.accent }} />{dur}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Monitor className="h-3 w-3 shrink-0" style={{ color: T.accent }} />{proj}
                            </div>
                          </div>
                        </div>

                        {/* Tech marquee */}
                        <div className="relative h-36 w-32 sm:w-36 shrink-0 overflow-hidden rounded-xl border border-border/20 bg-background/30 p-1">
                          <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background/60 to-transparent z-10 pointer-events-none" />
                          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-background/60 to-transparent z-10 pointer-events-none" />
                          <div className="grid grid-cols-2 gap-0.5 h-full">
                            <div className="flex flex-col mq-up min-w-0">
                              {col1.map((tech, ti) => (
                                <div key={`${tech.name}-a-${ti}`} className={`flex items-center gap-0.5 px-1 py-[3px] mb-[3px] rounded-md text-[8px] font-bold ${tech.bg} overflow-hidden min-w-0`}>
                                  <span className="shrink-0 text-[9px]">{tech.icon}</span>
                                  <span className="truncate">{tech.name}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-col mq-down min-w-0">
                              {col2.map((tech, ti) => (
                                <div key={`${tech.name}-b-${ti}`} className={`flex items-center gap-0.5 px-1 py-[3px] mb-[3px] rounded-md text-[8px] font-bold ${tech.bg} overflow-hidden min-w-0`}>
                                  <span className="shrink-0 text-[9px]">{tech.icon}</span>
                                  <span className="truncate">{tech.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Video */}
                      {c.previewVideoUrl && (
                        <div className="mt-1">
                          {embedUrl ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/30 bg-black/30">
                              <iframe src={embedUrl} title={`${c.name} preview`} className="absolute inset-0 w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                          ) : (
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/30 bg-black/30">
                              <video src={c.previewVideoUrl} controls className="absolute inset-0 w-full h-full object-cover"
                                controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Curriculum footer */}
                      <div className="border-t border-border/30 pt-3">
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => setExpanded(isExpanded ? null : c.id)}
                            className={`inline-flex items-center gap-1 text-xs font-bold cursor-pointer transition-all ${T.link}`}>
                            {isExpanded ? "Hide Syllabus" : "View Syllabus"}
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </button>
                          <span className="text-[10px] text-muted-foreground">{totalItems} modules</span>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-2 pt-3 border-t border-border/30">
                              {sections.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">Syllabus coming soon.</p>
                              ) : sections.map((sec: any) => (
                                <div key={sec.id} className="bg-background/40 p-2.5 rounded-xl border border-border/30 space-y-1">
                                  <div className="text-[10px] font-bold uppercase tracking-wider">{sec.title}</div>
                                  {Array.isArray(sec.items) && sec.items.map((it: any) => (
                                    <div key={it.id} className="flex items-center justify-between text-[11px] text-muted-foreground py-0.5">
                                      <span className="flex items-center gap-1.5"><FileText className="h-3 w-3 shrink-0" />{it.title}</span>
                                      <Lock className="h-2.5 w-2.5 shrink-0 opacity-50" />
                                    </div>
                                  ))}
                                </div>
                              ))}
                              <Button asChild className="w-full gradient-primary text-primary-foreground border-0 font-semibold text-xs h-9 mt-1">
                                <Link to="/login" search={{ mode: "signup" }}>Register to Access Full Course</Link>
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          ── CTA BANNER ──
      ══════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/25 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-background/80 to-indigo-500/20" />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/20 blur-3xl -translate-y-1/2 translate-x-1/4 orb1" />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl translate-y-1/2 -translate-x-1/4 orb2" />
            <div className="absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 16px)" }} />

            <div className="relative z-10 text-center py-14 px-6 space-y-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                <span className="text-xs text-muted-foreground ml-1">Rated 5★ by 5,000+ students</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Ready to <span className="gradient-text">Build Your Future?</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Join thousands of students who turned their ambitions into successful tech careers through iTech Academy's hands-on programs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
                <Button asChild className="gradient-primary text-primary-foreground border-0 glow h-12 px-10 text-sm font-bold rounded-xl">
                  <Link to="/login" search={{ mode: "signup" }}>Create Free Account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
                <button onClick={() => setVerifyOpen(true)}
                  className="flex items-center gap-2 h-12 px-6 rounded-xl border border-border/60 bg-card/60 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer">
                  <ShieldCheck className="h-4 w-4" />Verify a Certificate
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-border/30 py-8 text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-semibold text-foreground">Kairos Eido Technologies</span> · iTech Academy · All rights reserved.
        </p>
        <p className="text-[10px] text-muted-foreground/60">ISO 9001:2015 Certified · Pearson VUE Authorized Center · Govt Recognized</p>
      </footer>

      {/* ── VERIFY MODAL ── */}
      <AnimatePresence>
        {verifyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeVerify} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 grid place-items-center">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Verify Certificate</h3>
                    <p className="text-[10px] text-muted-foreground">Check authenticity in our registry</p>
                  </div>
                </div>
                <button onClick={closeVerify} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60 transition cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={verifyCert} className="space-y-3">
                <input id="certId" value={certId} onChange={(e) => setCertId(e.target.value)}
                  placeholder="e.g. itech-lf92k-3x"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-secondary/50 font-mono text-sm tracking-wide focus:outline-none focus:border-primary/60 placeholder:text-muted-foreground/50" />
                <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground border-0 glow font-bold">
                  Search Registry
                </Button>
              </form>
              {certResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 text-sm ${certResult.ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                  {certResult.ok && certResult.cert ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-success font-bold">
                        <CheckCircle2 className="h-4 w-4" />Authentic iTech Certificate
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                        {[
                          ["Student", users.find((u) => u.id === certResult.cert.studentId)?.name ?? "—"],
                          ["Course", courses.find((c) => c.id === certResult.cert.courseId)?.name ?? "—"],
                          ["Score", `${certResult.cert.score}%`],
                          ["Issued", certResult.cert.issuedAt ?? "—"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
                            <div className="font-semibold truncate">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-bold text-xs">Verification Failed</div>
                        <div className="text-xs text-muted-foreground">No matching certificate found. Check the ID and try again.</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
