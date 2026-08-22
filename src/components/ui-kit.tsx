import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = false,
  delay = 0,
  to,
  live = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: boolean;
  delay?: number;
  to?: string;
  live?: boolean;
}) {
  const cardContent = (
    <>
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition"
        style={{ background: accent ? undefined : "var(--gradient-radial)" }}
      />
      <div className="relative flex items-start justify-between gap-2 h-full">
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="min-h-[1.75rem] flex items-center">
            {live ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {label}
              </span>
            ) : (
              <span
                className={`text-xs uppercase tracking-wider line-clamp-2 leading-tight font-medium ${
                  accent ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            )}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {trend && (
            <div
              className={`mt-1 text-xs ${accent ? "text-primary-foreground/90" : "text-success"}`}
            >
              {trend}
            </div>
          )}
        </div>
        <div
          className={`h-10 w-10 shrink-0 grid place-items-center rounded-xl ${
            live
              ? "bg-emerald-500/15 text-emerald-500"
              : accent
                ? "bg-white/20 text-white"
                : "bg-primary/15 text-primary"
          }`}
        >
          <Icon className={`h-5 w-5 ${live ? "animate-pulse" : ""}`} />
        </div>
      </div>
    </>
  );

  const containerClasses = `group relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 block text-left h-full min-h-[114px] flex flex-col justify-between ${
    live
      ? "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60"
      : accent
        ? "gradient-primary text-primary-foreground border-transparent glow shadow-md"
        : "glass border-border hover:border-primary/40 shadow-sm"
  } ${to ? "cursor-pointer hover:shadow-md" : ""}`;

  if (to) {
    return (
      <Link to={to as any} className="block no-underline h-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay }}
          className={containerClasses}
        >
          {cardContent}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={containerClasses}
    >
      {cardContent}
    </motion.div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`glass rounded-2xl p-6 ${className}`}>{children}</div>;
}

export function CourseThumbnail({
  thumbnail,
  name,
  className = "h-12 w-12",
  textClassName = "text-2xl",
}: {
  thumbnail?: string;
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const [hasError, setHasError] = useState(false);

  const isUrl =
    thumbnail &&
    (thumbnail.startsWith("http://") ||
      thumbnail.startsWith("https://") ||
      thumbnail.startsWith("/") ||
      thumbnail.startsWith("data:"));

  if (isUrl && !hasError) {
    return (
      <div
        className={`${className} overflow-hidden rounded-xl bg-muted border border-border/50 flex-shrink-0 relative group shadow-xs`}
      >
        <img
          src={thumbnail}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  const getFallbackIcon = (n: string) => {
    const lower = (n || "").toLowerCase();
    if (lower.includes("web") || lower.includes("stack") || lower.includes("react")) return "💻";
    if (lower.includes("python") || lower.includes("data")) return "🐍";
    if (lower.includes("cloud") || lower.includes("devops") || lower.includes("aws")) return "☁️";
    if (lower.includes("java")) return "☕";
    if (lower.includes("c ") || lower.includes("c++")) return "⚡";
    return "📘";
  };

  const displayIcon = !isUrl && thumbnail ? thumbnail : getFallbackIcon(name);

  return (
    <div
      className={`${className} grid place-items-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 ${textClassName} flex-shrink-0 select-none shadow-xs`}
    >
      {displayIcon}
    </div>
  );
}
