import { ArrowRight } from "lucide-react";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

export interface MonthlyPriceChangeProps {
  /** Monatspreis netto vor der Änderung (gespeicherter Stand). */
  before: number;
  /** Monatspreis netto mit den Eingaben im Editor. */
  after: number;
  className?: string;
}

/**
 * „Monatspreis netto {alt} → {neu} {±Δ}“ in der Fußleiste eines Editor-Sheets
 * (keine stillen Preisänderungen). Ab sm links neben den Buttons.
 */
export function MonthlyPriceChange({ before, after, className }: MonthlyPriceChangeProps) {
  const delta = after - before;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground sm:order-first sm:mr-auto", className)}>
      <span>Monatspreis netto</span>
      <Money value={before} className="text-foreground" />
      <ArrowRight aria-hidden="true" className="size-4" />
      <span className="sr-only">neu</span>
      <Money value={after} className="font-semibold text-foreground" />
      {Math.abs(delta) >= 0.005 && <Money value={delta} size="sm" signed className="text-muted-foreground" />}
    </p>
  );
}
