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
import type { ObjectComponent } from "./object-totals";
import type { OfferModuleKey, OfferPosition, OfferPositionGroup } from "./offer-positions";

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
 * Zielrichtung verteilt. Gleiche Eingaben bewegen sich gemeinsam (gleiche
 * Anzeige), solange ein anderer Wert den Rest aufnehmen kann. Werte, die exakt
 * 0 sind, werden zuletzt angepasst, damit keine „0,01 €“-Zeilen entstehen.
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
    const step = diff > 0 ? 1 : -1;
    // Fehler in Zielrichtung: beim Aufrunden zuerst die am stärksten abgerundeten Werte.
    // Gleitkomma-Rauschen (3 × 32,91 = 98,72999…) zählt nicht: ganze Cent-Beträge bleiben stehen.
    const err = (i: number) => {
      const e = (exact[i] - units[i]) * step;
      return Math.abs(e) < 1e-6 ? 0 : e;
    };
    const order = values
      .map((_, i) => i)
      .sort((a, b) => {
        const za = exact[a] === 0 ? 1 : 0;
        const zb = exact[b] === 0 ? 1 : 0;
        if (za !== zb) return za - zb;
        if (err(a) !== err(b)) return err(b) - err(a);
        if (exact[a] !== exact[b]) return exact[a] - exact[b];
        return a - b;
      });
    const bump = (i: number) => {
      units[i] += step;
      diff -= step;
    };
    const bumped = new Set<number>();
    // 1. Gleiche Werte nur gemeinsam; passt eine Gruppe nicht ganz, nimmt ein anderer Wert den Rest.
    for (let k = 0; k < n && diff !== 0; ) {
      let j = k;
      while (j + 1 < n && exact[order[j + 1]] === exact[order[k]]) j++;
      const size = j - k + 1;
      if (exact[order[k]] !== 0 && err(order[k]) > 0 && size <= Math.abs(diff)) {
        for (let m = k; m <= j; m++) {
          bump(order[m]);
          bumped.add(order[m]);
        }
      }
      k = j + 1;
    }
    // 2. Rest in Fehlerreihenfolge, zuerst noch nicht angepasste Werte.
    const rest = [...order.filter((i) => !bumped.has(i)), ...order];
    for (let k = 0; diff !== 0; k++) bump(rest[k % rest.length]);
  }
  return units.map((u) => (u === 0 ? 0 : u / scale));
}

/**
 * Zweistufige Restverteilung: zuerst die Teilsummen der `parts` auf das Ziel
 * (Standard: gerundete Gesamtsumme), dann jeden Teil auf seine Teilsumme.
 * Damit bleibt jede Teilsumme ihr eigener kaufmännisch gerundeter Betrag,
 * außer ein Rest-Cent erzwingt eine Abweichung — z. B. Räume und
 * Rüst-/Wegezeit: Raumzeilen ohne und mit Fußzeilen zeigen dieselben Beträge.
 */
export function allocateNested(parts: readonly (readonly number[])[], target?: number, digits = 2): number[][] {
  const sums = parts.map((vs) => vs.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
  const subtotals = allocateRounded(sums, target, digits);
  return parts.map((vs, i) => allocateRounded(vs, subtotals[i], digits));
}

export interface DisplayRoundingOptions {
  /** Gesamtsumme, auf die die Zwischensummen aufgehen (Standard: Σ subtotalMonthly). */
  totalMonthly?: number;
  /**
   * Module, deren Positionen zusätzlich für sich aufgehen — z. B. Reinigung +
   * Hausmeisterservice („Monatlich netto“), wenn der Winterdienst saisonal bzw.
   * je Einsatz abgerechnet wird. Ziel: Summe genau dieser Positionen.
   */
  fixed?: { modules: readonly OfferModuleKey[]; totalMonthly?: number };
  /** Nachkommastellen der Stunden (Standard 1). */
  hoursDigits?: number;
}

/**
 * Angebotspositionen für die Anzeige: Positionspreise auf Cent, Stunden auf
 * `hoursDigits`; `subtotalMonthly`/`hoursMonthly` jeder Gruppe sind die Summe
 * ihrer gerundeten Positionen, und Σ Zwischensummen = gerundete Gesamtsumme.
 *
 * Zwei Stufen, damit jede Modulsumme ihr eigener kaufmännisch gerundeter
 * Betrag bleibt (wie Raumtabelle und HMS-Tabelle, die je Modul für sich
 * runden): 1. Zwischensummen der Gruppen auf das Ziel verteilen — eine
 * Modulsumme weicht nur ab, wenn ein Rest-Cent es erzwingt; 2. innerhalb jeder
 * Gruppe die Positionen auf deren Zwischensumme verteilen.
 *
 * Ein Ziel, das nicht der Summe seiner Positionen entspricht (z. B. ein
 * Monatsbetrag inkl. Winterdienst-Raten für Reinigung + HMS), wird ignoriert:
 * Anzeige-Rundung verschiebt höchstens Cents, nie Euro-Beträge.
 */
export function roundGroupsForDisplay(
  groups: readonly OfferPositionGroup[],
  options: DisplayRoundingOptions = {},
): OfferPositionGroup[] {
  const hoursDigits = options.hoursDigits ?? 1;
  const sumOf = (ps: readonly OfferPosition[], key: "priceMonthly" | "hoursMonthly") =>
    ps.reduce((s, p) => s + (Number.isFinite(p[key]) ? p[key] : 0), 0);
  const exactPrice = groups.map((g) => sumOf(g.positions, "priceMonthly"));
  const exactHours = groups.map((g) => sumOf(g.positions, "hoursMonthly"));
  const allGi = groups.map((_, gi) => gi);
  const targetFor = (gis: number[], target: number | undefined) => {
    const exact = gis.reduce((s, gi) => s + exactPrice[gi], 0);
    return target !== undefined && Number.isFinite(target) && Math.abs(target - exact) < 0.005 ? target : exact;
  };

  // Stufe 1: Zwischensummen je Gruppe.
  const subtotals = new Array<number>(groups.length).fill(0);
  const allocateCluster = (gis: number[], target: number) => {
    const rounded = allocateRounded(gis.map((gi) => exactPrice[gi]), target);
    gis.forEach((gi, k) => {
      subtotals[gi] = rounded[k];
    });
  };
  const total = targetFor(allGi, options.totalMonthly);
  const fixed = options.fixed;
  const fixedGi = allGi.filter((gi) => !!fixed && groups[gi].positions.length > 0 && fixed.modules.includes(groups[gi].module));
  const restGi = allGi.filter((gi) => !fixedGi.includes(gi));
  if (fixed && fixedGi.length > 0 && restGi.some((gi) => groups[gi].positions.length > 0)) {
    const fixedTarget = roundDisplay(targetFor(fixedGi, fixed.totalMonthly));
    const restTarget = (toUnits(total, 2) - toUnits(fixedTarget, 2)) / 100;
    allocateCluster(fixedGi, fixedTarget);
    allocateCluster(restGi, restTarget);
  } else {
    allocateCluster(allGi, total);
  }
  const hourSubtotals = allocateRounded(exactHours, undefined, hoursDigits);

  // Stufe 2: Positionen innerhalb der Gruppe auf ihre Zwischensumme — in der
  // Unterhaltsreinigung erst Räume | Rüst-/Wegezeit, dann die Zeilen (wie die Raumtabelle).
  return groups.map((g, gi) => {
    const partOf = (p: OfferPosition) => (g.module === "unterhalt" && p.kind !== "room" ? 1 : 0);
    const split = (key: "priceMonthly" | "hoursMonthly", target: number, digits: number) => {
      const idx: number[][] = [[], []];
      g.positions.forEach((p, k) => idx[partOf(p)].push(k));
      const parts = idx.filter((ix) => ix.length > 0);
      const rounded = allocateNested(parts.map((ix) => ix.map((k) => g.positions[k][key])), target, digits);
      const out = new Array<number>(g.positions.length).fill(0);
      parts.forEach((ix, pi) => ix.forEach((k, j) => (out[k] = rounded[pi][j])));
      return out;
    };
    const prices = split("priceMonthly", subtotals[gi], 2);
    const hours = split("hoursMonthly", hourSubtotals[gi], hoursDigits);
    const positions = g.positions.map((p, k) => ({ ...p, priceMonthly: prices[k], hoursMonthly: hours[k] }));
    return {
      ...g,
      positions,
      subtotalMonthly: sumDisplay(positions.map((p) => p.priceMonthly)),
      hoursMonthly: sumDisplay(positions.map((p) => p.hoursMonthly), hoursDigits),
    };
  });
}

/**
 * Anzeige-Positionen eines Objekts — EINE Rundung für Prüfschritt,
 * Live-Kalkulation, Arbeitsbereich, Angebot und interne Kalkulation. Mit
 * Winterdienst gehen Reinigung + Hausmeisterservice zusätzlich für sich auf
 * („Monatlich netto“ bei saisonaler Abrechnung bzw. je Einsatz).
 */
export function displayOfferGroups(groups: readonly OfferPositionGroup[], totalMonthly?: number): OfferPositionGroup[] {
  const hasWinter = groups.some((g) => g.module === "winterdienst");
  return roundGroupsForDisplay(groups, {
    totalMonthly,
    fixed: hasWinter ? { modules: ["unterhalt", "hms"] } : undefined,
  });
}

/** Angezeigte Monatsbeträge je Modul (Σ gerundeter Positionen; 0 ohne Modul) und ihre Summe. */
export interface DisplayModuleAmounts {
  unterhalt: number;
  /** Nur Räume (ohne Rüst-/Wegezeit). */
  rooms: number;
  /** Rüst- und Wegezeit. */
  setup: number;
  winterdienst: number;
  hms: number;
  total: number;
  /** Stunden je Modul (gerundet wie die Positionen). */
  hours: { unterhalt: number; rooms: number; setup: number; winterdienst: number; hms: number; total: number };
}

export function displayModuleAmounts(shown: readonly OfferPositionGroup[], hoursDigits = 1): DisplayModuleAmounts {
  const group = (m: OfferModuleKey) => shown.find((g) => g.module === m);
  const cleaning = group("unterhalt")?.positions ?? [];
  const rooms = cleaning.filter((p) => p.kind === "room");
  const setup = cleaning.filter((p) => p.kind !== "room");
  return {
    unterhalt: group("unterhalt")?.subtotalMonthly ?? 0,
    rooms: sumDisplay(rooms.map((p) => p.priceMonthly)),
    setup: sumDisplay(setup.map((p) => p.priceMonthly)),
    winterdienst: group("winterdienst")?.subtotalMonthly ?? 0,
    hms: group("hms")?.subtotalMonthly ?? 0,
    total: sumDisplay(shown.map((g) => g.subtotalMonthly)),
    hours: {
      unterhalt: group("unterhalt")?.hoursMonthly ?? 0,
      rooms: sumDisplay(rooms.map((p) => p.hoursMonthly), hoursDigits),
      setup: sumDisplay(setup.map((p) => p.hoursMonthly), hoursDigits),
      winterdienst: group("winterdienst")?.hoursMonthly ?? 0,
      hms: group("hms")?.hoursMonthly ?? 0,
      total: sumDisplay(shown.map((g) => g.hoursMonthly), hoursDigits),
    },
  };
}

/** Eine Komponentenzeile (Reinigung, Rüst-/Wegezeit, Winterdienst, HMS) in Anzeigewerten. */
export interface DisplayComponentRow {
  key: ObjectComponent["key"];
  label: string;
  exact: ObjectComponent;
  priceMonthly: number;
  costMonthly: number;
  /** Angezeigter Preis − angezeigte Kosten. */
  contributionMonthly: number;
  hoursMonthly: number;
}

export interface DisplayComponents {
  rows: DisplayComponentRow[];
  total: { priceMonthly: number; costMonthly: number; contributionMonthly: number; hoursMonthly: number };
}

/**
 * Komponentenzeilen für die Anzeige: Erlös und Stunden aus den gerundeten
 * Angebotspositionen (`displayOfferGroups`, gleiche Beträge wie Prüfschritt und
 * Angebot), Kosten mit Restverteilung auf die gerundeten Gesamtkosten,
 * Deckungsbeitrag = angezeigter Preis − angezeigte Kosten.
 */
export function displayComponents(
  components: readonly ObjectComponent[],
  shownGroups: readonly OfferPositionGroup[],
  costMonthly: number,
): DisplayComponents {
  const unterhalt = shownGroups.find((g) => g.module === "unterhalt")?.positions ?? [];
  const pick = (key: ObjectComponent["key"]): OfferPosition[] | null => {
    switch (key) {
      case "reinigung":
        return unterhalt.filter((p) => p.kind === "room");
      case "ruest_wege":
        return unterhalt.filter((p) => p.kind === "ruestzeit" || p.kind === "wegezeit");
      case "winterdienst":
        return shownGroups.find((g) => g.module === "winterdienst")?.positions ?? null;
      case "hms":
        return shownGroups.find((g) => g.module === "hms")?.positions ?? null;
      default:
        return null;
    }
  };
  const costs = allocateRounded(components.map((c) => c.costMonthly), costMonthly);
  const rows = components.map((c, i): DisplayComponentRow => {
    const ps = pick(c.key);
    const priceMonthly = ps ? sumDisplay(ps.map((p) => p.priceMonthly)) : roundDisplay(c.priceMonthly);
    return {
      key: c.key,
      label: c.label,
      exact: c,
      priceMonthly,
      costMonthly: costs[i],
      contributionMonthly: sumDisplay([priceMonthly, -costs[i]]),
      hoursMonthly: ps ? sumDisplay(ps.map((p) => p.hoursMonthly), 1) : roundDisplay(c.hoursMonthly, 1),
    };
  });
  const price = sumDisplay(rows.map((r) => r.priceMonthly));
  const cost = sumDisplay(rows.map((r) => r.costMonthly));
  return {
    rows,
    total: {
      priceMonthly: price,
      costMonthly: cost,
      contributionMonthly: sumDisplay([price, -cost]),
      hoursMonthly: sumDisplay(rows.map((r) => r.hoursMonthly), 1),
    },
  };
}

/**
 * Summenblock eines Angebots: USt auf den gerundeten Nettomonat. Jahreswerte
 * aus dem ungerundeten Jahreswert (priceAnnual = Ø-Monat × 12, Contract D4),
 * sonst 12 × angezeigter Monatswert.
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
  /** Erwarteter Jahreswert netto in voller Genauigkeit (OfferPresentation.expectedAnnual). */
  annualNet?: number;
}): DisplayTotals {
  const vat = input.vatRatePct > 0 ? input.vatRatePct / 100 : 0;
  const netMonthly = roundDisplay(input.fixedMonthly);
  const vatMonthly = roundDisplay(netMonthly * vat);
  const grossMonthly = sumDisplay([netMonthly, vatMonthly]);
  const averageMonthly = roundDisplay(input.averageMonthly);
  if (input.annualNet !== undefined && Number.isFinite(input.annualNet)) {
    // Wie Arbeitsbereich und Controlling: Jahreswert einmal gerundet; USt auf den ungerundeten Jahreswert.
    const annualNet = roundDisplay(input.annualNet);
    const annualGross = roundDisplay(input.annualNet * (1 + vat));
    return { netMonthly, vatMonthly, grossMonthly, averageMonthly, annualNet, annualVat: roundDisplay(annualGross - annualNet), annualGross };
  }
  const sameBasis = toUnits(averageMonthly, 2) === toUnits(netMonthly, 2);
  const annualNet = roundDisplay(averageMonthly * 12);
  // Gleiche Basis: 12 × angezeigter Bruttomonat; sonst USt auf den Jahreswert.
  const annualGross = sameBasis ? roundDisplay(grossMonthly * 12) : sumDisplay([annualNet, roundDisplay(annualNet * vat)]);
  const annualVat = roundDisplay(annualGross - annualNet);
  return { netMonthly, vatMonthly, grossMonthly, averageMonthly, annualNet, annualVat, annualGross };
}
