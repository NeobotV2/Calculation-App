/* ─────────────────────────────────────────────────────────────────────────
   Reine Hilfsfunktionen des Raum-Editors (Flow „Räume & Turnus“ und
   Objekt-Arbeitsbereich „Unterhaltsreinigung“). Keine React-, Store- oder
   Routing-Abhängigkeiten – alle Beträge kommen aus `calcRoom` bzw. den
   Faktoren in `lib/calc.ts`, damit Tabelle und Kalkulation nie abweichen.
   ───────────────────────────────────────────────────────────────────────── */
import { FREQUENCY_FACTORS, calcRoom } from "@/lib/calc";
import { allocateRounded, sumDisplay } from "@/lib/display-rounding";
import type { FrequencyKey, Room } from "@/store/use-store";

/** Gruppen-id für Räume ohne Raumgruppe. */
export const UNGROUPED_ID = "__ohne_gruppe";
export const UNGROUPED_NAME = "Ohne Gruppe";

/** Ein Raum mit seinen berechneten Monatswerten (aus `calcRoom`). */
export interface RoomRow {
  room: Room;
  /** Position im ursprünglichen `rooms`-Array. */
  index: number;
  /** Effektive Leistung in m²/h (inkl. Zu-/Abschläge bzw. eigenem Wert). */
  effectivePerformance: number;
  /** Stunden je Reinigung. */
  timePerCleaning: number;
  hoursMonthly: number;
  priceMonthly: number;
  /** Leistungswert weicht vom Raumart-Wert ab (eigener Wert oder Zu-/Abschläge). */
  isAdjusted: boolean;
}

export interface RoomGroup {
  groupId: string;
  groupName: string;
  rooms: Room[];
  /** Dieselben Räume samt berechneter Werte, in derselben Reihenfolge. */
  rows: RoomRow[];
  area: number;
  hoursMonthly: number;
  priceMonthly: number;
}

/** Hat der Raum Zu-/Abschläge (Verschmutzung, Möblierung, Boden)? */
export function hasSurcharges(room: Pick<Room, "soilingLevel" | "furnishingLevel" | "floorType">): boolean {
  return !!(room.soilingLevel || room.furnishingLevel || room.floorType);
}

/** Berechnete Werte eines Raums (Quelle: `calcRoom`). */
export function roomRow(room: Room, rate: number, index = 0): RoomRow {
  const rc = calcRoom(room, rate);
  return {
    room,
    index,
    effectivePerformance: rc.effectivePerformance,
    timePerCleaning: rc.timePerCleaning,
    hoursMonthly: rc.monthlyHours,
    priceMonthly: rc.monthlyCost,
    isAdjusted: hasSurcharges(room) || !!room.customPerformance,
  };
}

function groupKey(room: Room): { id: string; name: string } {
  const id = room.groupId || (room.groupName ? `name:${room.groupName}` : UNGROUPED_ID);
  return { id, name: room.groupName || UNGROUPED_NAME };
}

/**
 * Räume nach Raumgruppe bündeln. Die Gruppen erscheinen in der Reihenfolge
 * ihres ersten Raums, die Räume innerhalb einer Gruppe in Eingabereihenfolge.
 * Σ priceMonthly aller Gruppen = Σ calcRoom(r, rate).monthlyCost.
 */
export function groupRooms(rooms: readonly Room[], rate: number): RoomGroup[] {
  const groups = new Map<string, RoomGroup>();
  rooms.forEach((room, index) => {
    const key = groupKey(room);
    let group = groups.get(key.id);
    if (!group) {
      group = { groupId: key.id, groupName: key.name, rooms: [], rows: [], area: 0, hoursMonthly: 0, priceMonthly: 0 };
      groups.set(key.id, group);
    }
    const row = roomRow(room, rate, index);
    group.rooms.push(room);
    group.rows.push(row);
    group.area += room.area;
    group.hoursMonthly += row.hoursMonthly;
    group.priceMonthly += row.priceMonthly;
  });
  return [...groups.values()];
}

export interface RoomsSummary {
  count: number;
  area: number;
  hoursMonthly: number;
  priceMonthly: number;
}

/** Summen aller Räume (ohne Rüst-/Wegezeit). */
export function summarizeRooms(rooms: readonly Room[], rate: number): RoomsSummary {
  let area = 0;
  let hoursMonthly = 0;
  let priceMonthly = 0;
  for (const room of rooms) {
    const rc = calcRoom(room, rate);
    area += room.area;
    hoursMonthly += rc.monthlyHours;
    priceMonthly += rc.monthlyCost;
  }
  return { count: rooms.length, area, hoursMonthly, priceMonthly };
}

/**
 * Einsätze je Monat = höchster Turnus aller Räume (wie `calcProjectTotals`).
 * Ohne Räume 0.
 */
export function visitsPerMonth(rooms: readonly Pick<Room, "frequency">[]): number {
  if (rooms.length === 0) return 0;
  return Math.max(...rooms.map((r) => FREQUENCY_FACTORS[r.frequency]));
}

/** Rüst- bzw. Wegezeit in Stunden je Monat: (Minuten / 60) × Einsätze/Monat. */
export function setupTimeHours(minutes: number, rooms: readonly Pick<Room, "frequency">[]): number {
  const m = Number.isFinite(minutes) ? minutes : 0;
  return (m / 60) * visitsPerMonth(rooms);
}

export interface SetupTimeTotals {
  visitsPerMonth: number;
  ruestzeitHours: number;
  wegezeitHours: number;
  /** Rüst- + Wegezeit in Stunden je Monat. */
  hoursMonthly: number;
  /** hoursMonthly × Satz. */
  priceMonthly: number;
}

/**
 * Rüst- und Wegezeit eines Objekts als Monatswerte – dieselben Werte wie
 * `calcProjectTotals().ruestzeitHours/wegezeitHours`. Für den Fußbereich der
 * Raumtabelle (`footerAmounts`).
 */
export function setupTimeTotals(
  minutes: { ruestzeit?: number; wegezeit?: number },
  rooms: readonly Pick<Room, "frequency">[],
  rate: number,
): SetupTimeTotals {
  const ruestzeitHours = setupTimeHours(minutes.ruestzeit ?? 0, rooms);
  const wegezeitHours = setupTimeHours(minutes.wegezeit ?? 0, rooms);
  const hoursMonthly = ruestzeitHours + wegezeitHours;
  return {
    visitsPerMonth: visitsPerMonth(rooms),
    ruestzeitHours,
    wegezeitHours,
    hoursMonthly,
    priceMonthly: hoursMonthly * rate,
  };
}

/** Raum ohne id (für `onAdd`). */
export function stripRoomId(room: Room): Omit<Room, "id"> {
  const { id, ...rest } = room;
  void id;
  return rest;
}

/** Kopie eines Raums mit neuer id und dem Namenszusatz „ (Kopie)“. */
export function duplicateRoom(room: Room, makeId: () => string): Room {
  return { ...room, id: makeId(), name: `${room.name} (Kopie)` };
}

/**
 * Verschiebt einen Raum (splice-Semantik wie `store.reorderRooms`):
 * entfernt ihn an `from` und fügt ihn an `to` ein. Ungültige Indizes ⇒
 * unveränderte Kopie.
 */
export function moveRoom<T>(rooms: readonly T[], from: number, to: number): T[] {
  const next = [...rooms];
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < rooms.length;
  if (!valid(from) || !valid(to) || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Index-Paar für „Nach oben“/„Nach unten“ innerhalb der Raumgruppe, so dass
 * sich die Gruppenreihenfolge nicht ändert. Ergebnis für `onReorder(from, to)`
 * bzw. `moveRoom`; `null`, wenn der Raum schon am Rand seiner Gruppe steht.
 *
 * - oben: der Raum springt an die Stelle des vorherigen Raums seiner Gruppe.
 * - unten: der nächste Raum seiner Gruppe springt an die Stelle des Raums.
 */
export function groupMove(
  rooms: readonly Room[],
  roomId: string,
  direction: "up" | "down",
): { from: number; to: number } | null {
  const index = rooms.findIndex((r) => r.id === roomId);
  if (index < 0) return null;
  const key = groupKey(rooms[index]).id;
  if (direction === "up") {
    for (let j = index - 1; j >= 0; j--) {
      if (groupKey(rooms[j]).id === key) return { from: index, to: j };
    }
    return null;
  }
  for (let k = index + 1; k < rooms.length; k++) {
    if (groupKey(rooms[k]).id === key) return { from: k, to: index };
  }
  return null;
}

/** Raumart-Daten, wie sie der Raum-Editor anbietet (Standard- oder eigene Raumart). */
export interface RoomTypeLike {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  performanceValue: number;
}

/** Eingaben des Raum-Editors (bereits geparst). */
export interface RoomFormValues {
  name: string;
  type: RoomTypeLike;
  /** Fläche in m² (> 0 zum Speichern). */
  area: number;
  frequency: FrequencyKey;
  /** Eigener Leistungswert in m²/h; ≤ 0 oder leer ⇒ Raumart-Wert. */
  customPerformance?: number;
  soilingLevel?: string;
  furnishingLevel?: string;
  floorType?: string;
}

/**
 * Baut den zu speichernden Raum aus den Editor-Eingaben – feldgleich zur
 * bisherigen `RoomEditorSheet`-Logik (leerer Name ⇒ Raumart-Name,
 * `typePerformance` = Raumart-Wert, eigener Wert nur wenn > 0, leere
 * Zu-/Abschläge ⇒ undefined).
 */
export function buildRoom(values: RoomFormValues): Omit<Room, "id"> {
  const custom = values.customPerformance;
  return {
    name: values.name.trim() || values.type.name,
    typeId: values.type.id,
    typeName: values.type.name,
    groupId: values.type.groupId,
    groupName: values.type.groupName,
    area: values.area,
    frequency: values.frequency,
    typePerformance: values.type.performanceValue,
    customPerformance: custom !== undefined && Number.isFinite(custom) && custom > 0 ? custom : undefined,
    soilingLevel: values.soilingLevel || undefined,
    furnishingLevel: values.furnishingLevel || undefined,
    floorType: values.floorType || undefined,
  };
}

/** Raumart eines bestehenden Raums (falls sie im Katalog fehlt, z. B. gelöschte eigene Raumart). */
export function roomTypeFromRoom(room: Pick<Room, "typeId" | "typeName" | "groupId" | "groupName" | "typePerformance">): RoomTypeLike {
  return {
    id: room.typeId,
    name: room.typeName,
    groupId: room.groupId,
    groupName: room.groupName,
    performanceValue: room.typePerformance,
  };
}

/** Setzt den Turnus aller Räume. */
export function applyFrequencyToAll(rooms: readonly Room[], frequency: FrequencyKey): Room[] {
  return rooms.map((r) => (r.frequency === frequency ? r : { ...r, frequency }));
}

/** Gemeinsamer Turnus aller Räume oder `null` (gemischt bzw. keine Räume). */
export function commonFrequency(rooms: readonly Pick<Room, "frequency">[]): FrequencyKey | null {
  if (rooms.length === 0) return null;
  const first = rooms[0].frequency;
  return rooms.every((r) => r.frequency === first) ? first : null;
}

/* ── Anzeige-Rundung ──────────────────────────────────────────────────── */

/** Eine Fußzeile der Raumtabelle (z. B. Rüst-/Wegezeit) mit ungerundeten Monatswerten. */
export interface RoomsFooterAmount {
  key: string;
  hoursMonthly: number;
  priceMonthly: number;
}

export interface RoomsDisplay {
  /** Gruppen mit gerundeten Zeilen; Gruppensummen = Σ gerundete Zeilen. */
  groups: RoomGroup[];
  /** Gerundete Fußzeilen je `key`. */
  footer: Map<string, { hoursMonthly: number; priceMonthly: number }>;
  /** Σ Zeilen + Fußzeilen (= kaufmännisch gerundete Gesamtsumme). */
  total: { hoursMonthly: number; priceMonthly: number };
}

/**
 * Anzeige-Rundung der Raumtabelle: Raumzeilen (Eingabereihenfolge) und
 * Fußzeilen auf Cent bzw. 0,1 h, Rest-Cents nach größtem Rest verteilt —
 * dieselbe Reihenfolge wie die Angebotspositionen (Räume, Rüstzeit, Wegezeit),
 * damit Tabelle und Angebot dieselben Zeilenbeträge zeigen. Σ Zeilen je Gruppe
 * = Gruppensumme, Σ Gruppen + Fußzeilen = Gesamtsumme.
 */
export function roundRoomsForDisplay(groups: readonly RoomGroup[], footer: readonly RoomsFooterAmount[] = []): RoomsDisplay {
  const rows = groups.flatMap((g) => g.rows).sort((a, b) => a.index - b.index);
  const prices = allocateRounded([...rows.map((r) => r.priceMonthly), ...footer.map((f) => f.priceMonthly)]);
  const hours = allocateRounded([...rows.map((r) => r.hoursMonthly), ...footer.map((f) => f.hoursMonthly)], undefined, 1);
  const byRoom = new Map(rows.map((r, i) => [r.room.id, { priceMonthly: prices[i], hoursMonthly: hours[i] }]));
  const shownGroups = groups.map((g) => {
    const shownRows = g.rows.map((r) => ({ ...r, ...(byRoom.get(r.room.id) ?? { priceMonthly: 0, hoursMonthly: 0 }) }));
    return {
      ...g,
      rows: shownRows,
      hoursMonthly: sumDisplay(shownRows.map((r) => r.hoursMonthly), 1),
      priceMonthly: sumDisplay(shownRows.map((r) => r.priceMonthly)),
    };
  });
  const footerMap = new Map(
    footer.map((f, i) => [f.key, { priceMonthly: prices[rows.length + i], hoursMonthly: hours[rows.length + i] }]),
  );
  return {
    groups: shownGroups,
    footer: footerMap,
    total: { priceMonthly: sumDisplay(prices), hoursMonthly: sumDisplay(hours, 1) },
  };
}
