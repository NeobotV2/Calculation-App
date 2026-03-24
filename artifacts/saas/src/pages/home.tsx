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
      <div className="pt-12 pb-6 px-6 bg-gradient-to-b from-primary/10 to-transparent">
        <h1 className="text-3xl font-display font-bold">Guten Morgen,</h1>
        <p className="text-muted-foreground text-lg mt-1">{companyName}</p>
      </div>

      <div className="px-6 space-y-6">
        {/* Hero KPI */}
        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-[50px] rounded-full group-hover:bg-primary/30 transition-colors" />
          <p className="text-sm font-medium text-primary mb-2">Monatsvolumen Gesamt</p>
          <h2 className="text-4xl font-display font-bold tracking-tight mb-6 text-white">{formatCurrency(totalVolume)}</h2>
          
          {latestProject ? (
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Zuletzt bearbeitet</p>
                <p className="font-medium text-sm truncate max-w-[200px]">{latestProject.name}</p>
              </div>
              <Link href={`/kalkulation/${latestProject.id}`}>
                <Button variant="outline" size="sm" className="rounded-full h-8 text-xs">Öffnen</Button>
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
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <Building2 className="text-muted-foreground mb-3" size={20} />
            <p className="text-2xl font-bold font-display">{activeProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">Aktive Objekte</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <Calculator className="text-muted-foreground mb-3" size={20} />
            <p className="text-2xl font-bold font-display">{formatCurrency(avgPrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ø Preis/m²</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Aktionen</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
            <Link href="/kalkulation">
              <div className="w-28 h-28 shrink-0 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center"><Plus size={20} /></div>
                <span className="text-xs font-medium">Neues Objekt</span>
              </div>
            </Link>
            <Link href="/einstellungen">
              <div className="w-28 h-28 shrink-0 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"><Settings size={20} /></div>
                <span className="text-xs font-medium">Raumarten</span>
              </div>
            </Link>
            <Link href="/objekte">
              <div className="w-28 h-28 shrink-0 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center"><Building2 size={20} /></div>
                <span className="text-xs font-medium">Alle Objekte</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Upgrade Banner */}
        {plan === "basic" && (
          <Link href="/upgrade">
            <div className="rounded-2xl p-5 border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-between cursor-pointer group">
              <div className="flex gap-4 items-center">
                <div className="bg-primary text-background p-2.5 rounded-full"><Crown size={24} /></div>
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">Pro Version entdecken <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary uppercase">Neu</span></h4>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF-Export & Cloud Sync</p>
                </div>
              </div>
              <ChevronRight className="text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}
      </div>

      <BottomNav />
    </PageTransition>
  );
}
