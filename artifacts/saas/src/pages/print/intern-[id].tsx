import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, ShieldAlert } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { calcPriceStrategy } from "@/lib/price-strategy";
import { calcRiskScore } from "@/lib/risk-score";
import { formatCurrency, formatNumber } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   Interne Kalkulation: Entscheidungs- und Controlling-Dokument mit Kosten,
   Marge und Risiko. NIEMALS an Kunden weitergeben — dafür gibt es die
   Angebotsansicht unter /print/:id.
   ───────────────────────────────────────────────────────────────────────── */

const STATUS_LABELS = {
  kritisch: "Unwirtschaftlich",
  pruefen: "Prüfen",
  gesund: "Wirtschaftlich",
} as const;

const STATUS_TONES = {
  kritisch: "text-destructive",
  pruefen: "text-warning",
  gesund: "text-success",
} as const;

const RISK_LEVEL_LABELS = {
  niedrig: "Niedriges Risiko",
  mittel: "Mittleres Risiko",
  hoch: "Hohes Risiko",
} as const;

export default function InternPrintView() {
  const [, params] = useRoute("/print/:id/intern");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const targetMargin = useStore((s) => s.targetMargin);
  const companyName = useStore((s) => s.companyName);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Objekt nicht gefunden</p>
          <Button variant="outline" onClick={() => setLocation("/objekte")}>Zurück</Button>
        </div>
      </div>
    );
  }

  const effectiveRate = project.hourlyRate ?? hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);
  const breakdown = calcHourlyRate(hourlyRateConfig);
  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());
  const usesDefaultRate = isDefaultRate && !project.hourlyRate;

  const strategy = calcPriceStrategy({
    monthlyHours: totals.hours,
    area: totals.area,
    effectiveRate,
    vollkosten: breakdown.vollkosten,
    targetMarkupPct: targetMargin,
  });
  const risk = calcRiskScore({
    project,
    monthlyHours: totals.hours,
    area: totals.area,
    monthlyCost: totals.cost,
    marginPct: strategy.marginPct,
    // Gleiche Basis wie marginPct: Umsatzmarge (konvertiert aus dem Aufschlag).
    targetMarginPct: strategy.targetMarginPct,
    usesDefaultRate,
  });

  const rateSource = project.hourlyRate
    ? "individuell (im Objekt hinterlegt)"
    : isDefaultRate
      ? "Standardwert (nicht angepasst)"
      : "eigene Kalkulation (Verrechnungssatz-Kalkulator)";

  const ausfallDelta = breakdown.lohnkostenMitAusfall - breakdown.lohnkostenProStunde;
  const hasIndividualRate = !!project.hourlyRate;
  const marginTone = strategy.marginPct < 0
    ? "text-destructive"
    : strategy.marginPct < strategy.targetMarginPct
      ? "text-warning"
      : "text-success";

  const sectionHeading = "text-sm font-semibold uppercase tracking-widest text-muted-foreground print:text-gray-500 mb-3";

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print safe-header bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 pt-12 pb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2" aria-label="Zurück">
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <Button onClick={() => window.print()} size="sm" className="gap-2">
          <Printer size={16} aria-hidden="true" /> Drucken
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-6 print:p-0 print:max-w-none">
        <div className="print:text-black print:bg-white">
          {/* Warnbanner: auch im Druck deutlich erkennbar */}
          <div className="mb-8 flex items-center gap-3 rounded-xl print:rounded-none border-2 border-destructive print:border-black bg-destructive/10 print:bg-white px-4 py-3">
            <ShieldAlert size={22} className="text-destructive print:text-black shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-destructive print:text-black">Interne Kalkulation</p>
              <p className="text-xs text-destructive/90 print:text-black">
                Nicht zur Weitergabe an Kunden — enthält Kosten, Marge und Risikobewertung.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-muted-foreground print:text-gray-500 text-lg font-medium mb-1">Kalkulations- und Entscheidungsgrundlage</p>
            <h1 className="text-2xl font-bold tracking-tight print:text-black">{project.name}</h1>
          </div>

          {/* Objektdaten */}
          <h3 className={sectionHeading}>Objektdaten</h3>
          <table className="w-full text-sm mb-8">
            <tbody>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2 text-muted-foreground print:text-gray-500 w-48">Objekt</td>
                <td className="py-2 font-medium">{project.name}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2 text-muted-foreground print:text-gray-500">Kunde</td>
                <td className="py-2">{project.customer || "—"}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2 text-muted-foreground print:text-gray-500">Standort</td>
                <td className="py-2">{project.location || "—"}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2 text-muted-foreground print:text-gray-500">Datum</td>
                <td className="py-2">{new Date().toLocaleDateString("de-DE")}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2 text-muted-foreground print:text-gray-500">Verrechnungssatz</td>
                <td className="py-2 tabular-nums">
                  {formatCurrency(effectiveRate)}/h
                  <span className="text-muted-foreground print:text-gray-500"> · Quelle: {rateSource}</span>
                </td>
              </tr>
              {companyName && (
                <tr className="border-b border-border/30 print:border-gray-200">
                  <td className="py-2 text-muted-foreground print:text-gray-500">Erstellt von</td>
                  <td className="py-2">{companyName}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Leistungsverzeichnis */}
          <h3 className={sectionHeading}>Leistungsverzeichnis</h3>
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-border print:border-gray-300">
                <th className="text-left py-2 font-semibold">Bezeichnung</th>
                <th className="text-left py-2 font-semibold">Gruppe</th>
                <th className="text-right py-2 font-semibold">Fläche</th>
                <th className="text-right py-2 font-semibold">Intervall</th>
                <th className="text-right py-2 font-semibold">LW (m²/h)</th>
                <th className="text-right py-2 font-semibold">Std/Mo</th>
                <th className="text-right py-2 font-semibold">€/Mo</th>
              </tr>
            </thead>
            <tbody>
              {project.rooms.map((r) => {
                const rc = calcRoom(r, effectiveRate);
                return (
                  <tr key={r.id} className="border-b border-border/30 print:border-gray-200">
                    <td className="py-2">{r.name || r.typeName}</td>
                    <td className="py-2 text-muted-foreground print:text-gray-500">{r.groupName}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(r.area, 1)} m²</td>
                    <td className="py-2 text-right">{FREQUENCY_LABELS[r.frequency]}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(rc.effectivePerformance, 0)}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(rc.monthlyHours, 1)}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(rc.monthlyCost)}</td>
                  </tr>
                );
              })}
              {totals.ruestzeitHours > 0 && (
                <tr className="border-b border-border/30 print:border-gray-200">
                  <td className="py-2" colSpan={5}>Rüstzeit ({formatNumber(project.ruestzeit ?? 0, 0)} Min. je Einsatz)</td>
                  <td className="py-2 text-right tabular-nums">{formatNumber(totals.ruestzeitHours, 1)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(totals.ruestzeitHours * effectiveRate)}</td>
                </tr>
              )}
              {totals.wegezeitHours > 0 && (
                <tr className="border-b border-border/30 print:border-gray-200">
                  <td className="py-2" colSpan={5}>Wegezeit ({formatNumber(project.wegezeit ?? 0, 0)} Min. je Einsatz)</td>
                  <td className="py-2 text-right tabular-nums">{formatNumber(totals.wegezeitHours, 1)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(totals.wegezeitHours * effectiveRate)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border print:border-gray-300 font-semibold">
                <td className="py-2" colSpan={2}>Summe</td>
                <td className="py-2 text-right tabular-nums">{formatNumber(totals.area, 1)} m²</td>
                <td className="py-2" colSpan={2} />
                <td className="py-2 text-right tabular-nums">{formatNumber(totals.hours, 1)}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(totals.cost)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-muted-foreground print:text-gray-500 -mt-6 mb-8">
            LW = effektiver Leistungswert inkl. Zu-/Abschlägen für Verschmutzung, Möblierung und Bodenart.
          </p>

          {/* Kostenaufriss je Stunde */}
          <h3 className={sectionHeading}>Kostenaufriss je Stunde</h3>
          <table className="w-full text-sm mb-8">
            <tbody>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Basislohn</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.baseLohn)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">+ Schichtzuschläge (Nacht/Sonntag/Feiertag)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.schichtzuschlag.totalZuschlag)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">+ Sozialversicherung ({formatNumber(breakdown.svTotalRate, 1)} %)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.svBetrag)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200 font-semibold">
                <td className="py-2">= Lohnkosten je Stunde</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.lohnkostenProStunde)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">+ Ausfallzeiten (Faktor {formatNumber(breakdown.ausfallzuschlag, 2)}: Urlaub, Krankheit, Feiertage, Fortbildung)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(ausfallDelta)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">+ Gemeinkosten ({formatNumber(breakdown.overheadTotalRate, 1)} %)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.overheadBetrag)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200 font-semibold">
                <td className="py-2">= Vollkosten (Selbstkosten je Stunde)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.vollkosten)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">+ Gewinn ({formatNumber(breakdown.gewinnmarge, 0)} % Aufschlag)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.gewinnBetrag)}</td>
              </tr>
              <tr className={`font-bold ${hasIndividualRate ? "border-b border-border/30 print:border-gray-200" : ""}`}>
                <td className="py-2">= Stundenverrechnungssatz (kalkuliert)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(breakdown.stundenverrechnungssatz)}</td>
              </tr>
              {hasIndividualRate && (
                <tr className="font-bold">
                  <td className="py-2">Verrechnungssatz dieses Objekts (individuell)</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(effectiveRate)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Wirtschaftlichkeit */}
          <h3 className={sectionHeading}>Wirtschaftlichkeit</h3>
          <table className="w-full text-sm mb-2">
            <tbody>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2 w-64">Status</td>
                <td className={`py-2 text-right font-semibold ${STATUS_TONES[strategy.status]} print:text-black`}>
                  {STATUS_LABELS[strategy.status]}
                </td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200 font-semibold">
                <td className="py-2">Monatspreis (netto)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(strategy.currentPriceMonthly)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Mindestpreis (rote Linie: Vollkosten)</td>
                <td className="py-2 text-right tabular-nums text-destructive print:text-black font-medium">{formatCurrency(strategy.minPriceMonthly)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Zielpreis (bei Ziel-Marge)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(strategy.targetPriceMonthly)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Marge (vom Umsatz)</td>
                <td className={`py-2 text-right tabular-nums font-medium ${marginTone} print:text-black`}>
                  {formatNumber(strategy.marginPct, 1)} %
                </td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Ziel-Marge (vom Umsatz)</td>
                <td className="py-2 text-right tabular-nums">
                  {formatNumber(strategy.targetMarginPct, 1)} %
                  <span className="text-muted-foreground print:text-gray-500"> (= {formatNumber(targetMargin, 0)} % Aufschlag)</span>
                </td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Verhandlungsspielraum bis zur roten Linie</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(strategy.negotiationRoomMonthly)}</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Break-even-Satz</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(strategy.breakEvenRate)}/h</td>
              </tr>
              <tr className="border-b border-border/30 print:border-gray-200">
                <td className="py-2">Preis pro m² (monatlich)</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(totals.pricePerSqm)}</td>
              </tr>
              <tr>
                <td className="py-2">Preis pro Stunde</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(effectiveRate)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground print:text-gray-500 mb-8">
            Unter dem Mindestpreis arbeitet das Objekt unter Vollkosten (Verlust). Marge und Ziel-Marge beziehen sich beide auf den Umsatz.
          </p>

          {/* Risiko */}
          <h3 className={sectionHeading}>Risikobewertung</h3>
          <p className="text-sm font-semibold mb-3">
            Risiko-Score: {risk.score}/100 — {RISK_LEVEL_LABELS[risk.level]}
            <span className="font-normal text-muted-foreground print:text-gray-500"> · Personalbedarf ≈ {formatNumber(risk.fte, 1)} Vollzeit-Äquivalente</span>
          </p>
          {risk.factors.length === 0 ? (
            <p className="text-sm text-muted-foreground print:text-gray-600 mb-8">Keine Risikofaktoren erkannt.</p>
          ) : (
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="border-b-2 border-border print:border-gray-300">
                  <th className="text-left py-2 font-semibold">Faktor</th>
                  <th className="text-left py-2 font-semibold">Empfehlung</th>
                  <th className="text-right py-2 font-semibold">Punkte</th>
                </tr>
              </thead>
              <tbody>
                {risk.factors.map((f) => (
                  <tr key={f.key} className="border-b border-border/30 print:border-gray-200 align-top">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground print:text-gray-500">{f.detail}</p>
                    </td>
                    <td className="py-2 pr-4">{f.recommendation}</td>
                    <td className="py-2 text-right tabular-nums">+{f.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Annahmen & Hinweise */}
          <h3 className={sectionHeading}>Annahmen &amp; Hinweise</h3>
          <ul className="text-sm space-y-1.5 mb-8 list-disc pl-5">
            <li>
              Rüstzeit: {(project.ruestzeit ?? 0) > 0 ? `${formatNumber(project.ruestzeit ?? 0, 0)} Min. je Einsatz` : "nicht kalkuliert"} ·
              Wegezeit: {(project.wegezeit ?? 0) > 0 ? `${formatNumber(project.wegezeit ?? 0, 0)} Min. je Einsatz` : "nicht kalkuliert"}
            </li>
            <li>Leistungswerte verstehen sich effektiv, inkl. Zu-/Abschlägen für Verschmutzungsgrad, Möblierung und Bodenart.</li>
            <li>Benchmark- und Marktwerte sind Branchen-Richtwerte zur Orientierung — sie ersetzen keine eigene Nachkalkulation.</li>
            <li>Der Kostenaufriss basiert auf der hinterlegten Verrechnungssatz-Konfiguration (Lohn, SV, Ausfallzeiten, Gemeinkosten).</li>
            {usesDefaultRate && (
              <li>Achtung: Es wird der unveränderte Standard-Verrechnungssatz verwendet — bitte mit der eigenen Kostenstruktur nachkalkulieren.</li>
            )}
            {hasIndividualRate && (
              <li>Für dieses Objekt ist ein individueller Verrechnungssatz hinterlegt; der Kostenaufriss zeigt die allgemeine Kalkulationsbasis.</li>
            )}
          </ul>

          <p className="mt-8 pt-4 border-t border-border/30 print:border-gray-200 text-xs text-muted-foreground print:text-gray-400">
            Internes Dokument — nicht zur Weitergabe an Kunden · Erstellt mit CleanCalc Pro · {new Date().toLocaleDateString("de-DE")}
          </p>
        </div>
      </div>
    </div>
  );
}
