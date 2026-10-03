import * as React from "react";
import { Link } from "wouter";
import { ArrowRight, Clock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormField } from "@/components/ui/form-field";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { ModuleIcon } from "@/components/ui/module-badge";
import { Money } from "@/components/ui/money";
import { NumberInput } from "@/components/ui/number-input";
import { PriceRangeBar } from "@/components/ui/price-range-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ObjectComponent } from "@/lib/object-totals";
import { marginTone, strategyLabel, strategyTone } from "@/lib/status";
import { formatNumber, parseDecimal } from "@/lib/utils";
import { RateWaterfall } from "../RateWaterfall";
import { rateInputFrom, roundUpRate } from "../flow-state";
import type { FlowStepProps } from "../flow-steps";

const fmtRate = (v: number) => `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/h`;
const fmtPct = (v: number) => `${formatNumber(Number.isFinite(v) ? v : 0, 1)} %`;
const fmtHours = (v: number) => formatNumber(v, 1);

function ComponentLabel({ c }: { c: ObjectComponent }) {
  const icon =
    c.key === "ruest_wege" ? (
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Clock aria-hidden="true" className="size-3.5" />
      </span>
    ) : (
      <ModuleIcon module={c.key === "reinigung" ? "unterhalt" : c.key} size="sm" />
    );
  return (
    <span className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{c.label}</span>
    </span>
  );
}

/** Schritt 6 · Preis & Wirtschaftlichkeit (§6.4). Alle Urteile: strategy.marginPct vs. strategy.targetMarginPct. */
export function StepPreis({ draft, dispatch, econ, settings, goToStep }: FlowStepProps) {
  const uid = React.useId();
  const { strategy, totals, breakdown } = econ;
  const target = strategy.targetMarginPct;
  const rateValue = React.useMemo(() => {
    const v = parseDecimal(draft.base.rateInput);
    return v !== undefined && v > 0 ? v : undefined;
  }, [draft.base.rateInput]);
  const setRateInput = (rateInput: string) => dispatch({ type: "setBase", patch: { rateInput } });
  const hasPrice = totals.priceMonthly > 0;
  const critical = hasPrice && strategy.status === "kritisch";
  const targetRateRounded = roundUpRate(strategy.targetRate);
  const canUseDefault = rateValue !== undefined && settings.hourlyRate > econ.effectiveRate;
  const wdCfg = draft.modules.winterdienst ? draft.winterdienst : undefined;
  const hmsCfg = draft.modules.hms ? draft.hms : undefined;

  const columns: Column<ObjectComponent>[] = [
    { id: "label", header: "Leistung", cell: (c) => <ComponentLabel c={c} />, footer: "Gesamt" },
    {
      id: "hours", header: "Std./Mo", numeric: true, hideBelow: "lg",
      cell: (c) => fmtHours(c.hoursMonthly), footer: fmtHours(totals.laborHoursMonthly),
    },
    { id: "price", header: "Preis/Mo", numeric: true, cell: (c) => <Money value={c.priceMonthly} />, footer: <Money value={totals.priceMonthly} /> },
    { id: "cost", header: "Kosten/Mo", numeric: true, cell: (c) => <Money value={c.costMonthly} />, footer: <Money value={totals.costMonthly} /> },
    {
      id: "db", header: "DB/Mo", numeric: true,
      cell: (c) => <Money value={c.priceMonthly - c.costMonthly} signed />,
      footer: <Money value={totals.contributionMonthly} signed />,
    },
    {
      id: "margin", header: "Marge", align: "end",
      cell: (c) => {
        const m = c.priceMonthly > 0 ? ((c.priceMonthly - c.costMonthly) / c.priceMonthly) * 100 : 0;
        return <StatusBadge size="sm" tone={c.priceMonthly > 0 ? marginTone(m, target) : "neutral"} label={fmtPct(m)} />;
      },
      footer: <StatusBadge size="sm" tone={hasPrice ? marginTone(totals.marginPct, target) : "neutral"} label={fmtPct(totals.marginPct)} />,
    },
  ];

  return (
    <div className="space-y-6">
      {critical && (
        <Callout
          tone="critical"
          live
          title="Preis unter Vollkosten"
          action={
            <>
              <Button type="button" size="sm" onClick={() => setRateInput(rateInputFrom(targetRateRounded))}>
                Auf Zielsatz setzen ({fmtRate(targetRateRounded)})
              </Button>
              {canUseDefault && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setRateInput("")}>
                  Standardsatz übernehmen ({fmtRate(settings.hourlyRate)})
                </Button>
              )}
            </>
          }
        >
          Der Monatspreis deckt die Vollkosten nicht: Deckungsbeitrag{" "}
          <Money value={strategy.contributionMonthly} signed period="month" className="font-medium" />.
        </Callout>
      )}

      <Card as="section" aria-labelledby={`${uid}-rate`}>
        <CardHeader
          title={<span id={`${uid}-rate`}>Verrechnungssatz</span>}
          description="Eigener Satz für dieses Objekt – leer lassen, um den Standardsatz zu verwenden."
        />
        <div className="grid gap-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-start">
          <FormField id="rate" label="Objektsatz" hint={`Leer = Standardsatz (${fmtRate(settings.hourlyRate)})`}>
            <NumberInput
              value={rateValue}
              onValueChange={(v) => setRateInput(v !== undefined && v > 0 ? rateInputFrom(v) : "")}
              unit="€/h"
              decimals={2}
              min={0}
              max={999}
              placeholder={`Standard: ${formatNumber(settings.hourlyRate, 2)}`}
            />
          </FormField>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-label text-muted-foreground">Wirksamer Satz</dt>
              <dd className="font-semibold tabular-nums text-foreground">{fmtRate(econ.effectiveRate)}</dd>
            </div>
            <div>
              <dt className="text-label text-muted-foreground">Vollkosten</dt>
              <dd className="tabular-nums text-foreground">{fmtRate(breakdown.vollkosten)}</dd>
            </div>
            <div>
              <dt className="text-label text-muted-foreground">{totals.hasModules ? "Zielsatz Reinigung" : "Zielsatz"}</dt>
              <dd className="tabular-nums text-foreground">{fmtRate(strategy.targetRate)}</dd>
            </div>
          </dl>
        </div>

        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="waterfall" className="border-b-0 border-t">
            <AccordionTrigger>Wie setzt sich der Satz zusammen?</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <RateWaterfall breakdown={breakdown} />
              <p className="text-xs text-muted-foreground">
                Aufbau aus Ihrem Verrechnungssatz-Kalkulator. Ihr Entwurf bleibt gespeichert, wenn Sie den Kalkulator öffnen.
              </p>
              <Button asChild variant="link" size="sm">
                <Link href="/verrechnungssatz">
                  Im Verrechnungssatz anpassen
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {(wdCfg || hmsCfg) && (
          <ul className="mt-2 space-y-2 border-t border-border pt-4 text-sm" aria-label="Sätze der Zusatzleistungen">
            {wdCfg && (
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <ModuleIcon module="winterdienst" size="sm" />
                <span className="text-foreground">
                  {wdCfg.rateOverride && wdCfg.rateOverride > 0
                    ? `Winterdienst: eigener Satz ${fmtRate(wdCfg.rateOverride)}`
                    : `Winterdienst rechnet mit ${fmtRate(econ.effectiveRate)}`}
                </span>
                <Button type="button" variant="link" size="sm" onClick={() => goToStep("winterdienst")}>
                  Im Modul ändern
                </Button>
              </li>
            )}
            {hmsCfg && (
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <ModuleIcon module="hms" size="sm" />
                <span className="text-foreground">
                  {hmsCfg.rateOverride && hmsCfg.rateOverride > 0
                    ? `Hausmeisterservice: eigener Satz ${fmtRate(hmsCfg.rateOverride)}`
                    : `Hausmeisterservice rechnet mit ${fmtRate(econ.effectiveRate)}`}
                </span>
                <Button type="button" variant="link" size="sm" onClick={() => goToStep("hms")}>
                  Im Modul ändern
                </Button>
              </li>
            )}
          </ul>
        )}
      </Card>

      <section aria-labelledby={`${uid}-components`} className="space-y-3">
        <h3 id={`${uid}-components`} className="text-h3 text-foreground">
          Kosten und Deckungsbeitrag je Leistung
        </h3>
        <DataTable
          caption="Preis, Kosten, Deckungsbeitrag und Marge je Leistung pro Monat"
          columns={columns}
          rows={totals.components}
          getRowId={(c) => c.key}
          density="compact"
          empty={
            <p className="rounded-lg border border-dashed border-border-strong bg-card p-4 text-sm text-muted-foreground">
              Noch keine Leistungen mit Preis. Erfassen Sie Räume oder Zusatzleistungen.
            </p>
          }
          mobile={(c) => {
            const m = c.priceMonthly > 0 ? ((c.priceMonthly - c.costMonthly) / c.priceMonthly) * 100 : 0;
            return (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <ComponentLabel c={c} />
                  <p className="text-xs text-muted-foreground">
                    Kosten <Money value={c.costMonthly} size="sm" /> · DB <Money value={c.priceMonthly - c.costMonthly} size="sm" signed />
                  </p>
                </div>
                <div className="shrink-0 space-y-1 text-right">
                  <Money value={c.priceMonthly} className="font-medium" />
                  <div>
                    <StatusBadge size="sm" tone={c.priceMonthly > 0 ? marginTone(m, target) : "neutral"} label={fmtPct(m)} />
                  </div>
                </div>
              </div>
            );
          }}
          mobileFooter={
            <div className="flex items-center justify-between gap-3">
              <span>Gesamt</span>
              <Money value={totals.priceMonthly} period="month" />
            </div>
          }
        />
      </section>

      <Card as="section" aria-labelledby={`${uid}-cockpit`}>
        <CardHeader
          title={<span id={`${uid}-cockpit`}>Wirtschaftlichkeit</span>}
          action={
            hasPrice ? (
              <StatusBadge tone={strategyTone(strategy.status)} label={strategyLabel(strategy.status)} />
            ) : (
              <StatusBadge tone="neutral" label="Noch kein Preis" />
            )
          }
        />
        {hasPrice ? (
          <div className="space-y-5">
            <PriceRangeBar
              min={strategy.minPriceMonthly}
              current={strategy.currentPriceMonthly}
              target={strategy.targetPriceMonthly}
            />
            <KpiGroup columns={3}>
              <Kpi
                label="Marge (vom Umsatz)"
                value={
                  <StatusBadge tone={marginTone(strategy.marginPct, target)} label={fmtPct(strategy.marginPct)} />
                }
                hint={`Ziel ${fmtPct(target)}`}
              />
              <Kpi label="Deckungsbeitrag" value={strategy.contributionMonthly} format="currency" period="month" signed />
              <Kpi
                label="Verhandlungsspielraum"
                value={strategy.negotiationRoomMonthly}
                format="currency"
                period="month"
                info="Monatspreis abzüglich Mindestpreis (Vollkosten). Darunter entsteht Verlust."
              />
            </KpiGroup>
            <Accordion type="single" collapsible>
              <AccordionItem value="sensitivity" className="border-b-0 border-t">
                <AccordionTrigger>Was wäre, wenn …? (Sensitivität)</AccordionTrigger>
                <AccordionContent>
                  <ul className="divide-y divide-border">
                    {econ.sensitivity.map((s) => (
                      <li key={s.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                        <span className="min-w-0 flex-1 text-sm text-foreground">{s.label}</span>
                        <span className="flex items-center gap-3">
                          <Money value={s.contributionMonthly} signed period="month" size="sm" />
                          <StatusBadge
                            size="sm"
                            tone={s.belowCost ? "critical" : marginTone(s.marginPct, target)}
                            label={s.belowCost ? `Unter Vollkosten (${fmtPct(s.marginPct)})` : `Marge ${fmtPct(s.marginPct)}`}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sobald Räume oder Zusatzleistungen erfasst sind, sehen Sie hier Mindest-, Ziel- und Ihren Preis.
          </p>
        )}
      </Card>
    </div>
  );
}
