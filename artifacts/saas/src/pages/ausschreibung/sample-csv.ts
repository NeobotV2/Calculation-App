/* ─────────────────────────────────────────────────────────────────────────
   Beispiel-Leistungsverzeichnis für den Ausschreibungs-Import. Das Format
   entspricht einem Excel-CSV-Export (Semikolon, deutsche Dezimalzahlen) und
   wird von `lib/lv-import` ohne Warnungen gelesen (siehe Test).
   ───────────────────────────────────────────────────────────────────────── */

export const SAMPLE_LV_FILENAME = "beispiel-leistungsverzeichnis.csv";

export const SAMPLE_LV_ROWS: readonly (readonly [name: string, area: string, frequency: string])[] = [
  ["Großraumbüro EG", "180", "5x wöchentlich"],
  ["Einzelbüro 1.OG", "24,5", "5x wöchentlich"],
  ["Besprechungsraum", "35", "3x wöchentlich"],
  ["Flur / Gang", "120", "5x wöchentlich"],
  ["WC / Sanitär klein", "18", "werktäglich"],
  ["Teeküche", "15", "5x wöchentlich"],
  ["Treppe", "40", "2x wöchentlich"],
  ["Lager / Archiv", "60", "14-tägig"],
];

export const SAMPLE_LV_HEADER = ["Bezeichnung", "Fläche (m²)", "Häufigkeit"] as const;

/** CSV-Text (Semikolon, CRLF) ohne Byte-Order-Mark. */
export const SAMPLE_LV_CSV: string = [SAMPLE_LV_HEADER, ...SAMPLE_LV_ROWS].map((row) => row.join(";")).join("\r\n");

/** Mit UTF-8-BOM, damit Excel Umlaute korrekt anzeigt. */
export function sampleCsvFileText(): string {
  return `﻿${SAMPLE_LV_CSV}\r\n`;
}

export function createSampleCsvBlob(): Blob {
  return new Blob([sampleCsvFileText()], { type: "text/csv;charset=utf-8" });
}

/** Startet den Download der Beispiel-CSV im Browser. */
export function downloadSampleCsv(): void {
  const url = URL.createObjectURL(createSampleCsvBlob());
  const a = document.createElement("a");
  a.href = url;
  a.download = SAMPLE_LV_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
