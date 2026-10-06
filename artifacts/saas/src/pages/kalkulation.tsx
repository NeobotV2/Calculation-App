import { useState, useMemo, useCallback } from "react";
import { Check, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Kpi } from "@/components/ui/kpi";
import { Money, formatMoney } from "@/components/ui/money";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BUNDESLAENDER } from "@/data/bundeslaender";
import {
  type HourlyRateConfig,
  type CleaningType,
  type SchichtzuschlagConfig,
  adoptedRate,
  calcHourlyRate,
  getDefaultConfig,
  CLEANING_TYPE_LABELS,
  CLEANING_TYPE_OVERHEADS,
} from "@/lib/hourly-rate-calc";
import { isDefaultRateSetting, type EconomicsSettings } from "@/lib/object-economics";
import { calcRateImpact, type RateImpact } from "@/pages/auswertung/portfolio";
import { BasislohnSection } from "./kalkulation/sections/BasislohnSection";
import { SchichtzuschlaegeSection } from "./kalkulation/sections/SchichtzuschlaegeSection";
import { SvSection } from "./kalkulation/sections/SvSection";
import { AusfallzeitenSection } from "./kalkulation/sections/AusfallzeitenSection";
import { GemeinkostenSection } from "./kalkulation/sections/GemeinkostenSection";
import { GewinnmargeSection } from "./kalkulation/sections/GewinnmargeSection";
import { ResultSummary } from "./kalkulation/sections/ResultSummary";
import { BenchmarkCard } from "./kalkulation/sections/BenchmarkCard";
import { CLEANING_TYPES } from "./kalkulation/constants";


/** „Betrifft 3 Objekte ohne eigenen Satz · Monatsumsatz +120,00 €" */
export function rateImpactText(impact: RateImpact): string {
  const objects = `${impact.affectedCount} ${impact.affectedCount === 1 ? "Objekt" : "Objekte"} ohne eigenen Satz`;
  return `Betrifft ${objects} · Monatsumsatz ${formatMoney(impact.deltaMonthly, { signed: true })}`;
}

function ImpactCallout({ impact }: { impact: RateImpact }) {
  return (
    <Callout tone="info" title="Auswirkung beim Übernehmen">
      <p>{rateImpactText(impact)}</p>
      <p className="text-xs text-muted-foreground">
        Objekte mit eigenem Verrechnungssatz behalten ihren Preis; deren Vollkosten und Marge ändern sich dennoch.
      </p>
    </Callout>
  );
}

export default function Kalkulation() {
  const storedConfig = useStore((s) => s.hourlyRateConfig);
  const currentHourlyRate = useStore((s) => s.hourlyRate);
  const confirmedHourlyRate = useStore((s) => s.confirmedHourlyRate);
  const confirmHourlyRate = useStore((s) => s.confirmHourlyRate);
  const projects = useStore((s) => s.projects);
  const settings = useEconomicsSettings();
  const actions = useStoreActions();
  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState<HourlyRateConfig>(() => {
    const defaults = getDefaultConfig();
    const sz = storedConfig.schichtzuschlaege ?? defaults.schichtzuschlaege;
    return {
      ...storedConfig,
      svRatesMinijob: storedConfig.svRatesMinijob.map((r) => ({ ...r })),
      svRatesVollzeit: storedConfig.svRatesVollzeit.map((r) => ({ ...r })),
      overheads: storedConfig.overheads.map((o) => ({ ...o })),
      ausfallzeiten: { ...storedConfig.ausfallzeiten },
      schichtzuschlaege: {
        nacht: { ...defaults.schichtzuschlaege.nacht, ...(sz.nacht ?? {}) },
        sonntag: { ...defaults.schichtzuschlaege.sonntag, ...(sz.sonntag ?? {}) },
        feiertag: { ...defaults.schichtzuschlaege.feiertag, ...(sz.feiertag ?? {}) },
      },
    };
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basislohn: true,
    schicht: false,
    sv: false,
    ausfall: false,
    overhead: false,
    gewinn: false,
  });

  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const breakdown = useMemo(() => calcHourlyRate(config), [config]);

  const activeSvRates =
    config.employmentType === "minijob"
      ? config.svRatesMinijob
      : config.svRatesVollzeit;
  const svTotalRate = activeSvRates.reduce((s, r) => s + r.rate, 0);

  const updateConfig = useCallback(
    (patch: Partial<HourlyRateConfig>) =>
      setConfig((c) => ({ ...c, ...patch })),
    []
  );

  const updateSvRate = useCallback(
    (index: number, rate: number) => {
      setConfig((c) => {
        const key =
          c.employmentType === "minijob"
            ? "svRatesMinijob"
            : "svRatesVollzeit";
        const updated = c[key].map((r, i) =>
          i === index ? { ...r, rate } : r
        );
        return { ...c, [key]: updated };
      });
    },
    []
  );

  const updateOverhead = useCallback((index: number, rate: number) => {
    setConfig((c) => ({
      ...c,
      overheads: c.overheads.map((o, i) => (i === index ? { ...o, rate } : o)),
    }));
  }, []);

  const updateAusfall = useCallback(
    (patch: Partial<HourlyRateConfig["ausfallzeiten"]>) => {
      setConfig((c) => ({
        ...c,
        ausfallzeiten: { ...c.ausfallzeiten, ...patch },
      }));
    },
    []
  );

  const updateSchichtzuschlag = useCallback(
    (key: "nacht" | "sonntag" | "feiertag", patch: Partial<SchichtzuschlagConfig>) => {
      setConfig((c) => ({
        ...c,
        schichtzuschlaege: {
          ...c.schichtzuschlaege,
          [key]: { ...c.schichtzuschlaege[key], ...patch },
        },
      }));
    },
    []
  );

  const hasAnySchichtzuschlag =
    config.schichtzuschlaege.nacht.enabled ||
    config.schichtzuschlaege.sonntag.enabled ||
    config.schichtzuschlaege.feiertag.enabled;

  // Übernommener Satz: Rechner-Ergebnis auf den Cent aufgerundet (erreicht die Zielmarge).
  const newRate = adoptedRate(breakdown);
  const hasChanged = JSON.stringify(config) !== JSON.stringify(storedConfig) || newRate !== currentHourlyRate;
  // Unveränderte Standardwerte lassen sich ausdrücklich bestätigen („Verrechnungssatz prüfen“ in Erste Schritte).
  const needsConfirm = !hasChanged && isDefaultRateSetting(currentHourlyRate, storedConfig, confirmedHourlyRate);

  // Auswirkung auf den Monatsumsatz: computeObjectEconomics mit alten vs. neuen
  // Einstellungen (gleiche Regel wie updateHourlyRateConfig im Store).
  const impact = useMemo<RateImpact | null>(() => {
    if (!hasChanged) return null;
    const next: EconomicsSettings = {
      ...settings,
      hourlyRate: newRate,
      hourlyRateConfig: config,
      targetMargin: settings.targetMargin === storedConfig.gewinnmarge ? config.gewinnmarge : settings.targetMargin,
    };
    return calcRateImpact(projects, settings, next);
  }, [hasChanged, settings, newRate, config, storedConfig.gewinnmarge, projects]);

  const handleSave = async () => {
    if (isSaving) return;
    if (needsConfirm) {
      confirmHourlyRate(currentHourlyRate);
      toast.success("Verrechnungssatz bestätigt", {
        description: "Die Standardwerte passen zu Ihrem Betrieb – der Satz gilt als geprüft.",
      });
      // In der Cloud merken, damit die Bestätigung nach erneutem Anmelden und auf anderen Geräten gilt.
      void actions.updateSettings({ confirmedHourlyRate: currentHourlyRate }).catch(() => {});
      return;
    }
    const note = impact ? rateImpactText(impact) : undefined;
    setIsSaving(true);
    try {
      useStore.getState().updateHourlyRateConfig(config);
      await actions.updateSettings({ hourlyRate: newRate, confirmedHourlyRate: newRate });
      confirmHourlyRate(newRate);
      toast.success("Verrechnungssatz übernommen", note ? { description: note } : undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Der Verrechnungssatz konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleaningTypeChange = useCallback((type: CleaningType) => {
    setConfig((c) => ({
      ...c,
      cleaningType: type,
      overheads: CLEANING_TYPE_OVERHEADS[type].map((o) => ({ ...o })),
    }));
  }, []);

  const handleReset = () => {
    setConfig(getDefaultConfig());
    toast.success("Standardwerte eingesetzt – übernehmen Sie sie mit „Als Verrechnungssatz übernehmen“.");
  };

  const bl = BUNDESLAENDER.find(
    (b) => b.id === config.ausfallzeiten.bundeslandId
  );

  return (
    <PageTransition>
      <PageShell
        header={
          <PageHeader
            title="Verrechnungssatz"
            back={{ href: "/mehr", label: "Mehr", phoneOnly: true }}
            subtitle="Kalkulieren Sie Ihren Stundenverrechnungssatz aus Lohn, Zuschlägen, Ausfallzeiten und Gemeinkosten."
          />
        }
        rail={
          <>
            <ResultSummary config={config} breakdown={breakdown} savedRate={currentHourlyRate}>
              {impact && (
                <div className="hidden lg:block">
                  <ImpactCallout impact={impact} />
                </div>
              )}
            </ResultSummary>
          </>
        }
        railLabel="Rechenweg"
      >
        <div className="space-y-4">
          <Card className="lg:hidden">
            <Kpi
              label="Ihr Verrechnungssatz"
              value={newRate}
              format="currency"
              period="hour"
              emphasis="hero"
              tone="brand"
              hint={
                <>
                  Aktuell gespeichert: <Money value={currentHourlyRate} size="sm" period="hour" />
                </>
              }
            />
          </Card>
          {impact && (
            <div className="lg:hidden">
              <ImpactCallout impact={impact} />
            </div>
          )}

          <Card as="section" aria-labelledby="rate-cleaning-type">
            <fieldset className="space-y-2">
              <legend id="rate-cleaning-type" className="mb-2 text-h3 text-foreground">
                Reinigungsart
              </legend>
              <ToggleGroup
                type="single"
                variant="chip"
                value={config.cleaningType}
                onValueChange={(v) => {
                  if (v) handleCleaningTypeChange(v as CleaningType);
                }}
                aria-label="Reinigungsart"
              >
                {CLEANING_TYPES.map((type) => (
                  <ToggleGroupItem key={type} value={type}>
                    {CLEANING_TYPE_LABELS[type]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                Die Reinigungsart setzt Vorschlagswerte für die Gemeinkosten. Sie können diese anschließend anpassen.
              </p>
            </fieldset>
          </Card>

          <BasislohnSection
            config={config}
            open={openSections.basislohn}
            onToggle={() => toggle("basislohn")}
            updateConfig={updateConfig}
          />

          <SchichtzuschlaegeSection
            config={config}
            breakdown={breakdown}
            open={openSections.schicht}
            onToggle={() => toggle("schicht")}
            updateSchichtzuschlag={updateSchichtzuschlag}
            hasAnySchichtzuschlag={hasAnySchichtzuschlag}
          />

          <SvSection
            config={config}
            breakdown={breakdown}
            open={openSections.sv}
            onToggle={() => toggle("sv")}
            activeSvRates={activeSvRates}
            svTotalRate={svTotalRate}
            updateSvRate={updateSvRate}
          />

          <AusfallzeitenSection
            config={config}
            breakdown={breakdown}
            open={openSections.ausfall}
            onToggle={() => toggle("ausfall")}
            updateAusfall={updateAusfall}
            bl={bl}
          />

          <GemeinkostenSection
            config={config}
            breakdown={breakdown}
            open={openSections.overhead}
            onToggle={() => toggle("overhead")}
            updateOverhead={updateOverhead}
          />

          <GewinnmargeSection
            config={config}
            breakdown={breakdown}
            open={openSections.gewinn}
            onToggle={() => toggle("gewinn")}
            updateConfig={updateConfig}
          />

          <BenchmarkCard config={config} breakdown={breakdown} />
        </div>
      </PageShell>

      <StickyActionBar chrome="app" label="Verrechnungssatz übernehmen">
        <div className="min-w-0 flex-1 text-sm">
          <span className="block text-label text-muted-foreground">
            {hasChanged ? "Neuer Verrechnungssatz" : needsConfirm ? "Standardwerte, noch nicht bestätigt" : "Verrechnungssatz ist aktuell"}
          </span>
          <Money value={newRate} period="hour" className="font-semibold text-foreground" />
        </div>
        <Button type="button" variant="ghost" onClick={handleReset}>
          <RotateCcw aria-hidden="true" />
          <span className="hidden sm:inline">Standardwerte</span>
          <span className="sr-only sm:hidden">Standardwerte</span>
        </Button>
        {needsConfirm ? (
          <Button type="button" onClick={handleSave}>
            <Check aria-hidden="true" />
            <span className="hidden sm:inline">Standardwerte bestätigen</span>
            <span className="sm:hidden">Bestätigen</span>
          </Button>
        ) : (
          <Button type="button" onClick={handleSave} disabled={!hasChanged} loading={isSaving}>
            <Save aria-hidden="true" />
            <span className="hidden sm:inline">Als Verrechnungssatz übernehmen</span>
            <span className="sm:hidden">Übernehmen</span>
          </Button>
        )}
      </StickyActionBar>
    </PageTransition>
  );
}
