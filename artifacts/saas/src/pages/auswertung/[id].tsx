import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { ArrowLeft, Download, X, PieChart as PieChartIcon, BarChart3, ClipboardCheck } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { compareNachkalkulation } from "@/lib/nachkalkulation";
import { formatCurrency, formatNumber, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AuswertungDetail() {
  const [, params] = useRoute("/auswertung/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const nachkalkulation = useStore((s) => (id ? s.nachkalkulationen[id] : undefined));
  const setNachkalkulation = useStore((s) => s.setNachkalkulation);
  const removeNachkalkulation = useStore((s) => s.removeNachkalkulation);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [nkHours, setNkHours] = useState("");
  const [nkNote, setNkNote] = useState("");
  const [nkEditing, setNkEditing] = useState(false);
  const [nkRemoveConfirm, setNkRemoveConfirm] = useState(false);
  const vollkosten = useMemo(() => calcHourlyRate(hourlyRateConfig).vollkosten, [hourlyRateConfig]);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <X size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Objekt nicht gefunden</h3>
        <p className="text-sm text-muted-foreground mb-4">Das Objekt wurde möglicherweise gelöscht.</p>
        <Button variant="outline" onClick={() => setLocation("/auswertung")}>Zum Controlling</Button>
      </div>
    );
  }

  const effectiveRate = project.hourlyRate ?? hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);

  // Echte Kostenbasis statt Pauschalannahmen: Vollkosten aus dem
  // Verrechnungssatz-Kalkulator, Gewinnbeitrag = Preis − Vollkosten.
  const vollkostenMonthly = totals.hours * vollkosten;
  const gewinnbeitrag = totals.cost - vollkostenMonthly;
  const realeMargePct = totals.cost > 0 ? (gewinnbeitrag / totals.cost) * 100 : 0;

  const nkResult = nachkalkulation
    ? compareNachkalkulation({
        plannedHours: totals.hours,
        actualHours: nachkalkulation.actualMonthlyHours,
        monthlyPrice: totals.cost,
        vollkosten,
        area: totals.area,
      })
    : null;

  const nkVerdictMeta = nkResult
    ? nkResult.verdict === "besser"
      ? { label: "Besser als geplant", tone: "text-success" }
      : nkResult.verdict === "im_plan"
        ? { label: "Im Plan", tone: "text-success" }
        : nkResult.actualMarginPct < 0
          ? { label: "Kritisch — Verlust", tone: "text-destructive" }
          : { label: "Schlechter als geplant", tone: "text-warning" }
    : null;

  const handleNkSave = () => {
    const parsed = parseFloat(nkHours.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Bitte geben Sie die tatsächlichen Monatsstunden ein (z. B. 42,5).");
      return;
    }
    setNachkalkulation(project.id, { actualMonthlyHours: parsed, note: nkNote });
    setNkEditing(false);
    setNkHours("");
    setNkNote("");
    toast.success("Nachkalkulation gespeichert");
  };

  const startNkEditing = () => {
    setNkHours(nachkalkulation ? String(nachkalkulation.actualMonthlyHours).replace(".", ",") : "");
    setNkNote(nachkalkulation?.note ?? "");
    setNkEditing(true);
  };

  const groupMap = new Map<string, { hours: number; cost: number }>();
  project.rooms.forEach((r) => {
    const rc = calcRoom(r, effectiveRate);
    const existing = groupMap.get(r.groupName) || { hours: 0, cost: 0 };
    groupMap.set(r.groupName, { hours: existing.hours + rc.monthlyHours, cost: existing.cost + rc.monthlyCost });
  });

  const groupCostData = Array.from(groupMap.entries())
    .map(([name, data]) => ({ name, value: Math.round(data.cost * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const roomHoursData = project.rooms.map((r) => {
    const rc = calcRoom(r, effectiveRate);
    return {
      name: (r.name || r.typeName).length > 18 ? (r.name || r.typeName).slice(0, 17) + "…" : (r.name || r.typeName),
      fullName: r.name || r.typeName,
      stunden: Math.round(rc.monthlyHours * 10) / 10,
    };
  }).sort((a, b) => b.stunden - a.stunden);

  const pieChartConfig: Record<string, { label: string; color: string }> = {};
  groupCostData.forEach((item, i) => {
    pieChartConfig[item.name] = { label: item.name, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  const hoursChartConfig = {
    stunden: { label: "Stunden", color: "hsl(var(--primary))" },
  };

  const handlePDF = () => {
    const gate = canUsePDF();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }
    setLocation(`/print/${project.id}`);
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 safe-header pb-3 flex items-center justify-between pt-12 md:pt-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/objekte/${project.id}`)} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-lg text-foreground truncate max-w-[200px]">{project.name}</h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-primary mb-2 font-medium">Monatsumsatz netto</p>
          <h2 className="text-5xl font-bold tabular-nums text-foreground mb-6">{formatCurrency(totals.cost)}</h2>
          <div className="grid grid-cols-2 gap-4 border-t border-primary/20 pt-4">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Jahreswert</p>
              <p className="font-semibold text-lg text-foreground">{formatCurrency(totals.annualCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Stunden / Monat</p>
              <p className="font-semibold text-lg text-foreground">{formatNumber(totals.hours, 1)} h</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Räume</p>
            <p className="text-2xl font-bold text-foreground">{totals.count}</p>
          </div>
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Fläche</p>
            <p className="text-2xl font-bold text-foreground">{formatNumber(totals.area, 0)} m²</p>
          </div>
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ø Preis/m²</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.pricePerSqm)}</p>
          </div>
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Verrechnungssatz</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(effectiveRate)}</p>
          </div>
        </div>

        {groupCostData.length > 0 ? (
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <PieChartIcon size={14} /> Kosten nach Raumgruppe
            </h3>
            <ChartContainer config={pieChartConfig} className="aspect-square w-full max-w-[280px] mx-auto">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium">{formatCurrency(Number(value))}</span>
                      )}
                      nameKey="name"
                    />
                  }
                />
                <Pie
                  data={groupCostData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="75%"
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name.length > 10 ? name.slice(0, 9) + "…" : name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {groupCostData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="bg-card border border-border/20 rounded-2xl p-6 text-center">
            <PieChartIcon size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Keine Raumgruppen vorhanden</p>
          </div>
        )}

        {roomHoursData.length > 0 ? (
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <BarChart3 size={14} /> Stunden pro Raum
            </h3>
            <ChartContainer
              config={hoursChartConfig}
              className="w-full"
              style={{ aspectRatio: `4 / ${Math.max(3, roomHoursData.length * 0.6)}` }}
            >
              <BarChart data={roomHoursData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v} h`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium">{formatNumber(Number(value), 1)} h</span>
                      )}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.fullName || label;
                      }}
                    />
                  }
                />
                <Bar dataKey="stunden" fill="var(--color-stunden)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="bg-card border border-border/20 rounded-2xl p-6 text-center">
            <BarChart3 size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Keine Räume vorhanden</p>
          </div>
        )}

        {groupMap.size > 0 && (
          <div>
            <h3 className="font-semibold text-lg tracking-tight mb-3">Nach Raumgruppe</h3>
            <div className="space-y-2">
              {Array.from(groupMap.entries()).sort((a, b) => b[1].cost - a[1].cost).map(([name, data]) => (
                <div key={name} className="bg-card border border-border/20 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">{name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold">{formatCurrency(data.cost)}</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatNumber(data.hours, 1)} h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-lg tracking-tight mb-3">Raumaufstellung</h3>
          <div className="space-y-2">
            {project.rooms.map((r) => {
              const rc = calcRoom(r, effectiveRate);
              return (
                <div key={r.id} className="bg-card border border-border/20 rounded-xl p-3 flex justify-between items-center">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-medium text-sm text-foreground truncate">{r.name || r.typeName}</p>
                    <p className="text-xs text-muted-foreground">{r.area} m² · {FREQUENCY_LABELS[r.frequency]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(rc.monthlyCost)}</p>
                    <p className="text-xs text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-border/30 bg-card">
          <div className="p-6">
            <h3 className="font-semibold mb-4 text-lg tracking-tight">Profi-Controlling</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Vollkosten (Lohn, SV, Ausfall, Gemeinkosten)</span>
                <span className="font-medium text-sm">{formatCurrency(vollkostenMonthly)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Vollkostensatz</span>
                <span className="font-medium text-sm">{formatCurrency(vollkosten)}/h</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-primary font-semibold text-sm">Gewinnbeitrag ({formatNumber(realeMargePct, 1)} % v. Umsatz)</span>
                <span className={cn("font-bold", gewinnbeitrag < 0 ? "text-destructive" : "text-primary")}>{formatCurrency(gewinnbeitrag)}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Basis: Ihr Verrechnungssatz-Kalkulator (Vollkosten ohne Gewinnmarge).
            </p>
          </div>
        </div>

        {/* ── Nachkalkulation: Plan vs. Ist ─────────────────────────── */}
        <div className="rounded-3xl overflow-hidden border border-border/30 bg-card">
          <div className="p-6">
            <h3 className="font-semibold mb-1 text-lg tracking-tight flex items-center gap-2">
              <ClipboardCheck size={18} className="text-muted-foreground" aria-hidden="true" />
              Nachkalkulation
            </h3>

            {!nachkalkulation && !nkEditing && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Erfassen Sie die tatsächlichen Monatsstunden, um Plan und Realität zu
                  vergleichen — die Grundlage für bessere zukünftige Kalkulationen.
                </p>
                <Button variant="outline" onClick={startNkEditing}>
                  Ist-Stunden erfassen
                </Button>
              </>
            )}

            {nkEditing && (
              <div className="space-y-4 mt-3">
                <FormField id="nk-hours" label="Ist-Stunden pro Monat" required hint={`Plan: ${formatNumber(totals.hours, 1)} h/Monat`}>
                  <Input
                    inputMode="decimal"
                    value={nkHours}
                    onChange={(e) => setNkHours(e.target.value)}
                    placeholder="z. B. 42,5"
                    className="bg-background h-12"
                  />
                </FormField>
                <FormField id="nk-note" label="Notiz (optional)">
                  <Input
                    value={nkNote}
                    onChange={(e) => setNkNote(e.target.value)}
                    placeholder="z. B. Mehraufwand durch Umbau im EG"
                    className="bg-background h-12"
                  />
                </FormField>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setNkEditing(false)}>Abbrechen</Button>
                  <Button className="flex-1" onClick={handleNkSave}>Speichern</Button>
                </div>
              </div>
            )}

            {nachkalkulation && nkResult && nkVerdictMeta && !nkEditing && (
              <div className="mt-3">
                <p className={cn("text-sm font-semibold mb-4", nkVerdictMeta.tone)}>{nkVerdictMeta.label}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Stunden Plan → Ist</p>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {formatNumber(totals.hours, 1)} → {formatNumber(nachkalkulation.actualMonthlyHours, 1)} h
                    </p>
                    <p className={cn("text-[11px] font-medium", nkResult.hoursDeviationPct > 5 ? "text-warning" : nkResult.hoursDeviationPct < -2 ? "text-success" : "text-muted-foreground")}>
                      {nkResult.hoursDeviationPct > 0 ? "+" : ""}{formatNumber(nkResult.hoursDeviationPct, 1)} % Abweichung
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Marge Plan → Ist</p>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {formatNumber(nkResult.plannedMarginPct, 1)} → <span className={nkResult.actualMarginPct < 0 ? "text-destructive" : nkResult.actualMarginPct < nkResult.plannedMarginPct ? "text-warning" : "text-success"}>{formatNumber(nkResult.actualMarginPct, 1)} %</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">bei festem Monatspreis</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ist-Kosten/Monat</p>
                    <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(nkResult.actualCostMonthly)}</p>
                    <p className="text-[11px] text-muted-foreground">zu Vollkosten</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Erfasst am</p>
                    <p className="text-lg font-bold tabular-nums text-foreground">{formatDate(nachkalkulation.recordedAt)}</p>
                    {nachkalkulation.note && <p className="text-[11px] text-muted-foreground truncate" title={nachkalkulation.note}>{nachkalkulation.note}</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={startNkEditing}>Aktualisieren</Button>
                  <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => setNkRemoveConfirm(true)}>Entfernen</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handlePDF}>
          <Download size={18} className="mr-2" /> Angebot als PDF exportieren
        </Button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} triggerReason="pdf_export" />
      <ConfirmDialog
        open={nkRemoveConfirm}
        onClose={() => setNkRemoveConfirm(false)}
        onConfirm={() => { removeNachkalkulation(project.id); setNkRemoveConfirm(false); toast.success("Nachkalkulation entfernt"); }}
        title="Nachkalkulation entfernen?"
        description="Die erfassten Ist-Stunden werden gelöscht."
        confirmLabel="Entfernen"
        destructive
      />
    </PageTransition>
  );
}
