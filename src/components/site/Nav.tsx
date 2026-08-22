import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, ShieldCheck, LogIn } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "Courses", href: "#courses" },
  { label: "Certifications", href: "#pearson" },
  { label: "Why iTech", href: "#why" },
];

/** Shared pill style for nav action buttons */
const NAV_PILL =
  "inline-flex items-center gap-1.5 h-8 rounded-lg border border-border/60 bg-card/60 px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary cursor-pointer";

export function Nav({ user, onVerify }: { user: any; onVerify: () => void }) {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "panel border-b border-border/40 bg-background/85 backdrop-blur-2xl py-1"
          : "bg-transparent py-2"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6">
        <a href="#top" className="flex items-center gap-2">
          <Logo />
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Verify Cert — pill button */}
          <button onClick={onVerify} className={`${NAV_PILL} hidden sm:inline-flex`}>
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Verify Cert
          </button>

          {mounted && user ? (
            <Button
              asChild
              size="sm"
              className="gradient-primary text-primary-foreground border-0 glow h-8 text-xs px-4 rounded-lg"
            >
              <Link to={`/${user.role}` as any}>Dashboard</Link>
            </Button>
          ) : (
            <>
              {/* Sign In — same pill style */}
              <Link to="/login" search={{ mode: "login" }} className={NAV_PILL}>
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
              {/* Get Started — solid gradient */}
              <Button
                asChild
                size="sm"
                className="gradient-primary text-primary-foreground border-0 glow h-8 text-xs px-4 rounded-lg"
              >
                <Link to="/login" search={{ mode: "signup" }}>
                  Get Started
                </Link>
              </Button>
            </>
          )}

          {/* Dark/Light toggle — same pill style */}
          <button
            onClick={toggle}
            aria-label="Toggle colour theme"
            className={NAV_PILL}
            style={{ width: "2rem", padding: "0", justifyContent: "center" }}
          >
            <motion.span
              key={theme}
              initial={{ rotate: -120, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="text-primary"
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </motion.span>
          </button>
        </div>
      </nav>
    </header>
  );
}
