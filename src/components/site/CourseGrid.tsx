import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronDown, Lock, Unlock, Search, Zap } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { HoloGrid } from "@/components/effects/HoloGrid";

const ACCENTS = [
  "var(--hud-indigo)",
  "var(--hud-amber)",
  "var(--hud-emerald)",
  "var(--hud-cyan)",
  "var(--hud-purple)",
  "var(--hud-rose)",
];

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  try {
    const urlObj = new URL(cleanUrl);
    if (urlObj.hostname === "youtu.be") {
      const id = urlObj.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (urlObj.hostname.includes("youtube.com")) {
      if (urlObj.pathname.startsWith("/shorts/")) {
        const id = urlObj.pathname.split("/")[2];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const id = urlObj.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (urlObj.pathname.startsWith("/embed/")) return cleanUrl;
    }
    if (urlObj.hostname.includes("vimeo.com")) {
      const m = urlObj.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch {
    const m = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/i);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function Syllabus({ sections }: { sections: any[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<string | null>(null);

  if (!sections || sections.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-2">Syllabus coming soon.</p>;
  }

  return (
    <div className="mt-4 space-y-2">
      {sections.map((section: any) => {
        const isOpen = open === section.id;
        const items = Array.isArray(section.items) ? section.items : [];
        return (
          <div key={section.id} className="rounded-sm border border-border/80 bg-background/50">
            <button
              onClick={() => {
                setOpen(isOpen ? null : section.id);
                if (!isOpen) {
                  setUnlocked(section.id);
                  window.setTimeout(() => setUnlocked(null), 700);
                }
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left cursor-pointer"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                {section.title}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <ul className="space-y-1.5 px-3 pb-3">
                {items.map((item: any) => {
                  const flash = unlocked === section.id;
                  const isLocked = item.is_locked ?? item.isLocked ?? true;
                  const Icon = isLocked && !flash ? Lock : Unlock;
                  return (
                    <li key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                      <Icon
                        className="h-3 w-3 shrink-0 transition-colors duration-300"
                        style={{ color: flash ? "var(--success)" : undefined }}
                      />
                      <span className="text-foreground/80">{item.title}</span>
                      <span className="data-chip ml-auto shrink-0 text-[9px] text-muted-foreground">
                        {item.kind || "module"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CourseCard({ course, index }: { course: any; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const accent = ACCENTS[index % ACCENTS.length]!;

  const isAws = course.code === "AWS-CP-101" || course.name?.toLowerCase().includes("aws");
  const isC = course.code === "C-1" || course.name?.toLowerCase().includes("c programming");
  const isJava = course.code === "JPC" || course.name?.toLowerCase().includes("java");

  const description = course.description || (
    isAws ? "Master Cloud Computing essentials, AWS VPC, EC2, IAM, S3, Lambda, CloudWatch & CloudTrail with hands-on architecture labs." :
    isC ? "Foundational programming concepts covering C syntax, control structures, functions, pointers, arrays & file handling." :
    isJava ? "Object-Oriented Programming (OOP) principles, Java syntax, error handling, arrays & real-world file manipulation." :
    "Comprehensive hands-on curriculum with practical projects and expert mentorship."
  );

  const badgeTag = course.badgeTag || course.badge_tag || (
    isAws ? "AWS CERTIFIED" : isC ? "CORE C" : isJava ? "JAVA OOP" : "COURSE"
  );
  const featuredBadgeText = course.featuredBadgeText || course.featured_badge_text || (isAws ? "🔥 POPULAR" : undefined);
  const durationText = course.durationText || course.duration_text || "8 Weeks · Hands-on";
  const projectsText = course.projectsText || course.projects_text || (isAws ? "Cloud Labs & Demos" : "Practical Code Labs");
  const videoUrl = course.previewVideoUrl || course.preview_video_url;
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;
  const techStack = Array.isArray(course.techStack) && course.techStack.length > 0
    ? course.techStack.map((t: any) => (typeof t === "string" ? t : t?.name || ""))
    : Array.isArray(course.tech_stack) && course.tech_stack.length > 0
    ? course.tech_stack
    : (isAws ? ["AWS", "VPC", "EC2", "IAM", "S3", "Lambda"] : isC ? ["C Syntax", "Pointers", "Arrays", "File I/O"] : isJava ? ["Java", "OOP", "Classes", "Exceptions"] : ["Interactive", "Certified"]);

  const sections = Array.isArray(course.sections) ? course.sections : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1 }}
      className="relative"
    >
      <div
        ref={ref}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="panel relative overflow-hidden rounded-xl p-5 transition-[box-shadow,border-color,transform] duration-300 flex flex-col justify-between h-full hover:-translate-y-1"
        style={{
          borderColor: hover ? accent : undefined,
          boxShadow: hover
            ? `0 0 0 1px ${accent}, 0 0 34px -6px ${accent}, var(--shadow-panel)`
            : undefined,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            opacity: hover && !reduced ? 1 : 0,
            background:
              "radial-gradient(400px circle at var(--gx,50%) var(--gy,50%), color-mix(in oklab, var(--foreground) 10%, transparent), transparent 60%)",
          }}
        />
        {hover && !reduced && (
          <motion.div
            aria-hidden="true"
            initial={{ y: "-100%" }}
            animate={{ y: "220%" }}
            transition={{ duration: 1.1, ease: "linear" }}
            className="pointer-events-none absolute inset-x-0 top-0 h-16"
            style={{ background: `linear-gradient(to bottom, transparent, ${accent}33, transparent)` }}
          />
        )}

        <div>
          <div className="relative flex items-center justify-between gap-3">
            <span className="data-chip font-bold" style={{ color: accent, borderColor: `${accent}55` }}>
              {badgeTag}
            </span>
            {featuredBadgeText && (
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 8px ${accent}`, animation: reduced ? undefined : "pulse 1.8s infinite" }}
                />
                {featuredBadgeText}
              </span>
            )}
          </div>

          <h3 className="relative mt-4 text-lg font-bold tracking-tight text-foreground">{course.name}</h3>
          {description && (
            <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}

          {videoUrl && (
            <div
              className="relative mt-4 overflow-hidden rounded-lg border p-1 bg-black/40"
              style={{ borderColor: `${accent}77`, boxShadow: `0 0 22px -6px ${accent}` }}
            >
              {embedUrl ? (
                <div className="relative aspect-video rounded overflow-hidden">
                  <iframe src={embedUrl} title={`${course.name} preview`} className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-md max-h-48 object-cover"
                />
              )}
            </div>
          )}

          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {techStack.map((tech: string, ti: number) => (
              <span
                key={tech}
                className="data-chip transition-[color,border-color,box-shadow] duration-300"
                style={
                  hover && !reduced
                    ? {
                        color: accent,
                        borderColor: `${accent}66`,
                        boxShadow: `0 0 10px -2px ${accent}`,
                        transitionDelay: `${ti * 70}ms`,
                      }
                    : undefined
                }
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border/80">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>{durationText}</span>
            <span>{projectsText}</span>
          </div>

          <button
            onClick={() => setShowSyllabus((v) => !v)}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-border py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/60 hover:text-primary cursor-pointer"
          >
            {showSyllabus ? "Hide Syllabus" : "View Syllabus"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-300 ${showSyllabus ? "rotate-180" : ""}`}
            />
          </button>

          {showSyllabus && (
            <div className="relative">
              <Syllabus sections={sections} />
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function CourseGrid({ courses }: { courses: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = courses.filter((c) => {
    if (!c) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const text = [
      c.name || "",
      c.code || "",
      c.description || "",
      c.badgeTag || c.badge_tag || "",
      Array.isArray(c.techStack) ? c.techStack.map((t: any) => (typeof t === "string" ? t : t?.name || "")).join(" ") : "",
      Array.isArray(c.tech_stack) ? c.tech_stack.join(" ") : "",
    ].join(" ").toLowerCase();
    return text.includes(q);
  });

  return (
    <section id="courses" className="relative overflow-hidden py-20">
      <HoloGrid />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="data-chip text-primary">MODULE // CATALOG</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Programs on the <span className="gradient-text">launch pad</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Industry-mapped curriculum, live projects and certification tracks — taught by
              practising engineers in Tirunelveli.
            </p>
          </div>

          <div className="w-full md:w-72 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-md text-xs font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="flex flex-wrap gap-1">
              {["All", "React", "Python", "Java", "AWS"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag === "All" ? "" : tag)}
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold cursor-pointer transition-all ${
                    (tag === "All" && !searchQuery) || searchQuery.toLowerCase() === tag.toLowerCase()
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course, i) => (
            <CourseCard key={course.id || i} course={course} index={i} />
          ))}
        </div>
        {filteredCourses.length === 0 && (
          <div className="mt-12 text-center py-12 border border-dashed border-border rounded-2xl bg-card/20">
            <p className="font-mono text-sm text-muted-foreground">
              NO ACTIVE COURSES MATCHING "{searchQuery}".
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
