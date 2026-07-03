/**
 * Nachkalkulation — reine Vergleichslogik zwischen geplanter Kalkulation und
 * tatsächlich geleisteten Ist-Stunden eines Objekts.
 *
 * Semantik:
 * - Alle Stundenangaben sind MONATLICHE Summen inkl. aller Reinigungsintervalle
 *   (nicht je Einzelreinigung).
 * - `monthlyPrice` ist der vereinbarte monatliche Festpreis (netto). Der Preis
 *   bleibt bei Mehr- oder Minderstunden fix — Abweichungen schlagen daher
 *   direkt auf die reale Marge durch.
 * - Kostenbasis ist der Vollkostensatz pro Stunde
 *   (`calcHourlyRate(config).vollkosten`), d. h. Lohn inkl. Sozialversicherung,
 *   Ausfallzeiten und Gemeinkosten, OHNE Gewinnmarge.
 * - Nicht-endliche (NaN/±Infinity) oder negative Eingaben werden als 0
 *   behandelt; alle Ergebnisse sind garantiert endliche Zahlen.
 */

/**
 * Schwellwert "besser": Liegen die Ist-Stunden unter 98 % der Plan-Stunden
 * (mehr als 2 % Einsparung), gilt das Objekt als besser als geplant.
 */
export const VERDICT_BESSER_THRESHOLD = 0.98;

/**
 * Schwellwert "im_plan": Ist-Stunden bis einschließlich 105 % der Plan-Stunden
 * (bis +5 % Überschreitung) gelten noch als im Plan; darüber "schlechter".
 */
export const VERDICT_IM_PLAN_THRESHOLD = 1.05;

/** Gesamturteil des Plan/Ist-Vergleichs. */
export type NachkalkulationVerdict = "besser" | "im_plan" | "schlechter";

export interface NachkalkulationInput {
  /** Kalkulierte Monatsstunden (Plan), inkl. aller Reinigungsintervalle. */
  plannedHours: number;
  /** Tatsächlich geleistete Monatsstunden (Ist). */
  actualHours: number;
  /** Vereinbarter monatlicher Festpreis (netto) in Euro. */
  monthlyPrice: number;
  /** Vollkostensatz pro Stunde in Euro (ohne Gewinnmarge). */
  vollkosten: number;
  /** Gesamtfläche des Objekts in m² (einfach gezählt). */
  area: number;
}

export interface NachkalkulationResult {
  /**
   * Stundenabweichung in Prozent: (Ist − Plan) / Plan × 100.
   * Positiv = Mehrstunden, negativ = Einsparung. 0, wenn keine Plan-Stunden
   * vorliegen (kein Vergleichsmaßstab).
   */
  hoursDeviationPct: number;
  /** Tatsächliche monatliche Vollkosten: Ist-Stunden × Vollkostensatz. */
  actualCostMonthly: number;
  /**
   * Reale Marge in Prozent beim FESTEN Monatspreis:
   * (Preis − Ist-Kosten) / Preis × 100. 0, wenn kein Preis vorliegt.
   */
  actualMarginPct: number;
  /** Geplante Marge in Prozent, analog mit den Plan-Stunden gerechnet. */
  plannedMarginPct: number;
  /**
   * Effektive Flächenleistung: Objektfläche ÷ geleistete Monatsstunden.
   * ACHTUNG: Die Stunden enthalten alle Reinigungsintervalle des Monats,
   * die Fläche zählt aber nur einmal — dies ist ein monatlicher
   * Aggregat-Indikator zur Verlaufsbeobachtung, KEIN Leistungswert
   * (m²/h je Einzelreinigung) im Sinne des BIV. 0 bei fehlender Fläche
   * oder fehlenden Ist-Stunden.
   */
  actualPerfSqmPerHour: number;
  /**
   * Gesamturteil anhand der dokumentierten Schwellwerte:
   * Ist < Plan × {@link VERDICT_BESSER_THRESHOLD} → "besser",
   * Ist ≤ Plan × {@link VERDICT_IM_PLAN_THRESHOLD} → "im_plan",
   * sonst "schlechter". Ohne Plan-Stunden: "im_plan" (kein Maßstab).
   */
  verdict: NachkalkulationVerdict;
}

/** Nicht-endliche oder negative Werte auf 0 normalisieren. */
function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Vergleicht die geplante Kalkulation eines Objekts mit den tatsächlich
 * geleisteten Monatsstunden (Plan/Ist-Vergleich der Nachkalkulation).
 * Vollständig gegen 0-, NaN- und Infinity-Eingaben abgesichert.
 */
export function compareNachkalkulation(input: NachkalkulationInput): NachkalkulationResult {
  const planned = sanitize(input.plannedHours);
  const actual = sanitize(input.actualHours);
  const price = sanitize(input.monthlyPrice);
  const vollkosten = sanitize(input.vollkosten);
  const area = sanitize(input.area);

  const hoursDeviationPct = planned > 0 ? ((actual - planned) / planned) * 100 : 0;

  const actualCostMonthly = actual * vollkosten;
  const plannedCostMonthly = planned * vollkosten;

  const actualMarginPct = price > 0 ? ((price - actualCostMonthly) / price) * 100 : 0;
  const plannedMarginPct = price > 0 ? ((price - plannedCostMonthly) / price) * 100 : 0;

  const actualPerfSqmPerHour = area > 0 && actual > 0 ? area / actual : 0;

  let verdict: NachkalkulationVerdict;
  if (planned <= 0) {
    verdict = "im_plan";
  } else if (actual < planned * VERDICT_BESSER_THRESHOLD) {
    verdict = "besser";
  } else if (actual <= planned * VERDICT_IM_PLAN_THRESHOLD) {
    verdict = "im_plan";
  } else {
    verdict = "schlechter";
  }

  return {
    hoursDeviationPct,
    actualCostMonthly,
    actualMarginPct,
    plannedMarginPct,
    actualPerfSqmPerHour,
    verdict,
  };
}
