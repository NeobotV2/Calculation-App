import { describe, it, expect } from "vitest";
import { offerStatusChip } from "@/components/offer/offer-meta";
import type { OfferReadiness, ReadinessItem } from "@/lib/offer-readiness";
import type { Project } from "@/store/use-store";
import { readinessSummary } from "./StepPruefen";

const item = (id: string, level: ReadinessItem["level"], severity?: ReadinessItem["severity"]): ReadinessItem =>
  ({ id, level, title: id, severity });
const r = (b: number, c: number, o: number, hints: ReadinessItem["severity"][] = []): OfferReadiness => {
  const blockers = Array.from({ length: b }, (_, i) => item(`b${i}`, "blocker"));
  const criticals = Array.from({ length: c }, (_, i) => item(`c${i}`, "critical"));
  const offerGaps = Array.from({ length: o }, (_, i) => item(`o${i}`, "offer"));
  const hintItems = hints.map((sev, i) => item(`h${i}`, "hint", sev));
  return {
    items: [...blockers, ...criticals, ...offerGaps, ...hintItems],
    blockers, criticals, offerGaps, hints: hintItems,
    canExport: b === 0,
    isOfferReady: b === 0 && c === 0 && o === 0,
  };
};
const project: Project = {
  id: "p1", name: "Objekt", status: "active",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", rooms: [],
};

describe("readinessSummary (Prüfliste)", () => {
  it("names only the blockers while the object is incomplete", () => {
    expect(readinessSummary(r(2, 1, 1, ["warning"]))).toEqual({ label: "Unvollständig (2)", tone: "critical" });
  });

  it("counts the open points like the print status chip", () => {
    for (const ready of [r(0, 1, 0), r(0, 0, 2, ["info"]), r(0, 1, 1, ["warning", "critical", "info"]), r(0, 0, 0, ["warning"])]) {
      expect(readinessSummary(ready)).toEqual({ label: offerStatusChip(project, ready).label, tone: "warning" });
    }
    expect(readinessSummary(r(0, 0, 0, ["info"]))).toEqual({ label: "Angebotsbereit", tone: "success" });
  });
});
