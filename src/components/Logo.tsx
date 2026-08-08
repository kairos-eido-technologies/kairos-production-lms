import logoSrc from "@/assets/logo.png";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoSrc}
        alt="Tech Academy"
        className="h-9 w-9 shrink-0 object-contain select-none"
        draggable={false}
      />
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight whitespace-nowrap text-foreground">
          Tech Academy
        </span>
      )}
    </div>
  );
}
