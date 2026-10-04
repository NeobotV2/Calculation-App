import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@/lib/capacitor-storage", () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => { mem.set(name, value); },
      removeItem: (name: string) => { mem.delete(name); },
    },
  };
});
vi.mock("wouter", () => ({ useLocation: () => ["/kalkulation", navigate] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/analytics-service", () => ({
  trackFirstCalculationCompleted: vi.fn(),
  trackFirstObjectCreated: vi.fn(),
  trackTenderConverted: vi.fn(),
}));
// Demo-/Lokalmodus: die Aktionen schreiben direkt in den Store.
vi.mock("@/hooks/use-store-actions", async () => {
  const { useStore } = await import("@/store/use-store");
  const s = () => useStore.getState();
  const actions = {
    addProject: async (name: string, customer?: string) => s().addProject(name, customer),
    updateProject: async (...a: Parameters<ReturnType<typeof s>["updateProject"]>) => s().updateProject(...a),
    addRoom: async (...a: Parameters<ReturnType<typeof s>["addRoom"]>) => s().addRoom(...a),
    updateRoom: async (...a: Parameters<ReturnType<typeof s>["updateRoom"]>) => s().updateRoom(...a),
    deleteRoom: async (...a: Parameters<ReturnType<typeof s>["deleteRoom"]>) => s().deleteRoom(...a),
  };
  return { useStoreActions: () => actions };
});

import { useStore, type Project } from "@/store/use-store";
import { createEmptyCalcDraft, type CalcDraft } from "@/lib/drafts";
import { flowReducer, initFlowDraft, type FlowMode } from "./flow-state";
import { useFlowSave, type FlowSaveApi } from "./use-flow-save";

const NOW = "2026-03-01T10:00:00.000Z";

const project: Project = {
  id: "p1", name: "Musterhaus", status: "active", createdAt: NOW, updatedAt: NOW,
  rooms: [{ id: "r1", name: "Büro 1", typeId: "buero", typeName: "Einzelbüro", groupId: "g1", groupName: "Büro", area: 100, frequency: "5x_week", typePerformance: 200 }],
};

/** Nicht leere „Neue Kalkulation“, z. B. per „Entwurf behalten“ geparkt. */
const createDraft = flowReducer(createEmptyCalcDraft(NOW), { type: "setBase", patch: { name: "Neubau Nord" } });
const editDraft = flowReducer(initFlowDraft("edit", project, null).draft, { type: "setBase", patch: { notes: "geändert" } });

/** Hook einmal rendern (ohne DOM) und die API für Aufrufe außerhalb des Renderns zurückgeben. */
function renderSave(draft: CalcDraft, mode: FlowMode): FlowSaveApi {
  let api: FlowSaveApi | null = null;
  function Probe() {
    api = useFlowSave({ draft, mode, onGateBlocked: () => {} });
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return api!;
}

beforeEach(() => {
  navigate.mockClear();
  useStore.setState({ projects: [structuredClone(project)], calcDraft: null });
});

describe("useFlowSave — single draft slot", () => {
  it("saving an edit keeps a parked 'Neue Kalkulation' draft", async () => {
    useStore.setState({ calcDraft: createDraft });
    const id = await renderSave(editDraft, "edit").save({ navigate: false });
    expect(id).toBe("p1");
    expect(useStore.getState().projects[0].notes).toBe("geändert");
    expect(useStore.getState().calcDraft).toBe(createDraft);
  });

  it("saving an edit keeps the parked edit draft of another object", async () => {
    const other = { ...editDraft, editingId: "p2" };
    useStore.setState({ calcDraft: other });
    await renderSave(editDraft, "edit").save({ navigate: false });
    expect(useStore.getState().calcDraft).toBe(other);
  });

  it("saving an edit clears its own stored draft", async () => {
    useStore.setState({ calcDraft: editDraft });
    await renderSave(editDraft, "edit").save();
    expect(useStore.getState().calcDraft).toBeNull();
    expect(navigate).toHaveBeenCalledWith("/objekte/p1");
  });

  it("creating clears the stored create draft, but not a parked edit draft", async () => {
    useStore.setState({ projects: [], calcDraft: createDraft });
    const id = await renderSave(createDraft, "create").save({ navigate: false });
    expect(useStore.getState().projects.find((p) => p.id === id)?.name).toBe("Neubau Nord");
    expect(useStore.getState().calcDraft).toBeNull();

    useStore.setState({ projects: [], calcDraft: editDraft });
    await renderSave(createDraft, "create").save({ navigate: false });
    expect(useStore.getState().calcDraft).toBe(editDraft);
  });
});
