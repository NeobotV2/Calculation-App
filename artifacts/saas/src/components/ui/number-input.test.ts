import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readNumberInput } from "./number-input";

const src = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("NumberInput — Punkt als Tausender oder Dezimaltrennzeichen", () => {
  it("amounts and areas (decimals < 3) read „1.200“ as 1200", () => {
    expect(readNumberInput("1.200", { decimals: 2 })).toBe(1200);
    expect(readNumberInput("1.25", { decimals: 2 })).toBe(1.25);
  });

  it("lengths (thousandsDot false) read „4.375“ and „1.250“ as decimals", () => {
    expect(readNumberInput("4.375", { decimals: 2, thousandsDot: false })).toBe(4.375);
    expect(readNumberInput("1.250", { decimals: 2, thousandsDot: false })).toBe(1.25);
    expect(readNumberInput("12,5", { decimals: 2, thousandsDot: false })).toBe(12.5);
    // Typing „1.25“ → „1.250“ keeps the value instead of jumping to 1250.
    expect(readNumberInput("1.25", { decimals: 2, thousandsDot: false })).toBe(readNumberInput("1.250", { decimals: 2, thousandsDot: false }));
  });

  it("without decimals (room editor length) a single dot is the decimal separator", () => {
    expect(readNumberInput("4.375")).toBe(4.375);
  });

  it("Winterdienst Länge × Breite and HMS lfm quantities are read as lengths", () => {
    const area = src("../calc/winterdienst/AreaSheet.tsx");
    expect(area).toMatch(/applyHelper\(v, width\)\} decimals=\{2\} thousandsDot=\{false\}/);
    expect(area).toMatch(/applyHelper\(length, v\)\} decimals=\{2\} thousandsDot=\{false\}/);
    expect(src("../calc/hms/TaskSheet.tsx")).toContain('thousandsDot={draft.unit !== "lfm"}');
  });
});
