import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import type { Tone } from "@/lib/status";

type StatTone = "default" | "primary" | "success" | "warning" | "destructive";

const toneMap: Record<StatTone, Tone | "brand" | undefined> = {
  default: undefined,
  primary: "brand",
  success: "success",
  warning: "warning",
  destructive: "critical",
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  className?: string;
}

/**
 * Einzelne Kennzahl-Kachel (Altbestand-API). Intern ein `Kpi` in einer `Card`.
 * Für mehrere Kennzahlen nebeneinander besser `KpiGroup` verwenden.
 */
export function StatTile({ label, value, hint, tone = "default", className }: StatTileProps) {
  return (
    <Card padding="sm" className={className}>
      <Kpi label={label} value={value} hint={hint} tone={toneMap[tone]} emphasis="secondary" />
    </Card>
  );
}
