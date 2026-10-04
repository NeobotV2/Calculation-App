/* ─────────────────────────────────────────────────────────────────────────
   Angebotsreife, Objektstatus und nächster Schritt — EINE Quelle für
   Statusbadges (Start, Objekte, Arbeitsbereich, Controlling), die Prüfliste
   im Flow und den Angebots-Check. Rein, ohne UI-Importe.
   ───────────────────────────────────────────────────────────────────────── */
import type { Project } from "@/store/use-store";
import type { WarningSeverity } from "@/lib/warnings";
import type { ObjectEconomics } from "@/lib/object-economics";
import { withMinusSign } from "@/lib/utils";

export type ReadinessLevel = "blocker" | "critical" | "offer" | "hint";

/** Schritte des Kalkulations-Flows (Reihenfolge = FLOW_STEP_ORDER). */
export type FlowStepId = "leistungen" | "objekt" | "raeume" | "winterdienst" | "hms" | "preis" | "pruefen";

export const FLOW_STEP_ORDER: readonly FlowStepId[] = ["leistungen", "objekt", "raeume", "winterdienst", "hms", "preis", "pruefen"];

export type ReadinessFix =
  | { kind: "flow"; step: FlowStepId; field?: string }
  | { kind: "route"; href: string };

export interface ReadinessItem {
  /** Stabile Kennung, z. B. "name_missing", "below_cost_wd" oder die Warning-ID bei Hinweisen. */
  id: string;
  level: ReadinessLevel;
  title: string;
  message?: string;
  fix?: ReadinessFix;
  /** Schwere der zugrunde liegenden Warnung (nur bei Hinweisen aus econ.warnings bzw. ruestzeit_zero). */
  severity?: WarningSeverity;
}

export interface OfferReadiness {
  /** Alle Punkte in der Reihenfolge Blocker → Kritisch → Angebot → Hinweise. */
  items: ReadinessItem[];
  blockers: ReadinessItem[];
  criticals: ReadinessItem[];
  offerGaps: ReadinessItem[];
  hints: ReadinessItem[];
  /** Keine Blocker: Vorschau/Export möglich. */
  canExport: boolean;
  /** Keine Blocker, keine kritischen Punkte, keine Angebotslücken. */
  isOfferReady: boolean;
}

export interface CompanyInfo {
  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
}

/** Platzhalter-Firmenname aus den Store-Defaults. */
export const DEFAULT_COMPANY_NAME = "Meine Reinigungsfirma";

const blank = (v: string | undefined | null) => !v || v.trim() === "";

const eur = (n: number) =>
  withMinusSign(n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** Warning-ID → Suffix ohne Projekt-Präfix ("p1_wd_salt" → "wd_salt"). */
function warningSuffix(project: Project, warningId: string): string {
  const prefix = `${project.id}_`;
  if (warningId.startsWith(prefix)) return warningId.slice(prefix.length);
  const i = warningId.indexOf("_");
  return i >= 0 ? warningId.slice(i + 1) : warningId;
}

/** Behebungsziel eines Hinweises anhand des Warning-Suffixes. */
export function fixForWarningSuffix(suffix: string): ReadinessFix | undefined {
  if (suffix.startsWith("below_cost") || suffix.startsWith("low_margin")) return { kind: "flow", step: "preis" };
  if (suffix.startsWith("wd_")) return { kind: "flow", step: "winterdienst" };
  if (suffix.startsWith("hms_")) return { kind: "flow", step: "hms" };
  if (suffix.startsWith("perf_") || suffix === "sanitaer") return { kind: "flow", step: "raeume" };
  if (suffix === "default_rate") return { kind: "route", href: "/verrechnungssatz" };
  return undefined;
}

/** Schritt, in dem ein fehlender Preis behoben wird: Räume oder das aktive Modul. */
function priceFixStep(project: Project): FlowStepId {
  const wd = !!project.winterdienst?.enabled;
  const hms = !!project.hms?.enabled;
  if (project.rooms.length > 0 || (!wd && !hms)) return "raeume";
  return wd ? "winterdienst" : "hms";
}

export function getOfferReadiness(project: Project, econ: ObjectEconomics, company: CompanyInfo): OfferReadiness {
  const blockers: ReadinessItem[] = [];
  const criticals: ReadinessItem[] = [];
  const offerGaps: ReadinessItem[] = [];
  const hints: ReadinessItem[] = [];
  const finding = (suffix: string) => econ.moduleFindings.find((f) => f.idSuffix === suffix);

  /* ── Blocker ── */
  if (blank(project.name)) {
    blockers.push({ id: "name_missing", level: "blocker", title: "Objektname fehlt",
      message: "Bitte geben Sie einen Objektnamen ein.", fix: { kind: "flow", step: "objekt", field: "name" } });
  }
  if (!(econ.totals.priceMonthly > 0)) {
    blockers.push({ id: "no_price", level: "blocker", title: "Kein Preis kalkuliert",
      message: "Erfassen Sie Räume oder Leistungen, damit ein Monatspreis entsteht.",
      fix: { kind: "flow", step: priceFixStep(project) } });
  }
  const wdAreas = finding("wd_areas");
  if (wdAreas) {
    blockers.push({ id: "wd_incomplete", level: "blocker", title: wdAreas.title, message: wdAreas.message,
      fix: { kind: "flow", step: "winterdienst" } });
  }
  const hmsIncomplete = finding("hms_incomplete");
  if (hmsIncomplete) {
    blockers.push({ id: "hms_incomplete", level: "blocker", title: hmsIncomplete.title, message: hmsIncomplete.message,
      fix: { kind: "flow", step: "hms" } });
  }

  /* ── Kritisch (muss bestätigt werden) ── */
  const strategyCritical = econ.strategy.status === "kritisch";
  if (strategyCritical) {
    criticals.push({ id: "below_cost", level: "critical", title: "Preis unter Vollkosten",
      message: `Der Monatspreis deckt die Vollkosten nicht (Deckungsbeitrag ${eur(econ.strategy.contributionMonthly)} € pro Monat).`,
      fix: { kind: "flow", step: "preis" } });
  }
  for (const suffix of ["below_cost_wd", "below_cost_hms"] as const) {
    const f = finding(suffix);
    if (f) criticals.push({ id: suffix, level: "critical", title: f.title, message: f.message, fix: { kind: "flow", step: "preis" } });
  }

  /* ── Für das Angebot ── */
  if (blank(project.customer)) {
    offerGaps.push({ id: "customer_missing", level: "offer", title: "Kunde fehlt",
      message: "Für das Angebot wird ein Empfänger benötigt.", fix: { kind: "flow", step: "objekt", field: "customer" } });
  }
  if (blank(company.companyName) || company.companyName.trim() === DEFAULT_COMPANY_NAME ||
      blank(company.companyStreet) || blank(company.companyCity)) {
    offerGaps.push({ id: "company_incomplete", level: "offer", title: "Firmendaten unvollständig",
      message: "Ergänzen Sie Firmenname und Anschrift für den Briefkopf des Angebots.",
      fix: { kind: "route", href: "/einstellungen/firma" } });
  }

  /* ── Hinweise: alle übrigen Warnungen ── */
  const represented = new Set(["wd_areas", "hms_incomplete", "below_cost_wd", "below_cost_hms"]);
  if (strategyCritical) represented.add("below_cost");
  for (const w of econ.warnings) {
    const suffix = warningSuffix(project, w.id);
    if (represented.has(suffix)) continue;
    hints.push({ id: w.id, level: "hint", title: w.title, message: w.message, fix: fixForWarningSuffix(suffix), severity: w.severity });
  }
  if (project.rooms.length > 0 && !((project.ruestzeit ?? 0) > 0)) {
    hints.push({ id: "ruestzeit_zero", level: "hint", title: "Keine Rüstzeit kalkuliert",
      message: "Rüstzeiten je Einsatz (Material holen, Umziehen, Schlüssel) sind nicht berücksichtigt.",
      fix: { kind: "flow", step: "raeume", field: "ruestzeit" }, severity: "info" });
  }

  return {
    items: [...blockers, ...criticals, ...offerGaps, ...hints],
    blockers, criticals, offerGaps, hints,
    canExport: blockers.length === 0,
    isOfferReady: blockers.length === 0 && criticals.length === 0 && offerGaps.length === 0,
  };
}

export type ObjectStatusKey = "entwurf" | "pruefung_offen" | "angebotsbereit" | "archiviert";
export type ObjectStatusTone = "neutral" | "info" | "success" | "warning" | "critical";

export interface ObjectStatus {
  key: ObjectStatusKey;
  label: string;
  tone: ObjectStatusTone;
}

/** Hinweis mit Schwere Warnung/Kritisch: hält das Objekt in „Prüfung offen“. */
export function isSeriousHint(h: Pick<ReadinessItem, "severity">): boolean {
  return h.severity === "warning" || h.severity === "critical";
}

export function getObjectStatus(project: Project, r: OfferReadiness): ObjectStatus {
  if (project.status === "archived") return { key: "archiviert", label: "Archiviert", tone: "neutral" };
  if (r.blockers.length > 0) return { key: "entwurf", label: "Entwurf", tone: "neutral" };
  if (r.criticals.length > 0 || r.offerGaps.length > 0 || r.hints.some(isSeriousHint)) {
    return { key: "pruefung_offen", label: "Prüfung offen", tone: "warning" };
  }
  return { key: "angebotsbereit", label: "Angebotsbereit", tone: "success" };
}

export interface NextStep {
  label: string;
  description?: string;
  action: { kind: "href"; href: string } | { kind: "offer" };
}

/** Nachkalkulation wird ab diesem Objektalter (Tage) vorgeschlagen. */
export const NACHKALKULATION_SUGGEST_AFTER_DAYS = 60;

const NEXT_STEP_LABELS: Record<string, string> = {
  name_missing: "Objektname ergänzen",
  no_price: "Leistungen erfassen",
  wd_incomplete: "Winterdienst-Flächen ergänzen",
  hms_incomplete: "Hausmeister-Leistungen ergänzen",
  customer_missing: "Kunde ergänzen",
  company_incomplete: "Firmendaten ergänzen",
};

/** Ziel-URL eines Fixes (Flow-Fix ⇒ /kalkulation/{id}/{schritt}). */
export function fixHref(project: Project, fix: ReadinessFix): string {
  return fix.kind === "flow" ? `/kalkulation/${project.id}/${fix.step}` : fix.href;
}

function stepFor(project: Project, item: ReadinessItem): NextStep {
  const href = item.fix ? fixHref(project, item.fix) : `/kalkulation/${project.id}`;
  return { label: NEXT_STEP_LABELS[item.id] ?? item.title, description: item.message, action: { kind: "href", href } };
}

export function getNextStep(
  project: Project,
  r: OfferReadiness,
  opts: { hasNachkalkulation: boolean; now?: Date | string | number },
): NextStep {
  if (r.blockers.length > 0) return stepFor(project, r.blockers[0]);
  if (r.criticals.length > 0) {
    return { label: "Preis prüfen", description: r.criticals[0].message,
      action: { kind: "href", href: `/kalkulation/${project.id}/preis` } };
  }
  if (r.offerGaps.length > 0) return stepFor(project, r.offerGaps[0]);
  if (!opts.hasNachkalkulation) {
    const now = opts.now !== undefined ? new Date(opts.now).getTime() : Date.now();
    const created = new Date(project.createdAt).getTime();
    if (Number.isFinite(created) && now - created > NACHKALKULATION_SUGGEST_AFTER_DAYS * 86_400_000) {
      return { label: "Nachkalkulation erfassen", description: "Vergleichen Sie die geplanten mit den tatsächlichen Stunden.",
        action: { kind: "href", href: `/auswertung/${project.id}` } };
    }
  }
  return { label: "Angebot erstellen", action: { kind: "offer" } };
}
