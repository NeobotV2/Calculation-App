/* ─────────────────────────────────────────────────────────────────────────
   Branchen-Benchmarks für die Unterhaltsreinigung (Deutschland).

   Zentrale, pflegbare Struktur für Erfahrungswerte. Die Werte sind bewusst
   konservative Orientierungsbänder (Stand: übliche Marktpraxis, BIV/RAL-
   orientiert) — KEINE verbindlichen Marktdaten. Sie dienen Plausibilitäts-
   hinweisen und der Preis-Einordnung und können hier zentral aktualisiert
   oder später aus echten Nachkalkulationen/AI-Analysen gespeist werden.
   ───────────────────────────────────────────────────────────────────────── */

export interface BenchmarkBand {
  /** Untergrenze — darunter gilt der Wert als kritisch. */
  min: number;
  /** Typischer Bereich (von–bis). */
  low: number;
  high: number;
  /** Obergrenze — darüber gilt der Wert als auffällig hoch. */
  max: number;
}

export const BENCHMARKS = {
  /** Monatspreis pro m² Reinigungsfläche (Unterhaltsreinigung, €/m²/Monat). */
  pricePerSqmMonthly: { min: 0.8, low: 1.5, high: 3.5, max: 6.0 } as BenchmarkBand,

  /** Verrechnungssatz €/h (gewerbliche Unterhaltsreinigung). */
  hourlyRate: { min: 18, low: 24, high: 38, max: 55 } as BenchmarkBand,

  /** Zielmarge in % (branchenüblich). */
  marginPct: { min: 3, low: 8, high: 15, max: 25 } as BenchmarkBand,

  /** Anteil Sanitärkosten an Gesamtkosten, ab dem gesondert kalkuliert werden sollte. */
  sanitaryShareWarn: 0.3,

  /**
   * Produktive Einsatzstunden pro Monat und Vollzeitkraft (nach Ausfallzeiten).
   * Grundlage der Personalbedarfs-Schätzung (173 h vertraglich × ~0,8 produktiv).
   */
  hoursPerFteMonth: 140,

  /** Maximale Monatsstunden, die eine einzelne Teilzeit-/Minijob-Kraft üblich stemmt. */
  hoursSinglePersonMax: 45,
} as const;

export type PriceVerdict = "kritisch" | "günstig" | "marktüblich" | "hochwertig" | "auffällig hoch";

/** Einordnung eines €/m²-Monatspreises in das Benchmark-Band. */
export function classifyPricePerSqm(pricePerSqm: number): PriceVerdict {
  const b = BENCHMARKS.pricePerSqmMonthly;
  if (pricePerSqm < b.min) return "kritisch";
  if (pricePerSqm < b.low) return "günstig";
  if (pricePerSqm <= b.high) return "marktüblich";
  if (pricePerSqm <= b.max) return "hochwertig";
  return "auffällig hoch";
}

/** Geschätzter Personalbedarf (Vollzeit-Äquivalente) für Monatsstunden. */
export function estimateFte(monthlyHours: number): number {
  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) return 0;
  return monthlyHours / BENCHMARKS.hoursPerFteMonth;
}
