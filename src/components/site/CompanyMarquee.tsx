import React from "react";

/* ─── Official Certification Partner Logos ─── */

export function LogoAWS({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 76 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="38"
        y="16"
        textAnchor="middle"
        fontFamily="'Amazon Ember', 'Arial Black', Arial, sans-serif"
        fontSize="19"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        aws
      </text>
      <path
        d="M 10 20 Q 38 27 64 20"
        stroke="#FF9900"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 61 18 L 65 20 L 61 22"
        stroke="#FF9900"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoMicrosoft({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 120 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="3.5" width="10" height="10" fill="#F25022" />
      <rect x="11.5" y="3.5" width="10" height="10" fill="#7FBA00" />
      <rect x="0" y="15" width="10" height="10" fill="#00A4EF" />
      <rect x="11.5" y="15" width="10" height="10" fill="#FFB900" />
      <text
        x="28"
        y="19"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontSize="16"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="-0.2"
      >
        Microsoft
      </text>
    </svg>
  );
}

export function LogoCisco({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 85 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="#00BCEB">
        <rect x="36" y="0" width="4" height="11" rx="2" />
        <rect x="27" y="3" width="4" height="9" rx="2" />
        <rect x="45" y="3" width="4" height="9" rx="2" />
        <rect x="18" y="6" width="4" height="7" rx="2" />
        <rect x="54" y="6" width="4" height="7" rx="2" />
        <rect x="9" y="8.5" width="4" height="5.5" rx="1.5" />
        <rect x="63" y="8.5" width="4" height="5.5" rx="1.5" />
      </g>
      <text
        x="42"
        y="26"
        textAnchor="middle"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="13"
        fontWeight="900"
        fill="#00BCEB"
        letterSpacing="1.8"
      >
        CISCO
      </text>
    </svg>
  );
}

export function LogoCompTIA({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 118 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14 5 A9 9 0 1 0 14 23 L14 19.5 A5.5 5.5 0 1 1 14 8.5 Z" fill="#C8202F" />
      <rect x="15" y="12.5" width="6" height="3" fill="#C8202F" rx="0.8" />
      <rect x="16.5" y="11" width="3" height="6" fill="#C8202F" rx="0.8" />
      <text
        x="27"
        y="19"
        fontFamily="Arial, sans-serif"
        fontSize="15"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="0.3"
      >
        CompTIA
      </text>
    </svg>
  );
}

export function LogoOracle({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 105 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 5H3.2C1.4 5 0 6.4 0 8.2v11.6C0 21.6 1.4 23 3.2 23H11c1.8 0 3.2-1.4 3.2-3.2V8.2C14.2 6.4 12.8 5 11 5zm0 14H3.2V9H11v10z"
        fill="#F80000"
      />
      <text
        x="21"
        y="19"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="15"
        fontWeight="900"
        fill="#F80000"
        letterSpacing="1"
      >
        ORACLE
      </text>
    </svg>
  );
}

export function LogoRedHat({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 112 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="14" cy="19" rx="12" ry="3.8" fill="#EE0000" />
      <path d="M4 19 Q6 9 14 8 Q22 9 24 19 Z" fill="#EE0000" />
      <ellipse cx="14" cy="8" rx="5" ry="2" fill="#B30000" />
      <ellipse cx="14" cy="19" rx="12" ry="3.8" fill="none" stroke="#B30000" strokeWidth="0.6" />
      <text
        x="32"
        y="19"
        fontFamily="Arial, sans-serif"
        fontSize="15"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="0.3"
      >
        Red Hat
      </text>
    </svg>
  );
}

export function LogoPaloAlto({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 125 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="4" width="4" height="20" fill="#FA582D" rx="1" />
      <rect x="6" y="8" width="4" height="16" fill="#FA582D" rx="1" />
      <rect x="12" y="12" width="4" height="12" fill="#FA582D" rx="1" />
      <text
        x="22"
        y="19"
        fontFamily="Arial, sans-serif"
        fontSize="14"
        fontWeight="800"
        fill="currentColor"
        letterSpacing="0.2"
      >
        paloalto
      </text>
    </svg>
  );
}

export function LogoFortinet({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 120 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="4" width="8" height="8" fill="#EE3124" />
      <rect x="10" y="4" width="8" height="8" fill="#EE3124" />
      <rect x="0" y="14" width="8" height="8" fill="#EE3124" />
      <rect x="10" y="14" width="8" height="8" fill="#EE3124" />
      <text
        x="24"
        y="20"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="15"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="0.5"
      >
        FORTINET
      </text>
    </svg>
  );
}

export function LogoPearsonVUE({ h = 28 }: { h?: number }) {
  return (
    <svg
      height={h}
      viewBox="0 0 140 28"
      fill="none"
      className="w-auto block"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="2" width="24" height="24" rx="5" fill="#005A8B" />
      <text x="5" y="21" fontFamily="Georgia, serif" fontSize="18" fontWeight="900" fill="white">
        P
      </text>
      <text
        x="32"
        y="19"
        fontFamily="Arial, sans-serif"
        fontSize="14"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="0.2"
      >
        Pearson
      </text>
      <text
        x="94"
        y="19"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontSize="14"
        fontWeight="900"
        fill="#005A8B"
        letterSpacing="0.5"
      >
        VUE
      </text>
    </svg>
  );
}

/* Official Certification Partners */
export const COMPANY_LOGOS = [
  { name: "AWS", Logo: LogoAWS },
  { name: "Microsoft", Logo: LogoMicrosoft },
  { name: "Cisco", Logo: LogoCisco },
  { name: "CompTIA", Logo: LogoCompTIA },
  { name: "Oracle", Logo: LogoOracle },
  { name: "Red Hat", Logo: LogoRedHat },
  { name: "Palo Alto Networks", Logo: LogoPaloAlto },
  { name: "Fortinet", Logo: LogoFortinet },
  { name: "Pearson VUE", Logo: LogoPearsonVUE },
];

export function CompanyMarquee() {
  return (
    <section
      aria-label="Certification Partners"
      className="relative w-full overflow-hidden py-10 bg-card/20 border-y border-border/40 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl px-6 mb-5 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
          CERTIFICATION PARTNERS
        </span>
      </div>

      {/* Infinite Scrolling Container with Left & Right Gradient Fade */}
      <div className="relative w-full overflow-hidden">
        {/* Left/Right mask gradients */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

        <div
          className="flex w-max items-center gap-6 sm:gap-8 py-2"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {[...COMPANY_LOGOS, ...COMPANY_LOGOS].map(({ name, Logo }, i) => (
            <div
              key={`${name}-${i}`}
              className="flex h-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/90 px-7 shadow-xs hover:border-primary/50 hover:bg-background transition-all duration-300 group cursor-default"
              title={name}
            >
              <div className="flex items-center justify-center text-foreground">
                <Logo h={28} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
