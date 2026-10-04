import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { OfferReadiness, ReadinessItem } from "@/lib/offer-readiness";
import type { Project } from "@/store/use-store";
import { PrintToolbar } from "./PrintToolbar";

// Geschlossen und für diese Tests ohne Belang.
vi.mock("@/components/upgrade-modal", () => ({ UpgradeModal: () => null }));

const project: Project = {
  id: "p1", name: "Objekt", customer: "Kunde GmbH", status: "active",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", rooms: [],
};
const economics = { totals: { priceMonthly: 1000 } } as unknown as ObjectEconomics;
const readiness = (hints: ReadinessItem[] = []): OfferReadiness => ({
  items: hints, blockers: [], criticals: [], offerGaps: [], hints, canExport: true, isOfferReady: true,
});

/** Basic-Plan (Store-Standard): „Drucken / PDF“ ist gesperrt und trägt den Pro-Chip. */
const render = (r: OfferReadiness) =>
  renderToStaticMarkup(
    <Router ssrPath="/print/p1">
      <PrintToolbar project={project} economics={economics} readiness={r} variant="customer" />
    </Router>,
  );

/* ── Kontrast aus den Tokens in index.css (hell = :root, dunkel = .dark) ── */

type Hsl = [number, number, number];
const CSS = readFileSync(fileURLToPath(new URL("../../index.css", import.meta.url)), "utf8");

function palette(selector: string): Record<string, Hsl> {
  const start = CSS.indexOf(`${selector} {`);
  const block = CSS.slice(start, CSS.indexOf("}", start));
  const out: Record<string, Hsl> = {};
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

function luminance([h, s, l]: Hsl): number {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
}

function contrast(a: Hsl, b: Hsl): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("PrintToolbar", () => {
  it("'Pro' chip: opaque token pair with ≥ 4.5:1 text contrast in both themes", () => {
    const m = /<span class="([^"]*)">Pro<\/span>/.exec(render(readiness()));
    expect(m, "Pro-Chip").not.toBeNull();
    const classes = m![1].split(/\s+/);
    const light = palette(":root");
    const themes: [string, Record<string, Hsl>][] = [["light", light], ["dark", { ...light, ...palette(".dark") }]];
    const bg = classes.find((c) => c.startsWith("bg-"))!;
    const fg = classes.find((c) => c.startsWith("text-") && c.slice(5) in light);
    expect(bg, "keine Deckkraft-Stufe auf der Chipfläche").toMatch(/^bg-[a-z-]+$/);
    expect(fg, "eigene Textfarbe").toBeDefined();
    for (const [theme, p] of themes) {
      expect(contrast(p[fg!.slice(5)], p[bg.slice(3)]), theme).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("status chip: a warning hint shows 'Prüfung offen', never 'Angebotsbereit'", () => {
    const warn = render(readiness([{ id: "p1_low_margin", level: "hint", title: "Niedrige Marge", severity: "warning" }]));
    expect(warn).toContain("Prüfung offen (1)");
    expect(warn).toContain('aria-label="Angebotsstatus: Prüfung offen, 1 offener Punkt. Details anzeigen"');
    expect(warn).not.toContain("Angebotsbereit");
    expect(render(readiness([{ id: "ruestzeit_zero", level: "hint", title: "Keine Rüstzeit", severity: "info" }])))
      .toContain('aria-label="Angebotsstatus: Angebotsbereit. Details anzeigen"');
  });
});
