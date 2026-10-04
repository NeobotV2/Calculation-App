import { WINTER_AREA_TYPES, WINTER_REGION_PRESETS } from "@/data/winterdienst";
import { HMS_RATE_BENCHMARK } from "@/data/hausmeisterservice";
import { monthShort, nn, pos } from "./util";
import type { ObjectTotals } from "@/lib/object-totals";
import type { Project } from "@/store/use-store";
import { withMinusSign } from "@/lib/utils";

export type FindingSeverity = "critical" | "warning" | "info";

/** Ein Befund — gemeinsame Quelle für warnings.ts (Warnung) und risk-score.ts (Risikopunkte). */
export interface ModuleFinding {
  /** Suffix der Warning-ID nach `${project.id}_`. */
  idSuffix: string;
  /** Schlüssel des Risikofaktors. */
  riskKey: string;
  severity: FindingSeverity;
  /** 0 = nur Warnung/Hinweis, kein Risikofaktor. */
  riskPoints: number;
  title: string;
  message: string;
  action: string;
}

export const MODULE_THRESHOLDS = {
  /** Weniger Saisonmonate ⇒ Hinweis. */
  minSeasonMonths: 4,
  /** Kontingent > x h/Monat ⇒ Befund. */
  contingentHoursMonthly: 8,
  /** Kontingent > x Anteil der Leistungsstunden ⇒ Befund. */
  contingentShare: 0.3,
  /** DIN EN 1176-7: visuelle Routinekontrolle mindestens wöchentlich. */
  spielplatzMinPerYear: 52,
  eps: 1e-9,
} as const;

const eur = (n: number) => withMinusSign(n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const n1 = (n: number) => withMinusSign(n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
/** Anzahl ohne „,0“ bei ganzen Zahlen: 40 → „40“, 37,5 → „37,5“. */
const count = (n: number) => withMinusSign(n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 }));

/**
 * Plausibilitätsregeln der Module in fester Reihenfolge; jede idSuffix höchstens einmal.
 * targetRevenueMarginPct = Ziel-Marge auf den UMSATZ (markupToRevenueMargin bereits angewendet).
 */
export function evaluateModuleFindings(project: Project, totals: ObjectTotals, targetRevenueMarginPct: number): ModuleFinding[] {
  const out: ModuleFinding[] = [];
  const eps = MODULE_THRESHOLDS.eps;
  const add = (f: ModuleFinding) => out.push(f);

  /* ── Winterdienst ── */
  const wd = totals.winterdienst;
  const cfg = project.winterdienst;
  if (wd && cfg) {
    const preset = WINTER_REGION_PRESETS[cfg.region] ?? WINTER_REGION_PRESETS.flachland;
    const isPauschale = cfg.billingMode !== "pro_einsatz";
    const typeOf = (t: string) => WINTER_AREA_TYPES[t as keyof typeof WINTER_AREA_TYPES] ?? WINTER_AREA_TYPES.sonstige;
    const active = cfg.areas.filter((a) => nn(a.areaM2) > 0);
    const names = (list: typeof cfg.areas) => list.map((a) => a.label || typeOf(a.type).label).join(", ");

    // W1 Flächen unvollständig
    const missingM2 = cfg.areas.filter((a) => !(nn(a.areaM2) > 0));
    const noWork = active.filter((a) => !a.clear && !a.spread);
    if (cfg.areas.length === 0 || missingM2.length > 0 || noWork.length > 0) {
      add({ idSuffix: "wd_areas", riskKey: "wd_no_areas", severity: "warning", riskPoints: 8,
        title: "Winterdienst-Flächen unvollständig",
        message: cfg.areas.length === 0
          ? "Für den Winterdienst sind keine Flächen erfasst."
          : missingM2.length > 0
            ? `${missingM2.length} Fläche(n) ohne m²-Angabe: ${names(missingM2)}.`
            : `Für ${names(noWork)} ist weder Räumen noch Streuen gewählt.`,
        action: "Erfassen Sie alle Flächen mit m² und Leistung, bevor Sie das Angebot versenden." });
    }

    // W2 Unter Vollkosten / unter Ziel
    if (wd.contributionSeason < -eps) {
      add({ idSuffix: "below_cost_wd", riskKey: "wd_module_loss", severity: "critical", riskPoints: 12,
        title: "Winterdienst unter Vollkosten",
        message: `Der Winterdienst erzielt im Normalwinter ${eur(wd.contributionSeason)} € Deckungsbeitrag je Saison.`,
        action: "Einsatzpreis, Bereitschaftspauschale oder Zuschläge anheben – im Gesamtpreis bleibt eine Quersubventionierung sonst unsichtbar." });
    } else if (wd.revenue.total > 0 && wd.marginPct < targetRevenueMarginPct - eps) {
      add({ idSuffix: "low_margin_wd", riskKey: "wd_low_margin", severity: "warning", riskPoints: 0,
        title: "Winterdienst-Marge unter Zielwert",
        message: `Die Winterdienst-Marge liegt bei ${n1(wd.marginPct)} % (Ziel ${n1(targetRevenueMarginPct)} %).`,
        action: "Zuschläge, Maschinensatz und Bereitschaftspauschale prüfen." });
    }

    // W3 Pauschale im strengen Winter
    const lossAbove = wd.billing.lossAboveEinsaetze;
    const coveredUpTo = lossAbove !== null && lossAbove >= 1 ? Math.floor(lossAbove) : null;
    if (isPauschale && wd.scenarios.streng.contribution < -eps) {
      const s = wd.scenarios.streng;
      // Eine Deckelung unter der erwarteten Einsatzzahl löst wd_cap aus und rettet keinen Verlust im Normalwinter.
      const capHint = coveredUpTo !== null && coveredUpTo >= wd.einsaetze ? ` (z. B. bis ${coveredUpTo} Einsätze)` : "";
      add({ idSuffix: "wd_harsh", riskKey: "wd_harsh_loss", severity: "info", riskPoints: 4,
        title: "Pauschale verliert im strengen Winter",
        message: `Bei ${Math.round(s.einsaetze)} statt ${Math.round(wd.einsaetze)} Einsätzen entsteht ein Verlust von ${eur(-s.contribution)} € je Saison.`,
        action: `Deckelung vereinbaren${capHint} und darüber je Einsatz abrechnen – oder Abrechnung pro Einsatz anbieten.` });
    }

    // W4 Einsatzzahl gegen Region
    const belowMin = wd.einsaetze < preset.einsaetzeMin;
    // Deckung im typischen Winter aus dem Saisonergebnis (W18): Erlös P + max(0, e − Deckel)·U_E
    // gegen Kosten F_K + e·K_E. Bei einer Deckelung mit U_E > K_E holt die Abrechnung
    // über dem Deckel den Verlust wieder ein — dann gibt es nur ein Verlustfenster.
    const pauschale = wd.billing.pauschaleSeason;
    const cap = wd.billing.capEinsaetze;
    const vr = wd.billing.pricePerEinsatz;
    const vc = wd.perEinsatz.cost;
    const seasonResultAt = (e: number) =>
      pauschale === null ? 0 : pauschale + (cap !== null ? Math.max(0, e - cap) * vr : 0) - (wd.fixedCostSeason + e * vc);
    const pauschaleUncovered = isPauschale && pauschale !== null && seasonResultAt(preset.einsaetzeTyp) < -eps;
    const recovers = cap !== null && vr > vc + eps && lossAbove !== null && lossAbove <= cap;
    const breakEvenAbove = recovers && pauschale !== null ? (wd.fixedCostSeason - pauschale + cap * vr) / (vr - vc) : null;
    const typicalText = `ein typischer Winter in der Region ${preset.label} hat ${preset.einsaetzeTyp}.`;
    const uncoveredText =
      breakEvenAbove !== null
        ? coveredUpTo !== null
          ? `Die Pauschale ist zwischen ca. ${coveredUpTo} und ${Math.ceil(breakEvenAbove - eps)} Einsätzen nicht kostendeckend; ${typicalText}`
          : `Die Pauschale ist erst ab ca. ${Math.ceil(breakEvenAbove - eps)} Einsätzen kostendeckend; ${typicalText}`
        : `Die Pauschale ist ${coveredUpTo !== null ? `nur bis ca. ${coveredUpTo} Einsätze` : "bei keiner Einsatzzahl"} kostendeckend; ${typicalText}`;
    if (belowMin || (pauschaleUncovered && wd.einsaetze < preset.einsaetzeTyp)) {
      add({ idSuffix: "wd_einsaetze_low", riskKey: "wd_einsaetze_low", severity: isPauschale ? "warning" : "info", riskPoints: isPauschale ? 12 : 0,
        title: "Einsatzannahme zu niedrig",
        message: belowMin
          ? `${n1(wd.einsaetze)} Einsätze liegen unter dem Orientierungswert für ${preset.label} (${preset.einsaetzeMin}–${preset.einsaetzeMax}, typisch ${preset.einsaetzeTyp}).`
          : uncoveredText,
        action: isPauschale
          ? "Einsatzzahl aus den Einsatzprotokollen der Vorjahre ableiten oder Abrechnung pro Einsatz anbieten."
          : "Umsatzplanung prüfen; die Bereitschaftspauschale sichert die Fixkosten." });
    } else if (pauschaleUncovered) {
      // Annahme ≥ typisch, aber der typische Winter macht Verlust (bei Deckelung: Verlustfenster).
      // Ohne eigene Risikopunkte — below_cost_wd bzw. wd_harsh bewerten das Saisonergebnis.
      add({ idSuffix: "wd_einsaetze_low", riskKey: "wd_einsaetze_low", severity: "warning", riskPoints: 0,
        title: "Pauschale deckt typischen Winter nicht",
        message: uncoveredText,
        action: "Einsatzpreis, Bereitschaftspauschale oder Zuschläge anheben, bis die Pauschale einen typischen Winter deckt." });
    }
    if (wd.einsaetze > preset.einsaetzeMax) {
      add({ idSuffix: "wd_einsaetze_high", riskKey: "wd_einsaetze_high", severity: "info", riskPoints: 0,
        title: "Einsatzannahme sehr hoch",
        message: `${n1(wd.einsaetze)} Einsätze liegen über dem Strengwinter-Orientierungswert für ${preset.label} (${preset.einsaetzeMax}).`,
        action: "Annahme prüfen – das Angebot wirkt im Wettbewerb sonst teuer." });
    }

    // W5 Bereitschaft
    if (nn(cfg.standbyFeeMonthly) <= 0 && wd.seasonMonthsCount > 0) {
      add({ idSuffix: "wd_standby", riskKey: "wd_no_standby", severity: isPauschale ? "info" : "warning", riskPoints: isPauschale ? 4 : 8,
        title: "Keine Bereitschaftspauschale",
        message: wd.cost.standby > 0
          ? `Rufbereitschaft, Wetterbeobachtung und Disposition kosten ${eur(wd.cost.standby)} € je Saison und werden nicht gesondert vergütet.`
          : "Rufbereitschaft, Wetterbeobachtung und Disposition werden nicht gesondert vergütet.",
        action: "Bereitschaftspauschale je Saisonmonat vereinbaren – bei Abrechnung pro Einsatz bleiben die Fixkosten im milden Winter sonst ungedeckt." });
    }

    // W6 Dokumentation
    if (nn(cfg.documentationMinutesPerEinsatz) <= 0) {
      add({ idSuffix: "wd_doc", riskKey: "wd_no_doc", severity: "warning", riskPoints: 10,
        title: "Keine Einsatzdokumentation kalkuliert",
        message: "Ohne Räum- und Streuprotokoll fehlt Ihnen bei Glätteunfällen der Nachweis, dass Sie die Verkehrssicherungspflicht erfüllt haben.",
        action: "Je Einsatz Zeit für das Protokoll (Uhrzeit, Wetter, Flächen, Streumittel) einplanen, z. B. 5 Minuten." });
    }

    // W7 Haftung
    if (nn(cfg.liabilitySurchargePct) <= 0) {
      add({ idSuffix: "wd_liability", riskKey: "wd_liability", severity: "warning", riskPoints: 8,
        title: "Haftungsrisiko nicht bepreist",
        message: "Sie übernehmen die Verkehrssicherungspflicht für die vereinbarten Flächen ohne Haftungs- oder Risikozuschlag.",
        action: "3–10 % Zuschlag ansetzen und prüfen, ob Ihre Betriebshaftpflicht Winterdienst einschließlich Personenschäden deckt." });
    }

    // W8 Streusalz
    const saltOn = active.filter((a) => a.spread && (a.material ?? cfg.material) === "salz");
    const saltRestrictedAreas = saltOn.filter((a) => typeOf(a.type).saltRestrictable);
    if (cfg.saltRestricted && saltRestrictedAreas.length > 0) {
      add({ idSuffix: "wd_salt", riskKey: "wd_salt", severity: "warning", riskPoints: 10,
        title: "Auftausalz trotz Salzbeschränkung",
        message: `Für ${names(saltRestrictedAreas)} ist Salz vorgesehen; die Ortssatzung schränkt Auftausalz ein (Ordnungswidrigkeit möglich).`,
        action: "Splitt oder Granulat kalkulieren; Salz nur für zulässige Ausnahmen wie Treppen, Rampen oder Eisregen vorsehen." });
    } else if (!cfg.saltRestricted && saltOn.some((a) => a.type === "gehweg")) {
      add({ idSuffix: "wd_salt", riskKey: "wd_salt_hint", severity: "info", riskPoints: 0,
        title: "Streusalz auf dem Gehweg",
        message: "Auf öffentlichen Gehwegen ist Auftausalz in vielen Kommunen untersagt.",
        action: "Ortssatzung prüfen und die Option „Ortssatzung schränkt Auftausalz ein“ setzen, falls sie gilt." });
    }

    // W9 Räumen ohne Streuen
    const unspread = active.filter((a) => !a.spread && typeOf(a.type).spreadingRequired);
    if (unspread.length > 0) {
      add({ idSuffix: "wd_spreading", riskKey: "wd_no_spreading", severity: "warning", riskPoints: 10,
        title: "Fläche ohne Streuen",
        message: `Nur Räumen ohne Streuen erfüllt die Verkehrssicherungspflicht bei Glätte nicht: ${names(unspread)}.`,
        action: "Streuen für diese Flächen aktivieren." });
    }

    // W10 Kapazität im Räumfenster
    if (wd.crewAtPeak > 1 + eps) {
      const peak = wd.perEinsatz.clearingHours + wd.perEinsatz.spreadingHours;
      add({ idSuffix: "wd_crew", riskKey: "wd_peak_crew", severity: "info", riskPoints: 6,
        title: "Mehrere Kräfte im Räumfenster nötig",
        message: `Ein Schnee-Einsatz dauert vor Ort etwa ${n1(peak)} h, das Räumfenster ${n1(nn(cfg.clearingWindowHours))} h – mindestens ${Math.ceil(wd.crewAtPeak - eps)} Kräfte gleichzeitig.`,
        action: "Kolonnen- und Tourenplanung prüfen oder maschinelle Räumung vorsehen." });
    }

    // W11 Methode nicht möglich
    const machineImpossible = cfg.areas.filter((a) => a.method === "maschinell" && !typeOf(a.type).machineAllowed);
    if (machineImpossible.length > 0) {
      add({ idSuffix: "wd_machine", riskKey: "wd_machine", severity: "info", riskPoints: 0,
        title: "Maschinelle Räumung nicht möglich",
        message: `${names(machineImpossible)}: maschinelle Räumung nicht möglich – es wird manuell gerechnet.`,
        action: "Methode auf „manuell“ setzen." });
    }

    // W12 Splitt-Aufnahme
    const usesSplitt = active.some((a) => a.spread && (a.material ?? cfg.material) === "splitt");
    const hasPickup = !!project.hms?.enabled && project.hms.tasks.some((t) => t.enabled && t.catalogId === "streugut_aufnehmen" && nn(t.frequencyPerYear) > 0);
    if (usesSplitt && !hasPickup) {
      add({ idSuffix: "wd_splitt", riskKey: "wd_splitt", severity: "info", riskPoints: 0,
        title: "Aufnahme des Streuguts fehlt",
        message: "Splitt muss nach der Saison wieder aufgenommen werden; diese Leistung ist nicht kalkuliert.",
        action: "Im Hausmeisterservice „Streugut aufnehmen (Frühjahr)“ ergänzen oder gesondert anbieten." });
    }

    // W13 Saison
    const missing = preset.seasonMonths.filter((m) => !wd.seasonMonths.includes(m));
    if (wd.seasonMonthsCount < MODULE_THRESHOLDS.minSeasonMonths || missing.length > 0) {
      add({ idSuffix: "wd_season", riskKey: "wd_season_short", severity: "info", riskPoints: 4,
        title: "Saison kürzer als regional üblich",
        message: missing.length > 0
          ? `Gegenüber ${preset.label} fehlen: ${missing.map(monthShort).join(", ")}.`
          : `Die Saison umfasst nur ${wd.seasonMonthsCount} Monat(e).`,
        action: "Saisonzeitraum vertraglich festlegen und Einsätze außerhalb der Saison gesondert abrechnen." });
    }

    // W14 Deckelung
    if (isPauschale && wd.billing.capEinsaetze !== null && wd.billing.capEinsaetze < wd.einsaetze) {
      add({ idSuffix: "wd_cap", riskKey: "wd_cap", severity: "info", riskPoints: 0,
        title: "Deckelung unter erwarteter Einsatzzahl",
        message: `Die Pauschale umfasst ${count(wd.billing.capEinsaetze)} Einsätze, erwartet werden ${count(wd.einsaetze)}.`,
        action: "Pauschale und Deckelung abstimmen – der Kunde erhält sonst schon im Normalwinter Nachberechnungen." });
    }

    // W15 Eigener Satz ohne eigene Vollkosten
    if (pos(cfg.rateOverride) > 0 && !(pos(cfg.vollkostenOverride) > 0)) {
      add({ idSuffix: "wd_vk", riskKey: "wd_vk", severity: "info", riskPoints: 0,
        title: "Eigener Winterdienst-Satz ohne eigene Vollkosten",
        message: "Der Winterdienst nutzt einen eigenen Verrechnungssatz, aber die Vollkosten der Unterhaltsreinigung.",
        action: "Vollkosten für den Winterdienst hinterlegen, sonst ist die Marge zu optimistisch." });
    }
  }

  /* ── Hausmeisterservice ── */
  const hms = totals.hms;
  const hc = project.hms;
  if (hms && hc) {
    const enabledTasks = hc.tasks.filter((t) => t.enabled);
    const incomplete = enabledTasks.filter((t) => {
      if (!(nn(t.quantity) > 0) || !(nn(t.frequencyPerYear) > 0)) return true;
      if (t.unit === "m2") return !(pos(t.perfM2h) > 0);
      if (t.unit === "kontingent") return false;
      return !(nn(t.minutesPerUnit) > 0);
    });
    // H1
    if (enabledTasks.length === 0 || incomplete.length > 0) {
      add({ idSuffix: "hms_incomplete", riskKey: "hms_incomplete", severity: "warning", riskPoints: 6,
        title: "Hausmeisterservice unvollständig",
        message: enabledTasks.length === 0
          ? "Für den Hausmeisterservice sind keine Leistungen ausgewählt."
          : `${incomplete.length} Leistung(en) ohne Menge, Zeitwert oder Turnus: ${incomplete.map((t) => t.label).join(", ")}.`,
        action: "Leistungen aus dem Katalog wählen und Menge, Zeitwert und Turnus erfassen." });
    }
    // H2
    if (hms.contributionAnnual < -eps) {
      add({ idSuffix: "below_cost_hms", riskKey: "hms_module_loss", severity: "critical", riskPoints: 12,
        title: "Hausmeisterservice unter Vollkosten",
        message: `Der Hausmeisterservice erzielt ${eur(hms.contributionAnnual)} € Deckungsbeitrag pro Jahr.`,
        action: "Satz oder Materialaufschlag anheben bzw. Leistungsumfang reduzieren." });
    } else if (hms.revenueAnnual > 0 && hms.marginPct < targetRevenueMarginPct - eps) {
      add({ idSuffix: "low_margin_hms", riskKey: "hms_low_margin", severity: "warning", riskPoints: 0,
        title: "HMS-Marge unter Zielwert",
        message: `Die Marge des Hausmeisterservice liegt bei ${n1(hms.marginPct)} % (Ziel ${n1(targetRevenueMarginPct)} %).`,
        action: "Satz und Materialaufschlag prüfen." });
    }
    // H3
    const contShare = hms.taskHoursAnnual > 0 ? hms.contingentHoursAnnual / hms.taskHoursAnnual : 0;
    if (hms.contingentHoursAnnual > 0 &&
        (hms.contingentHoursMonthly > MODULE_THRESHOLDS.contingentHoursMonthly || contShare > MODULE_THRESHOLDS.contingentShare)) {
      const billed = hc.contingentOverageBilled;
      add({ idSuffix: "hms_contingent", riskKey: "hms_contingent", severity: billed ? "info" : "warning", riskPoints: billed ? 0 : 6,
        title: "Hohes Stundenkontingent",
        message: `${n1(hms.contingentHoursMonthly)} h je Monat (${Math.round(contShare * 100)} % der Leistungsstunden) sind als Kontingent kalkuliert${billed ? "" : " – Mehrstunden werden nicht berechnet"}.`,
        action: "Leistungen konkretisieren, Abruf monatlich dokumentieren und Mehrstunden nach Aufwand vereinbaren." });
    }
    // H4
    if (enabledTasks.some((t) => t.catalogId === "spielplatz_kontrolle" && nn(t.frequencyPerYear) < MODULE_THRESHOLDS.spielplatzMinPerYear)) {
      add({ idSuffix: "hms_spielplatz", riskKey: "hms_spielplatz", severity: "warning", riskPoints: 4,
        title: "Spielplatzkontrolle zu selten",
        message: "DIN EN 1176-7 sieht die visuelle Routinekontrolle je nach Nutzung täglich bis wöchentlich vor.",
        action: "Turnus auf mindestens wöchentlich (52 × pro Jahr) setzen." });
    }
    // H5
    const travelMinutes = nn(hc.travelMinutesPerVisitDay);
    if (hms.visitDaysPerYear <= 0 && hms.contingentHoursAnnual > 0) {
      add({ idSuffix: "hms_travel_contingent", riskKey: "hms_travel_contingent", severity: "info", riskPoints: 0,
        title: "Keine Anfahrt für das Kontingent",
        message: "Kontingente zählen nicht als Einsatztage – für Einsätze auf Abruf ist keine Anfahrt kalkuliert.",
        action: travelMinutes > 0
          ? "Einsatztage/Jahr für die erwarteten Abrufe angeben."
          : "Einsatztage/Jahr für die erwarteten Abrufe und die Anfahrt je Einsatztag erfassen." });
    } else if (travelMinutes <= 0 && hms.visitDaysPerYear > 0) {
      add({ idSuffix: "hms_travel", riskKey: "hms_travel", severity: "info", riskPoints: 0,
        title: "Keine Anfahrt kalkuliert",
        message: `Für ${n1(hms.visitDaysPerYear)} Einsatztage pro Jahr ist keine Anfahrt kalkuliert.`,
        action: "Anfahrt je Einsatztag erfassen." });
    } else if (hms.travelHoursAnnual > 0 && nn(project.wegezeit) > 0 && project.rooms.length > 0) {
      add({ idSuffix: "hms_travel", riskKey: "hms_travel", severity: "info", riskPoints: 0,
        title: "Anfahrt doppelt?",
        message: "Reinigung und Hausmeisterservice enthalten je eine Anfahrt.",
        action: "Bei kombinierten Einsätzen die Anfahrt nur einmal ansetzen." });
    }
    // H6
    if (hms.rate > 0 && hms.rate < HMS_RATE_BENCHMARK.low) {
      add({ idSuffix: "hms_rate", riskKey: "hms_rate", severity: "info", riskPoints: 0,
        title: "HMS-Satz unter Marktniveau",
        message: `Hausmeisterleistungen werden marktüblich mit ${HMS_RATE_BENCHMARK.low}–${HMS_RATE_BENCHMARK.high} €/h verrechnet; Ihr Satz liegt bei ${eur(hms.rate)} €/h.`,
        action: "Eigenen Verrechnungssatz für den Hausmeisterservice hinterlegen." });
    }
    // H7
    if (pos(hc.rateOverride) > 0 && !(pos(hc.vollkostenOverride) > 0)) {
      add({ idSuffix: "hms_vk", riskKey: "hms_vk", severity: "info", riskPoints: 0,
        title: "Eigener HMS-Satz ohne eigene Vollkosten",
        message: "Der Hausmeisterservice nutzt einen eigenen Verrechnungssatz, aber die Vollkosten der Unterhaltsreinigung.",
        action: "Vollkosten für den Hausmeisterservice hinterlegen (Lohngruppe, Fahrzeug, Werkzeug)." });
    }
  }
  return out;
}
