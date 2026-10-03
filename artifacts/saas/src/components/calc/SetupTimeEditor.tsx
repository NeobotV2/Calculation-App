import * as React from "react";
import { Car, Clock, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { NumberInput } from "@/components/ui/number-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatNumber } from "@/lib/utils";
import type { Room } from "@/store/use-store";
import { RoomsFooterRow } from "./rooms/RoomsTable";
import { setupTimeHours, visitsPerMonth } from "./rooms/rooms-editor-logic";

/** Schnellwahl in Minuten je Einsatz. */
export const SETUP_TIME_PRESETS = [0, 10, 15, 20, 30] as const;
/** Obergrenze der Eingabe (Minuten je Einsatz). */
const MAX_MINUTES = 480;

export interface SetupTimeValue {
  ruestzeit: number;
  wegezeit: number;
}

export interface SetupTimeEditorProps {
  /** Rüstzeit in Minuten je Einsatz. */
  ruestzeit: number;
  /** Wegezeit in Minuten je Einsatz. */
  wegezeit: number;
  onChange: (value: SetupTimeValue) => void;
  /** Räume – der höchste Turnus bestimmt die Einsätze je Monat. */
  rooms: Room[];
  /** Verrechnungssatz in €/h. */
  rate: number;
  /** Rüstzeit ist der Standardwert (Tag „Standardwert“). */
  isDefault?: boolean;
  /** Zwei editierbare Fußzeilen für den `RoomsEditor` (`footer`). */
  compact?: boolean;
  readOnly?: boolean;
  className?: string;
}

const FIELDS: {
  key: keyof SetupTimeValue;
  label: string;
  compactLabel: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    key: "ruestzeit",
    label: "Rüstzeit je Einsatz",
    compactLabel: "Rüstzeit",
    hint: "Ankommen, Material holen, Umziehen, Aufräumen am Ende",
    icon: Clock,
  },
  {
    key: "wegezeit",
    label: "Wegezeit je Einsatz",
    compactLabel: "Wegezeit",
    hint: "Fahrt zum Objekt, ggf. zwischen Etagen oder Gebäudeteilen",
    icon: Car,
  },
];

function formatVisits(visits: number): string {
  return visits.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function clampMinutes(v: number | undefined): number {
  if (v === undefined || !Number.isFinite(v) || v < 0) return 0;
  return Math.min(v, MAX_MINUTES);
}

/**
 * Rüst- und Wegezeit je Einsatz. Wirkt mit dem höchsten Turnus aller Räume:
 * Minuten / 60 × Einsätze/Monat = Stunden/Monat (wie `calcProjectTotals`).
 *
 * - Standard: Karte mit Schnellwahl-Chips 0/10/15/20/30 Min., Minutenfeld und
 *   Live-Erklärung je Zeile.
 * - `compact`: zwei Fußzeilen (`RoomsFooterRow`) für die Raumtabelle.
 */
export function SetupTimeEditor({
  ruestzeit,
  wegezeit,
  onChange,
  rooms,
  rate,
  isDefault = false,
  compact = false,
  readOnly = false,
  className,
}: SetupTimeEditorProps) {
  const ids = React.useId();
  const visits = visitsPerMonth(rooms);
  const values: SetupTimeValue = { ruestzeit, wegezeit };

  const set = (key: keyof SetupTimeValue, minutes: number | undefined) => {
    const next = clampMinutes(minutes);
    if (next === values[key]) return;
    onChange({ ...values, [key]: next });
  };

  if (compact) {
    return (
      <>
        {FIELDS.map((field) => {
          const minutes = values[field.key];
          const hours = setupTimeHours(minutes, rooms);
          const showDefault = field.key === "ruestzeit" && isDefault;
          return (
            <RoomsFooterRow
              key={field.key}
              amountKey={field.key}
              label={
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {field.compactLabel}
                  {showDefault && (
                    <Badge tone="info" size="sm">
                      Standardwert
                    </Badge>
                  )}
                </span>
              }
              description={
                readOnly || visits === 0
                  ? `${formatNumber(minutes, 0)} Min. je Einsatz${visits > 0 ? ` × ${formatVisits(visits)} Einsätze/Monat` : ""}`
                  : `je Einsatz × ${formatVisits(visits)} Einsätze/Monat`
              }
              control={
                readOnly ? undefined : (
                  <NumberInput
                    value={minutes}
                    onValueChange={(v) => set(field.key, v)}
                    unit="Min."
                    decimals={0}
                    min={0}
                    max={MAX_MINUTES}
                    inputSize="sm"
                    aria-label={`${field.label} in Minuten`}
                    wrapperClassName="w-28"
                  />
                )
              }
              hoursMonthly={hours}
              priceMonthly={hours * rate}
            />
          );
        })}
      </>
    );
  }

  const totalHours = setupTimeHours(ruestzeit, rooms) + setupTimeHours(wegezeit, rooms);

  return (
    <Card as="section" aria-labelledby={`${ids}-title`} className={className}>
      <CardHeader
        title={<span id={`${ids}-title`}>Rüst- &amp; Wegezeit je Einsatz</span>}
        description="Wird je Reinigungseinsatz zusätzlich zur Raumzeit kalkuliert."
      />
      <div className="space-y-6">
        {FIELDS.map((field) => {
          const minutes = values[field.key];
          const hours = setupTimeHours(minutes, rooms);
          const Icon = field.icon;
          const legendId = `${ids}-${field.key}-legend`;
          const hintId = `${ids}-${field.key}-hint`;
          const explainId = `${ids}-${field.key}-explain`;
          const showDefault = field.key === "ruestzeit" && isDefault;
          const preset = (SETUP_TIME_PRESETS as readonly number[]).includes(minutes) ? String(minutes) : "";
          return (
            <fieldset key={field.key} aria-describedby={`${hintId} ${explainId}`} className="space-y-2">
              <legend id={legendId} className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                {field.label}
                {showDefault && (
                  <Badge tone="info" size="sm">
                    Standardwert
                  </Badge>
                )}
              </legend>
              <p id={hintId} className="text-xs text-muted-foreground">
                {field.hint}
              </p>
              {readOnly ? (
                <p className="text-sm font-medium tabular-nums text-foreground">{formatNumber(minutes, 0)} Min.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <ToggleGroup
                    type="single"
                    variant="chip"
                    aria-label={`${field.label}: Schnellwahl`}
                    value={preset}
                    onValueChange={(v) => {
                      if (v !== "") set(field.key, Number(v));
                    }}
                    className="justify-start"
                  >
                    {SETUP_TIME_PRESETS.map((p) => (
                      <ToggleGroupItem key={p} value={String(p)} aria-label={`${p} Minuten`}>
                        {p} Min.
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <NumberInput
                    value={minutes}
                    onValueChange={(v) => set(field.key, v)}
                    unit="Min."
                    decimals={0}
                    min={0}
                    max={MAX_MINUTES}
                    inputSize="sm"
                    aria-label={`${field.label} in Minuten`}
                    wrapperClassName="w-28"
                  />
                </div>
              )}
              <p id={explainId} className="text-xs tabular-nums text-muted-foreground">
                {visits > 0 ? (
                  <>
                    {formatNumber(minutes, 0)} Min. × {formatVisits(visits)} Einsätze/Monat (höchster Turnus) ={" "}
                    <span className="font-medium text-foreground">+{formatNumber(hours, 1)} h/Monat</span> ·{" "}
                    <Money value={hours * rate} size="sm" className="font-medium text-foreground" />
                  </>
                ) : (
                  "Wirkt, sobald Räume mit Turnus erfasst sind."
                )}
              </p>
            </fieldset>
          );
        })}
      </div>
      {visits > 0 && (
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Rüst- und Wegezeit zusammen</span>
          <span className="tabular-nums text-foreground">
            <span className="font-medium">+{formatNumber(totalHours, 1)} h</span> ·{" "}
            <Money value={totalHours * rate} period="month" className="font-medium" />
          </span>
        </div>
      )}
    </Card>
  );
}
