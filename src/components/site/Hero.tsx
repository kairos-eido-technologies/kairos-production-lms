import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ParticleLayer } from "@/components/effects/ParticleLayer";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const HEADLINE_A = "Launch Your ";
const HEADLINE_B = "Tech Career";
const FULL = HEADLINE_A + HEADLINE_B;

const TICKER_ITEMS = [
  "30+ INDUSTRY COURSES",
  "PEARSON VUE TEST CENTRE",
  "100% PLACEMENT SUPPORT",
  "LIVE PROJECTS INCLUDED",
  "ISO 9001:2015 CERTIFIED",
  "5000+ STUDENTS TRAINED",
  "FULL STACK · CLOUD · AI · DATA SCIENCE",
  "TIRUNELVELI HQ",
];

function SystemReadyTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % TICKER_ITEMS.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-auto mb-8 max-w-xl overflow-hidden rounded-full border border-primary/30 bg-primary/[0.08] px-4 py-1.5 backdrop-blur">
      <div className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.22em] text-primary font-semibold flex items-center justify-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block animate-pulse shrink-0" />
        <span key={idx} className="animate-slide-in">{TICKER_ITEMS[idx]}</span>
      </div>
    </div>
  );
}

function CircuitTraces() {
  const reduced = useReducedMotion();
  const paths = [
    "M0 120 H180 L230 70 H460 L520 130 H820",
    "M0 300 H120 L190 230 H520 L580 300 H1000",
    "M60 480 H300 L360 420 H700 L760 480 H1200",
    "M-20 620 H240 L300 560 H640 L700 620 H1100",
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-[0.35] pointer-events-none"
    >
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1"
          initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: reduced ? 0.01 : 2.6, delay: i * 0.25, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 60%, transparent))" }}
        />
      ))}
      {[
        [230, 70],
        [520, 130],
        [190, 230],
        [580, 300],
        [360, 420],
        [700, 620],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="var(--primary-glow)" opacity="0.75" />
      ))}
    </svg>
  );
}

export function Hero({ onVerify }: { onVerify: () => void }) {
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(reduced ? FULL.length : 0);

  useEffect(() => {
    if (reduced) {
      setTyped(FULL.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= FULL.length) window.clearInterval(id);
    }, 62);
    return () => window.clearInterval(id);
  }, [reduced]);

  const shownA = FULL.slice(0, Math.min(typed, HEADLINE_A.length));
  const shownB = typed > HEADLINE_A.length ? FULL.slice(HEADLINE_A.length, typed) : "";

  return (
    <section className="relative flex min-h-[92svh] items-center justify-center overflow-hidden pt-16">
      <ParticleLayer className="absolute inset-0" />
      <CircuitTraces />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent,color-mix(in_oklab,var(--background)_75%,transparent))]" />

      <div className="relative mx-auto w-full max-w-5xl px-6 pb-20 pt-20 text-center z-10">
        <SystemReadyTicker />

        <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="block text-foreground">{shownA}</span>
          <span className="gradient-text glow-pulse inline-block">{shownB}</span>
          {typed < FULL.length && (
            <span className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.08em] animate-pulse bg-primary align-middle" />
          )}
          <span className="block text-foreground/80 mt-1">
            with{" "}
            {/* iTech — Orbitron font for a unique branded look */}
            <span
              style={{
                fontFamily: "'Orbitron', monospace",
                fontWeight: 900,
                letterSpacing: "0.04em",
                background: "var(--gradient-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 18px color-mix(in oklab, var(--primary) 50%, transparent))",
              }}
            >
              iTech
            </span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7 }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg leading-relaxed"
        >
          <strong className="text-foreground">iTech Academy</strong> — Tirunelveli's command centre for
          industry-certified tech training, live projects, and 100% placement support.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45, duration: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton
            variant="launch"
            onClick={() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })}
          >
            Explore Courses
          </MagneticButton>
        </motion.div>

        <div className="mt-14 flex justify-center">
          <div className="relative flex h-10 w-10 items-center justify-center">
            {!reduced && (
              <span
                className="absolute inset-0 rounded-full border border-primary/50"
                style={{ animation: "radar-ping 2.2s ease-out infinite" }}
              />
            )}
            <svg viewBox="0 0 24 24" className="h-5 w-5 animate-bounce text-primary" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
