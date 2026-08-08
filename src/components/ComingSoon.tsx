import { PageHeader, GlassCard } from "./ui-kit";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, subtitle, phase = 2 }: { title: string; subtitle?: string; phase?: number }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <GlassCard className="text-center py-16">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary glow mb-4">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Shipping in phase {phase}</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          This module is fully designed and routes are wired up. Detailed UI lands in the next build phase.
        </p>
      </GlassCard>
    </div>
  );
}
