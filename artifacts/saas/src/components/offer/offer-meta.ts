/* ─────────────────────────────────────────────────────────────────────────
   Angebots-Metadaten und Kundentexte (rein, getestet).
   - Angebotsnummer und Gültigkeit werden abgeleitet, nicht gespeichert.
   - Rundung NUR für die Anzeige: Pauschale auf Cent, Rate = round(P/n),
     letzte Rate = P − (n−1)·Rate. Gerechnet wird immer in voller Genauigkeit.
   - Wortlaut der Winterdienst-/HMS-Texte gemäß Domain-Contract §5.8.
   ───────────────────────────────────────────────────────────────────────── */
import type { Project } from "@/store/use-store";
import type { OfferPresentation } from "@/lib/object-totals";
import type { OfferPosition } from "@/lib/offer-positions";
import { getObjectStatus, isSeriousHint, type OfferReadiness } from "@/lib/offer-readiness";
import type { WinterBillingMode, WinterdienstConfig, WinterdienstResult } from "@/lib/service-modules/types";
import { formatSeason } from "@/lib/service-modules/util";

/** Gültigkeit eines Angebots in Kalendertagen ab Ausstellungsdatum. */
export const OFFER_VALIDITY_DAYS = 30;

/** Detailgrad des Kundenangebots: Kompakt oder mit Leistungsdaten (m²/h, Std./Mo). */
export type OfferDetail = "compact" | "detailed";

export const OFFER_DETAIL_LABELS: Record<OfferDetail, string> = {
  compact: "Kompakt",
  detailed: "Mit Leistungsdaten",
};

export const WINTER_BILLING_MODE_LABELS: Record<WinterBillingMode, string> = {
  pauschale_12: "Saisonpauschale in 12 Monatsraten",
  pauschale_saison: "Saisonpauschale in Saisonraten",
  pro_einsatz: "Abrechnung je Einsatz",
};

const NBSP = " ";

/**
 * Kaufmännische Rundung auf Cent (half away from zero). Eine winzige
 * Toleranz gleicht Binärdarstellungsfehler aus (2569,405 → 2569,41).
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const cents = Math.round(Math.abs(value) * 100 + 1e-6);
  const r = cents / 100;
  return value < 0 && r !== 0 ? -r : r;
}

/** Betrag mit zwei Nachkommastellen und geschütztem Leerzeichen vor „€“: 3699.1075 → „3.699,11 €“. */
export function formatOfferEuro(value: number): string {
  const v = round2(value);
  return `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}€`;
}

/** Zahl mit höchstens `maxDigits` Nachkommastellen: 45 → „45“, 37.5 → „37,5“. */
export function formatOfferNumber(value: number, maxDigits = 1): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
}

/** Saison als Text; ohne Saisonmonate rechnet der Winterdienst ganzjährig. */
export function seasonText(months: readonly number[] | undefined): string {
  if (!months || months.length === 0) return "ganzjährig";
  return formatSeason(months);
}

/* ── Nummer und Datum ─────────────────────────────────────────────────── */

function yearOf(createdAt: string | undefined, now: Date): string {
  const m = typeof createdAt === "string" ? /^(\d{4})-/.exec(createdAt) : null;
  if (m) return m[1];
  const d = createdAt ? new Date(createdAt) : null;
  if (d && Number.isFinite(d.getTime())) return String(d.getFullYear());
  return String(now.getFullYear());
}

/** Angebotsnummer `A-{JJJJ aus createdAt}-{erste 6 Zeichen der ID, groß}`. */
export function offerNumber(project: Pick<Project, "id" | "createdAt">, now: Date = new Date()): string {
  const idPart = (project.id ?? "").slice(0, 6).toUpperCase() || "000000";
  return `A-${yearOf(project.createdAt, now)}-${idPart}`;
}

/** TT.MM.JJJJ in lokaler Zeit (unabhängig von der ICU-Ausstattung). */
export function formatOfferDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export interface OfferDates {
  /** Ausstellungsdatum „TT.MM.JJJJ“. */
  date: string;
  /** Ausstellungsdatum + 30 Tage „TT.MM.JJJJ“. */
  validUntil: string;
  issuedAt: Date;
  validUntilDate: Date;
}

/** Ausstellungsdatum (heute) und Gültigkeit (+30 Kalendertage). */
export function offerDates(now: Date = new Date()): OfferDates {
  const issuedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const validUntilDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + OFFER_VALIDITY_DAYS);
  return { date: formatOfferDate(issuedAt), validUntil: formatOfferDate(validUntilDate), issuedAt, validUntilDate };
}

/* ── Raten ────────────────────────────────────────────────────────────── */

export interface InstallmentSchedule {
  /** Auf Cent gerundeter Gesamtbetrag. */
  total: number;
  count: number;
  /** Regelrate = round(total / count). */
  amount: number;
  /** Letzte Rate = total − (count − 1) · amount. */
  last: number;
}

/** Ratenplan für die Anzeige (Rundung nur hier, Rechnung in voller Genauigkeit). */
export function installmentSchedule(total: number, count: number): InstallmentSchedule {
  const n = Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1;
  const t = round2(total);
  const amount = round2(t / n);
  const last = round2(t - (n - 1) * amount);
  return { total: t, count: n, amount, last };
}

/* ── Winterdienst-Texte ───────────────────────────────────────────────── */

/** „Saison Nov–Mär“. */
export function winterSeasonLine(wd: Pick<WinterdienstResult, "seasonMonths">): string {
  return `Saison ${seasonText(wd.seasonMonths)}`;
}

/**
 * Abrechnungstext je Abrechnungsmodus (Contract §5.8). Beträge aus
 * `calcOfferPresentation` bzw. dem Winterdienst-Ergebnis; null ohne Winterdienst.
 * `project` ist optional und wird nur für künftige Varianten (z. B. § 35a) vorgehalten.
 */
export function winterBillingText(
  op: OfferPresentation,
  wd: WinterdienstResult | null | undefined,
  project?: Pick<Project, "winterdienst">,
): string | null {
  void project;
  if (!wd) return null;
  const b = wd.billing;
  const season = seasonText(wd.seasonMonths);

  if (b.mode === "pro_einsatz") {
    const per = op.winterPerEinsatz;
    const fee = per ? per.fixedFeeMonthly : b.installmentAmount;
    const price = per ? per.pricePerEinsatz : b.pricePerEinsatz;
    const tail = `; bei ${formatOfferNumber(wd.einsaetze)} Einsätzen ca. ${formatOfferEuro(b.expectedSeasonTotal)} je Saison.`;
    if (round2(fee) <= 0) {
      return `Abrechnung je Einsatz: ${formatOfferEuro(price)} netto je Einsatz${tail}`;
    }
    return `Bereitschafts- und Vorhaltepauschale ${formatOfferEuro(fee)} je Saisonmonat (${season}) zzgl. ${formatOfferEuro(price)} je Einsatz${tail}`;
  }

  const p = b.pauschaleSeason ?? b.expectedSeasonTotal;
  // Gedeckelt: Umfang der Pauschale und kalkulierte Einsätze getrennt nennen (wie die Position darüber).
  const scope = b.capEinsaetze !== null && b.capEinsaetze < wd.einsaetze
    ? ` für bis zu ${formatOfferNumber(b.capEinsaetze)} Einsätze (kalkuliert ${formatOfferNumber(wd.einsaetze)} Einsätze)`
    : ` (kalkuliert ${formatOfferNumber(wd.einsaetze)} Einsätze)`;
  const count = b.mode === "pauschale_saison" && op.winterSeasonInstallment
    ? op.winterSeasonInstallment.count
    : b.installmentCount;
  const s = installmentSchedule(p, count);
  const rates = b.mode === "pauschale_12"
    ? `${s.count} Monatsraten`
    : `${s.count} Raten (${season})`;
  const lastPart = s.last !== s.amount ? ` (letzte Rate ${formatOfferEuro(s.last)})` : "";
  return `Winterdienst-Saisonpauschale ${season}${scope}: ` +
    `${formatOfferEuro(s.total)} netto, zahlbar in ${rates} à ${formatOfferEuro(s.amount)}${lastPart}.`;
}

/** Deckelung der Pauschale; null ohne Deckelung. */
export function winterCapText(op: OfferPresentation): string | null {
  const o = op.winterOverage;
  if (!o) return null;
  return `Die Pauschale umfasst bis zu ${formatOfferNumber(o.capEinsaetze, 0)} Einsätze; ` +
    `jeder weitere Einsatz wird mit ${formatOfferEuro(o.pricePerEinsatz)} netto berechnet.`;
}

/** Umfang der übernommenen Verkehrssicherungspflicht. */
export function verkehrssicherungText(
  cfg: Pick<WinterdienstConfig, "seasonMonths"> | null | undefined,
  result: Pick<WinterdienstResult, "seasonMonths"> | null | undefined,
): string {
  const months = result?.seasonMonths ?? cfg?.seasonMonths ?? [];
  return `Übernahme der Räum- und Streupflicht für die oben genannten Flächen während der Saison ${seasonText(months)} ` +
    `zu den in der Ortssatzung festgelegten Zeiten; Dokumentation jedes Einsatzes.`;
}

/**
 * Zeile im Summenblock für Winterdienst außerhalb des Monatsbetrags (Saisonraten bzw. je Einsatz).
 * Saisonraten mit derselben Rundung wie `winterBillingText`, inkl. abweichender letzter Rate.
 */
export function winterTotalsLine(op: OfferPresentation): string | null {
  const inst = op.winterSeasonInstallment;
  if (inst) {
    const s = installmentSchedule(inst.amount * inst.count, inst.count);
    const lastPart = s.last !== s.amount ? `, letzte Rate ${formatOfferEuro(s.last)}` : "";
    return `Winterdienst: ${s.count} Raten à ${formatOfferEuro(s.amount)} (${seasonText(inst.months)})${lastPart}`;
  }
  const per = op.winterPerEinsatz;
  if (per) {
    return `Winterdienst: ${formatOfferEuro(per.fixedFeeMonthly)} je Saisonmonat zzgl. ${formatOfferEuro(per.pricePerEinsatz)} je Einsatz`;
  }
  return null;
}

/* ── Hausmeisterservice ───────────────────────────────────────────────── */

/** Mehrstunden über das Kontingent; null, wenn nicht abgerechnet oder ohne Kontingent. */
export function hmsOverageText(op: OfferPresentation): string | null {
  if (op.hmsOverageRate === null || !(op.hmsOverageRate > 0)) return null;
  const rate = round2(op.hmsOverageRate).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Mehrstunden über das Kontingent: ${rate}${NBSP}€/h netto.`;
}

/* ── Angebotsstatus (Chip der Druckansicht) ───────────────────────────── */

/** Strukturgleich mit `Tone` aus lib/status (offer-meta bleibt frei von UI-Importen). */
export type OfferReadinessTone = "neutral" | "info" | "success" | "warning" | "critical";

/** Hinweise mit Schwere Warnung/Kritisch: halten das Objekt in „Prüfung offen“ (wie `getObjectStatus`). */
export function seriousHintCount(r: Pick<OfferReadiness, "hints">): number {
  return r.hints.filter(isSeriousHint).length;
}

/**
 * Anzahl offener Punkte: Blocker, Kritisch, Angebotslücken und Hinweise mit Warnung —
 * genau die Punkte, die den Status „Angebotsbereit“ verhindern. Info-Hinweise zählen nicht.
 */
export function openOfferItemCount(r: Pick<OfferReadiness, "blockers" | "criticals" | "offerGaps" | "hints">): number {
  return r.blockers.length + r.criticals.length + r.offerGaps.length + seriousHintCount(r);
}

/** „1 offener Punkt“ bzw. „{n} offene Punkte“. */
export function openItemsText(n: number): string {
  return n === 1 ? "1 offener Punkt" : `${n} offene Punkte`;
}

export interface OfferStatusChip {
  /** Statuswort aus `getObjectStatus`, bei offenen Punkten mit Anzahl: „Prüfung offen (2)“. */
  label: string;
  /** Ausgeschrieben für Screenreader: „Prüfung offen, 2 offene Punkte“. */
  spokenLabel: string;
  tone: OfferReadinessTone;
}

/**
 * Status-Chip der Druckansicht: Wort und Ton aus `getObjectStatus`, damit das Objekt
 * dort denselben Status trägt wie in jedem anderen Statusbadge.
 */
export function offerStatusChip(project: Project, r: OfferReadiness): OfferStatusChip {
  const status = getObjectStatus(project, r);
  const n = status.key === "archiviert" ? 0 : openOfferItemCount(r);
  return {
    label: n > 0 ? `${status.label} (${n})` : status.label,
    spokenLabel: n > 0 ? `${status.label}, ${openItemsText(n)}` : status.label,
    tone: status.tone,
  };
}

/* ── Positionen ───────────────────────────────────────────────────────── */

/** Menge einer Angebotsposition: „120 m²“, „6 Stk.“, „15 Min. je Einsatz“, „pauschal“. */
export function formatOfferQuantity(position: Pick<OfferPosition, "quantity" | "kind">): string {
  const q = position.quantity;
  if (!q) return "";
  if (q.unit === "pauschal") return q.value === 1 ? "pauschal" : `${formatOfferNumber(q.value)} × pauschal`;
  if (q.unit === "Min.") {
    const suffix = position.kind === "ruestzeit" || position.kind === "wegezeit" ? " je Einsatz" : "";
    return `${formatOfferNumber(q.value, 0)}${NBSP}Min.${suffix}`;
  }
  return `${formatOfferNumber(q.value)}${NBSP}${q.unit}`;
}

/* ── Papier: immer hell ───────────────────────────────────────────────── */

/**
 * Helle Token-Werte (wie `:root` in index.css) für das Papier-Dokument.
 * Das Angebot ist immer hell — auch in der Vorschau innerhalb der dunklen App.
 * `--background` ist Papierweiß (= `--card`). Ein Test hält die Werte synchron.
 */
export const PAPER_TOKENS: Readonly<Record<string, string>> = {
  "--background": "0 0% 100%",
  "--foreground": "222 47% 11%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 11%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "222 47% 11%",
  "--surface-sunken": "216 28% 95%",
  "--primary": "175 80% 25%",
  "--primary-foreground": "0 0% 100%",
  "--primary-soft": "172 52% 93%",
  "--secondary": "216 24% 94%",
  "--secondary-foreground": "222 47% 11%",
  "--muted": "216 24% 94%",
  "--muted-foreground": "215 16% 42%",
  "--accent": "216 24% 94%",
  "--accent-foreground": "222 47% 11%",
  "--destructive": "0 72% 44%",
  "--destructive-foreground": "0 0% 100%",
  "--destructive-soft": "0 86% 96%",
  "--destructive-border": "0 70% 82%",
  "--success": "142 72% 27%",
  "--success-foreground": "0 0% 100%",
  "--success-soft": "141 60% 94%",
  "--success-border": "142 45% 74%",
  "--warning": "28 92% 33%",
  "--warning-foreground": "0 0% 100%",
  "--warning-soft": "40 90% 93%",
  "--warning-border": "38 80% 70%",
  "--info": "221 78% 46%",
  "--info-foreground": "0 0% 100%",
  "--info-soft": "214 90% 95%",
  "--info-border": "214 80% 80%",
  "--module-cleaning": "175 80% 25%",
  "--module-cleaning-soft": "172 52% 93%",
  "--module-winter": "205 85% 33%",
  "--module-winter-soft": "204 90% 94%",
  "--module-hms": "262 50% 45%",
  "--module-hms-soft": "262 70% 96%",
  "--border": "216 20% 88%",
  "--border-strong": "215 16% 76%",
  "--input": "215 14% 55%",
  "--ring": "175 80% 30%",
};
