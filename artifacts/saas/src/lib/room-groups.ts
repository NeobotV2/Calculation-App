import type { Room } from "@/store/use-store";

/** Gruppen-id für Räume ohne Raumgruppe. */
export const UNGROUPED_ID = "__ohne_gruppe";
export const UNGROUPED_NAME = "Ohne Gruppe";

type RoomGroupFields = Pick<Room, "groupId" | "groupName">;

/** Raumgruppe eines Raums: Gruppen-id, sonst Gruppenname, sonst „Ohne Gruppe“. */
export function roomGroupKey(room: RoomGroupFields): { id: string; name: string } {
  const id = room.groupId || (room.groupName ? `name:${room.groupName}` : UNGROUPED_ID);
  return { id, name: room.groupName || UNGROUPED_NAME };
}

/**
 * Räume in der Reihenfolge des Raum-Editors: Gruppen in der Reihenfolge ihres
 * ersten Raums, Räume innerhalb einer Gruppe in Eingabereihenfolge. Angebot
 * und Leistungsverzeichnis listen die Räume so, wie der Editor sie zeigt und
 * „Nach oben/unten“ sie ordnet.
 */
export function orderRoomsByGroup<T extends RoomGroupFields>(rooms: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const room of rooms) {
    const id = roomGroupKey(room).id;
    const list = groups.get(id);
    if (list) list.push(room);
    else groups.set(id, [room]);
  }
  return [...groups.values()].flat();
}
