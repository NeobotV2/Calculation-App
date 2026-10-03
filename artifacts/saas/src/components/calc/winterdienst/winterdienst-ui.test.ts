import { describe, expect, it } from "vitest";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import { sanitizeWinterdienst } from "@/lib/service-modules/sanitize";
import { createDefaultWinterdienst, createWinterArea } from "@/data/winterdienst";
import type { ModuleRates, WinterdienstActual, WinterdienstConfig } from "@/lib/service-modules/types";
import { formatCurrency } from "@/lib/utils";
import {
  WD_LIMITS,
  areaMaterialLabel,
  areaMinutesPerEinsatz,
  areaWorkLabel,
  billingModeLabel,
  billingPreviewText,
  breakEvenText,
  changeAreaMethod,
  changeAreaType,
  crewNeeded,
  defaultWinterSeasonLabel,
  duplicateArea,
  einsaetzeQuickPicks,
  hasMachineArea,
  latestWinterActual,
  lengthTimesWidth,
  regionBandText,
  regionChange,
  regionChipLabel,
  removeArea,
  setMaterialOverride,
  setOptional,
  sortWinterActuals,
  splitInstallments,
  upsertArea,
  winterFindings,
  winterMetaLine,
} from "./winterdienst-ui";

/* Vertrags-Fixture (domain-spec §14). */
const WD_REF: WinterdienstConfig = {
  schemaVersion: 1, enabled: true, region: "mittelgebirge", seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45, clearingSharePct: 50,
  areas: [
    { id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" },
    { id: "a2", label: "Parkplatz", type: "parkplatz", areaM2: 800, method: "maschinell", clear: true, spread: true },
    { id: "a3", label: "Eingangstreppe", type: "treppe", areaM2: 20, method: "manuell", clear: true, spread: true },
  ],
  material: "salz", materialMarkupPct: 20, saltRestricted: false, travelMinutesPerEinsatz: 15, documentationMinutesPerEinsatz: 5,
  seasonSetupHours: 2, standbyFeeMonthly: 50, standbyCostMonthly: 25, offHoursSharePct: 50, offHoursSurchargePct: 25,
  liabilitySurchargePct: 10, riskProvisionPct: 100, machineRatePerHour: 45, machineCostPerHour: 35, billingMode: "pauschale_12", clearingWindowHours: 3,
};
const R: ModuleRates = { rate: 30, vollkosten: 24 };

/** JSON-Normalform (undefined-Schlüssel fallen weg, wie beim Speichern). */
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as unknown;
const survivesSanitize = (cfg: WinterdienstConfig) => expect(json(sanitizeWinterdienst(json(cfg)))).toEqual(json(cfg));

describe("winterdienst-ui: Ergebniswerte aus WD_REF (Raten 30/24)", () => {
  const r = calcWinterdienst(WD_REF, R);

  it("liefert die Kennzahlen der Ergebniskarte", () => {
    expect(formatCurrency(r.billing.pricePerEinsatz)).toBe(formatCurrency(75.31));
    expect(formatCurrency(r.revenue.total)).toBe(formatCurrency(3699.11));
    expect(formatCurrency(r.revenueMonthly)).toBe(formatCurrency(308.26));
    expect(r.scenarios.streng.contribution).toBeCloseTo(-1077.33, 2);
  });

  it("breakEvenText: Pauschale ohne Deckelung", () => {
    expect(breakEvenText(r.billing)).toBe("Kostendeckend bis ca. 57 Einsätze");
  });

  it("breakEvenText: pro Einsatz und Deckelung ohne Verlustschwelle", () => {
    const pe = calcWinterdienst({ ...WD_REF, billingMode: "pro_einsatz" }, R);
    expect(breakEvenText(pe.billing)).toBe("Bei jeder Einsatzzahl kostendeckend");
    const cap = calcWinterdienst({ ...WD_REF, capEinsaetze: 45 }, R);
    expect(breakEvenText(cap.billing)).toBe("Bei jeder Einsatzzahl kostendeckend");
  });

  it("breakEvenText: Verlust unter / keine Deckung", () => {
    const base = { mode: "pro_einsatz" as const, pauschaleSeason: null, installmentAmount: 0, installmentCount: 5, pricePerEinsatz: 0, capEinsaetze: null, expectedSeasonTotal: 0 };
    expect(breakEvenText({ ...base, lossAboveEinsaetze: null, lossBelowEinsaetze: 11.2 })).toBe("Verlust unter 12 Einsätzen");
    expect(breakEvenText({ ...base, lossAboveEinsaetze: 0, lossBelowEinsaetze: null })).toBe("Bei keiner Einsatzzahl kostendeckend");
  });

  it("billingPreviewText: 12 Monatsraten mit Rundungsrest in der letzten Rate", () => {
    expect(billingPreviewText(r)).toBe(`12 Raten à ${formatCurrency(308.26)}, letzte Rate ${formatCurrency(308.25)}`);
  });

  it("billingPreviewText: Saisonraten und pro Einsatz", () => {
    const s = calcWinterdienst({ ...WD_REF, billingMode: "pauschale_saison" }, R);
    expect(billingPreviewText(s)).toBe(`5 Raten à ${formatCurrency(739.82)} (Nov–Mär), letzte Rate ${formatCurrency(739.83)}`);
    const pe = calcWinterdienst({ ...WD_REF, billingMode: "pro_einsatz" }, R);
    expect(billingPreviewText(pe)).toBe(`${formatCurrency(62)} je Saisonmonat + ${formatCurrency(75.31)} je Einsatz`);
  });

  it("billingPreviewText: Deckelung nennt den Preis je weiterem Einsatz", () => {
    const c = calcWinterdienst({ ...WD_REF, capEinsaetze: 30 }, R);
    expect(c.billing.pauschaleSeason).toBeCloseTo(2569.405, 6);
    expect(billingPreviewText(c)).toBe(
      `12 Raten à ${formatCurrency(214.12)}, letzte Rate ${formatCurrency(214.09)} · über 30 Einsätze: ${formatCurrency(75.31)} je Einsatz`,
    );
  });

  it("splitInstallments rundet nur für die Anzeige", () => {
    expect(splitInstallments(3699.1075, 12)).toEqual({ amount: 308.26, last: 308.25, count: 12 });
    expect(splitInstallments(3699.1075, 5)).toEqual({ amount: 739.82, last: 739.83, count: 5 });
    expect(splitInstallments(100, 0)).toEqual({ amount: 100, last: 100, count: 1 });
  });

  it("areaMinutesPerEinsatz = (Räumanteil × Räumstunden + Streustunden) × 60", () => {
    expect(areaMinutesPerEinsatz(r, 0, 50)).toBeCloseTo(31.2, 6);
    expect(areaMinutesPerEinsatz(r, 1, 50)).toBeCloseTo(20, 6);
    expect(areaMinutesPerEinsatz(r, 2, 50)).toBeCloseTo(14, 6);
    expect(areaMinutesPerEinsatz(r, 9, 50)).toBe(0);
    const sum = [0, 1, 2].reduce((s, i) => s + areaMinutesPerEinsatz(r, i, 50), 0);
    expect(sum / 60).toBeCloseTo(r.perEinsatz.laborHours - r.perEinsatz.fixedHours, 9);
  });

  it("crewNeeded nur bei mehr als einer Kraft", () => {
    expect(crewNeeded(r)).toBeNull();
    const big = calcWinterdienst({ ...WD_REF, billingMode: "pro_einsatz", areas: [createWinterArea("g", "gehweg", 600)] }, R);
    expect(big.crewAtPeak).toBeCloseTo(1.533333, 5);
    expect(crewNeeded(big)).toBe(2);
  });
});

describe("winterdienst-ui: Texte", () => {
  it("areaWorkLabel / areaMaterialLabel", () => {
    expect(areaWorkLabel(WD_REF.areas[0], WD_REF)).toBe("Räumen und Streuen (Splitt)");
    expect(areaWorkLabel(WD_REF.areas[1], WD_REF)).toBe("Räumen und Streuen (Salz)");
    expect(areaWorkLabel(WD_REF.areas[1], WD_REF, { short: true })).toBe("Räumen + Streuen (Salz)");
    expect(areaWorkLabel({ ...WD_REF.areas[0], spread: false }, WD_REF)).toBe("Räumen");
    expect(areaWorkLabel({ ...WD_REF.areas[0], clear: false }, WD_REF)).toBe("Streuen (Splitt)");
    expect(areaMaterialLabel(WD_REF.areas[0], WD_REF)).toBe("Splitt");
    expect(areaMaterialLabel(WD_REF.areas[1], WD_REF)).toBe("Standard (Salz)");
    expect(areaMaterialLabel({ ...WD_REF.areas[1], spread: false }, WD_REF)).toBe("–");
  });

  it("Regionstexte", () => {
    expect(regionChipLabel("mittelgebirge")).toEqual({ label: "Hügelland / Mittelgebirge", sub: "typ. 45 Einsätze" });
    expect(regionBandText("flachland")).toBe("Orientierung 10–40, typisch 25");
    expect(einsaetzeQuickPicks("kueste").map((q) => q.label)).toEqual(["Mild 5", "Typisch 12", "Streng 25"]);
  });

  it("billingModeLabel und Metazeile", () => {
    expect(billingModeLabel("pauschale_12", WD_REF.seasonMonths)).toBe("Saisonpauschale in 12 Monatsraten");
    expect(billingModeLabel("pauschale_saison", WD_REF.seasonMonths)).toBe("Saisonpauschale in 5 Raten (Nov–Mär)");
    expect(billingModeLabel("pro_einsatz", WD_REF.seasonMonths)).toBe("Je Einsatz + Bereitschaftspauschale");
    expect(winterMetaLine(WD_REF)).toBe("Hügelland / Mittelgebirge · Nov–Mär · 45 Einsätze · Pauschale, 12 Raten");
  });

  it("lengthTimesWidth (Gehweg-Eingabehilfe)", () => {
    expect(lengthTimesWidth(80, 1.5)).toBe(120);
    expect(lengthTimesWidth(33.3, 1.5)).toBe(49.95);
    expect(lengthTimesWidth(0, 1.5)).toBeUndefined();
    expect(lengthTimesWidth(undefined, 1.5)).toBeUndefined();
  });

  it("winterFindings filtert wd_*, below_cost_wd und low_margin_wd", () => {
    const f = ["wd_harsh", "below_cost_wd", "low_margin_wd", "hms_rate", "below_cost_hms", "perf_r1"].map((idSuffix) => ({ idSuffix }));
    expect(winterFindings(f).map((x) => x.idSuffix)).toEqual(["wd_harsh", "below_cost_wd", "low_margin_wd"]);
    expect(winterFindings(undefined)).toEqual([]);
  });
});

describe("winterdienst-ui: Config-Updates bleiben sanitize-stabil", () => {
  it("Regionswechsel übernimmt Einsätze, Räumanteil und Saison", () => {
    const { config, message } = regionChange(WD_REF, "hochlage");
    expect(config.region).toBe("hochlage");
    expect(config.expectedEinsaetze).toBe(80);
    expect(config.clearingSharePct).toBe(70);
    expect(config.seasonMonths).toEqual([1, 2, 3, 4, 10, 11, 12]);
    expect(config.areas).toBe(WD_REF.areas);
    expect(message).toBe("Einsätze, Räumanteil und Saison auf Richtwerte für Hochlage / Alpenvorland gesetzt");
    survivesSanitize(config);
  });

  it("Treppe kann nicht maschinell geräumt werden", () => {
    const stairs = changeAreaType(createWinterArea("x", "parkplatz", 50), "treppe");
    expect(stairs.method).toBe("manuell");
    expect(stairs.label).toBe("Treppe / Eingang");
    expect(changeAreaMethod(stairs, "maschinell").method).toBe("manuell");
    const lot = changeAreaType(stairs, "parkplatz");
    expect(lot.method).toBe("maschinell");
    expect(changeAreaMethod(lot, "manuell").method).toBe("manuell");
    const custom = changeAreaType({ ...stairs, label: "Hintereingang" }, "rampe");
    expect(custom.label).toBe("Hintereingang");
  });

  it("Flächen hinzufügen, ersetzen, duplizieren, entfernen", () => {
    const added = upsertArea(WD_REF, createWinterArea("a4", "zufahrt", 200));
    expect(added.areas.map((a) => a.id)).toEqual(["a1", "a2", "a3", "a4"]);
    survivesSanitize(added);
    const replaced = upsertArea(added, { ...added.areas[0], areaM2: 150 });
    expect(replaced.areas[0].areaM2).toBe(150);
    expect(replaced.areas).toHaveLength(4);
    const dup = duplicateArea(replaced, "a1", "a1b");
    expect(dup.areas.map((a) => a.id)).toEqual(["a1", "a1b", "a2", "a3", "a4"]);
    expect(dup.areas[1].label).toBe("Gehweg (Kopie)");
    survivesSanitize(dup);
    expect(removeArea(dup, "a2").areas.map((a) => a.id)).toEqual(["a1", "a1b", "a3", "a4"]);
    expect(duplicateArea(WD_REF, "nope", "z")).toBe(WD_REF);
  });

  it("Material-Overrides setzen und vollständig entfernen", () => {
    const a = setMaterialOverride(WD_REF, "salz", "gramsPerM2", 30);
    expect(a.materialOverrides).toEqual({ salz: { gramsPerM2: 30 } });
    survivesSanitize(a);
    const b = setMaterialOverride(a, "salz", "pricePerKg", 0.25);
    expect(b.materialOverrides).toEqual({ salz: { gramsPerM2: 30, pricePerKg: 0.25 } });
    survivesSanitize(b);
    const c = setMaterialOverride(setMaterialOverride(b, "salz", "gramsPerM2", undefined), "salz", "pricePerKg", undefined);
    expect("materialOverrides" in c).toBe(false);
    survivesSanitize(c);
  });

  it("optionale Felder: Overrides nur > 0, sonst Schlüssel entfernt", () => {
    const withRate = setOptional(WD_REF, "rateOverride", 35, { positive: true });
    expect(withRate.rateOverride).toBe(35);
    survivesSanitize(withRate);
    expect("rateOverride" in setOptional(withRate, "rateOverride", 0, { positive: true })).toBe(false);
    expect(setOptional(WD_REF, "capEinsaetze", 0).capEinsaetze).toBe(0);
    survivesSanitize(setOptional(WD_REF, "capEinsaetze", 0));
    expect("capEinsaetze" in setOptional(WD_REF, "capEinsaetze", undefined)).toBe(false);
  });

  it("Werte an den Eingabegrenzen überstehen sanitize", () => {
    const edge: WinterdienstConfig = {
      ...WD_REF,
      expectedEinsaetze: WD_LIMITS.expectedEinsaetze.max,
      clearingSharePct: WD_LIMITS.clearingSharePct.max,
      clearingWindowHours: WD_LIMITS.clearingWindowHours.min,
      offHoursSurchargePct: WD_LIMITS.offHoursSurchargePct.max,
      offHoursWageSurchargePct: WD_LIMITS.offHoursWageSurchargePct.max,
      liabilitySurchargePct: WD_LIMITS.liabilitySurchargePct.max,
      materialMarkupPct: WD_LIMITS.materialMarkupPct.max,
      capEinsaetze: WD_LIMITS.capEinsaetze.max,
      rateOverride: WD_LIMITS.rateOverride.max,
      vollkostenOverride: WD_LIMITS.vollkostenOverride.max,
      areas: [{ ...WD_REF.areas[0], areaM2: WD_LIMITS.areaM2.max, clearingPerfM2h: WD_LIMITS.perfM2h.max }],
    };
    survivesSanitize(edge);
    survivesSanitize(createDefaultWinterdienst());
    survivesSanitize(WD_REF);
  });

  it("hasMachineArea berücksichtigt nur zulässige Maschinenflächen", () => {
    expect(hasMachineArea(WD_REF)).toBe(true);
    expect(hasMachineArea({ ...WD_REF, areas: [{ ...WD_REF.areas[2], method: "maschinell" }] })).toBe(false);
  });
});

describe("winterdienst-ui: Nachkalkulation", () => {
  it("defaultWinterSeasonLabel = „{y−1}/{yy}“", () => {
    expect(defaultWinterSeasonLabel(new Date(2026, 9, 3))).toBe("2025/26");
    expect(defaultWinterSeasonLabel(new Date(2001, 0, 1))).toBe("2000/01");
  });

  it("latestWinterActual / sortWinterActuals", () => {
    const list: WinterdienstActual[] = [
      { id: "1", season: "2024/25", einsaetze: 40, recordedAt: "2025-04-01T00:00:00.000Z" },
      { id: "2", season: "2025/26", einsaetze: 70, recordedAt: "2026-04-01T00:00:00.000Z" },
      { id: "3", season: "2025/26", einsaetze: 72, recordedAt: "2026-05-01T00:00:00.000Z" },
    ];
    expect(latestWinterActual(list)?.id).toBe("3");
    expect(latestWinterActual([])).toBeUndefined();
    expect(sortWinterActuals(list).map((a) => a.id)).toEqual(["3", "2", "1"]);
  });
});
