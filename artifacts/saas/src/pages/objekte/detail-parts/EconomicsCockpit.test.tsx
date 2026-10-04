import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { formatMoney } from "@/components/ui/money";
import { displayModuleAmounts, displayOfferGroups, sumDisplay } from "@/lib/display-rounding";
import { getDefaultConfig } from "@/lib/hourly-rate-calc";
import { computeObjectEconomics, type EconomicsSettings } from "@/lib/object-economics";
import { buildOfferPositions } from "@/lib/offer-positions";
import type { HmsConfig } from "@/lib/service-modules/types";
import type { Project } from "@/store/use-store";
import { EconomicsCockpit } from "./EconomicsCockpit";

const SETTINGS: EconomicsSettings = { hourlyRate: 22.5, hourlyRateConfig: getDefaultConfig(), targetMargin: 10, disabledWarnings: [] };

const HMS: HmsConfig = {
  schemaVersion: 1, enabled: true, travelMinutesPerVisitDay: 0, materialMarkupPct: 0, contingentOverageBilled: false,
  tasks: [1, 3, 7, 9].map((m, i) => ({
    id: `t${i}`, label: `Aufgabe ${i + 1}`, unit: "pauschal" as const, quantity: 1, minutesPerUnit: m, frequencyPerYear: 52, enabled: true,
  })),
};

const project: Project = {
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  ruestzeit: 13, wegezeit: 7,
  rooms: [10.1, 10.5, 10.9, 11.3, 11.7, 12.1, 12.5, 12.9].map((area, i) => ({
    id: `r${i}`, name: `Raum ${i + 1}`, typeId: "t", typeName: "Büro", groupId: "g", groupName: "Büro", area, frequency: "monthly" as const, typePerformance: 100,
  })),
  hms: HMS,
};

const render = (p: Project) => {
  const econ = computeObjectEconomics(p, SETTINGS);
  const shown = displayModuleAmounts(displayOfferGroups(buildOfferPositions(p, econ.totals, econ.effectiveRate), econ.totals.priceMonthly));
  const html = renderToStaticMarkup(
    <Router ssrPath="/objekte/p1">
      <EconomicsCockpit project={p} economics={econ} />
    </Router>,
  );
  const table = html.slice(html.indexOf("Preis und Marge je Leistung"), html.indexOf("</table>"));
  return { econ, shown, text: table.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
};
const money = (v: number) => formatMoney(v).replace(/\s+/g, " ");

describe("EconomicsCockpit · je Leistung", () => {
  it("shows the same cent amounts as the module cards (display rounding)", () => {
    const { shown, text } = render(project);
    expect(text).toContain(money(shown.rooms));
    expect(text).toContain(money(shown.setup));
    expect(text).toContain(money(shown.hms));
    // Reinigung + Rüst-/Wegezeit = Karte „Unterhaltsreinigung“.
    expect(sumDisplay([shown.rooms, shown.setup])).toBe(shown.unterhalt);
  });

  it("long service names can break (soft hyphens) so the table fits the 20rem rail", () => {
    const { text } = render(project);
    expect(text).toContain("Hausmeister\u00ADservice");
  });

  it("uses the display amount where a leftover cent moves a component (not the raw value)", () => {
    // Erstes Objekt, bei dem Räume oder Rüst-/Wegezeit nicht ihr eigener gerundeter Betrag sind.
    const raw = (r: ReturnType<typeof render>, key: "reinigung" | "ruest_wege") =>
      r.econ.totals.components.find((c) => c.key === key)!.priceMonthly;
    let found: { r: ReturnType<typeof render>; key: "reinigung" | "ruest_wege"; shown: number } | null = null;
    for (let i = 0; i < 400 && !found; i++) {
      const p: Project = { ...project, hms: undefined, rooms: [{ ...project.rooms[0], area: 10 + i * 0.37, frequency: "3x_week" }], ruestzeit: 11, hourlyRate: 23.37 };
      const r = render(p);
      if (money(raw(r, "reinigung")) !== money(r.shown.rooms)) found = { r, key: "reinigung", shown: r.shown.rooms };
      else if (money(raw(r, "ruest_wege")) !== money(r.shown.setup)) found = { r, key: "ruest_wege", shown: r.shown.setup };
    }
    expect(found).not.toBeNull();
    const { r, key, shown } = found!;
    expect(r.text).toContain(money(shown));
    expect(r.text).not.toContain(money(raw(r, key)));
  });
});
