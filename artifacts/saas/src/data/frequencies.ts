/* ─────────────────────────────────────────────────────────────────────────
   Turnus-Optionen — eine Quelle für alle Auswahlfelder (Räume, „Turnus für
   alle“, Hausmeisterservice). Labels und Faktoren kommen aus lib/calc.ts,
   damit Anzeige und Berechnung nie auseinanderlaufen.
   ───────────────────────────────────────────────────────────────────────── */
import { FREQUENCY_FACTORS, FREQUENCY_LABELS } from "@/lib/calc";
import type { FrequencyKey } from "@/store/use-store";

export interface FrequencyOption {
  key: FrequencyKey;
  /** Langtext = FREQUENCY_LABELS[key], z. B. „5x wöchentlich“. */
  label: string;
  /** Kurztext für Chips und Tabellen, z. B. „5x/Wo“. */
  short: string;
  /** Reinigungen je Monat = FREQUENCY_FACTORS[key]. */
  visitsPerMonth: number;
}

/** Alle 9 Turnus-Schlüssel, aufsteigend nach Häufigkeit. */
export const FREQUENCY_KEYS: readonly FrequencyKey[] = [
  "monthly",
  "biweekly",
  "1x_week",
  "2x_week",
  "3x_week",
  "4x_week",
  "5x_week",
  "6x_week",
  "7x_week",
];

const FREQUENCY_SHORT: Record<FrequencyKey, string> = {
  monthly: "1x/Mo",
  biweekly: "14-tägig",
  "1x_week": "1x/Wo",
  "2x_week": "2x/Wo",
  "3x_week": "3x/Wo",
  "4x_week": "4x/Wo",
  "5x_week": "5x/Wo",
  "6x_week": "6x/Wo",
  "7x_week": "Täglich",
};

/** Alle 9 Turnus-Optionen, aufsteigend (label = FREQUENCY_LABELS, visitsPerMonth = FREQUENCY_FACTORS). */
export const FREQUENCY_OPTIONS: FrequencyOption[] = FREQUENCY_KEYS.map((key) => ({
  key,
  label: FREQUENCY_LABELS[key],
  short: FREQUENCY_SHORT[key],
  visitsPerMonth: FREQUENCY_FACTORS[key],
}));

/** Option zu einem Schlüssel (unbekannte Schlüssel ⇒ undefined). */
export function getFrequencyOption(key: string): FrequencyOption | undefined {
  return FREQUENCY_OPTIONS.find((o) => o.key === key);
}

export interface HmsFrequencyPreset {
  /** Ausführungen je Jahr (HmsTask.frequencyPerYear). */
  perYear: number;
  label: string;
}

/** Schnellwahl für den Turnus von Hausmeister-Leistungen (Ausführungen je Jahr). */
export const HMS_FREQUENCY_PRESETS: HmsFrequencyPreset[] = [
  { perYear: 1, label: "jährlich" },
  { perYear: 2, label: "halbjährlich" },
  { perYear: 4, label: "quartalsweise" },
  { perYear: 12, label: "monatlich" },
  { perYear: 26, label: "14-tägig" },
  { perYear: 52, label: "wöchentlich" },
  { perYear: 104, label: "2× wöchentlich" },
  { perYear: 260, label: "werktäglich" },
];

/** Label eines HMS-Turnus: Preset-Label oder „{n}× jährlich“. */
export function getHmsFrequencyLabel(perYear: number): string {
  const preset = HMS_FREQUENCY_PRESETS.find((p) => p.perYear === perYear);
  if (preset) return preset.label;
  return `${perYear.toLocaleString("de-DE", { maximumFractionDigits: 1 })}× jährlich`;
}
