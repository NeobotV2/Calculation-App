import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Lock, X } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useState } from "react";

export default function AuswertungDetail() {
  const [, params] = useRoute("/auswertung/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const plan = useStore((s) => s.plan);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <X size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Objekt nicht gefunden</h3>
        <p className="text-sm text-muted-foreground mb-4">Das Objekt wurde möglicherweise gelöscht.</p>
        <Button variant="outline" onClick={() => setLocation("/auswertung")}>Zur Auswertung</Button>
      </div>
    );
  }

  const effectiveRate = project.hourlyRate ?? hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);

  const groupMap = new Map<string, { hours: number; cost: number }>();
  project.rooms.forEach((r) => {
    const rc = calcRoom(r, effectiveRate);
    const existing = groupMap.get(r.groupName) || { hours: 0, cost: 0 };
    groupMap.set(r.groupName, { hours: existing.hours + rc.monthlyHours, cost: existing.cost + rc.monthlyCost });
  });

  const handlePDF = () => {
    const gate = canUsePDF();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }
    setLocation(`/print/${project.id}`);
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-32">
      <div className="bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 safe-header pb-3 flex items-center justify-between pt-12">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/objekte/${project.id}`)} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-semibold text-lg text-foreground truncate max-w-[200px]">{project.name}</h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-primary mb-2 font-medium">Monatsvolumen netto</p>
          <h2 className="text-5xl font-bold tabular-nums text-foreground mb-6">{formatCurrency(totals.cost)}</h2>
          <div className="grid grid-cols-2 gap-4 border-t border-primary/20 pt-4">
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

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Räume</p>
            <p className="text-2xl font-bold text-foreground">{totals.count}</p>
          </div>
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Fläche</p>
            <p className="text-2xl font-bold text-foreground">{formatNumber(totals.area, 0)} m²</p>
          </div>
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ø Preis/m²</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.pricePerSqm)}</p>
          </div>
          <div className="bg-card border border-border/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Stundensatz</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(effectiveRate)}</p>
          </div>
        </div>

        {groupMap.size > 0 && (
          <div>
            <h3 className="font-semibold text-lg tracking-tight mb-3">Nach Raumgruppe</h3>
            <div className="space-y-2">
              {Array.from(groupMap.entries()).sort((a, b) => b[1].cost - a[1].cost).map(([name, data]) => (
                <div key={name} className="bg-card border border-border/20 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm font-medium">{name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold">{formatCurrency(data.cost)}</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatNumber(data.hours, 1)} h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-lg tracking-tight mb-3">Raumaufstellung</h3>
          <div className="space-y-2">
            {project.rooms.map((r) => {
              const rc = calcRoom(r, effectiveRate);
              return (
                <div key={r.id} className="bg-card border border-border/20 rounded-xl p-3 flex justify-between items-center">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-medium text-sm text-foreground truncate">{r.name || r.typeName}</p>
                    <p className="text-xs text-muted-foreground">{r.area} m² · {FREQUENCY_LABELS[r.frequency]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(rc.monthlyCost)}</p>
                    <p className="text-xs text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden border border-border/30 bg-card">
          <div className={`p-6 ${plan === "basic" ? "blur-[4px] select-none opacity-50" : ""}`}>
            <h3 className="font-semibold mb-4 text-lg tracking-tight">Profi-Auswertung</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Materialkosten (3%)</span>
                <span className="font-medium text-sm">{formatCurrency(totals.cost * 0.03)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">Lohnkosten</span>
                <span className="font-medium text-sm">{formatCurrency(totals.cost * 0.7)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-primary font-semibold text-sm">Deckungsbeitrag</span>
                <span className="font-bold text-primary">{formatCurrency(totals.cost * 0.27)}</span>
              </div>
            </div>
          </div>
          {plan === "basic" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
              <div className="w-12 h-12 bg-card border border-border/40 rounded-full flex items-center justify-center mb-3">
                <Lock size={20} />
              </div>
              <h4 className="font-bold text-base mb-1">Nur in Pro</h4>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-[220px]">Detailkalkulation und PDF-Exporte sind Pro-Features.</p>
              <Button onClick={() => setLocation("/upgrade")} size="sm" className="rounded-full px-6">Upgrade entdecken</Button>
            </div>
          )}
        </div>

        <Button className="w-full" size="lg" variant={plan === "pro" ? "default" : "outline"} onClick={handlePDF}>
          <Download size={18} className="mr-2" /> Angebot als PDF exportieren
        </Button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </PageTransition>
  );
}
