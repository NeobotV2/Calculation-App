import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { BUNDESLAENDER } from "@/data/bundeslaender";
import {
  type HourlyRateConfig,
  type CleaningType,
  type SchichtzuschlagConfig,
  calcHourlyRate,
  getDefaultConfig,
  CLEANING_TYPE_LABELS,
  CLEANING_TYPE_OVERHEADS,
} from "@/lib/hourly-rate-calc";
import {
  ArrowLeft,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatEuro } from "@/lib/utils";
import { BasislohnSection } from "./kalkulation/sections/BasislohnSection";
import { SchichtzuschlaegeSection } from "./kalkulation/sections/SchichtzuschlaegeSection";
import { SvSection } from "./kalkulation/sections/SvSection";
import { AusfallzeitenSection } from "./kalkulation/sections/AusfallzeitenSection";
import { GemeinkostenSection } from "./kalkulation/sections/GemeinkostenSection";
import { GewinnmargeSection } from "./kalkulation/sections/GewinnmargeSection";
import { ResultSummary } from "./kalkulation/sections/ResultSummary";
import { BenchmarkCard } from "./kalkulation/sections/BenchmarkCard";

const fmtEuro = formatEuro;

export default function Kalkulation() {
  const [, setLocation] = useLocation();
  const storedConfig = useStore((s) => s.hourlyRateConfig);
  const currentHourlyRate = useStore((s) => s.hourlyRate);
  const actions = useStoreActions();

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

  const handleSave = async () => {
    try {
      useStore.getState().updateHourlyRateConfig(config);
      await actions.updateSettings({
        hourlyRate: Math.round(breakdown.stundenverrechnungssatz * 100) / 100,
      });
      toast.success("Stundenverrechnungssatz übernommen");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Speichern"
      );
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
    toast.success("Auf Standardwerte zurückgesetzt");
  };

  const bl = BUNDESLAENDER.find(
    (b) => b.id === config.ausfallzeiten.bundeslandId
  );

  const hasChanged = JSON.stringify(config) !== JSON.stringify(storedConfig) ||
    Math.round(breakdown.stundenverrechnungssatz * 100) / 100 !== currentHourlyRate;

  return (
    <PageTransition className="min-h-screen pb-28 md:pb-8 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20 md:pt-6">
        <div className="flex items-center gap-3 mb-1 max-w-5xl mx-auto">
          <button
            onClick={() => setLocation("/einstellungen")}
            className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Verrechnungssatz-Kalkulator
            </h1>
            <p className="text-xs text-muted-foreground">
              Verrechnungssatz kalkulieren
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-5xl mx-auto">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
            Stundenverrechnungssatz
          </p>
          <p className="text-4xl font-bold text-primary tracking-tight">
            {fmtEuro(breakdown.stundenverrechnungssatz)} €
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Aktuell gespeichert: {fmtEuro(currentHourlyRate)} €/h
          </p>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Reinigungsart
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["unterhalt", "sonder", "glas", "bauend"] as CleaningType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => handleCleaningTypeChange(type)}
                  className={cn(
                    "h-9 rounded-xl text-xs font-medium transition-all border",
                    config.cleaningType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {CLEANING_TYPE_LABELS[type]}
                </button>
              )
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Die Reinigungsart setzt Vorschlagswerte für Gemeinkosten. Sie können anschließend manuell anpassen.
          </p>
        </div>

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

        <ResultSummary config={config} breakdown={breakdown} />

        <BenchmarkCard config={config} breakdown={breakdown} />

        <div className="space-y-2 pt-2">
          <Button onClick={handleSave} className="w-full h-12" disabled={!hasChanged}>
            <Save size={18} className="mr-2" />
            {hasChanged
              ? "Als Verrechnungssatz übernehmen"
              : "Verrechnungssatz bereits aktuell"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full h-12 text-muted-foreground"
          >
            <RotateCcw size={16} className="mr-2" /> Standardwerte
          </Button>
        </div>
      </div>

    </PageTransition>
  );
}
