import { useMemo } from "react";
import { Link } from "wouter";
import { useStore } from "@/store/use-store";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { calcProjectTotals } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { getAllProjectWarnings, countWarningsBySeverity } from "@/lib/warnings";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Building2, ChevronRight, Crown, BarChart3, BookOpen, FileText, Calculator, TrendingUp, Euro, AlertTriangle } from "lucide-react";
import { ListSkeleton, CardSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { AppFooter } from "@/components/layout/AppFooter";

export default function Home() {
  const companyName = useStore((s) => s.companyName);
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const targetMargin = useStore((s) => s.targetMargin);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const plan = useStore((s) => s.plan);
  const hydrated = useHydrated();

  const activeProjects = projects.filter((p) => p.status !== "archived");
  let totalVolume = 0;
  let totalArea = 0;
  let totalRooms = 0;
  let totalHours = 0;

  activeProjects.forEach((p) => {
    const totals = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
    totalVolume += totals.cost;
    totalArea += totals.area;
    totalRooms += totals.count;
    totalHours += totals.hours;
  });

  const avgPrice = totalArea > 0 ? totalVolume / totalArea : 0;
  const marginPercent = hourlyRateConfig.gewinnmarge;

  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());

  const allWarnings = useMemo(() => {
    return getAllProjectWarnings(projects, hourlyRate, hourlyRateConfig, isDefaultRate, disabledWarnings, targetMargin);
  }, [projects, hourlyRate, hourlyRateConfig, isDefaultRate, disabledWarnings, targetMargin]);

  const warningCounts = useMemo(() => countWarningsBySeverity(allWarnings), [allWarnings]);
  const criticalProjects = allWarnings.filter((pw) => pw.warnings.some((w) => w.severity === "critical" || w.severity === "warning"));

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const breakdown = useMemo(() => calcHourlyRate(hourlyRateConfig), [hourlyRateConfig]);

  return (
    <PageTransition className="min-h-screen pb-24 bg-background">
      <div className="safe-header px-6 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-lg mt-1">{companyName}</p>
          </div>
          {plan === "basic" && (
            <Link href="/upgrade">
              <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-card border border-border/40 text-muted-foreground">Basic</span>
            </Link>
          )}
          {plan === "pro" && (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-primary/10 border border-primary/30 text-primary flex items-center gap-1">
              <Crown size={12} /> Pro
            </span>
          )}
        </div>
      </div>

      <div className="px-6 space-y-6">
        <Link href="/objekte">
          <Button size="lg" className="w-full h-14 text-base font-semibold">
            <Plus size={20} className="mr-2" /> Neues Objekt kalkulieren
          </Button>
        </Link>

        {!hydrated ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <CardSkeleton />
            <ListSkeleton rows={3} />
          </div>
        ) : activeProjects.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Noch keine Objekte</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[260px] mx-auto">Erstelle dein erstes Objekt, um mit der Kalkulation zu beginnen.</p>
          </div>
        ) : (
          <>
            <div className="glass-card p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Monatsumsatz geplant</p>
              <h2 className="text-5xl font-bold tabular-nums text-foreground mb-1">{formatCurrency(totalVolume)}</h2>
              <p className="text-sm text-muted-foreground">{formatCurrency(totalVolume * 12)} / Jahr</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{activeProjects.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Objekte</p>
              </div>
              <div className="bg-card border border-border/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{formatNumber(totalHours, 1)}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Std/Monat</p>
              </div>
              <div className="bg-card border border-border/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{formatNumber(avgPrice, 2)}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">€/m²</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Euro size={14} className="text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Verrechnungssatz</p>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(hourlyRate)}/h</p>
              </div>
              <div className="bg-card border border-border/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ø Marge</p>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground">{formatNumber(marginPercent, 1)} %</p>
              </div>
            </div>

            {warningCounts.total > 0 && (
              <Link href="/objekte">
                <div className={`rounded-2xl p-4 border flex items-center gap-4 cursor-pointer hover:bg-secondary/50 transition-colors ${
                  warningCounts.critical > 0
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-yellow-500/30 bg-yellow-500/5"
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    warningCounts.critical > 0
                      ? "bg-red-500/10 text-red-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">
                      {warningCounts.critical > 0
                        ? `${criticalProjects.length} kritische${criticalProjects.length === 1 ? "s" : ""} Objekt${criticalProjects.length === 1 ? "" : "e"}`
                        : `${warningCounts.warning} Hinweis${warningCounts.warning === 1 ? "" : "e"}`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {warningCounts.critical > 0 && `${warningCounts.critical} kritisch`}
                      {warningCounts.critical > 0 && warningCounts.warning > 0 && " · "}
                      {warningCounts.warning > 0 && `${warningCounts.warning} Warnungen`}
                      {(warningCounts.critical > 0 || warningCounts.warning > 0) && warningCounts.info > 0 && " · "}
                      {warningCounts.info > 0 && `${warningCounts.info} Info`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                </div>
              </Link>
            )}
          </>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Schnellaktionen</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
            {[
              { href: "/objekte", icon: Plus, label: "Neues Objekt", accent: true },
              { href: "/objekte", icon: Building2, label: "Alle Objekte" },
              { href: "/stundensatz", icon: Calculator, label: "Verrechnungssatz" },
              { href: "/auswertung", icon: BarChart3, label: "Controlling" },
              { href: "/vorlagen", icon: BookOpen, label: "Vorlagen", pro: plan === "basic" },
              { href: plan === "basic" ? "/upgrade" : "/auswertung", icon: FileText, label: "Angebot erstellen", pro: plan === "basic" },
              { href: "/einstellungen", icon: Settings, label: "Einstellungen" },
            ].map((a) => (
              <Link key={a.label} href={a.href}>
                <div className="w-24 h-24 shrink-0 rounded-2xl border border-border/30 bg-card hover:bg-secondary flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${a.accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <a.icon size={18} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">{a.label}</span>
                  {a.pro && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-bold bg-primary/10 text-primary px-1 rounded">PRO</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Zuletzt bearbeitet</h3>
              <Link href="/objekte" className="text-xs text-primary font-medium">Alle anzeigen</Link>
            </div>
            <div className="space-y-2">
              {recentProjects.map((p) => {
                const t = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
                const effectiveRate = p.hourlyRate ?? hourlyRate;
                const projectMargin = effectiveRate > 0 && breakdown.vollkosten > 0
                  ? ((effectiveRate - breakdown.vollkosten) / effectiveRate) * 100
                  : marginPercent;
                const hasWarning = allWarnings.some((pw) => pw.projectId === p.id && pw.warnings.some((w) => w.severity === "critical" || w.severity === "warning"));
                return (
                  <Link key={p.id} href={`/objekte/${p.id}`}>
                    <div className="bg-card border border-border/20 rounded-2xl p-4 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer active:scale-[0.98]">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                          {hasWarning && <AlertTriangle size={14} className="text-yellow-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.customer || "—"} · {formatDate(p.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-semibold text-sm text-foreground block">{formatCurrency(t.cost)}</span>
                          <span className={`text-[10px] ${projectMargin <= 0 ? "text-red-400" : projectMargin < marginPercent ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {formatNumber(projectMargin, 0)}% Marge
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {plan === "basic" && (
          <Link href="/upgrade">
            <div className="rounded-2xl p-5 border border-primary/20 bg-primary/5 flex items-center justify-between cursor-pointer group mt-2">
              <div className="flex gap-4 items-center">
                <div className="bg-primary/10 text-primary p-2.5 rounded-full"><Crown size={22} /></div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Auf Pro upgraden</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF-Export, Vorlagen & mehr</p>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" size={18} />
            </div>
          </Link>
        )}
      </div>

      <AppFooter />

      <BottomNav />
    </PageTransition>
  );
}
