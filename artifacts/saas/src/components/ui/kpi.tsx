import * as React from "react";
import { InfoHint } from "@/components/ui/info-hint";
import { Money, type MoneyPeriod, type MoneySize } from "@/components/ui/money";
import { TONE_CLASSES, TONE_ICON, type Tone } from "@/lib/status";
import { cn, formatNumber } from "@/lib/utils";

export type KpiFormat = "currency" | "hours" | "area" | "percent" | "number";
export type KpiEmphasis = "hero" | "primary" | "secondary";

/** Formatiert Kennzahlen nach §4.2 (Stunden 1 Nachkommastelle + „h", Fläche „m²", Prozent 1 Nachkommastelle). */
export function formatKpiValue(value: number, format: Exclude<KpiFormat, "currency">, decimals?: number): string {
  if (!Number.isFinite(value)) return "–";
  switch (format) {
    case "hours":
      return `${formatNumber(value, decimals ?? 1)} h`;
    case "area":
      return `${formatNumber(value, decimals ?? 0)} m²`;
    case "percent":
      return `${formatNumber(value, decimals ?? 1)} %`;
    default:
      return formatNumber(value, decimals ?? 0);
  }
}

const emphasisMoneySize: Record<KpiEmphasis, MoneySize> = {
  hero: "display",
  primary: "money",
  secondary: "kpi",
};

const emphasisIconClass: Record<KpiEmphasis, string> = {
  hero: "size-5",
  primary: "size-5",
  secondary: "size-4",
};

/** Vorlese-Text, wenn ein Status-Ton ohne eigenes `statusLabel` gesetzt ist. */
const DEFAULT_STATUS_LABEL: Record<Exclude<Tone, "neutral">, string> = {
  info: "Hinweis",
  success: "In Ordnung",
  warning: "Achtung",
  critical: "Kritisch",
};

const emphasisClass: Record<KpiEmphasis, string> = {
  hero: "text-money lg:text-display",
  primary: "text-money",
  secondary: "text-kpi",
};

export interface KpiProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: React.ReactNode;
  /** Zahl (wird gemäß `format` formatiert) oder bereits fertiger Inhalt. */
  value: number | React.ReactNode;
  format?: KpiFormat;
  emphasis?: KpiEmphasis;
  /**
   * Hervorhebung des Werts. Status-Töne (info/success/warning/critical) zeigen
   * zusätzlich das Status-Icon und ein Statuswort — nie nur Farbe (§1.3, §4.4).
   */
  tone?: "brand" | Tone;
  /** Statuswort neben dem Wert, z. B. „unter Ziel“ (sonst nur für Screenreader ein Standardwort). */
  statusLabel?: string;
  /** Kleine Zusatzzeile unter dem Wert. */
  hint?: React.ReactNode;
  /** Erklärung der Formel → InfoHint neben dem Label. */
  info?: React.ReactNode;
  /** Zugänglicher Name des InfoHint (Standard: „Erklärung: {label}"). */
  infoLabel?: string;
  /** Nur bei `format="currency"`. */
  period?: MoneyPeriod;
  signed?: boolean;
  decimals?: number;
}

/** Kennzahl: Label (sentence case) über Wert, optional Hinweis und Formel-Erklärung. */
export function Kpi({
  label,
  value,
  format = "number",
  emphasis = "secondary",
  tone,
  statusLabel,
  hint,
  info,
  infoLabel,
  period,
  signed,
  decimals,
  className,
  ...props
}: KpiProps) {
  const toneClass =
    tone === "brand" ? "text-primary" : tone === "neutral" || !tone ? "text-foreground" : TONE_CLASSES[tone].text;

  let content: React.ReactNode;
  if (typeof value === "number") {
    content =
      format === "currency" ? (
        <Money value={value} size={emphasisMoneySize[emphasis]} period={period} signed={signed} className={toneClass} />
      ) : (
        <span className={cn("tabular-nums", emphasisClass[emphasis], toneClass)}>
          {formatKpiValue(value, format, decimals)}
        </span>
      );
  } else {
    content = <span className={cn("tabular-nums", emphasisClass[emphasis], toneClass)}>{value}</span>;
  }

  const statusTone = tone && tone !== "brand" && tone !== "neutral" ? tone : null;
  if (statusTone) {
    const StatusIcon = TONE_ICON[statusTone];
    content = (
      <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <StatusIcon
          aria-hidden="true"
          strokeWidth={2}
          className={cn("shrink-0", emphasisIconClass[emphasis], TONE_CLASSES[statusTone].icon)}
        />
        {content}
        {statusLabel ? (
          <span className={cn("text-xs font-medium", TONE_CLASSES[statusTone].text)}>{statusLabel}</span>
        ) : (
          <span className="sr-only">{DEFAULT_STATUS_LABEL[statusTone]}</span>
        )}
      </span>
    );
  }

  const resolvedInfoLabel = infoLabel ?? (typeof label === "string" ? `Erklärung: ${label}` : "Erklärung");

  return (
    <div className={cn("min-w-0", className)} {...props}>
      <div className="flex min-h-6 items-center gap-1 text-label text-muted-foreground">
        {/* Nie abschneiden: Begriffe wie „Ø pro Monat (Jahresmittel)“ unterscheiden Werte (§4.4). */}
        <span className="min-w-0 line-clamp-2 hyphens-auto break-words">{label}</span>
        {info != null && <InfoHint label={resolvedInfoLabel}>{info}</InfoHint>}
      </div>
      <div className="mt-1 break-words">{content}</div>
      {hint != null && hint !== "" && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const columnClass: Record<2 | 3 | 4 | 5 | "custom", string> = {
  2: "grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 min-[400px]:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1",
  5: "grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-5 min-[400px]:[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1",
  /** Spalten setzt der Aufrufer per `className` (z. B. Container-Queries). */
  custom: "",
};

export interface KpiGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spaltenzahl nach Viewport; `custom` = Spalten kommen über `className`. */
  columns?: 2 | 3 | 4 | 5 | "custom";
}

/** Haarlinien-Raster für Kennzahlen (`gap-px bg-border`, Zellen `bg-card p-4`). */
export function KpiGroup({ columns = 4, className, children, ...props }: KpiGroupProps) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-surface [&>*]:bg-card [&>*]:p-4",
        columnClass[columns],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
