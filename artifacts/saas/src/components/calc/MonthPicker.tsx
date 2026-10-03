import * as React from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ALL_MONTHS, formatSeason, monthShort, normalizeMonths } from "@/lib/service-modules/util";
import type { MonthIndex } from "@/lib/service-modules/types";
import { cn } from "@/lib/utils";

const MONTH_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const;

const WINTER_NOV_MAR: MonthIndex[] = [1, 2, 3, 11, 12];
const WINTER_OKT_APR: MonthIndex[] = [1, 2, 3, 4, 10, 11, 12];

export interface MonthPickerProps {
  value: readonly MonthIndex[] | undefined;
  onChange: (next: MonthIndex[]) => void;
  /** Legende der Feldgruppe, z. B. „Saison“. */
  label: string;
  /** Leere Auswahl zulassen (= ganzjährig, z. B. HMS-Leistungen). Sonst bleibt mindestens ein Monat gewählt. */
  allowEmpty?: boolean;
  /** Zusatztext unter der Vorschau (z. B. „Richtwert Nov–Mär“). */
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

function sameMonths(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((m, i) => m === b[i]);
}

/**
 * Monatsauswahl: 12 Chips „Jan…Dez“, Schnellwahl „Nov–Mär“, „Okt–Apr“,
 * „Ganzjährig“ und eine Live-Vorschau („Nov–Mär · 5 Monate“).
 */
export function MonthPicker({ value, onChange, label, allowEmpty = false, hint, disabled, className }: MonthPickerProps) {
  const months = React.useMemo(() => normalizeMonths(value), [value]);
  const previewId = React.useId();
  const allMonths = ALL_MONTHS as MonthIndex[];
  const yearRound: MonthIndex[] = allowEmpty ? [] : [...allMonths];

  const set = (next: readonly number[]) => {
    const normalized = normalizeMonths(next);
    if (!allowEmpty && normalized.length === 0) return;
    if (sameMonths(normalized, months)) return;
    onChange(normalized);
  };

  const isYearRound = months.length === 12 || (allowEmpty && months.length === 0);
  const preview = months.length === 0 ? "ganzjährig" : formatSeason(months);
  const count = months.length === 0 ? 12 : months.length;

  const quick: { label: string; months: MonthIndex[]; active: boolean }[] = [
    { label: "Nov–Mär", months: WINTER_NOV_MAR, active: sameMonths(months, WINTER_NOV_MAR) },
    { label: "Okt–Apr", months: WINTER_OKT_APR, active: sameMonths(months, WINTER_OKT_APR) },
    { label: "Ganzjährig", months: yearRound, active: isYearRound },
  ];

  return (
    <fieldset className={cn("min-w-0 space-y-2", className)} disabled={disabled} aria-describedby={previewId}>
      <legend className="mb-2 text-label text-muted-foreground">{label}</legend>
      <ToggleGroup
        type="multiple"
        variant="chip"
        size="sm"
        value={months.map(String)}
        onValueChange={(v) => set(v.map(Number))}
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
        disabled={disabled}
      >
        {allMonths.map((m) => (
          <ToggleGroupItem key={m} value={String(m)} aria-label={MONTH_LONG[m - 1]} className="w-full justify-center px-0">
            {monthShort(m)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex flex-wrap items-center gap-2">
        {quick.map((q) => (
          <Button
            key={q.label}
            type="button"
            size="sm"
            variant={q.active ? "tonal" : "ghost"}
            aria-pressed={q.active}
            disabled={disabled}
            onClick={() => set(q.months)}
          >
            {q.label}
          </Button>
        ))}
      </div>
      <p id={previewId} className="text-xs text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground">{preview}</span>
        {` · ${count} ${count === 1 ? "Monat" : "Monate"}`}
        {hint != null && hint !== "" && <span className="block">{hint}</span>}
      </p>
    </fieldset>
  );
}
