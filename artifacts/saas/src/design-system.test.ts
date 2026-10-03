import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Design-System-Ratsche (§4.5).
 *
 * Zählt veraltete/verbotene Muster in `pages/**` und `components/**`
 * (ohne `components/ui/**` und `pages/print/**`). Die Zahl darf nie über die
 * BASELINE steigen – sie soll nur sinken. Dateien in STRICT müssen frei sein.
 *
 * Integrationsstand: BASELINE ist 0, und alle Verzeichnisse unter `pages/**`
 * und `components/**` sind STRICT (inkl. `pages/print/**`). Aus
 * `components/ui/**` sind nur die eigenen Design-System-Primitive STRICT; die
 * unveränderten shadcn-Dateien bleiben außen vor.
 */

const SRC = fileURLToPath(new URL(".", import.meta.url));

const PATTERNS = {
  "text-[Npx]": /text-\[\d+px\]/g,
  "border-border/NN": /border-border\/\d+/g,
  "rounded-2xl|3xl|[…]": /rounded-(2xl|3xl|\[)/g,
  "glass-card|surface-card": /\b(glass-card|surface-card)\b/g,
  "bg-black/NN": /bg-black\/\d+/g,
  "shadow-[var(--shadow-card)]": /shadow-\[var\(--shadow-card\)\]/g,
  "z-[N]": /z-\[\d+\]/g,
  fmtEuro: /\bfmtEuro\b/g,
  "active:scale": /active:scale/g,
} as const;

type PatternName = keyof typeof PATTERNS;

/** Nach der Integration aller Partitionen: überall 0. Darf nur sinken. */
const BASELINE: Record<PatternName, number> = {
  "text-[Npx]": 0,
  "border-border/NN": 0,
  "rounded-2xl|3xl|[…]": 0,
  "glass-card|surface-card": 0,
  "bg-black/NN": 0,
  "shadow-[var(--shadow-card)]": 0,
  "z-[N]": 0,
  fmtEuro: 0,
  "active:scale": 0,
};

/** Verzeichnisse (relativ zu src/), deren Dateien keinen einzigen Treffer haben dürfen. */
const STRICT_DIRS: string[] = ["pages/", "components/"];

/** Ausgenommen von STRICT_DIRS – außer den unten einzeln gelisteten Dateien. */
const STRICT_DIR_EXCLUDES: string[] = ["components/ui/"];

/** Einzelne Dateien (relativ zu src/), die keinen einzigen Treffer haben dürfen. */
const STRICT: string[] = [
  "components/layout/PageContainer.tsx",
  "components/layout/PageShell.tsx",
  "components/layout/Section.tsx",
  "components/layout/StickyActionBar.tsx",
  "components/ui/icon-button.tsx",
  "components/ui/number-input.tsx",
  "components/ui/status-badge.tsx",
  "components/ui/callout.tsx",
  "components/ui/module-badge.tsx",
  "components/ui/money.tsx",
  "components/ui/kpi.tsx",
  "components/ui/price-range-bar.tsx",
  "components/ui/data-table.tsx",
  "components/ui/list-row.tsx",
  "components/ui/responsive-sheet.tsx",
  "components/ui/state-view.tsx",
  "components/ui/info-hint.tsx",
];

function toPosix(p: string) {
  return p.split(sep).join("/");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function isRatchetFile(rel: string) {
  if (rel.startsWith("components/ui/") || rel.startsWith("pages/print/")) return false;
  if (/\.test\.(ts|tsx)$/.test(rel)) return false;
  return rel.startsWith("pages/") || rel.startsWith("components/");
}

function count(text: string, re: RegExp) {
  return text.match(new RegExp(re.source, "g"))?.length ?? 0;
}

function scan(files: string[]) {
  const totals = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0])) as Record<PatternName, number>;
  const hits: Record<string, string[]> = {};
  for (const rel of files) {
    const text = readFileSync(join(SRC, rel), "utf8");
    for (const [name, re] of Object.entries(PATTERNS) as [PatternName, RegExp][]) {
      const n = count(text, re);
      if (n > 0) {
        totals[name] += n;
        (hits[name] ??= []).push(`${rel} (${n})`);
      }
    }
  }
  return { totals, hits };
}

describe("design-system ratchet", () => {
  const files = [...walk(join(SRC, "pages")), ...walk(join(SRC, "components"))]
    .map((f) => toPosix(relative(SRC, f)))
    .filter(isRatchetFile)
    .sort();

  it("finds the source files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  const { totals, hits } = scan(files);

  for (const name of Object.keys(PATTERNS) as PatternName[]) {
    it(`does not exceed the baseline for ${name}`, () => {
      const detail = (hits[name] ?? []).join("\n");
      expect(totals[name], `Treffer für ${name}:\n${detail}`).toBeLessThanOrEqual(BASELINE[name]);
    });
  }

  it("keeps STRICT files completely clean", () => {
    const existing = STRICT.filter((rel) => existsSync(join(SRC, rel)));
    expect(existing.length).toBe(STRICT.length);
    const { totals: strictTotals, hits: strictHits } = scan(existing);
    const offenders = Object.entries(strictHits).flatMap(([name, list]) => list.map((l) => `${name}: ${l}`));
    expect(Object.values(strictTotals).reduce((a, b) => a + b, 0), offenders.join("\n")).toBe(0);
  });

  it("keeps every file in the STRICT directories completely clean", () => {
    const dirFiles = [...walk(join(SRC, "pages")), ...walk(join(SRC, "components"))]
      .map((f) => toPosix(relative(SRC, f)))
      .filter((rel) => !/\.test\.(ts|tsx)$/.test(rel))
      .filter((rel) => STRICT_DIRS.some((d) => rel.startsWith(d)))
      .filter((rel) => !STRICT_DIR_EXCLUDES.some((d) => rel.startsWith(d)));
    expect(dirFiles.length).toBeGreaterThanOrEqual(files.length);
    const { totals: strictTotals, hits: strictHits } = scan(dirFiles);
    const offenders = Object.entries(strictHits).flatMap(([name, list]) => list.map((l) => `${name}: ${l}`));
    expect(Object.values(strictTotals).reduce((a, b) => a + b, 0), offenders.join("\n")).toBe(0);
  });
});

/**
 * Layout-Guardrail: `sr-only` auf einer `<table>` greift nicht (Tabellen
 * ignorieren `width:1px; overflow:hidden`) und verbreitert auf Phones die
 * ganze Seite. Stattdessen `<div className="sr-only"><table>…</table></div>`.
 */
describe("layout guardrails", () => {
  const files = [...walk(join(SRC, "pages")), ...walk(join(SRC, "components"))]
    .map((f) => toPosix(relative(SRC, f)))
    .filter((rel) => rel.endsWith(".tsx") && !/\.test\.tsx$/.test(rel));

  it("never puts sr-only on a <table>", () => {
    const offenders = files.filter((rel) => /<table\b[^>]*\bsr-only\b/.test(readFileSync(join(SRC, rel), "utf8")));
    expect(offenders).toEqual([]);
  });
});
