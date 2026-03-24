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
    // Mock filter logic since we don't have real status yet
    return matchesSearch; 
  });

  return (
    <PageTransition className="min-h-screen pb-28 bg-background flex flex-col">
      <div className="p-6 pb-2 glass-panel sticky top-0 z-40">
        <h1 className="text-2xl font-display font-bold mb-4">Alle Objekte</h1>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Name oder Kunde suchen..." 
            className="pl-11 bg-white/5 border-white/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {["Alle", "Aktiv", "Archiviert"].map((f, i) => {
            const val = ["all", "active", "archived"][i] as any;
            return (
              <button
                key={f}
                onClick={() => setFilter(val)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === val ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-12">
            <Building2 size={64} className="mb-4 text-muted-foreground" strokeWidth={1} />
            <h3 className="text-lg font-medium mb-2">Nichts gefunden</h3>
          </div>
        ) : (
          filtered.map(p => {
            const totals = calcProjectTotals(p, hourlyRate);
            return (
              <Link key={p.id} href={`/kalkulation/${p.id}`}>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-base truncate mb-0.5 group-hover:text-primary transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate max-w-[120px]">{p.customer || "Kein Kunde"}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                      <span className="flex items-center gap-1 shrink-0"><Calendar size={12}/> {formatDate(p.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-white">{formatCurrency(totals.cost)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{totals.count} Räume</p>
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
