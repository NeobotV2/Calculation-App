/* ─────────────────────────────────────────────────────────────────────────
   Leistungsmodule Winterdienst & Hausmeisterservice (HMS) — Datenmodell.
   schemaVersion 1. Reine Typen, keine Laufzeit-Importe (keine Zyklen mit
   dem Store). Alle Geldwerte netto in €, alle Zeiten in Stunden, sofern
   der Feldname nichts anderes sagt (…Minutes…, …Pct).
   ───────────────────────────────────────────────────────────────────────── */

/** 1 = Januar … 12 = Dezember. */
export type MonthIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Sätze, mit denen ein Modul rechnet, sofern es keine eigenen Overrides hat. */
export interface ModuleRates {
  /** Verrechnungssatz des Objekts €/h (project.hourlyRate ?? globaler Satz). */
  rate: number;
  /** Vollkosten €/h (calcHourlyRate(hourlyRateConfig).vollkosten). */
  vollkosten: number;
}

/* ── Winterdienst ─────────────────────────────────────────────────────── */

export type WinterRegion = "kueste" | "flachland" | "mittelgebirge" | "hochlage";
export type WinterAreaType = "gehweg" | "zufahrt" | "parkplatz" | "treppe" | "rampe" | "sonstige";
export type ClearingMethod = "manuell" | "maschinell";
export type SpreadMaterial = "salz" | "splitt" | "granulat";
/** pauschale_12: Saisonpauschale in 12 Monatsraten · pauschale_saison: in n Saisonraten · pro_einsatz: Abrechnung je Einsatz. */
export type WinterBillingMode = "pauschale_12" | "pauschale_saison" | "pro_einsatz";
export type WeatherScenarioKey = "mild" | "normal" | "streng";

export interface WinterArea {
  id: string;
  label: string;
  type: WinterAreaType;
  /** Fläche in m² (einfach gezählt). Gehweg-Eingabehilfe: Länge × Breite. */
  areaM2: number;
  /** Gewünschte Methode; bei machineAllowed = false (Treppe) wird immer manuell gerechnet. */
  method: ClearingMethod;
  /** Schnee räumen — fällt nur bei Räumeinsätzen an (Anteil clearingSharePct). */
  clear: boolean;
  /** Streuen — fällt bei JEDEM Einsatz an. */
  spread: boolean;
  /** Override Räumleistung m²/h (> 0), sonst Katalog [type][Methode]. */
  clearingPerfM2h?: number;
  /** Override Streuleistung m²/h (> 0), sonst Katalog [type][Methode]. */
  spreadingPerfM2h?: number;
  /** Streumittel dieser Fläche; undefined = config.material. */
  material?: SpreadMaterial;
}

export interface MaterialOverride {
  /** Streumenge g/m² je Einsatz (≥ 0). */
  gramsPerM2?: number;
  /** Einkaufspreis netto €/kg (≥ 0). */
  pricePerKg?: number;
}

export interface WinterdienstConfig {
  schemaVersion: 1;
  /** false = pausiert: Daten bleiben erhalten, fließen aber nirgends ein. */
  enabled: boolean;
  /** Steuert Vorbelegung (Einsätze, Räumanteil, Saison) und Plausibilitätsbänder. */
  region: WinterRegion;
  /** Saisonmonate, eindeutig, aufsteigend. Default Nov–Mär = [1, 2, 3, 11, 12]. */
  seasonMonths: MonthIndex[];
  /** Erwartete Einsätze (Räumen und/oder Streuen) je Saison — Erwartungswert, kein Minimum. */
  expectedEinsaetze: number;
  /** Anteil der Einsätze mit Schneeräumung in % (Rest = reine Glättebekämpfung). */
  clearingSharePct: number;
  areas: WinterArea[];
  /** Standard-Streumittel aller Flächen ohne eigenes material. */
  material: SpreadMaterial;
  materialOverrides?: Partial<Record<SpreadMaterial, MaterialOverride>>;
  /** Aufschlag auf den Streugut-Einkauf in %. */
  materialMarkupPct: number;
  /** Kommunale Satzung schränkt Auftausalz am Standort ein. */
  saltRestricted: boolean;
  /** An-/Abfahrt je Einsatz in Minuten (bei Tourenplanung anteilig). */
  travelMinutesPerEinsatz: number;
  /** Räum-/Streuprotokoll je Einsatz in Minuten (Beweissicherung). */
  documentationMinutesPerEinsatz: number;
  /** Einmalige Stunden je Saison: Begehung, Markierungsstangen, Streugutbehälter befüllen. */
  seasonSetupHours: number;
  /** Bereitschaftspauschale (Erlös) in € je Saisonmonat. */
  standbyFeeMonthly: number;
  /** Bereitschaftskosten (Rufbereitschaft, Wetterdienst, Disposition) in € je Saisonmonat — unabhängig von der Gebühr. */
  standbyCostMonthly: number;
  /** Anteil der Einsatzstunden früh/nachts/am Wochenende in %. */
  offHoursSharePct: number;
  /** Preisaufschlag auf diese Stunden in % (Mischwert aus Nacht/Sonntag/Feiertag). */
  offHoursSurchargePct: number;
  /** Lohnzuschlag auf diese Stunden in % (Kostenseite); undefined = offHoursSurchargePct. */
  offHoursWageSurchargePct?: number;
  /** Haftungs-/Risikozuschlag (Verkehrssicherungspflicht) auf den Leistungserlös in %. */
  liabilitySurchargePct: number;
  /** Anteil des Haftungszuschlags, der als Risikovorsorge (Kosten) gilt, in %. 100 = margenneutral. */
  riskProvisionPct: number;
  /** Maschinenstunde Erlös €/h OHNE Fahrer (der Fahrer steckt in den Arbeitsstunden). */
  machineRatePerHour: number;
  /** Maschinenstunde Selbstkosten €/h OHNE Fahrer (AfA, Kraftstoff, Wartung, Versicherung). */
  machineCostPerHour: number;
  billingMode: WinterBillingMode;
  /** Nur Pauschale: inkludierte Einsätze (Deckelung); darüber Abrechnung je Einsatz. undefined = keine Deckelung. */
  capEinsaetze?: number;
  /** Zeitfenster, in dem geräumt sein muss (z. B. 4–7 Uhr = 3 h). */
  clearingWindowHours: number;
  /** Eigener Verrechnungssatz €/h nur für den Winterdienst (> 0), sonst Objektsatz. */
  rateOverride?: number;
  /** Eigene Vollkosten €/h nur für den Winterdienst (> 0), sonst Vollkosten aus dem Kalkulator. */
  vollkostenOverride?: number;
}

export interface WinterAreaResult {
  areaId: string;
  effectiveMethod: ClearingMethod;
  clearingPerfM2h: number;
  spreadingPerfM2h: number;
  /** Stunden für einen Räum-Durchgang (0 ohne clear). */
  clearingHours: number;
  /** Stunden für einen Streu-Durchgang (0 ohne spread). */
  spreadingHours: number;
  materialKg: number;
  materialCost: number;
}

export interface WinterPerEinsatz {
  /** Räumstunden, WENN geräumt wird (alle clear-Flächen). */
  clearingHours: number;
  /** Streustunden (alle spread-Flächen). */
  spreadingHours: number;
  /** Anfahrt + Dokumentation. */
  fixedHours: number;
  /** Erwartete Arbeitsstunden je Einsatz: c·clearing + spreading + fixed. */
  laborHours: number;
  /** Erwartete Maschinenstunden je Einsatz (Teilmenge der Arbeitsstunden). */
  machineHours: number;
  materialKg: number;
  /** Streugut-Einkauf je Einsatz in €. */
  materialCost: number;
  /** Leistungserlös vor Haftungszuschlag (Lohn inkl. Zeitzuschlag + Maschine). */
  serviceRevenue: number;
  /** Variabler Preis je Einsatz (= Einzelpreis bei pro_einsatz bzw. über der Deckelung). */
  revenue: number;
  /** Variable Kosten je Einsatz inkl. Risikovorsorge. */
  cost: number;
}

export interface WinterRevenue { labor: number; machine: number; liability: number; material: number; standby: number; total: number }
export interface WinterCost { labor: number; machine: number; material: number; standby: number; riskProvision: number; total: number }

export interface WinterScenario {
  key: WeatherScenarioKey;
  einsaetze: number;
  revenue: number;
  cost: number;
  contribution: number;
  marginPct: number;
}

export interface WinterBilling {
  mode: WinterBillingMode;
  /** Vertragliche Saisonpauschale netto (null bei pro_einsatz). */
  pauschaleSeason: number | null;
  /** Rate × Anzahl: Pauschale-Raten bzw. bei pro_einsatz die Bereitschafts-/Vorhaltepauschale je Saisonmonat. */
  installmentAmount: number;
  installmentCount: number;
  /** Preis je Einsatz (pro_einsatz) bzw. je Einsatz über der Deckelung. */
  pricePerEinsatz: number;
  capEinsaetze: number | null;
  /** Ab dieser Einsatzzahl entsteht Verlust (null = keine Verlustschwelle). */
  lossAboveEinsaetze: number | null;
  /** Nur pro_einsatz: unter dieser Einsatzzahl entsteht Verlust (0 = nie). */
  lossBelowEinsaetze: number | null;
  /** Erwarteter Saisonerlös = revenue.total (in allen Modi identisch). */
  expectedSeasonTotal: number;
}

export interface WinterdienstResult {
  rate: number;
  vollkosten: number;
  /** vollkosten × (1 + s·Xw): Kosten je Arbeitsstunde im Einsatz. */
  laborCostPerHour: number;
  seasonMonths: MonthIndex[];
  seasonMonthsCount: number;
  einsaetze: number;
  areas: WinterAreaResult[];
  areaM2Total: number;
  perEinsatz: WinterPerEinsatz;
  /** Fixer Saisonerlös: Bereitschaft + Saisonvorbereitung. */
  fixedRevenueSeason: number;
  /** Fixe Saisonkosten: Bereitschaftskosten + Saisonvorbereitung. */
  fixedCostSeason: number;
  /** E·h_E + Vorbereitungsstunden. */
  laborHoursSeason: number;
  machineHoursSeason: number;
  materialKgSeason: number;
  revenue: WinterRevenue;
  cost: WinterCost;
  contributionSeason: number;
  marginPct: number;
  /** Normalisiert: Saisonwert / 12 (Ø-Monat). */
  revenueMonthly: number;
  costMonthly: number;
  laborCostMonthly: number;
  laborHoursMonthly: number;
  billing: WinterBilling;
  scenarios: Record<WeatherScenarioKey, WinterScenario>;
  /** Gleichzeitig benötigte Kräfte im Räumfenster bei Schneefall (> 1 ⇒ Kolonne). */
  crewAtPeak: number;
  /** Arbeitsstunden je Kalendermonat (Index 0 = Januar), gleichverteilt auf die Saison; Σ = laborHoursSeason. */
  monthlyLaborHours: number[];
}

/* ── Hausmeisterservice ───────────────────────────────────────────────── */

export type HmsUnit = "pauschal" | "m2" | "stueck" | "lfm" | "kontingent";
export type HmsCategory = "kontrolle" | "aussenanlagen" | "gruenpflege" | "abfall" | "technik" | "bedarf";

export interface HmsTask {
  id: string;
  /** Referenz auf HMS_CATALOG; undefined = freie Leistung. */
  catalogId?: string;
  label: string;
  unit: HmsUnit;
  /** pauschal: Anzahl · m2: m² · stueck: Stück · lfm: Meter · kontingent: Stunden je Abrufperiode. */
  quantity: number;
  /** pauschal/stueck/lfm: Minuten je Einheit. */
  minutesPerUnit?: number;
  /** m2: Leistung in m²/h. */
  perfM2h?: number;
  /** Ausführungen je Jahr (Saisonleistung: innerhalb der Saison); kontingent: Abrufperioden je Jahr (12 = monatlich). */
  frequencyPerYear: number;
  /** Saisonmonate — nur Verteilung/Kapazität; der Preis bleibt Jahreswert / 12. */
  seasonMonths?: MonthIndex[];
  /** Material/Entsorgung in € netto Einkauf je Jahr. */
  materialCostPerYear?: number;
  /** false = abgewählt (Werte bleiben erhalten). */
  enabled: boolean;
}

export interface HmsConfig {
  schemaVersion: 1;
  enabled: boolean;
  tasks: HmsTask[];
  /** An-/Abfahrt je Einsatztag in Minuten. */
  travelMinutesPerVisitDay: number;
  /** Override Einsatztage/Jahr; undefined = höchste Frequenz der aktiven Nicht-Kontingent-Leistungen. */
  visitDaysPerYear?: number;
  materialMarkupPct: number;
  /** Mehrstunden über das Kontingent werden nach Aufwand berechnet. */
  contingentOverageBilled: boolean;
  rateOverride?: number;
  vollkostenOverride?: number;
}

export interface HmsTaskResult {
  id: string;
  label: string;
  unit: HmsUnit;
  hoursPerEinsatz: number;
  hoursAnnual: number;
  materialCostAnnual: number;
  /** Ohne Anfahrt (Anfahrt ist eine eigene Position). */
  revenueAnnual: number;
  costAnnual: number;
}

export interface HmsResult {
  rate: number;
  vollkosten: number;
  /** Nur aktive Leistungen (enabled). */
  tasks: HmsTaskResult[];
  taskHoursAnnual: number;
  visitDaysPerYear: number;
  travelHoursAnnual: number;
  laborHoursAnnual: number;
  contingentHoursAnnual: number;
  materialCostAnnual: number;
  materialRevenueAnnual: number;
  revenueAnnual: number;
  costAnnual: number;
  contributionAnnual: number;
  marginPct: number;
  revenueMonthly: number;
  costMonthly: number;
  laborCostMonthly: number;
  laborHoursMonthly: number;
  contingentHoursMonthly: number;
  /** Index 0 = Januar; Σ = laborHoursAnnual. */
  monthlyLaborHours: number[];
  peakMonthHours: number;
}

/* ── Ist-Daten (Nachkalkulation der Module) ───────────────────────────── */

export interface WinterdienstActual {
  id: string;
  /** Saison, z. B. "2025/26". */
  season: string;
  einsaetze: number;
  /** Ist-Arbeitsstunden der Einsätze (ohne Saisonvorbereitung). */
  laborHours?: number;
  materialKg?: number;
  note?: string;
  recordedAt: string;
}

export interface HmsActual {
  id: string;
  year: number;
  /** Ist-Arbeitsstunden des Jahres inkl. Anfahrt. */
  laborHours: number;
  contingentHoursUsed?: number;
  note?: string;
  recordedAt: string;
}

export interface ServiceActuals {
  winterdienst?: WinterdienstActual[];
  hms?: HmsActual[];
}
