import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type Ripple = { id: number; x: number; y: number };

export function MagneticButton({
  children,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "launch";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const reduced = useReducedMotion();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (el && !reduced) {
      const r = el.getBoundingClientRect();
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      window.setTimeout(() => setRipples((prev) => prev.filter((p) => p.id !== id)), 650);
    }
    onClick?.();
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden rounded-lg px-6 py-3 text-sm font-semibold tracking-wide transition-[box-shadow,background-color,color,opacity] duration-300 cursor-pointer hover:opacity-90 active:scale-[0.98]",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-glow hover:shadow-glow-strong",
        variant === "launch" && "text-primary-foreground shadow-glow-strong",
        variant === "outline" &&
          "border border-border bg-card/60 text-foreground backdrop-blur hover:border-primary/50 hover:text-primary",
        className,
      )}
      style={variant === "launch" ? { background: "var(--gradient-primary)" } : undefined}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute z-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground/70"
          style={{ left: r.x, top: r.y, animation: "radar-ping 0.6s ease-out forwards" }}
        />
      ))}
    </button>
  );
}
