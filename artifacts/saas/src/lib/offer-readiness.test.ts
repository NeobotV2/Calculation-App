import { describe, it, expect } from "vitest";
import {
  FLOW_STEP_ORDER,
  fixForWarningSuffix,
  fixHref,
  getNextStep,
  getObjectStatus,
  getOfferReadiness,
  type CompanyInfo,
} from "./offer-readiness";
import { computeObjectEconomics, type EconomicsSettings } from "./object-economics";
import { calcHourlyRate, getDefaultConfig } from "./hourly-rate-calc";
import type { HmsConfig, WinterdienstConfig } from "./service-modules/types";
import type { Project, Room } from "@/store/use-store";

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
const CREATED = "2026-01-01T00:00:00.000Z";
const SOON = "2026-01-15T00:00:00.000Z";
const LATER = "2026-04-01T00:00:00.000Z";
/** Angebotsbereites Basisobjekt: Name, Kunde, Rüstzeit, eigener Satz über Ziel. */
const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", customer: "Kunde GmbH", status: "active", createdAt: CREATED,
  updatedAt: CREATED, rooms: [makeRoom()], ruestzeit: 15, ...o,
});

const vollkosten = calcHourlyRate(getDefaultConfig()).vollkosten;
/** Globaler Satz 30 % über den Vollkosten — Marge klar über dem Ziel. */
const settings: EconomicsSettings = { hourlyRate: Math.round(vollkosten * 1.3 * 100) / 100, hourlyRateConfig: getDefaultConfig(), targetMargin: 10, disabledWarnings: [] };
const company: CompanyInfo = { companyName: "Glanz GmbH", companyStreet: "Hauptstraße 1", companyZip: "10115", companyCity: "Berlin" };

const readiness = (p: Project, s: EconomicsSettings = settings, c: CompanyInfo = company) =>
  getOfferReadiness(p, computeObjectEconomics(p, s), c);
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("getOfferReadiness — ready object", () => {
  const p = makeProject();
  const r = readiness(p);

  it("has no open items", () => {
    expect(r.items).toEqual([]);
    expect(r.canExport).toBe(true);
    expect(r.isOfferReady).toBe(true);
  });

  it("status Angebotsbereit and next step Angebot erstellen", () => {
    expect(getObjectStatus(p, r)).toEqual({ key: "angebotsbereit", label: "Angebotsbereit", tone: "success" });
    expect(getNextStep(p, r, { hasNachkalkulation: false, now: SOON })).toEqual({ label: "Angebot erstellen", action: { kind: "offer" } });
  });

  it("suggests the Nachkalkulation after 60 days without one", () => {
    const step = getNextStep(p, r, { hasNachkalkulation: false, now: LATER });
    expect(step.label).toBe("Nachkalkulation erfassen");
    expect(step.action).toEqual({ kind: "href", href: "/auswertung/p1" });
    expect(getNextStep(p, r, { hasNachkalkulation: true, now: LATER }).action).toEqual({ kind: "offer" });
  });

  it("archived objects are Archiviert", () => {
    const a = makeProject({ status: "archived" });
    expect(getObjectStatus(a, readiness(a)).key).toBe("archiviert");
  });
});

describe("getOfferReadiness — blockers", () => {
  it("name_missing", () => {
    const p = makeProject({ name: "  " });
    const r = readiness(p);
    expect(ids(r.blockers)).toEqual(["name_missing"]);
    expect(r.blockers[0].fix).toEqual({ kind: "flow", step: "objekt", field: "name" });
    expect(r.canExport).toBe(false);
    expect(r.isOfferReady).toBe(false);
    expect(getObjectStatus(p, r)).toEqual({ key: "entwurf", label: "Entwurf", tone: "neutral" });
    expect(getNextStep(p, r, { hasNachkalkulation: false })).toMatchObject({
      label: "Objektname ergänzen", action: { kind: "href", href: "/kalkulation/p1/objekt" },
    });
  });

  it("no_price points to the rooms step without modules", () => {
    const r = readiness(makeProject({ rooms: [] }));
    expect(ids(r.blockers)).toEqual(["no_price"]);
    expect(r.blockers[0].fix).toEqual({ kind: "flow", step: "raeume" });
  });

  it("no_price and hms_incomplete point to the HMS step for an empty HMS-only object", () => {
    const r = readiness(makeProject({ rooms: [], hms: { ...HMS_REF, tasks: [] } }));
    expect(ids(r.blockers)).toEqual(["no_price", "hms_incomplete"]);
    expect(r.blockers.map((b) => b.fix)).toEqual([{ kind: "flow", step: "hms" }, { kind: "flow", step: "hms" }]);
  });

  it("wd_incomplete from the wd_areas finding", () => {
    const r = readiness(makeProject({ winterdienst: { ...WD_REF, areas: [] } }));
    expect(ids(r.blockers)).toEqual(["wd_incomplete"]);
    expect(r.blockers[0].fix).toEqual({ kind: "flow", step: "winterdienst" });
    expect(r.hints.some((h) => h.id.endsWith("_wd_areas"))).toBe(false);
  });
});

describe("getOfferReadiness — criticals", () => {
  it("below_cost when the strategy is kritisch (not repeated as a hint)", () => {
    const p = makeProject({ hourlyRate: vollkosten * 0.8 });
    const r = readiness(p);
    expect(ids(r.criticals)).toEqual(["below_cost"]);
    expect(r.criticals[0].fix).toEqual({ kind: "flow", step: "preis" });
    expect(r.hints.some((h) => h.id === "p1_below_cost")).toBe(false);
    expect(r.canExport).toBe(true);
    expect(r.isOfferReady).toBe(false);
    expect(getObjectStatus(p, r)).toEqual({ key: "pruefung_offen", label: "Prüfung offen", tone: "warning" });
    expect(getNextStep(p, r, { hasNachkalkulation: false })).toMatchObject({
      label: "Preis prüfen", action: { kind: "href", href: "/kalkulation/p1/preis" },
    });
  });

  it("below_cost_wd from the module finding", () => {
    const r = readiness(makeProject({ winterdienst: { ...WD_REF, rateOverride: 15, vollkostenOverride: 24 } }));
    expect(ids(r.criticals)).toContain("below_cost_wd");
    expect(r.hints.some((h) => h.id.endsWith("_below_cost_wd"))).toBe(false);
  });

  it("below_cost_hms from the module finding", () => {
    const r = readiness(makeProject({ hms: { ...HMS_REF, rateOverride: 10, vollkostenOverride: 30 } }));
    expect(ids(r.criticals)).toContain("below_cost_hms");
  });
});

describe("getOfferReadiness — offer gaps", () => {
  it("customer_missing", () => {
    const p = makeProject({ customer: undefined });
    const r = readiness(p);
    expect(ids(r.offerGaps)).toEqual(["customer_missing"]);
    expect(r.offerGaps[0].fix).toEqual({ kind: "flow", step: "objekt", field: "customer" });
    expect(getObjectStatus(p, r).key).toBe("pruefung_offen");
    expect(getNextStep(p, r, { hasNachkalkulation: false })).toMatchObject({
      label: "Kunde ergänzen", action: { kind: "href", href: "/kalkulation/p1/objekt" },
    });
  });

  it("company_incomplete for the placeholder name or a missing address", () => {
    for (const c of [
      { ...company, companyName: "Meine Reinigungsfirma" },
      { ...company, companyName: "" },
      { ...company, companyStreet: "" },
      { ...company, companyCity: " " },
    ]) {
      const r = readiness(makeProject(), settings, c);
      expect(ids(r.offerGaps)).toEqual(["company_incomplete"]);
      expect(r.offerGaps[0].fix).toEqual({ kind: "route", href: "/einstellungen/firma" });
    }
    const p = makeProject();
    const r = readiness(p, settings, { ...company, companyCity: "" });
    expect(getNextStep(p, r, { hasNachkalkulation: false }).action).toEqual({ kind: "href", href: "/einstellungen/firma" });
  });
});

describe("getOfferReadiness — hints", () => {
  it("room warnings map to the rooms step and keep their severity", () => {
    const p = makeProject({ rooms: [makeRoom({ customPerformance: 400 })] });
    const r = readiness(p);
    expect(ids(r.hints)).toEqual(["p1_perf_r1"]);
    expect(r.hints[0]).toMatchObject({ level: "hint", severity: "warning", fix: { kind: "flow", step: "raeume" } });
    expect(getObjectStatus(p, r).key).toBe("pruefung_offen");
  });

  it("low margin maps to the price step", () => {
    const r = readiness(makeProject({ hourlyRate: vollkosten * 1.05 }));
    expect(ids(r.hints)).toEqual(["p1_low_margin"]);
    expect(r.hints[0].fix).toEqual({ kind: "flow", step: "preis" });
  });

  it("default rate maps to the Verrechnungssatz route", () => {
    const s: EconomicsSettings = { ...settings, hourlyRate: 22.5 };
    const r = readiness(makeProject(), s);
    const hint = r.hints.find((h) => h.id === "p1_default_rate");
    expect(hint?.fix).toEqual({ kind: "route", href: "/verrechnungssatz" });
    expect(hint?.severity).toBe("info");
  });

  it("ruestzeit_zero when rooms exist without Rüstzeit; info hints keep the object ready", () => {
    const p = makeProject({ ruestzeit: undefined });
    const r = readiness(p);
    expect(ids(r.hints)).toEqual(["ruestzeit_zero"]);
    expect(r.hints[0]).toMatchObject({ severity: "info", fix: { kind: "flow", step: "raeume", field: "ruestzeit" } });
    expect(r.isOfferReady).toBe(true);
    expect(getObjectStatus(p, r).key).toBe("angebotsbereit");
    expect(ids(readiness(makeProject({ rooms: [], ruestzeit: 0, winterdienst: WD_REF })).hints)).not.toContain("ruestzeit_zero");
  });

  it("module findings map to their module step", () => {
    const r = readiness(makeProject({ winterdienst: WD_REF, hms: { ...HMS_REF, rateOverride: 30, vollkostenOverride: 24 } }));
    expect(ids(r.hints)).toEqual(["p1_wd_harsh", "p1_wd_splitt", "p1_hms_rate"]);
    expect(r.hints.map((h) => h.fix)).toEqual([
      { kind: "flow", step: "winterdienst" }, { kind: "flow", step: "winterdienst" }, { kind: "flow", step: "hms" },
    ]);
  });

  it("disabled warning types do not appear as hints", () => {
    const r = readiness(makeProject({ winterdienst: WD_REF }), { ...settings, disabledWarnings: ["winterdienst"] });
    expect(r.hints.some((h) => h.id.includes("_wd_"))).toBe(false);
  });
});

describe("fix helpers", () => {
  it("maps warning suffixes to fixes", () => {
    expect(fixForWarningSuffix("wd_salt")).toEqual({ kind: "flow", step: "winterdienst" });
    expect(fixForWarningSuffix("hms_contingent")).toEqual({ kind: "flow", step: "hms" });
    expect(fixForWarningSuffix("perf_r9")).toEqual({ kind: "flow", step: "raeume" });
    expect(fixForWarningSuffix("sanitaer")).toEqual({ kind: "flow", step: "raeume" });
    expect(fixForWarningSuffix("low_margin_wd")).toEqual({ kind: "flow", step: "preis" });
    expect(fixForWarningSuffix("below_cost")).toEqual({ kind: "flow", step: "preis" });
    expect(fixForWarningSuffix("default_rate")).toEqual({ kind: "route", href: "/verrechnungssatz" });
    expect(fixForWarningSuffix("unknown")).toBeUndefined();
  });

  it("builds hrefs", () => {
    const p = makeProject();
    expect(fixHref(p, { kind: "flow", step: "hms" })).toBe("/kalkulation/p1/hms");
    expect(fixHref(p, { kind: "route", href: "/einstellungen/firma" })).toBe("/einstellungen/firma");
    expect(FLOW_STEP_ORDER).toEqual(["leistungen", "objekt", "raeume", "winterdienst", "hms", "preis", "pruefen"]);
  });
});
