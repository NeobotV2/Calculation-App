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
      <div className="bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 pt-12 pb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/kalkulation/${project.id}`)} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-lg text-foreground truncate max-w-[200px]">{project.name}</h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-8">
        {/* Main Totals Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-8">
          <p className="text-xs uppercase tracking-widest text-primary mb-2 font-medium">Monatsvolumen netto</p>
          <h2 className="text-5xl font-bold tabular-nums text-foreground mb-8">{formatCurrency(totals.cost)}</h2>
          
          <div className="grid grid-cols-2 gap-6 border-t border-primary/20 pt-6">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Jahreswert</p>
              <p className="font-semibold text-lg text-foreground">{formatCurrency(totals.annualCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Stunden / Monat</p>
              <p className="font-semibold text-lg text-foreground">{formatNumber(totals.hours, 1)} h</p>
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Räume gesamt</p>
            <p className="text-2xl font-bold text-foreground">{totals.count}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Reinigungsfläche</p>
            <p className="text-2xl font-bold text-foreground">{formatNumber(totals.area, 0)} m²</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Ø Preis / m² / Mo</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.pricePerSqm)}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Stundensatz Basis</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(hourlyRate)}</p>
          </div>
        </div>

        {/* Room Breakdown */}
        <div>
          <h3 className="font-semibold text-xl tracking-tight text-foreground mb-4">Raumaufstellung</h3>
          <div className="space-y-3">
            {project.rooms.map(r => {
              const rc = calcRoom(r, hourlyRate);
              return (
                <div key={r.id} className="bg-card border border-border/30 rounded-2xl p-4 flex justify-between items-center">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-semibold text-base text-foreground truncate">{r.name || r.typeName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.area}m² • {FREQUENCY_LABELS[r.frequency]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base text-foreground">{formatCurrency(rc.monthlyCost)}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">{formatNumber(rc.monthlyHours, 1)} h</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pro Feature Teaser */}
        <div className="relative rounded-3xl overflow-hidden border border-border/40 bg-card mt-8">
          <div className={`p-6 ${plan === 'basic' ? 'blur-[4px] select-none opacity-50' : ''}`}>
            <h3 className="font-semibold mb-6 text-xl tracking-tight text-foreground">
              Profi-Auswertung
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-muted-foreground text-sm">Materialkosten (3%)</span>
                <span className="font-medium text-foreground">{formatCurrency(totals.cost * 0.03)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-muted-foreground text-sm">Lohnkosten</span>
                <span className="font-medium text-foreground">{formatCurrency(totals.cost * 0.7)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-primary font-semibold">Deckungsbeitrag</span>
                <span className="font-bold text-primary text-lg">{formatCurrency(totals.cost * 0.27)}</span>
              </div>
            </div>
          </div>
          
          {plan === 'basic' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
              <div className="w-14 h-14 bg-card border border-border/50 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Lock size={24} className="text-foreground" />
              </div>
              <h4 className="font-bold text-lg text-foreground mb-1">Nur in Pro</h4>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-[220px]">Detailkalkulation und PDF-Exporte sind Pro-Features.</p>
              <Button onClick={() => setLocation("/upgrade")} className="rounded-full px-8">Upgrade entdecken</Button>
            </div>
          )}
        </div>

        <Button 
          className="w-full mt-4" size="lg"
          variant={plan === 'pro' ? 'default' : 'outline'}
          onClick={() => plan === 'pro' ? alert("PDF Download simuliert!") : setLocation("/upgrade")}
        >
          <Download size={20} className="mr-2"/> Angebot als PDF Exportieren
        </Button>
      </div>
    </PageTransition>
  );
}