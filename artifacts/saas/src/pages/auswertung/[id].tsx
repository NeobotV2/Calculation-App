import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, X, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useState, useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 66%))",
  "hsl(var(--chart-5, 27 87% 67%))",
  "hsl(142 76% 36%)",
  "hsl(262 83% 58%)",
  "hsl(330 81% 60%)",
  "hsl(200 98% 39%)",
  "hsl(16 85% 55%)",
];

export default function AuswertungDetail() {
  const [, params] = useRoute("/auswertung/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

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
                <span className="text-sm text-muted-foreground">Materialkosten (3%)</span>
                <span className="font-medium text-sm">{formatCurrency(totals.cost * 0.03)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Lohnkosten</span>
                <span className="font-medium text-sm">{formatCurrency(totals.cost * 0.7)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-primary font-semibold text-sm">Deckungsbeitrag</span>
                <span className="font-bold text-primary">{formatCurrency(totals.cost * 0.27)}</span>
              </div>
            </div>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handlePDF}>
          <Download size={18} className="mr-2" /> Angebot als PDF exportieren
        </Button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </PageTransition>
  );
}
