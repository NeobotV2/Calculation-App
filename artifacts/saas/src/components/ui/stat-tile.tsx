import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "primary" | "success" | "warning" | "destructive";

const toneClass: Record<StatTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  className?: string;
}

/**
 * Einheitliche KPI-/Kennzahlen-Kachel. Ersetzt das auf Start-, Objekt- und
 * Auswertungsseiten dutzendfach kopierte Karten-Markup
 * (`bg-card border border-border/30 rounded-2xl p-4` + winziges Uppercase-Label).
 */
export function StatTile({ label, value, hint, tone = "default", className }: StatTileProps) {
  return (
    <div className={cn("rounded-2xl border border-border/30 bg-card p-4 shadow-[var(--shadow-card)]", className)}>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", toneClass[tone])}>{value}</p>
      {hint != null && hint !== "" && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
