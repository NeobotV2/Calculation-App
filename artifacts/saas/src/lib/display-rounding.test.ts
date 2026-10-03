import { describe, expect, it } from "vitest";
import { allocateRounded, displayTotals, roundDisplay, roundGroupsForDisplay, sumDisplay } from "./display-rounding";
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

  it("reaches a target that differs from the sum", () => {
    expect(sumCents(allocateRounded([1, 1, 1], 3.05))).toBe(305);
    expect(allocateRounded([], 5)).toEqual([]);
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

  it("is stable for a single group without fixed subset", () => {
    const p = project({ rooms: [], hms: HMS });
    const totals = calcObjectTotals(p, R);
    const shown = roundGroupsForDisplay(buildOfferPositions(p, totals, R.rate));
    expectAddsUp(shown, totals.priceMonthly);
  });
});

describe("displayTotals", () => {
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
