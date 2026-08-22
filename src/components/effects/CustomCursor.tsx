import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      setVisible(true);
    };
    window.addEventListener("pointermove", onMove);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      rx += (x - rx) * 0.14;
      ry += (y - ry) * 0.14;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${x - 3}px,${y - 3}px,0)`;
      if (ringRef.current)
        ringRef.current.style.transform = `translate3d(${rx - 16}px,${ry - 16}px,0)`;
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] hidden md:block">
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-primary shadow-glow"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-8 w-8 rounded-full border border-primary/45"
        style={{ opacity: visible ? 0.8 : 0 }}
      />
    </div>
  );
}
