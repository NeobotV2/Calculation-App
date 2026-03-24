import { Link } from "wouter";
import { useStore } from "@/store/use-store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { calcProjectTotals } from "@/lib/calc";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, Settings, Building2, ChevronRight, Crown } from "lucide-react";

export default function Home() {
  const companyName = useStore(s => s.companyName);
  const projects = useStore(s => s.projects);
  const hourlyRate = useStore(s => s.hourlyRate);
  const plan = useStore(s => s.plan);

  const activeProjects = projects.length;
  let totalVolume = 0;
  let totalArea = 0;
  let totalRooms = 0;

  projects.forEach(p => {
    const totals = calcProjectTotals(p, hourlyRate);
    totalVolume += totals.cost;
    totalArea += totals.area;
    totalRooms += totals.count;
  });

  const latestProject = projects[0];
  const latestTotals = calcProjectTotals(latestProject, hourlyRate);
  const avgPrice = totalArea > 0 ? totalVolume / totalArea : 0;

  return (
    <PageTransition className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="pt-14 pb-8 px-6">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Guten Morgen,</h1>
        <p className="text-muted-foreground text-lg mt-1">{companyName}</p>
      </div>

      <div className="px-6 space-y-6">
        {/* Hero KPI */}
        <div className="glass-card p-6 relative overflow-hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Monatsvolumen</p>
          <h2 className="text-5xl font-bold tabular-nums text-foreground mb-6">{formatCurrency(totalVolume)}</h2>
          
          {latestProject ? (
            <div className="pt-4 border-t border-border/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Zuletzt bearbeitet</p>
                <p className="font-medium text-sm truncate max-w-[200px] text-foreground">{latestProject.name}</p>
              </div>
              <Link href={`/kalkulation/${latestProject.id}`}>
                <Button variant="outline" size="sm" className="rounded-full h-9 px-4 text-xs font-medium">Öffnen</Button>
              </Link>
            </div>
          ) : (
            <Link href="/kalkulation">
              <Button size="sm" className="w-full">Erste Kalkulation starten</Button>
            </Link>
          )}
        </div>

        {/* Small KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <Building2 className="text-muted-foreground mb-4" size={24} />
            <p className="text-3xl font-bold tabular-nums text-foreground">{activeProjects}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Aktive Objekte</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <Calculator className="text-muted-foreground mb-4" size={24} />
            <p className="text-3xl font-bold tabular-nums text-foreground">{formatCurrency(avgPrice)}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-2">Ø Preis/m²</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Aktionen</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
            <Link href="/kalkulation">
              <div className="w-28 h-28 shrink-0 rounded-2xl border border-border/30 bg-card hover:bg-secondary flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Plus size={20} /></div>
                <span className="text-xs font-medium text-foreground">Neues Objekt</span>
              </div>
            </Link>
            <Link href="/einstellungen">
              <div className="w-28 h-28 shrink-0 rounded-2xl border border-border/30 bg-card hover:bg-secondary flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center"><Settings size={20} /></div>
                <span className="text-xs font-medium text-foreground">Raumarten</span>
              </div>
            </Link>
            <Link href="/objekte">
              <div className="w-28 h-28 shrink-0 rounded-2xl border border-border/30 bg-card hover:bg-secondary flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center"><Building2 size={20} /></div>
                <span className="text-xs font-medium text-foreground">Alle Objekte</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Upgrade Banner */}
        {plan === "basic" && (
          <Link href="/upgrade">
            <div className="rounded-2xl p-5 border-l-2 border-l-primary border-y border-y-border/30 border-r border-r-border/30 bg-card flex items-center justify-between cursor-pointer group">
              <div className="flex gap-4 items-center">
                <div className="bg-primary/10 text-primary p-2.5 rounded-full"><Crown size={24} /></div>
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">Pro Version <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary uppercase font-bold">Neu</span></h4>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF-Export & Cloud Sync</p>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}
      </div>

      <BottomNav />
    </PageTransition>
  );
}