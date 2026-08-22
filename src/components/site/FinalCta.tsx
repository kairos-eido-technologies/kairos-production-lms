import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Rocket } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FinalCta() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_50%_100%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)]" />
      <motion.div
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="pointer-events-none absolute inset-x-0 top-0 h-px origin-center"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in oklab, var(--primary-glow) 80%, transparent), transparent)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <span className="data-chip text-primary">FINAL SEQUENCE // ENROLL</span>
        <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
          Ready to <span className="gradient-text">launch your tech career</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-sm leading-relaxed">
          Join the next batch at iTech Academy, Tirunelveli. Log in and start your tech journey —
          pick your track and start building from week one.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold tracking-wide text-primary-foreground transition-[box-shadow,opacity] duration-300 hover:opacity-90 active:scale-[0.98] cursor-pointer"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow-strong)",
            }}
          >
            <Rocket className="mr-1 inline h-4 w-4" />
            Login & Start Learning
          </Link>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Tirunelveli, Tamil Nadu
        </p>
      </div>
    </section>
  );
}
