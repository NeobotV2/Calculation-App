import { describe, it, expect } from "vitest";
import { parseLvFile, parseFrequency, parseGermanNumber, matchRoomType } from "./lv-import";

describe("parseGermanNumber", () => {
  it("reads German decimals, units and thousand separators", () => {
    expect(parseGermanNumber("230,5")).toBeCloseTo(230.5);
    expect(parseGermanNumber("1.234,56")).toBeCloseTo(1234.56);
    expect(parseGermanNumber("450 m²")).toBe(450);
    expect(parseGermanNumber("120qm")).toBe(120);
    expect(Number.isNaN(parseGermanNumber("abc"))).toBe(true);
  });
});

describe("parseFrequency", () => {
  it("maps German interval wording to frequency keys", () => {
    expect(parseFrequency("5x wöchentlich")).toBe("5x_week");
    expect(parseFrequency("werktäglich")).toBe("5x_week");
    expect(parseFrequency("arbeitstäglich")).toBe("5x_week");
    expect(parseFrequency("täglich")).toBe("7x_week");
    expect(parseFrequency("14-tägig")).toBe("biweekly");
    expect(parseFrequency("monatlich")).toBe("monthly");
    expect(parseFrequency("2 x pro Woche")).toBe("2x_week");
    expect(parseFrequency("unbekannt")).toBeUndefined();
    expect(parseFrequency(undefined)).toBeUndefined();
  });
});

describe("matchRoomType", () => {
  it("matches exact and prefixed names", () => {
    expect(matchRoomType("Büro").matched).toBe(true);
    const m = matchRoomType("Büro 1.OG links");
    expect(m.matched).toBe(true);
    expect(m.type.name.toLowerCase()).toContain("büro");
  });
  it("matches compound room words like 'Halle' to a hall type", () => {
    const m = matchRoomType("Xyzzy-Halle 42");
    expect(m.matched).toBe(true);
    expect(m.type.name.toLowerCase()).toContain("halle");
  });

  it("falls back for truly unknown names", () => {
    const m = matchRoomType("Qwrtz Zxcv 99");
    expect(m.matched).toBe(false);
    expect(m.type).toBeDefined();
  });
});

describe("parseLvFile — CSV", () => {
  it("parses a semicolon CSV with header, German numbers and frequency", () => {
    const csv = [
      "Bezeichnung;Fläche (m²);Häufigkeit",
      "Büro EG;230,5;5x wöchentlich",
      "WC Herren;45;werktäglich",
      "Summe;275,5;",
    ].join("\n");
    const res = parseLvFile(csv, "lv.csv");
    expect(res.rooms).toHaveLength(2); // Summenzeile übersprungen
    expect(res.rooms[0].name).toBe("Büro EG");
    expect(res.rooms[0].area).toBeCloseTo(230.5);
    expect(res.rooms[0].frequency).toBe("5x_week");
    expect(res.rooms[0].typePerformance).toBeGreaterThan(0);
  });

  it("parses headerless comma CSV with default frequency", () => {
    const csv = "Flur OG,120\nTreppenhaus,80";
    const res = parseLvFile(csv, "raeume.csv", "3x_week");
    expect(res.rooms).toHaveLength(2);
    expect(res.rooms[1].frequency).toBe("3x_week");
  });

  it("skips rows without a valid area and reports it", () => {
    const csv = "Bezeichnung;Fläche\nBüro;abc\nLager;50";
    const res = parseLvFile(csv, "lv.csv");
    expect(res.rooms).toHaveLength(1);
    expect(res.warnings.join(" ")).toMatch(/übersprungen/);
  });
});

describe("parseLvFile — JSON", () => {
  it("reads a plain rooms array", () => {
    const json = JSON.stringify([
      { name: "Büro", area: 100, frequency: "5x_week" },
      { name: "Küche", area: "25,5" },
    ]);
    const res = parseLvFile(json, "rooms.json");
    expect(res.rooms).toHaveLength(2);
    expect(res.rooms[1].area).toBeCloseTo(25.5);
  });

  it("reads rooms from an app export (projects[].rooms) preserving type data", () => {
    const json = JSON.stringify({
      projects: [
        {
          rooms: [
            {
              name: "OP-Saal", typeId: "t42", typeName: "OP-Saal", groupId: "g6",
              groupName: "Medizin & Labor", area: 60, frequency: "7x_week", typePerformance: 90,
            },
          ],
        },
      ],
    });
    const res = parseLvFile(json, "export.json");
    expect(res.rooms).toHaveLength(1);
    expect(res.rooms[0].typeId).toBe("t42");
    expect(res.rooms[0].typePerformance).toBe(90);
    expect(res.rooms[0].matched).toBe(true);
  });

  it("reports unreadable JSON", () => {
    const res = parseLvFile("{kaputt", "lv.json");
    expect(res.rooms).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
