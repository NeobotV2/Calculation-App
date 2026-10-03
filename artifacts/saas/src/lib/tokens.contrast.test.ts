import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Prüft die Farb-Tokens aus `src/index.css` (`:root` = hell, `.dark` = dunkel)
 * gegen WCAG 2.x: ≥ 4,5:1 für Text, ≥ 3:1 für Eingabe-Rahmen und Fokus-Ring.
 */

const CSS = readFileSync(fileURLToPath(new URL("../index.css", import.meta.url)), "utf8");

/** Inhalte aller Blöcke mit exakt diesem Selektor (auch verschachtelt, z. B. in @media). */
function blocksFor(selector: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`(^|[\\s{};])${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(CSS))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < CSS.length && depth > 0) {
      if (CSS[i] === "{") depth++;
      else if (CSS[i] === "}") depth--;
      i++;
    }
    out.push(CSS.slice(start, i - 1));
  }
  return out;
}

type Hsl = [number, number, number];

function tokens(selector: string): Record<string, Hsl> {
  const result: Record<string, Hsl> = {};
  for (const block of blocksFor(selector)) {
    const decl = /--([a-z0-9-]+)\s*:\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g;
    let m: RegExpExecArray | null;
    while ((m = decl.exec(block))) {
      result[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
    }
  }
  return result;
}

function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function luminance(hsl: Hsl): number {
  const [r, g, b] = hslToRgb(hsl).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Hsl, b: Hsl): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [fg: string, bg: string][] = [
  // Grundtext
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "muted"],
  ["foreground", "surface-sunken"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "surface-sunken"],
  // Primärfarbe
  ["primary-foreground", "primary"],
  ["primary", "card"],
  ["primary", "background"],
  ["primary", "primary-soft"],
  // Status auf Karte, Status auf getönter Fläche, Vordergrund auf Vollfläche
  ...(["success", "warning", "info", "destructive"] as const).flatMap(
    (s): [string, string][] => [
      [s, "card"],
      [s, "background"],
      [s, `${s}-soft`],
      [`${s}-foreground`, s],
      ["foreground", `${s}-soft`],
    ],
  ),
  // Module auf getönter Fläche
  ["module-cleaning", "module-cleaning-soft"],
  ["module-winter", "module-winter-soft"],
  ["module-hms", "module-hms-soft"],
];

const UI_PAIRS: [fg: string, bg: string][] = [
  ["input", "card"],
  ["ring", "card"],
  ["input", "background"],
  ["ring", "background"],
];

const THEMES: [name: string, palette: Record<string, Hsl>][] = [
  ["light", tokens(":root")],
  ["dark", { ...tokens(":root"), ...tokens(".dark") }],
];

describe("index.css colour tokens", () => {
  it("parses the light and the dark palette", () => {
    const light = tokens(":root");
    const dark = tokens(".dark");
    for (const key of ["background", "foreground", "card", "primary", "muted-foreground", "input", "ring", "surface-sunken", "border-strong"]) {
      expect(light[key], `:root --${key}`).toBeDefined();
      expect(dark[key], `.dark --${key}`).toBeDefined();
    }
  });

  for (const [theme, palette] of THEMES) {
    describe(theme, () => {
      for (const [fg, bg] of TEXT_PAIRS) {
        it(`${fg} on ${bg} ≥ 4.5:1`, () => {
          expect(palette[fg], `--${fg} fehlt`).toBeDefined();
          expect(palette[bg], `--${bg} fehlt`).toBeDefined();
          expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
        });
      }
      for (const [fg, bg] of UI_PAIRS) {
        it(`${fg} on ${bg} ≥ 3:1`, () => {
          expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }

  it("computes known reference ratios correctly", () => {
    expect(contrast([0, 0, 0], [0, 0, 100])).toBeCloseTo(21, 5);
    expect(contrast([0, 0, 100], [0, 0, 100])).toBeCloseTo(1, 5);
  });
});
