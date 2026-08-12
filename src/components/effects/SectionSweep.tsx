import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Faint horizontal light-sweep flashed when a section boundary enters view. */
export function SectionSweep() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-45% 0px -45% 0px" });
  const reduced = useReducedMotion();

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none relative h-px w-full">
      <div className="absolute inset-x-0 top-0 h-px bg-border" />
      {!reduced && inView && (
        <motion.div
          initial={{ x: "-30%", opacity: 0 }}
          animate={{ x: "130%", opacity: [0, 0.9, 0] }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute top-0 h-px w-1/3"
          style={{ background: "var(--gradient-primary)" }}
        />
      )}
    </div>
  );
}
