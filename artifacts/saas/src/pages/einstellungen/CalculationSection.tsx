import { Calculator, Save, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FREQUENCY_LABELS } from "@/lib/calc";
import type { FrequencyKey } from "@/store/use-store";

interface CalculationSectionProps {
  rate: string;
  setRate: (v: string) => void;
  vat: string;
  setVat: (v: string) => void;
  freq: FrequencyKey;
  setFreq: (v: FrequencyKey) => void;
  isSaving: boolean;
  onSave: () => void;
  onOpenRateCalculator: () => void;
}

/** Presentational form for calculation defaults (rate, MwSt, frequency). */
export function CalculationSection({
  rate,
  setRate,
  vat,
  setVat,
  freq,
  setFreq,
  isSaving,
  onSave,
  onOpenRateCalculator,
}: CalculationSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <Calculator size={16} /> Kalkulation
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
        <div>
          <label htmlFor="setting-rate" className="text-sm font-medium text-foreground mb-2 block">Standard-Verrechnungssatz (€/h)</label>
          <div className="flex gap-2">
            <Input id="setting-rate" aria-describedby="setting-rate-hint" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="bg-background border-border/50 h-12 flex-1" />
            <button
              onClick={onOpenRateCalculator}
              className="h-12 px-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 text-primary hover:bg-primary/15 transition-colors shrink-0"
            >
              <Calculator size={16} aria-hidden="true" />
              <span className="text-sm font-medium">Kalkulieren</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
          <p id="setting-rate-hint" className="text-xs text-muted-foreground mt-1.5 ml-1">
            Nutzen Sie den Kalkulator für eine professionelle Verrechnungssatz-Berechnung.
          </p>
        </div>
        <FormField
          id="setting-vat"
          label="MwSt.-Satz (%)"
          hint="Wird auf dem PDF-Angebot ausgewiesen. 0 = keine MwSt."
        >
          <Input value={vat} onChange={(e) => setVat(e.target.value)} inputMode="decimal" placeholder="0 = ohne MwSt." className="bg-background border-border/50 h-12" />
        </FormField>
        <div>
          <label htmlFor="setting-frequency" className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
            <Clock size={14} aria-hidden="true" /> Standard-Reinigungshäufigkeit
          </label>
          <select
            id="setting-frequency"
            value={freq}
            onChange={(e) => setFreq(e.target.value as FrequencyKey)}
            className="w-full h-12 rounded-xl border border-border/50 bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
          >
            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="pt-2">
          <Button onClick={onSave} className="w-full" disabled={isSaving}>
            <Save size={18} className="mr-2" /> Änderungen speichern
          </Button>
        </div>
      </div>
    </section>
  );
}
