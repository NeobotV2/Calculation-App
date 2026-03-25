import { useMemo } from "react";
import { Link } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { calcProjectTotals } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { getAllProjectWarnings, countWarningsBySeverity } from "@/lib/warnings";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { BarChart3, Building2, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";
import { ListSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";

export default function AuswertungGlobal() {
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

  const warningCounts = useMemo(() => countWarningsBySeverity(allWarnings), [allWarnings]);

  const criticalWarnings = allWarnings.filter((pw) =>
    pw.warnings.some((w) => w.severity === "critical" || w.severity === "warning")
  );

  const recentlyEdited = [...activeProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <PageTransition className="min-h-screen pb-24 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mt-2">Controlling</h1>
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
          <p className="text-sm text-muted-foreground max-w-[260px]">Erstelle Objekte mit Räumen, um hier das Controlling zu sehen.</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="glass-card p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Monatsumsatz geplant</p>
            <h2 className="text-5xl font-bold tabular-nums text-foreground mb-1">{formatCurrency(totalCost)}</h2>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalCost * 12)} / Jahr</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                <AlertTriangle size={14} className="text-red-400" /> Kritische Objekte ({criticalWarnings.length})
              </h3>
              <div className="space-y-2">
                {criticalWarnings.map((pw) => {
                  const topWarning = pw.warnings.find((w) => w.severity === "critical") || pw.warnings[0];
                  return (
                    <Link key={pw.projectId} href={`/objekte/${pw.projectId}`}>
                      <div className={`border rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors cursor-pointer ${
                        topWarning.severity === "critical"
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-yellow-500/20 bg-yellow-500/5"
                      }`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <AlertTriangle size={16} className={topWarning.severity === "critical" ? "text-red-400 shrink-0" : "text-yellow-400 shrink-0"} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{pw.projectName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{topWarning.title}: {topWarning.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            topWarning.severity === "critical"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
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

      <BottomNav />
    </PageTransition>
  );
}
