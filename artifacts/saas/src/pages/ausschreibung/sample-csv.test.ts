import { describe, it, expect } from "vitest";
import { parseLvFile } from "@/lib/lv-import";
import { calcTenderScenarios } from "@/lib/tender-calc";
import {
  createSampleCsvBlob,
  SAMPLE_LV_CSV,
  SAMPLE_LV_FILENAME,
  SAMPLE_LV_ROWS,
  sampleCsvFileText,
} from "./sample-csv";

describe("sample LV CSV", () => {
  it("is parsed by lv-import without warnings", () => {
    const res = parseLvFile(SAMPLE_LV_CSV, SAMPLE_LV_FILENAME);
    expect(res.warnings).toEqual([]);
    expect(res.rooms).toHaveLength(SAMPLE_LV_ROWS.length);
    expect(res.rooms.every((r) => r.matched)).toBe(true);
  });

  it("keeps names, German decimals and frequencies", () => {
    const res = parseLvFile(SAMPLE_LV_CSV, SAMPLE_LV_FILENAME);
    const byName = new Map(res.rooms.map((r) => [r.name, r]));
    expect(byName.get("Einzelbüro 1.OG")?.area).toBeCloseTo(24.5, 9);
    expect(byName.get("Großraumbüro EG")?.frequency).toBe("5x_week");
    expect(byName.get("Besprechungsraum")?.frequency).toBe("3x_week");
    expect(byName.get("WC / Sanitär klein")?.frequency).toBe("5x_week");
    expect(byName.get("Treppe")?.frequency).toBe("2x_week");
    expect(byName.get("Lager / Archiv")?.frequency).toBe("biweekly");
    for (const r of res.rooms) expect(r.typePerformance).toBeGreaterThan(0);
  });

  it("also parses the downloadable file text (with BOM)", () => {
    const res = parseLvFile(sampleCsvFileText(), SAMPLE_LV_FILENAME);
    expect(res.warnings).toEqual([]);
    expect(res.rooms).toHaveLength(SAMPLE_LV_ROWS.length);
  });

  it("produces a usable bid range", () => {
    const rooms = parseLvFile(SAMPLE_LV_CSV, SAMPLE_LV_FILENAME).rooms;
    const result = calcTenderScenarios(rooms, 25, { perfSpreadPct: 15, rateSpreadPct: 10 });
    expect(result.count).toBe(SAMPLE_LV_ROWS.length);
    expect(result.scenarios.min.cost).toBeLessThan(result.scenarios.mid.cost);
    expect(result.scenarios.mid.cost).toBeLessThan(result.scenarios.max.cost);
  });

  it("creates a CSV blob", () => {
    const blob = createSampleCsvBlob();
    expect(blob.type).toBe("text/csv;charset=utf-8");
    expect(blob.size).toBeGreaterThan(SAMPLE_LV_CSV.length);
  });
});
