import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { OfferReadiness, ReadinessItem } from "@/lib/offer-readiness";
import type { Project } from "@/store/use-store";
import { OfferCheckDialog } from "./OfferCheckDialog";
import { OfferPreviewDialog } from "./OfferPreviewDialog";

// Radix-Dialoge rendern serverseitig nichts (Portal) — hier inline, nur wenn offen.
vi.mock("@/components/ui/dialog", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Dialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) => (open ? <>{children}</> : null),
    DialogContent: Pass,
    DialogHeader: Pass,
    DialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
    DialogTitle: Pass,
    DialogDescription: ({ children }: { children?: React.ReactNode }) => <p data-description="">{children}</p>,
  };
});

const project: Project = {
  id: "p1", name: "Objekt", customer: "Kunde GmbH", status: "active",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  rooms: [{ id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 100, frequency: "5x_week", typePerformance: 200 }],
  ruestzeit: 15,
};
const economics = { totals: { priceMonthly: 1000 } } as unknown as ObjectEconomics;

const item = (id: string, level: ReadinessItem["level"], severity?: ReadinessItem["severity"]): ReadinessItem =>
  ({ id, level, title: `Titel ${id}`, severity });
const readiness = (o: Partial<Pick<OfferReadiness, "blockers" | "criticals" | "offerGaps" | "hints">>): OfferReadiness => {
  const r = { blockers: [], criticals: [], offerGaps: [], hints: [], ...o };
  return {
    ...r,
    items: [...r.blockers, ...r.criticals, ...r.offerGaps, ...r.hints],
    canExport: r.blockers.length === 0,
    isOfferReady: r.blockers.length === 0 && r.criticals.length === 0 && r.offerGaps.length === 0,
  };
};

const render = (node: React.ReactNode) => renderToStaticMarkup(<Router ssrPath="/objekte/p1">{node}</Router>);

/** Ist der Button mit genau diesem Text deaktiviert? (Fehlt er, schlägt der Test fehl.) */
function isDisabled(html: string, text: string): boolean {
  for (const m of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) {
    if (m[2].replace(/<[^>]+>/g, "").trim() === text) return /\sdisabled(=""|\s|$)/.test(m[1]);
  }
  throw new Error(`Button „${text}“ nicht gefunden`);
}

describe("OfferCheckDialog (gate)", () => {
  it("keeps Vorschau enabled while blockers disable Angebot öffnen", () => {
    const html = render(
      <OfferCheckDialog open onOpenChange={() => {}} project={project} economics={economics}
        readiness={readiness({ blockers: [item("name_missing", "blocker")] })} />,
    );
    expect(isDisabled(html, "Vorschau")).toBe(false);
    expect(isDisabled(html, "Angebot öffnen")).toBe(true);
  });

  it("only warning hints: status, callout and description say 'Prüfung offen', not 'Angebotsbereit'", () => {
    const html = render(
      <OfferCheckDialog open onOpenChange={() => {}} project={project} economics={economics}
        readiness={readiness({ hints: [item("p1_low_margin", "hint", "warning")] })} />,
    );
    expect(html).not.toContain("Angebotsbereit");
    expect(html).toContain("Prüfung offen");
    expect(html).toContain("Bitte prüfen Sie die Hinweise, bevor Sie das Angebot versenden.");
    expect(isDisabled(html, "Angebot öffnen")).toBe(false);
  });

  it("only info hints: Angebotsbereit", () => {
    const html = render(
      <OfferCheckDialog open onOpenChange={() => {}} project={project} economics={economics}
        readiness={readiness({ hints: [item("ruestzeit_zero", "hint", "info")] })} />,
    );
    expect(html).toContain("Angebotsbereit");
    expect(html).not.toContain("Prüfung offen");
    expect(html).toContain("Es gibt keine offenen Punkte.");
  });
});

describe("OfferPreviewDialog footer", () => {
  const footer = (onOpenOffer?: (() => void) | null) => {
    const html = render(<OfferPreviewDialog open onOpenChange={() => {}} project={project} onOpenOffer={onOpenOffer} />);
    return html.slice(html.lastIndexOf("<footer>"));
  };

  it("the document scroll area is a focusable, named region (keyboard scrolling)", () => {
    const html = render(<OfferPreviewDialog open onOpenChange={() => {}} project={project} />);
    const region = html.match(/<div[^>]*aria-label="Angebotsdokument"[^>]*>/)?.[0] ?? "";
    expect(region).toContain('role="region"');
    expect(region).toContain('tabindex="0"');
  });

  it("links to the offer when opened on its own", () => {
    const html = footer();
    expect(html).toContain('href="/print/p1"');
    expect(html).toContain("Zum Angebot");
  });

  it("from the gate: Angebot öffnen goes through the check, hidden while it is blocked", () => {
    const open = footer(() => {});
    expect(open).toContain("Angebot öffnen");
    expect(open).not.toContain("/print/p1");
    const blocked = footer(null);
    expect(blocked).not.toContain("Angebot öffnen");
    expect(blocked).not.toContain("Zum Angebot");
    expect(blocked).toContain("Schließen");
  });
});
