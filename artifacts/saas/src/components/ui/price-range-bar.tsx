import * as React from "react";
import { cn, formatCurrency } from "@/lib/utils";

export interface PriceRangeBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Mindestpreis (Vollkosten). */
  min: number;
  /** Aktueller Preis. */
  current: number;
  /** Zielpreis (Vollkosten + Zielmarge). */
  target: number;
}

function clampPct(v: number) {
  return Math.max(0, Math.min(100, v));
}

/**
 * Preis-Einordnung in drei Zonen: unter Mindestpreis · Mindest- bis Zielpreis
 * · über Zielpreis. Die Werte stehen als Text darunter (Farbe ist nie allein
 * Informationsträger).
 */
export function PriceRangeBar({ min, current, target, className, ...props }: PriceRangeBarProps) {
  const safeMin = Number.isFinite(min) ? Math.max(0, min) : 0;
  const safeTarget = Number.isFinite(target) ? Math.max(safeMin, target) : safeMin;
  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;

  const lo = Math.min(safeMin, safeCurrent) * 0.85;
  const hiBase = Math.max(safeTarget, safeCurrent);
  const hi = hiBase > 0 ? hiBase * 1.15 : 1;
  const span = hi - lo || 1;
  const pos = (v: number) => clampPct(((v - lo) / span) * 100);

  const minPct = pos(safeMin);
  const targetPct = pos(safeTarget);
  const currentPct = pos(safeCurrent);

  const ariaLabel = `Ihr Preis ${formatCurrency(safeCurrent)}, Mindestpreis ${formatCurrency(safeMin)}, Zielpreis ${formatCurrency(safeTarget)}`;

  return (
    <div role="img" aria-label={ariaLabel} className={cn("w-full", className)} {...props}>
      <div className="relative pt-1 pb-1">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-border">
          <div className="h-full bg-destructive-soft" style={{ width: `${minPct}%` }} />
          <div className="h-full bg-warning-soft" style={{ width: `${Math.max(0, targetPct - minPct)}%` }} />
          <div className="h-full flex-1 bg-success-soft" />
        </div>
        {/* Zonengrenzen */}
        <div className="absolute inset-y-0 w-px bg-border-strong" style={{ left: `${minPct}%` }} />
        <div className="absolute inset-y-0 w-px bg-border-strong" style={{ left: `${targetPct}%` }} />
        {/* Marker: aktueller Preis */}
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow-raised"
          style={{ left: `${currentPct}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <div>Mindestpreis</div>
          <div className="font-medium tabular-nums text-foreground">{formatCurrency(safeMin)}</div>
        </div>
        <div className="text-center">
          <div>Ihr Preis</div>
          <div className="font-semibold tabular-nums text-foreground">{formatCurrency(safeCurrent)}</div>
        </div>
        <div className="text-right">
          <div>Zielpreis</div>
          <div className="font-medium tabular-nums text-foreground">{formatCurrency(safeTarget)}</div>
        </div>
      </div>
    </div>
  );
}
