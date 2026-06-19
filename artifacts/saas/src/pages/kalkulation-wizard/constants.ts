import type { FrequencyKey } from "@/store/use-store";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const STEP_LABELS: Record<WizardStep, string> = {
  1: "Objekt",
  2: "Räume",
  3: "Turnus",
  4: "Leistung",
  5: "Rüstzeit",
  6: "Kosten",
  7: "Prüfung",
  8: "Ergebnis",
};

export const OBJECT_TYPES = [
  "Büro",
  "Praxis",
  "Schule",
  "Hotel",
  "Einzelhandel",
  "Industrie",
  "Wohnanlage",
  "Öffentlich",
  "Sonstiges",
];

export const FREQUENCY_OPTIONS: { key: FrequencyKey; label: string; short: string }[] = [
  { key: "monthly", label: "1x im Monat", short: "1x/Mo" },
  { key: "biweekly", label: "Alle 14 Tage", short: "14-tägig" },
  { key: "1x_week", label: "1x wöchentlich", short: "1x/Wo" },
  { key: "2x_week", label: "2x wöchentlich", short: "2x/Wo" },
  { key: "3x_week", label: "3x wöchentlich", short: "3x/Wo" },
  { key: "5x_week", label: "5x wöchentlich", short: "5x/Wo" },
  { key: "7x_week", label: "Täglich", short: "Täglich" },
];

export function fmtEuro(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
