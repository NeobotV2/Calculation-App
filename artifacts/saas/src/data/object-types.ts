/**
 * Objektarten für die Objektdaten (Chip-Auswahl). Die Schlüssel entsprechen
 * HMS_PRESETS_BY_OBJECT_TYPE (Vorauswahl Hausmeisterservice) plus „Sonstiges“.
 * Werte bleiben unverändert, weil sie als Freitext in project.objectType
 * gespeichert sind.
 */
export const OBJECT_TYPES: readonly string[] = [
  "Büro",
  "Praxis",
  "Schule",
  "Hotel",
  "Einzelhandel",
  "Industrie",
  "Wohnanlage",
  "Öffentlich",
  "Sonstiges",
];
