import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Globe, CalendarClock, ShieldCheck, MapPin } from "lucide-react";

import {
  LogoAWS,
  LogoMicrosoft,
  LogoCisco,
  LogoRedHat,
  LogoOracle,
  LogoCompTIA,
  LogoPearsonVUE,
} from "./CompanyMarquee";

/* Ordered list of logos to scroll */
const VENDOR_LOGOS: { name: string; Logo: (p: { h?: number }) => React.ReactNode }[] = [
  { name: "AWS",         Logo: LogoAWS },
  { name: "Microsoft",   Logo: LogoMicrosoft },
  { name: "Cisco",       Logo: LogoCisco },
  { name: "Red Hat",     Logo: LogoRedHat },
  { name: "Oracle",      Logo: LogoOracle },
  { name: "CompTIA",     Logo: LogoCompTIA },
  { name: "Pearson VUE", Logo: LogoPearsonVUE },
];

const CARDS = [
  { icon: MapPin,        title: "Tirunelveli Centre",   text: "Write global certification exams without leaving South Tamil Nadu." },
  { icon: Globe,         title: "Global Certifications", text: "Exams from 250+ vendors delivered under Pearson VUE standards." },
  { icon: ShieldCheck,   title: "Secure Exams",          text: "Monitored, compliant test environment with verified identity checks." },
  { icon: CalendarClock, title: "Flexible Booking",      text: "Choose your slot across weekdays and weekends, year round." },
];

export function PearsonBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pearson" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="panel relative overflow-hidden rounded-2xl p-8 md:p-12 border border-amber-500/30">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_70%)]" />

          <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="relative inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1">
                <span className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500 font-bold">
                  Official Certification Partner
                </span>
              </div>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Pearson VUE <span className="gradient-text">Authorized Test Center</span>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                iTech Academy is an authorized Pearson VUE centre — train and certify in the same
                place, with clearance for the world's leading vendor exams.
              </p>
            </div>

            {/* Scrolling vendor logo marquee — crisp original brand logos */}
            <div className="w-full max-w-md overflow-hidden py-4">
              <div
                className="flex w-max items-center gap-10"
                style={{ animation: "marquee 26s linear infinite" }}
              >
                {[...VENDOR_LOGOS, ...VENDOR_LOGOS].map(({ name, Logo }, i) => (
                  <div
                    key={`${name}-${i}`}
                    className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 px-5 shadow-xs hover:border-amber-500/40 transition-all duration-300"
                    title={name}
                  >
                    <div className="flex items-center justify-center text-foreground">
                      <Logo h={26} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={ref} className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, rotateY: -70 }}
                animate={inView ? { opacity: 1, rotateY: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.14 }}
                style={{ transformPerspective: 900 }}
                className="rounded-lg border border-border bg-card/70 p-4"
              >
                <c.icon className="h-4 w-4 text-primary" />
                <div className="mt-3 text-sm font-semibold">{c.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

