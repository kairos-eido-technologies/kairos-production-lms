import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-[3px] bg-transparent">
      <div
        className="h-full origin-left transition-[width] duration-100 ease-out"
        style={{
          width: `${progress}%`,
          background: "var(--gradient-primary)",
          boxShadow: "0 0 12px color-mix(in oklab, var(--primary-glow) 80%, transparent)",
        }}
      />
    </div>
  );
}
