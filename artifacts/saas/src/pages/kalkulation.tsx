import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUNDESLAENDER } from "@/data/bundeslaender";
import {
  type HourlyRateConfig,
  type EmploymentType,
  calcHourlyRate,
  getDefaultConfig,
} from "@/lib/hourly-rate-calc";
import {
  ArrowLeft,
  Save,
  ChevronDown,
  Euro,
  Shield,
  CalendarOff,
  Percent,
  Calculator,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function fmtEuro(v: number) {
  return v.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(v: number) {
  return v.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function NumberInput({
  value,
  onChange,
  suffix,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState(value.toString().replace(".", ","));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setRaw(value.toString().replace(".", ","));
    }
  }, [value, focused]);

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(raw.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setRaw(value.toString().replace(".", ","));
    }
  };

  return (
    <div className="relative">
      <Input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        inputMode="decimal"
        className={cn("bg-background border-border/50 h-11 pr-12", className)}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon size={18} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {badge}
            </span>
          )}
          <ChevronDown
            size={18}
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border/20 pt-4">{children}</div>}
    </div>
  );
}

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};

export default function Kalkulation() {
  const [, setLocation] = useLocation();
  const storedConfig = useStore((s) => s.hourlyRateConfig);
  const currentHourlyRate = useStore((s) => s.hourlyRate);
  const actions = useStoreActions();

  const [config, setConfig] = useState<HourlyRateConfig>(() => ({
    ...storedConfig,
    svRatesMinijob: storedConfig.svRatesMinijob.map((r) => ({ ...r })),
    svRatesVollzeit: storedConfig.svRatesVollzeit.map((r) => ({ ...r })),
    overheads: storedConfig.overheads.map((o) => ({ ...o })),
    ausfallzeiten: { ...storedConfig.ausfallzeiten },
  }));

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basislohn: true,
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
    <PageTransition className="min-h-screen pb-28 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <div className="flex items-center gap-3 mb-1">
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

      <div className="p-4 space-y-3">
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

        <Section
          title="Basislohn"
          icon={Euro}
          open={openSections.basislohn}
          onToggle={() => toggle("basislohn")}
          badge={`${fmtEuro(config.baseLohn)} €/h`}
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Beschäftigungsart
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["minijob", "teilzeit", "vollzeit"] as EmploymentType[]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => updateConfig({ employmentType: type })}
                    className={cn(
                      "h-10 rounded-xl text-sm font-medium transition-all border",
                      config.employmentType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border/50 text-muted-foreground hover:border-border"
                    )}
                  >
                    {EMPLOYMENT_LABELS[type]}
                  </button>
                )
              )}
            </div>
            {config.employmentType === "minijob" && (
              <p className="text-xs text-muted-foreground mt-2">
                Minijob-Grenze 2026: max. 603 €/Monat
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Brutto-Stundenlohn (Tariflohn LG1 ab 01/2026)
            </label>
            <NumberInput
              value={config.baseLohn}
              onChange={(v) => updateConfig({ baseLohn: v })}
              suffix="€/h"
            />
          </div>
        </Section>

        <Section
          title="Sozialversicherung AG-Anteil"
          icon={Shield}
          open={openSections.sv}
          onToggle={() => toggle("sv")}
          badge={`${fmtPct(svTotalRate)} %`}
        >
          <p className="text-xs text-muted-foreground -mt-1">
            {config.employmentType === "minijob"
              ? "Pauschale Abgaben für Minijob"
              : "Arbeitgeberanteile Teilzeit/Vollzeit"}
          </p>
          <div className="space-y-3">
            {activeSvRates.map((item, idx) => (
              <div key={`${config.employmentType}-${item.label}`} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-foreground truncate">
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground w-16 text-right tabular-nums shrink-0">
                  {fmtEuro(config.baseLohn * item.rate / 100)} €
                </span>
                <div className="w-24">
                  <NumberInput
                    value={item.rate}
                    onChange={(v) => updateSvRate(idx, v)}
                    suffix="%"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              SV-Beitrag pro Stunde
            </span>
            <span className="text-sm font-bold text-primary">
              {fmtEuro(breakdown.svBetrag)} €
            </span>
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Lohnkosten / Stunde
            </span>
            <span className="text-sm font-bold text-foreground">
              {fmtEuro(breakdown.lohnkostenProStunde)} €
            </span>
          </div>
        </Section>

        <Section
          title="Ausfallzeiten"
          icon={CalendarOff}
          open={openSections.ausfall}
          onToggle={() => toggle("ausfall")}
          badge={`${fmtPct(breakdown.produktivitaetsquote * 100)} % produktiv`}
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Wochenarbeitszeit
            </label>
            <NumberInput
              value={config.ausfallzeiten.weeklyHours}
              onChange={(v) => updateAusfall({ weeklyHours: v })}
              suffix="h/Woche"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Bundesland (Feiertage)
            </label>
            <select
              value={config.ausfallzeiten.bundeslandId}
              onChange={(e) => updateAusfall({ bundeslandId: e.target.value })}
              className="w-full h-11 rounded-xl border border-border/50 bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              {BUNDESLAENDER.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.feiertage2026} Tage)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Urlaubstage
              </label>
              <NumberInput
                value={config.ausfallzeiten.urlaubTage}
                onChange={(v) => updateAusfall({ urlaubTage: v })}
                suffix="Tage"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Krankheitstage
              </label>
              <NumberInput
                value={config.ausfallzeiten.krankheitTage}
                onChange={(v) => updateAusfall({ krankheitTage: v })}
                suffix="Tage"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Feiertage
              </label>
              <div className="h-11 rounded-xl border border-border/50 bg-background/50 px-4 flex items-center text-sm text-muted-foreground">
                {bl?.feiertage2026 ?? 10} Tage
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Fortbildung
              </label>
              <NumberInput
                value={config.ausfallzeiten.fortbildungTage}
                onChange={(v) => updateAusfall({ fortbildungTage: v })}
                suffix="Tage"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Jahresarbeitsstunden
              </span>
              <span className="text-foreground font-medium">
                {breakdown.jahresArbeitsstunden.toLocaleString("de-DE")} h
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Ausfallstunden gesamt
              </span>
              <span className="text-foreground font-medium">
                − {breakdown.totalAusfallStunden.toLocaleString("de-DE")} h
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Produktivstunden</span>
              <span className="text-primary font-bold">
                {breakdown.produktivStunden.toLocaleString("de-DE")} h
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Ausfallzuschlag
            </span>
            <span className="text-sm font-bold text-primary">
              × {fmtPct(breakdown.ausfallzuschlag)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Lohnkosten inkl. Ausfall
            </span>
            <span className="text-sm font-bold text-foreground">
              {fmtEuro(breakdown.lohnkostenMitAusfall)} €/h
            </span>
          </div>
        </Section>

        <Section
          title="Gemeinkosten & Zuschläge"
          icon={Percent}
          open={openSections.overhead}
          onToggle={() => toggle("overhead")}
          badge={`${fmtPct(breakdown.overheadTotalRate)} %`}
        >
          <div className="space-y-3">
            {config.overheads.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-foreground truncate">
                  {item.label}
                </span>
                <div className="w-24">
                  <NumberInput
                    value={item.rate}
                    onChange={(v) => updateOverhead(idx, v)}
                    suffix="%"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Gemeinkosten pro Stunde
            </span>
            <span className="text-sm font-bold text-primary">
              {fmtEuro(breakdown.overheadBetrag)} €
            </span>
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Vollkosten / Stunde
            </span>
            <span className="text-sm font-bold text-foreground">
              {fmtEuro(breakdown.vollkosten)} €
            </span>
          </div>
        </Section>

        <Section
          title="Gewinnmarge"
          icon={Calculator}
          open={openSections.gewinn}
          onToggle={() => toggle("gewinn")}
          badge={`${fmtPct(config.gewinnmarge)} %`}
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Gewinnaufschlag
            </label>
            <NumberInput
              value={config.gewinnmarge}
              onChange={(v) => updateConfig({ gewinnmarge: v })}
              suffix="%"
            />
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Gewinn pro Stunde
            </span>
            <span className="text-sm font-bold text-primary">
              {fmtEuro(breakdown.gewinnBetrag)} €
            </span>
          </div>
        </Section>

        <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
              Ergebnis
            </p>
            <p className="text-3xl font-bold text-primary">
              {fmtEuro(breakdown.stundenverrechnungssatz)} €/h
            </p>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Basislohn</span>
              <span className="text-foreground">
                {fmtEuro(breakdown.baseLohn)} €
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                + SV AG-Anteil ({fmtPct(breakdown.svTotalRate)} %)
              </span>
              <span className="text-foreground">
                {fmtEuro(breakdown.svBetrag)} €
              </span>
            </div>
            <div className="flex justify-between font-medium border-t border-border/30 pt-1.5">
              <span className="text-foreground">= Lohnkosten</span>
              <span className="text-foreground">
                {fmtEuro(breakdown.lohnkostenProStunde)} €
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                × Ausfallzuschlag ({fmtPct(breakdown.ausfallzuschlag)})
              </span>
              <span className="text-foreground">
                {fmtEuro(breakdown.lohnkostenMitAusfall)} €
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                + Gemeinkosten ({fmtPct(breakdown.overheadTotalRate)} %)
              </span>
              <span className="text-foreground">
                {fmtEuro(breakdown.overheadBetrag)} €
              </span>
            </div>
            <div className="flex justify-between font-medium border-t border-border/30 pt-1.5">
              <span className="text-foreground">= Vollkosten</span>
              <span className="text-foreground">
                {fmtEuro(breakdown.vollkosten)} €
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                + Gewinn ({fmtPct(config.gewinnmarge)} %)
              </span>
              <span className="text-foreground">
                {fmtEuro(breakdown.gewinnBetrag)} €
              </span>
            </div>
            <div className="flex justify-between font-bold text-primary border-t border-primary/30 pt-1.5">
              <span>= Verrechnungssatz</span>
              <span>{fmtEuro(breakdown.stundenverrechnungssatz)} €/h</span>
            </div>
          </div>
        </div>

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

      <BottomNav />
    </PageTransition>
  );
}
