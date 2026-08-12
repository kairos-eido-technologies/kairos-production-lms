import { lazy, Suspense, useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const ParticleField = lazy(() => import("./ParticleField"));

export function ParticleLayer({
  density = 1,
  burst = false,
  className = "absolute inset-0",
}: {
  density?: number;
  burst?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (reduced || !mounted) {
    return (
      <div
        aria-hidden="true"
        className={`${className} bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--primary)14%,transparent),transparent_65%)]`}
      />
    );
  }

  return (
    <Suspense fallback={<div aria-hidden="true" className={className} />}>
      <ParticleField density={density} burst={burst} className={className} />
    </Suspense>
  );
}
