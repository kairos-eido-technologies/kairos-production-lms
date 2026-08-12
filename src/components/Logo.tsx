import logoSrc from "@/assets/logo.png";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoSrc}
        alt="iTech Academy"
        className="h-9 w-9 shrink-0 object-contain select-none"
        draggable={false}
      />
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight whitespace-nowrap text-foreground">
          iTech <span className="text-primary font-extrabold">Academy</span>
        </span>
      )}
    </div>
  );
}
