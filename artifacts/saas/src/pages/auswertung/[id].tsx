import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Lock } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function AuswertungDetail() {
  const [, params] = useRoute("/auswertung/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  
  const project = useStore(s => s.projects.find(p => p.id === id));
  const hourlyRate = useStore(s => s.hourlyRate);
  const plan = useStore(s => s.plan);

  if (!project) return <div className="p-8 text-center text-muted-foreground mt-20">Objekt nicht gefunden</div>;

  const totals = calcProjectTotals(project, hourlyRate);

  return (
    <PageTransition className="min-h-screen bg-background pb-32">
      <div className="glass-panel sticky top-0 z-30 px-4 pt-12 pb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/kalkulation/${project.id}`)} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold truncate max-w-[200px]">{project.name}</h1>
        <div className="w-10" /> {/* spacer */}
      </div>

      <div className="p-6 space-y-6">
        {/* Main Totals Card */}
        <div className="glass-card rounded-3xl p-6 accent-gradient shadow-2xl shadow-primary/20">
          <p className="text-primary-foreground/80 font-medium mb-1">Monatsvolumen netto</p>
          <h2 className="text-5xl font-display font-bold mb-6">{formatCurrency(totals.cost)}</h2>
          
          <div className="grid grid-cols-2 gap-4 border-t border-primary-foreground/10 pt-4">
            <div>
              <p className="text-primary-foreground/70 text-xs mb-0.5">Jahreswert</p>
              <p className="font-semibold">{formatCurrency(totals.annualCost)}</p>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs mb-0.5">Stunden / Monat</p>
              <p className="font-semibold">{formatNumber(totals.hours, 1)} h</p>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Räume gesamt</p>
            <p className="text-xl font-bold font-display">{totals.count}</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Reinigungsfläche</p>
            <p className="text-xl font-bold font-display">{formatNumber(totals.area, 0)} m²</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Ø Preis / m² / Mo</p>
            <p className="text-xl font-bold font-display">{formatCurrency(totals.pricePerSqm)}</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Stundensatz Basis</p>
            <p className="text-xl font-bold font-display">{formatCurrency(hourlyRate)}</p>
          </div>
        </div>

        {/* Room Breakdown Table (Mobile Card List) */}
        <div>
          <h3 className="font-semibold mb-4 text-lg">Raumaufstellung</h3>
          <div className="space-y-2">
            {project.rooms.map(r => {
              const rc = calcRoom(r, hourlyRate);
              return (
                <div key={r.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-medium truncate text-sm">{r.name || r.typeName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.area}m² • {FREQUENCY_LABELS[r.frequency]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-primary">{formatCurrency(rc.monthlyCost)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(rc.monthlyHours, 1)}h</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pro Feature Teaser */}
        <div className="relative mt-8 rounded-3xl overflow-hidden border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/0" />
          <div className={`p-6 ${plan === 'basic' ? 'blur-sm select-none' : ''}`}>
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              Profi-Auswertung
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-muted-foreground text-sm">Materialkosten (3%)</span>
                <span className="font-medium">{formatCurrency(totals.cost * 0.03)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-muted-foreground text-sm">Lohnkosten</span>
                <span className="font-medium">{formatCurrency(totals.cost * 0.7)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-primary font-medium text-sm">Deckungsbeitrag</span>
                <span className="font-bold text-primary">{formatCurrency(totals.cost * 0.27)}</span>
              </div>
            </div>
          </div>
          
          {plan === 'basic' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-3">
                <Lock size={20} className="text-white" />
              </div>
              <h4 className="font-bold mb-1">Nur in Pro</h4>
              <p className="text-xs text-muted-foreground mb-4 text-center max-w-[200px]">Detailkalkulation und PDF-Exporte sind Pro-Features.</p>
              <Button size="sm" onClick={() => setLocation("/upgrade")} className="rounded-full">Upgrade entdecken</Button>
            </div>
          )}
        </div>

        <Button 
          className="w-full mt-4" 
          variant={plan === 'pro' ? 'default' : 'outline'}
          onClick={() => plan === 'pro' ? alert("PDF Download simuliert!") : setLocation("/upgrade")}
        >
          <Download size={18} className="mr-2"/> Angebot als PDF Exportieren
        </Button>
      </div>
    </PageTransition>
  );
}
