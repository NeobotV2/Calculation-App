import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WARNING_TYPES } from "@/lib/warnings";

interface WarningsSectionProps {
  targetMarginLocal: string;
  setTargetMarginLocal: (v: string) => void;
  targetMarginStore: number;
  setTargetMarginAction: (v: number) => void;
  disabledWarnings: string[];
  setDisabledWarnings: (warnings: string[]) => void;
}

/** Plausibility warnings: target margin input and per-warning toggles. */
export function WarningsSection({
  targetMarginLocal,
  setTargetMarginLocal,
  targetMarginStore,
  setTargetMarginAction,
  disabledWarnings,
  setDisabledWarnings,
}: WarningsSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <AlertTriangle size={16} /> Warnhinweise
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label htmlFor="setting-target-margin" className="text-sm font-medium text-foreground">Ziel-Marge (%)</label>
          <p id="setting-target-margin-hint" className="text-xs text-muted-foreground">Objekte mit einer Marge unter diesem Wert erhalten eine Warnung.</p>
          <Input
            id="setting-target-margin"
            aria-describedby="setting-target-margin-hint"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            value={targetMarginLocal}
            onChange={(e) => setTargetMarginLocal(e.target.value)}
            onBlur={() => {
              const val = parseFloat(targetMarginLocal);
              if (!isNaN(val) && val >= 0 && val <= 100) {
                setTargetMarginAction(val);
              } else {
                setTargetMarginLocal(String(targetMarginStore));
              }
            }}
            className="bg-background h-11 w-32"
          />
        </div>
        <div className="border-t border-border/30 pt-3">
          <p className="text-xs text-muted-foreground mb-2">Einzelne Warnhinweise deaktivieren. Deaktivierte Warnungen werden nicht mehr angezeigt.</p>
        </div>
        {WARNING_TYPES.map((wt) => {
          const isDisabled = disabledWarnings.includes(wt.key);
          return (
            <label key={wt.key} className="flex items-center justify-between py-2 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wt.severity === "critical" ? "bg-destructive" : wt.severity === "warning" ? "bg-warning" : "bg-info"}`} />
                <span className="text-sm text-foreground">{wt.label}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!isDisabled}
                onClick={() => {
                  if (isDisabled) {
                    setDisabledWarnings(disabledWarnings.filter((k) => k !== wt.key));
                  } else {
                    setDisabledWarnings([...disabledWarnings, wt.key]);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!isDisabled ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isDisabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </label>
          );
        })}
      </div>
    </section>
  );
}
