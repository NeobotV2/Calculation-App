import { CalendarOff } from "lucide-react";
import { formatEuro } from "@/lib/utils";
import { BUNDESLAENDER } from "@/data/bundeslaender";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { fmtPct } from "../constants";

export function AusfallzeitenSection({
  config,
  breakdown,
  open,
  onToggle,
  updateAusfall,
  bl,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
  open: boolean;
  onToggle: () => void;
  updateAusfall: (patch: Partial<HourlyRateConfig["ausfallzeiten"]>) => void;
  bl: (typeof BUNDESLAENDER)[number] | undefined;
}) {
  return (
    <Section
      title="Ausfallzeiten"
      icon={CalendarOff}
      open={open}
      onToggle={onToggle}
      badge={`${fmtPct(breakdown.produktivitaetsquote * 100)} % produktiv`}
      tooltip="Produktive Zeit: Nicht jede bezahlte Stunde ist produktiv — Urlaub, Krankheit und Feiertage reduzieren die tatsächlich verfügbare Arbeitszeit. Der Ausfallzuschlag gleicht dies aus, damit Ihre kalkulierten Kosten die reale Leistung widerspiegeln."
    >
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Wochenarbeitszeit
        </label>
        <NumberInput
          value={config.ausfallzeiten.weeklyHours}
          onChange={(v) => updateAusfall({ weeklyHours: v })}
          suffix="h/Woche"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Bundesland (Feiertage)
        </label>
        <select
          value={config.ausfallzeiten.bundeslandId}
          onChange={(e) => updateAusfall({ bundeslandId: e.target.value })}
          className="w-full h-11 rounded-xl border border-border/50 bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
        >
          {BUNDESLAENDER.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.feiertage2026} Tage)
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Urlaubstage
          </label>
          <NumberInput
            value={config.ausfallzeiten.urlaubTage}
            onChange={(v) => updateAusfall({ urlaubTage: v })}
            suffix="Tage"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Krankheitstage
          </label>
          <NumberInput
            value={config.ausfallzeiten.krankheitTage}
            onChange={(v) => updateAusfall({ krankheitTage: v })}
            suffix="Tage"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Feiertage
          </label>
          <div className="h-11 rounded-xl border border-border/50 bg-background/50 px-4 flex items-center text-sm text-muted-foreground">
            {bl?.feiertage2026 ?? 10} Tage
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Fortbildung
          </label>
          <NumberInput
            value={config.ausfallzeiten.fortbildungTage}
            onChange={(v) => updateAusfall({ fortbildungTage: v })}
            suffix="Tage"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Jahresarbeitsstunden
          </span>
          <span className="text-foreground font-medium">
            {breakdown.jahresArbeitsstunden.toLocaleString("de-DE")} h
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Ausfallstunden gesamt
          </span>
          <span className="text-foreground font-medium">
            − {breakdown.totalAusfallStunden.toLocaleString("de-DE")} h
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Produktivstunden</span>
          <span className="text-primary font-bold">
            {breakdown.produktivStunden.toLocaleString("de-DE")} h
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          Ausfallzuschlag
        </span>
        <span className="text-sm font-bold text-primary">
          × {fmtPct(breakdown.ausfallzuschlag)}
        </span>
      </div>
      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          Lohnkosten inkl. Ausfall
        </span>
        <span className="text-sm font-bold text-foreground">
          {formatEuro(breakdown.lohnkostenMitAusfall)} €/h
        </span>
      </div>
    </Section>
  );
}
