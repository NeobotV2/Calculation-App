import { calcRoom, getEffectivePerformance } from "@/lib/calc";
import type { Room } from "@/store/use-store";

/* ─────────────────────────────────────────────────────────────────────────
   Bieterspannen-Kalkulation für öffentliche Ausschreibungen.

   Aus einem Leistungsverzeichnis werden drei Szenarien berechnet:
   - Mindestwert  (aggressiv):    Leistungswerte +X %, Verrechnungssatz −Y %
   - Mittelwert   (kalkulatorisch): Basis-Leistungswerte, Basis-Satz
   - Höchstwert   (konservativ):  Leistungswerte −X %, Verrechnungssatz +Y %

   Die Spannen bilden die branchenübliche Unsicherheit bei Fremdobjekten ab
   (tatsächliche Leistung vor Ort, Wettbewerbsdruck beim Satz).
   ───────────────────────────────────────────────────────────────────────── */

export type ScenarioKey = "min" | "mid" | "max";

export interface TenderScenario {
  key: ScenarioKey;
  label: string;
  /** Verwendeter Verrechnungssatz (€/h). */
  rate: number;
  /** Faktor auf die effektiven Leistungswerte (>1 = schneller). */
  perfFactor: number;
  hours: number;
  cost: number;
  annualCost: number;
  pricePerSqm: number;
}

export interface TenderResult {
  area: number;
  count: number;
  scenarios: Record<ScenarioKey, TenderScenario>;
}

export interface TenderOptions {
  /** Spanne der Leistungswerte in % (Standard 15). Wird auf 0–50 begrenzt. */
  perfSpreadPct?: number;
  /** Spanne des Verrechnungssatzes in % (Standard 10). Wird auf 0–50 begrenzt. */
  rateSpreadPct?: number;
}

const clampPct = (v: number | undefined, fallback: number) => {
  const n = Number.isFinite(v) ? (v as number) : fallback;
  return Math.min(50, Math.max(0, n)) / 100;
};

export function calcTenderScenarios(
  rooms: Array<Omit<Room, "id">>,
  baseRate: number,
  options?: TenderOptions,
): TenderResult {
  const perfSpread = clampPct(options?.perfSpreadPct, 15);
  const rateSpread = clampPct(options?.rateSpreadPct, 10);
  const safeRate = Number.isFinite(baseRate) && baseRate > 0 ? baseRate : 0;

  const defs: Array<{ key: ScenarioKey; label: string; perfFactor: number; rate: number }> = [
    { key: "min", label: "Mindestwert", perfFactor: 1 + perfSpread, rate: safeRate * (1 - rateSpread) },
    { key: "mid", label: "Mittelwert", perfFactor: 1, rate: safeRate },
    { key: "max", label: "Höchstwert", perfFactor: 1 - perfSpread, rate: safeRate * (1 + rateSpread) },
  ];

  let area = 0;
  const hoursBase: number[] = [];
  for (const r of rooms) {
    area += r.area;
    // Stunden bei Basis-Leistung: calcRoom mit Satz 1 → monthlyHours (satzunabhängig).
    const rc = calcRoom({ ...r, id: "tender" } as Room, 1);
    hoursBase.push(rc.monthlyHours);
  }
  const totalHoursBase = hoursBase.reduce((s, h) => s + h, 0);

  const scenarios = {} as Record<ScenarioKey, TenderScenario>;
  for (const def of defs) {
    // Leistungsfaktor skaliert die Stunden invers (schneller ⇒ weniger Stunden).
    const factor = def.perfFactor > 0 ? def.perfFactor : 1;
    const hours = totalHoursBase / factor;
    const cost = hours * def.rate;
    scenarios[def.key] = {
      key: def.key,
      label: def.label,
      rate: def.rate,
      perfFactor: def.perfFactor,
      hours,
      cost,
      annualCost: cost * 12,
      pricePerSqm: area > 0 ? cost / area : 0,
    };
  }

  return { area, count: rooms.length, scenarios };
}

/** Effektiver Basis-Leistungswert eines Raums (für Anzeige-Zwecke). */
export function effectivePerf(room: Omit<Room, "id">): number {
  return getEffectivePerformance({ ...room, id: "preview" } as Room);
}
