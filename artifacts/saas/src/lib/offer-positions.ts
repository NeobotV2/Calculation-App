/* ─────────────────────────────────────────────────────────────────────────
   Angebotspositionen — EINE Quelle für Prüfschritt, Arbeitsbereich, Angebot,
   interne Kalkulation und Controlling. Invariante: Σ priceMonthly aller
   Gruppen === totals.priceMonthly (± 1e-9). Rüst-/Wegezeit, Winterdienst und
   Hausmeisterservice erscheinen als eigene Zeilen.
   ───────────────────────────────────────────────────────────────────────── */
import { calcRoom, FREQUENCY_FACTORS, FREQUENCY_LABELS } from "@/lib/calc";
import type { ObjectTotals } from "@/lib/object-totals";
import { effectiveMethod } from "@/lib/service-modules/winterdienst";
import { contingentScopeText, formatSeason, hmsTaskFrequencyText } from "@/lib/service-modules/util";
import type { HmsUnit, SpreadMaterial, WinterArea } from "@/lib/service-modules/types";
import { WINTER_AREA_TYPES } from "@/data/winterdienst";
import type { FrequencyKey, Project } from "@/store/use-store";

export type OfferModuleKey = "unterhalt" | "winterdienst" | "hms";
export type OfferPositionKind = "room" | "ruestzeit" | "wegezeit" | "wd_service" | "wd_standby" | "hms_task" | "hms_travel";
export type OfferQuantityUnit = "m²" | "Stk." | "lfm" | "Std." | "Min." | "pauschal";

export interface OfferPosition {
  /** Raum-ID, Aufgaben-ID oder fester Schlüssel ("ruestzeit", "wegezeit", "wd_service", "wd_standby", "hms_travel"). */
  id: string;
  module: OfferModuleKey;
  kind: OfferPositionKind;
  label: string;
  sublabel?: string;
  /** Nur Räume: Raumgruppe für gruppierte Darstellung. */
  groupId?: string;
  groupName?: string;
  quantity?: { value: number; unit: OfferQuantityUnit };
  frequencyLabel?: string;
  /** Nur intern / Detailansicht: wirksamer Leistungswert m²/h. */
  performanceM2h?: number;
  /** Nur intern: Ø-Stunden je Monat. */
  hoursMonthly: number;
  /** Ø-Monatspreis netto dieser Position. */
  priceMonthly: number;
}

/** Unbepreiste Detailzeile, z. B. Winterdienst-Fläche: „Gehweg“, „120 m²“, „Räumen und Streuen (Splitt), manuell“. */
export interface OfferDetailRow {
  label: string;
  quantity?: string;
  text: string;
}

export interface OfferPositionGroup {
  module: OfferModuleKey;
  label: string;
  positions: OfferPosition[];
  details: OfferDetailRow[];
  /** Σ positions.priceMonthly. */
  subtotalMonthly: number;
  /** Σ positions.hoursMonthly. */
  hoursMonthly: number;
}

export const OFFER_MODULE_LABELS: Record<OfferModuleKey, string> = {
  unterhalt: "Unterhaltsreinigung",
  winterdienst: "Winterdienst",
  hms: "Hausmeisterservice",
};

const HMS_UNIT_TO_OFFER: Record<HmsUnit, OfferQuantityUnit> = {
  pauschal: "pauschal",
  m2: "m²",
  stueck: "Stk.",
  lfm: "lfm",
  kontingent: "Std.",
};

const MATERIAL_SHORT: Record<SpreadMaterial, string> = {
  salz: "Salz",
  splitt: "Splitt",
  granulat: "Granulat, salzfrei",
};

const num = (v: number, maxDigits = 1) => v.toLocaleString("de-DE", { maximumFractionDigits: maxDigits });
/** Kaufmännisch auf Cent (wie round2 in offer-meta), damit Position und Abrechnungstext denselben Betrag zeigen. */
const cents = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  const r = Math.round(Math.abs(v) * 100 + 1e-6) / 100;
  return v < 0 && r !== 0 ? -r : r;
};
const eur = (v: number) => cents(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function group(module: OfferModuleKey, positions: OfferPosition[], details: OfferDetailRow[] = []): OfferPositionGroup {
  return {
    module,
    label: OFFER_MODULE_LABELS[module],
    positions,
    details,
    subtotalMonthly: positions.reduce((s, p) => s + p.priceMonthly, 0),
    hoursMonthly: positions.reduce((s, p) => s + p.hoursMonthly, 0),
  };
}

/** Turnus mit den meisten Einsätzen — Basis der Rüst-/Wegezeit (wie calcProjectTotals). */
function highestFrequency(project: Project): FrequencyKey | undefined {
  let best: FrequencyKey | undefined;
  for (const r of project.rooms) {
    if (best === undefined || FREQUENCY_FACTORS[r.frequency] > FREQUENCY_FACTORS[best]) best = r.frequency;
  }
  return best;
}

/** Leistungstext einer Winterdienst-Fläche, z. B. „Räumen und Streuen (Splitt), manuell“. */
export function winterAreaServiceText(area: WinterArea, defaultMaterial: SpreadMaterial): string {
  const work = area.clear && area.spread ? "Räumen und Streuen" : area.clear ? "Räumen" : area.spread ? "Streuen" : "keine Leistung";
  const material = area.spread ? ` (${MATERIAL_SHORT[area.material ?? defaultMaterial] ?? MATERIAL_SHORT.splitt})` : "";
  return `${work}${material}, ${effectiveMethod(area)}`;
}

export function buildOfferPositions(project: Project, totals: ObjectTotals, rate: number): OfferPositionGroup[] {
  const groups: OfferPositionGroup[] = [];

  /* ── Unterhaltsreinigung ── */
  if (project.rooms.length > 0) {
    const positions: OfferPosition[] = project.rooms.map((room) => {
      const rc = calcRoom(room, rate);
      const label = room.name || room.typeName;
      return {
        id: room.id,
        module: "unterhalt",
        kind: "room",
        label,
        sublabel: room.typeName && room.typeName !== label ? room.typeName : undefined,
        groupId: room.groupId,
        groupName: room.groupName,
        quantity: { value: room.area, unit: "m²" },
        frequencyLabel: FREQUENCY_LABELS[room.frequency],
        performanceM2h: rc.effectivePerformance,
        hoursMonthly: rc.monthlyHours,
        priceMonthly: rc.monthlyCost,
      };
    });
    const top = highestFrequency(project);
    const setupRow = (kind: "ruestzeit" | "wegezeit", label: string, minutes: number, hours: number): OfferPosition => ({
      id: kind,
      module: "unterhalt",
      kind,
      label,
      sublabel: "je Einsatz",
      quantity: { value: minutes, unit: "Min." },
      frequencyLabel: top ? FREQUENCY_LABELS[top] : undefined,
      hoursMonthly: hours,
      priceMonthly: hours * rate,
    });
    if (totals.cleaning.ruestzeitHours > 0) {
      positions.push(setupRow("ruestzeit", "Rüstzeit", project.ruestzeit ?? 0, totals.cleaning.ruestzeitHours));
    }
    if (totals.cleaning.wegezeitHours > 0) {
      positions.push(setupRow("wegezeit", "Wegezeit", project.wegezeit ?? 0, totals.cleaning.wegezeitHours));
    }
    groups.push(group("unterhalt", positions));
  }

  /* ── Winterdienst ── */
  const wd = totals.winterdienst;
  const wdCfg = project.winterdienst;
  if (wd && wdCfg) {
    const season = formatSeason(wd.seasonMonths);
    /*
     * Bereitschafts-/Vorhalteanteil — EINE Definition je Abrechnungsmodus:
     * - je Einsatz: der feste Saisonanteil F_U (Bereitschaft + Saisonvorbereitung),
     *   exakt der Betrag, den Abrechnungstext und Summenblock je Saisonmonat
     *   nennen (billing.installmentAmount = F_U / n).
     * - Pauschale: nur die Bereitschaftspauschale; sie ist Teil der Saisonpauschale
     *   und wird daher nicht als eigener Monatsbetrag ausgewiesen.
     */
    const perEinsatz = wd.billing.mode === "pro_einsatz";
    const showStandby = perEinsatz ? cents(wd.billing.installmentAmount) > 0 : wd.revenue.standby > 0;
    const standbySeason = !showStandby ? 0 : perEinsatz ? wd.fixedRevenueSeason : wd.revenue.standby;
    const positions: OfferPosition[] = [{
      id: "wd_service",
      module: "winterdienst",
      kind: "wd_service",
      label: `Winterdienst ${season} (kalkuliert ${num(wd.einsaetze)} Einsätze)`,
      sublabel: "Räum- und Streudienst, Ø pro Monat (Jahresmittel)",
      quantity: wd.areaM2Total > 0 ? { value: wd.areaM2Total, unit: "m²" } : undefined,
      frequencyLabel: `Saison ${season}`,
      hoursMonthly: wd.laborHoursMonthly,
      priceMonthly: (wd.revenue.total - standbySeason) / 12,
    }];
    if (showStandby) {
      positions.push({
        id: "wd_standby",
        module: "winterdienst",
        kind: "wd_standby",
        label: "Bereitschafts- und Vorhaltepauschale",
        sublabel: perEinsatz
          ? `${eur(wd.billing.installmentAmount)} € je Saisonmonat (${season}), Ø pro Monat`
          : "enthalten in der Saisonpauschale, Ø pro Monat",
        quantity: { value: 1, unit: "pauschal" },
        frequencyLabel: `Saison ${season}`,
        hoursMonthly: 0,
        priceMonthly: standbySeason / 12,
      });
    }
    const details: OfferDetailRow[] = wdCfg.areas.map((a) => ({
      label: a.label || (WINTER_AREA_TYPES[a.type] ?? WINTER_AREA_TYPES.sonstige).label,
      quantity: `${num(a.areaM2)} m²`,
      text: winterAreaServiceText(a, wdCfg.material),
    }));
    groups.push(group("winterdienst", positions, details));
  }

  /* ── Hausmeisterservice ── */
  const hms = totals.hms;
  const hmsCfg = project.hms;
  if (hms && hmsCfg) {
    // calcHms liefert die Ergebnisse der aktiven Leistungen in Konfigurationsreihenfolge.
    const enabled = hmsCfg.tasks.filter((t) => t.enabled);
    const positions: OfferPosition[] = enabled.map((t, i) => {
      const r = hms.tasks[i];
      return {
        id: t.id,
        module: "hms",
        kind: "hms_task",
        label: t.label,
        // Kontingent: Bezugszeitraum ausdrücklich nennen (H2: Jahresstunden = Menge × Perioden),
        // damit Kontingent und Mehrstunden-Klausel einen eindeutigen Bezug haben.
        sublabel: t.unit === "kontingent" ? contingentScopeText(t) : undefined,
        quantity: { value: t.quantity, unit: HMS_UNIT_TO_OFFER[t.unit] ?? "pauschal" },
        // Gleiche Quelle wie der Editor (TaskTable): nicht-monatliche Abrufperioden mit „· F× jährlich“.
        frequencyLabel: hmsTaskFrequencyText(t),
        performanceM2h: t.unit === "m2" && t.perfM2h ? t.perfM2h : undefined,
        hoursMonthly: (r?.hoursAnnual ?? 0) / 12,
        priceMonthly: (r?.revenueAnnual ?? 0) / 12,
      };
    });
    if (hms.travelHoursAnnual > 0) {
      positions.push({
        id: "hms_travel",
        module: "hms",
        kind: "hms_travel",
        label: `Anfahrten (${num(hms.visitDaysPerYear)} Einsatztage)`,
        frequencyLabel: `${num(hms.visitDaysPerYear)}× jährlich`,
        hoursMonthly: hms.travelHoursAnnual / 12,
        priceMonthly: (hms.travelHoursAnnual * hms.rate) / 12,
      });
    }
    groups.push(group("hms", positions));
  }

  return groups;
}

/** Σ priceMonthly über alle Gruppen (entspricht totals.priceMonthly). */
export function sumOfferPositions(groups: OfferPositionGroup[]): number {
  return groups.reduce((s, g) => s + g.subtotalMonthly, 0);
}
