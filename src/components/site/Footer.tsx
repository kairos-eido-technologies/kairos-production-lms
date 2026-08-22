import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="relative border-t border-border/80 py-12 bg-background/50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Tirunelveli's tech training command centre — professional courses, global
              certifications and placement support under one roof.
            </p>
          </div>

          <div className="grid gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <a href="#courses" className="transition-colors hover:text-primary">
              Courses
            </a>
            <a href="#pearson" className="transition-colors hover:text-primary">
              Certifications
            </a>
            <a href="#why" className="transition-colors hover:text-primary">
              Why iTech
            </a>
            <a href="tel:+919876543210" className="transition-colors hover:text-primary">
              Contact
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Kairos Eido Technologies</span>
          <span>Tirunelveli · Tamil Nadu · India</span>
        </div>
      </div>
    </footer>
  );
}
