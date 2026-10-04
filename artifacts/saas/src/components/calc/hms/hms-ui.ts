/* ─────────────────────────────────────────────────────────────────────────
   Hausmeisterservice — reine UI-Helfer (Texte, Gruppierung, unveränderliche
   Config-Updates). Keine Formeln: Zahlen stammen aus calcHms bzw. dem
   Katalog in @/data/hausmeisterservice.
   ───────────────────────────────────────────────────────────────────────── */
import {
  HMS_CATALOG,
  HMS_CATALOG_BY_ID,
  HMS_PRESETS_BY_OBJECT_TYPE,
  HMS_PRESET_FALLBACK,
  HMS_UNIT_LABELS,
  hmsTaskFromCatalog,
  type HmsCatalogItem,
} from "@/data/hausmeisterservice";
import { getHmsFrequencyLabel } from "@/data/frequencies";
import { allocateRounded, sumDisplay } from "@/lib/display-rounding";
import { ALL_MONTHS, hmsTaskFrequencyText, monthShort, normalizeMonths } from "@/lib/service-modules/util";
import type {
  HmsActual,
  HmsCategory,
  HmsConfig,
  HmsResult,
  HmsTask,
  HmsTaskResult,
  HmsUnit,
  MonthIndex,
} from "@/lib/service-modules/types";

/* ── Kategorien & Einheiten ───────────────────────────────────────────── */

export const HMS_CATEGORY_ORDER: readonly HmsCategory[] = [
  "kontrolle",
  "aussenanlagen",
  "gruenpflege",
  "abfall",
  "technik",
  "bedarf",
];

export const HMS_CATEGORY_LABELS: Record<HmsCategory, string> = {
  kontrolle: "Kontrolle & Sicherheit",
  aussenanlagen: "Außenanlagen",
  gruenpflege: "Grünpflege",
  abfall: "Abfall",
  technik: "Technik",
  bedarf: "Nach Bedarf",
};

export function categoryLabel(category: HmsCategory): string {
  return HMS_CATEGORY_LABELS[category] ?? "Sonstiges";
}

export const HMS_UNIT_ORDER: readonly HmsUnit[] = ["pauschal", "stueck", "lfm", "m2", "kontingent"];

/** Auswahl-Label je Einheit (TaskSheet). */
export const HMS_UNIT_OPTION_LABELS: Record<HmsUnit, string> = {
  pauschal: "Pauschal (Anzahl)",
  stueck: "Stück",
  lfm: "Laufende Meter (lfm)",
  m2: "Fläche (m²)",
  kontingent: "Stundenkontingent",
};

/** „je {Einheit}“ für Zeitwerte. */
const UNIT_TIME_NOUN: Record<HmsUnit, string> = {
  pauschal: "Einsatz",
  stueck: "Stk.",
  lfm: "lfm",
  m2: "m²",
  kontingent: "Abruf",
};

/**
 * Eingabegrenzen der Editor-Felder = Klemmbereiche von `sanitizeHms`.
 */
export const HMS_LIMITS = {
  quantity: { min: 0, max: 1_000_000 },
  minutesPerUnit: { min: 0, max: 10_000 },
  perfM2h: { max: 100_000 },
  frequencyPerYear: { min: 0, max: 366 },
  materialCostPerYear: { min: 0, max: 10_000_000 },
  travelMinutesPerVisitDay: { min: 0, max: 600 },
  visitDaysPerYear: { min: 0, max: 366 },
  materialMarkupPct: { min: 0, max: 500 },
  rateOverride: { max: 1_000 },
  vollkostenOverride: { max: 1_000 },
} as const;

/* ── Formatierung ─────────────────────────────────────────────────────── */

/** Zahl ohne feste Nachkommastellen (höchstens `maxDigits`). */
export function formatCount(value: number, maxDigits = 1): string {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
}

/* ── Leistungen ───────────────────────────────────────────────────────── */

export function catalogItemOf(task: Pick<HmsTask, "catalogId">): HmsCatalogItem | undefined {
  return task.catalogId ? HMS_CATALOG_BY_ID[task.catalogId] : undefined;
}

/** Kategorie-Unterzeile einer Leistung; freie Leistungen: „Eigene Leistung“. */
export function taskCategoryLabel(task: Pick<HmsTask, "catalogId">): string {
  const item = catalogItemOf(task);
  return item ? categoryLabel(item.category) : "Eigene Leistung";
}

/** Hinweis aus dem Katalog (z. B. Normverweis), sonst undefined. */
export function taskNote(task: Pick<HmsTask, "catalogId">): string | undefined {
  return catalogItemOf(task)?.note;
}

export function taskDisplayName(task: Pick<HmsTask, "label" | "catalogId">): string {
  return task.label?.trim() || catalogItemOf(task)?.label || "Leistung";
}

/** Menge mit Einheit, z. B. „6 Stk.“, „600 m²“, „2 Std.“. */
export function taskQuantityLabel(task: Pick<HmsTask, "quantity" | "unit">): string {
  const unit = HMS_UNIT_LABELS[task.unit]?.short ?? "";
  return `${formatCount(task.quantity, 2)} ${unit}`.trim();
}

/** Zeitwert: „20 Min./Einsatz“, „3 Min./Stk.“, „500 m²/h“ oder „Kontingent“. */
export function taskTimeLabel(task: Pick<HmsTask, "unit" | "minutesPerUnit" | "perfM2h">): string {
  switch (task.unit) {
    case "kontingent":
      return "Kontingent";
    case "m2":
      return typeof task.perfM2h === "number" && task.perfM2h > 0 ? `${formatCount(task.perfM2h, 0)} m²/h` : "–";
    default:
      return typeof task.minutesPerUnit === "number" && task.minutesPerUnit > 0
        ? `${formatCount(task.minutesPerUnit)} Min./${UNIT_TIME_NOUN[task.unit] ?? "Einheit"}`
        : "–";
  }
}

/** Label des Zeitwert-Felds je Einheit (TaskSheet); null = kein Feld (Kontingent). */
export function taskTimeFieldLabel(unit: HmsUnit): string | null {
  switch (unit) {
    case "kontingent":
      return null;
    case "m2":
      return "Leistung (m²/h)";
    default:
      return `Min. je ${UNIT_TIME_NOUN[unit] === "Stk." ? "Stück" : UNIT_TIME_NOUN[unit]}`;
  }
}

/** Label des Mengenfelds je Einheit (TaskSheet). */
export function taskQuantityFieldLabel(unit: HmsUnit): string {
  return unit === "kontingent" ? "Std. je Abruf" : `Menge (${HMS_UNIT_LABELS[unit]?.quantity ?? "Anzahl"})`;
}

/**
 * Turnus: „52× jährlich“, „14× jährlich · Apr–Okt“; Kontingent:
 * „Kontingent 2 Std. je Abruf“ (bei anderer als monatlicher Abrufperiode
 * zusätzlich „· 4× jährlich“).
 */
export function taskFrequencyLabel(task: Pick<HmsTask, "unit" | "quantity" | "frequencyPerYear" | "seasonMonths">): string {
  // Gleiche Quelle wie die Turnus-Spalte im Angebot (lib/offer-positions).
  return hmsTaskFrequencyText(task);
}

/** Kurzlabel eines Turnus-Werts (Preset-Label oder „{n}× jährlich“). */
export function frequencyPresetLabel(perYear: number): string {
  return getHmsFrequencyLabel(perYear);
}

/* ── Katalog ──────────────────────────────────────────────────────────── */

export interface CatalogGroup {
  category: HmsCategory;
  label: string;
  items: HmsCatalogItem[];
}

/** Katalog gruppiert nach Kategorie (feste Reihenfolge). */
export function catalogGroups(): CatalogGroup[] {
  return HMS_CATEGORY_ORDER.map((category) => ({
    category,
    label: categoryLabel(category),
    items: HMS_CATALOG.filter((c) => c.category === category),
  })).filter((g) => g.items.length > 0);
}

/** Katalog-ids, die bereits als Leistung angelegt sind (aktiv oder nicht). */
export function addedCatalogIds(cfg: Pick<HmsConfig, "tasks">): Set<string> {
  return new Set(cfg.tasks.flatMap((t) => (t.catalogId ? [t.catalogId] : [])));
}

/** Preset-Liste des Objekttyps (unbekannt/leer ⇒ Fallback). */
export function presetIds(objectType?: string): readonly string[] {
  return (objectType && HMS_PRESETS_BY_OBJECT_TYPE[objectType]) || HMS_PRESET_FALLBACK;
}

/** Name für „Vorschlag für {…} übernehmen“. */
export function presetTargetLabel(objectType?: string): string {
  const t = objectType?.trim();
  return t ? t : "Ihr Objekt";
}

/** Katalogeinträge des Presets, die noch fehlen. */
export function missingPresetTasks(cfg: Pick<HmsConfig, "tasks">, objectType?: string): HmsCatalogItem[] {
  const added = addedCatalogIds(cfg);
  return presetIds(objectType)
    .filter((id) => !added.has(id))
    .map((id) => HMS_CATALOG_BY_ID[id])
    .filter((item): item is HmsCatalogItem => !!item);
}

/* ── Config-Updates ───────────────────────────────────────────────────── */

/** Katalogleistungen anhängen (ids vom Aufrufer, z. B. uuidv4). */
export function addCatalogItems(cfg: HmsConfig, items: readonly HmsCatalogItem[], makeId: () => string): HmsConfig {
  if (items.length === 0) return cfg;
  return { ...cfg, tasks: [...cfg.tasks, ...items.map((item) => hmsTaskFromCatalog(item, makeId()))] };
}

/** Leere eigene Leistung (Einheit pauschal). */
export function createCustomTask(id: string): HmsTask {
  return { id, label: "", unit: "pauschal", quantity: 1, frequencyPerYear: 12, enabled: true };
}

export function upsertTask(cfg: HmsConfig, task: HmsTask): HmsConfig {
  const exists = cfg.tasks.some((t) => t.id === task.id);
  return { ...cfg, tasks: exists ? cfg.tasks.map((t) => (t.id === task.id ? task : t)) : [...cfg.tasks, task] };
}

export function removeTask(cfg: HmsConfig, id: string): HmsConfig {
  return { ...cfg, tasks: cfg.tasks.filter((t) => t.id !== id) };
}

export function setTaskEnabled(cfg: HmsConfig, id: string, enabled: boolean): HmsConfig {
  return { ...cfg, tasks: cfg.tasks.map((t) => (t.id === id ? { ...t, enabled } : t)) };
}

/** Kopie direkt hinter dem Original, Bezeichnung „… (Kopie)“. */
export function duplicateTask(cfg: HmsConfig, id: string, newId: string): HmsConfig {
  const index = cfg.tasks.findIndex((t) => t.id === id);
  if (index < 0) return cfg;
  const src = cfg.tasks[index];
  const copy: HmsTask = {
    ...src,
    id: newId,
    label: `${taskDisplayName(src)} (Kopie)`,
    ...(src.seasonMonths ? { seasonMonths: [...src.seasonMonths] } : {}),
  };
  const tasks = [...cfg.tasks];
  tasks.splice(index + 1, 0, copy);
  return { ...cfg, tasks };
}

/** Saison setzen; leer ⇒ ganzjährig (Schlüssel entfällt). */
export function withTaskSeason(task: HmsTask, months: readonly number[]): HmsTask {
  const normalized = normalizeMonths(months);
  const next = { ...task };
  if (normalized.length === 0) delete next.seasonMonths;
  else next.seasonMonths = normalized;
  return next;
}

/** Pflichtfelder des Leistungs-Editors: Bezeichnung; bei aktiver Leistung eine Menge größer 0. */
export function validateTaskDraft(task: Pick<HmsTask, "label" | "quantity" | "enabled">): { label?: string; quantity?: string } {
  const out: { label?: string; quantity?: string } = {};
  if (!task.label.trim()) out.label = "Bitte geben Sie eine Bezeichnung ein.";
  if (task.enabled && !(Number.isFinite(task.quantity) && task.quantity > 0)) out.quantity = "Bitte geben Sie eine Menge größer als 0 ein.";
  return out;
}

/* ── Ergebnis ─────────────────────────────────────────────────────────── */

/** Ergebnis je aktiver Leistung, Schlüssel = task.id. */
export function taskResultMap(result: HmsResult): Map<string, HmsTaskResult> {
  return new Map(result.tasks.map((t) => [t.id, t]));
}

/** Ø Monatswert einer Leistung (Jahreswert / 12, ohne Anfahrt). */
export function taskMonthly(r: HmsTaskResult): number {
  return r.revenueAnnual / 12;
}

/** Ø Monatswert der Anfahrten (eigene Position, wie im Angebot). */
export function travelRevenueMonthly(result: HmsResult): number {
  return (result.travelHoursAnnual * result.rate) / 12;
}

/** Angezeigte (gerundete) Beträge der Leistungstabelle: Σ Zeilen = Summenzeile. */
export interface HmsDisplayAmounts {
  /** Ø €/Monat je aktiver Leistung (auf Cent). */
  monthlyById: Map<string, number>;
  /** Std./Jahr je aktiver Leistung (auf 0,1). */
  hoursById: Map<string, number>;
  travelMonthly: number;
  travelHoursAnnual: number;
  revenueMonthly: number;
  laborHoursAnnual: number;
}

/**
 * Anzeige-Rundung der HMS-Tabelle: Leistungen + Anfahrten werden auf Cent
 * bzw. Zehntelstunden gerundet und die Rest-Cents nach größtem Rest verteilt,
 * so dass die Zeilen exakt die (gerundete) Summenzeile ergeben.
 */
export function hmsDisplayAmounts(result: HmsResult): HmsDisplayAmounts {
  const withTravel = result.travelHoursAnnual > 0;
  const monthly = allocateRounded(
    [...result.tasks.map(taskMonthly), ...(withTravel ? [travelRevenueMonthly(result)] : [])],
    result.revenueMonthly,
  );
  const hours = allocateRounded(
    [...result.tasks.map((t) => t.hoursAnnual), ...(withTravel ? [result.travelHoursAnnual] : [])],
    result.laborHoursAnnual,
    1,
  );
  const n = result.tasks.length;
  return {
    monthlyById: new Map(result.tasks.map((t, i) => [t.id, monthly[i]])),
    hoursById: new Map(result.tasks.map((t, i) => [t.id, hours[i]])),
    travelMonthly: withTravel ? monthly[n] : 0,
    travelHoursAnnual: withTravel ? hours[n] : 0,
    revenueMonthly: sumDisplay(monthly),
    laborHoursAnnual: sumDisplay(hours, 1),
  };
}

/** „Anfahrten (52 Einsatztage × 10 Min.)“. */
export function travelLabel(result: HmsResult, cfg: Pick<HmsConfig, "travelMinutesPerVisitDay">): string {
  return `Anfahrten (${formatCount(result.visitDaysPerYear)} Einsatztage × ${formatCount(cfg.travelMinutesPerVisitDay)} Min.)`;
}

export interface MonthProfileEntry {
  month: MonthIndex;
  short: string;
  hours: number;
  isPeak: boolean;
}

/** Monatsprofil (Jan–Dez) mit Markierung der Spitzenmonate. */
export function monthProfile(hours: readonly number[]): MonthProfileEntry[] {
  const values = ALL_MONTHS.map((_, i) => (Number.isFinite(hours[i]) ? hours[i] : 0));
  const peak = Math.max(0, ...values);
  return ALL_MONTHS.map((month, i) => ({
    month,
    short: monthShort(month),
    hours: values[i],
    isPeak: peak > 0 && values[i] >= peak - 1e-9,
  }));
}

/** Spitzenmonate als Text, z. B. „Jun, Sep“ („–“ ohne Stunden, „alle Monate“ bei Gleichverteilung). */
export function peakMonthsLabel(hours: readonly number[]): string {
  const entries = monthProfile(hours);
  const peaks = entries.filter((e) => e.isPeak);
  if (peaks.length === 0) return "–";
  if (peaks.length === 12) return "alle Monate";
  return peaks.map((e) => e.short).join(", ");
}

/** Metazeile, z. B. „5 aktive Leistungen · 52 Einsatztage/Jahr“. */
export function hmsMetaLine(cfg: HmsConfig, result: HmsResult): string {
  const active = cfg.tasks.filter((t) => t.enabled).length;
  const parts = [`${active} ${active === 1 ? "aktive Leistung" : "aktive Leistungen"}`];
  if (result.visitDaysPerYear > 0) parts.push(`${formatCount(result.visitDaysPerYear)} Einsatztage/Jahr`);
  return parts.join(" · ");
}

/* ── Befunde ──────────────────────────────────────────────────────────── */

/** HMS-Befunde: idSuffix „hms_…“ sowie below_cost_hms / low_margin_hms. */
export function isHmsFinding(f: { idSuffix: string }): boolean {
  return f.idSuffix.startsWith("hms_") || f.idSuffix === "below_cost_hms" || f.idSuffix === "low_margin_hms";
}

export function hmsFindings<T extends { idSuffix: string }>(findings: readonly T[] | undefined): T[] {
  return (findings ?? []).filter(isHmsFinding);
}

/* ── Nachkalkulation ──────────────────────────────────────────────────── */

/** Vorbelegung „Jahr“: das zuletzt abgeschlossene Kalenderjahr. */
export function defaultHmsYear(now: Date = new Date()): number {
  return now.getFullYear() - 1;
}

/** Jüngster Eintrag: höchstes Jahr, bei Gleichstand zuletzt erfasst. */
export function latestHmsActual(list: readonly HmsActual[] | undefined): HmsActual | undefined {
  let best: HmsActual | undefined;
  for (const a of list ?? []) {
    if (!best || a.year > best.year || (a.year === best.year && a.recordedAt >= best.recordedAt)) best = a;
  }
  return best;
}

export function sortHmsActuals(list: readonly HmsActual[] | undefined): HmsActual[] {
  return [...(list ?? [])].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.recordedAt.localeCompare(a.recordedAt)));
}
