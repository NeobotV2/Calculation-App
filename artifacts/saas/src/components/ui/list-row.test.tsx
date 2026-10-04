import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { ListRow } from "./list-row";

const render = (node: React.ReactNode) => renderToStaticMarkup(<Router ssrPath="/">{node}</Router>);

/** Attribute des ersten Elements mit diesem Tag. */
function attrsOf(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}\\b([^>]*)>`));
  if (!m) throw new Error(`<${tag}> nicht gefunden`);
  return m[1];
}

describe("ListRow aria-expanded / aria-controls", () => {
  it("sets them on the row button, not on the container", () => {
    const html = render(
      <ListRow as="li" title="Büro" onClick={() => {}} aria-expanded aria-controls="details-1" />,
    );
    expect(attrsOf(html, "button")).toContain('aria-expanded="true"');
    expect(attrsOf(html, "button")).toContain('aria-controls="details-1"');
    expect(attrsOf(html, "li")).not.toContain("aria-expanded");
    expect(attrsOf(html, "li")).not.toContain("aria-controls");
  });

  it("reports a collapsed row as aria-expanded=false", () => {
    const html = render(<ListRow title="Büro" onClick={() => {}} aria-expanded={false} />);
    expect(attrsOf(html, "button")).toContain('aria-expanded="false"');
    expect(attrsOf(html, "button")).not.toContain("aria-controls");
  });

  it("applies them to the row link as well", () => {
    const html = render(<ListRow title="Objekt" href="/objekte/p1" aria-expanded={false} />);
    expect(attrsOf(html, "a")).toContain('aria-expanded="false"');
  });

  it("omits them when not set or when the row is not interactive", () => {
    expect(render(<ListRow title="Büro" onClick={() => {}} />)).not.toContain("aria-expanded");
    expect(render(<ListRow title="Büro" aria-expanded={false} />)).not.toContain("aria-expanded");
  });
});
