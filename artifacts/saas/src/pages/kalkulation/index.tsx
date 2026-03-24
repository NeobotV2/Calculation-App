import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Building2, Calendar, MoreVertical } from "lucide-react";
import { calcProjectTotals } from "@/lib/calc";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function KalkulationList() {
  const [, setLocation] = useLocation();
  const projects = useStore(s => s.projects);
  const hourlyRate = useStore(s => s.hourlyRate);
  const addProject = useStore(s => s.addProject);
  const [search, setSearch] = useState("");

  const handleCreate = () => {
    const id = addProject("Neues Objekt", "");
    setLocation(`/kalkulation/${id}`);
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.customer?.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageTransition className="min-h-screen pb-28 bg-background flex flex-col">
      <div className="p-6 pb-4 glass-panel sticky top-0 z-40">
        <h1 className="text-2xl font-display font-bold mb-4">Kalkulation</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Objekt suchen..." 
            className="pl-11 bg-white/5 border-white/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-12">
            <Building2 size={64} className="mb-4 text-muted-foreground" strokeWidth={1} />
            <h3 className="text-lg font-medium mb-2">Keine Objekte gefunden</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">Erstelle dein erstes Objekt, um mit der Kalkulation zu beginnen.</p>
          </div>
        ) : (
          filtered.map(p => {
            const totals = calcProjectTotals(p, hourlyRate);
            return (
              <Link key={p.id} href={`/kalkulation/${p.id}`}>
                <div className="glass-card rounded-2xl p-5 hover:bg-white/5 transition-colors cursor-pointer active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      {p.customer && <p className="text-sm text-muted-foreground mt-1">{p.customer}</p>}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Building2 size={14}/> {totals.count} Räume</span>
                    </div>
                    <span className="font-display font-bold text-primary">{formatCurrency(totals.cost)}/Mo</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <div className="fixed bottom-24 right-6 z-50">
        <Button onClick={handleCreate} size="icon" className="w-14 h-14 rounded-full shadow-xl shadow-primary/30">
          <Plus size={28} />
        </Button>
      </div>

      <BottomNav />
    </PageTransition>
  );
}

// Temporary inline component
function ChevronRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
}
