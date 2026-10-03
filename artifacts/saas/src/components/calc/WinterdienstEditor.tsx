import * as React from "react";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import type { ModuleFinding } from "@/lib/service-modules/plausibility";
import type { ModuleRates, WinterdienstConfig } from "@/lib/service-modules/types";
import { cn } from "@/lib/utils";
import { ModuleFindingsList } from "./ModuleFindingsList";
import { AdvancedCard } from "./winterdienst/AdvancedCard";
import { WinterAreasCard } from "./winterdienst/AreaTable";
import { MaterialTimesCard } from "./winterdienst/MaterialTimesCard";
import { PricingCard } from "./winterdienst/PricingCard";
import { RegionSeasonCard } from "./winterdienst/RegionSeasonCard";
import { ScenarioTable } from "./winterdienst/ScenarioTable";
import { WinterdienstKpis, WinterdienstResultCard, WinterdienstResultLines } from "./winterdienst/WinterdienstResultCard";
import { winterFindings } from "./winterdienst/winterdienst-ui";

export interface WinterdienstEditorProps {
  value: WinterdienstConfig;
  /** Immer eine neue Config (unveränderlich): `onChange({ ...value, … })`. */
  onChange: (next: WinterdienstConfig) => void;
  /** Objektsatz und Vollkosten (z. B. `econ.rates`). */
  rates: ModuleRates;
  /** Modul-Befunde des Objekts (alle oder nur Winterdienst; gefiltert wird hier). */
  findings?: readonly ModuleFinding[];
  /** `flow`: Karten untereinander (max-w-3xl). `sheet`: im ResponsiveSheet lg, Ergebnis ab md unten fixiert. */
  layout?: "flow" | "sheet";
  /** Ziel-Marge auf den Umsatz in %; Standard: aus den Einstellungen. */
  targetMarginPct?: number;
  readOnly?: boolean;
  className?: string;
}

/**
 * Winterdienst-Editor (§7.2): Region & Saison, Flächen, Streugut & Zeiten,
 * Preisgestaltung, Erweitert, Live-Ergebnis und Befunde.
 * Das Ergebnis rechnet `calcWinterdienst(value, rates)`; Befunde kommen vom Aufrufer.
 */
export function WinterdienstEditor({
  value,
  onChange,
  rates,
  findings,
  layout = "flow",
  targetMarginPct,
  readOnly = false,
  className,
}: WinterdienstEditorProps) {
  const result = React.useMemo(() => calcWinterdienst(value, rates), [value, rates]);
  const wdFindings = React.useMemo(() => winterFindings(findings), [findings]);
  const cardProps = { value, onChange, readOnly };

  const cards = (
    <>
      <RegionSeasonCard {...cardProps} />
      <WinterAreasCard {...cardProps} result={result} />
      <MaterialTimesCard {...cardProps} />
      <PricingCard {...cardProps} rates={rates} />
      <AdvancedCard {...cardProps} rates={rates} />
    </>
  );

  if (layout === "sheet") {
    return (
      <div className={cn("space-y-4", className)}>
        {cards}
        <section aria-label="Wetterszenarien je Saison" className="space-y-2">
          <h3 className="text-h3 text-foreground">Wetterszenarien je Saison</h3>
          <ScenarioTable result={result} targetMarginPct={targetMarginPct} />
        </section>
        <ModuleFindingsList findings={wdFindings} compact label="Hinweise zum Winterdienst" heading="Hinweise" />
        <section
          aria-label="Ergebnis Winterdienst"
          className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-raised md:sticky md:bottom-0 md:z-sticky"
        >
          <WinterdienstKpis result={result} targetMarginPct={targetMarginPct} />
          <WinterdienstResultLines result={result} />
        </section>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-3xl space-y-6", className)}>
      {cards}
      <WinterdienstResultCard result={result} targetMarginPct={targetMarginPct} />
      <ModuleFindingsList findings={wdFindings} label="Hinweise zum Winterdienst" heading="Hinweise zum Winterdienst" />
    </div>
  );
}
