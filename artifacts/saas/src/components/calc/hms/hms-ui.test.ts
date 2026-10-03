import { describe, expect, it } from "vitest";
import { calcHms } from "@/lib/service-modules/hms";
import { sanitizeHms } from "@/lib/service-modules/sanitize";
import { HMS_CATALOG, HMS_CATALOG_BY_ID, createDefaultHms } from "@/data/hausmeisterservice";
import type { HmsActual, HmsConfig, ModuleRates } from "@/lib/service-modules/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  HMS_LIMITS,
  addCatalogItems,
  addedCatalogIds,
  catalogGroups,
  categoryLabel,
  createCustomTask,
  defaultHmsYear,
  duplicateTask,
  hmsDisplayAmounts,
  hmsFindings,
  hmsMetaLine,
  latestHmsActual,
  missingPresetTasks,
  monthProfile,
  peakMonthsLabel,
  presetTargetLabel,
  removeTask,
  setTaskEnabled,
  sortHmsActuals,
  taskCategoryLabel,
  taskFrequencyLabel,
  taskMonthly,
  taskQuantityLabel,
  taskResultMap,
  taskTimeFieldLabel,
  taskTimeLabel,
  travelLabel,
  travelRevenueMonthly,
  upsertTask,
  withTaskSeason,
} from "./hms-ui";

/* Vertrags-Fixture (domain-spec §14). */
const HMS_REF: HmsConfig = { schemaVersion: 1, enabled: true, travelMinutesPerVisitDay: 10, materialMarkupPct: 15, contingentOverageBilled: true, tasks: [
  { id: "t1", catalogId: "kontrollgang", label: "Kontrollgang", unit: "pauschal", quantity: 1, minutesPerUnit: 30, frequencyPerYear: 52, enabled: true },
  { id: "t2", catalogId: "rasen_maehen", label: "Rasen mähen", unit: "m2", quantity: 600, perfM2h: 600, frequencyPerYear: 14, seasonMonths: [4, 5, 6, 7, 8, 9, 10], materialCostPerYear: 60, enabled: true },
  { id: "t3", catalogId: "muelltonnen", label: "Mülltonnen", unit: "stueck", quantity: 6, minutesPerUnit: 3, frequencyPerYear: 52, enabled: true },
  { id: "t4", catalogId: "hecke_schneiden", label: "Hecke", unit: "lfm", quantity: 40, minutesPerUnit: 3, frequencyPerYear: 2, seasonMonths: [6, 9], materialCostPerYear: 80, enabled: true },
  { id: "t5", catalogId: "kleinreparaturen", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
  { id: "t6", catalogId: "laub_entfernen", label: "Laub", unit: "m2", quantity: 400, perfM2h: 400, frequencyPerYear: 6, seasonMonths: [10, 11], materialCostPerYear: 50, enabled: false },
] };
const R: ModuleRates = { rate: 30, vollkosten: 24 };

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as unknown;
const survivesSanitize = (cfg: HmsConfig) => expect(json(sanitizeHms(json(cfg)))).toEqual(json(cfg));

describe("hms-ui: Ergebnis aus HMS_REF (Raten 30/24)", () => {
  const r = calcHms(HMS_REF, R);

  it("Ø 255,58 €/Monat und Jahreswert 3.067,00 €", () => {
    expect(formatCurrency(r.revenueMonthly)).toBe(formatCurrency(255.58));
    expect(formatCurrency(r.revenueAnnual)).toBe(formatCurrency(3067));
  });

  it("Monatsprofil: Spitze Jun und Sep mit 10,2 h", () => {
    const profile = monthProfile(r.monthlyLaborHours);
    expect(profile.filter((e) => e.isPeak).map((e) => e.short)).toEqual(["Jun", "Sep"]);
    expect(formatNumber(r.peakMonthHours, 1)).toBe("10,2");
    expect(peakMonthsLabel(r.monthlyLaborHours)).toBe("Jun, Sep");
    expect(profile[0].hours).toBeCloseTo(6.188889, 5);
    expect(peakMonthsLabel(new Array(12).fill(0))).toBe("–");
    expect(peakMonthsLabel(new Array(12).fill(1))).toBe("alle Monate");
  });

  it("deaktivierte Leistung t6 fehlt im Ergebnis; Σ Leistungen + Anfahrt = revenueMonthly", () => {
    const map = taskResultMap(r);
    expect(map.has("t6")).toBe(false);
    expect([...map.keys()]).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    const sum = [...map.values()].reduce((s, t) => s + taskMonthly(t), 0) + travelRevenueMonthly(r);
    expect(sum).toBeCloseTo(r.revenueMonthly, 9);
    expect(travelRevenueMonthly(r)).toBeCloseTo(260 / 12, 9);
  });

  it("Anfahrten-Zeile und Metazeile", () => {
    expect(travelLabel(r, HMS_REF)).toBe("Anfahrten (52 Einsatztage × 10 Min.)");
    expect(hmsMetaLine(HMS_REF, r)).toBe("5 aktive Leistungen · 52 Einsatztage/Jahr");
  });
});

describe("hms-ui: Texte", () => {
  const [t1, t2, t3, t4, t5] = HMS_REF.tasks;

  it("taskTimeLabel", () => {
    expect(taskTimeLabel(t1)).toBe("30 Min./Einsatz");
    expect(taskTimeLabel(t2)).toBe("600 m²/h");
    expect(taskTimeLabel(t3)).toBe("3 Min./Stk.");
    expect(taskTimeLabel(t4)).toBe("3 Min./lfm");
    expect(taskTimeLabel(t5)).toBe("Kontingent");
    expect(taskTimeLabel({ unit: "m2", perfM2h: undefined })).toBe("–");
  });

  it("taskFrequencyLabel", () => {
    expect(taskFrequencyLabel(t1)).toBe("52× jährlich");
    expect(taskFrequencyLabel(t2)).toBe("14× jährlich · Apr–Okt");
    expect(taskFrequencyLabel(t4)).toBe("2× jährlich · Jun, Sep");
    expect(taskFrequencyLabel(t5)).toBe("Kontingent 2 Std. je Abruf");
    expect(taskFrequencyLabel({ ...t5, frequencyPerYear: 4 })).toBe("Kontingent 2 Std. je Abruf · 4× jährlich");
  });

  it("Menge, Kategorie, Feldlabels", () => {
    expect(taskQuantityLabel(t3)).toBe("6 Stk.");
    expect(taskQuantityLabel(t2)).toBe("600 m²");
    expect(taskQuantityLabel(t5)).toBe("2 Std.");
    expect(categoryLabel("kontrolle")).toBe("Kontrolle & Sicherheit");
    expect(categoryLabel("bedarf")).toBe("Nach Bedarf");
    expect(taskCategoryLabel(t2)).toBe("Grünpflege");
    expect(taskCategoryLabel({ catalogId: undefined })).toBe("Eigene Leistung");
    expect(taskTimeFieldLabel("pauschal")).toBe("Min. je Einsatz");
    expect(taskTimeFieldLabel("stueck")).toBe("Min. je Stück");
    expect(taskTimeFieldLabel("m2")).toBe("Leistung (m²/h)");
    expect(taskTimeFieldLabel("kontingent")).toBeNull();
  });

  it("hmsFindings filtert hms_*, below_cost_hms und low_margin_hms", () => {
    const f = ["hms_rate", "below_cost_hms", "low_margin_hms", "wd_harsh", "below_cost_wd"].map((idSuffix) => ({ idSuffix }));
    expect(hmsFindings(f).map((x) => x.idSuffix)).toEqual(["hms_rate", "below_cost_hms", "low_margin_hms"]);
  });
});

describe("hms-ui: Katalog und Vorschläge", () => {
  it("catalogGroups enthält alle 20 Einträge in Kategorienreihenfolge", () => {
    const groups = catalogGroups();
    expect(groups.map((g) => g.category)).toEqual(["kontrolle", "aussenanlagen", "gruenpflege", "abfall", "technik", "bedarf"]);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(HMS_CATALOG.length);
  });

  it("missingPresetTasks: Wohnanlage ohne bereits erfasste (auch inaktive) Leistungen", () => {
    expect(missingPresetTasks(HMS_REF, "Wohnanlage").map((i) => i.id)).toEqual([
      "treppenhaus_kontrolle",
      "technik_kontrolle",
      "muellplatz",
      "aussenanlagen_fegen",
    ]);
    expect(missingPresetTasks({ tasks: [] }, undefined).map((i) => i.id)).toEqual([
      "kontrollgang",
      "muelltonnen",
      "aussenanlagen_fegen",
      "kleinreparaturen",
    ]);
    expect(missingPresetTasks({ tasks: [] }, "Sonstiges")).toHaveLength(4);
    expect(presetTargetLabel(undefined)).toBe("Ihr Objekt");
    expect(presetTargetLabel("Büro")).toBe("Büro");
  });

  it("addCatalogItems hängt Katalogleistungen an (sanitize-stabil)", () => {
    let n = 0;
    const cfg = addCatalogItems(HMS_REF, missingPresetTasks(HMS_REF, "Wohnanlage"), () => `n${++n}`);
    expect(cfg.tasks).toHaveLength(10);
    expect(addedCatalogIds(cfg).has("muellplatz")).toBe(true);
    expect(missingPresetTasks(cfg, "Wohnanlage")).toEqual([]);
    survivesSanitize(cfg);
    expect(addCatalogItems(HMS_REF, [], () => "x")).toBe(HMS_REF);
  });
});

describe("hms-ui: Config-Updates bleiben sanitize-stabil", () => {
  it("eigene Leistung anlegen, ersetzen, duplizieren, (de)aktivieren, entfernen", () => {
    const custom = { ...createCustomTask("c1"), label: "Fahrradkeller fegen" };
    const a = upsertTask(HMS_REF, custom);
    expect(a.tasks.at(-1)).toEqual(custom);
    survivesSanitize(a);
    const b = upsertTask(a, { ...custom, quantity: 3, minutesPerUnit: 10 });
    expect(b.tasks).toHaveLength(7);
    expect(b.tasks.at(-1)?.quantity).toBe(3);
    const c = duplicateTask(b, "t2", "t2b");
    expect(c.tasks.map((t) => t.id).slice(0, 3)).toEqual(["t1", "t2", "t2b"]);
    expect(c.tasks[2].label).toBe("Rasen mähen (Kopie)");
    expect(c.tasks[2].seasonMonths).not.toBe(c.tasks[1].seasonMonths);
    survivesSanitize(c);
    const d = setTaskEnabled(c, "t6", true);
    expect(d.tasks.find((t) => t.id === "t6")?.enabled).toBe(true);
    expect(removeTask(d, "t6").tasks.some((t) => t.id === "t6")).toBe(false);
  });

  it("Saison leer ⇒ ganzjährig (Schlüssel entfällt)", () => {
    const t = withTaskSeason(HMS_REF.tasks[1], []);
    expect("seasonMonths" in t).toBe(false);
    expect(withTaskSeason(HMS_REF.tasks[0], [9, 6, 6]).seasonMonths).toEqual([6, 9]);
    survivesSanitize({ ...HMS_REF, tasks: [t] });
  });

  it("Werte an den Eingabegrenzen überstehen sanitize", () => {
    const edge: HmsConfig = {
      ...HMS_REF,
      travelMinutesPerVisitDay: HMS_LIMITS.travelMinutesPerVisitDay.max,
      visitDaysPerYear: HMS_LIMITS.visitDaysPerYear.max,
      materialMarkupPct: HMS_LIMITS.materialMarkupPct.max,
      rateOverride: HMS_LIMITS.rateOverride.max,
      vollkostenOverride: HMS_LIMITS.vollkostenOverride.max,
      tasks: [{
        ...HMS_REF.tasks[0],
        quantity: HMS_LIMITS.quantity.max,
        minutesPerUnit: HMS_LIMITS.minutesPerUnit.max,
        frequencyPerYear: HMS_LIMITS.frequencyPerYear.max,
        materialCostPerYear: HMS_LIMITS.materialCostPerYear.max,
      }],
    };
    survivesSanitize(edge);
    survivesSanitize(HMS_REF);
    survivesSanitize(createDefaultHms("Büro", () => "id"));
    expect(HMS_CATALOG_BY_ID.kontrollgang.label).toContain("Kontrollgang");
  });
});

describe("hms-ui: Nachkalkulation", () => {
  it("defaultHmsYear und jüngster Eintrag", () => {
    expect(defaultHmsYear(new Date(2026, 9, 3))).toBe(2025);
    const list: HmsActual[] = [
      { id: "1", year: 2024, laborHours: 90, recordedAt: "2025-01-10T00:00:00.000Z" },
      { id: "2", year: 2025, laborHours: 100, recordedAt: "2026-01-10T00:00:00.000Z" },
      { id: "3", year: 2025, laborHours: 98, recordedAt: "2026-02-10T00:00:00.000Z" },
    ];
    expect(latestHmsActual(list)?.id).toBe("3");
    expect(latestHmsActual(undefined)).toBeUndefined();
    expect(sortHmsActuals(list).map((a) => a.id)).toEqual(["3", "2", "1"]);
  });
});

describe("hms-ui: Anzeige-Rundung der Leistungstabelle", () => {
  it("Zeilen + Anfahrten ergeben exakt die Summenzeile (255,58 €, nicht 255,59 €)", () => {
    const r = calcHms(HMS_REF, R);
    const shown = hmsDisplayAmounts(r);
    const cents = (v: number) => Math.round(v * 100);
    const rowCents = [...shown.monthlyById.values()].reduce((s, v) => s + cents(v), 0) + cents(shown.travelMonthly);
    expect(rowCents).toBe(cents(shown.revenueMonthly));
    expect(shown.revenueMonthly).toBe(255.58);
    const tenths = (v: number) => Math.round(v * 10);
    const rowTenths = [...shown.hoursById.values()].reduce((s, v) => s + tenths(v), 0) + tenths(shown.travelHoursAnnual);
    expect(rowTenths).toBe(tenths(shown.laborHoursAnnual));
    // Jede Zeile weicht höchstens 1 Cent vom exakten Wert ab.
    for (const t of r.tasks) expect(Math.abs(shown.monthlyById.get(t.id)! - taskMonthly(t))).toBeLessThanOrEqual(0.01 + 1e-9);
  });
});
