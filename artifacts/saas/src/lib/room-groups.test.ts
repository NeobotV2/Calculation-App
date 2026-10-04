import { describe, it, expect } from "vitest";
import { UNGROUPED_ID, UNGROUPED_NAME, orderRoomsByGroup, roomGroupKey } from "./room-groups";

const room = (id: string, groupId: string, groupName: string) => ({ id, groupId, groupName });

describe("roomGroupKey", () => {
  it("uses the group id, else the group name, else „Ohne Gruppe“", () => {
    expect(roomGroupKey(room("a", "g1", "Büro"))).toEqual({ id: "g1", name: "Büro" });
    expect(roomGroupKey(room("a", "", "Lager"))).toEqual({ id: "name:Lager", name: "Lager" });
    expect(roomGroupKey(room("a", "", ""))).toEqual({ id: UNGROUPED_ID, name: UNGROUPED_NAME });
  });
});

describe("orderRoomsByGroup", () => {
  it("orders groups by their first room and keeps the input order within a group", () => {
    const rooms = [
      room("eg-buero", "g1", "Büro"),
      room("eg-wc", "g2", "Sanitär"),
      room("lager", "", "Lager"),
      room("og-buero", "g1", "Büro"),
      room("flur", "", ""),
      room("og-wc", "g2", "Sanitär"),
      room("keller", "", "Lager"),
    ];
    expect(orderRoomsByGroup(rooms).map((r) => r.id)).toEqual([
      "eg-buero",
      "og-buero",
      "eg-wc",
      "og-wc",
      "lager",
      "keller",
      "flur",
    ]);
  });

  it("returns a new array and leaves already grouped lists unchanged", () => {
    const rooms = [room("a", "g1", "Büro"), room("b", "g1", "Büro"), room("c", "g2", "Sanitär")];
    const ordered = orderRoomsByGroup(rooms);
    expect(ordered).toEqual(rooms);
    expect(ordered).not.toBe(rooms);
    expect(orderRoomsByGroup([])).toEqual([]);
  });
});
