export interface RoomTypeData {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  performanceValue: number;
}

export interface RoomGroupData {
  id: string;
  name: string;
}

export const DEFAULT_ROOM_GROUPS: RoomGroupData[] = [
  { id: "g1", name: "Büro & Verwaltung" },
  { id: "g2", name: "Sanitär" },
  { id: "g3", name: "Verkehrsflächen" },
  { id: "g4", name: "Küche & Sozial" },
  { id: "g5", name: "Lager & Technik" },
  { id: "g6", name: "Medizin & Labor" },
  { id: "g7", name: "Sonderflächen" },
];

export const DEFAULT_ROOM_TYPES: RoomTypeData[] = [
  { id: "t1", name: "Großraumbüro", groupId: "g1", groupName: "Büro & Verwaltung", performanceValue: 350 },
  { id: "t2", name: "Einzelbüro", groupId: "g1", groupName: "Büro & Verwaltung", performanceValue: 280 },
  { id: "t3", name: "Besprechungsraum", groupId: "g1", groupName: "Büro & Verwaltung", performanceValue: 300 },
  { id: "t4", name: "Empfang / Foyer", groupId: "g1", groupName: "Büro & Verwaltung", performanceValue: 400 },
  { id: "t5", name: "WC / Sanitär klein", groupId: "g2", groupName: "Sanitär", performanceValue: 50 },
  { id: "t6", name: "WC / Sanitär groß", groupId: "g2", groupName: "Sanitär", performanceValue: 60 },
  { id: "t7", name: "Dusche / Umkleide", groupId: "g2", groupName: "Sanitär", performanceValue: 80 },
  { id: "t8", name: "Flur / Gang", groupId: "g3", groupName: "Verkehrsflächen", performanceValue: 350 },
  { id: "t9", name: "Treppe", groupId: "g3", groupName: "Verkehrsflächen", performanceValue: 150 },
  { id: "t10", name: "Aufzug", groupId: "g3", groupName: "Verkehrsflächen", performanceValue: 50 },
  { id: "t11", name: "Teeküche", groupId: "g4", groupName: "Küche & Sozial", performanceValue: 120 },
  { id: "t12", name: "Kantine / Speisesaal", groupId: "g4", groupName: "Küche & Sozial", performanceValue: 200 },
  { id: "t13", name: "Sozialraum / Pausenraum", groupId: "g4", groupName: "Küche & Sozial", performanceValue: 250 },
  { id: "t14", name: "Lager / Archiv", groupId: "g5", groupName: "Lager & Technik", performanceValue: 500 },
  { id: "t15", name: "Serverraum", groupId: "g5", groupName: "Lager & Technik", performanceValue: 200 },
  { id: "t16", name: "Arztpraxis", groupId: "g6", groupName: "Medizin & Labor", performanceValue: 120 },
  { id: "t17", name: "Labor", groupId: "g6", groupName: "Medizin & Labor", performanceValue: 100 },
  { id: "t18", name: "Werkstatt", groupId: "g7", groupName: "Sonderflächen", performanceValue: 400 },
  { id: "t19", name: "Garage / Tiefgarage", groupId: "g7", groupName: "Sonderflächen", performanceValue: 600 },
];
