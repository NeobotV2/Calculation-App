import { describe, it, expect } from "vitest";
import {
  WORKSPACE_TABS,
  WORKSPACE_TAB_LABELS,
  WORKSPACE_TAB_SHORT_LABELS,
  editFlowHref,
  frequencyChangePreview,
  isCleaningTabVisible,
  isWorkspaceTab,
  moduleShares,
  displayedModuleShares,
  rateChangePreview,
  resolveTab,
  tabFlowStep,
  tabHasWarnings,
  tabHref,
  visibleTabs,
  warningSuffixOf,
  warningTab,
  workspaceKpis,
} from "./workspace-tabs";
import { calcProjectTotals } from "@/lib/calc";
import { groupRooms, roundRoomsForDisplay, setupTimeTotals } from "@/components/calc/rooms/rooms-editor-logic";
import { hmsDisplayAmounts } from "@/components/calc/hms/hms-ui";
import { displayModuleAmounts, displayOfferGroups, displayTotals, roundDisplay } from "@/lib/display-rounding";
import { calcOfferPresentation } from "@/lib/object-totals";
import { buildOfferPositions } from "@/lib/offer-positions";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { computeObjectEconomics, type EconomicsSettings } from "@/lib/object-economics";
import { calcPriceStrategy } from "@/lib/price-strategy";
import { calcRiskScore } from "@/lib/risk-score";
import type { HmsConfig, WinterdienstConfig } from "@/lib/service-modules/types";
import { DEMO_PROJECTS, type Project, type Room } from "@/store/use-store";

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
  ],
};

const makeRoom = (o: Partial<Room> = {}): Room => ({
  id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});

const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z", rooms: [], ...o,
});

const DEFAULT_SETTINGS: EconomicsSettings = {
  hourlyRate: 22.5, hourlyRateConfig: getDefaultConfig(), targetMargin: 10, disabledWarnings: [],
};
const CUSTOM_SETTINGS: EconomicsSettings = {
  hourlyRate: 31.5, hourlyRateConfig: getDefaultConfig(), targetMargin: 15, disabledWarnings: [],
};

describe("visibleTabs", () => {
  it("shows Übersicht and Unterhaltsreinigung for an empty object", () => {
    expect(visibleTabs(makeProject())).toEqual(["uebersicht", "reinigung"]);
  });

  it("shows Unterhaltsreinigung for rooms-only objects", () => {
    expect(visibleTabs(makeProject({ rooms: [makeRoom()] }))).toEqual(["uebersicht", "reinigung"]);
  });

  it("hides Unterhaltsreinigung when only an active module exists", () => {
    expect(visibleTabs(makeProject({ winterdienst: WD_REF }))).toEqual(["uebersicht", "winterdienst"]);
    expect(visibleTabs(makeProject({ hms: HMS_REF }))).toEqual(["uebersicht", "hms"]);
  });

  it("keeps Unterhaltsreinigung when every module is paused (legacy behaviour)", () => {
    const p = makeProject({ winterdienst: { ...WD_REF, enabled: false }, hms: { ...HMS_REF, enabled: false } });
    expect(visibleTabs(p)).toEqual(["uebersicht", "reinigung", "winterdienst", "hms"]);
  });

  it("shows paused modules as tabs", () => {
    const p = makeProject({ rooms: [makeRoom()], winterdienst: { ...WD_REF, enabled: false } });
    expect(visibleTabs(p)).toEqual(["uebersicht", "reinigung", "winterdienst"]);
  });

  it("orders all tabs like WORKSPACE_TABS", () => {
    const p = makeProject({ rooms: [makeRoom()], winterdienst: WD_REF, hms: HMS_REF });
    expect(visibleTabs(p)).toEqual([...WORKSPACE_TABS]);
  });

  it("forceCleaning shows the empty Unterhaltsreinigung tab next to an active module", () => {
    const p = makeProject({ winterdienst: WD_REF });
    expect(isCleaningTabVisible(p)).toBe(false);
    expect(isCleaningTabVisible(p, { forceCleaning: true })).toBe(true);
    expect(visibleTabs(p, { forceCleaning: true })).toEqual(["uebersicht", "reinigung", "winterdienst"]);
  });
});

describe("tab labels", () => {
  it("has a short label per tab, never longer than the full label", () => {
    for (const t of WORKSPACE_TABS) {
      expect(WORKSPACE_TAB_SHORT_LABELS[t].length).toBeGreaterThan(0);
      expect(WORKSPACE_TAB_SHORT_LABELS[t].length).toBeLessThanOrEqual(WORKSPACE_TAB_LABELS[t].length);
    }
    expect(WORKSPACE_TAB_SHORT_LABELS.hms).toBe("HMS");
  });
});

describe("resolveTab", () => {
  const full = makeProject({ rooms: [makeRoom()], winterdienst: WD_REF, hms: HMS_REF });

  it("defaults to Übersicht without a parameter", () => {
    expect(resolveTab(undefined, full)).toBe("uebersicht");
    expect(resolveTab(null, full)).toBe("uebersicht");
    expect(resolveTab("", full)).toBe("uebersicht");
  });

  it("returns visible tabs unchanged", () => {
    for (const tab of WORKSPACE_TABS) expect(resolveTab(tab, full)).toBe(tab);
  });

  it("falls back to Übersicht for unknown parameters", () => {
    expect(resolveTab("raeume", full)).toBe("uebersicht");
    expect(resolveTab("WINTERDIENST", full)).toBe("uebersicht");
  });

  it("falls back to Übersicht for hidden tabs", () => {
    const roomsOnly = makeProject({ rooms: [makeRoom()] });
    expect(resolveTab("winterdienst", roomsOnly)).toBe("uebersicht");
    expect(resolveTab("hms", roomsOnly)).toBe("uebersicht");
    const wdOnly = makeProject({ winterdienst: WD_REF });
    expect(resolveTab("reinigung", wdOnly)).toBe("uebersicht");
    expect(resolveTab("reinigung", wdOnly, { forceCleaning: true })).toBe("reinigung");
  });

  it("isWorkspaceTab only accepts the four keys", () => {
    expect(isWorkspaceTab("hms")).toBe(true);
    expect(isWorkspaceTab("preis")).toBe(false);
    expect(isWorkspaceTab(undefined)).toBe(false);
  });
});

describe("tab routes", () => {
  it("maps module tabs to flow steps", () => {
    expect(tabFlowStep("uebersicht")).toBeUndefined();
    expect(tabFlowStep("reinigung")).toBe("raeume");
    expect(tabFlowStep("winterdienst")).toBe("winterdienst");
    expect(tabFlowStep("hms")).toBe("hms");
  });

  it("builds tab and edit hrefs", () => {
    expect(tabHref("p1", "uebersicht")).toBe("/objekte/p1");
    expect(tabHref("p1", "reinigung")).toBe("/objekte/p1/reinigung");
    expect(editFlowHref("p1", "uebersicht")).toBe("/kalkulation/p1");
    expect(editFlowHref("p1", "reinigung")).toBe("/kalkulation/p1/raeume");
    expect(editFlowHref("p1", "hms")).toBe("/kalkulation/p1/hms");
  });
});

describe("tabHasWarnings", () => {
  it("strips the project prefix", () => {
    expect(warningSuffixOf("demo-1_wd_salt", "demo-1")).toBe("wd_salt");
    expect(warningSuffixOf("p1_below_cost_wd")).toBe("below_cost_wd");
  });

  it("assigns warnings to the tab where they are fixed", () => {
    expect(warningTab("p1_wd_areas")).toBe("winterdienst");
    expect(warningTab("p1_below_cost_wd")).toBe("winterdienst");
    expect(warningTab("p1_low_margin_hms")).toBe("hms");
    expect(warningTab("p1_hms_incomplete")).toBe("hms");
    expect(warningTab("p1_below_cost")).toBe("reinigung");
    expect(warningTab("p1_perf_r1")).toBe("reinigung");
    expect(warningTab("p1_sanitaer")).toBe("reinigung");
    expect(warningTab("p1_default_rate")).toBe("uebersicht");
  });

  it("ignores info-level hints", () => {
    const w = [{ id: "p1_sanitaer", severity: "info" as const }, { id: "p1_default_rate", severity: "info" as const }];
    expect(tabHasWarnings("reinigung", w)).toBe(false);
    expect(tabHasWarnings("uebersicht", w)).toBe(false);
  });

  it("flags warning and critical findings per tab", () => {
    const w = [
      { id: "p1_low_margin", severity: "warning" as const },
      { id: "p1_below_cost_hms", severity: "critical" as const },
    ];
    expect(tabHasWarnings("reinigung", w, "p1")).toBe(true);
    expect(tabHasWarnings("hms", w, "p1")).toBe(true);
    expect(tabHasWarnings("winterdienst", w, "p1")).toBe(false);
    expect(tabHasWarnings("uebersicht", w, "p1")).toBe(false);
  });

  it("works with real warnings from computeObjectEconomics", () => {
    // Winterdienst ohne Flächen ⇒ wd_areas (Warnung) im Winterdienst-Tab.
    const p = makeProject({ id: "demo-9", rooms: [makeRoom()], winterdienst: { ...WD_REF, areas: [] } });
    const econ = computeObjectEconomics(p, CUSTOM_SETTINGS);
    expect(econ.warnings.some((w) => w.id === "demo-9_wd_areas")).toBe(true);
    expect(tabHasWarnings("winterdienst", econ.warnings, p.id)).toBe(true);
  });
});

describe("workspaceKpis (identity with the old object page for rooms-only objects)", () => {
  for (const settings of [DEFAULT_SETTINGS, CUSTOM_SETTINGS]) {
    for (const demo of DEMO_PROJECTS) {
      it(`${demo.name} @ ${settings.hourlyRate} €/h`, () => {
        const project = demo as Project;
        const actualMonthlyHours = 40;
        const econ = computeObjectEconomics(project, settings, { actualMonthlyHours });
        const k = workspaceKpis(econ);

        // Exakt die bisherigen Einzelaufrufe aus pages/objekte/[id].tsx.
        const effectiveRate = project.hourlyRate ?? settings.hourlyRate;
        const totals = calcProjectTotals(project, effectiveRate);
        const breakdown = calcHourlyRate(settings.hourlyRateConfig);
        const isDefaultRate =
          settings.hourlyRate === 22.5 && JSON.stringify(settings.hourlyRateConfig) === JSON.stringify(getDefaultConfig());
        const strategy = calcPriceStrategy({
          monthlyHours: totals.hours, area: totals.area, effectiveRate,
          vollkosten: breakdown.vollkosten, targetMarkupPct: settings.targetMargin,
        });
        const risk = calcRiskScore({
          project, monthlyHours: totals.hours, area: totals.area, monthlyCost: totals.cost,
          marginPct: strategy.marginPct, targetMarginPct: strategy.targetMarginPct,
          usesDefaultRate: isDefaultRate && !project.hourlyRate, actualMonthlyHours,
        });

        expect(k.hasModules).toBe(false);
        expect(k.priceMonthly).toBe(totals.cost);
        expect(k.priceAnnual).toBe(totals.annualCost);
        expect(k.hoursMonthly).toBe(totals.hours);
        expect(k.area).toBe(totals.area);
        expect(k.pricePerSqm).toBe(totals.pricePerSqm);
        expect(k.showPricePerSqm).toBe(true);
        expect(k.marginPct).toBe(strategy.marginPct);
        expect(k.contributionMonthly).toBe(strategy.contributionMonthly);
        expect(k.minPriceMonthly).toBe(strategy.minPriceMonthly);
        expect(k.targetPriceMonthly).toBe(strategy.targetPriceMonthly);
        expect(k.riskScore).toBe(risk.score);
        expect(econ.risk).toEqual(risk);
      });
    }
  }

  it("hides €/m² without rooms", () => {
    const econ = computeObjectEconomics(makeProject({ hms: HMS_REF }), CUSTOM_SETTINGS);
    const k = workspaceKpis(econ);
    expect(k.showPricePerSqm).toBe(false);
    expect(k.hasModules).toBe(true);
    expect(k.priceMonthly).toBeCloseTo(econ.totals.hms!.revenueMonthly, 9);
  });
});

describe("module add / pause (Monatspreis)", () => {
  const base = makeProject({ rooms: [makeRoom(), makeRoom({ id: "r2", area: 40, frequency: "2x_week" })], ruestzeit: 15 });

  it("adding a Winterdienst raises the price by its revenueMonthly; pausing restores it exactly", () => {
    const before = computeObjectEconomics(base, CUSTOM_SETTINGS).totals.priceMonthly;
    const added = computeObjectEconomics({ ...base, winterdienst: WD_REF }, CUSTOM_SETTINGS).totals;
    expect(added.winterdienst).not.toBeNull();
    expect(added.priceMonthly).toBeCloseTo(before + added.winterdienst!.revenueMonthly, 9);
    const paused = computeObjectEconomics({ ...base, winterdienst: { ...WD_REF, enabled: false } }, CUSTOM_SETTINGS);
    expect(paused.totals.priceMonthly).toBe(before);
    const removed = computeObjectEconomics({ ...base, winterdienst: undefined }, CUSTOM_SETTINGS);
    expect(removed.totals.priceMonthly).toBe(before);
  });

  it("module shares sum to the Monatspreis", () => {
    const totals = computeObjectEconomics({ ...base, winterdienst: WD_REF, hms: HMS_REF }, CUSTOM_SETTINGS).totals;
    const shares = moduleShares(totals);
    expect(shares.map((s) => s.module)).toEqual(["unterhalt", "winterdienst", "hms"]);
    const sum = shares.reduce((a, s) => a + s.priceMonthly, 0);
    expect(sum).toBeCloseTo(totals.priceMonthly, 9);
    expect(shares.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 9);
  });

  it("displayed module shares add up to the rounded Monatspreis (same amounts as Prüfschritt/Angebot)", () => {
    const p = { ...base, winterdienst: WD_REF, hms: HMS_REF };
    const econ = computeObjectEconomics(p, CUSTOM_SETTINGS);
    const shown = displayedModuleShares(p, econ);
    const cents = shown.reduce((a, s) => a + Math.round(s.priceMonthly * 100), 0);
    expect(cents).toBe(Math.round(roundDisplay(econ.totals.priceMonthly) * 100));
    const amounts = displayModuleAmounts(
      displayOfferGroups(buildOfferPositions(p, econ.totals, econ.effectiveRate), econ.totals.priceMonthly),
    );
    expect(shown.map((s) => s.priceMonthly)).toEqual([amounts.unterhalt, amounts.winterdienst, amounts.hms]);
  });

  it("cards, Reinigung tab, HMS tab and offer rows agree unless a leftover cent forces one module", () => {
    let seed = 99;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const FREQS = ["monthly", "biweekly", "1x_week", "2x_week", "3x_week", "5x_week"] as const;
    const cents = (v: number) => Math.round(v * 100);
    for (let run = 0; run < 400; run++) {
      const p = makeProject({
        ruestzeit: rnd() < 0.5 ? 0 : 10,
        wegezeit: rnd() < 0.5 ? 0 : 5,
        rooms: Array.from({ length: 2 + Math.floor(rnd() * 8) }, (_, i) =>
          makeRoom({ id: `r${i}`, groupId: rnd() < 0.5 ? "g1" : "g2", area: Math.round(rnd() * 3000) / 10, frequency: FREQS[Math.floor(rnd() * 6)], typePerformance: Math.round(80 + rnd() * 250) }),
        ),
        hms: {
          ...HMS_REF,
          tasks: Array.from({ length: 1 + Math.floor(rnd() * 4) }, (_, i) => ({
            id: `t${i}`, label: `T${i}`, unit: "pauschal" as const, quantity: 1, minutesPerUnit: Math.round(5 + rnd() * 60), frequencyPerYear: 52, enabled: true,
          })),
        },
      });
      const econ = computeObjectEconomics(p, CUSTOM_SETTINGS);
      const { totals, effectiveRate: rate } = econ;
      const cards = new Map(displayedModuleShares(p, econ).map((s) => [s.module, s.priceMonthly]));
      const st = setupTimeTotals({ ruestzeit: p.ruestzeit, wegezeit: p.wegezeit }, p.rooms, rate);
      const roomsTab = roundRoomsForDisplay(groupRooms(p.rooms, rate), [
        { key: "ruestzeit", hoursMonthly: st.ruestzeitHours, priceMonthly: st.ruestzeitHours * rate },
        { key: "wegezeit", hoursMonthly: st.wegezeitHours, priceMonthly: st.wegezeitHours * rate },
      ]);
      const hmsTab = hmsDisplayAmounts(totals.hms!);
      const forced =
        cents(roundDisplay(totals.cleaning.cost)) + cents(roundDisplay(totals.hms!.revenueMonthly)) !== cents(roundDisplay(totals.priceMonthly));
      const uOff = cents(cards.get("unterhalt")!) !== cents(roomsTab.total.priceMonthly);
      const hOff = cents(cards.get("hms")!) !== cents(hmsTab.revenueMonthly);
      expect(Number(uOff) + Number(hOff)).toBe(forced ? 1 : 0);
      const offer = displayOfferGroups(buildOfferPositions(p, totals, rate), totals.priceMonthly);
      const offerRows = new Map(offer.flatMap((g) => g.positions).map((x) => [x.id, x.priceMonthly]));
      if (!uOff) for (const g of roomsTab.groups) for (const r of g.rows) expect(r.priceMonthly).toBe(offerRows.get(r.room.id));
      if (!hOff) for (const t of p.hms!.tasks) expect(hmsTab.monthlyById.get(t.id)).toBe(offerRows.get(t.id));
    }
  });

  it("offer totals show the same Jahreswert as the workspace KPI (priceAnnual, rounded once)", () => {
    for (const p of [base, { ...base, winterdienst: { ...WD_REF, billingMode: "pauschale_12" as const, capEinsaetze: 30 }, hms: HMS_REF }]) {
      const econ = computeObjectEconomics(p, CUSTOM_SETTINGS);
      const op = calcOfferPresentation(econ.totals, p);
      const offer = displayTotals({ fixedMonthly: op.fixedMonthly, averageMonthly: econ.totals.priceMonthly, vatRatePct: 19, annualNet: op.expectedAnnual });
      expect(offer.annualNet).toBe(roundDisplay(workspaceKpis(econ).priceAnnual));
    }
  });

  it("module shares are 0 without a price", () => {
    const totals = computeObjectEconomics(makeProject(), CUSTOM_SETTINGS).totals;
    expect(moduleShares(totals)).toEqual([{ module: "unterhalt", priceMonthly: 0, share: 0 }]);
  });
});

describe("frequencyChangePreview", () => {
  const p = makeProject({
    rooms: [makeRoom(), makeRoom({ id: "r2", area: 40, frequency: "2x_week" })],
    ruestzeit: 15,
    wegezeit: 10,
  });

  it("returns old and new Monatspreis from computeObjectEconomics", () => {
    const pre = frequencyChangePreview(p, "1x_week", CUSTOM_SETTINGS);
    expect(pre.roomCount).toBe(2);
    expect(pre.changedCount).toBe(2);
    expect(pre.oldPriceMonthly).toBe(computeObjectEconomics(p, CUSTOM_SETTINGS).totals.priceMonthly);
    const copy = { ...p, rooms: p.rooms.map((r) => ({ ...r, frequency: "1x_week" as const })) };
    expect(pre.newPriceMonthly).toBe(calcProjectTotals(copy, CUSTOM_SETTINGS.hourlyRate).cost);
    expect(pre.newPriceMonthly).toBeLessThan(pre.oldPriceMonthly);
    expect(pre.deltaMonthly).toBeCloseTo(pre.newPriceMonthly - pre.oldPriceMonthly, 9);
  });

  it("counts only rooms whose frequency changes", () => {
    const pre = frequencyChangePreview(p, "2x_week", CUSTOM_SETTINGS);
    expect(pre.changedCount).toBe(1);
  });

  it("does not mutate the project", () => {
    const snapshot = JSON.stringify(p);
    frequencyChangePreview(p, "7x_week", CUSTOM_SETTINGS);
    expect(JSON.stringify(p)).toBe(snapshot);
  });
});

describe("rateChangePreview", () => {
  const rooms = [makeRoom(), makeRoom({ id: "r2", area: 40, frequency: "2x_week" })];

  it("is null while the saved rate would not change", () => {
    expect(rateChangePreview(makeProject({ rooms, hourlyRate: 34 }), 34, CUSTOM_SETTINGS)).toBeNull();
    expect(rateChangePreview(makeProject({ rooms }), undefined, CUSTOM_SETTINGS)).toBeNull();
    // Leer bzw. 0 = Standardsatz (wie beim Speichern).
    expect(rateChangePreview(makeProject({ rooms }), 0, CUSTOM_SETTINGS)).toBeNull();
  });

  it("reprices the whole object, including the modules, with computeObjectEconomics", () => {
    const p = makeProject({ rooms, ruestzeit: 15, winterdienst: WD_REF, hms: HMS_REF });
    const pre = rateChangePreview(p, 40, CUSTOM_SETTINGS)!;
    expect(pre.oldPriceMonthly).toBe(computeObjectEconomics(p, CUSTOM_SETTINGS).totals.priceMonthly);
    expect(pre.newPriceMonthly).toBe(computeObjectEconomics({ ...p, hourlyRate: 40 }, CUSTOM_SETTINGS).totals.priceMonthly);
    expect(pre.newPriceMonthly).toBeGreaterThan(pre.oldPriceMonthly);
    expect(pre.deltaMonthly).toBeCloseTo(pre.newPriceMonthly - pre.oldPriceMonthly, 9);
  });

  it("clearing an object rate falls back to the standard rate", () => {
    const p = makeProject({ rooms, hourlyRate: 40 });
    const pre = rateChangePreview(p, undefined, CUSTOM_SETTINGS)!;
    expect(pre.oldPriceMonthly).toBe(calcProjectTotals(p, 40).cost);
    expect(pre.newPriceMonthly).toBe(calcProjectTotals(p, CUSTOM_SETTINGS.hourlyRate).cost);
    expect(pre.deltaMonthly).toBeLessThan(0);
  });
});
