/* ─────────────────────────────────────────────────────────────────────────
   Anzeige-Rundung: Jede angezeigte Summe geht auf.

   Die Domäne rechnet ungerundet (Invariante Σ priceMonthly === totals.priceMonthly
   ± 1e-9). Für die Anzeige werden Zeilen auf Cent (bzw. Zehntelstunden)
   gerundet und die Rest-Cents nach der Methode des größten Rests
   (Hare-Niemeyer) verteilt, so dass
     Σ gerundete Zeilen = gerundete Zwischensumme und
     Σ Zwischensummen   = kaufmännisch gerundete Gesamtsumme.
   Nur für die Darstellung — nie zurück in Berechnungen speisen.
   ───────────────────────────────────────────────────────────────────────── */
import type { OfferModuleKey, OfferPositionGroup } from "./offer-positions";

/** Kaufmännisch gerundete ganze Einheiten (10^-digits), Toleranz gegen Binärfehler (2569,405 → 2569,41). */
function toUnits(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  const units = Math.round(Math.abs(value) * 10 ** digits + 1e-6);
  return value < 0 ? -units : units;
}

/** Kaufmännische Rundung auf `digits` Nachkommastellen (Standard: Cent). */
export function roundDisplay(value: number, digits = 2): number {
  const u = toUnits(value, digits);
  return u === 0 ? 0 : u / 10 ** digits;
}

/** Summe bereits gerundeter Werte ohne Gleitkomma-Drift. */
export function sumDisplay(values: readonly number[], digits = 2): number {
  const u = values.reduce((s, v) => s + toUnits(v, digits), 0);
  return u === 0 ? 0 : u / 10 ** digits;
}

/**
 * Rundet `values` auf `digits` Nachkommastellen, so dass ihre Summe exakt dem
 * gerundeten Ziel entspricht (Standard: gerundete Summe der Werte).
 *
 * Jeder Wert wird zunächst kaufmännisch gerundet; die Differenz zum Ziel wird
 * in Einzelschritten (1 Cent) auf die Werte mit dem größten Rundungsfehler in
 * Zielrichtung verteilt. Werte, die exakt 0 sind, werden zuletzt angepasst,
 * damit keine „0,01 €“-Zeilen entstehen. Gleichstand: Reihenfolge der Eingabe.
 */
export function allocateRounded(values: readonly number[], target?: number, digits = 2): number[] {
  const n = values.length;
  if (n === 0) return [];
  const scale = 10 ** digits;
  const exact = values.map((v) => (Number.isFinite(v) ? v * scale : 0));
  const units = values.map((v) => toUnits(v, digits));
  const goal = toUnits(target ?? values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0), digits);
  let diff = goal - units.reduce((s, u) => s + u, 0);
  if (diff !== 0) {
    const up = diff > 0;
    // Fehler in Zielrichtung: beim Aufrunden zuerst die am stärksten abgerundeten Werte.
    const order = values
      .map((_, i) => i)
      .sort((a, b) => {
        const za = exact[a] === 0 ? 1 : 0;
        const zb = exact[b] === 0 ? 1 : 0;
        if (za !== zb) return za - zb;
        const ea = exact[a] - units[a];
        const eb = exact[b] - units[b];
        if (ea !== eb) return up ? eb - ea : ea - eb;
        return a - b;
      });
    for (let k = 0; diff !== 0; k++) {
      const i = order[k % n];
      units[i] += up ? 1 : -1;
      diff += up ? -1 : 1;
    }
  }
  return units.map((u) => (u === 0 ? 0 : u / scale));
}

export interface DisplayRoundingOptions {
  /** Gesamtsumme, auf die die Zwischensummen aufgehen (Standard: Σ subtotalMonthly). */
  totalMonthly?: number;
  /**
   * Teilsumme, die zusätzlich exakt aufgehen soll — z. B. „Monatlich netto“
   * (Reinigung + Hausmeisterservice), wenn der Winterdienst saisonal bzw. je
   * Einsatz abgerechnet wird und nur im Ø-Monatswert enthalten ist.
   */
  fixed?: { modules: readonly OfferModuleKey[]; totalMonthly: number };
  /** Nachkommastellen der Stunden (Standard 1). */
  hoursDigits?: number;
}

/**
 * Angebotspositionen für die Anzeige: Positionspreise auf Cent, Stunden auf
 * `hoursDigits`; `subtotalMonthly`/`hoursMonthly` jeder Gruppe sind die Summe
 * ihrer gerundeten Positionen, und Σ Zwischensummen = gerundete Gesamtsumme.
 */
export function roundGroupsForDisplay(
  groups: readonly OfferPositionGroup[],
  options: DisplayRoundingOptions = {},
): OfferPositionGroup[] {
  const hoursDigits = options.hoursDigits ?? 1;
  const total = options.totalMonthly ?? groups.reduce((s, g) => s + g.subtotalMonthly, 0);
  const flat = groups.flatMap((g, gi) => g.positions.map((p) => ({ gi, p })));
  const prices = new Array<number>(flat.length).fill(0);

  const allocateCluster = (indices: number[], target: number) => {
    const rounded = allocateRounded(indices.map((i) => flat[i].p.priceMonthly), target);
    indices.forEach((idx, k) => {
      prices[idx] = rounded[k];
    });
  };

  const fixed = options.fixed;
  const inFixed = flat.map(({ gi }) => !!fixed && fixed.modules.includes(groups[gi].module));
  const fixedIdx = flat.map((_, i) => i).filter((i) => inFixed[i]);
  const restIdx = flat.map((_, i) => i).filter((i) => !inFixed[i]);
  if (fixed && fixedIdx.length > 0 && restIdx.length > 0) {
    const fixedTarget = roundDisplay(fixed.totalMonthly);
    const restTarget = (toUnits(total, 2) - toUnits(fixedTarget, 2)) / 100;
    allocateCluster(fixedIdx, fixedTarget);
    allocateCluster(restIdx, restTarget);
  } else {
    allocateCluster(flat.map((_, i) => i), total);
  }
  const hours = allocateRounded(flat.map(({ p }) => p.hoursMonthly), undefined, hoursDigits);

  let k = 0;
  return groups.map((g) => {
    const positions = g.positions.map((p) => {
      const out = { ...p, priceMonthly: prices[k], hoursMonthly: hours[k] };
      k++;
      return out;
    });
    return {
      ...g,
      positions,
      subtotalMonthly: sumDisplay(positions.map((p) => p.priceMonthly)),
      hoursMonthly: sumDisplay(positions.map((p) => p.hoursMonthly), hoursDigits),
    };
  });
}

/**
 * Summenblock eines Angebots aus den angezeigten (gerundeten) Monatsbeträgen:
 * USt auf den gerundeten Nettobetrag, Jahreswerte = 12 × angezeigter Monatswert.
 */
export interface DisplayTotals {
  netMonthly: number;
  vatMonthly: number;
  grossMonthly: number;
  /** Ø pro Monat (Jahresmittel), gerundet. */
  averageMonthly: number;
  annualNet: number;
  annualVat: number;
  annualGross: number;
}

export function displayTotals(input: {
  /** In jedem Monat fälliger Nettobetrag (z. B. OfferPresentation.fixedMonthly). */
  fixedMonthly: number;
  /** Ø-Monatspreis netto (Jahresmittel, totals.priceMonthly). */
  averageMonthly: number;
  /** USt-Satz in % (0 = keine USt). */
  vatRatePct: number;
}): DisplayTotals {
  const vat = input.vatRatePct > 0 ? input.vatRatePct / 100 : 0;
  const netMonthly = roundDisplay(input.fixedMonthly);
  const vatMonthly = roundDisplay(netMonthly * vat);
  const grossMonthly = sumDisplay([netMonthly, vatMonthly]);
  const averageMonthly = roundDisplay(input.averageMonthly);
  const sameBasis = toUnits(averageMonthly, 2) === toUnits(netMonthly, 2);
  const annualNet = roundDisplay(averageMonthly * 12);
  // Gleiche Basis: 12 × angezeigter Bruttomonat; sonst USt auf den Jahreswert.
  const annualGross = sameBasis ? roundDisplay(grossMonthly * 12) : sumDisplay([annualNet, roundDisplay(annualNet * vat)]);
  const annualVat = roundDisplay(annualGross - annualNet);
  return { netMonthly, vatMonthly, grossMonthly, averageMonthly, annualNet, annualVat, annualGross };
}
