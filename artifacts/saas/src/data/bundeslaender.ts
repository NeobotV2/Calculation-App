export interface Bundesland {
  id: string;
  name: string;
  feiertage2026: number;
}

export const BUNDESLAENDER: Bundesland[] = [
  { id: "bw", name: "Baden-Württemberg", feiertage2026: 12 },
  { id: "by", name: "Bayern", feiertage2026: 13 },
  { id: "be", name: "Berlin", feiertage2026: 10 },
  { id: "bb", name: "Brandenburg", feiertage2026: 11 },
  { id: "hb", name: "Bremen", feiertage2026: 9 },
  { id: "hh", name: "Hamburg", feiertage2026: 9 },
  { id: "he", name: "Hessen", feiertage2026: 10 },
  { id: "mv", name: "Mecklenburg-Vorpommern", feiertage2026: 11 },
  { id: "ni", name: "Niedersachsen", feiertage2026: 9 },
  { id: "nw", name: "Nordrhein-Westfalen", feiertage2026: 11 },
  { id: "rp", name: "Rheinland-Pfalz", feiertage2026: 11 },
  { id: "sl", name: "Saarland", feiertage2026: 12 },
  { id: "sn", name: "Sachsen", feiertage2026: 11 },
  { id: "st", name: "Sachsen-Anhalt", feiertage2026: 11 },
  { id: "sh", name: "Schleswig-Holstein", feiertage2026: 9 },
  { id: "th", name: "Thüringen", feiertage2026: 11 },
];

export const DEFAULT_BUNDESLAND_ID = "nw";
