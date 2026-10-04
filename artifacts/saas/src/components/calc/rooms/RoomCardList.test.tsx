import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Room } from "@/store/use-store";
import { RoomCardList } from "./RoomCardList";
import { groupRooms } from "./rooms-editor-logic";

const ROOMS: Room[] = [
  { id: "a", name: "Büro 1", typeId: "t1", typeName: "Großraumbüro", groupId: "g1", groupName: "Büro", area: 120, frequency: "5x_week", typePerformance: 250 },
  { id: "b", name: "WC", typeId: "t5", typeName: "WC", groupId: "g2", groupName: "Sanitär", area: 18, frequency: "5x_week", typePerformance: 60 },
];
const RATE = 30;
const total = { label: "Summe Räume", area: 138, hoursMonthly: 0, priceMonthly: 0 };

/** Attribute aller Zeilen-Buttons (Overlay der ListRow). */
const rowButtons = (html: string) =>
  [...html.matchAll(/<button\b([^>]*)>(?:(?!<\/button>)[\s\S])*?line-clamp-3/g)].map((m) => m[1]);

describe("RoomCardList", () => {
  it("read-only: the room row toggles its details and exposes the collapsed state", () => {
    const html = renderToStaticMarkup(<RoomCardList groups={groupRooms(ROOMS, RATE)} rate={RATE} total={total} />);
    const buttons = rowButtons(html);
    expect(buttons).toHaveLength(2);
    for (const attrs of buttons) {
      expect(attrs).toContain('aria-expanded="false"');
      // Das Detail-Panel existiert erst aufgeklappt.
      expect(attrs).not.toContain("aria-controls");
    }
  });

  it("editable: the room row opens the editor and is no disclosure", () => {
    const html = renderToStaticMarkup(
      <RoomCardList groups={groupRooms(ROOMS, RATE)} rate={RATE} total={total} handlers={{ onEdit: () => {} }} />,
    );
    const buttons = rowButtons(html);
    expect(buttons).toHaveLength(2);
    for (const attrs of buttons) expect(attrs).not.toContain("aria-expanded");
  });
});
