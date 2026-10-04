import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { Project } from "@/store/use-store";
import { InfoSheet } from "./InfoSheet";
import { ModuleEditorSheet } from "./WinterdienstTab";
import { rateChangePreview, type RateChangePreview } from "./workspace-tabs";

// Sheet inline rendern; „Abbrechen“ über den geschützten Schließen-Weg markieren.
vi.mock("@/components/ui/responsive-sheet", () => ({
  ResponsiveSheet: ({ open, footer, children }: { open: boolean; footer?: React.ReactNode; children?: React.ReactNode }) =>
    open ? (
      <div>
        {children}
        <footer>{footer}</footer>
      </div>
    ) : null,
  ResponsiveSheetCancel: ({ children = "Abbrechen" }: { children?: React.ReactNode }) => (
    <button data-guarded-close="">{children}</button>
  ),
}));
vi.mock("./workspace-tabs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./workspace-tabs")>()),
  rateChangePreview: vi.fn(),
}));

const preview = vi.mocked(rateChangePreview);

const project: Project = {
  id: "p1", name: "Objekt", customer: "Kunde GmbH", status: "active", hourlyRate: 34,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  rooms: [{ id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 100, frequency: "5x_week", typePerformance: 200 }],
};

const footerOf = (html: string) => html.slice(html.indexOf("<footer>"), html.indexOf("</footer>"));
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const cancelButtons = (html: string) => [...html.matchAll(/<button([^>]*)>\s*Abbrechen\s*<\/button>/g)].map((m) => m[1]);

beforeEach(() => preview.mockReset());

describe("InfoSheet", () => {
  const render = () =>
    renderToStaticMarkup(<InfoSheet open onOpenChange={vi.fn()} project={project} defaultRate={31.5} onSave={vi.fn()} />);

  it("cancels through the guarded close (asks „Änderungen verwerfen?“ when dirty)", () => {
    preview.mockReturnValue(null);
    const attrs = cancelButtons(render());
    expect(attrs).toHaveLength(1);
    expect(attrs[0]).toContain("data-guarded-close");
  });

  it("shows no price line while the rate is unchanged", () => {
    preview.mockReturnValue(null);
    expect(render()).not.toContain("Monatspreis netto");
    expect(preview).toHaveBeenCalledWith(project, 34, expect.objectContaining({ hourlyRate: expect.any(Number) }));
  });

  it("shows Monatspreis netto old → new (±Δ) for a changed rate", () => {
    const change: RateChangePreview = { oldPriceMonthly: 1000, newPriceMonthly: 1150.5, deltaMonthly: 150.5 };
    preview.mockReturnValue(change);
    const footer = text(footerOf(render()));
    expect(footer).toMatch(/Monatspreis netto 1\.000,00\s€ neu 1\.150,50\s€ \+150,50\s€/);
  });
});

describe("ModuleEditorSheet", () => {
  const economics = { totals: { priceMonthly: 1000 } } as unknown as ObjectEconomics;
  const render = () =>
    renderToStaticMarkup(
      <ModuleEditorSheet
        open
        onOpenChange={vi.fn()}
        title="Winterdienst bearbeiten"
        initial={{ enabled: true, value: 1 }}
        isNew={false}
        priceBefore={economics.totals.priceMonthly}
        priceAfter={() => 980}
        onSave={vi.fn()}
      >
        {() => <p>Editor</p>}
      </ModuleEditorSheet>,
    );

  it("cancels through the guarded close", () => {
    const attrs = cancelButtons(render());
    expect(attrs).toHaveLength(1);
    expect(attrs[0]).toContain("data-guarded-close");
  });

  it("keeps the Monatspreis line (shared with InfoSheet)", () => {
    expect(text(footerOf(render()))).toMatch(/Monatspreis netto 1\.000,00\s€ neu 980,00\s€ −20,00\s€/);
  });
});
