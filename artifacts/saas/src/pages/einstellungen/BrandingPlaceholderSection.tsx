import { Building2 } from "lucide-react";
import { isPaidPlan, type PlanId } from "@/lib/billing-config";
import { ProLock } from "./ProLock";

interface BrandingPlaceholderSectionProps {
  plan: PlanId;
  onUpgrade: () => void;
}

/** Branding placeholder section (logo upload "coming soon"), gated behind Pro plan. */
export function BrandingPlaceholderSection({ plan, onUpgrade }: BrandingPlaceholderSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <Building2 size={16} /> Branding
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
        <div className={`space-y-5 ${!isPaidPlan(plan) ? "opacity-30 select-none pointer-events-none" : ""}`}>
          <div>
            <span className="text-sm font-medium text-foreground mb-2 block">Firmenlogo (für PDF)</span>
            <div className="w-full h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-sm text-muted-foreground bg-background">
              Logo-Upload (demnächst verfügbar)
            </div>
          </div>
        </div>
        {!isPaidPlan(plan) && (
          <ProLock
            title="Eigenes Firmenbranding"
            description="Ihr Logo und Ihre CI auf allen Dokumenten — für einen professionellen Auftritt."
            onUpgrade={onUpgrade}
          />
        )}
      </div>
    </section>
  );
}
