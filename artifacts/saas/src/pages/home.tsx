import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { calcProjectTotals } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { getAllProjectWarnings, countWarningsBySeverity } from "@/lib/warnings";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Landmark,
  Building2,
  ChevronRight,
  BarChart3,
  FileStack,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { AppFooter } from "@/components/layout/AppFooter";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatTile } from "@/components/ui/stat-tile";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "gestern";
  if (diffD < 7) return `vor ${diffD} Tagen`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `vor ${diffW} Wo.`;
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `vor ${diffM} Mon.`;
  return `vor ${Math.floor(diffM / 12)} J.`;
}

function getStatusLabel(project: { rooms: { area: number; frequency: string }[]; status: string; customer?: string }, hasWarnings: boolean): { label: string; color: string } {
  if (project.status === "archived") return { label: "Archiviert", color: "bg-muted text-muted-foreground" };
  if (project.rooms.length === 0) return { label: "Entwurf", color: "bg-secondary text-muted-foreground" };
  const incomplete = project.rooms.some((r) => r.area <= 0);
  if (incomplete) return { label: "LV unvollständig", color: "bg-warning/10 text-warning" };
  if (hasWarnings) return { label: "Prüfung offen", color: "bg-warning/10 text-warning" };
  if (!project.customer) return { label: "In Kalkulation", color: "bg-primary/10 text-primary" };
  return { label: "Angebot erstellt", color: "bg-success/10 text-success" };
}

export default function Home() {
  const [, setLocation] = useLocation();
  const companyName = useStore((s) => s.companyName);
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const targetMargin = useStore((s) => s.targetMargin);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const plan = useStore((s) => s.plan);
  const hydrated = useHydrated();

  const activeProjects = projects.filter((p) => p.status !== "archived");

  const { totalVolume, totalHours } = useMemo(() => {
    let vol = 0;
    let hrs = 0;
    activeProjects.forEach((p) => {
      const totals = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
      vol += totals.cost;
      hrs += totals.hours;
    });
    return { totalVolume: vol, totalHours: hrs };
  }, [activeProjects, hourlyRate]);

  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());
  const breakdown = useMemo(() => calcHourlyRate(hourlyRateConfig), [hourlyRateConfig]);
  const marginPercent = hourlyRateConfig.gewinnmarge;

  const allWarnings = useMemo(() => {
    return getAllProjectWarnings(projects, hourlyRate, hourlyRateConfig, isDefaultRate, disabledWarnings, targetMargin);
  }, [projects, hourlyRate, hourlyRateConfig, isDefaultRate, disabledWarnings, targetMargin]);

  const warningCounts = useMemo(() => countWarningsBySeverity(allWarnings), [allWarnings]);

  const recentProjects = useMemo(() => {
    return [...activeProjects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [activeProjects]);

  const actionableWarnings = useMemo(() => {
    const critical: { text: string; projectId: string; severity: "critical" }[] = [];
    const warnings: { text: string; projectId: string; severity: "warning" }[] = [];
    for (const pw of allWarnings) {
      for (const w of pw.warnings) {
        if (w.severity === "critical") {
          critical.push({ text: `${pw.projectName}: ${w.title}`, projectId: pw.projectId, severity: "critical" });
        } else if (w.severity === "warning") {
          warnings.push({ text: `${pw.projectName}: ${w.title}`, projectId: pw.projectId, severity: "warning" });
        }
      }
    }
    return { critical, warnings, total: critical.length + warnings.length };
  }, [allWarnings]);

  return (
    <PageTransition className="min-h-screen pb-24 md:pb-8 bg-background">
      {/* 1. Header */}
      <PageHeader title="Start" subtitle={`Firma: ${companyName}`} className="max-w-6xl mx-auto" />

      <div className="px-6 space-y-6 max-w-6xl mx-auto">
        {!hydrated ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* 2. Weiterarbeiten */}
            {recentProjects.length > 0 && (
              <section>
                <SectionHeading action={<Link href="/objekte" className="text-xs text-primary font-medium">Alle anzeigen</Link>}>
                  Weiterarbeiten
                </SectionHeading>
                <div className="space-y-2">
                  {recentProjects.map((p) => {
                    const t = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
                    const effectiveRate = p.hourlyRate ?? hourlyRate;
                    const projectMargin = effectiveRate > 0 && breakdown.vollkosten > 0
                      ? ((effectiveRate - breakdown.vollkosten) / effectiveRate) * 100
                      : marginPercent;
                    const hasProjectWarnings = allWarnings.some((pw) => pw.projectId === p.id && pw.warnings.some((w) => w.severity === "critical" || w.severity === "warning"));
                    const status = getStatusLabel(p, hasProjectWarnings);
                    return (
                      <Link key={p.id} href={`/objekte/${p.id}`}>
                        <div className="bg-card border border-border/30 rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors cursor-pointer active:scale-[0.98]">
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock size={12} aria-hidden="true" />
                              <span>{relativeTime(p.updatedAt)}</span>
                              {p.customer && <><span>·</span><span>{p.customer}</span></>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="font-semibold text-sm text-foreground block">{formatCurrency(t.cost)}</span>
                              <span className={`text-[10px] font-medium ${projectMargin <= 0 ? "text-destructive" : projectMargin < marginPercent ? "text-warning" : "text-muted-foreground"}`}>
                                {formatNumber(projectMargin, 1)}% Marge
                              </span>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {activeProjects.length === 0 && (
              <div className="bg-card border border-border/30 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Building2 size={28} className="text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Noch keine Objekte</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-[260px] mx-auto">
                  Erstellen Sie Ihr erstes Objekt, um mit der Kalkulation zu beginnen.
                </p>
              </div>
            )}

            {/* 3. Hauptaktion */}
            <section className="flex flex-col md:flex-row gap-3">
              <Button
                size="lg"
                className="w-full md:w-auto h-14 text-base font-semibold"
                onClick={() => setLocation("/objekte")}
              >
                <Plus size={20} className="mr-2" aria-hidden="true" /> Neues Objekt kalkulieren
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full md:w-auto h-14 text-base"
                onClick={() => setLocation("/ausschreibung")}
              >
                <Landmark size={20} className="mr-2" aria-hidden="true" /> Ausschreibung kalkulieren
              </Button>
            </section>

            {/* 4. Offene Aufgaben & Plausibilitätsprüfungen */}
            {actionableWarnings.total > 0 ? (
              <section>
                <SectionHeading>Offene Aufgaben</SectionHeading>
                <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
                  {actionableWarnings.critical.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-destructive/5 text-[11px] font-semibold uppercase tracking-widest text-destructive">
                        Kritisch ({actionableWarnings.critical.length})
                      </div>
                      {actionableWarnings.critical.slice(0, 3).map((cw, i) => (
                        <button
                          key={`c-${i}`}
                          onClick={() => setLocation(`/objekte/${cw.projectId}`)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${i < Math.min(actionableWarnings.critical.length, 3) - 1 || actionableWarnings.warnings.length > 0 ? "border-b border-border/20" : ""}`}
                        >
                          <AlertTriangle size={16} className="text-destructive shrink-0" aria-hidden="true" />
                          <span className="text-sm text-foreground flex-1 min-w-0 truncate">{cw.text}</span>
                          <ChevronRight size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        </button>
                      ))}
                    </>
                  )}
                  {actionableWarnings.warnings.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-warning/5 text-[11px] font-semibold uppercase tracking-widest text-warning">
                        Hinweise ({actionableWarnings.warnings.length})
                      </div>
                      {actionableWarnings.warnings.slice(0, 3).map((cw, i) => (
                        <button
                          key={`w-${i}`}
                          onClick={() => setLocation(`/objekte/${cw.projectId}`)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors ${i < Math.min(actionableWarnings.warnings.length, 3) - 1 ? "border-b border-border/20" : ""}`}
                        >
                          <AlertTriangle size={16} className="text-warning shrink-0" aria-hidden="true" />
                          <span className="text-sm text-foreground flex-1 min-w-0 truncate">{cw.text}</span>
                          <ChevronRight size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </section>
            ) : activeProjects.length > 0 ? (
              <section>
                <div className="flex items-center gap-3 bg-card border border-border/30 rounded-2xl px-4 py-3">
                  <CheckCircle2 size={18} className="text-success shrink-0" aria-hidden="true" />
                  <span className="text-sm text-foreground">Keine offenen Aufgaben</span>
                </div>
              </section>
            ) : null}

            {/* 5. Schnellzugriffe */}
            <section>
              <SectionHeading>Schnellzugriffe</SectionHeading>
              <div className="grid grid-cols-4 gap-3 md:flex md:gap-3">
                {[
                  { href: "/objekte", icon: Building2, label: "Alle Objekte" },
                  { href: "/vorlagen", icon: FileStack, label: "Vorlagen" },
                  { href: "/auswertung", icon: BarChart3, label: "Berichte" },
                ].map((a) => (
                  <Link key={a.label} href={a.href}>
                    <div className="rounded-2xl border border-border/30 bg-card hover:bg-secondary/50 flex flex-col items-center justify-center gap-2 p-4 transition-colors cursor-pointer h-full">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <a.icon size={18} className="text-muted-foreground" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] font-medium text-foreground text-center leading-tight">{a.label}</span>
                    </div>
                  </Link>
                ))}
                <button
                  onClick={() => {
                    const exportData = useStore.getState().exportData;
                    const json = exportData();
                    const blob = new Blob([json], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `cleancalc-export-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-2xl border border-border/30 bg-card hover:bg-secondary/50 flex flex-col items-center justify-center gap-2 p-4 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <Download size={18} className="text-muted-foreground" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground text-center leading-tight">Export</span>
                </button>
              </div>
            </section>

            {/* 6. Kompakte Steuerungskennzahlen */}
            {activeProjects.length > 0 && (
              <section>
                <SectionHeading>Steuerungskennzahlen</SectionHeading>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatTile label="Monatsumsatz" value={formatCurrency(totalVolume)} />
                  <StatTile label="Ø Marge" value={`${formatNumber(marginPercent, 1)} %`} />
                  <StatTile label="Verrechnungssatz" value={`${formatCurrency(hourlyRate)}/h`} />
                  <StatTile label="Offene Angebote" value={activeProjects.length} />
                </div>
              </section>
            )}

            {/* 7. Weitere Listen — kritische Objekte */}
            {warningCounts.critical > 0 && (
              <section>
                <SectionHeading>Kritische Objekte</SectionHeading>
                <div className="space-y-2">
                  {allWarnings
                    .filter((pw) => pw.warnings.some((w) => w.severity === "critical"))
                    .slice(0, 3)
                    .map((pw) => (
                      <Link key={pw.projectId} href={`/objekte/${pw.projectId}`}>
                        <div className="bg-card border border-destructive/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                            <AlertTriangle size={16} className="text-destructive" aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{pw.projectName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {pw.warnings.filter((w) => w.severity === "critical").map((w) => w.title).join(", ")}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        </div>
                      </Link>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="max-w-6xl mx-auto">
        <AppFooter />
      </div>
    </PageTransition>
  );
}
