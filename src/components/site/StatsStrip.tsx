import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const STATS = [
  { value: 5000, suffix: "+", label: "Students Trained" },
  { value: 1, prefix: "#", label: "In Tirunelveli" },
  { value: 30, suffix: "+", label: "Courses Offered" },
  { value: 100, suffix: "%", label: "Placement Support" },
];

function CountUp({
  to,
  prefix = "",
  suffix = "",
}: {
  to: number;
  prefix?: string | undefined;
  suffix?: string | undefined;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduced]);

  return (
    <span ref={ref} className="font-mono">
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section aria-label="Institute telemetry" className="relative mx-auto max-w-6xl px-6 py-12">
      <div ref={ref} className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.12, duration: 0.6 }}
            className="scanline relative rounded-md px-4 py-6 text-center bg-card/40 backdrop-blur-sm border border-border/60"
          >
            <span className="pointer-events-none absolute left-0 top-0 h-full w-3 rounded-l-sm border-y border-l border-primary/45" />
            <span className="pointer-events-none absolute right-0 top-0 h-full w-3 rounded-r-sm border-y border-r border-primary/45" />
            <div className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
            </div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="relative mt-8 h-px w-full overflow-hidden bg-border">
        <motion.div
          initial={{ x: "-100%" }}
          animate={inView ? { x: "100%" } : {}}
          transition={{ duration: 2.2, ease: "easeInOut" }}
          className="absolute inset-y-0 w-1/2"
          style={{ background: "var(--gradient-primary)" }}
        />
      </div>
    </section>
  );
}
