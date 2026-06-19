import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { calcProjectTotals, calcRoom } from "@/lib/calc";
import { getDefaultConfig } from "@/lib/hourly-rate-calc";
import { getAllProjectWarnings } from "@/lib/warnings";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { BarChart3, Building2, ChevronRight, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
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

export default function AuswertungGlobal() {
  const [, setLocation] = useLocation();
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const targetMargin = useStore((s) => s.targetMargin);
  const hydrated = useHydrated();

  const activeProjects = projects.filter((p) => p.status !== "archived");

  let totalArea = 0;
  let totalHours = 0;
  let totalCost = 0;
  let totalRooms = 0;

  const projectTotals = activeProjects.map((p) => {
    const t = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
    totalArea += t.area;
    totalHours += t.hours;
    totalCost += t.cost;
    totalRooms += t.count;
    return { project: p, totals: t };
  });

  const top5 = [...projectTotals].sort((a, b) => b.totals.cost - a.totals.cost).slice(0, 5);
  const avgPricePerSqm = totalArea > 0 ? totalCost / totalArea : 0;

  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());

  const allWarnings = useMemo(() => {
    return getAllProjectWarnings(projects, hourlyRate, hourlyRateConfig, isDefaultRate, disabledWarnings, targetMargin);
  }, [projects, hourlyRate, hourlyRateConfig, isDefaultRate, disabledWarnings, targetMargin]);

  const criticalWarnings = allWarnings.filter((pw) =>
    pw.warnings.some((w) => w.severity === "critical" || w.severity === "warning")
  );

  const recentlyEdited = [...activeProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const revenueByProject = useMemo(() => {
    return [...projectTotals]
      .sort((a, b) => b.totals.cost - a.totals.cost)
      .map(({ project: p, totals: t }) => ({
        name: p.name.length > 15 ? p.name.slice(0, 14) + "…" : p.name,
        fullName: p.name,
        umsatz: Math.round(t.cost * 100) / 100,
      }));
  }, [projectTotals]);

  const revenueByGroup = useMemo(() => {
    const groupMap = new Map<string, number>();
    activeProjects.forEach((p) => {
      const rate = p.hourlyRate ?? hourlyRate;
      p.rooms.forEach((r) => {
        const rc = calcRoom(r, rate);
        const existing = groupMap.get(r.groupName) || 0;
        groupMap.set(r.groupName, existing + rc.monthlyCost);
      });
    });
    return Array.from(groupMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [activeProjects, hourlyRate]);

  const hoursByProject = useMemo(() => {
    return [...projectTotals]
      .sort((a, b) => b.totals.hours - a.totals.hours)
      .map(({ project: p, totals: t }) => ({
        name: p.name.length > 15 ? p.name.slice(0, 14) + "…" : p.name,
        fullName: p.name,
        stunden: Math.round(t.hours * 10) / 10,
      }));
  }, [projectTotals]);

  const revenueChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {
      umsatz: { label: "Umsatz", color: "hsl(var(--primary))" },
    };
    return config;
  }, []);

  const hoursChartConfig = useMemo(() => {
    return {
      stunden: { label: "Stunden", color: "hsl(var(--primary))" },
    };
  }, []);

  const pieChartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    revenueByGroup.forEach((item, i) => {
      config[item.name] = { label: item.name, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
    return config;
  }, [revenueByGroup]);

  return (
    <PageTransition className="min-h-screen pb-24 md:pb-8 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20 md:pt-6">
        <h1 className="text-4xl font-semibold tracking-tight mt-2 max-w-6xl mx-auto">Controlling</h1>
      </div>

      {!hydrated ? (
        <div className="p-6 space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <ListSkeleton rows={3} />
        </div>
      ) : activeProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 size={28} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Noch keine Daten</h3>
          <p className="text-sm text-muted-foreground max-w-[260px]">Erstellen Sie Objekte mit Räumen, um hier das Controlling zu sehen.</p>
        </div>
      ) : (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          <div className="glass-card p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Monatsumsatz geplant</p>
            <h2 className="text-5xl font-bold tabular-nums text-foreground mb-1">{formatCurrency(totalCost)}</h2>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalCost * 12)} / Jahr</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Objekte", value: activeProjects.length.toString() },
              { label: "Räume gesamt", value: totalRooms.toString() },
              { label: "Gesamtfläche", value: `${formatNumber(totalArea, 0)} m²` },
              { label: "Stunden/Monat", value: `${formatNumber(totalHours, 1)} h` },
              { label: "Ø Preis/m²", value: formatCurrency(avgPricePerSqm) },
              { label: "Jahresvolumen", value: formatCurrency(totalCost * 12) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card border border-border/20 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          {criticalWarnings.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-destructive" /> Kritische Objekte ({criticalWarnings.length})
              </h3>
              <div className="space-y-2">
                {criticalWarnings.map((pw) => {
                  const topWarning = pw.warnings.find((w) => w.severity === "critical") || pw.warnings[0];
                  return (
                    <Link key={pw.projectId} href={`/objekte/${pw.projectId}`}>
                      <div className={`border rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors cursor-pointer ${
                        topWarning.severity === "critical"
                          ? "border-destructive/20 bg-destructive/5"
                          : "border-warning/20 bg-warning/5"
                      }`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <AlertTriangle size={16} className={topWarning.severity === "critical" ? "text-destructive shrink-0" : "text-warning shrink-0"} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{pw.projectName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{topWarning.title}: {topWarning.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            topWarning.severity === "critical"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}>
                            {pw.warnings.length}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {revenueByProject.length > 0 ? (
            <div className="bg-card border border-border/20 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <BarChart3 size={14} /> Monatsumsatz pro Objekt
              </h3>
              <ChartContainer config={revenueChartConfig} className="aspect-[4/3] w-full">
                <BarChart data={revenueByProject} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v} €`}
                    width={65}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => (
                          <span className="font-medium">{formatCurrency(Number(value))}</span>
                        )}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          return item?.fullName || label;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="umsatz" fill="var(--color-umsatz)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="bg-card border border-border/20 rounded-2xl p-6 text-center">
              <BarChart3 size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Keine Umsatzdaten vorhanden</p>
            </div>
          )}

          {revenueByGroup.length > 0 ? (
            <div className="bg-card border border-border/20 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <PieChartIcon size={14} /> Umsatz nach Raumgruppe
              </h3>
              <ChartContainer config={pieChartConfig} className="aspect-square w-full max-w-[300px] mx-auto">
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
                    data={revenueByGroup}
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
                    {revenueByGroup.map((entry, index) => (
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

          {hoursByProject.length > 0 ? (
            <div className="bg-card border border-border/20 rounded-2xl p-4">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Clock size={14} /> Stunden pro Objekt (monatlich)
              </h3>
              <ChartContainer
                config={hoursChartConfig}
                className="w-full"
                style={{ aspectRatio: `4 / ${Math.max(3, hoursByProject.length * 0.8)}` }}
              >
                <BarChart data={hoursByProject} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                    width={100}
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
              <Clock size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Keine Stundendaten vorhanden</p>
            </div>
          )}

          {top5.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp size={14} /> Top {top5.length} nach Umsatz
              </h3>
              <div className="space-y-2">
                {top5.map(({ project: p, totals: t }, idx) => (
                  <Link key={p.id} href={`/auswertung/${p.id}`}>
                    <div className="bg-card border border-border/20 rounded-2xl p-4 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{t.count} Räume · {formatNumber(t.area, 0)} m²</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{formatCurrency(t.cost)}</span>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recentlyEdited.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Zuletzt bearbeitet</h3>
              <div className="space-y-2">
                {recentlyEdited.map((p) => (
                  <Link key={p.id} href={`/auswertung/${p.id}`}>
                    <div className="bg-card border border-border/20 rounded-xl p-3 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 size={16} className="text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatDate(p.updatedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeProjects.length > 0 && (
        <div className="fixed bottom-20 right-6 z-40 md:bottom-6 md:right-10" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <Button onClick={() => setLocation("/objekte")} className="h-14 px-6 rounded-full shadow-lg shadow-black/30 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
            <FileText size={20} />
            <span className="font-semibold">Objekte verwalten</span>
          </Button>
        </div>
      )}
    </PageTransition>
  );
}
