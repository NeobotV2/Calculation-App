import { createDefaultWinterdienst, WINTER_AREA_TYPES, WINTER_REGION_PRESETS, WINTER_DEFAULT_REGION } from "@/data/winterdienst";
import { HMS_CATALOG_BY_ID, HMS_DEFAULTS } from "@/data/hausmeisterservice";
import { normalizeMonths } from "./util";
import type {
  ClearingMethod, HmsActual, HmsConfig, HmsTask, HmsUnit, MaterialOverride, ServiceActuals, SpreadMaterial,
  WinterArea, WinterAreaType, WinterBillingMode, WinterdienstActual, WinterdienstConfig, WinterRegion,
} from "./types";

/* Unbekannte Daten (Supabase-JSONB, JSON-Import) → gültige Config oder undefined.
   Klemmt Werte statt sie abzulehnen. Fehlt `enabled`, wird false angenommen:
   importierte Fremddaten verändern so nie unbemerkt einen Preis. */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, fb: string) => (typeof v === "string" ? v : fb);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fb: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fb;
/** Endliche Zahl in [min, max], sonst Fallback. */
const numIn = (v: unknown, min: number, max: number, fb: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
/** Optionale Zahl > 0 (≤ max) oder undefined. */
const optPos = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(max, v) : undefined;
/** Optionale Zahl ≥ 0 (≤ max) oder undefined. */
const optNonNeg = (v: unknown, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(max, v) : undefined;

const REGIONS = Object.keys(WINTER_REGION_PRESETS) as WinterRegion[];
const AREA_TYPES = Object.keys(WINTER_AREA_TYPES) as WinterAreaType[];
const METHODS: readonly ClearingMethod[] = ["manuell", "maschinell"];
const MATERIALS: readonly SpreadMaterial[] = ["salz", "splitt", "granulat"];
const BILLING: readonly WinterBillingMode[] = ["pauschale_12", "pauschale_saison", "pro_einsatz"];
const UNITS: readonly HmsUnit[] = ["pauschal", "m2", "stueck", "lfm", "kontingent"];
const MAX_AREAS = 200;
const MAX_TASKS = 100;
const MAX_ACTUALS = 50;

export function sanitizeWinterdienst(raw: unknown): WinterdienstConfig | undefined {
  if (!isObj(raw)) return undefined;
  const region = oneOf(raw.region, REGIONS, WINTER_DEFAULT_REGION);
  const d = createDefaultWinterdienst(region);
  const months = normalizeMonths(Array.isArray(raw.seasonMonths) ? raw.seasonMonths : undefined);

  const areas: WinterArea[] = (Array.isArray(raw.areas) ? raw.areas : [])
    .filter(isObj)
    .slice(0, MAX_AREAS)
    .map((a, i) => {
      const type = oneOf(a.type, AREA_TYPES, "sonstige");
      return {
        id: str(a.id, `wd-area-${i + 1}`),
        label: str(a.label, WINTER_AREA_TYPES[type].label),
        type,
        areaM2: numIn(a.areaM2, 0, 1_000_000, 0),
        method: oneOf(a.method, METHODS, WINTER_AREA_TYPES[type].defaultMethod),
        clear: typeof a.clear === "boolean" ? a.clear : true,
        spread: typeof a.spread === "boolean" ? a.spread : true,
        clearingPerfM2h: optPos(a.clearingPerfM2h, 100_000),
        spreadingPerfM2h: optPos(a.spreadingPerfM2h, 100_000),
        material: typeof a.material === "string" && (MATERIALS as readonly string[]).includes(a.material) ? (a.material as SpreadMaterial) : undefined,
      };
    });

  let materialOverrides: Partial<Record<SpreadMaterial, MaterialOverride>> | undefined;
  if (isObj(raw.materialOverrides)) {
    const mo: Obj = raw.materialOverrides;
    materialOverrides = {};
    for (const m of MATERIALS) {
      const o = mo[m];
      if (isObj(o)) materialOverrides[m] = { gramsPerM2: optNonNeg(o.gramsPerM2, 5_000), pricePerKg: optNonNeg(o.pricePerKg, 100) };
    }
  }

  return {
    schemaVersion: 1,
    enabled: raw.enabled === true,
    region,
    seasonMonths: months.length > 0 ? months : d.seasonMonths,
    expectedEinsaetze: numIn(raw.expectedEinsaetze, 0, 365, d.expectedEinsaetze),
    clearingSharePct: numIn(raw.clearingSharePct, 0, 100, d.clearingSharePct),
    areas,
    material: oneOf(raw.material, MATERIALS, d.material),
    materialOverrides,
    materialMarkupPct: numIn(raw.materialMarkupPct, 0, 500, d.materialMarkupPct),
    saltRestricted: raw.saltRestricted === true,
    travelMinutesPerEinsatz: numIn(raw.travelMinutesPerEinsatz, 0, 600, d.travelMinutesPerEinsatz),
    documentationMinutesPerEinsatz: numIn(raw.documentationMinutesPerEinsatz, 0, 120, d.documentationMinutesPerEinsatz),
    seasonSetupHours: numIn(raw.seasonSetupHours, 0, 1_000, d.seasonSetupHours),
    standbyFeeMonthly: numIn(raw.standbyFeeMonthly, 0, 1_000_000, d.standbyFeeMonthly),
    standbyCostMonthly: numIn(raw.standbyCostMonthly, 0, 1_000_000, d.standbyCostMonthly),
    offHoursSharePct: numIn(raw.offHoursSharePct, 0, 100, d.offHoursSharePct),
    offHoursSurchargePct: numIn(raw.offHoursSurchargePct, 0, 200, d.offHoursSurchargePct),
    offHoursWageSurchargePct: optNonNeg(raw.offHoursWageSurchargePct, 200),
    liabilitySurchargePct: numIn(raw.liabilitySurchargePct, 0, 100, d.liabilitySurchargePct),
    riskProvisionPct: numIn(raw.riskProvisionPct, 0, 100, d.riskProvisionPct),
    machineRatePerHour: numIn(raw.machineRatePerHour, 0, 10_000, d.machineRatePerHour),
    machineCostPerHour: numIn(raw.machineCostPerHour, 0, 10_000, d.machineCostPerHour),
    billingMode: oneOf(raw.billingMode, BILLING, d.billingMode),
    capEinsaetze: optNonNeg(raw.capEinsaetze, 365),
    clearingWindowHours: numIn(raw.clearingWindowHours, 0.5, 24, d.clearingWindowHours),
    rateOverride: optPos(raw.rateOverride, 1_000),
    vollkostenOverride: optPos(raw.vollkostenOverride, 1_000),
  };
}

export function sanitizeHms(raw: unknown): HmsConfig | undefined {
  if (!isObj(raw)) return undefined;
  const tasks: HmsTask[] = [];
  for (const [i, t] of (Array.isArray(raw.tasks) ? raw.tasks : []).filter(isObj).slice(0, MAX_TASKS).entries()) {
    const catalogId = typeof t.catalogId === "string" ? t.catalogId : undefined;
    const cat = catalogId ? HMS_CATALOG_BY_ID[catalogId] : undefined;
    const unit = typeof t.unit === "string" && (UNITS as readonly string[]).includes(t.unit) ? (t.unit as HmsUnit) : cat?.unit;
    if (!unit) continue; // ohne gültige Einheit nicht berechenbar
    const months = normalizeMonths(Array.isArray(t.seasonMonths) ? t.seasonMonths : undefined);
    tasks.push({
      id: str(t.id, `hms-task-${i + 1}`),
      catalogId,
      label: str(t.label, cat?.label ?? "Leistung"),
      unit,
      quantity: numIn(t.quantity, 0, 1_000_000, 0),
      minutesPerUnit: optNonNeg(t.minutesPerUnit, 10_000),
      perfM2h: optPos(t.perfM2h, 100_000),
      frequencyPerYear: numIn(t.frequencyPerYear, 0, 366, 0),
      seasonMonths: months.length > 0 ? months : undefined,
      materialCostPerYear: optNonNeg(t.materialCostPerYear, 10_000_000),
      enabled: typeof t.enabled === "boolean" ? t.enabled : true,
    });
  }
  return {
    schemaVersion: 1,
    enabled: raw.enabled === true,
    tasks,
    travelMinutesPerVisitDay: numIn(raw.travelMinutesPerVisitDay, 0, 600, HMS_DEFAULTS.travelMinutesPerVisitDay),
    visitDaysPerYear: optNonNeg(raw.visitDaysPerYear, 366),
    materialMarkupPct: numIn(raw.materialMarkupPct, 0, 500, HMS_DEFAULTS.materialMarkupPct),
    contingentOverageBilled: typeof raw.contingentOverageBilled === "boolean" ? raw.contingentOverageBilled : HMS_DEFAULTS.contingentOverageBilled,
    rateOverride: optPos(raw.rateOverride, 1_000),
    vollkostenOverride: optPos(raw.vollkostenOverride, 1_000),
  };
}

export function sanitizeServiceActuals(raw: unknown): ServiceActuals | undefined {
  if (!isObj(raw)) return undefined;
  const wd: WinterdienstActual[] = (Array.isArray(raw.winterdienst) ? raw.winterdienst : [])
    .filter(isObj)
    .filter((a) => typeof a.season === "string" && typeof a.einsaetze === "number" && Number.isFinite(a.einsaetze) && a.einsaetze >= 0)
    .slice(0, MAX_ACTUALS)
    .map((a, i) => ({
      id: str(a.id, `wd-ist-${i + 1}`),
      season: a.season as string,
      einsaetze: a.einsaetze as number,
      laborHours: optNonNeg(a.laborHours, 100_000),
      materialKg: optNonNeg(a.materialKg, 10_000_000),
      note: typeof a.note === "string" ? a.note : undefined,
      recordedAt: str(a.recordedAt, ""),
    }));
  const hms: HmsActual[] = (Array.isArray(raw.hms) ? raw.hms : [])
    .filter(isObj)
    .filter((a) => typeof a.year === "number" && Number.isInteger(a.year) && typeof a.laborHours === "number" && Number.isFinite(a.laborHours) && a.laborHours >= 0)
    .slice(0, MAX_ACTUALS)
    .map((a, i) => ({
      id: str(a.id, `hms-ist-${i + 1}`),
      year: a.year as number,
      laborHours: a.laborHours as number,
      contingentHoursUsed: optNonNeg(a.contingentHoursUsed, 100_000),
      note: typeof a.note === "string" ? a.note : undefined,
      recordedAt: str(a.recordedAt, ""),
    }));
  if (wd.length === 0 && hms.length === 0) return undefined;
  return { winterdienst: wd.length > 0 ? wd : undefined, hms: hms.length > 0 ? hms : undefined };
}
