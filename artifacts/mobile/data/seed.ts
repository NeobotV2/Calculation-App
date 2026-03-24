import type { FrequencyOption, RoomGroup, RoomType } from "@/types";

export const DEFAULT_FREQUENCY_OPTIONS: FrequencyOption[] = [
  { key: "5x_week", label: "5x pro Woche", monthlyFactor: 21.67 },
  { key: "3x_week", label: "3x pro Woche", monthlyFactor: 13 },
  { key: "2x_week", label: "2x pro Woche", monthlyFactor: 8.67 },
  { key: "1x_week", label: "1x pro Woche", monthlyFactor: 4.33 },
  { key: "biweekly", label: "14-tägig", monthlyFactor: 2.17 },
  { key: "monthly", label: "Monatlich", monthlyFactor: 1 },
];

export const DEFAULT_ROOM_GROUPS: RoomGroup[] = [
  { id: "buero", label: "Büro & Verwaltung" },
  { id: "sanitaer", label: "Sanitär" },
  { id: "verkehr", label: "Verkehrsflächen" },
  { id: "sozial", label: "Sozialräume" },
  { id: "lager", label: "Lager & Nebenflächen" },
  { id: "praxis", label: "Praxis & Spezialflächen" },
  { id: "verkauf", label: "Verkaufsflächen" },
];

export const DEFAULT_ROOM_TYPES: RoomType[] = [
  { id: "grossraum", label: "Großraumbüro", groupId: "buero", performanceValue: 160 },
  { id: "einzel", label: "Einzelbüro", groupId: "buero", performanceValue: 140 },
  { id: "besprechung", label: "Besprechungsraum", groupId: "buero", performanceValue: 130 },
  { id: "empfang", label: "Empfang", groupId: "buero", performanceValue: 120 },
  { id: "flur", label: "Flur", groupId: "verkehr", performanceValue: 300 },
  { id: "treppenhaus", label: "Treppenhaus", groupId: "verkehr", performanceValue: 120 },
  { id: "sanitaer_klein", label: "Sanitär klein", groupId: "sanitaer", performanceValue: 60 },
  { id: "sanitaer_gross", label: "Sanitär groß", groupId: "sanitaer", performanceValue: 75 },
  { id: "teekueche", label: "Teeküche", groupId: "sozial", performanceValue: 80 },
  { id: "aufenthalt", label: "Aufenthaltsraum", groupId: "sozial", performanceValue: 110 },
  { id: "lager", label: "Lager", groupId: "lager", performanceValue: 250 },
  { id: "praxis", label: "Praxisraum", groupId: "praxis", performanceValue: 100 },
  { id: "verkauf", label: "Verkaufsfläche", groupId: "verkauf", performanceValue: 220 },
];

export const DEFAULT_PROJECT_NAME = "Neues Objekt";
export const DEFAULT_COMPANY_NAME = "";
export const DEFAULT_HOURLY_RATE = 18.5;

export const DEMO_ROOMS = [
  {
    id: "demo1",
    name: "EG Großraum",
    roomTypeId: "grossraum",
    roomGroupId: "buero",
    area: 120,
    frequencyKey: "5x_week" as const,
    performanceValueOverride: undefined,
  },
  {
    id: "demo2",
    name: "Besprechung 1",
    roomTypeId: "besprechung",
    roomGroupId: "buero",
    area: 35,
    frequencyKey: "3x_week" as const,
    performanceValueOverride: undefined,
  },
  {
    id: "demo3",
    name: "WC Herren/Damen",
    roomTypeId: "sanitaer_gross",
    roomGroupId: "sanitaer",
    area: 18,
    frequencyKey: "5x_week" as const,
    performanceValueOverride: undefined,
  },
  {
    id: "demo4",
    name: "Empfangsbereich",
    roomTypeId: "empfang",
    roomGroupId: "buero",
    area: 40,
    frequencyKey: "5x_week" as const,
    performanceValueOverride: undefined,
  },
  {
    id: "demo5",
    name: "Flur OG",
    roomTypeId: "flur",
    roomGroupId: "verkehr",
    area: 80,
    frequencyKey: "1x_week" as const,
    performanceValueOverride: undefined,
  },
];
