/* ─────────────────────────────────────────────────────────────────────────
   Hausmeisterservice (HMS) — Leistungskatalog und Vorgaben.
   Zeiten, Mengen und Turnus sind Orientierungswerte (editierbar).
   ───────────────────────────────────────────────────────────────────────── */
import type { HmsCategory, HmsConfig, HmsTask, HmsUnit, MonthIndex } from "@/lib/service-modules/types";

export interface HmsCatalogItem {
  id: string;
  label: string;
  category: HmsCategory;
  unit: HmsUnit;
  defaultQuantity: number;
  /** Bedeutung der Menge für die Eingabemaske. */
  quantityLabel: string;
  /** pauschal/stueck/lfm. */
  minutesPerUnit?: number;
  /** m2. */
  perfM2h?: number;
  /** Ausführungen bzw. Abrufperioden je Jahr. */
  frequencyPerYear: number;
  seasonMonths?: MonthIndex[];
  materialCostPerYear?: number;
  note?: string;
}

const GRUEN: MonthIndex[] = [4, 5, 6, 7, 8, 9, 10];

export const HMS_CATALOG: readonly HmsCatalogItem[] = [
  { id: "kontrollgang", label: "Objektbegehung / Kontrollgang mit Protokoll", category: "kontrolle", unit: "pauschal", defaultQuantity: 1, quantityLabel: "Gebäude", minutesPerUnit: 20, frequencyPerYear: 52, note: "Mängel mit Datum dokumentieren (Verkehrssicherung)." },
  { id: "treppenhaus_kontrolle", label: "Treppenhaus- und Fluchtwegkontrolle (Licht, Türen, Fluchtwege)", category: "kontrolle", unit: "stueck", defaultQuantity: 2, quantityLabel: "Treppenhäuser", minutesPerUnit: 10, frequencyPerYear: 52 },
  { id: "technik_kontrolle", label: "Technik- und Zählerkontrolle (Heizungsdruck, Störmeldungen, Zählerstände)", category: "technik", unit: "pauschal", defaultQuantity: 1, quantityLabel: "Anlagen", minutesPerUnit: 15, frequencyPerYear: 12 },
  { id: "keller_dach", label: "Keller- und Dachbodenkontrolle (Feuchte, Schädlinge, Lüftung)", category: "kontrolle", unit: "pauschal", defaultQuantity: 1, quantityLabel: "Gebäude", minutesPerUnit: 15, frequencyPerYear: 12 },
  { id: "spielplatz_kontrolle", label: "Spielplatz: visuelle Routinekontrolle (DIN EN 1176-7)", category: "kontrolle", unit: "stueck", defaultQuantity: 1, quantityLabel: "Spielplätze", minutesPerUnit: 15, frequencyPerYear: 52, note: "Operative Inspektion (1–3-monatlich) und Jahreshauptinspektion durch Sachkundige nicht enthalten." },
  { id: "rauchmelder", label: "Rauchwarnmelder-Inspektion (DIN 14676-1)", category: "technik", unit: "stueck", defaultQuantity: 10, quantityLabel: "Melder", minutesPerUnit: 5, frequencyPerYear: 1, note: "Nur durch qualifizierte Person; Prüfprotokoll." },
  { id: "muelltonnen", label: "Mülltonnen bereitstellen und zurückstellen", category: "abfall", unit: "stueck", defaultQuantity: 6, quantityLabel: "Tonnen je Abfuhrtag", minutesPerUnit: 3, frequencyPerYear: 52, note: "Turnus an den Abfuhrkalender anpassen." },
  { id: "muellplatz", label: "Müllstandplatz säubern, Beistellungen sortieren", category: "abfall", unit: "pauschal", defaultQuantity: 1, quantityLabel: "Standplätze", minutesPerUnit: 15, frequencyPerYear: 52 },
  { id: "aussenanlagen_fegen", label: "Außenanlagen und Wege fegen", category: "aussenanlagen", unit: "m2", defaultQuantity: 200, quantityLabel: "m²", perfM2h: 400, frequencyPerYear: 26 },
  { id: "tiefgarage_kehren", label: "Tiefgarage / Garagenhof maschinell kehren", category: "aussenanlagen", unit: "m2", defaultQuantity: 1000, quantityLabel: "m²", perfM2h: 1500, frequencyPerYear: 4 },
  { id: "ablaeufe", label: "Hofabläufe, Rinnen und Gullys reinigen", category: "aussenanlagen", unit: "stueck", defaultQuantity: 4, quantityLabel: "Abläufe", minutesPerUnit: 10, frequencyPerYear: 2, seasonMonths: [4, 10] },
  { id: "streugut_aufnehmen", label: "Streugut aufnehmen (Frühjahr)", category: "aussenanlagen", unit: "m2", defaultQuantity: 300, quantityLabel: "m²", perfM2h: 400, frequencyPerYear: 1, seasonMonths: [3, 4], materialCostPerYear: 30, note: "Pflicht nach Splitt-Einsatz im Winterdienst; Material = Entsorgung." },
  { id: "rasen_maehen", label: "Rasen mähen inkl. Schnittgutentsorgung", category: "gruenpflege", unit: "m2", defaultQuantity: 500, quantityLabel: "m² Rasen", perfM2h: 500, frequencyPerYear: 14, seasonMonths: GRUEN, materialCostPerYear: 60 },
  { id: "hecke_schneiden", label: "Hecke schneiden (Formschnitt) inkl. Entsorgung", category: "gruenpflege", unit: "lfm", defaultQuantity: 30, quantityLabel: "lfm Hecke", minutesPerUnit: 3, frequencyPerYear: 2, seasonMonths: [6, 9], materialCostPerYear: 40, note: "§ 39 BNatSchG: 1. März – 30. Sept. nur schonender Form- und Pflegeschnitt." },
  { id: "beete_pflegen", label: "Beet- und Pflanzflächenpflege (Unkraut)", category: "gruenpflege", unit: "m2", defaultQuantity: 50, quantityLabel: "m² Beet", perfM2h: 50, frequencyPerYear: 6, seasonMonths: [4, 5, 6, 7, 8, 9], materialCostPerYear: 20 },
  { id: "laub_entfernen", label: "Laub entfernen inkl. Entsorgung", category: "gruenpflege", unit: "m2", defaultQuantity: 400, quantityLabel: "m²", perfM2h: 400, frequencyPerYear: 6, seasonMonths: [10, 11], materialCostPerYear: 50 },
  { id: "dachrinnen", label: "Dachrinnen reinigen (bis 1. OG, ohne Hubarbeitsbühne)", category: "technik", unit: "lfm", defaultQuantity: 40, quantityLabel: "lfm Rinne", minutesPerUnit: 3, frequencyPerYear: 1, seasonMonths: [11], note: "Arbeiten in Höhe: Gefährdungsbeurteilung; Hubarbeitsbühne/Gerüst gesondert kalkulieren." },
  { id: "winterfest", label: "Objekt winterfest machen / Frühjahrsinbetriebnahme", category: "technik", unit: "pauschal", defaultQuantity: 1, quantityLabel: "Gebäude", minutesPerUnit: 60, frequencyPerYear: 2, seasonMonths: [4, 10], note: "Außenwasser absperren/öffnen, Gartentechnik, Heizungsvorlauf prüfen." },
  { id: "kleinreparaturen", label: "Leuchtmittelwechsel und Kleinreparaturen (Stundenkontingent)", category: "bedarf", unit: "kontingent", defaultQuantity: 2, quantityLabel: "Std. je Monat", frequencyPerYear: 12, materialCostPerYear: 120, note: "Mehrstunden nach Aufwand abrechnen; Abruf dokumentieren." },
  { id: "graffiti_wildmuell", label: "Graffiti- und Wildmüllbeseitigung (Bedarfskontingent)", category: "bedarf", unit: "kontingent", defaultQuantity: 1, quantityLabel: "Std. je Monat", frequencyPerYear: 12, materialCostPerYear: 60, note: "Material = Entsorgung/Reinigungsmittel." },
];

export const HMS_CATALOG_BY_ID: Readonly<Record<string, HmsCatalogItem>> = Object.fromEntries(HMS_CATALOG.map((c) => [c.id, c]));

export const HMS_UNIT_LABELS: Record<HmsUnit, { quantity: string; time: string | null; short: string }> = {
  pauschal: { quantity: "Anzahl", time: "Min. je Einsatz", short: "pausch." },
  m2: { quantity: "m²", time: "Leistung m²/h", short: "m²" },
  stueck: { quantity: "Stück", time: "Min. je Stück", short: "Stk." },
  lfm: { quantity: "lfm", time: "Min. je lfm", short: "lfm" },
  kontingent: { quantity: "Std. je Periode", time: null, short: "Std." },
};

export const HMS_DEFAULTS = {
  travelMinutesPerVisitDay: 15,
  materialMarkupPct: 15,
  contingentOverageBilled: true,
} as const;

/** Orientierung: marktübliche HMS-Verrechnungssätze €/h netto. */
export const HMS_RATE_BENCHMARK = { min: 28, low: 32, high: 45 } as const;

/** Vorauswahl nach Objekttyp (OBJECT_TYPES aus data/object-types.ts). */
export const HMS_PRESETS_BY_OBJECT_TYPE: Readonly<Record<string, readonly string[]>> = {
  Wohnanlage: ["kontrollgang", "treppenhaus_kontrolle", "technik_kontrolle", "muelltonnen", "muellplatz", "aussenanlagen_fegen", "rasen_maehen", "hecke_schneiden", "laub_entfernen", "kleinreparaturen"],
  "Büro": ["kontrollgang", "technik_kontrolle", "muelltonnen", "aussenanlagen_fegen", "kleinreparaturen"],
  Praxis: ["kontrollgang", "technik_kontrolle", "muelltonnen", "kleinreparaturen"],
  Schule: ["kontrollgang", "spielplatz_kontrolle", "aussenanlagen_fegen", "laub_entfernen", "graffiti_wildmuell", "kleinreparaturen"],
  Hotel: ["kontrollgang", "technik_kontrolle", "muellplatz", "aussenanlagen_fegen", "kleinreparaturen"],
  Einzelhandel: ["kontrollgang", "muellplatz", "aussenanlagen_fegen", "graffiti_wildmuell", "kleinreparaturen"],
  Industrie: ["kontrollgang", "technik_kontrolle", "aussenanlagen_fegen", "tiefgarage_kehren", "kleinreparaturen"],
  "Öffentlich": ["kontrollgang", "aussenanlagen_fegen", "laub_entfernen", "graffiti_wildmuell", "kleinreparaturen"],
};
export const HMS_PRESET_FALLBACK: readonly string[] = ["kontrollgang", "muelltonnen", "aussenanlagen_fegen", "kleinreparaturen"];

/** Neue Aufgabe aus dem Katalog. id kommt vom Aufrufer (uuidv4()). */
export function hmsTaskFromCatalog(item: HmsCatalogItem, id: string): HmsTask {
  return {
    id,
    catalogId: item.id,
    label: item.label,
    unit: item.unit,
    quantity: item.defaultQuantity,
    minutesPerUnit: item.minutesPerUnit,
    perfM2h: item.perfM2h,
    frequencyPerYear: item.frequencyPerYear,
    seasonMonths: item.seasonMonths ? [...item.seasonMonths] : undefined,
    materialCostPerYear: item.materialCostPerYear,
    enabled: true,
  };
}

/** Leeres HMS-Modul; mit makeId (z. B. uuidv4) wird die Vorauswahl des Objekttyps übernommen. */
export function createDefaultHms(objectType?: string, makeId?: () => string): HmsConfig {
  const keys = makeId ? (objectType && HMS_PRESETS_BY_OBJECT_TYPE[objectType]) || HMS_PRESET_FALLBACK : [];
  return {
    schemaVersion: 1,
    enabled: true,
    tasks: makeId ? keys.map((k) => hmsTaskFromCatalog(HMS_CATALOG_BY_ID[k], makeId())) : [],
    travelMinutesPerVisitDay: HMS_DEFAULTS.travelMinutesPerVisitDay,
    materialMarkupPct: HMS_DEFAULTS.materialMarkupPct,
    contingentOverageBilled: HMS_DEFAULTS.contingentOverageBilled,
  };
}
