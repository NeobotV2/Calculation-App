/* ─────────────────────────────────────────────────────────────────────────
   Objektliste: reine Filter-/Sortierlogik (Tab, Chips, Leistung, Suche).
   Alle Zahlen kommen aus computeObjectEconomics (für reine Raum-Objekte
   identisch mit den bisherigen Listenwerten); Status aus offer-readiness.
   ───────────────────────────────────────────────────────────────────────── */
import type { Project } from "@/store/use-store";
import { formatNumber } from "@/lib/utils";
import type { ObjectEconomics } from "@/lib/object-economics";
import {
  getObjectStatus,
  getOfferReadiness,
  type CompanyInfo,
  type ObjectStatus,
  type ObjectStatusKey,
  type OfferReadiness,
} from "@/lib/offer-readiness";

export type ObjectModuleKey = "unterhalt" | "winterdienst" | "hms";
export type ObjectsTab = "active" | "archived";
export type ObjectsChip = "all" | "weak" | "high_hours" | "review";
export type ObjectsModuleFilter = "all" | "winterdienst" | "hms";
export type ObjectsSortKey = "name" | "modules" | "price" | "margin" | "hours" | "area" | "status" | "updated";
export type SortDir = "asc" | "desc";

export interface ObjectsSort {
  id: ObjectsSortKey;
  dir: SortDir;
}

export interface ObjectsFilterState {
  search: string;
  tab: ObjectsTab;
  chip: ObjectsChip;
  module: ObjectsModuleFilter;
}

export const DEFAULT_OBJECTS_FILTER: ObjectsFilterState = { search: "", tab: "active", chip: "all", module: "all" };
export const DEFAULT_OBJECTS_SORT: ObjectsSort = { id: "updated", dir: "desc" };

/** Bisherige Schwelle „Hoher Stundenanteil" (Std./Monat), jetzt auf laborHoursMonthly. */
export const HIGH_HOURS_THRESHOLD = 80;

export const OBJECTS_CHIP_LABELS: Record<ObjectsChip, string> = {
  all: "Alle",
  weak: "Schwach kalkuliert",
  high_hours: "Hoher Stundenanteil",
  review: "Prüfung offen",
};

export const OBJECTS_MODULE_FILTER_LABELS: Record<ObjectsModuleFilter, string> = {
  all: "Alle Leistungen",
  winterdienst: "Mit Winterdienst",
  hms: "Mit Hausmeisterservice",
};

export const OBJECTS_SORT_LABELS: Record<ObjectsSortKey, string> = {
  name: "Objekt",
  modules: "Leistungen",
  price: "Monatspreis",
  margin: "Marge",
  hours: "Std./Monat",
  area: "Fläche",
  status: "Status",
  updated: "Geändert",
};

/** Prozent mit einer Nachkommastelle und typografischem Minus (U+2212), z. B. „−3,2 %". */
export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "–";
  const text = formatNumber(Math.abs(value), decimals);
  const isZero = text === formatNumber(0, decimals);
  return `${value < 0 && !isZero ? "−" : ""}${text} %`;
}

export interface ObjectRow {
  project: Project;
  econ: ObjectEconomics;
  readiness: OfferReadiness;
  status: ObjectStatus;
  modules: ObjectModuleKey[];
}

/**
 * Aktive Leistungen eines Objekts. Unterhaltsreinigung zählt, wenn Räume
 * vorhanden sind ODER kein anderes Modul aktiv ist (Altobjekte unverändert).
 */
export function getObjectModules(project: Project): ObjectModuleKey[] {
  const wd = !!project.winterdienst?.enabled;
  const hms = !!project.hms?.enabled;
  const modules: ObjectModuleKey[] = [];
  if (project.rooms.length > 0 || (!wd && !hms)) modules.push("unterhalt");
  if (wd) modules.push("winterdienst");
  if (hms) modules.push("hms");
  return modules;
}

export function buildObjectRow(project: Project, econ: ObjectEconomics, company: CompanyInfo): ObjectRow {
  const readiness = getOfferReadiness(project, econ, company);
  return { project, econ, readiness, status: getObjectStatus(project, readiness), modules: getObjectModules(project) };
}

function norm(v: string | undefined | null): string {
  return (v ?? "").toLocaleLowerCase("de-DE").trim();
}

/** Suche in Name, Kunde und Standort (Groß-/Kleinschreibung egal). */
export function matchesObjectSearch(project: Project, search: string): boolean {
  const q = norm(search);
  if (!q) return true;
  return [project.name, project.customer, project.location].some((v) => norm(v).includes(q));
}

export function matchesObjectChip(row: ObjectRow, chip: ObjectsChip): boolean {
  switch (chip) {
    case "weak":
      return row.econ.strategy.status !== "gesund";
    case "high_hours":
      return row.econ.totals.laborHoursMonthly > HIGH_HOURS_THRESHOLD;
    case "review":
      return row.status.key === "pruefung_offen";
    default:
      return true;
  }
}

export function matchesObjectModule(row: ObjectRow, module: ObjectsModuleFilter): boolean {
  if (module === "all") return true;
  return row.modules.includes(module);
}

export function matchesObjectTab(project: Project, tab: ObjectsTab): boolean {
  return tab === "archived" ? project.status === "archived" : project.status !== "archived";
}

export function filterObjectRows(rows: readonly ObjectRow[], f: ObjectsFilterState): ObjectRow[] {
  return rows.filter(
    (r) =>
      matchesObjectTab(r.project, f.tab) &&
      matchesObjectChip(r, f.chip) &&
      matchesObjectModule(r, f.module) &&
      matchesObjectSearch(r.project, f.search),
  );
}

/** Filter außer dem Tab aktiv? (für „Keine Treffer" vs. „Noch keine Objekte"). */
export function hasActiveObjectFilters(f: ObjectsFilterState): boolean {
  return f.search.trim() !== "" || f.chip !== "all" || f.module !== "all";
}

export function countObjectsByTab(rows: readonly ObjectRow[]): Record<ObjectsTab, number> {
  let archived = 0;
  for (const r of rows) if (r.project.status === "archived") archived += 1;
  return { active: rows.length - archived, archived };
}

const STATUS_RANK: Record<ObjectStatusKey, number> = {
  pruefung_offen: 0,
  entwurf: 1,
  angebotsbereit: 2,
  archiviert: 3,
};

const MODULE_RANK: Record<ObjectModuleKey, number> = { unterhalt: 1, winterdienst: 2, hms: 4 };

function time(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Vergleichswert einer Spalte (auch `sortValue` der DataTable). */
export function objectSortValue(row: ObjectRow, key: ObjectsSortKey): string | number {
  switch (key) {
    case "name":
      return row.project.name;
    case "modules":
      return row.modules.reduce((n, m) => n + MODULE_RANK[m], 0);
    case "price":
      return row.econ.totals.priceMonthly;
    case "margin":
      return row.econ.strategy.marginPct;
    case "hours":
      return row.econ.totals.laborHoursMonthly;
    case "area":
      return row.econ.totals.cleaning.area;
    case "status":
      return STATUS_RANK[row.status.key];
    case "updated":
      return time(row.project.updatedAt);
  }
}

/** Stabile Sortierung; Texte nach deutscher Collation. */
export function sortObjectRows(rows: readonly ObjectRow[], sort: ObjectsSort): ObjectRow[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const va = objectSortValue(a.row, sort.id);
      const vb = objectSortValue(b.row, sort.id);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "de", { numeric: true, sensitivity: "base" });
      return cmp * factor || a.index - b.index;
    })
    .map((x) => x.row);
}
