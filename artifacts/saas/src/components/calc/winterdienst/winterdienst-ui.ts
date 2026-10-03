/* ─────────────────────────────────────────────────────────────────────────
   Winterdienst — reine UI-Helfer (Texte, Formatierung, unveränderliche
   Config-Updates). Keine Formeln: alle Zahlen stammen aus calcWinterdienst
   bzw. den Katalogen in @/data/winterdienst.
   ───────────────────────────────────────────────────────────────────────── */
import {
  SPREAD_MATERIALS,
  WINTER_AREA_TYPES,
  WINTER_REGION_PRESETS,
  applyWinterRegion,
} from "@/data/winterdienst";
import { formatSeason, share } from "@/lib/service-modules/util";
import type {
  ClearingMethod,
  MaterialOverride,
  SpreadMaterial,
  WeatherScenarioKey,
  WinterArea,
  WinterAreaType,
  WinterBilling,
  WinterBillingMode,
  WinterdienstActual,
  WinterdienstConfig,
  WinterdienstResult,
  WinterRegion,
} from "@/lib/service-modules/types";
import { formatCurrency } from "@/lib/utils";

/* ── Reihenfolgen & Labels ────────────────────────────────────────────── */

export const REGION_ORDER: readonly WinterRegion[] = ["kueste", "flachland", "mittelgebirge", "hochlage"];
export const AREA_TYPE_ORDER: readonly WinterAreaType[] = ["gehweg", "zufahrt", "parkplatz", "treppe", "rampe", "sonstige"];
export const MATERIAL_ORDER: readonly SpreadMaterial[] = ["splitt", "salz", "granulat"];
export const BILLING_MODE_ORDER: readonly WinterBillingMode[] = ["pauschale_12", "pauschale_saison", "pro_einsatz"];
export const SCENARIO_ORDER: readonly WeatherScenarioKey[] = ["mild", "normal", "streng"];

/** Kurzbezeichnung des Streuguts für Tabellen und Texte. */
export const MATERIAL_LABELS: Record<SpreadMaterial, string> = {
  salz: "Salz",
  splitt: "Splitt",
  granulat: "Granulat",
};

export const METHOD_LABELS: Record<ClearingMethod, string> = {
  manuell: "manuell",
  maschinell: "maschinell",
};

export const SCENARIO_LABELS: Record<WeatherScenarioKey, string> = {
  mild: "Mild",
  normal: "Normal",
  streng: "Streng",
};

/**
 * Eingabegrenzen der Editor-Felder = Klemmbereiche von `sanitizeWinterdienst`.
 * Werte innerhalb dieser Grenzen übersteht jede Config unverändert
 * (Speichern in Supabase, Export/Import).
 */
export const WD_LIMITS = {
  expectedEinsaetze: { min: 0, max: 365 },
  clearingSharePct: { min: 0, max: 100 },
  areaM2: { min: 0, max: 1_000_000 },
  perfM2h: { max: 100_000 },
  materialMarkupPct: { min: 0, max: 500 },
  travelMinutesPerEinsatz: { min: 0, max: 600 },
  documentationMinutesPerEinsatz: { min: 0, max: 120 },
  seasonSetupHours: { min: 0, max: 1_000 },
  standbyFeeMonthly: { min: 0, max: 1_000_000 },
  standbyCostMonthly: { min: 0, max: 1_000_000 },
  offHoursSharePct: { min: 0, max: 100 },
  offHoursSurchargePct: { min: 0, max: 200 },
  offHoursWageSurchargePct: { min: 0, max: 200 },
  liabilitySurchargePct: { min: 0, max: 100 },
  riskProvisionPct: { min: 0, max: 100 },
  machineRatePerHour: { min: 0, max: 10_000 },
  machineCostPerHour: { min: 0, max: 10_000 },
  capEinsaetze: { min: 0, max: 365 },
  clearingWindowHours: { min: 0.5, max: 24 },
  rateOverride: { max: 1_000 },
  vollkostenOverride: { max: 1_000 },
  gramsPerM2: { min: 0, max: 5_000 },
  pricePerKg: { min: 0, max: 100 },
} as const;

/* ── Formatierung ─────────────────────────────────────────────────────── */

/** Zahl ohne feste Nachkommastellen (höchstens `maxDigits`), z. B. 45 → „45“, 16,67 → „16,7“. */
export function formatCount(value: number, maxDigits = 1): string {
  if (!Number.isFinite(value)) return "–";
  return value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
}

/** „1 Einsatz“ / „45 Einsätze“. */
export function einsaetzeText(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "Einsatz" : "Einsätze"}`;
}

/* ── Regionen ─────────────────────────────────────────────────────────── */

export function regionLabel(region: WinterRegion): string {
  return (WINTER_REGION_PRESETS[region] ?? WINTER_REGION_PRESETS.flachland).label;
}

/** Chip-Beschriftung einer Region: Preset-Label + „typ. {typ} Einsätze“. */
export function regionChipLabel(region: WinterRegion): { label: string; sub: string } {
  const p = WINTER_REGION_PRESETS[region] ?? WINTER_REGION_PRESETS.flachland;
  return { label: p.label, sub: `typ. ${p.einsaetzeTyp} Einsätze` };
}

/** Orientierungsband der Region, z. B. „Orientierung 25–75, typisch 45“. */
export function regionBandText(region: WinterRegion): string {
  const p = WINTER_REGION_PRESETS[region] ?? WINTER_REGION_PRESETS.flachland;
  return `Orientierung ${p.einsaetzeMin}–${p.einsaetzeMax}, typisch ${p.einsaetzeTyp}`;
}

/** Schnellwahl-Chips für die Einsatzzahl: Mild / Typisch / Streng der Region. */
export function einsaetzeQuickPicks(region: WinterRegion): { key: WeatherScenarioKey; label: string; value: number }[] {
  const p = WINTER_REGION_PRESETS[region] ?? WINTER_REGION_PRESETS.flachland;
  return [
    { key: "mild", label: `Mild ${p.einsaetzeMin}`, value: p.einsaetzeMin },
    { key: "normal", label: `Typisch ${p.einsaetzeTyp}`, value: p.einsaetzeTyp },
    { key: "streng", label: `Streng ${p.einsaetzeMax}`, value: p.einsaetzeMax },
  ];
}

/**
 * Regionswechsel: übernimmt Einsätze, Räumanteil und Saison des Presets
 * (`applyWinterRegion`) und liefert den Toast-Text dazu.
 */
export function regionChange(cfg: WinterdienstConfig, region: WinterRegion): { config: WinterdienstConfig; message: string } {
  return {
    config: applyWinterRegion(cfg, region),
    message: `Einsätze, Räumanteil und Saison auf Richtwerte für ${regionLabel(region)} gesetzt`,
  };
}

/* ── Flächen ──────────────────────────────────────────────────────────── */

export function areaTypeDef(type: WinterAreaType) {
  return WINTER_AREA_TYPES[type] ?? WINTER_AREA_TYPES.sonstige;
}

export function areaTypeLabel(type: WinterAreaType): string {
  return areaTypeDef(type).label;
}

/** Anzeigename einer Fläche (Bezeichnung oder Flächentyp). */
export function areaDisplayName(area: WinterArea): string {
  return area.label?.trim() || areaTypeLabel(area.type);
}

export function areaMaterial(area: WinterArea, cfg: Pick<WinterdienstConfig, "material">): SpreadMaterial {
  return area.material ?? cfg.material;
}

/** Streugut-Spalte: eigenes Material oder „Standard (Splitt)“. */
export function areaMaterialLabel(area: WinterArea, cfg: Pick<WinterdienstConfig, "material">): string {
  if (!area.spread) return "–";
  return area.material ? MATERIAL_LABELS[area.material] : `Standard (${MATERIAL_LABELS[cfg.material] ?? "Splitt"})`;
}

/**
 * Leistung einer Fläche, z. B. „Räumen und Streuen (Splitt)“.
 * `short` verbindet mit „+“ (mobile Listenzeile).
 */
export function areaWorkLabel(
  area: WinterArea,
  cfg: Pick<WinterdienstConfig, "material">,
  opts?: { short?: boolean },
): string {
  const joiner = opts?.short ? " + " : " und ";
  const work =
    area.clear && area.spread
      ? `Räumen${joiner}Streuen`
      : area.clear
        ? "Räumen"
        : area.spread
          ? "Streuen"
          : "Weder Räumen noch Streuen";
  const material = area.spread ? ` (${MATERIAL_LABELS[areaMaterial(area, cfg)] ?? "Splitt"})` : "";
  return work + material;
}

/**
 * Erwartete Minuten je Einsatz für Fläche `i`:
 * (Räumanteil × Räumstunden + Streustunden) × 60, aus `result.areas[i]`.
 */
export function areaMinutesPerEinsatz(result: WinterdienstResult, i: number, clearingSharePct: number): number {
  const a = result.areas[i];
  if (!a) return 0;
  return (share(clearingSharePct) * a.clearingHours + a.spreadingHours) * 60;
}

/** Eingabehilfe: Länge × Breite in m² (auf 2 Nachkommastellen); ungültig ⇒ undefined. */
export function lengthTimesWidth(length: number | undefined, width: number | undefined): number | undefined {
  if (typeof length !== "number" || typeof width !== "number") return undefined;
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return undefined;
  return Math.round(length * width * 100) / 100;
}

/** Darf diese Fläche maschinell geräumt werden? (Treppe: nein) */
export function machineAllowed(type: WinterAreaType): boolean {
  return areaTypeDef(type).machineAllowed;
}

/**
 * Flächentyp wechseln: Standard-Bezeichnung und Standard-Methode des neuen
 * Typs übernehmen (eigene Bezeichnungen bleiben). Treppen sind immer manuell.
 */
export function changeAreaType(area: WinterArea, type: WinterAreaType): WinterArea {
  const prevDefault = areaTypeLabel(area.type);
  const def = areaTypeDef(type);
  const keepLabel = area.label.trim() !== "" && area.label.trim() !== prevDefault;
  return {
    ...area,
    type,
    label: keepLabel ? area.label : def.label,
    method: def.machineAllowed ? def.defaultMethod : "manuell",
  };
}

/** Methode setzen; bei nicht zulässiger Maschine (Treppe) bleibt es manuell. */
export function changeAreaMethod(area: WinterArea, method: ClearingMethod): WinterArea {
  return { ...area, method: method === "maschinell" && !machineAllowed(area.type) ? "manuell" : method };
}

/** Fläche einfügen oder ersetzen (gleiche id). */
export function upsertArea(cfg: WinterdienstConfig, area: WinterArea): WinterdienstConfig {
  const exists = cfg.areas.some((a) => a.id === area.id);
  return { ...cfg, areas: exists ? cfg.areas.map((a) => (a.id === area.id ? area : a)) : [...cfg.areas, area] };
}

export function removeArea(cfg: WinterdienstConfig, id: string): WinterdienstConfig {
  return { ...cfg, areas: cfg.areas.filter((a) => a.id !== id) };
}

/** Kopie direkt hinter dem Original, Bezeichnung „… (Kopie)“. */
export function duplicateArea(cfg: WinterdienstConfig, id: string, newId: string): WinterdienstConfig {
  const index = cfg.areas.findIndex((a) => a.id === id);
  if (index < 0) return cfg;
  const src = cfg.areas[index];
  const copy: WinterArea = { ...src, id: newId, label: `${areaDisplayName(src)} (Kopie)` };
  const areas = [...cfg.areas];
  areas.splice(index + 1, 0, copy);
  return { ...cfg, areas };
}

/** Hat mindestens eine Fläche (effektiv) maschinelle Räumung? */
export function hasMachineArea(cfg: WinterdienstConfig): boolean {
  return cfg.areas.some((a) => a.method === "maschinell" && machineAllowed(a.type));
}

/* ── Streugut ─────────────────────────────────────────────────────────── */

/** Richtwerte des Streuguts als Text, z. B. „150 g/m² · 0,10 €/kg“. */
export function materialSpecText(gramsPerM2: number, pricePerKg: number): string {
  return `${formatCount(gramsPerM2, 0)} g/m² · ${pricePerKg.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/kg`;
}

/**
 * Material-Override setzen bzw. entfernen (`undefined`). Leere Einträge und ein
 * leeres Override-Objekt werden entfernt.
 */
export function setMaterialOverride(
  cfg: WinterdienstConfig,
  material: SpreadMaterial,
  field: keyof MaterialOverride,
  value: number | undefined,
): WinterdienstConfig {
  const current: MaterialOverride = { ...(cfg.materialOverrides?.[material] ?? {}) };
  if (value === undefined || !Number.isFinite(value) || value < 0) delete current[field];
  else current[field] = value;

  const all: Partial<Record<SpreadMaterial, MaterialOverride>> = { ...(cfg.materialOverrides ?? {}) };
  if (current.gramsPerM2 === undefined && current.pricePerKg === undefined) delete all[material];
  else all[material] = current;

  const next: WinterdienstConfig = { ...cfg };
  if (Object.keys(all).length === 0) delete next.materialOverrides;
  else next.materialOverrides = all;
  return next;
}

export function materialHint(material: SpreadMaterial): string {
  return (SPREAD_MATERIALS[material] ?? SPREAD_MATERIALS.splitt).hint;
}

/* ── Optionale Felder ─────────────────────────────────────────────────── */

/**
 * Optionales Feld setzen (`undefined` entfernt den Schlüssel). `positive`:
 * nur Werte > 0 gelten (Overrides), sonst ≥ 0.
 */
export function setOptional<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: number | undefined,
  opts?: { positive?: boolean },
): T {
  const next = { ...obj };
  const valid = typeof value === "number" && Number.isFinite(value) && (opts?.positive ? value > 0 : value >= 0);
  if (valid) (next as Record<K, unknown>)[key] = value;
  else delete next[key];
  return next;
}

/* ── Abrechnung ───────────────────────────────────────────────────────── */

/** Rundung nur für die Anzeige (§5.8): Rate = round(P/n), letzte Rate = P − (n−1)·Rate. */
export function splitInstallments(total: number, count: number): { amount: number; last: number; count: number } {
  const n = count > 0 ? count : 1;
  const P = Math.round(total * 100) / 100;
  const amount = Math.round((P / n) * 100) / 100;
  const last = Math.round((P - (n - 1) * amount) * 100) / 100;
  return { amount, last, count: n };
}

/** Langtext eines Abrechnungsmodus (Auswahlkarten). */
export function billingModeLabel(mode: WinterBillingMode, seasonMonths: readonly number[]): string {
  const n = seasonMonths.length;
  switch (mode) {
    case "pauschale_12":
      return "Saisonpauschale in 12 Monatsraten";
    case "pauschale_saison":
      return n > 0 ? `Saisonpauschale in ${n} Raten (${formatSeason(seasonMonths)})` : "Saisonpauschale in 12 Raten";
    default:
      return "Je Einsatz + Bereitschaftspauschale";
  }
}

/** Kurztext eines Abrechnungsmodus (Metazeilen). */
export function billingModeShortLabel(mode: WinterBillingMode): string {
  switch (mode) {
    case "pauschale_12":
      return "Pauschale, 12 Raten";
    case "pauschale_saison":
      return "Pauschale, Saisonraten";
    default:
      return "Je Einsatz";
  }
}

export function isPauschaleMode(mode: WinterBillingMode): boolean {
  return mode !== "pro_einsatz";
}

/**
 * Abrechnungsvorschau, z. B. „12 Raten à 308,26 €, letzte Rate 308,25 €“,
 * „5 Raten à 739,82 € (Nov–Mär), letzte Rate 739,83 €“ oder
 * „62,00 € je Saisonmonat + 75,31 € je Einsatz“; mit Deckelung zusätzlich
 * „über 30 Einsätze: 75,31 € je Einsatz“.
 */
export function billingPreviewText(result: WinterdienstResult): string {
  const b = result.billing;
  const parts: string[] = [];
  if (b.pauschaleSeason !== null) {
    const { amount, last, count } = splitInstallments(b.pauschaleSeason, b.installmentCount);
    const season = b.mode === "pauschale_saison" && result.seasonMonthsCount > 0 ? ` (${formatSeason(result.seasonMonths)})` : "";
    const lastText = last !== amount ? `, letzte Rate ${formatCurrency(last)}` : "";
    parts.push(`${count} Raten à ${formatCurrency(amount)}${season}${lastText}`);
    if (b.capEinsaetze !== null) {
      parts.push(`über ${formatCount(b.capEinsaetze)} Einsätze: ${formatCurrency(b.pricePerEinsatz)} je Einsatz`);
    }
  } else {
    const per = result.seasonMonthsCount > 0 ? "je Saisonmonat" : "je Monat";
    parts.push(`${formatCurrency(b.installmentAmount)} ${per} + ${formatCurrency(b.pricePerEinsatz)} je Einsatz`);
  }
  return parts.join(" · ");
}

/**
 * Verlustschwelle als Text: „Kostendeckend bis ca. 57 Einsätze“,
 * „Verlust unter 12 Einsätzen“ oder „Bei jeder Einsatzzahl kostendeckend“.
 */
export function breakEvenText(billing: WinterBilling): string {
  if (billing.lossAboveEinsaetze !== null) {
    if (billing.lossAboveEinsaetze <= 0) return "Bei keiner Einsatzzahl kostendeckend";
    return `Kostendeckend bis ca. ${formatCount(Math.floor(billing.lossAboveEinsaetze), 0)} Einsätze`;
  }
  if (billing.lossBelowEinsaetze !== null && billing.lossBelowEinsaetze > 0) {
    return `Verlust unter ${formatCount(Math.ceil(billing.lossBelowEinsaetze), 0)} Einsätzen`;
  }
  return "Bei jeder Einsatzzahl kostendeckend";
}

/** Benötigte Kräfte im Räumfenster, nur wenn mehr als eine (sonst null). */
export function crewNeeded(result: WinterdienstResult): number | null {
  return result.crewAtPeak > 1 + 1e-9 ? Math.ceil(result.crewAtPeak - 1e-9) : null;
}

/** Metazeile, z. B. „Hügelland / Mittelgebirge · Nov–Mär · 45 Einsätze · Pauschale, 12 Raten“. */
export function winterMetaLine(cfg: WinterdienstConfig): string {
  return [
    regionLabel(cfg.region),
    formatSeason(cfg.seasonMonths),
    einsaetzeText(cfg.expectedEinsaetze),
    billingModeShortLabel(cfg.billingMode),
  ].join(" · ");
}

/* ── Befunde ──────────────────────────────────────────────────────────── */

/** Winterdienst-Befunde: idSuffix „wd_…“ sowie below_cost_wd / low_margin_wd. */
export function isWinterFinding(f: { idSuffix: string }): boolean {
  return f.idSuffix.startsWith("wd_") || f.idSuffix === "below_cost_wd" || f.idSuffix === "low_margin_wd";
}

export function winterFindings<T extends { idSuffix: string }>(findings: readonly T[] | undefined): T[] {
  return (findings ?? []).filter(isWinterFinding);
}

/* ── Nachkalkulation ──────────────────────────────────────────────────── */

/** Vorbelegung „Saison“: zuletzt abgeschlossener Winter „{y−1}/{yy}“. */
export function defaultWinterSeasonLabel(now: Date = new Date()): string {
  const y = now.getFullYear();
  return `${y - 1}/${String(y % 100).padStart(2, "0")}`;
}

/** Jüngster Eintrag: höchste Saison, bei Gleichstand zuletzt erfasst. */
export function latestWinterActual(list: readonly WinterdienstActual[] | undefined): WinterdienstActual | undefined {
  let best: WinterdienstActual | undefined;
  for (const a of list ?? []) {
    if (!best) {
      best = a;
      continue;
    }
    const bySeason = a.season.localeCompare(best.season, "de", { numeric: true });
    if (bySeason > 0 || (bySeason === 0 && a.recordedAt >= best.recordedAt)) best = a;
  }
  return best;
}

/** Einträge absteigend (jüngste Saison zuerst). */
export function sortWinterActuals(list: readonly WinterdienstActual[] | undefined): WinterdienstActual[] {
  return [...(list ?? [])].sort((a, b) => {
    const bySeason = b.season.localeCompare(a.season, "de", { numeric: true });
    return bySeason !== 0 ? bySeason : b.recordedAt.localeCompare(a.recordedAt);
  });
}
