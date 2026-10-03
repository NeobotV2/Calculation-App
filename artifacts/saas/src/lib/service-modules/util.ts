import type { MonthIndex } from "./types";

/** Endliche, nicht-negative Zahl — sonst Fallback (Default 0). */
export function nn(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** Endliche Zahl > 0 — sonst 0 (für Overrides: 0/undefined = „nicht gesetzt“). */
export function pos(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/** Prozentwert → Anteil, auf [0, 1] begrenzt (Anteile wie clearingSharePct). */
export function share(pct: unknown): number {
  return Math.min(1, nn(pct) / 100);
}

/** Prozentwert → Faktor ohne Obergrenze (Zuschläge). */
export function rateOf(pct: unknown): number {
  return nn(pct) / 100;
}

export const ALL_MONTHS: readonly MonthIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Ganzzahlige Monate 1–12, ohne Duplikate, aufsteigend sortiert. */
export function normalizeMonths(months: readonly unknown[] | undefined): MonthIndex[] {
  const set = new Set<number>();
  for (const m of months ?? []) {
    if (typeof m === "number" && Number.isInteger(m) && m >= 1 && m <= 12) set.add(m);
  }
  return [...set].sort((a, b) => a - b) as MonthIndex[];
}

const MONTH_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"] as const;

export function monthShort(m: MonthIndex): string {
  return MONTH_SHORT[m - 1];
}

/** Zahl im deutschen Format ohne erzwungene Nachkommastellen (max. 1); nicht endlich → „–“. */
function countDe(value: number): string {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

const CONTINGENT_PERIOD: Record<number, string> = { 12: "Monat", 4: "Quartal", 2: "Halbjahr", 1: "Jahr" };

/** Abrufperiode eines Stundenkontingents (H2: frequencyPerYear = Anzahl Perioden): 12 → „Monat“, 4 → „Quartal“, 2 → „Halbjahr“, 1 → „Jahr“, sonst null. */
export function contingentPeriodNoun(frequencyPerYear: number): string | null {
  return CONTINGENT_PERIOD[frequencyPerYear] ?? null;
}

interface FrequencyTextTask {
  unit: string;
  quantity: number;
  frequencyPerYear: number;
  seasonMonths?: readonly number[];
}

/**
 * Turnus-Text einer HMS-Leistung — EINE Quelle für Editor und Angebot:
 * „52× jährlich“, „14× jährlich · Apr–Okt“; Kontingent: „Kontingent 2 Std. je Abruf“
 * (monatlich) bzw. „Kontingent 6 Std. je Abruf · 4× jährlich“.
 */
export function hmsTaskFrequencyText(task: FrequencyTextTask): string {
  if (task.unit === "kontingent") {
    const base = `Kontingent ${countDe(task.quantity)} Std. je Abruf`;
    return task.frequencyPerYear === 12 ? base : `${base} · ${countDe(task.frequencyPerYear)}× jährlich`;
  }
  const season = normalizeMonths(task.seasonMonths);
  const seasonText = season.length > 0 && season.length < 12 ? ` · ${formatSeason(season)}` : "";
  return `${countDe(task.frequencyPerYear)}× jährlich${seasonText}`;
}

/**
 * Bezugszeitraum eines Stundenkontingents für Kundendokumente (H1/H2: Jahresstunden
 * = Menge × Perioden): „Stundenkontingent: 2 Std. je Monat, 24 Std. im Jahr“,
 * „… 6 Std. je Quartal, 24 Std. im Jahr“, sonst „… 5 × 6 Std., 30 Std. im Jahr“.
 */
export function contingentScopeText(task: Pick<FrequencyTextTask, "quantity" | "frequencyPerYear">): string {
  const annual = nn(task.quantity) * nn(task.frequencyPerYear);
  const period = contingentPeriodNoun(task.frequencyPerYear);
  const per = period
    ? `${countDe(task.quantity)} Std. je ${period}`
    : `${countDe(task.frequencyPerYear)} × ${countDe(task.quantity)} Std.`;
  return `Stundenkontingent: ${per}, ${countDe(annual)} Std. im Jahr`;
}

/** Saison als Text: [1,2,3,11,12] → „Nov–Mär“, [6,9] → „Jun, Sep“, alle → „ganzjährig“, leer → „–“. */
export function formatSeason(months: readonly number[]): string {
  const set = new Set<number>(normalizeMonths(months));
  if (set.size === 0) return "–";
  if (set.size === 12) return "ganzjährig";
  const prev = (m: number) => (m === 1 ? 12 : m - 1);
  const next = (m: number) => (m === 12 ? 1 : m + 1);
  const starts = [...set].filter((m) => !set.has(prev(m)));
  if (starts.length === 1) {
    let end = starts[0];
    while (set.has(next(end))) end = next(end);
    return starts[0] === end ? MONTH_SHORT[end - 1] : `${MONTH_SHORT[starts[0] - 1]}–${MONTH_SHORT[end - 1]}`;
  }
  return [...set].sort((a, b) => a - b).map((m) => MONTH_SHORT[m - 1]).join(", ");
}
