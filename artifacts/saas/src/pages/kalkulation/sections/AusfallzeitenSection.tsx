import { CalendarOff } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Money } from "@/components/ui/money";
import { NativeSelect } from "@/components/ui/select";
import { BUNDESLAENDER } from "@/data/bundeslaender";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { CalcResultRow, Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { fmtHours, fmtPct } from "../constants";

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
      tooltip="Nicht jede bezahlte Stunde ist produktiv: Urlaub, Krankheit und Feiertage verringern die tatsächlich verfügbare Arbeitszeit. Der Ausfallzuschlag gleicht dies aus, damit Ihre kalkulierten Kosten die reale Leistung widerspiegeln."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="rate-weekly-hours" label="Wochenarbeitszeit">
          <NumberInput
            value={config.ausfallzeiten.weeklyHours}
            onChange={(v) => updateAusfall({ weeklyHours: v })}
            suffix="h/Woche"
          />
        </FormField>
        <FormField id="rate-bundesland" label="Bundesland (Feiertage)">
          <NativeSelect
            value={config.ausfallzeiten.bundeslandId}
            onChange={(e) => updateAusfall({ bundeslandId: e.target.value })}
          >
            {BUNDESLAENDER.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.feiertage2026} Tage)
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField id="rate-urlaub" label="Urlaubstage">
          <NumberInput
            value={config.ausfallzeiten.urlaubTage}
            onChange={(v) => updateAusfall({ urlaubTage: v })}
            suffix="Tage"
          />
        </FormField>
        <FormField id="rate-krankheit" label="Krankheitstage">
          <NumberInput
            value={config.ausfallzeiten.krankheitTage}
            onChange={(v) => updateAusfall({ krankheitTage: v })}
            suffix="Tage"
          />
        </FormField>
        <div className="space-y-1.5">
          <p id="rate-feiertage-label" className="text-label text-muted-foreground">
            Feiertage
          </p>
          <output
            aria-labelledby="rate-feiertage-label"
            className="flex h-10 items-center justify-end rounded-md border border-border bg-surface-sunken px-3 text-sm tabular-nums text-muted-foreground"
          >
            {bl?.feiertage2026 ?? 10} Tage
          </output>
        </div>
        <FormField id="rate-fortbildung" label="Fortbildung">
          <NumberInput
            value={config.ausfallzeiten.fortbildungTage}
            onChange={(v) => updateAusfall({ fortbildungTage: v })}
            suffix="Tage"
          />
        </FormField>
      </div>

      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Jahresarbeitsstunden</dt>
          <dd className="font-medium tabular-nums text-foreground">{fmtHours(breakdown.jahresArbeitsstunden)} h</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Ausfallstunden gesamt</dt>
          <dd className="font-medium tabular-nums text-foreground">−{fmtHours(breakdown.totalAusfallStunden)} h</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Produktivstunden</dt>
          <dd className="font-semibold tabular-nums text-primary">{fmtHours(breakdown.produktivStunden)} h</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <CalcResultRow label="Ausfallzuschlag" emphasis>
          × {fmtPct(breakdown.ausfallzuschlag)}
        </CalcResultRow>
        <CalcResultRow label="Lohnkosten inkl. Ausfall">
          <Money value={breakdown.lohnkostenMitAusfall} period="hour" />
        </CalcResultRow>
      </div>
    </Section>
  );
}
