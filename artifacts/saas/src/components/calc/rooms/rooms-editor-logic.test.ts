import { describe, it, expect } from "vitest";
import { FREQUENCY_FACTORS, calcProjectTotals, calcRoom } from "@/lib/calc";
import { DEFAULT_ROOM_TYPES } from "@/data/room-types";
import { FREQUENCY_OPTIONS } from "@/data/frequencies";
import type { FrequencyKey, Project, Room } from "@/store/use-store";
import {
  UNGROUPED_ID,
  applyFrequencyToAll,
  buildRoom,
  commonFrequency,
  duplicateRoom,
  groupMove,
  groupRooms,
  moveRoom,
  roomRow,
  roomTypeFromRoom,
  roundRoomsForDisplay,
  setupTimeHours,
  setupTimeTotals,
  stripRoomId,
  summarizeRooms,
  visitsPerMonth,
} from "./rooms-editor-logic";

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: "r1",
    name: "Büro",
    typeId: "t1",
    typeName: "Großraumbüro",
    groupId: "g1",
    groupName: "Büro & Verwaltung",
    area: 100,
    frequency: "5x_week",
    typePerformance: 250,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Objekt",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    rooms: [],
    ...overrides,
  };
}

const ROOMS: Room[] = [
  makeRoom({ id: "a", name: "Büro 1", area: 120 }),
  makeRoom({ id: "b", name: "WC Damen", typeId: "t5", typeName: "WC", groupId: "g2", groupName: "Sanitär", area: 18.5, typePerformance: 60, frequency: "5x_week", soilingLevel: "soiling_heavy" }),
  makeRoom({ id: "c", name: "Büro 2", area: 35, frequency: "2x_week", customPerformance: 180 }),
  makeRoom({ id: "d", name: "Flur", typeId: "t9", typeName: "Flur", groupId: "g3", groupName: "Verkehrsflächen", area: 64, typePerformance: 400, frequency: "3x_week", floorType: "floor_carpet" }),
  makeRoom({ id: "e", name: "WC Herren", typeId: "t5", typeName: "WC", groupId: "g2", groupName: "Sanitär", area: 16, typePerformance: 60, frequency: "7x_week" }),
];

const RATE = 31.4;

describe("groupRooms", () => {
  it("keeps the insertion order of groups and of rooms within a group", () => {
    const groups = groupRooms(ROOMS, RATE);
    expect(groups.map((g) => g.groupId)).toEqual(["g1", "g2", "g3"]);
    expect(groups[0].rooms.map((r) => r.id)).toEqual(["a", "c"]);
    expect(groups[1].rooms.map((r) => r.id)).toEqual(["b", "e"]);
    expect(groups[1].rows.map((r) => r.index)).toEqual([1, 4]);
    expect(groups[1].groupName).toBe("Sanitär");
  });

  it("group sums equal the Σ of calcRoom for each group", () => {
    for (const g of groupRooms(ROOMS, RATE)) {
      const expectedPrice = g.rooms.reduce((s, r) => s + calcRoom(r, RATE).monthlyCost, 0);
      const expectedHours = g.rooms.reduce((s, r) => s + calcRoom(r, RATE).monthlyHours, 0);
      const expectedArea = g.rooms.reduce((s, r) => s + r.area, 0);
      expect(g.priceMonthly).toBeCloseTo(expectedPrice, 9);
      expect(g.hoursMonthly).toBeCloseTo(expectedHours, 9);
      expect(g.area).toBeCloseTo(expectedArea, 9);
    }
  });

  it("all group subtotals sum exactly to Σ calcRoom().monthlyCost", () => {
    const groups = groupRooms(ROOMS, RATE);
    const total = groups.reduce((s, g) => s + g.priceMonthly, 0);
    const expected = ROOMS.reduce((s, r) => s + calcRoom(r, RATE).monthlyCost, 0);
    expect(total).toBeCloseTo(expected, 9);
    // …and match the rooms part of calcProjectTotals (no Rüst-/Wegezeit)
    expect(total).toBeCloseTo(calcProjectTotals(makeProject({ rooms: ROOMS }), RATE).cost, 9);
  });

  it("row values come from calcRoom", () => {
    const groups = groupRooms(ROOMS, RATE);
    for (const row of groups.flatMap((g) => g.rows)) {
      const rc = calcRoom(row.room, RATE);
      expect(row.priceMonthly).toBe(rc.monthlyCost);
      expect(row.hoursMonthly).toBe(rc.monthlyHours);
      expect(row.effectivePerformance).toBe(rc.effectivePerformance);
      expect(row.timePerCleaning).toBe(rc.timePerCleaning);
    }
  });

  it("marks adjusted performance (surcharges or custom value)", () => {
    expect(roomRow(ROOMS[0], RATE).isAdjusted).toBe(false);
    expect(roomRow(ROOMS[1], RATE).isAdjusted).toBe(true);
    expect(roomRow(ROOMS[2], RATE).isAdjusted).toBe(true);
    expect(roomRow(ROOMS[3], RATE).isAdjusted).toBe(true);
  });

  it("returns no groups for no rooms and groups rooms without group id", () => {
    expect(groupRooms([], RATE)).toEqual([]);
    const groups = groupRooms([makeRoom({ groupId: "", groupName: "" })], RATE);
    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe(UNGROUPED_ID);
    expect(groups[0].groupName).toBe("Ohne Gruppe");
  });

  it("summarizeRooms equals Σ of the groups", () => {
    const s = summarizeRooms(ROOMS, RATE);
    const groups = groupRooms(ROOMS, RATE);
    expect(s.count).toBe(5);
    expect(s.area).toBeCloseTo(groups.reduce((a, g) => a + g.area, 0), 9);
    expect(s.priceMonthly).toBeCloseTo(groups.reduce((a, g) => a + g.priceMonthly, 0), 9);
    expect(s.hoursMonthly).toBeCloseTo(groups.reduce((a, g) => a + g.hoursMonthly, 0), 9);
  });
});

describe("visitsPerMonth", () => {
  it("is 0 without rooms", () => {
    expect(visitsPerMonth([])).toBe(0);
  });

  it("uses the highest frequency factor (as calc.ts)", () => {
    expect(visitsPerMonth(ROOMS)).toBe(FREQUENCY_FACTORS["7x_week"]);
    expect(visitsPerMonth([makeRoom({ frequency: "monthly" }), makeRoom({ frequency: "2x_week" })])).toBe(8.67);
  });

  it("covers all 9 frequencies", () => {
    expect(FREQUENCY_OPTIONS).toHaveLength(9);
    for (const opt of FREQUENCY_OPTIONS) {
      expect(visitsPerMonth([makeRoom({ frequency: opt.key })])).toBe(FREQUENCY_FACTORS[opt.key]);
    }
  });
});

describe("setupTimeHours / setupTimeTotals", () => {
  it("equals calcProjectTotals().ruestzeitHours and wegezeitHours for the same input", () => {
    const cases: { rooms: Room[]; ruestzeit?: number; wegezeit?: number }[] = [
      { rooms: ROOMS, ruestzeit: 15, wegezeit: 10 },
      { rooms: ROOMS.slice(0, 1), ruestzeit: 0, wegezeit: 0 },
      { rooms: [], ruestzeit: 30, wegezeit: 20 },
      { rooms: ROOMS.slice(2, 4), ruestzeit: 12.5 },
      { rooms: [makeRoom({ frequency: "biweekly" })], wegezeit: 45 },
    ];
    for (const c of cases) {
      const project = makeProject({ rooms: c.rooms, ruestzeit: c.ruestzeit, wegezeit: c.wegezeit });
      const totals = calcProjectTotals(project, RATE);
      expect(setupTimeHours(c.ruestzeit ?? 0, c.rooms)).toBe(totals.ruestzeitHours);
      expect(setupTimeHours(c.wegezeit ?? 0, c.rooms)).toBe(totals.wegezeitHours);
      const st = setupTimeTotals({ ruestzeit: c.ruestzeit, wegezeit: c.wegezeit }, c.rooms, RATE);
      expect(st.ruestzeitHours).toBe(totals.ruestzeitHours);
      expect(st.wegezeitHours).toBe(totals.wegezeitHours);
      // Räume + Rüst-/Wegezeit = Unterhalt gesamt (calcProjectTotals.cost)
      const roomsPart = summarizeRooms(c.rooms, RATE);
      expect(roomsPart.priceMonthly + st.priceMonthly).toBeCloseTo(totals.cost, 9);
      expect(roomsPart.hoursMonthly + st.hoursMonthly).toBeCloseTo(totals.hours, 9);
    }
  });

  it("is (min / 60) × visits", () => {
    expect(setupTimeHours(15, [makeRoom({ frequency: "5x_week" })])).toBeCloseTo((15 / 60) * 21.67, 12);
    expect(setupTimeHours(Number.NaN, ROOMS)).toBe(0);
  });
});

describe("duplicateRoom / stripRoomId", () => {
  it("copies all fields with a new id and the suffix (Kopie)", () => {
    const original = ROOMS[1];
    const copy = duplicateRoom(original, () => "new-id");
    expect(copy).toEqual({ ...original, id: "new-id", name: "WC Damen (Kopie)" });
    expect(original.name).toBe("WC Damen");
    expect(calcRoom(copy, RATE)).toEqual(calcRoom(original, RATE));
  });

  it("removes only the id", () => {
    const stripped = stripRoomId(ROOMS[2]);
    expect("id" in stripped).toBe(false);
    expect(stripped).toEqual({ ...ROOMS[2], id: undefined });
  });
});

describe("moveRoom / groupMove", () => {
  it("moves with splice semantics and ignores invalid indices", () => {
    const ids = (rs: Room[]) => rs.map((r) => r.id);
    expect(ids(moveRoom(ROOMS, 0, 2))).toEqual(["b", "c", "a", "d", "e"]);
    expect(ids(moveRoom(ROOMS, 4, 0))).toEqual(["e", "a", "b", "c", "d"]);
    expect(ids(moveRoom(ROOMS, 1, 1))).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids(moveRoom(ROOMS, -1, 2))).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids(moveRoom(ROOMS, 0, 5))).toEqual(["a", "b", "c", "d", "e"]);
    expect(moveRoom(ROOMS, 0, 1)).not.toBe(ROOMS);
  });

  it("moves within the room group and keeps the group order", () => {
    const groupOrder = (rs: Room[]) => groupRooms(rs, RATE).map((g) => g.groupId);
    const groupMembers = (rs: Room[], gid: string) =>
      groupRooms(rs, RATE).find((g) => g.groupId === gid)!.rooms.map((r) => r.id);

    // „Büro 2“ (c) nach oben → vor „Büro 1“ (a)
    const up = groupMove(ROOMS, "c", "up")!;
    expect(up).toEqual({ from: 2, to: 0 });
    const afterUp = moveRoom(ROOMS, up.from, up.to);
    expect(groupMembers(afterUp, "g1")).toEqual(["c", "a"]);
    expect(groupOrder(afterUp)).toEqual(["g1", "g2", "g3"]);

    // „Büro 1“ (a) nach unten → hinter „Büro 2“ (c)
    const down = groupMove(ROOMS, "a", "down")!;
    expect(down).toEqual({ from: 2, to: 0 });
    const afterDown = moveRoom(ROOMS, down.from, down.to);
    expect(groupMembers(afterDown, "g1")).toEqual(["c", "a"]);
    expect(groupOrder(afterDown)).toEqual(["g1", "g2", "g3"]);

    // WC Herren (e) nach oben
    const wcUp = groupMove(ROOMS, "e", "up")!;
    const afterWc = moveRoom(ROOMS, wcUp.from, wcUp.to);
    expect(groupMembers(afterWc, "g2")).toEqual(["e", "b"]);
    expect(groupOrder(afterWc)).toEqual(["g1", "g2", "g3"]);
  });

  it("returns null at the edges of a group or for unknown rooms", () => {
    expect(groupMove(ROOMS, "a", "up")).toBeNull();
    expect(groupMove(ROOMS, "c", "down")).toBeNull();
    expect(groupMove(ROOMS, "d", "up")).toBeNull();
    expect(groupMove(ROOMS, "d", "down")).toBeNull();
    expect(groupMove(ROOMS, "x", "up")).toBeNull();
  });
});

describe("applyFrequencyToAll / commonFrequency", () => {
  it("sets every room to the frequency without touching other fields", () => {
    const next = applyFrequencyToAll(ROOMS, "1x_week");
    expect(next.every((r) => r.frequency === "1x_week")).toBe(true);
    next.forEach((r, i) => expect({ ...r, frequency: ROOMS[i].frequency }).toEqual(ROOMS[i]));
    expect(ROOMS[0].frequency).toBe("5x_week");
  });

  it("supports all 9 frequencies", () => {
    for (const opt of FREQUENCY_OPTIONS) {
      const next = applyFrequencyToAll(ROOMS, opt.key);
      expect(commonFrequency(next)).toBe(opt.key);
    }
  });

  it("detects mixed frequencies", () => {
    expect(commonFrequency(ROOMS)).toBeNull();
    expect(commonFrequency([])).toBeNull();
  });
});

describe("buildRoom", () => {
  /** Die bisherige Speicherlogik von RoomEditorSheet (vor dem Umbau), wörtlich. */
  function legacyBuild(input: {
    name: string;
    typeId: string;
    area: string;
    freq: FrequencyKey;
    customPerf: string;
    soilingLevel?: string;
    furnishingLevel?: string;
    floorType?: string;
  }): Omit<Room, "id"> {
    const selectedType = DEFAULT_ROOM_TYPES.find((t) => t.id === input.typeId) || DEFAULT_ROOM_TYPES[0];
    const parsed = parseFloat(input.area.replace(",", "."));
    const areaNum = isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    const perfVal = input.customPerf ? parseFloat(input.customPerf.replace(",", ".")) : undefined;
    return {
      name: input.name.trim() || selectedType.name,
      typeId: input.typeId,
      typeName: selectedType.name,
      groupId: selectedType.groupId,
      groupName: selectedType.groupName,
      area: areaNum,
      frequency: input.freq,
      typePerformance: selectedType.performanceValue,
      customPerformance: perfVal && perfVal > 0 ? perfVal : undefined,
      soilingLevel: input.soilingLevel || undefined,
      furnishingLevel: input.furnishingLevel || undefined,
      floorType: input.floorType || undefined,
    };
  }

  const parse = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isNaN(n) ? undefined : n;
  };

  it("produces the identical Room fields as the previous sheet for the same inputs", () => {
    const inputs = [
      { name: "", typeId: "t1", area: "120", freq: "5x_week" as FrequencyKey, customPerf: "" },
      { name: "  Chefzimmer  ", typeId: "t72", area: "24,5", freq: "2x_week" as FrequencyKey, customPerf: "150" },
      { name: "Teeküche", typeId: DEFAULT_ROOM_TYPES[10].id, area: "8.25", freq: "7x_week" as FrequencyKey, customPerf: "0", soilingLevel: "soiling_heavy", furnishingLevel: "", floorType: "floor_carpet" },
      { name: "Lager", typeId: DEFAULT_ROOM_TYPES[30].id, area: "300", freq: "monthly" as FrequencyKey, customPerf: "-5", furnishingLevel: "furnishing_dense" },
    ];
    for (const input of inputs) {
      const type = DEFAULT_ROOM_TYPES.find((t) => t.id === input.typeId)!;
      const built = buildRoom({
        name: input.name,
        type,
        area: parse(input.area)!,
        frequency: input.freq,
        customPerformance: input.customPerf ? parse(input.customPerf) : undefined,
        soilingLevel: input.soilingLevel,
        furnishingLevel: input.furnishingLevel,
        floorType: input.floorType,
      });
      expect(built).toEqual(legacyBuild(input));
      // identische Kalkulation
      expect(calcRoom({ ...built, id: "x" }, RATE)).toEqual(calcRoom({ ...legacyBuild(input), id: "x" }, RATE));
    }
  });

  it("keeps the type data of an existing room whose type is not in the catalogue", () => {
    const room = makeRoom({ typeId: "custom-gone", typeName: "Sonderraum", groupId: "g7", groupName: "Sonderflächen", typePerformance: 123 });
    const built = buildRoom({ name: room.name, type: roomTypeFromRoom(room), area: room.area, frequency: room.frequency });
    expect(built).toEqual(stripRoomId({ ...room, customPerformance: undefined }));
  });
});

describe("roundRoomsForDisplay", () => {
  const cents = (v: number) => Math.round(v * 100);
  const tenths = (v: number) => Math.round(v * 10);

  it("Zeilen je Gruppe = Gruppensumme, Gruppen + Fußzeilen = gerundete Gesamtsumme", () => {
    const p = makeProject({ rooms: ROOMS, ruestzeit: 13, wegezeit: 7 });
    const setup = setupTimeTotals({ ruestzeit: 13, wegezeit: 7 }, ROOMS, RATE);
    const footer = [
      { key: "ruestzeit", hoursMonthly: setup.ruestzeitHours, priceMonthly: setup.ruestzeitHours * RATE },
      { key: "wegezeit", hoursMonthly: setup.wegezeitHours, priceMonthly: setup.wegezeitHours * RATE },
    ];
    const shown = roundRoomsForDisplay(groupRooms(ROOMS, RATE), footer);
    for (const g of shown.groups) {
      expect(g.rows.reduce((s, r) => s + cents(r.priceMonthly), 0)).toBe(cents(g.priceMonthly));
      expect(g.rows.reduce((s, r) => s + tenths(r.hoursMonthly), 0)).toBe(tenths(g.hoursMonthly));
    }
    const groupCents = shown.groups.reduce((s, g) => s + cents(g.priceMonthly), 0);
    const footerCents = [...shown.footer.values()].reduce((s, f) => s + cents(f.priceMonthly), 0);
    expect(groupCents + footerCents).toBe(cents(shown.total.priceMonthly));
    // Gesamtsumme = kaufmännisch gerundeter Objektpreis (calcProjectTotals.cost).
    expect(cents(shown.total.priceMonthly)).toBe(Math.round(calcProjectTotals(p, RATE).cost * 100 + 1e-6));
    // Raumwerte weichen höchstens 1 Cent ab.
    for (const g of shown.groups) {
      for (const r of g.rows) {
        expect(Math.abs(r.priceMonthly - calcRoom(r.room, RATE).monthlyCost)).toBeLessThanOrEqual(0.01 + 1e-9);
      }
    }
  });

  it("ohne Fußzeilen und ohne Räume", () => {
    const shown = roundRoomsForDisplay(groupRooms(ROOMS, RATE));
    expect(shown.footer.size).toBe(0);
    expect(cents(shown.total.priceMonthly)).toBe(Math.round(summarizeRooms(ROOMS, RATE).priceMonthly * 100 + 1e-6));
    expect(roundRoomsForDisplay([])).toEqual({ groups: [], footer: new Map(), total: { priceMonthly: 0, hoursMonthly: 0 } });
  });
});
