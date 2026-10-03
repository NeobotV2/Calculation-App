import { Building2, Calculator, Database, Layers, Palette, ShieldCheck, type LucideIcon } from "lucide-react";

/** Bereiche der Einstellungen (Route `/einstellungen/:bereich?`). */
export type SettingsSectionId = "firma" | "kalkulation" | "pruefregeln" | "raumarten" | "darstellung" | "daten";

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const SETTINGS_SECTIONS: readonly SettingsSectionMeta[] = [
  {
    id: "firma",
    label: "Firma & Angebot",
    description: "Firmendaten, Logo, Kopf- und Fußzeile und MwSt. für Ihre Angebote",
    icon: Building2,
  },
  {
    id: "kalkulation",
    label: "Kalkulation",
    description: "Standard-Verrechnungssatz und Standardturnus für neue Räume",
    icon: Calculator,
  },
  {
    id: "pruefregeln",
    label: "Prüfregeln & Ziele",
    description: "Gewinnaufschlag als Ziel und Plausibilitätsprüfungen",
    icon: ShieldCheck,
  },
  {
    id: "raumarten",
    label: "Raumarten",
    description: "Eigene Raumarten mit Leistungswerten",
    icon: Layers,
  },
  {
    id: "darstellung",
    label: "Darstellung",
    description: "Farbschema Hell, Dunkel oder wie das System",
    icon: Palette,
  },
  {
    id: "daten",
    label: "Daten",
    description: "Export, Import und Zurücksetzen",
    icon: Database,
  },
];

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = SETTINGS_SECTIONS.map((s) => s.id);

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "firma";

export function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return typeof value === "string" && (SETTINGS_SECTION_IDS as readonly string[]).includes(value);
}

export function getSettingsSection(id: SettingsSectionId): SettingsSectionMeta {
  return SETTINGS_SECTIONS.find((s) => s.id === id) ?? SETTINGS_SECTIONS[0];
}

/** Route eines Bereichs; ohne id die Übersicht. */
export function settingsHref(id?: SettingsSectionId): string {
  return id ? `/einstellungen/${id}` : "/einstellungen";
}
