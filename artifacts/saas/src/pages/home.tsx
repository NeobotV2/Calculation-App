import { Link } from "wouter";
import { useStore } from "@/store/use-store";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { calcProjectTotals } from "@/lib/calc";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Building2, ChevronRight, Crown, BarChart3, BookOpen, FileText, Sparkles, Calculator } from "lucide-react";
import { ListSkeleton, CardSkeleton } from "@/components/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { AppFooter } from "@/components/layout/AppFooter";

export default function Home() {
  const companyName = useStore((s) => s.companyName);
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const plan = useStore((s) => s.plan);
  const hydrated = useHydrated();

  const activeProjects = projects.filter((p) => p.status !== "archived");
  let totalVolume = 0;
  let totalArea = 0;
  let totalRooms = 0;

  activeProjects.forEach((p) => {
    const totals = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
    totalVolume += totals.cost;
    totalArea += totals.area;
    totalRooms += totals.count;
  });

  const avgPrice = totalArea > 0 ? totalVolume / totalArea : 0;
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  return (
    <PageTransition className="min-h-screen pb-24 bg-background">
      <div className="safe-header px-6 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">{greeting()},</h1>
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
            <Link href="/objekte">
              <Button size="lg" className="w-full">
                <Plus size={18} className="mr-2" /> Erstes Objekt erstellen
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="glass-card p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Monatsvolumen</p>
              <h2 className="text-5xl font-bold tabular-nums text-foreground mb-1">{formatCurrency(totalVolume)}</h2>
              <p className="text-sm text-muted-foreground">{formatCurrency(totalVolume * 12)} / Jahr</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{activeProjects.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Objekte</p>
              </div>
              <div className="bg-card border border-border/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{totalRooms}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Räume</p>
              </div>
              <div className="bg-card border border-border/30 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{formatNumber(avgPrice, 2)}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">€/m²</p>
              </div>
            </div>
          </>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Schnellaktionen</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
            {[
              { href: "/objekte", icon: Plus, label: "Neues Objekt", accent: true },
              { href: "/objekte", icon: Building2, label: "Alle Objekte" },
              { href: "/stundensatz", icon: Calculator, label: "Stundensatz" },
              { href: "/auswertung", icon: BarChart3, label: "Auswertung" },
              { href: "/vorlagen", icon: BookOpen, label: "Vorlagen", pro: plan === "basic" },
              { href: plan === "basic" ? "/upgrade" : "/auswertung", icon: FileText, label: "PDF-Export", pro: plan === "basic" },
              { href: "/einstellungen", icon: Settings, label: "Einstellungen" },
              ...(plan === "basic" ? [{ href: "/upgrade", icon: Sparkles, label: "Upgrade", accent: false as boolean }] : []),
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
                return (
                  <Link key={p.id} href={`/objekte/${p.id}`}>
                    <div className="bg-card border border-border/20 rounded-2xl p-4 flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer active:scale-[0.98]">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.customer || "—"} · {formatDate(p.updatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-foreground">{formatCurrency(t.cost)}</span>
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
