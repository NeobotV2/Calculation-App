import { describe, it, expect } from "vitest";
import { buildOfferPositions, sumOfferPositions, winterAreaServiceText, type OfferPositionGroup } from "./offer-positions";
import { calcObjectTotals } from "./object-totals";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "./calc";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./service-modules/types";
import { hmsTaskFrequencyText } from "./service-modules/util";
import type { Project, Room } from "@/store/use-store";

const R: ModuleRates = { rate: 30, vollkosten: 24 };

const WD_REF: WinterdienstConfig = {
  schemaVersion: 1, enabled: true, region: "mittelgebirge", seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45, clearingSharePct: 50,
  areas: [
    { id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" },
    { id: "a2", label: "Parkplatz", type: "parkplatz", areaM2: 800, method: "maschinell", clear: true, spread: true },
    { id: "a3", label: "Eingangstreppe", type: "treppe", areaM2: 20, method: "manuell", clear: true, spread: true },
  ],
  material: "salz", materialMarkupPct: 20, saltRestricted: false,
  travelMinutesPerEinsatz: 15, documentationMinutesPerEinsatz: 5, seasonSetupHours: 2,
  standbyFeeMonthly: 50, standbyCostMonthly: 25,
  offHoursSharePct: 50, offHoursSurchargePct: 25,
  liabilitySurchargePct: 10, riskProvisionPct: 100,
  machineRatePerHour: 45, machineCostPerHour: 35,
  billingMode: "pauschale_12", clearingWindowHours: 3,
};

const HMS_REF: HmsConfig = {
  schemaVersion: 1, enabled: true, travelMinutesPerVisitDay: 10, materialMarkupPct: 15, contingentOverageBilled: true,
  tasks: [
    { id: "t1", catalogId: "kontrollgang", label: "Kontrollgang", unit: "pauschal", quantity: 1, minutesPerUnit: 30, frequencyPerYear: 52, enabled: true },
    { id: "t2", catalogId: "rasen_maehen", label: "Rasen mähen", unit: "m2", quantity: 600, perfM2h: 600, frequencyPerYear: 14, seasonMonths: [4, 5, 6, 7, 8, 9, 10], materialCostPerYear: 60, enabled: true },
    { id: "t3", catalogId: "muelltonnen", label: "Mülltonnen", unit: "stueck", quantity: 6, minutesPerUnit: 3, frequencyPerYear: 52, enabled: true },
    { id: "t4", catalogId: "hecke_schneiden", label: "Hecke", unit: "lfm", quantity: 40, minutesPerUnit: 3, frequencyPerYear: 2, seasonMonths: [6, 9], materialCostPerYear: 80, enabled: true },
    { id: "t5", catalogId: "kleinreparaturen", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
    { id: "t6", catalogId: "laub_entfernen", label: "Laub", unit: "m2", quantity: 400, perfM2h: 400, frequencyPerYear: 6, seasonMonths: [10, 11], materialCostPerYear: 50, enabled: false },
  ],
};

const makeRoom = (o: Partial<Room> = {}): Room => ({
  id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});
const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z", rooms: [makeRoom()], ...o,
});

const build = (p: Project, rates: ModuleRates = R) => {
  const totals = calcObjectTotals(p, rates);
  return { totals, groups: buildOfferPositions(p, totals, rates.rate) };
};
const sumPositions = (groups: OfferPositionGroup[]) =>
  groups.reduce((s, g) => s + g.positions.reduce((t, p) => t + p.priceMonthly, 0), 0);

describe("buildOfferPositions — rooms only", () => {
  const rooms = [
    makeRoom(),
    makeRoom({ id: "r2", name: "WC", typeName: "WC / Sanitär klein", groupId: "g2", groupName: "Sanitär", area: 15, typePerformance: 60, frequency: "3x_week" }),
    makeRoom({ id: "r3", name: "", typeName: "Teeküche", area: 20, typePerformance: 100, soilingLevel: "soiling_heavy" }),
  ];
  const p = makeProject({ rooms, ruestzeit: 15, wegezeit: 10 });
  const { totals, groups } = build(p);

  it("has a single Unterhaltsreinigung group", () => {
    expect(groups.map((g) => [g.module, g.label])).toEqual([["unterhalt", "Unterhaltsreinigung"]]);
    expect(groups[0].details).toEqual([]);
  });

  it("room rows equal calcRoom().monthlyCost", () => {
    const roomRows = groups[0].positions.filter((x) => x.kind === "room");
    // Reihenfolge des Raum-Editors: r3 gehört wie r1 zur Gruppe g1.
    expect(roomRows.map((x) => x.id)).toEqual(["r1", "r3", "r2"]);
    rooms.forEach((r) => {
      const row = roomRows.find((x) => x.id === r.id)!;
      const rc = calcRoom(r, 30);
      expect(row.priceMonthly).toBe(rc.monthlyCost);
      expect(row.hoursMonthly).toBe(rc.monthlyHours);
      expect(row.performanceM2h).toBe(rc.effectivePerformance);
      expect(row.quantity).toEqual({ value: r.area, unit: "m²" });
      expect(row.frequencyLabel).toBe(FREQUENCY_LABELS[r.frequency]);
    });
    expect(roomRows[1].label).toBe("Teeküche");
    expect(roomRows[2].groupName).toBe("Sanitär");
  });

  it("lists rooms grouped like the room editor: groups by first room, input order within a group", () => {
    const interleaved = [
      makeRoom({ id: "eg-buero", groupId: "g1", groupName: "Büro" }),
      makeRoom({ id: "eg-wc", groupId: "g2", groupName: "Sanitär" }),
      makeRoom({ id: "og-buero", groupId: "g1", groupName: "Büro" }),
      makeRoom({ id: "flur", groupId: "", groupName: "" }),
      makeRoom({ id: "og-wc", groupId: "g2", groupName: "Sanitär" }),
    ];
    const ip = makeProject({ rooms: interleaved });
    const { totals: t, groups: g } = build(ip);
    const ids = g[0].positions.filter((x) => x.kind === "room").map((x) => x.id);
    expect(ids).toEqual(["eg-buero", "og-buero", "eg-wc", "og-wc", "flur"]);
    expect(Math.abs(sumPositions(g) - t.priceMonthly)).toBeLessThan(1e-9);
  });

  it("Rüstzeit and Wegezeit rows are hours × rate", () => {
    const ruest = groups[0].positions.find((x) => x.kind === "ruestzeit")!;
    const wege = groups[0].positions.find((x) => x.kind === "wegezeit")!;
    expect(ruest.priceMonthly).toBe(totals.cleaning.ruestzeitHours * 30);
    expect(wege.priceMonthly).toBe(totals.cleaning.wegezeitHours * 30);
    expect(ruest.quantity).toEqual({ value: 15, unit: "Min." });
    expect(wege.quantity).toEqual({ value: 10, unit: "Min." });
    expect(ruest.frequencyLabel).toBe(FREQUENCY_LABELS["5x_week"]);
  });

  it("positions sum to the monthly price", () => {
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
    expect(Math.abs(sumOfferPositions(groups) - calcProjectTotals(p, 30).cost)).toBeLessThan(1e-9);
    expect(groups[0].hoursMonthly).toBeCloseTo(totals.cleaning.hours, 9);
  });

  it("omits Rüst-/Wegezeit rows when they are 0", () => {
    const { groups: g } = build(makeProject());
    expect(g[0].positions.map((x) => x.kind)).toEqual(["room"]);
  });

  it("returns no groups for an empty object", () => {
    expect(build(makeProject({ rooms: [] })).groups).toEqual([]);
  });
});

describe("buildOfferPositions — with modules (T8 pAll)", () => {
  const pAll = makeProject({ ruestzeit: 15, winterdienst: WD_REF, hms: HMS_REF });
  const { totals, groups } = build(pAll);

  it("has one group per active module in order", () => {
    expect(groups.map((g) => g.module)).toEqual(["unterhalt", "winterdienst", "hms"]);
  });

  it("positions sum to priceMonthly within 1e-9", () => {
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
    expect(sumOfferPositions(groups)).toBeCloseTo(1051.417292, 6);
  });

  it("Winterdienst: service and standby rows plus unpriced area details", () => {
    const wd = groups[1];
    expect(wd.positions.map((x) => x.kind)).toEqual(["wd_service", "wd_standby"]);
    expect(wd.positions[0].label).toBe("Winterdienst Nov–Mär (kalkuliert 45 Einsätze)");
    expect(wd.positions[0].priceMonthly).toBeCloseTo((3699.1075 - 250) / 12, 6);
    expect(wd.positions[1].label).toBe("Bereitschafts- und Vorhaltepauschale");
    expect(wd.positions[1].priceMonthly).toBeCloseTo(250 / 12, 6);
    expect(wd.subtotalMonthly).toBeCloseTo(308.258958, 6);
    expect(wd.details).toEqual([
      { label: "Gehweg", quantity: "120 m²", text: "Räumen und Streuen (Splitt), manuell" },
      { label: "Parkplatz", quantity: "800 m²", text: "Räumen und Streuen (Salz), maschinell" },
      { label: "Eingangstreppe", quantity: "20 m²", text: "Räumen und Streuen (Salz), manuell" },
    ]);
  });

  it("HMS: one row per enabled task plus travel", () => {
    const h = groups[2];
    expect(h.positions.map((x) => x.id)).toEqual(["t1", "t2", "t3", "t4", "t5", "hms_travel"]);
    [780, 489, 468, 212, 858, 260].forEach((annual, i) => expect(h.positions[i].priceMonthly).toBeCloseTo(annual / 12, 6));
    expect(h.positions[1].frequencyLabel).toBe("14× jährlich · Apr–Okt");
    expect(h.positions[0].frequencyLabel).toBe("52× jährlich");
    expect(h.positions[4].frequencyLabel).toBe("Kontingent 2 Std. je Abruf");
    expect(h.positions[4].quantity).toEqual({ value: 2, unit: "Std." });
    expect(h.positions[1].quantity).toEqual({ value: 600, unit: "m²" });
    expect(h.positions[1].performanceM2h).toBe(600);
    expect(h.positions[5].label).toBe("Anfahrten (52 Einsatztage)");
    expect(h.subtotalMonthly).toBeCloseTo(255.583333, 6);
  });
});

describe("buildOfferPositions — single modules", () => {
  it("Winterdienst only", () => {
    const { totals, groups } = build(makeProject({ rooms: [], winterdienst: { ...WD_REF, billingMode: "pro_einsatz" } }));
    expect(groups.map((g) => g.module)).toEqual(["winterdienst"]);
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("Winterdienst without standby fee has no standby row", () => {
    const { totals, groups } = build(makeProject({ rooms: [], winterdienst: { ...WD_REF, standbyFeeMonthly: 0 } }));
    expect(groups[0].positions.map((x) => x.kind)).toEqual(["wd_service"]);
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("pro_einsatz: standby row carries the fixed season share F_U (same fee as the billing text)", () => {
    const { totals, groups } = build(makeProject({ rooms: [], winterdienst: { ...WD_REF, billingMode: "pro_einsatz" } }));
    const wd = totals.winterdienst!;
    const [service, standby] = groups[0].positions;
    expect(groups[0].positions.map((x) => x.kind)).toEqual(["wd_service", "wd_standby"]);
    // F_U = 5 × 50 € Bereitschaft + 2 h × 30 € Saisonvorbereitung = 310 € → 62,00 € je Saisonmonat
    expect(wd.fixedRevenueSeason).toBeCloseTo(310, 9);
    expect(standby.priceMonthly).toBeCloseTo(310 / 12, 9);
    expect(standby.sublabel).toBe("62,00 € je Saisonmonat (Nov–Mär), Ø pro Monat");
    expect(service.priceMonthly).toBeCloseTo((wd.revenue.total - 310) / 12, 9);
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("pro_einsatz without standby fee still shows the setup share as standby row", () => {
    const { totals, groups } = build(makeProject({ rooms: [], winterdienst: { ...WD_REF, billingMode: "pro_einsatz", standbyFeeMonthly: 0 } }));
    const standby = groups[0].positions.find((x) => x.kind === "wd_standby")!;
    expect(standby.priceMonthly).toBeCloseTo(60 / 12, 9);
    expect(standby.sublabel).toBe("12,00 € je Saisonmonat (Nov–Mär), Ø pro Monat");
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("pro_einsatz without any fixed fee has no standby row", () => {
    const { totals, groups } = build(makeProject({ rooms: [], winterdienst: { ...WD_REF, billingMode: "pro_einsatz", standbyFeeMonthly: 0, seasonSetupHours: 0 } }));
    expect(groups[0].positions.map((x) => x.kind)).toEqual(["wd_service"]);
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("flat-fee modes label the standby row as part of the Saisonpauschale", () => {
    for (const billingMode of ["pauschale_12", "pauschale_saison"] as const) {
      const { groups } = build(makeProject({ rooms: [], winterdienst: { ...WD_REF, billingMode } }));
      const standby = groups[0].positions.find((x) => x.kind === "wd_standby")!;
      expect(standby.priceMonthly).toBeCloseTo(250 / 12, 9);
      expect(standby.sublabel).toBe("enthalten in der Saisonpauschale, Ø pro Monat");
    }
  });

  it("HMS only, with its own rate", () => {
    const { totals, groups } = build(makeProject({ rooms: [], hms: { ...HMS_REF, rateOverride: 38, vollkostenOverride: 28 } }));
    expect(groups.map((g) => g.module)).toEqual(["hms"]);
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("paused modules produce no groups", () => {
    const { groups } = build(makeProject({ winterdienst: { ...WD_REF, enabled: false }, hms: { ...HMS_REF, enabled: false } }));
    expect(groups.map((g) => g.module)).toEqual(["unterhalt"]);
  });
});

describe("buildOfferPositions — HMS contingent reference period", () => {
  const contingentProject = (quantity: number, frequencyPerYear: number) =>
    makeProject({
      rooms: [],
      hms: {
        ...HMS_REF,
        tasks: [{ id: "k", label: "Kleinreparaturen", unit: "kontingent", quantity, frequencyPerYear, enabled: true }],
      },
    });

  it("quarterly contingent names the period and the annual hours the price is based on", () => {
    const { totals, groups } = build(contingentProject(6, 4));
    const k = groups[0].positions.find((x) => x.id === "k")!;
    expect(k.frequencyLabel).toBe("Kontingent 6 Std. je Abruf · 4× jährlich");
    expect(k.sublabel).toBe("Stundenkontingent: 6 Std. je Quartal, 24 Std. im Jahr");
    // H2: 6 h × 4 = 24 h/Jahr × 30 €/h ÷ 12
    expect(k.priceMonthly).toBeCloseTo(60, 9);
    expect(Math.abs(sumPositions(groups) - totals.priceMonthly)).toBeLessThan(1e-9);
  });

  it("monthly, yearly and irregular contingents", () => {
    const sub = (q: number, f: number) => build(contingentProject(q, f)).groups[0].positions.find((x) => x.id === "k")!.sublabel;
    expect(sub(2, 12)).toBe("Stundenkontingent: 2 Std. je Monat, 24 Std. im Jahr");
    expect(sub(10, 1)).toBe("Stundenkontingent: 10 Std. je Jahr, 10 Std. im Jahr");
    expect(sub(6, 5)).toBe("Stundenkontingent: 5 × 6 Std., 30 Std. im Jahr");
  });

  it("editor and offer use the same Turnus text", () => {
    const { groups } = build(makeProject({ rooms: [], hms: HMS_REF }));
    const enabled = HMS_REF.tasks.filter((t) => t.enabled);
    enabled.forEach((t, i) => expect(groups[0].positions[i].frequencyLabel).toBe(hmsTaskFrequencyText(t)));
    expect(groups[0].positions[4].sublabel).toBe("Stundenkontingent: 2 Std. je Monat, 24 Std. im Jahr");
    expect(groups[0].positions[0].sublabel).toBeUndefined();
  });
});

describe("winterAreaServiceText", () => {
  it("describes work, material and method", () => {
    expect(winterAreaServiceText({ ...WD_REF.areas[0], spread: false }, "salz")).toBe("Räumen, manuell");
    expect(winterAreaServiceText({ ...WD_REF.areas[1], clear: false }, "granulat")).toBe("Streuen (Granulat, salzfrei), maschinell");
    expect(winterAreaServiceText({ ...WD_REF.areas[2], method: "maschinell" }, "splitt")).toBe("Räumen und Streuen (Splitt), manuell");
  });
});
