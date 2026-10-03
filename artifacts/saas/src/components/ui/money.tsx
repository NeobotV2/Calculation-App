import * as React from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/lib/status";
import { roundDisplay } from "@/lib/display-rounding";

export type MoneySize = "display" | "money" | "kpi" | "body" | "sm";
export type MoneyPeriod = "month" | "year" | "hour" | "sqm" | "season" | "visit";

export const MONEY_PERIOD_SUFFIX: Record<MoneyPeriod, string> = {
  month: "/ Monat",
  year: "/ Jahr",
  hour: "/ Std.",
  sqm: "/ m²",
  season: "/ Saison",
  visit: "/ Einsatz",
};

const MINUS = "−";

/**
 * Formatiert einen Eurobetrag wie `formatCurrency`, aber mit typografischem
 * Minus (U+2212). Mit `signed` erhalten positive Beträge ein „+".
 * Nicht-endliche Werte ergeben „–".
 */
export function formatMoney(value: number, options?: { signed?: boolean }): string {
  if (!Number.isFinite(value)) return "–";
  // Kaufmännisch auf Cent (wie die Anzeige-Rundung der Summen), nicht ICU-Rundung des Binärwerts.
  const abs = formatCurrency(roundDisplay(Math.abs(value)));
  // -0 und Rundung auf 0,00 € ohne Vorzeichen
  const isZero = abs === formatCurrency(0);
  if (value < 0 && !isZero) return `${MINUS}${abs}`;
  if (options?.signed && value > 0 && !isZero) return `+${abs}`;
  return abs;
}

const sizeClass: Record<MoneySize, string> = {
  display: "text-money lg:text-display",
  money: "text-money",
  kpi: "text-kpi",
  body: "text-sm",
  sm: "text-xs",
};

const suffixClass: Record<MoneySize, string> = {
  display: "text-sm font-normal",
  money: "text-sm font-normal",
  kpi: "text-xs font-normal",
  body: "text-xs font-normal",
  sm: "text-xs font-normal",
};

export interface MoneyProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  value: number;
  size?: MoneySize;
  period?: MoneyPeriod;
  tone?: "brand" | Tone;
  /** „+"/„−" vor dem Betrag (z. B. Deltas, Deckungsbeitrag). */
  signed?: boolean;
}

/**
 * Geldbetrag als `<data value>` mit `tabular-nums` und gedämpftem Zeitraum-
 * Suffix („/ Monat" …). Nie als Überschrift verwenden.
 */
export const Money = React.forwardRef<HTMLDataElement, MoneyProps>(
  ({ value, size = "body", period, tone, signed = false, className, ...props }, ref) => {
    const toneClass =
      tone === "brand" ? "text-primary" : tone === "neutral" ? "text-foreground" : tone ? TONE_CLASSES[tone].text : undefined;
    return (
      <data
        ref={ref}
        value={Number.isFinite(value) ? String(value) : ""}
        className={cn("tabular-nums", sizeClass[size], toneClass, className)}
        {...props}
      >
        {/* Betrag bleibt zusammen; der Zeitraum darf in schmalen Zellen in die nächste Zeile. */}
        <span className="whitespace-nowrap">{formatMoney(value, { signed })}</span>
        {period && (
          <>
            {" "}
            <span className={cn("whitespace-nowrap text-muted-foreground", suffixClass[size])}>{MONEY_PERIOD_SUFFIX[period]}</span>
          </>
        )}
      </data>
    );
  },
);
Money.displayName = "Money";
