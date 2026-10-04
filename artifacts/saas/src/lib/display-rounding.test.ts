import { describe, expect, it } from "vitest";
import {
  allocateNested,
  allocateRounded,
  displayComponents,
  displayModuleAmounts,
  displayOfferGroups,
  displayTotals,
  roundDisplay,
  roundGroupsForDisplay,
  sumDisplay,
} from "./display-rounding";
import { buildOfferPositions, type OfferPositionGroup } from "./offer-positions";
import { calcObjectTotals, calcOfferPresentation } from "./object-totals";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./service-modules/types";
import type { Project, Room } from "@/store/use-store";

const cents = (v: number) => Math.round(v * 100);
const tenths = (v: number) => Math.round(v * 10);
const sumCents = (vs: number[]) => vs.reduce((s, v) => s + cents(v), 0);

describe("roundDisplay / sumDisplay", () => {
  it("rounds half away from zero with binary tolerance", () => {
    expect(roundDisplay(2569.405)).toBe(2569.41);
    expect(roundDisplay(-1.005)).toBe(-1.01);
    expect(roundDisplay(0.004)).toBe(0);
    expect(roundDisplay(1.25, 1)).toBe(1.3);
    expect(roundDisplay(Number.NaN)).toBe(0);
  });

  it("sums rounded values without float drift", () => {
    expect(sumDisplay([0.1, 0.2])).toBe(0.3);
    expect(sumDisplay([487.58, 59.83])).toBe(547.41);
  });
});

describe("allocateRounded", () => {
  it("rows add up to the rounded total (largest remainder)", () => {
    // Je Zeile x,xx5 → einzeln gerundet 4 × aufgerundet, Summe aber nur 3 Cent mehr.
    const values = [487.575, 59.825, 121.885, 97.525];
    const total = values.reduce((s, v) => s + v, 0); // 766.81
    const shown = allocateRounded(values, total);
    expect(sumCents(shown)).toBe(cents(roundDisplay(total)));
    shown.forEach((v, i) => expect(Math.abs(v - values[i])).toBeLessThanOrEqual(0.01 + 1e-9));
  });

  it("only touches rows when needed and never bumps exact zeros", () => {
    expect(allocateRounded([1.11, 2.22, 0])).toEqual([1.11, 2.22, 0]);
    const shown = allocateRounded([0.004, 0.004, 0.004, 0]);
    expect(sumCents(shown)).toBe(1);
    expect(shown[3]).toBe(0);
  });

  it("holds for random inputs (cents and tenths)", () => {
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let run = 0; run < 300; run++) {
      const n = 1 + Math.floor(rnd() * 12);
      const values = Array.from({ length: n }, () => rnd() * 2000);
      const total = values.reduce((s, v) => s + v, 0);
      const shown = allocateRounded(values, total);
      expect(sumCents(shown)).toBe(cents(roundDisplay(total)));
      shown.forEach((v, i) => expect(Math.abs(v - values[i])).toBeLessThan(0.01 + 1e-9));
      const hours = allocateRounded(values, undefined, 1);
      expect(hours.reduce((s, v) => s + tenths(v), 0)).toBe(tenths(roundDisplay(total, 1)));
    }
  });

  it("equal inputs show equal values when another row can take the remainder", () => {
    // Zwei gleiche Räume (195,075) und ein dritter Wert: der Rest-Cent geht nicht an nur einen der beiden.
    const shown = allocateRounded([195.074, 195.074, 30.004]);
    expect(shown[0]).toBe(shown[1]);
    expect(sumCents(shown)).toBe(cents(roundDisplay(195.074 * 2 + 30.004)));
    const hours = allocateRounded([17.333, 17.333, 0.833], undefined, 1);
    expect(hours[0]).toBe(hours[1]);
    expect(hours.reduce((s, v) => s + tenths(v), 0)).toBe(tenths(roundDisplay(17.333 * 2 + 0.833, 1)));
    // Ohne anderen Wert bleibt nur die ungleiche Verteilung, damit die Summe aufgeht.
    const pair = allocateRounded([0.005, 0.005], 0.01);
    expect(sumCents(pair)).toBe(1);
  });

  it("reaches a target that differs from the sum", () => {
    expect(sumCents(allocateRounded([1, 1, 1], 3.05))).toBe(305);
    expect(allocateRounded([], 5)).toEqual([]);
  });
});

describe("allocateNested", () => {
  it("keeps each part at its own rounded sum unless the total forces a cent", () => {
    // Räume 2,004 + 2,004 = 4,008 → 4,01; Fußzeile 0,333 → 0,33; Summe 4,341 → 4,34.
    const [rooms, footer] = allocateNested([[2.004, 2.004], [0.333]]);
    expect(sumCents(rooms)).toBe(401);
    expect(footer).toEqual([0.33]);
    // Ohne Fußzeile dieselben Raumzeilen.
    expect(allocateNested([[2.004, 2.004]])[0]).toEqual(rooms);
    // Erzwungener Cent: 0,005 + 0,005 → je 0,01 einzeln, Summe 0,01.
    const forced = allocateNested([[0.005], [0.005]]);
    expect(sumCents(forced.flat())).toBe(1);
  });
});

/* ── Angebotspositionen ─────────────────────────────────────────────────── */

const R: ModuleRates = { rate: 22.5, vollkosten: 18 };

const WD: WinterdienstConfig = {
  schemaVersion: 1, enabled: true, region: "mittelgebirge", seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45, clearingSharePct: 50,
  areas: [
    { id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" },
    { id: "a2", label: "Parkplatz", type: "parkplatz", areaM2: 800, method: "maschinell", clear: true, spread: true },
  ],
  material: "salz", materialMarkupPct: 20, saltRestricted: false,
  travelMinutesPerEinsatz: 15, documentationMinutesPerEinsatz: 5, seasonSetupHours: 2,
  standbyFeeMonthly: 50, standbyCostMonthly: 25,
  offHoursSharePct: 50, offHoursSurchargePct: 25,
  liabilitySurchargePct: 10, riskProvisionPct: 100,
  machineRatePerHour: 45, machineCostPerHour: 35,
  billingMode: "pauschale_saison", clearingWindowHours: 3,
};

const HMS: HmsConfig = {
  schemaVersion: 1, enabled: true, travelMinutesPerVisitDay: 10, materialMarkupPct: 15, contingentOverageBilled: true,
  tasks: [
    { id: "t1", label: "Kontrollgang", unit: "pauschal", quantity: 1, minutesPerUnit: 29, frequencyPerYear: 52, enabled: true },
    { id: "t2", label: "Rasen", unit: "m2", quantity: 613, perfM2h: 590, frequencyPerYear: 14, seasonMonths: [4, 5, 6, 7, 8, 9, 10], materialCostPerYear: 61, enabled: true },
    { id: "t3", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
  ],
};

const room = (o: Partial<Room>): Room => ({
  id: "r", name: "Raum", typeId: "t", typeName: "Büro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});
const project = (o: Partial<Project> = {}): Project => ({
  id: "p", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  ruestzeit: 13, wegezeit: 7,
  rooms: [
    room({ id: "r1", area: 433, typePerformance: 210 }),
    room({ id: "r2", area: 57, typePerformance: 95, frequency: "3x_week", groupId: "g2", groupName: "Sanitär" }),
    room({ id: "r3", area: 211, typePerformance: 230, frequency: "2x_week" }),
  ],
  ...o,
});

function expectAddsUp(shown: OfferPositionGroup[], total: number) {
  for (const g of shown) {
    expect(sumCents(g.positions.map((p) => p.priceMonthly))).toBe(cents(g.subtotalMonthly));
    expect(g.positions.reduce((s, p) => s + tenths(p.hoursMonthly), 0)).toBe(tenths(g.hoursMonthly));
    g.positions.forEach((p) => expect(cents(p.priceMonthly)).toBeCloseTo(p.priceMonthly * 100, 6));
  }
  expect(sumCents(shown.map((g) => g.subtotalMonthly))).toBe(cents(roundDisplay(total)));
}

describe("roundGroupsForDisplay", () => {
  it("rooms only: rows + Rüst-/Wegezeit add up to the rounded monthly price", () => {
    const p = project();
    const totals = calcObjectTotals(p, R);
    const exact = buildOfferPositions(p, totals, R.rate);
    const shown = roundGroupsForDisplay(exact, { totalMonthly: totals.priceMonthly });
    expectAddsUp(shown, totals.priceMonthly);
    // Exakte Positionen bleiben unverändert (nur Anzeige).
    expect(Math.abs(exact[0].subtotalMonthly - totals.priceMonthly)).toBeLessThan(1e-9);
    expect(exact[0].positions.map((x) => x.kind)).toEqual(["room", "room", "room", "ruestzeit", "wegezeit"]);
    shown[0].positions.forEach((s, i) => expect(Math.abs(s.priceMonthly - exact[0].positions[i].priceMonthly)).toBeLessThanOrEqual(0.01 + 1e-9));
  });

  it("all modules: groups add up; seasonal Winterdienst keeps „Monatlich netto“ exact too", () => {
    const p = project({ winterdienst: WD, hms: HMS });
    const totals = calcObjectTotals(p, R);
    const op = calcOfferPresentation(totals, p);
    expect(Math.abs(op.fixedMonthly - totals.priceMonthly)).toBeGreaterThan(0.005);
    const exact = buildOfferPositions(p, totals, R.rate);
    const shown = roundGroupsForDisplay(exact, {
      totalMonthly: totals.priceMonthly,
      fixed: { modules: ["unterhalt", "hms"], totalMonthly: op.fixedMonthly },
    });
    expectAddsUp(shown, totals.priceMonthly);
    const fixedSum = sumCents(shown.filter((g) => g.module !== "winterdienst").map((g) => g.subtotalMonthly));
    expect(fixedSum).toBe(cents(roundDisplay(op.fixedMonthly)));
  });

  it("ignores a cluster target that is not the sum of its rows (never shifts euros)", () => {
    const p = project({ winterdienst: { ...WD, billingMode: "pauschale_12", capEinsaetze: 40 }, hms: HMS });
    const totals = calcObjectTotals(p, R);
    const op = calcOfferPresentation(totals, p);
    const exact = buildOfferPositions(p, totals, R.rate);
    // „Monatlich netto“ enthält hier P/12 des Winterdienstes — als Ziel für Reinigung + HMS falsch.
    const shown = roundGroupsForDisplay(exact, {
      totalMonthly: totals.priceMonthly,
      fixed: { modules: ["unterhalt", "hms"], totalMonthly: op.fixedMonthly },
    });
    expectAddsUp(shown, totals.priceMonthly);
    shown.forEach((g, gi) =>
      g.positions.forEach((sp, i) => expect(Math.abs(sp.priceMonthly - exact[gi].positions[i].priceMonthly)).toBeLessThan(0.02)),
    );
  });

  it("module subtotals stay their own rounded amounts (two-level allocation)", () => {
    // Reinigung 20,70 € und HMS 32,50 € sind exakt ganze Cent — die Rest-Cents
    // der Raumzeilen dürfen nicht in die HMS-Summe wandern (vorher 20,68 / 32,52).
    const areas = [10.1, 10.5, 10.9, 11.3, 11.7, 12.1, 12.5, 12.9];
    const p = project({
      ruestzeit: 0,
      wegezeit: 0,
      rooms: areas.map((a, i) => room({ id: `r${i}`, area: a, frequency: "monthly", typePerformance: 100 })),
      hms: {
        ...HMS,
        travelMinutesPerVisitDay: 0,
        materialMarkupPct: 0,
        tasks: [1, 3, 7, 9].map((m, i) => ({
          id: `t${i}`, label: `Aufgabe ${i + 1}`, unit: "pauschal" as const, quantity: 1, minutesPerUnit: m, frequencyPerYear: 52, enabled: true,
        })),
      },
    });
    const totals = calcObjectTotals(p, R);
    expect(roundDisplay(totals.cleaning.cost)).toBe(20.7);
    expect(roundDisplay(totals.hms!.revenueMonthly)).toBe(32.5);
    const m = displayModuleAmounts(displayOfferGroups(buildOfferPositions(p, totals, R.rate), totals.priceMonthly));
    expect(m.unterhalt).toBe(20.7);
    expect(m.hms).toBe(32.5);
    expect(m.total).toBe(53.2);
  });

  it("a subtotal moves only when the module roundings cannot add up to the total", () => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const mk = (module: OfferPositionGroup["module"], values: number[]): OfferPositionGroup => ({
      module, label: module, details: [], subtotalMonthly: values.reduce((s, v) => s + v, 0), hoursMonthly: 0,
      positions: values.map((v, i) => ({ id: `${module}${i}`, module, kind: module === "hms" ? "hms_task" : "room", label: "x", hoursMonthly: 0, priceMonthly: v })),
    });
    for (let run = 0; run < 500; run++) {
      const groups = [
        mk("unterhalt", Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => rnd() * 300)),
        mk("hms", Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => rnd() * 100)),
      ];
      const total = groups.reduce((s, g) => s + g.subtotalMonthly, 0);
      const shown = roundGroupsForDisplay(groups, { totalMonthly: total });
      expectAddsUp(shown, total);
      const own = groups.map((g) => cents(roundDisplay(g.subtotalMonthly)));
      const forced = own[0] + own[1] !== cents(roundDisplay(total));
      const moved = shown.filter((g, i) => cents(g.subtotalMonthly) !== own[i]).length;
      expect(moved).toBe(forced ? 1 : 0);
      // Zeilen einer Gruppe = eigene Verteilung auf die Gruppensumme.
      shown.forEach((g, i) =>
        expect(g.positions.map((x) => x.priceMonthly)).toEqual(allocateRounded(groups[i].positions.map((x) => x.priceMonthly), g.subtotalMonthly)),
      );
    }
  });

  it("is stable for a single group without fixed subset", () => {
    const p = project({ rooms: [], hms: HMS });
    const totals = calcObjectTotals(p, R);
    const shown = roundGroupsForDisplay(buildOfferPositions(p, totals, R.rate));
    expectAddsUp(shown, totals.priceMonthly);
  });
});

describe("displayOfferGroups (Saisonpauschale in 12 Monatsraten mit Deckelung)", () => {
  const p = project({
    winterdienst: { ...WD, billingMode: "pauschale_12", expectedEinsaetze: 45, capEinsaetze: 40 },
    hms: HMS,
  });
  const totals = calcObjectTotals(p, R);
  const op = calcOfferPresentation(totals, p);
  const exact = buildOfferPositions(p, totals, R.rate);
  const shown = displayOfferGroups(exact, totals.priceMonthly);

  it("keeps every position within a cent of its exact price", () => {
    // Gedeckelte Pauschale: „Monatlich netto“ (inkl. P/12) ≠ Ø-Monatspreis.
    expect(Math.abs(op.fixedMonthly - totals.priceMonthly)).toBeGreaterThan(0.005);
    expectAddsUp(shown, totals.priceMonthly);
    shown.forEach((g, gi) =>
      g.positions.forEach((sp, i) => {
        expect(sp.priceMonthly).toBeGreaterThanOrEqual(0);
        expect(Math.abs(sp.priceMonthly - exact[gi].positions[i].priceMonthly)).toBeLessThanOrEqual(0.01 + 1e-9);
      }),
    );
  });

  it("shows module subtotals as the rounded module amounts", () => {
    const m = displayModuleAmounts(shown);
    expect(Math.abs(m.unterhalt + m.hms - (totals.cleaning.cost + totals.hms!.revenueMonthly))).toBeLessThanOrEqual(0.005 + 1e-9);
    expect(Math.abs(m.winterdienst - totals.winterdienst!.revenueMonthly)).toBeLessThanOrEqual(0.01 + 1e-9);
    expect(cents(m.total)).toBe(cents(roundDisplay(totals.priceMonthly)));
    expect(cents(m.rooms) + cents(m.setup)).toBe(cents(m.unterhalt));
  });

  it("component rows use the same amounts; DB = shown price − shown cost", () => {
    const c = displayComponents(totals.components, shown, totals.costMonthly);
    const m = displayModuleAmounts(shown);
    expect(c.rows.find((r) => r.key === "hms")?.priceMonthly).toBe(m.hms);
    expect(c.rows.find((r) => r.key === "winterdienst")?.priceMonthly).toBe(m.winterdienst);
    expect(c.total.priceMonthly).toBe(m.total);
    expect(sumCents(c.rows.map((r) => r.costMonthly))).toBe(cents(roundDisplay(totals.costMonthly)));
    c.rows.forEach((r) => expect(cents(r.contributionMonthly)).toBe(cents(r.priceMonthly) - cents(r.costMonthly)));
    expect(sumCents(c.rows.map((r) => r.contributionMonthly))).toBe(cents(c.total.contributionMonthly));
  });
});

describe("displayTotals", () => {
  it("annual values from the unrounded annual value (priceAnnual), like the workspace", () => {
    const d = displayTotals({ fixedMonthly: 50.254166, averageMonthly: 50.254166, vatRatePct: 19, annualNet: 603.05 });
    expect(d.netMonthly).toBe(50.25);
    expect(d.annualNet).toBe(603.05);
    expect(d.annualGross).toBe(roundDisplay(603.05 * 1.19));
    expect(cents(d.annualNet) + cents(d.annualVat)).toBe(cents(d.annualGross));
    // Baseline-Fall: Kita 1036,2175 €/Monat → 12.434,61 € netto, (Kosten + USt) × 12 brutto.
    const k = displayTotals({ fixedMonthly: 1036.2175, averageMonthly: 1036.2175, vatRatePct: 19, annualNet: 1036.2175 * 12 });
    expect(k.annualNet).toBe(12434.61);
    expect(k.annualGross).toBe(roundDisplay(1036.2175 * 1.19 * 12));
  });

  it("VAT on the rounded net; annual values from the displayed month", () => {
    const d = displayTotals({ fixedMonthly: 766.8149, averageMonthly: 766.8149, vatRatePct: 19 });
    expect(d.netMonthly).toBe(766.81);
    expect(d.vatMonthly).toBe(145.69);
    expect(d.grossMonthly).toBe(912.5);
    expect(d.annualNet).toBe(9201.72);
    expect(d.annualGross).toBe(10950);
    expect(cents(d.annualNet) + cents(d.annualVat)).toBe(cents(d.annualGross));
  });

  it("seasonal share: annual values follow the Ø month", () => {
    const d = displayTotals({ fixedMonthly: 500.004, averageMonthly: 650.126, vatRatePct: 19 });
    expect(d.netMonthly).toBe(500);
    expect(d.averageMonthly).toBe(650.13);
    expect(d.annualNet).toBe(7801.56);
    expect(d.annualGross).toBe(roundDisplay(7801.56 + roundDisplay(7801.56 * 0.19)));
  });

  it("without VAT", () => {
    const d = displayTotals({ fixedMonthly: 100.005, averageMonthly: 100.005, vatRatePct: 0 });
    expect(d.vatMonthly).toBe(0);
    expect(d.grossMonthly).toBe(100.01);
    expect(d.annualGross).toBe(1200.12);
  });
});
