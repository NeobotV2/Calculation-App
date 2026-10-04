import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { PageHeader } from "./page-header";

const backTag = (html: string) => html.match(/<a\b[^>]*Zurück zu Mehr[^>]*>/)?.[0] ?? "";

describe("PageHeader back link", () => {
  it("hides a phone-only back link (hub „Mehr“) from md up", () => {
    const html = renderToStaticMarkup(
      <Router ssrPath="/vorlagen">
        <PageHeader title="Vorlagen" back={{ href: "/mehr", label: "Mehr", phoneOnly: true }} />
      </Router>,
    );
    expect(backTag(html)).toContain("md:hidden");
  });

  it("keeps a regular back link visible on every width", () => {
    const html = renderToStaticMarkup(
      <Router ssrPath="/vorlagen">
        <PageHeader title="Vorlagen" back={{ href: "/mehr", label: "Mehr" }} />
      </Router>,
    );
    expect(backTag(html)).not.toBe("");
    expect(backTag(html)).not.toContain("md:hidden");
  });
});
