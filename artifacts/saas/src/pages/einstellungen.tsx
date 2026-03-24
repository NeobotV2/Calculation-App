import { useState } from "react";
import { useLocation } from "wouter";
import { useStore, type FrequencyKey } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREQUENCY_LABELS } from "@/lib/calc";
import { Building2, Save, FileText, Lock, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Einstellungen() {
  const [, setLocation] = useLocation();
  const companyName = useStore((s) => s.companyName);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const vatRate = useStore((s) => s.vatRate);
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  const updateSettings = useStore((s) => s.updateSettings);
  const plan = useStore((s) => s.plan);

  const [company, setCompany] = useState(companyName);
  const [rate, setRate] = useState(hourlyRate.toString().replace(".", ","));
  const [vat, setVat] = useState(vatRate.toString().replace(".", ","));
  const [freq, setFreq] = useState<FrequencyKey>(defaultFrequency);
  const [header, setHeader] = useState(pdfHeader);
  const [footer, setFooter] = useState(pdfFooter);

  const handleSave = () => {
    updateSettings({
      companyName: company.trim() || "Meine Reinigungsfirma",
      hourlyRate: parseFloat(rate.replace(",", ".")) || 22.5,
      vatRate: parseFloat(vat.replace(",", ".")) || 0,
      defaultFrequency: freq,
    });
    toast.success("Einstellungen gespeichert");
  };

  const handleSavePDF = () => {
    updateSettings({
      pdfHeader: header.trim(),
      pdfFooter: footer.trim(),
    });
    toast.success("PDF-Einstellungen gespeichert");
  };

  return (
    <PageTransition className="min-h-screen pb-28 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mt-2">Einstellungen</h1>
      </div>

      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Building2 size={16} /> Allgemein
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Firmenname</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Standard-Stundensatz (€/h)</label>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">MwSt.-Satz (%)</label>
              <Input value={vat} onChange={(e) => setVat(e.target.value)} inputMode="decimal" placeholder="0 = ohne MwSt." className="bg-background border-border/50 h-12" />
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">Wird auf dem PDF-Angebot ausgewiesen. 0 = keine MwSt.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Clock size={14} /> Standard-Reinigungshäufigkeit
              </label>
              <select
                value={freq}
                onChange={(e) => setFreq(e.target.value as FrequencyKey)}
                className="w-full h-12 rounded-xl border border-border/50 bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} className="w-full"><Save size={18} className="mr-2" /> Änderungen speichern</Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <FileText size={16} /> PDF-Angebote
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
            <div className={`space-y-5 ${plan === "basic" ? "opacity-30 select-none pointer-events-none" : ""}`}>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Kopfzeile (optional)</label>
                <Input
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="z.B. Angebots-Nr., Datum, Adresse"
                  disabled={plan === "basic"}
                  className="bg-background border-border/50 h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Fußzeile (optional)</label>
                <Input
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Bankverbindung, HRB, Steuernr., etc."
                  disabled={plan === "basic"}
                  className="bg-background border-border/50 h-12"
                />
              </div>
              <Button onClick={handleSavePDF} className="w-full" disabled={plan === "basic"}>
                <Save size={18} className="mr-2" /> PDF-Einstellungen speichern
              </Button>
            </div>

            {plan === "basic" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
                <div className="w-12 h-12 bg-background border border-border/50 rounded-full flex items-center justify-center mb-3">
                  <Lock size={20} className="text-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nur im Pro Plan</p>
                <p className="text-xs text-muted-foreground mb-4">Individualisiere deine PDF-Angebote.</p>
                <Button variant="outline" size="sm" onClick={() => setLocation("/upgrade")}>Upgrade ansehen</Button>
              </div>
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </PageTransition>
  );
}
