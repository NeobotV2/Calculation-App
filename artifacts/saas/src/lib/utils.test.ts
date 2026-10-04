import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatNumber, formatEuro, formatDate, parseDecimal, softHyphenate, withMinusSign } from "./utils";

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

  it("uses the typographic minus (U+2212) for negative values", () => {
    expect(formatNumber(-34.1, 1)).toBe("\u221234,1");
    expect(formatNumber(-0.04, 1)).toBe("0,0");
    expect(formatCurrency(-1175.45)).toContain("\u22121.175,45");
    expect(formatCurrency(-1175.45)).not.toContain("-");
    expect(withMinusSign("-0,00 €")).toBe("0,00 €");
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

describe("cn with design tokens", () => {
  it("keeps a semantic text size next to a text colour", () => {
    expect(cn("text-label", "text-muted-foreground")).toBe("text-label text-muted-foreground");
    expect(cn("text-overline", "text-foreground")).toBe("text-overline text-foreground");
  });

  it("still dedupes conflicting semantic sizes and shadows", () => {
    expect(cn("text-sm", "text-h2")).toBe("text-h2");
    expect(cn("text-h1", "text-kpi")).toBe("text-kpi");
    expect(cn("shadow-surface", "shadow-overlay")).toBe("shadow-overlay");
    expect(cn("shadow-sm", "shadow-raised")).toBe("shadow-raised");
    expect(cn("z-50", "z-overlay")).toBe("z-overlay");
  });
});

describe("parseDecimal", () => {
  it("parses German and technical notation", () => {
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("1234.5")).toBe(1234.5);
    expect(parseDecimal("1.234.567")).toBe(1234567);
    expect(parseDecimal("1,234.5")).toBe(1234.5);
    expect(parseDecimal(" 42 ")).toBe(42);
    expect(parseDecimal("0")).toBe(0);
    expect(parseDecimal(",5")).toBe(0.5);
    expect(parseDecimal("-3,25")).toBe(-3.25);
    expect(parseDecimal("\u22123,25")).toBe(-3.25);
  });

  it("reads a single dot with three digits as German thousands grouping", () => {
    expect(parseDecimal("1.200")).toBe(1200);
    expect(parseDecimal("1.850")).toBe(1850);
    expect(parseDecimal("12.500")).toBe(12500);
    expect(parseDecimal("-1.200")).toBe(-1200);
    // Keine Gruppierung möglich: Dezimalpunkt.
    expect(parseDecimal("0.125")).toBe(0.125);
    expect(parseDecimal("1234.567")).toBe(1234.567);
    expect(parseDecimal("1.25")).toBe(1.25);
    expect(parseDecimal("1.2")).toBe(1.2);
  });

  it("fields with 3+ decimals read a single dot as decimal point (laser-measured lengths)", () => {
    expect(parseDecimal("4.375", { thousandsDot: false })).toBe(4.375);
    expect(parseDecimal("1.200", { thousandsDot: false })).toBe(1.2);
    expect(parseDecimal("4,375", { thousandsDot: false })).toBe(4.375);
    // Eindeutige Gruppierung bleibt gültig.
    expect(parseDecimal("1.234,5", { thousandsDot: false })).toBe(1234.5);
    expect(parseDecimal("1.234.567", { thousandsDot: false })).toBe(1234567);
    // Standard (Beträge, Flächen): deutsche Tausender.
    expect(parseDecimal("4.375")).toBe(4375);
  });

  it("returns undefined for empty or invalid input", () => {
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("   ")).toBeUndefined();
    expect(parseDecimal("abc")).toBeUndefined();
    expect(parseDecimal("-")).toBeUndefined();
    expect(parseDecimal("1,2,3")).toBeUndefined();
    expect(parseDecimal("1.2.3,4")).toBeUndefined();
    expect(parseDecimal("12a")).toBeUndefined();
    expect(parseDecimal("1e5")).toBeUndefined();
  });
});

describe("softHyphenate", () => {
  it("adds a soft hyphen to known long compounds only", () => {
    expect(softHyphenate("Hausmeisterservice")).toBe("Hausmeister\u00ADservice");
    expect(softHyphenate("Unterhaltsreinigung")).toBe("Unterhalts\u00ADreinigung");
    expect(softHyphenate("Ø pro Monat (Jahresmittel)")).toBe("Ø pro Monat (Jahres\u00ADmittel)");
    expect(softHyphenate("Winterdienst")).toBe("Winterdienst");
    expect(softHyphenate("Hausmeisterservice").replace(/\u00AD/g, "")).toBe("Hausmeisterservice");
  });
});
