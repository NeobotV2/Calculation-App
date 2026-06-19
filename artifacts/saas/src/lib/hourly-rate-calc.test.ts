import { describe, it, expect } from "vitest";
import { calcHourlyRate, getDefaultConfig } from "./hourly-rate-calc";
import { BUNDESLAENDER } from "@/data/bundeslaender";

describe("calcHourlyRate (default config)", () => {
  const cfg = getDefaultConfig();
  const b = calcHourlyRate(cfg);

  it("sums the minijob SV rates correctly (13 + 15 + 2 + 1.2 = 31.2%)", () => {
    expect(b.svTotalRate).toBeCloseTo(31.2, 6);
  });

  it("has no shift surcharge by default, so the effective wage equals the base wage", () => {
    expect(b.schichtzuschlag.totalZuschlag).toBe(0);
    expect(b.schichtzuschlag.effektiverLohn).toBe(cfg.baseLohn);
  });

  it("computes hourly wage cost incl. SV (15 + 15*31.2% = 19.68)", () => {
    expect(b.lohnkostenProStunde).toBeCloseTo(19.68, 6);
  });

  it("computes annual working hours (40h * 52 weeks = 2080)", () => {
    expect(b.jahresArbeitsstunden).toBe(2080);
    expect(b.urlaubStunden).toBe(240); // 30 days * 8h
    expect(b.krankheitStunden).toBe(80); // 10 days * 8h
  });

  it("sums the default overhead rates (8+3+5+3+2 = 21%)", () => {
    expect(b.overheadTotalRate).toBeCloseTo(21, 6);
  });

  it("derives the full cost chain consistently and applies the profit margin", () => {
    const bl = BUNDESLAENDER.find((x) => x.id === cfg.ausfallzeiten.bundeslandId)!;
    const feiertageStunden = bl.feiertage2026 * 8;
    const totalAusfall = 240 + 80 + feiertageStunden + 16; // urlaub+krank+feiertag+fortbildung
    const produktiv = 2080 - totalAusfall;

    expect(b.feiertageStunden).toBe(feiertageStunden);
    expect(b.totalAusfallStunden).toBe(totalAusfall);
    expect(b.produktivStunden).toBe(produktiv);
    expect(b.ausfallzuschlag).toBeCloseTo(2080 / produktiv, 6);

    const lohnMitAusfall = 19.68 * (2080 / produktiv);
    expect(b.lohnkostenMitAusfall).toBeCloseTo(lohnMitAusfall, 6);

    const vollkosten = lohnMitAusfall * 1.21; // + 21% overhead
    expect(b.vollkosten).toBeCloseTo(vollkosten, 6);
    expect(b.stundenverrechnungssatz).toBeCloseTo(vollkosten * 1.1, 6); // + 10% margin
  });

  it("keeps the productivity quote between 0 and 1", () => {
    expect(b.produktivitaetsquote).toBeGreaterThan(0);
    expect(b.produktivitaetsquote).toBeLessThan(1);
  });
});

describe("calcHourlyRate (behaviour)", () => {
  it("uses Vollzeit SV rates when employment type is vollzeit (8.55+9.3+1.3+1.8+2.3 = 23.25%)", () => {
    const cfg = getDefaultConfig();
    cfg.employmentType = "vollzeit";
    expect(calcHourlyRate(cfg).svTotalRate).toBeCloseTo(23.25, 6);
  });

  it("adds a night shift surcharge to the effective wage", () => {
    const cfg = getDefaultConfig();
    cfg.schichtzuschlaege.nacht = { enabled: true, zuschlag: 25, anteil: 50 };
    const b = calcHourlyRate(cfg);
    // 15 * 0.25 * 0.5 = 1.875
    expect(b.schichtzuschlag.nachtBetrag).toBeCloseTo(1.875, 6);
    expect(b.schichtzuschlag.effektiverLohn).toBeCloseTo(16.875, 6);
  });

  it("guards against division by zero when downtime exceeds working hours", () => {
    const cfg = getDefaultConfig();
    cfg.ausfallzeiten.urlaubTage = 10000;
    const b = calcHourlyRate(cfg);
    expect(b.produktivStunden).toBe(1);
    expect(Number.isFinite(b.ausfallzuschlag)).toBe(true);
    expect(Number.isFinite(b.stundenverrechnungssatz)).toBe(true);
  });
});
