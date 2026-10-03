/* ─────────────────────────────────────────────────────────────────────────
   Winterdienst (Räum- und Streudienst) — Kataloge und Vorgaben.
   ALLE Werte sind Orientierungswerte aus der Praxis (keine Klima- oder
   Normdaten). Die UI kennzeichnet sie so und lässt jeden Wert überschreiben.
   ───────────────────────────────────────────────────────────────────────── */
import type {
  ClearingMethod, MonthIndex, SpreadMaterial, WinterArea, WinterAreaType, WinterdienstConfig, WinterRegion,
} from "@/lib/service-modules/types";

/* ── Regionen ─────────────────────────────────────────────────────────── */

export interface WinterRegionPreset {
  label: string;
  description: string;
  /** Einsätze je Saison im milden / typischen / strengen Winter. */
  einsaetzeMin: number;
  einsaetzeTyp: number;
  einsaetzeMax: number;
  /** Anteil der Einsätze mit Schneeräumung in %. */
  clearingSharePct: number;
  seasonMonths: MonthIndex[];
}

export const WINTER_REGION_PRESETS: Record<WinterRegion, WinterRegionPreset> = {
  kueste: {
    label: "Küste / Nordwestdeutsches Tiefland",
    description: "maritim und mild, meist Glätte ohne Schnee (z. B. Ostfriesland, Hamburg, Bremen)",
    einsaetzeMin: 5, einsaetzeTyp: 12, einsaetzeMax: 25,
    clearingSharePct: 25,
    seasonMonths: [1, 2, 3, 11, 12],
  },
  flachland: {
    label: "Flachland / Binnenland",
    description: "bis ca. 300 m ü. NN (z. B. Rheinland, Westfalen, Berlin, Leipzig)",
    einsaetzeMin: 10, einsaetzeTyp: 25, einsaetzeMax: 40,
    clearingSharePct: 35,
    seasonMonths: [1, 2, 3, 11, 12],
  },
  mittelgebirge: {
    label: "Hügelland / Mittelgebirge",
    description: "ca. 300–600 m ü. NN (z. B. Bergisches Land, Odenwald, Spessart, Großraum München)",
    einsaetzeMin: 25, einsaetzeTyp: 45, einsaetzeMax: 75,
    clearingSharePct: 50,
    seasonMonths: [1, 2, 3, 11, 12],
  },
  hochlage: {
    label: "Hochlage / Alpenvorland",
    description: "über ca. 600 m ü. NN (z. B. Schwäbische Alb, Harz-Hochlagen, Erzgebirge, Allgäu, Bayerischer Wald)",
    einsaetzeMin: 50, einsaetzeTyp: 80, einsaetzeMax: 130,
    clearingSharePct: 70,
    seasonMonths: [1, 2, 3, 4, 10, 11, 12],
  },
};

export const WINTER_REGION_DISCLAIMER =
  "Orientierungswerte für Räum- und/oder Streueinsätze je Saison (reine Kontrollfahrten deckt die Bereitschaftspauschale) – keine Klimadaten. " +
  "Milde Winter liegen deutlich darunter, strenge darüber. Eigene Einsatzprotokolle der Vorjahre haben Vorrang.";

/* ── Flächentypen (Leistungswerte m²/h = Orientierung) ───────────────── */

export interface WinterAreaTypeDef {
  label: string;
  defaultMethod: ClearingMethod;
  machineAllowed: boolean;
  clearingPerfM2h: Record<ClearingMethod, number>;
  spreadingPerfM2h: Record<ClearingMethod, number>;
  /** Wird von kommunalen Salzbeschränkungen typischerweise erfasst (Treppen/Rampen meist ausgenommen). */
  saltRestrictable: boolean;
  /** Räumen ohne Streuen erfüllt die Verkehrssicherungspflicht bei Glätte nicht. */
  spreadingRequired: boolean;
  hint: string;
}

export const WINTER_AREA_TYPES: Record<WinterAreaType, WinterAreaTypeDef> = {
  gehweg: {
    label: "Gehweg", defaultMethod: "manuell", machineAllowed: true,
    clearingPerfM2h: { manuell: 150, maschinell: 1200 },
    spreadingPerfM2h: { manuell: 1000, maschinell: 4000 },
    saltRestrictable: true, spreadingRequired: true,
    hint: "Öffentlicher Gehweg vor dem Grundstück – Räum- und Streupflicht laut Ortssatzung (Eingabe: Länge × 1,5 m).",
  },
  zufahrt: {
    label: "Zufahrt / Hoffläche", defaultMethod: "maschinell", machineAllowed: true,
    clearingPerfM2h: { manuell: 180, maschinell: 1500 },
    spreadingPerfM2h: { manuell: 1200, maschinell: 5000 },
    saltRestrictable: true, spreadingRequired: true,
    hint: "Private Verkehrsfläche; Lagerfläche für geräumten Schnee einplanen.",
  },
  parkplatz: {
    label: "Parkplatz", defaultMethod: "maschinell", machineAllowed: true,
    clearingPerfM2h: { manuell: 200, maschinell: 2000 },
    spreadingPerfM2h: { manuell: 1500, maschinell: 6000 },
    saltRestrictable: true, spreadingRequired: true,
    hint: "Geparkte Fahrzeuge senken die Leistung – Leistungswert ggf. reduzieren.",
  },
  treppe: {
    label: "Treppe / Eingang", defaultMethod: "manuell", machineAllowed: false,
    clearingPerfM2h: { manuell: 60, maschinell: 60 },
    spreadingPerfM2h: { manuell: 300, maschinell: 300 },
    saltRestrictable: false, spreadingRequired: true,
    hint: "Nur manuell; höchstes Unfallrisiko – sorgfältig streuen und dokumentieren.",
  },
  rampe: {
    label: "Rampe (Anlieferung / barrierefrei)", defaultMethod: "manuell", machineAllowed: true,
    clearingPerfM2h: { manuell: 120, maschinell: 800 },
    spreadingPerfM2h: { manuell: 800, maschinell: 2500 },
    saltRestrictable: false, spreadingRequired: true,
    hint: "Gefälle: abstumpfende Mittel oder (wo zulässig) Salz einplanen.",
  },
  sonstige: {
    label: "Sonstige Fläche (Innenhof, Müllplatz)", defaultMethod: "manuell", machineAllowed: true,
    clearingPerfM2h: { manuell: 150, maschinell: 1000 },
    spreadingPerfM2h: { manuell: 1000, maschinell: 3000 },
    saltRestrictable: true, spreadingRequired: false,
    hint: "Nebenflächen nach Vertrag.",
  },
};

/* ── Streumittel ──────────────────────────────────────────────────────── */

export interface SpreadMaterialDef {
  label: string;
  /** Streumenge je Einsatz in g/m². */
  gramsPerM2: number;
  /** Einkaufspreis netto in €/kg. */
  pricePerKg: number;
  hint: string;
}

export const SPREAD_MATERIALS: Record<SpreadMaterial, SpreadMaterialDef> = {
  salz: {
    label: "Auftausalz (NaCl)", gramsPerM2: 20, pricePerKg: 0.2,
    hint: "Auftauend, 10–20 g/m² (vorbeugend weniger). Auf Gehwegen in vielen Kommunen verboten oder nur bei Eisregen, an Treppen und Gefällestrecken zulässig – Ortssatzung prüfen.",
  },
  splitt: {
    label: "Splitt 2–5 mm (abstumpfend)", gramsPerM2: 150, pricePerKg: 0.1,
    hint: "100–200 g/m². Muss nach der Saison aufgenommen werden (HMS-Leistung „Streugut aufnehmen“).",
  },
  granulat: {
    label: "Streugranulat, salzfrei (z. B. Lava)", gramsPerM2: 100, pricePerKg: 0.6,
    hint: "Abstumpfend, satzungskonform, teils wiederverwendbar; im Einkauf deutlich teurer.",
  },
};

/* ── Vorgaben ─────────────────────────────────────────────────────────── */

export const WINTER_DEFAULT_REGION: WinterRegion = "flachland";

export const WINTER_DEFAULTS = {
  material: "splitt" as SpreadMaterial,
  materialMarkupPct: 20,
  travelMinutesPerEinsatz: 15,
  documentationMinutesPerEinsatz: 5,
  seasonSetupHours: 2,
  standbyFeeMonthly: 40,
  standbyCostMonthly: 20,
  offHoursSharePct: 50,
  offHoursSurchargePct: 25,
  liabilitySurchargePct: 5,
  riskProvisionPct: 100,
  machineRatePerHour: 45,
  machineCostPerHour: 35,
  clearingWindowHours: 3,
  billingMode: "pauschale_12" as const,
};

/** Eingabehilfe Gehweg: m² = Länge × Breite. */
export const WD_GEHWEG_DEFAULT_WIDTH_M = 1.5;

export function createDefaultWinterdienst(region: WinterRegion = WINTER_DEFAULT_REGION): WinterdienstConfig {
  const p = WINTER_REGION_PRESETS[region];
  const d = WINTER_DEFAULTS;
  return {
    schemaVersion: 1,
    enabled: true,
    region,
    seasonMonths: [...p.seasonMonths],
    expectedEinsaetze: p.einsaetzeTyp,
    clearingSharePct: p.clearingSharePct,
    areas: [],
    material: d.material,
    materialMarkupPct: d.materialMarkupPct,
    saltRestricted: false,
    travelMinutesPerEinsatz: d.travelMinutesPerEinsatz,
    documentationMinutesPerEinsatz: d.documentationMinutesPerEinsatz,
    seasonSetupHours: d.seasonSetupHours,
    standbyFeeMonthly: d.standbyFeeMonthly,
    standbyCostMonthly: d.standbyCostMonthly,
    offHoursSharePct: d.offHoursSharePct,
    offHoursSurchargePct: d.offHoursSurchargePct,
    liabilitySurchargePct: d.liabilitySurchargePct,
    riskProvisionPct: d.riskProvisionPct,
    machineRatePerHour: d.machineRatePerHour,
    machineCostPerHour: d.machineCostPerHour,
    billingMode: d.billingMode,
    clearingWindowHours: d.clearingWindowHours,
  };
}

/** Neue Fläche mit Katalog-Defaults. id kommt vom Aufrufer (uuidv4()), damit die Funktion rein bleibt. */
export function createWinterArea(id: string, type: WinterAreaType, areaM2 = 0, label?: string): WinterArea {
  const t = WINTER_AREA_TYPES[type];
  return { id, label: label ?? t.label, type, areaM2, method: t.defaultMethod, clear: true, spread: true };
}

/** Region wechseln: übernimmt Einsätze, Räumanteil und Saison des Presets, alles andere bleibt. */
export function applyWinterRegion(cfg: WinterdienstConfig, region: WinterRegion): WinterdienstConfig {
  const p = WINTER_REGION_PRESETS[region];
  return { ...cfg, region, expectedEinsaetze: p.einsaetzeTyp, clearingSharePct: p.clearingSharePct, seasonMonths: [...p.seasonMonths] };
}
