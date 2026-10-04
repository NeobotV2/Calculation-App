import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  formatOfferEuro,
  formatOfferQuantity,
  hmsOverageText,
  installmentSchedule,
  offerDates,
  offerNumber,
  offerStatusChip,
  openItemsText,
  openOfferItemCount,
  PAPER_TOKENS,
  round2,
  seriousHintCount,
  seasonText,
  verkehrssicherungText,
  winterBillingText,
  winterCapText,
  winterSeasonLine,
  winterTotalsLine,
} from "./offer-meta";
import { calcObjectTotals, calcOfferPresentation } from "@/lib/object-totals";
import { buildOfferPositions, sumOfferPositions } from "@/lib/offer-positions";
import { calcProjectTotals } from "@/lib/calc";
import { getObjectStatus, type OfferReadiness, type ReadinessItem } from "@/lib/offer-readiness";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "@/lib/service-modules/types";
import type { Project, Room } from "@/store/use-store";

/* Fixtures wie im Domain-Contract §14 (Satz 30 €/h, Vollkosten 24 €/h). */
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

/** Geschützte Leerzeichen (vor „€“) für Textvergleiche normalisieren. */
const plain = (s: string | null) => (s === null ? null : s.replace(/ /g, " "));

const offerFor = (wd: Partial<WinterdienstConfig> | null, hms: HmsConfig | null = null) => {
  const p = makeProject({
    ruestzeit: 15,
    winterdienst: wd ? { ...WD_REF, ...wd } : undefined,
    hms: hms ?? undefined,
  });
  const totals = calcObjectTotals(p, R);
  return { p, totals, op: calcOfferPresentation(totals, p) };
};

describe("round2 / formatOfferEuro", () => {
  it("rounds half away from zero and absorbs binary noise", () => {
    expect(round2(308.258958)).toBe(308.26);
    expect(round2(739.8215)).toBe(739.82);
    expect(round2(2569.405)).toBe(2569.41);
    expect(round2(30 * 75.3135 + 310)).toBe(2569.41);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(Number.NaN)).toBe(0);
  });

  it("formats euros with a protected space", () => {
    expect(formatOfferEuro(3699.1075)).toBe("3.699,11 €");
    expect(plain(formatOfferEuro(62))).toBe("62,00 €");
  });
});

describe("offerNumber", () => {
  it("is A-{YYYY of createdAt}-{first 6 id chars, uppercase}", () => {
    expect(offerNumber({ id: "3f2a9c1e-77aa-4bb0-9d1e-000000000000", createdAt: "2026-05-14T10:00:00.000Z" }))
      .toBe("A-2026-3F2A9C");
    expect(offerNumber({ id: "demo-1", createdAt: "2025-11-02T08:00:00.000Z" })).toBe("A-2025-DEMO-1");
  });

  it("falls back to the current year for an invalid createdAt", () => {
    expect(offerNumber({ id: "abc", createdAt: "" }, new Date(2027, 2, 1))).toBe("A-2027-ABC");
  });
});

describe("offerDates", () => {
  it("adds 30 calendar days", () => {
    const d = offerDates(new Date(2026, 9, 3, 15, 30));
    expect(d.date).toBe("03.10.2026");
    expect(d.validUntil).toBe("02.11.2026");
  });

  it("crosses the year boundary", () => {
    expect(offerDates(new Date(2026, 11, 15)).validUntil).toBe("14.01.2027");
  });
});

describe("installmentSchedule", () => {
  it("pauschale_12: 12 × 308,26 €, last 308,25 €", () => {
    expect(installmentSchedule(3699.1075, 12)).toEqual({ total: 3699.11, count: 12, amount: 308.26, last: 308.25 });
  });

  it("pauschale_saison: 5 × 739,82 €, last 739,83 €", () => {
    expect(installmentSchedule(3699.1075, 5)).toEqual({ total: 3699.11, count: 5, amount: 739.82, last: 739.83 });
  });

  it("sums back to the rounded total", () => {
    for (const [total, n] of [[1000, 3], [99.99, 12], [5958.5125, 7], [0.05, 12]] as const) {
      const s = installmentSchedule(total, n);
      expect(round2(s.amount * (s.count - 1) + s.last)).toBe(s.total);
    }
  });

  it("treats an invalid count as a single instalment", () => {
    expect(installmentSchedule(10, 0)).toEqual({ total: 10, count: 1, amount: 10, last: 10 });
  });
});

describe("winterBillingText (WD_REF, contract §5.8)", () => {
  it("pauschale_12", () => {
    const { totals, op } = offerFor({ billingMode: "pauschale_12" });
    expect(plain(winterBillingText(op, totals.winterdienst))).toBe(
      "Winterdienst-Saisonpauschale Nov–Mär (kalkuliert 45 Einsätze): 3.699,11 € netto, " +
      "zahlbar in 12 Monatsraten à 308,26 € (letzte Rate 308,25 €).",
    );
  });

  it("pauschale_saison", () => {
    const { totals, op } = offerFor({ billingMode: "pauschale_saison" });
    expect(plain(winterBillingText(op, totals.winterdienst))).toBe(
      "Winterdienst-Saisonpauschale Nov–Mär (kalkuliert 45 Einsätze): 3.699,11 € netto, " +
      "zahlbar in 5 Raten (Nov–Mär) à 739,82 € (letzte Rate 739,83 €).",
    );
  });

  it("pro_einsatz", () => {
    const { totals, op, p } = offerFor({ billingMode: "pro_einsatz" });
    expect(plain(winterBillingText(op, totals.winterdienst, p))).toBe(
      "Bereitschafts- und Vorhaltepauschale 62,00 € je Saisonmonat (Nov–Mär) zzgl. 75,31 € je Einsatz; " +
      "bei 45 Einsätzen ca. 3.699,11 € je Saison.",
    );
  });

  it("pro_einsatz without any fixed fee", () => {
    const { totals, op } = offerFor({ billingMode: "pro_einsatz", standbyFeeMonthly: 0, seasonSetupHours: 0 });
    expect(plain(winterBillingText(op, totals.winterdienst))).toMatch(
      /^Abrechnung je Einsatz: 75,31 € netto je Einsatz; bei 45 Einsätzen ca\. .+ € je Saison\.$/,
    );
  });

  it("cap 30: the flat fee covers 30 Einsätze (P = 2.569,41 €) and the cap text names the overage price", () => {
    const { totals, op } = offerFor({ billingMode: "pauschale_12", capEinsaetze: 30 });
    expect(plain(winterBillingText(op, totals.winterdienst))).toBe(
      "Winterdienst-Saisonpauschale Nov–Mär für bis zu 30 Einsätze (kalkuliert 45 Einsätze): 2.569,41 € netto, " +
      "zahlbar in 12 Monatsraten à 214,12 € (letzte Rate 214,09 €).",
    );
    expect(plain(winterCapText(op))).toBe(
      "Die Pauschale umfasst bis zu 30 Einsätze; jeder weitere Einsatz wird mit 75,31 € netto berechnet.",
    );
  });

  it("cap at or above the expected Einsätze keeps the plain wording", () => {
    const { totals, op } = offerFor({ billingMode: "pauschale_saison", capEinsaetze: 50 });
    expect(plain(winterBillingText(op, totals.winterdienst))).toMatch(/^Winterdienst-Saisonpauschale Nov–Mär \(kalkuliert 45 Einsätze\): /);
  });

  it("returns null without Winterdienst and no cap text without a cap", () => {
    const { totals, op } = offerFor(null);
    expect(winterBillingText(op, totals.winterdienst)).toBeNull();
    expect(winterCapText(op)).toBeNull();
    expect(winterTotalsLine(op)).toBeNull();
  });
});

describe("winter season, Verkehrssicherung and totals lines", () => {
  it("season texts", () => {
    const { totals } = offerFor({});
    expect(winterSeasonLine(totals.winterdienst!)).toBe("Saison Nov–Mär");
    expect(seasonText([])).toBe("ganzjährig");
    expect(seasonText([6, 9])).toBe("Jun, Sep");
  });

  it("Verkehrssicherungspflicht wording", () => {
    const { totals, p } = offerFor({});
    expect(verkehrssicherungText(p.winterdienst, totals.winterdienst)).toBe(
      "Übernahme der Räum- und Streupflicht für die oben genannten Flächen während der Saison Nov–Mär " +
      "zu den in der Ortssatzung festgelegten Zeiten; Dokumentation jedes Einsatzes.",
    );
  });

  it("pauschale_saison: 5 Raten line with the last-rate correction; fixed monthly 743,16 € (rooms + HMS)", () => {
    const { totals, op } = offerFor({ billingMode: "pauschale_saison" }, HMS_REF);
    expect(plain(winterTotalsLine(op))).toBe("Winterdienst: 5 Raten à 739,82 € (Nov–Mär), letzte Rate 739,83 €");
    expect(round2(op.fixedMonthly)).toBe(743.16);
    expect(op.expectedAnnual).toBeCloseTo(12617.0075, 6);
    expect(round2(totals.priceMonthly)).toBe(1051.42);
  });

  it("pauschale_saison: totals line and billing text name the same rates (they sum to the Pauschale)", () => {
    const de = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
    for (const wd of [
      {},
      { capEinsaetze: 30 },
      { seasonMonths: [1, 2, 11, 12] },
      { seasonMonths: [1, 2, 3, 4, 10, 11, 12], expectedEinsaetze: 37 },
      { standbyFeeMonthly: 0, seasonSetupHours: 0, expectedEinsaetze: 20 },
    ] satisfies Partial<WinterdienstConfig>[]) {
      const { totals, op } = offerFor({ ...wd, billingMode: "pauschale_saison" });
      const billing = plain(winterBillingText(op, totals.winterdienst))!;
      const line = plain(winterTotalsLine(op))!;
      const b = /: ([\d.,]+) € netto, zahlbar in (\d+) Raten \([^)]+\) à ([\d.,]+) €(?: \(letzte Rate ([\d.,]+) €\))?\.$/.exec(billing);
      const t = /^Winterdienst: (\d+) Raten à ([\d.,]+) € \([^)]+\)(?:, letzte Rate ([\d.,]+) €)?$/.exec(line);
      expect(b, billing).not.toBeNull();
      expect(t, line).not.toBeNull();
      const [, total, bCount, bAmount, bLast = bAmount] = b!;
      const [, tCount, tAmount, tLast = tAmount] = t!;
      expect([tCount, tAmount, tLast], line).toEqual([bCount, bAmount, bLast]);
      expect(round2(de(tAmount) * (Number(tCount) - 1) + de(tLast)), line).toBe(de(total));
    }
  });

  it("pauschale_saison: no last-rate part when the rates divide evenly", () => {
    const { op } = offerFor({ billingMode: "pauschale_saison" });
    const even = { ...op, winterSeasonInstallment: { ...op.winterSeasonInstallment!, amount: 700 } };
    expect(plain(winterTotalsLine(even))).toBe("Winterdienst: 5 Raten à 700,00 € (Nov–Mär)");
  });

  it("pro_einsatz totals line", () => {
    const { op } = offerFor({ billingMode: "pro_einsatz" });
    expect(plain(winterTotalsLine(op))).toBe("Winterdienst: 62,00 € je Saisonmonat zzgl. 75,31 € je Einsatz");
  });

  it("pauschale_12 has no extra line: the monthly rate is part of the fixed monthly amount", () => {
    const { totals, op } = offerFor({ billingMode: "pauschale_12" }, HMS_REF);
    expect(winterTotalsLine(op)).toBeNull();
    expect(op.fixedMonthly).toBeCloseTo(totals.priceMonthly, 9);
    expect(round2(op.fixedMonthly)).toBe(1051.42);
  });
});

describe("hmsOverageText", () => {
  it("names the overage rate when overage is billed and a contingent exists", () => {
    const { op } = offerFor(null, HMS_REF);
    expect(plain(hmsOverageText(op))).toBe("Mehrstunden über das Kontingent: 30,00 €/h netto.");
  });

  it("is null when overage is not billed", () => {
    const { op } = offerFor(null, { ...HMS_REF, contingentOverageBilled: false });
    expect(hmsOverageText(op)).toBeNull();
  });
});

describe("offer document sums (pAll at rate 30)", () => {
  it("group subtotals sum to priceMonthly (1.051,42 €)", () => {
    const { p, totals } = offerFor({}, HMS_REF);
    const groups = buildOfferPositions(p, totals, R.rate);
    expect(groups.map((g) => g.module)).toEqual(["unterhalt", "winterdienst", "hms"]);
    expect(sumOfferPositions(groups)).toBeCloseTo(totals.priceMonthly, 9);
    expect(round2(sumOfferPositions(groups))).toBe(1051.42);
  });

  it("rooms only: Monatlich netto = calcProjectTotals().cost, rows sum to it", () => {
    const p = makeProject({ ruestzeit: 15, wegezeit: 10, rooms: [makeRoom(), makeRoom({ id: "r2", area: 40, frequency: "2x_week" })] });
    const totals = calcObjectTotals(p, R);
    const op = calcOfferPresentation(totals, p);
    expect(op.fixedMonthly).toBe(calcProjectTotals(p, R.rate).cost);
    const groups = buildOfferPositions(p, totals, R.rate);
    const kinds = groups[0].positions.map((x) => x.kind);
    expect(kinds).toEqual(["room", "room", "ruestzeit", "wegezeit"]);
    expect(groups[0].subtotalMonthly).toBeCloseTo(op.fixedMonthly, 9);
    expect(op.expectedAnnual).toBe(calcProjectTotals(p, R.rate).annualCost);
  });
});

describe("offer status chip (print toolbar)", () => {
  const item = (id: string, level: ReadinessItem["level"], severity?: ReadinessItem["severity"]): ReadinessItem =>
    ({ id, level, title: id, severity });
  const r = (b: number, c: number, o: number, hints: ReadinessItem["severity"][] = []): OfferReadiness => {
    const blockers = Array.from({ length: b }, (_, i) => item(`b${i}`, "blocker"));
    const criticals = Array.from({ length: c }, (_, i) => item(`c${i}`, "critical"));
    const offerGaps = Array.from({ length: o }, (_, i) => item(`o${i}`, "offer"));
    const hintItems = hints.map((sev, i) => item(`h${i}`, "hint", sev));
    return {
      items: [...blockers, ...criticals, ...offerGaps, ...hintItems],
      blockers, criticals, offerGaps, hints: hintItems,
      canExport: b === 0,
      isOfferReady: b === 0 && c === 0 && o === 0,
    };
  };
  const p = makeProject();

  it("counts blockers, criticals, offer gaps and warning hints (not info hints)", () => {
    expect(openOfferItemCount(r(1, 1, 2))).toBe(4);
    expect(openOfferItemCount(r(0, 0, 0, ["info", "warning", "critical"]))).toBe(2);
    expect(seriousHintCount(r(0, 0, 0, ["info", "info"]))).toBe(0);
    expect(openItemsText(1)).toBe("1 offener Punkt");
    expect(openItemsText(3)).toBe("3 offene Punkte");
  });

  it("uses the object status word and tone, with the number of open points", () => {
    expect(offerStatusChip(p, r(0, 0, 0))).toEqual({ label: "Angebotsbereit", spokenLabel: "Angebotsbereit", tone: "success" });
    expect(offerStatusChip(p, r(0, 0, 0, ["info"]))).toEqual({ label: "Angebotsbereit", spokenLabel: "Angebotsbereit", tone: "success" });
    expect(offerStatusChip(p, r(0, 0, 1))).toEqual({ label: "Prüfung offen (1)", spokenLabel: "Prüfung offen, 1 offener Punkt", tone: "warning" });
    expect(offerStatusChip(p, r(0, 1, 0, ["warning"]))).toEqual({ label: "Prüfung offen (2)", spokenLabel: "Prüfung offen, 2 offene Punkte", tone: "warning" });
    expect(offerStatusChip(p, r(1, 1, 0))).toEqual({ label: "Entwurf (2)", spokenLabel: "Entwurf, 2 offene Punkte", tone: "neutral" });
    expect(offerStatusChip(makeProject({ status: "archived" }), r(0, 0, 1))).toEqual({ label: "Archiviert", spokenLabel: "Archiviert", tone: "neutral" });
  });

  it("only a warning hint: 'Prüfung offen', never 'Angebotsbereit'", () => {
    const warnOnly = r(0, 0, 0, ["warning"]);
    expect(warnOnly.isOfferReady).toBe(true);
    expect(offerStatusChip(p, warnOnly)).toEqual({ label: "Prüfung offen (1)", spokenLabel: "Prüfung offen, 1 offener Punkt", tone: "warning" });
  });

  it("agrees with getObjectStatus for every combination", () => {
    const sevs: ReadinessItem["severity"][][] = [[], ["info"], ["warning"], ["critical"], ["info", "warning"]];
    for (const proj of [p, makeProject({ status: "archived" })]) {
      for (const b of [0, 1]) for (const c of [0, 1]) for (const o of [0, 2]) for (const h of sevs) {
        const rr = r(b, c, o, h);
        const status = getObjectStatus(proj, rr);
        const chip = offerStatusChip(proj, rr);
        expect(chip.tone).toBe(status.tone);
        expect(chip.label.startsWith(status.label)).toBe(true);
        expect(chip.label === "Angebotsbereit").toBe(status.key === "angebotsbereit");
      }
    }
  });
});

describe("formatOfferQuantity", () => {
  it("formats position quantities", () => {
    expect(plain(formatOfferQuantity({ kind: "room", quantity: { value: 120, unit: "m²" } }))).toBe("120 m²");
    expect(plain(formatOfferQuantity({ kind: "room", quantity: { value: 12.5, unit: "m²" } }))).toBe("12,5 m²");
    expect(plain(formatOfferQuantity({ kind: "ruestzeit", quantity: { value: 15, unit: "Min." } }))).toBe("15 Min. je Einsatz");
    expect(plain(formatOfferQuantity({ kind: "hms_task", quantity: { value: 6, unit: "Stk." } }))).toBe("6 Stk.");
    expect(formatOfferQuantity({ kind: "hms_task", quantity: { value: 1, unit: "pauschal" } })).toBe("pauschal");
    expect(formatOfferQuantity({ kind: "hms_travel" })).toBe("");
  });
});

describe("PAPER_TOKENS", () => {
  it("match the light :root palette in index.css (paper background = card)", () => {
    const css = readFileSync(fileURLToPath(new URL("../../index.css", import.meta.url)), "utf8");
    const start = css.indexOf(":root {");
    const root = css.slice(start, css.indexOf("}", start));
    const light: Record<string, string> = {};
    for (const m of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) light[m[1]] = m[2].trim();
    for (const [name, value] of Object.entries(PAPER_TOKENS)) {
      const expected = name === "--background" ? light["--card"] : light[name];
      expect(value, name).toBe(expected);
    }
  });
});
