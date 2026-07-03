import type { Project } from "@/store/use-store";
import { BENCHMARKS, estimateFte } from "@/data/benchmarks";

/* ─────────────────────────────────────────────────────────────────────────
   Risiko-Scoring (0–100) für eine Objektkalkulation.

   Jeder Faktor ist transparent: Punkte, Begründung und konkrete Empfehlung.
   0–30 = niedriges, 31–60 = mittleres, >60 = hohes Risiko. Die Gewichte sind
   Erfahrungswerte und zentral hier pflegbar.
   ───────────────────────────────────────────────────────────────────────── */

export type RiskLevel = "niedrig" | "mittel" | "hoch";

export interface RiskFactor {
  key: string;
  points: number;
  title: string;
  detail: string;
  recommendation: string;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  /** Geschätzter Personalbedarf in Vollzeit-Äquivalenten. */
  fte: number;
}

export interface RiskInput {
  project: Project;
  monthlyHours: number;
  area: number;
  monthlyCost: number;
  /** Ist-Marge auf den Umsatz in %. */
  marginPct: number;
  /**
   * Ziel-Marge auf den Umsatz in % — gleiche Basis wie marginPct!
   * Bei einem Gewinn-Aufschlag (App-Einstellung) vorher mit
   * markupToRevenueMargin() konvertieren (s. price-strategy.ts).
   */
  targetMarginPct: number;
  /** Es wird der unveränderte Standard-Verrechnungssatz genutzt. */
  usesDefaultRate: boolean;
  /**
   * Ist-Stunden aus der Nachkalkulation (falls erfasst) — Evidenz aus dem
   * laufenden Betrieb schlägt Heuristik: deutliche Mehrstunden erhöhen das
   * Risiko dieser Kalkulation unmittelbar.
   */
  actualMonthlyHours?: number;
}

/** Ab +5 % Ist-Mehrstunden: Hinweis; ab +10 %: deutliches Risiko. */
export const NACHKALK_LIGHT_OVERRUN = 0.05;
export const NACHKALK_HEAVY_OVERRUN = 0.10;

export function calcRiskScore(input: RiskInput): RiskResult {
  const factors: RiskFactor[] = [];
  const add = (key: string, points: number, title: string, detail: string, recommendation: string) =>
    factors.push({ key, points, title, detail, recommendation });

  const { project, monthlyHours, area, monthlyCost, marginPct, targetMarginPct } = input;

  // 1. Marge
  if (marginPct < 0) {
    add("margin_negative", 35, "Kalkulation unter Vollkosten",
      "Der Verrechnungssatz deckt die Selbstkosten nicht.",
      "Satz erhöhen oder Leistungsumfang reduzieren — so nicht anbieten.");
  } else if (marginPct < targetMarginPct / 2) {
    add("margin_half", 25, "Marge weit unter Zielwert",
      `Nur ${marginPct.toFixed(1)} % statt ${targetMarginPct.toFixed(1)} % Ziel-Marge.`,
      "Preis anheben oder Kostenstruktur prüfen; kaum Reserve für Unvorhergesehenes.");
  } else if (marginPct < targetMarginPct - 1e-9) {
    add("margin_low", 12, "Marge unter Zielwert",
      `${marginPct.toFixed(1)} % liegt unter der Ziel-Marge von ${targetMarginPct.toFixed(1)} %.`,
      "Verhandlungsspielraum bewusst begrenzen.");
  }

  // 2. Preis pro m² gefährlich niedrig
  const pricePerSqm = area > 0 ? monthlyCost / area : 0;
  if (area > 0 && pricePerSqm < BENCHMARKS.pricePerSqmMonthly.min) {
    add("price_sqm_low", 15, "Gefährlich niedriger m²-Preis",
      `${pricePerSqm.toFixed(2)} €/m² liegt unter dem Branchenminimum (${BENCHMARKS.pricePerSqmMonthly.min.toFixed(2)} €/m²).`,
      "Leistungswerte und Intervalle prüfen — vermutlich zu optimistisch kalkuliert.");
  }

  // 3. Fehlende Pufferzeiten
  const hasBuffers = (project.ruestzeit ?? 0) > 0 || (project.wegezeit ?? 0) > 0;
  if (!hasBuffers && project.rooms.length >= 3) {
    add("no_buffers", 10, "Keine Rüst-/Wegezeiten kalkuliert",
      "Material richten, Wege im Objekt und Schlüsselübergaben kosten real Zeit.",
      "In der Objektinfo Rüst- und Wegezeit je Einsatz hinterlegen.");
  }

  // 4. Eigene Leistungswerte deutlich über Branchenwert
  const optimisticRooms = project.rooms.filter(
    (r) => r.customPerformance && r.typePerformance > 0 && r.customPerformance > r.typePerformance * 1.5,
  ).length;
  if (optimisticRooms > 0) {
    add("perf_optimistic", 12, "Sehr optimistische Leistungswerte",
      `${optimisticRooms} Raum/Räume mit >50 % über dem Branchenwert.`,
      "Werte gegen eigene Nachkalkulationen prüfen — Unterkalkulation droht.");
  }

  // 5. Standard-Satz statt eigener Kalkulation
  if (input.usesDefaultRate) {
    add("default_rate", 10, "Standard-Verrechnungssatz",
      "Der Satz basiert nicht auf Ihrer eigenen Kostenstruktur.",
      "Verrechnungssatz-Kalkulator mit Ihren Löhnen und Gemeinkosten durchrechnen.");
  }

  // 6. Personalbedarf / operative Machbarkeit
  const fte = estimateFte(monthlyHours);
  if (monthlyHours > BENCHMARKS.hoursPerFteMonth) {
    add("staffing_multi", 8, "Mehrere Kräfte erforderlich",
      `≈ ${fte.toFixed(1)} Vollzeit-Äquivalente (${Math.round(monthlyHours)} h/Monat).`,
      "Vertretung (Urlaub/Krankheit) und Revierplanung einplanen.");
  } else if (monthlyHours > BENCHMARKS.hoursSinglePersonMax && monthlyHours <= BENCHMARKS.hoursPerFteMonth) {
    add("staffing_parttime", 4, "Über Minijob-Umfang",
      `${Math.round(monthlyHours)} h/Monat übersteigen eine einzelne geringfügige Kraft.`,
      "Teilzeitkraft oder Aufteilung auf zwei Kräfte vorsehen.");
  }

  // 7. Unvollständiges Leistungsverzeichnis
  const incompleteRooms = project.rooms.filter((r) => r.area <= 0).length;
  if (incompleteRooms > 0) {
    add("lv_incomplete", 8, "Leistungsverzeichnis unvollständig",
      `${incompleteRooms} Raum/Räume ohne Fläche.`,
      "Flächen vervollständigen, bevor das Angebot versendet wird.");
  }

  // 8. Nachkalkulation: Ist-Stunden über Plan (Evidenz aus dem Betrieb)
  const actual = input.actualMonthlyHours;
  if (actual !== undefined && Number.isFinite(actual) && actual > 0 && monthlyHours > 0) {
    const overrun = (actual - monthlyHours) / monthlyHours;
    if (overrun > NACHKALK_HEAVY_OVERRUN) {
      add("nachkalk_overrun", 15, "Nachkalkulation: deutliche Mehrstunden",
        `Ist ${actual.toFixed(1)} h statt geplanter ${monthlyHours.toFixed(1)} h (+${(overrun * 100).toFixed(0)} %).`,
        "Leistungswerte dieses Objekts korrigieren — die reale Marge liegt unter Plan.");
    } else if (overrun > NACHKALK_LIGHT_OVERRUN) {
      add("nachkalk_drift", 8, "Nachkalkulation: Mehrstunden",
        `Ist ${actual.toFixed(1)} h statt geplanter ${monthlyHours.toFixed(1)} h (+${(overrun * 100).toFixed(0)} %).`,
        "Entwicklung beobachten; bei Verstetigung Leistungswerte anpassen.");
    }
  }

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const level: RiskLevel = score <= 30 ? "niedrig" : score <= 60 ? "mittel" : "hoch";

  // Höchste Punkte zuerst — wichtigste Risiken oben.
  factors.sort((a, b) => b.points - a.points);

  return { score, level, factors, fte };
}
