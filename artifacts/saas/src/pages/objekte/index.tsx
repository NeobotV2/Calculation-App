import { useState } from "react";
import { Link } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, Calendar, ChevronRight } from "lucide-react";
import { calcProjectTotals } from "@/lib/calc";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ObjekteList() {
  const projects = useStore(s => s.projects);
  const hourlyRate = useStore(s => s.hourlyRate);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.customer && p.customer.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch; 
  });

  return (
    <PageTransition className="min-h-screen pb-28 bg-background flex flex-col">
      <div className="p-6 pb-2 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mb-6 mt-4">Alle Objekte</h1>
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Name oder Kunde suchen..." 
            className="pl-11 bg-card border-border/50 h-12"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
          {["Alle", "Aktiv", "Archiviert"].map((f, i) => {
            const val = ["all", "active", "archived"][i] as any;
            return (
              <button
                key={f}
                onClick={() => setFilter(val)}
                className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === val ? 'bg-foreground text-background' : 'bg-card border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 size={32} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium mb-2 text-foreground">Nichts gefunden</h3>
          </div>
        ) : (
          filtered.map(p => {
            const totals = calcProjectTotals(p, hourlyRate);
            return (
              <Link key={p.id} href={`/kalkulation/${p.id}`}>
                <div className="bg-card border border-border/30 rounded-2xl p-5 hover:bg-secondary transition-colors cursor-pointer group flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-lg text-foreground truncate mb-1 group-hover:text-primary transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="truncate max-w-[120px]">{p.customer || "Kein Kunde"}</span>
                      <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                      <span className="flex items-center gap-1.5 shrink-0"><Calendar size={14}/> {formatDate(p.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground text-lg">{formatCurrency(totals.cost)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{totals.count} Räume</p>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <BottomNav />
    </PageTransition>
  );
}