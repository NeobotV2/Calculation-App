import { Link } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { calcProjectTotals } from "@/lib/calc";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { BarChart3, Building2, ChevronRight, TrendingUp } from "lucide-react";

export default function AuswertungGlobal() {
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);

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

  const recentlyEdited = [...activeProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <PageTransition className="min-h-screen pb-24 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mt-2">Auswertung</h1>
      </div>

      {activeProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 size={28} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Noch keine Daten</h3>
          <p className="text-sm text-muted-foreground max-w-[260px]">Erstelle Objekte mit Räumen, um hier eine Auswertung zu sehen.</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="glass-card p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Monatsvolumen gesamt</p>
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
