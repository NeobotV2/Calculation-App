import { describe, it, expect } from "vitest";
import { ALL_MONTHS, formatSeason, monthShort, nn, normalizeMonths, pos, rateOf, share } from "./util";

describe("number helpers", () => {
  it("nn keeps finite non-negative numbers and falls back otherwise", () => {
    expect(nn(3)).toBe(3);
    expect(nn(0)).toBe(0);
    expect(nn(-1)).toBe(0);
    expect(nn(Number.NaN)).toBe(0);
    expect(nn(Infinity)).toBe(0);
    expect(nn("5")).toBe(0);
    expect(nn(undefined, 7)).toBe(7);
  });

  it("pos treats 0 and invalid values as unset", () => {
    expect(pos(2.5)).toBe(2.5);
    expect(pos(0)).toBe(0);
    expect(pos(-3)).toBe(0);
    expect(pos(undefined)).toBe(0);
  });

  it("share caps at 1, rateOf does not", () => {
    expect(share(50)).toBeCloseTo(0.5, 9);
    expect(share(250)).toBe(1);
    expect(share(-10)).toBe(0);
    expect(rateOf(25)).toBeCloseTo(0.25, 9);
    expect(rateOf(250)).toBeCloseTo(2.5, 9);
  });
});

describe("normalizeMonths", () => {
  it("keeps integer months 1–12, unique and sorted", () => {
    expect(normalizeMonths([12, 1, 1, 11, 13, 0, 2.5, "3"])).toEqual([1, 11, 12]);
    expect(normalizeMonths(undefined)).toEqual([]);
    expect(ALL_MONTHS).toHaveLength(12);
  });
});

describe("monthShort", () => {
  it("returns German short month names", () => {
    expect(monthShort(1)).toBe("Jan");
    expect(monthShort(3)).toBe("Mär");
    expect(monthShort(12)).toBe("Dez");
  });
});

describe("formatSeason (T17)", () => {
  it("formats wrapping ranges, single months, lists and edge cases", () => {
    expect(formatSeason([1, 2, 3, 11, 12])).toBe("Nov–Mär");
    expect(formatSeason([4, 5, 6, 7, 8, 9, 10])).toBe("Apr–Okt");
    expect(formatSeason([6, 9])).toBe("Jun, Sep");
    expect(formatSeason([11])).toBe("Nov");
    expect(formatSeason([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("ganzjährig");
    expect(formatSeason([])).toBe("–");
  });

  it("ignores invalid and duplicate months", () => {
    expect(formatSeason([12, 11, 11, 13, 1])).toBe("Nov–Jan");
  });
});
