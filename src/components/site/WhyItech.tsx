import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Cpu,
  GraduationCap,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const ITEMS: {
  title: string;
  text: string;
  accent: string;
  icon: LucideIcon;
  metric: string;
}[] = [
  {
    title: "#1 in Tirunelveli",
    text: "The region's most trusted tech training destination.",
    accent: "var(--hud-amber)",
    icon: Trophy,
    metric: "RANK 01",
  },
  {
    title: "30+ Professional Courses",
    text: "From web engineering to cloud, security and design.",
    accent: "var(--hud-indigo)",
    icon: BookOpen,
    metric: "30+",
  },
  {
    title: "ISO 9001:2015 Certified",
    text: "Quality-audited training processes end to end.",
    accent: "var(--hud-emerald)",
    icon: ShieldCheck,
    metric: "ISO",
  },
  {
    title: "Industry-Certified Trainers",
    text: "Taught by practising, vendor-certified engineers.",
    accent: "var(--hud-purple)",
    icon: GraduationCap,
    metric: "PRO",
  },
  {
    title: "Hands-on Project Learning",
    text: "Every module ends in something you actually built.",
    accent: "var(--hud-cyan)",
    icon: Cpu,
    metric: "LABS",
  },
  {
    title: "100% Placement Assistance",
    text: "Resume labs, mock drives and hiring partner access.",
    accent: "var(--hud-rose)",
    icon: Briefcase,
    metric: "100%",
  },
  {
    title: "Live Projects & Internships",
    text: "Real client work inside a supervised studio setup.",
    accent: "var(--hud-orange)",
    icon: BadgeCheck,
    metric: "LIVE",
  },
  {
    title: "Govt Recognized Certs",
    text: "Credentials recognised for jobs and higher study.",
    accent: "var(--hud-sky)",
    icon: Award,
    metric: "GOVT",
  },
];

function Card({ item, index }: { item: (typeof ITEMS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = item.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: (index % 4) * 0.09 }}
      className="group relative overflow-hidden rounded-xl border bg-card/70 p-5 backdrop-blur transition-[box-shadow,border-color] duration-300"
      style={{
        borderColor: inView ? item.accent : "var(--border)",
        boxShadow: inView ? `0 0 22px -12px ${item.accent}` : undefined,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${item.accent}, 0 0 30px -8px ${item.accent}` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: item.accent }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <motion.span
          initial={{ scale: 0.3, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{
            delay: 0.22 + (index % 4) * 0.09,
            type: "spring",
            stiffness: 260,
            damping: 14,
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md border"
          style={{
            borderColor: `${item.accent}66`,
            background: `color-mix(in oklab, ${item.accent} 14%, transparent)`,
            boxShadow: `0 0 16px -6px ${item.accent}`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: item.accent }} />
        </motion.span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: item.accent }}
        >
          {item.metric}
        </span>
      </div>

      <h3 className="relative mt-4 text-sm font-semibold tracking-tight">{item.title}</h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.text}</p>

      <div className="relative mt-4 h-px w-full overflow-hidden bg-border">
        <motion.span
          initial={{ x: "-100%" }}
          animate={inView ? { x: "0%" } : {}}
          transition={{ duration: 0.9, delay: 0.3 + (index % 4) * 0.09, ease: "easeOut" }}
          className="block h-full w-full"
          style={{ background: `linear-gradient(to right, transparent, ${item.accent})` }}
        />
      </div>
    </motion.div>
  );
}

export function WhyItech() {
  return (
    <section id="why" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <span className="data-chip text-primary">DIAGNOSTICS // ALL SYSTEMS PASS</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Why <span className="gradient-text">iTech Academy</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Card key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
