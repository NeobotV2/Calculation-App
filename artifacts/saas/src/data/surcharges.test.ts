import { describe, it, expect } from "vitest";
import { calcAdjustedPerformance, getTotalModifier, getSurchargeLabel } from "./surcharges";
import { getSurchargeEffectLabel, SURCHARGE_DEFINITIONS } from "./surcharges";

describe("calcAdjustedPerformance", () => {
  it("returns the base performance when no surcharges are given", () => {
    expect(calcAdjustedPerformance(200)).toBe(200);
    expect(calcAdjustedPerformance(200, {})).toBe(200);
  });

  it("applies a single positive modifier", () => {
    expect(calcAdjustedPerformance(200, { soilingLevel: "soiling_light" })).toBeCloseTo(240, 6);
  });

  it("combines modifiers across categories additively", () => {
    // soiling_heavy (-0.25) + floor_carpet (-0.15) = -0.40 => 200 * 0.6
    const v = calcAdjustedPerformance(200, { soilingLevel: "soiling_heavy", floorType: "floor_carpet" });
    expect(v).toBeCloseTo(120, 6);
  });

  it("never drops below 1 m²/h", () => {
    // base 1, very heavy soiling (-0.4) would be 0.6 -> clamped to 1
    expect(calcAdjustedPerformance(1, { soilingLevel: "soiling_very_heavy" })).toBe(1);
  });

  it("ignores unknown option ids", () => {
    expect(calcAdjustedPerformance(200, { soilingLevel: "does_not_exist" })).toBe(200);
  });
});

describe("getTotalModifier", () => {
  it("returns 0 without surcharges", () => {
    expect(getTotalModifier()).toBe(0);
  });
  it("sums modifiers of all selected categories", () => {
    expect(getTotalModifier({ soilingLevel: "soiling_light", floorType: "floor_carpet" })).toBeCloseTo(0.05, 6);
  });
});

describe("getSurchargeLabel", () => {
  it("resolves a human label for a known option", () => {
    expect(getSurchargeLabel("soilingLevel", "soiling_heavy")).toBe("Stark");
  });
  it("returns an empty string for an unknown option", () => {
    expect(getSurchargeLabel("soilingLevel", "nope")).toBe("");
  });
});

describe("getSurchargeEffectLabel", () => {
  it("labels a neutral modifier as Standard", () => {
    expect(getSurchargeEffectLabel(0)).toBe("Standard");
    expect(getSurchargeEffectLabel(Number.NaN)).toBe("Standard");
  });
  it("converts a performance reduction into the time effect 1/(1+m) − 1", () => {
    // Stark: −0,25 ⇒ 1/0,75 − 1 = +33,3 %
    expect(getSurchargeEffectLabel(-0.25)).toBe("Aufwand +33 %");
    // Sehr stark: −0,4 ⇒ 1/0,6 − 1 = +66,7 %
    expect(getSurchargeEffectLabel(-0.4)).toBe("Aufwand +67 %");
    // Teppichboden: −0,15 ⇒ +17,6 %
    expect(getSurchargeEffectLabel(-0.15)).toBe("Aufwand +18 %");
  });
  it("uses a typographic minus for less effort", () => {
    // Leicht: +0,2 ⇒ 1/1,2 − 1 = −16,7 %
    expect(getSurchargeEffectLabel(0.2)).toBe("Aufwand −17 %");
    expect(getSurchargeEffectLabel(0.15)).toBe("Aufwand −13 %");
  });
  it("rounds tiny effects to Standard and guards impossible modifiers", () => {
    expect(getSurchargeEffectLabel(0.001)).toBe("Standard");
    expect(getSurchargeEffectLabel(-1)).toBe("Aufwand sehr hoch");
  });
  it("produces a label for every defined option", () => {
    for (const def of SURCHARGE_DEFINITIONS) {
      for (const o of def.options) {
        const label = getSurchargeEffectLabel(o.modifier);
        expect(o.modifier === 0 ? label === "Standard" : label.startsWith("Aufwand ")).toBe(true);
      }
    }
  });
});
