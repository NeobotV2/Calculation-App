import { classifyPricePerSqm, type PriceVerdict } from "@/data/benchmarks";

/* ─────────────────────────────────────────────────────────────────────────
   Angebotsstrategie: macht aus der Kalkulation eine Verhandlungsgrundlage.

   Alle Werte leiten sich transparent aus zwei Größen ab:
   - vollkosten  (€/h): Selbstkosten je Stunde aus dem Verrechnungssatz-
     Kalkulator (Lohn + SV + Ausfallzeiten + Gemeinkosten, OHNE Gewinn).
   - effectiveRate (€/h): der aktuell kalkulierte Verrechnungssatz.

   Annahmen (dokumentiert, s. a. Sensitivität):
   - Der Monatspreis skaliert linear mit dem Satz (Preis = Stunden × Satz).
   - Die Vollkosten skalieren linear mit dem Basislohn (alle Lohnbestandteile
     sind prozentual an den Lohn gekoppelt) — Grundlage des Lohn-Szenarios.
   ───────────────────────────────────────────────────────────────────────── */

export type EconomicStatus = "kritisch" | "pruefen" | "gesund";

/**
 * Rechnet einen Gewinn-AUFSCHLAG auf die Vollkosten (so definiert der
 * Verrechnungssatz-Kalkulator „Gewinnmarge": Satz = VK × (1 + g)) in die
 * äquivalente Marge AUF DEN UMSATZ um: m = g / (1 + g).
 * Beispiel: 10 % Aufschlag ⇒ 9,09 % Umsatzmarge. Ohne diese Konvertierung
 * würde ein exakt nach eigener Vorgabe kalkuliertes Objekt fälschlich als
 * „unter Ziel" bewertet.
 */
export function markupToRevenueMargin(markupPct: number): number {
  const g = Math.max(0, markupPct);
  return (g / (100 + g)) * 100;
}

export interface PriceStrategy {
  /** Rote Linie: Monatspreis zu Selbstkosten (Marge 0). Darunter = Verlust. */
  minPriceMonthly: number;
  /** Zielpreis: Monatspreis bei Ziel-Marge auf den Satz. */
  targetPriceMonthly: number;
  /** Aktueller Monatspreis (Stunden × aktueller Satz). */
  currentPriceMonthly: number;
  /** Verhandlungsspielraum: aktueller Preis − rote Linie (>= 0). */
  negotiationRoomMonthly: number;
  /** Deckungsbeitrag pro Monat (Preis − Selbstkosten). */
  contributionMonthly: number;
  /** Tatsächliche Marge in % des Preises. */
  marginPct: number;
  /** Satz, ab dem die Ziel-Marge erreicht wird (€/h). */
  targetRate: number;
  /** Break-even-Satz = Vollkosten (€/h). */
  breakEvenRate: number;
  /** Ziel-Marge auf den Umsatz in % (aus dem Aufschlag konvertiert). */
  targetMarginPct: number;
  /** Ampel-Status der Wirtschaftlichkeit. */
  status: EconomicStatus;
  /** Markt-Einordnung des €/m²-Preises; null, wenn keine Fläche erfasst ist. */
  priceVerdict: PriceVerdict | null;
}

/**
 * Zusatzleistungen (Winterdienst/HMS) auf Ø-Monatsbasis (Jahres- bzw. Saisonwert / 12).
 * Werden additiv zu Stunden × Satz bzw. Stunden × Vollkosten gerechnet.
 */
export interface StrategyExtras {
  /** Ø-Monatserlös netto der Module. */
  revenueMonthly: number;
  /** Ø-Monatskosten der Module (Lohn-Vollkosten, Material, Maschinen, Bereitschaft, Risikovorsorge). */
  costMonthly: number;
  /** Davon lohnabhängig — skaliert in den Szenarien „Lohnkosten +x %“ und „Zeitbedarf +y %“. */
  laborCostMonthly: number;
  /** Strenger minus normaler Winter je Ø-Monat; erzeugt das Szenario „winter_harsh“. */
  winterScenarioDelta?: { revenueMonthly: number; costMonthly: number; label: string };
}

export interface StrategyInput {
  /** Monatsstunden des Objekts (inkl. Rüst-/Wegezeiten). */
  monthlyHours: number;
  /** Reinigungsfläche in m². */
  area: number;
  /** Aktueller Verrechnungssatz €/h. */
  effectiveRate: number;
  /** Selbstkosten €/h (breakdown.vollkosten). */
  vollkosten: number;
  /**
   * Ziel-Gewinn als AUFSCHLAG auf die Vollkosten in % — exakt die
   * „Gewinnmarge"/targetMargin-Einstellung der App. Wird intern in die
   * Umsatzmarge konvertiert (s. markupToRevenueMargin).
   */
  targetMarkupPct: number;
  /**
   * NEU, optional: Zusatzleistungen. Fehlt der Wert oder sind Erlös UND Kosten 0,
   * rechnet calcPriceStrategy/calcSensitivity exakt wie bisher (Legacy-Pfad).
   * monthlyHours/area bleiben die REINIGUNGS-Werte (calcProjectTotals.hours/.area).
   */
  extras?: StrategyExtras;
}

const finite0 = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);

/** Normalisiert extras; null = keine wirksamen Zusatzleistungen ⇒ Legacy-Pfad. */
export function activeExtras(x: StrategyExtras | undefined): StrategyExtras | null {
  if (!x) return null;
  const revenueMonthly = finite0(x.revenueMonthly);
  const costMonthly = finite0(x.costMonthly);
  if (revenueMonthly === 0 && costMonthly === 0) return null;
  return {
    revenueMonthly,
    costMonthly,
    laborCostMonthly: Math.min(costMonthly, finite0(x.laborCostMonthly)),
    winterScenarioDelta: x.winterScenarioDelta,
  };
}

export function calcPriceStrategy(input: StrategyInput): PriceStrategy {
  const ex = activeExtras(input.extras);
  if (!ex) return calcRoomOnlyStrategy(input);

  const hours = Math.max(0, input.monthlyHours);
  const rate = Math.max(0, input.effectiveRate);
  const vollkosten = Math.max(0, input.vollkosten);
  const targetMarginPct = markupToRevenueMargin(input.targetMarkupPct);
  const targetMargin = targetMarginPct / 100;

  const cleaningPrice = hours * rate;
  const currentPriceMonthly = cleaningPrice + ex.revenueMonthly;
  const minPriceMonthly = hours * vollkosten + ex.costMonthly;
  // targetRate bleibt der Reinigungs-Zielsatz (= VK × (1 + g)); der Zielpreis gilt für das Gesamtpaket.
  const targetRate = targetMargin < 1 ? vollkosten / (1 - targetMargin) : vollkosten;
  const targetPriceMonthly = targetMargin < 1 ? minPriceMonthly / (1 - targetMargin) : minPriceMonthly;
  const contributionMonthly = currentPriceMonthly - minPriceMonthly;
  const marginPct = currentPriceMonthly > 0 ? (contributionMonthly / currentPriceMonthly) * 100 : 0;

  let status: EconomicStatus = "gesund";
  if (contributionMonthly < -1e-9) status = "kritisch";
  else if (marginPct < targetMarginPct - 1e-9) status = "pruefen";

  // Marktvergleich €/m² bleibt eine Aussage über die REINIGUNG (Benchmark Unterhaltsreinigung).
  const cleaningPricePerSqm = input.area > 0 ? cleaningPrice / input.area : 0;

  return {
    minPriceMonthly,
    targetPriceMonthly,
    currentPriceMonthly,
    negotiationRoomMonthly: Math.max(0, contributionMonthly),
    contributionMonthly,
    marginPct,
    targetRate,
    breakEvenRate: vollkosten,
    targetMarginPct,
    status,
    priceVerdict: input.area > 0 && cleaningPrice > 0 ? classifyPricePerSqm(cleaningPricePerSqm) : null,
  };
}

/** Bisheriger Rumpf von calcPriceStrategy — Zeichen für Zeichen unverändert. */
function calcRoomOnlyStrategy(input: StrategyInput): PriceStrategy {
  const hours = Math.max(0, input.monthlyHours);
  const rate = Math.max(0, input.effectiveRate);
  const vollkosten = Math.max(0, input.vollkosten);
  const targetMarginPct = markupToRevenueMargin(input.targetMarkupPct);
  const targetMargin = targetMarginPct / 100;

  const currentPriceMonthly = hours * rate;
  const minPriceMonthly = hours * vollkosten;
  // Umsatzmarge: Satz = Kosten / (1 − m). Mit m = g/(1+g) ist das identisch
  // mit VK × (1 + g) — der Zielsatz entspricht also exakt dem konfigurierten
  // Aufschlag des Verrechnungssatz-Kalkulators.
  const targetRate = targetMargin < 1 ? vollkosten / (1 - targetMargin) : vollkosten;
  const targetPriceMonthly = hours * targetRate;

  const contributionMonthly = currentPriceMonthly - minPriceMonthly;
  const marginPct = rate > 0 ? ((rate - vollkosten) / rate) * 100 : 0;

  // Kleine Toleranz gegen Gleitkomma-Artefakte an der Zielgrenze.
  let status: EconomicStatus = "gesund";
  if (rate < vollkosten) status = "kritisch";
  else if (marginPct < targetMarginPct - 1e-9) status = "pruefen";

  const pricePerSqm = input.area > 0 ? currentPriceMonthly / input.area : 0;

  return {
    minPriceMonthly,
    targetPriceMonthly,
    currentPriceMonthly,
    negotiationRoomMonthly: Math.max(0, contributionMonthly),
    contributionMonthly,
    marginPct,
    targetRate,
    breakEvenRate: vollkosten,
    targetMarginPct,
    status,
    priceVerdict: input.area > 0 && currentPriceMonthly > 0 ? classifyPricePerSqm(pricePerSqm) : null,
  };
}

/* ── Sensitivitätsanalyse ─────────────────────────────────────────── */

export interface SensitivityCase {
  key: "wage_up" | "time_up" | "price_down" | "winter_harsh";
  label: string;
  /** Marge in % nach dem Szenario. */
  marginPct: number;
  /** Deckungsbeitrag €/Monat nach dem Szenario. */
  contributionMonthly: number;
  /** true, wenn das Szenario unter die Vollkosten rutscht. */
  belowCost: boolean;
}

export interface SensitivityInput extends StrategyInput {
  wageIncreasePct?: number; // Standard 5
  timeIncreasePct?: number; // Standard 10
  priceCutPct?: number; // Standard 5
}

/**
 * Drei Stress-Szenarien auf die bestehende Kalkulation:
 * 1. Lohnkosten +X %  → Vollkosten steigen linear (s. Modul-Annahme).
 * 2. Zeitbedarf +Y %  → gleicher Monatspreis, mehr Stunden ⇒ effektiver
 *    Satz je Stunde sinkt auf rate/(1+Y).
 * 3. Preisnachlass −Z % → Satz sinkt auf rate·(1−Z).
 */
export function calcSensitivity(input: SensitivityInput): SensitivityCase[] {
  const wageUp = (input.wageIncreasePct ?? 5) / 100;
  const timeUp = (input.timeIncreasePct ?? 10) / 100;
  const priceCut = (input.priceCutPct ?? 5) / 100;
  const ex = activeExtras(input.extras);
  if (!ex) return calcRoomOnlySensitivity(input, wageUp, timeUp, priceCut);

  const hours = Math.max(0, input.monthlyHours);
  const rate = Math.max(0, input.effectiveRate);
  const vk = Math.max(0, input.vollkosten);
  const p0 = hours * rate + ex.revenueMonthly;
  const c0 = hours * vk + ex.costMonthly;
  const make = (key: SensitivityCase["key"], label: string, price: number, cost: number): SensitivityCase => ({
    key,
    label,
    marginPct: price > 0 ? ((price - cost) / price) * 100 : 0,
    contributionMonthly: price - cost,
    belowCost: price < cost,
  });
  const cases: SensitivityCase[] = [
    make("wage_up", `Lohnkosten +${Math.round(wageUp * 100)} %`, p0, c0 + (hours * vk + ex.laborCostMonthly) * wageUp),
    make("time_up", `Zeitbedarf +${Math.round(timeUp * 100)} %`, p0, c0 + (hours * vk + ex.laborCostMonthly) * timeUp),
    make("price_down", `Preisnachlass −${Math.round(priceCut * 100)} %`, p0 * (1 - priceCut), c0),
  ];
  const w = ex.winterScenarioDelta;
  if (w) cases.push(make("winter_harsh", w.label, p0 + w.revenueMonthly, c0 + w.costMonthly));
  return cases;
}

/** Bisheriger Rumpf von calcSensitivity (ab „const hours = …“) — unverändert. */
function calcRoomOnlySensitivity(input: SensitivityInput, wageUp: number, timeUp: number, priceCut: number): SensitivityCase[] {

  const hours = Math.max(0, input.monthlyHours);
  const rate = Math.max(0, input.effectiveRate);
  const vk = Math.max(0, input.vollkosten);

  const scenario = (
    key: SensitivityCase["key"],
    label: string,
    newRate: number,
    newVk: number,
    newHours: number,
  ): SensitivityCase => {
    const marginPct = newRate > 0 ? ((newRate - newVk) / newRate) * 100 : 0;
    return {
      key,
      label,
      marginPct,
      contributionMonthly: (newRate - newVk) * newHours,
      belowCost: newRate < newVk,
    };
  };

  return [
    scenario("wage_up", `Lohnkosten +${Math.round(wageUp * 100)} %`, rate, vk * (1 + wageUp), hours),
    scenario("time_up", `Zeitbedarf +${Math.round(timeUp * 100)} %`, rate / (1 + timeUp), vk, hours * (1 + timeUp)),
    scenario("price_down", `Preisnachlass −${Math.round(priceCut * 100)} %`, rate * (1 - priceCut), vk, hours),
  ];
}
