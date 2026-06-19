import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatNumber, formatEuro, formatDate } from "./utils";

describe("cn", () => {
  it("merges class names and dedupes conflicting tailwind utilities", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("formatNumber / formatEuro", () => {
  it("formats with German grouping and decimal comma", () => {
    expect(formatNumber(1234.5, 2)).toBe("1.234,50");
    expect(formatNumber(1000, 0)).toBe("1.000");
  });

  it("formatEuro always uses two decimals", () => {
    expect(formatEuro(22.5)).toBe("22,50");
    expect(formatEuro(0)).toBe("0,00");
  });
});

describe("formatCurrency", () => {
  it("includes the German-formatted amount and the euro sign", () => {
    const s = formatCurrency(1234.5);
    expect(s).toContain("1.234,50");
    expect(s).toContain("€");
  });
});

describe("formatDate", () => {
  it("renders a dd.mm.yyyy German date", () => {
    const s = formatDate("2026-06-19T12:00:00.000Z");
    expect(s).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(s).toContain("2026");
  });
});
