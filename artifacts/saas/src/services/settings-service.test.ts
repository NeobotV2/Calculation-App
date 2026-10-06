import { describe, it, expect, vi, beforeEach } from "vitest";

const { calls, results } = vi.hoisted(() => ({
  calls: [] as { table: string; op: string; payload?: unknown }[],
  results: new Map<string, Array<{ data: unknown; error: unknown }>>(),
}));

vi.mock("@/lib/supabase", () => {
  const from = (table: string) => {
    const state: { table: string; op: string; payload?: unknown } = { table, op: "select" };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      single: () => builder,
      update: (payload: unknown) => { state.op = "update"; state.payload = payload; return builder; },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
        calls.push({ ...state });
        const queue = results.get(`${table}:${state.op}`);
        const value = queue && queue.length > 1 ? queue.shift() : queue?.[0];
        return Promise.resolve(value ?? { data: null, error: null }).then(resolve, reject);
      },
    };
    return builder;
  };
  return { supabase: { from }, isSupabaseConfigured: true };
});

import { getSettings, updateSettings } from "./settings-service";

const ROW = {
  company_id: "company-1",
  hourly_rate: "32.91",
  vat_rate: "19",
  default_frequency: "5x_week",
  pdf_header: null,
  pdf_footer: null,
  company_street: "",
  company_zip: "",
  company_city: "",
  company_phone: "",
  company_email: "",
  company_tax_number: "",
  company_vat_id: "",
  company_managing_director: "",
};
const MISSING_COLUMN = {
  code: "PGRST204",
  message: "Could not find the 'confirmed_hourly_rate' column of 'company_settings' in the schema cache",
};

beforeEach(() => {
  calls.length = 0;
  results.clear();
  results.set("profiles:select", [{ data: { company_id: "company-1" }, error: null }]);
});

describe("getSettings", () => {
  it("reads the confirmed rate when migration 006 is applied", async () => {
    results.set("company_settings:select", [{ data: { ...ROW, confirmed_hourly_rate: "32.91" }, error: null }]);
    const s = await getSettings();
    expect(s?.hourly_rate).toBe(32.91);
    expect(s?.confirmed_hourly_rate).toBe(32.91);
  });

  it("returns null for an unconfirmed rate", async () => {
    results.set("company_settings:select", [{ data: { ...ROW, confirmed_hourly_rate: null }, error: null }]);
    expect((await getSettings())?.confirmed_hourly_rate).toBeNull();
  });

  it("leaves the confirmation undefined when the column does not exist yet", async () => {
    results.set("company_settings:select", [{ data: ROW, error: null }]);
    const s = await getSettings();
    expect(s?.hourly_rate).toBe(32.91);
    expect(s).not.toBeNull();
    expect(s?.confirmed_hourly_rate).toBeUndefined();
  });
});

describe("updateSettings", () => {
  it("saves the confirmation together with the rate", async () => {
    expect(await updateSettings({ hourly_rate: 33.5, confirmed_hourly_rate: 33.5 })).toBe(true);
    const updates = calls.filter((c) => c.op === "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].payload).toEqual({ hourly_rate: 33.5, confirmed_hourly_rate: 33.5 });
  });

  it("still saves the rate when migration 006 is missing", async () => {
    results.set("company_settings:update", [{ data: null, error: MISSING_COLUMN }, { data: null, error: null }]);
    expect(await updateSettings({ hourly_rate: 33.5, confirmed_hourly_rate: 33.5 })).toBe(true);
    const updates = calls.filter((c) => c.op === "update");
    expect(updates.map((u) => u.payload)).toEqual([
      { hourly_rate: 33.5, confirmed_hourly_rate: 33.5 },
      { hourly_rate: 33.5 },
    ]);
  });

  it("treats a confirmation-only update without the column as a local-only success", async () => {
    results.set("company_settings:update", [{ data: null, error: MISSING_COLUMN }]);
    expect(await updateSettings({ confirmed_hourly_rate: 32.91 })).toBe(true);
    expect(calls.filter((c) => c.op === "update")).toHaveLength(1);
  });

  it("reports other errors as failure without retrying", async () => {
    results.set("company_settings:update", [{ data: null, error: { code: "42501", message: "permission denied" } }]);
    expect(await updateSettings({ hourly_rate: 33.5, confirmed_hourly_rate: 33.5 })).toBe(false);
    expect(calls.filter((c) => c.op === "update")).toHaveLength(1);
  });
});
