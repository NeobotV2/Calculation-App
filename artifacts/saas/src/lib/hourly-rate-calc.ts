import { BUNDESLAENDER, DEFAULT_BUNDESLAND_ID } from "@/data/bundeslaender";

export type EmploymentType = "minijob" | "teilzeit" | "vollzeit";
export type CleaningType = "unterhalt" | "sonder" | "glas" | "bauend";

export interface SVRate {
  label: string;
  rate: number;
}

export interface AusfallzeitenConfig {
  weeklyHours: number;
  urlaubTage: number;
  krankheitTage: number;
  bundeslandId: string;
  fortbildungTage: number;
}

export interface OverheadItem {
  id: string;
  label: string;
  rate: number;
}

export interface SchichtzuschlagConfig {
  enabled: boolean;
  zuschlag: number;
  anteil: number;
}

export interface SchichtzuschlaegeConfig {
  nacht: SchichtzuschlagConfig;
  sonntag: SchichtzuschlagConfig;
  feiertag: SchichtzuschlagConfig;
}

export interface HourlyRateConfig {
  baseLohn: number;
  employmentType: EmploymentType;
  cleaningType: CleaningType;
  svRatesMinijob: SVRate[];
  svRatesVollzeit: SVRate[];
  ausfallzeiten: AusfallzeitenConfig;
  overheads: OverheadItem[];
  gewinnmarge: number;
  schichtzuschlaege: SchichtzuschlaegeConfig;
}

export const CLEANING_TYPE_LABELS: Record<CleaningType, string> = {
  unterhalt: "Unterhalts\u00ADreinigung",
  sonder: "Sonder\u00ADreinigung",
  glas: "Glas\u00ADreinigung",
  bauend: "Bauend\u00ADreinigung",
};

export const DEFAULT_SV_RATES_MINIJOB: SVRate[] = [
  { label: "Krankenversicherung", rate: 13.0 },
  { label: "Rentenversicherung", rate: 15.0 },
  { label: "Pauschalsteuer", rate: 2.0 },
  { label: "Umlagen (U1, U2, Insolvenz)", rate: 1.2 },
];

export const DEFAULT_SV_RATES_VOLLZEIT: SVRate[] = [
  { label: "Krankenversicherung", rate: 8.55 },
  { label: "Rentenversicherung", rate: 9.3 },
  { label: "Arbeitslosenversicherung", rate: 1.3 },
  { label: "Pflegeversicherung", rate: 1.8 },
  { label: "BG / Unfallversicherung", rate: 2.3 },
];

export const DEFAULT_OVERHEADS: OverheadItem[] = [
  { id: "verwaltung", label: "Verwaltung / Overhead", rate: 8 },
  { id: "material", label: "Material & Verbrauchsmittel", rate: 3 },
  { id: "aufsicht", label: "Objektleitung / Aufsicht", rate: 5 },
  { id: "risiko", label: "Risikozuschlag", rate: 3 },
  { id: "fahrtkosten", label: "Fahrtkosten", rate: 2 },
];

function applyOverheadDeltas(
  deltas: Partial<Record<string, number>>
): OverheadItem[] {
  return DEFAULT_OVERHEADS.map((o) => ({
    ...o,
    rate: deltas[o.id] !== undefined ? o.rate + deltas[o.id]! : o.rate,
  }));
}

export const CLEANING_TYPE_OVERHEADS: Record<CleaningType, OverheadItem[]> = {
  unterhalt: DEFAULT_OVERHEADS.map((o) => ({ ...o })),
  sonder: applyOverheadDeltas({ material: 5, risiko: 3 }),
  glas: applyOverheadDeltas({ material: 4, risiko: 5 }),
  bauend: applyOverheadDeltas({ material: 8, risiko: 5, fahrtkosten: -DEFAULT_OVERHEADS.find((o) => o.id === "fahrtkosten")!.rate }),
};

export const DEFAULT_SCHICHTZUSCHLAEGE: SchichtzuschlaegeConfig = {
  nacht: { enabled: false, zuschlag: 25, anteil: 0 },
  sonntag: { enabled: false, zuschlag: 50, anteil: 0 },
  feiertag: { enabled: false, zuschlag: 100, anteil: 0 },
};

export function getDefaultConfig(): HourlyRateConfig {
  return {
    baseLohn: 15.0,
    employmentType: "minijob",
    cleaningType: "unterhalt",
    svRatesMinijob: DEFAULT_SV_RATES_MINIJOB.map((r) => ({ ...r })),
    svRatesVollzeit: DEFAULT_SV_RATES_VOLLZEIT.map((r) => ({ ...r })),
    ausfallzeiten: {
      weeklyHours: 40,
      urlaubTage: 30,
      krankheitTage: 10,
      bundeslandId: DEFAULT_BUNDESLAND_ID,
      fortbildungTage: 2,
    },
    overheads: DEFAULT_OVERHEADS.map((o) => ({ ...o })),
    gewinnmarge: 10,
    schichtzuschlaege: {
      nacht: { ...DEFAULT_SCHICHTZUSCHLAEGE.nacht },
      sonntag: { ...DEFAULT_SCHICHTZUSCHLAEGE.sonntag },
      feiertag: { ...DEFAULT_SCHICHTZUSCHLAEGE.feiertag },
    },
  };
}

export interface SchichtzuschlagBreakdown {
  nachtBetrag: number;
  sonntagBetrag: number;
  feiertagBetrag: number;
  totalZuschlag: number;
  effektiverLohn: number;
}

export interface HourlyRateBreakdown {
  baseLohn: number;
  schichtzuschlag: SchichtzuschlagBreakdown;
  svTotalRate: number;
  svBetrag: number;
  lohnkostenProStunde: number;

  jahresArbeitsstunden: number;
  urlaubStunden: number;
  krankheitStunden: number;
  feiertageStunden: number;
  fortbildungStunden: number;
  totalAusfallStunden: number;
  produktivStunden: number;
  produktivitaetsquote: number;
  ausfallzuschlag: number;
  lohnkostenMitAusfall: number;

  overheadTotalRate: number;
  overheadBetrag: number;
  vollkosten: number;

  gewinnmarge: number;
  gewinnBetrag: number;
  stundenverrechnungssatz: number;
}

export function calcHourlyRate(config: HourlyRateConfig): HourlyRateBreakdown {
  const sz = config.schichtzuschlaege ?? DEFAULT_SCHICHTZUSCHLAEGE;
  const nachtBetrag = (sz.nacht?.enabled)
    ? config.baseLohn * (sz.nacht.zuschlag / 100) * (sz.nacht.anteil / 100)
    : 0;
  const sonntagBetrag = (sz.sonntag?.enabled)
    ? config.baseLohn * (sz.sonntag.zuschlag / 100) * (sz.sonntag.anteil / 100)
    : 0;
  const feiertagBetrag = (sz.feiertag?.enabled)
    ? config.baseLohn * (sz.feiertag.zuschlag / 100) * (sz.feiertag.anteil / 100)
    : 0;
  const totalZuschlag = nachtBetrag + sonntagBetrag + feiertagBetrag;
  const effektiverLohn = config.baseLohn + totalZuschlag;

  const schichtzuschlag: SchichtzuschlagBreakdown = {
    nachtBetrag,
    sonntagBetrag,
    feiertagBetrag,
    totalZuschlag,
    effektiverLohn,
  };

  const svRates =
    config.employmentType === "minijob"
      ? config.svRatesMinijob
      : config.svRatesVollzeit;
  const svTotalRate = svRates.reduce((sum, r) => sum + r.rate, 0);
  const svBetrag = effektiverLohn * (svTotalRate / 100);
  const lohnkostenProStunde = effektiverLohn + svBetrag;

  const hoursPerDay = config.ausfallzeiten.weeklyHours / 5;
  const weeksPerYear = 52;
  const jahresArbeitsstunden = config.ausfallzeiten.weeklyHours * weeksPerYear;

  const urlaubStunden = config.ausfallzeiten.urlaubTage * hoursPerDay;
  const krankheitStunden = config.ausfallzeiten.krankheitTage * hoursPerDay;

  const bl = BUNDESLAENDER.find(
    (b) => b.id === config.ausfallzeiten.bundeslandId
  );
  const feiertageTage = bl?.feiertage2026 ?? 10;
  const feiertageStunden = feiertageTage * hoursPerDay;
  const fortbildungStunden =
    config.ausfallzeiten.fortbildungTage * hoursPerDay;

  const totalAusfallStunden =
    urlaubStunden + krankheitStunden + feiertageStunden + fortbildungStunden;
  const produktivStunden = Math.max(
    jahresArbeitsstunden - totalAusfallStunden,
    1
  );
  const produktivitaetsquote = produktivStunden / jahresArbeitsstunden;
  const ausfallzuschlag = jahresArbeitsstunden / produktivStunden;
  const lohnkostenMitAusfall = lohnkostenProStunde * ausfallzuschlag;

  const overheadTotalRate = config.overheads.reduce(
    (sum, o) => sum + o.rate,
    0
  );
  const overheadBetrag = lohnkostenMitAusfall * (overheadTotalRate / 100);
  const vollkosten = lohnkostenMitAusfall + overheadBetrag;

  const gewinnBetrag = vollkosten * (config.gewinnmarge / 100);
  const stundenverrechnungssatz = vollkosten + gewinnBetrag;

  return {
    baseLohn: config.baseLohn,
    schichtzuschlag,
    svTotalRate,
    svBetrag,
    lohnkostenProStunde,
    jahresArbeitsstunden,
    urlaubStunden,
    krankheitStunden,
    feiertageStunden,
    fortbildungStunden,
    totalAusfallStunden,
    produktivStunden,
    produktivitaetsquote,
    ausfallzuschlag,
    lohnkostenMitAusfall,
    overheadTotalRate,
    overheadBetrag,
    vollkosten,
    gewinnmarge: config.gewinnmarge,
    gewinnBetrag,
    stundenverrechnungssatz,
  };
}
