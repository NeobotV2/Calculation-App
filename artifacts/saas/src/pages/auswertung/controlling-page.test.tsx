import { describe, it, expect, vi, beforeAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

// Der Store persistiert über Capacitor/localStorage — im Node-Test durch einen In-Memory-Speicher ersetzt.
vi.mock("@/lib/capacitor-storage", () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => {
        mem.set(name, value);
      },
      removeItem: (name: string) => {
        mem.delete(name);
      },
    },
  };
});

// Serverseitig liest zustand nur den Anfangszustand — die Seite soll hier den gesetzten Zustand sehen.
vi.mock("@/store/use-store", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/store/use-store")>();
  const useStore = Object.assign(
    <T,>(selector: (s: ReturnType<typeof mod.useStore.getState>) => T) => selector(mod.useStore.getState()),
    mod.useStore,
  );
  return { ...mod, useStore };
});

// Daten gelten als geladen (kein Skeleton).
vi.mock("@/hooks/use-sync-status", () => ({
  useSyncStatus: () => ({ status: "idle", error: null, lastSyncedAt: null, hasLoadedOnce: true, reload: () => {} }),
  useInitialLoading: () => false,
}));

import type { WinterdienstConfig } from "@/lib/service-modules/types";
import { DEMO_PROJECTS, useStore, type Project } from "@/store/use-store";
import AuswertungGlobal from "./index";

const WD_REF: WinterdienstConfig = {
  schemaVersion: 1, enabled: true, region: "mittelgebirge", seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45, clearingSharePct: 50,
  areas: [{ id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" }],
  material: "salz", materialMarkupPct: 20, saltRestricted: false,
  travelMinutesPerEinsatz: 15, documentationMinutesPerEinsatz: 5, seasonSetupHours: 2,
  standbyFeeMonthly: 50, standbyCostMonthly: 25,
  offHoursSharePct: 50, offHoursSurchargePct: 25,
  liabilitySurchargePct: 10, riskProvisionPct: 100,
  machineRatePerHour: 45, machineCostPerHour: 35,
  billingMode: "pauschale_12", clearingWindowHours: 3,
};

const winterOnly: Project = {
  id: "wd-only", name: "Nur Winterdienst", customer: "Kunde", status: "active",
  createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", rooms: [],
  winterdienst: WD_REF,
  serviceActuals: { winterdienst: [{ id: "s1", season: "2025/26", einsaetze: 45, recordedAt: "2026-04-01T00:00:00.000Z" }] },
};

const render = () =>
  renderToStaticMarkup(
    <Router ssrPath="/auswertung">
      <AuswertungGlobal />
    </Router>,
  );

beforeAll(() => {
  useStore.setState({
    projects: [...DEMO_PROJECTS.map((p) => JSON.parse(JSON.stringify(p)) as Project), winterOnly],
    nachkalkulationen: {},
  });
});

describe("Controlling page", () => {
  it("has a heading outline without skipped levels (h1 → h2 → h3)", () => {
    const levels = Array.from(render().matchAll(/<h([1-6])[\s>]/g), (m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    expect(levels).toContain(3);
  });

  it("shows the Winterdienst Nachkalkulation of a module-only object instead of „Keine Nachkalkulation“", () => {
    const html = render();
    const table = html.slice(html.indexOf("Portfolio: Wirtschaftlichkeit je Objekt"));
    const rows = table.split("</tr>");
    const row = rows.find((r) => r.includes("Nur Winterdienst"));
    expect(row).toBeDefined();
    expect(row).toContain("Im Plan");
    expect(row).not.toContain("Keine Nachkalkulation");
    // Gegenprobe: Objekte ohne Ist-Werte bleiben „–“.
    expect(rows.find((r) => r.includes(DEMO_PROJECTS[0].name))).toContain("Keine Nachkalkulation");
  });
});
