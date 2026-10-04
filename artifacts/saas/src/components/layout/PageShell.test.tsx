import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasVerticalOverflow, PageShell } from "./PageShell";

const asideOf = (html: string) => /<aside[^>]*>/.exec(html)?.[0] ?? "";

describe("PageShell", () => {
  it("renders no landmark by default (the app shell already provides <main>)", () => {
    const html = renderToStaticMarkup(<PageShell>Inhalt</PageShell>);
    expect(html).not.toContain("<main");
  });

  it('renders the single <main id="main-content"> for pages without the app shell', () => {
    const html = renderToStaticMarkup(<PageShell as="main">Inhalt</PageShell>);
    expect(html.match(/<main[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/<main id="main-content" tabindex="-1" class="[^"]*outline-none/);
  });

  it("names the rail and keeps it from scrolling sideways", () => {
    const aside = asideOf(renderToStaticMarkup(<PageShell rail={<p>Rechenweg</p>}>Inhalt</PageShell>));
    expect(aside).toContain('aria-label="Zusammenfassung"');
    expect(aside).toContain("lg:overflow-y-auto");
    expect(aside).toContain("lg:overflow-x-hidden");
    // Erst fokussierbar, wenn sie tatsächlich überläuft (gemessen im Browser).
    expect(aside).not.toContain("tabindex");
    expect(asideOf(renderToStaticMarkup(<PageShell rail="x" railLabel="Cockpit" />))).toContain('aria-label="Cockpit"');
  });

  it("can place the rail from xl (wide tables next to the sidebar)", () => {
    const html = renderToStaticMarkup(<PageShell rail="x" railFrom="xl" railBelowLg="hidden">Inhalt</PageShell>);
    expect(html).toContain("xl:grid-cols-[minmax(0,1fr)_20rem]");
    expect(html).not.toContain("lg:grid-cols-[minmax(0,1fr)_20rem]");
    const aside = asideOf(html);
    expect(aside).toContain("hidden xl:block");
    expect(aside).toContain("xl:sticky");
    expect(aside).not.toContain("lg:sticky");
  });

  it("detects vertical overflow with a 1 px rounding tolerance", () => {
    expect(hasVerticalOverflow({ scrollHeight: 900, clientHeight: 700 })).toBe(true);
    expect(hasVerticalOverflow({ scrollHeight: 701, clientHeight: 700 })).toBe(false);
    expect(hasVerticalOverflow({ scrollHeight: 700, clientHeight: 700 })).toBe(false);
  });
});
