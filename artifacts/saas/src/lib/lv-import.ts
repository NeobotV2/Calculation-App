import { DEFAULT_ROOM_TYPES, type RoomTypeData } from "@/data/room-types";
import type { FrequencyKey, Room } from "@/store/use-store";

/* ─────────────────────────────────────────────────────────────────────────
   LV-Import für Ausschreibungen: liest Leistungsverzeichnisse aus
   CSV- (Excel-Export, ;/,/Tab-getrennt) oder JSON-Dateien und ordnet jede
   Position per Namens-Matching einer Raumart (BIV/RAL-Leistungswert) zu.
   Reine Funktionen ohne DOM/Store — vollständig testbar.
   ───────────────────────────────────────────────────────────────────────── */

export type ParsedRoom = Omit<Room, "id"> & {
  /** true, wenn die Raumart eindeutig erkannt wurde (sonst Standardwert). */
  matched: boolean;
  /** Originalbezeichnung aus der Datei (für Warnhinweise). */
  sourceName: string;
};

export interface LvImportResult {
  rooms: ParsedRoom[];
  warnings: string[];
}

const FALLBACK_TYPE: RoomTypeData =
  DEFAULT_ROOM_TYPES.find((t) => t.name === "Einzelbüro") ?? DEFAULT_ROOM_TYPES[0];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ordnet eine LV-Bezeichnung der passendsten Raumart zu (Score-basiert). */
export function matchRoomType(rawName: string): { type: RoomTypeData; matched: boolean } {
  const q = normalize(rawName);
  if (!q) return { type: FALLBACK_TYPE, matched: false };

  let best: RoomTypeData | null = null;
  let bestScore = 0;

  for (const t of DEFAULT_ROOM_TYPES) {
    const name = normalize(t.name);
    let score = 0;
    if (name === q) score = 100;
    else if (q.includes(name)) score = 60 + Math.min(name.length, 30);
    else if (name.includes(q)) score = 50 + Math.min(q.length, 30);
    else {
      // Token-Überschneidung inkl. Komposita: „Büro 1.OG links" trifft
      // „Einzelbüro", weil das Token „buero" im Typnamen enthalten ist.
      const qTokens = q.split(" ").filter((tok) => tok.length >= 3 && !/^\d+$/.test(tok));
      const nTokens = name.split(" ");
      let overlap = 0;
      for (const tok of qTokens) {
        if (name.includes(tok) || nTokens.some((nt) => nt.length >= 3 && tok.includes(nt))) {
          overlap++;
        }
      }
      if (overlap > 0) score = 20 + overlap * 10;
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  if (best && bestScore >= 30) return { type: best, matched: true };
  return { type: FALLBACK_TYPE, matched: false };
}

/** Interpretiert deutsche Intervall-Angaben („5x wöchentlich", „werktäglich" …). */
export function parseFrequency(raw: string | undefined): FrequencyKey | undefined {
  if (!raw) return undefined;
  const s = normalize(String(raw));
  if (!s) return undefined;

  if (/(arbeitstaegl|werktaegl|mo\s*-\s*fr)/.test(s)) return "5x_week";
  if (/(14\s*-?\s*taegig|alle\s*14|zweiwoechentlich|14\s*tage)/.test(s)) return "biweekly";
  if (/monat/.test(s) && !/x/.test(s)) return "monthly";
  if (/taegl/.test(s)) return "7x_week";

  const m = s.match(/([1-7])\s*(?:x|mal)?\s*(?:woechentlich|pro woche|woche|wtl)?/);
  if (m) {
    const n = Number(m[1]);
    if (n === 1) return "1x_week";
    if (n >= 2 && n <= 7) return `${n}x_week` as FrequencyKey;
  }
  return undefined;
}

/** Deutsche Zahl („1.234,56", „230 m²") → number; NaN bei Unlesbarem. */
export function parseGermanNumber(raw: string): number {
  const cleaned = String(raw)
    .replace(/m²|qm|m2/gi, "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!cleaned) return NaN;
  // 1.234,56 → 1234.56 | 1234,56 → 1234.56 | 1234.5 bleibt
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  return parseFloat(normalized);
}

function buildRoom(
  name: string,
  area: number,
  freq: FrequencyKey,
): ParsedRoom {
  const { type, matched } = matchRoomType(name);
  return {
    name: name.trim(),
    typeId: type.id,
    typeName: type.name,
    groupId: type.groupId,
    groupName: type.groupName,
    area,
    frequency: freq,
    typePerformance: type.performanceValue,
    matched,
    sourceName: name.trim(),
  };
}

const SUM_ROW = /^(summe|gesamt|total|zwischensumme)/i;

function detectDelimiter(line: string): string {
  const counts: Array<[string, number]> = [
    [";", (line.match(/;/g) || []).length],
    ["\t", (line.match(/\t/g) || []).length],
    [",", (line.match(/,/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ";";
}

function parseCsv(text: string, defaultFrequency: FrequencyKey): LvImportResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rooms: [], warnings: ["Die Datei ist leer."] };

  const delim = detectDelimiter(lines[0]);
  const rows = lines.map((l) => l.split(delim).map((c) => c.replace(/^"|"$/g, "").trim()));

  // Header erkennen und Spalten zuordnen
  const headerNorm = rows[0].map((c) => normalize(c));
  const hasHeader = headerNorm.some((c) =>
    /(flaeche|m2|qm|raum|bezeichnung|position|leistung|intervall|haeufig)/.test(c),
  );

  let nameCol = 0;
  let areaCol = 1;
  let freqCol = -1;

  if (hasHeader) {
    const findCol = (re: RegExp) => headerNorm.findIndex((c) => re.test(c));
    const n = findCol(/(bezeichnung|raum(?!\w*grupp)|beschreibung|position|leistung)/);
    const a = findCol(/(flaeche|m2|qm|groesse)/);
    const f = findCol(/(haeufig|intervall|turnus|frequenz|reinigungstage)/);
    if (n >= 0) nameCol = n;
    if (a >= 0) areaCol = a;
    freqCol = f;
    if (a < 0) warnings.push("Keine Flächen-Spalte erkannt — zweite Spalte wird als Fläche interpretiert.");
  }

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const rooms: ParsedRoom[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const rawName = row[nameCol] ?? "";
    if (!rawName || SUM_ROW.test(rawName)) continue;
    const area = parseGermanNumber(row[areaCol] ?? "");
    if (!Number.isFinite(area) || area <= 0) {
      skipped++;
      continue;
    }
    const freq =
      (freqCol >= 0 ? parseFrequency(row[freqCol]) : undefined) ?? defaultFrequency;
    rooms.push(buildRoom(rawName, area, freq));
  }

  if (skipped > 0) warnings.push(`${skipped} Zeile(n) ohne gültige Fläche übersprungen.`);
  return { rooms, warnings };
}

function parseJson(text: string, defaultFrequency: FrequencyKey): LvImportResult {
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { rooms: [], warnings: ["Die JSON-Datei konnte nicht gelesen werden."] };
  }

  // App-Export: { projects: [{ rooms: [...] }] } — Räume aller Projekte übernehmen
  const obj = data as Record<string, unknown>;
  let rawRooms: unknown[] = [];
  if (Array.isArray(data)) {
    rawRooms = data;
  } else if (obj && Array.isArray(obj.rooms)) {
    rawRooms = obj.rooms as unknown[];
  } else if (obj && Array.isArray(obj.projects)) {
    for (const p of obj.projects as Array<Record<string, unknown>>) {
      if (Array.isArray(p?.rooms)) rawRooms.push(...(p.rooms as unknown[]));
    }
  }

  if (rawRooms.length === 0) {
    return { rooms: [], warnings: ["Keine Räume in der JSON-Datei gefunden."] };
  }

  const rooms: ParsedRoom[] = [];
  let skipped = 0;
  for (const r of rawRooms as Array<Record<string, unknown>>) {
    if (!r || typeof r !== "object") continue;
    const name = String(r.name ?? r.bezeichnung ?? r.typeName ?? "").trim();
    const area =
      typeof r.area === "number" ? r.area : parseGermanNumber(String(r.area ?? r.flaeche ?? ""));
    if (!name || !Number.isFinite(area) || area <= 0) {
      skipped++;
      continue;
    }
    const freq =
      (typeof r.frequency === "string" &&
      ["monthly", "biweekly", "1x_week", "2x_week", "3x_week", "4x_week", "5x_week", "6x_week", "7x_week"].includes(r.frequency)
        ? (r.frequency as FrequencyKey)
        : parseFrequency(typeof r.frequency === "string" ? r.frequency : undefined)) ?? defaultFrequency;

    // Vollständige Raumdaten aus App-Export direkt übernehmen
    if (typeof r.typeId === "string" && typeof r.typePerformance === "number") {
      rooms.push({
        name,
        typeId: r.typeId,
        typeName: String(r.typeName ?? name),
        groupId: String(r.groupId ?? FALLBACK_TYPE.groupId),
        groupName: String(r.groupName ?? FALLBACK_TYPE.groupName),
        area,
        frequency: freq,
        typePerformance: r.typePerformance,
        customPerformance: typeof r.customPerformance === "number" ? r.customPerformance : undefined,
        soilingLevel: typeof r.soilingLevel === "string" ? r.soilingLevel : undefined,
        furnishingLevel: typeof r.furnishingLevel === "string" ? r.furnishingLevel : undefined,
        floorType: typeof r.floorType === "string" ? r.floorType : undefined,
        matched: true,
        sourceName: name,
      });
    } else {
      rooms.push(buildRoom(name, area, freq));
    }
  }
  if (skipped > 0) warnings.push(`${skipped} Einträge ohne Name/Fläche übersprungen.`);
  return { rooms, warnings };
}

/** Haupteinstieg: erkennt das Format anhand von Dateiname/Inhalt. */
export function parseLvFile(
  text: string,
  filename: string,
  defaultFrequency: FrequencyKey = "5x_week",
): LvImportResult {
  const trimmed = text.trim();
  const isJson = filename.toLowerCase().endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[");
  const result = isJson ? parseJson(text, defaultFrequency) : parseCsv(text, defaultFrequency);

  const unmatched = result.rooms.filter((r) => !r.matched).length;
  if (unmatched > 0) {
    result.warnings.push(
      `${unmatched} Raumart(en) nicht erkannt — Standard-Leistungswert (${FALLBACK_TYPE.name}, ${FALLBACK_TYPE.performanceValue} m²/h) verwendet. Bitte prüfen.`,
    );
  }
  return result;
}
