import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canUsePDF } from "@/lib/feature-gates";
import { ArrowLeft, Printer, Share2, Lock, Crown } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS, getEffectivePerformance } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { sharePrintView } from "@/lib/native-share";
import { isNative } from "@/lib/capacitor";

export default function PrintView() {
  const [, params] = useRoute("/print/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const companyPhone = useStore((s) => s.companyPhone);
  const companyEmail = useStore((s) => s.companyEmail);
  const companyTaxNumber = useStore((s) => s.companyTaxNumber);
  const companyVatId = useStore((s) => s.companyVatId);
  const companyManagingDirector = useStore((s) => s.companyManagingDirector);
  const vatRate = useStore((s) => s.vatRate);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  const plan = useStore((s) => s.plan);
  const companyLogo = useStore((s) => s.companyLogo);

  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const pdfGate = canUsePDF();
  const canExport = pdfGate.allowed;

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Objekt nicht gefunden</p>
          <Button variant="outline" onClick={() => setLocation("/objekte")}>Zurück</Button>
        </div>
      </div>
    );
  }

  const effectiveRate = project.hourlyRate ?? hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);
  const vatAmount = vatRate > 0 ? totals.cost * (vatRate / 100) : 0;

  const hasAddress = companyStreet || companyZip || companyCity;
  const hasContact = companyPhone || companyEmail;
  const hasFooterData = companyTaxNumber || companyVatId || companyManagingDirector || pdfFooter;

  const handleExport = () => {
    if (!canExport) {
      setUpgradeOpen(true);
      return;
    }
    sharePrintView();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print safe-header bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 pt-12 pb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/objekte/${project.id}`)} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex gap-2">
          {!canExport && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border/40 rounded-full">
              <Lock size={12} /> Nur Vorschau
            </span>
          )}
          <Button onClick={handleExport} size="sm" className="gap-2">
            {canExport ? (
              <>
                {isNative ? <Share2 size={16} /> : <Printer size={16} />}
                {isNative ? "Teilen" : "Drucken / PDF"}
              </>
            ) : (
              <>
                <Crown size={16} /> Pro: Export
              </>
            )}
          </Button>
        </div>
      </div>

      {!canExport && (
        <div className="no-print mx-4 mt-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
          <Lock size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Vorschau-Modus</p>
            <p className="text-xs text-muted-foreground mt-1">Im Free-Plan kannst du die Angebotsvorschau sehen. Upgrade auf Pro, um PDF-Angebote zu exportieren und zu drucken.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setUpgradeOpen(true)}>
              Auf Pro upgraden
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6 print:p-0 print:max-w-none">
        <div className="print:text-black print:bg-white">
          {pdfHeader && <p className="text-sm text-muted-foreground print:text-gray-600 mb-4">{pdfHeader}</p>}

          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              {companyLogo && <img src={companyLogo} alt="Logo" className="h-12 w-auto object-contain print:h-12" />}
              <div>
              <h1 className="text-3xl font-bold tracking-tight print:text-black">{companyName}</h1>
              {hasAddress && (
                <p className="text-sm text-muted-foreground print:text-gray-500 mt-1">
                  {companyStreet}{companyStreet && (companyZip || companyCity) ? ", " : ""}{companyZip} {companyCity}
                </p>
              )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="w-16 h-16 border-2 border-dashed border-border/40 print:border-gray-300 rounded-xl flex items-center justify-center text-[10px] text-muted-foreground print:text-gray-400 text-center leading-tight">
                Logo
              </div>
              {hasContact && (
                <div className="text-right text-xs text-muted-foreground print:text-gray-500">
                  {companyPhone && <p>{companyPhone}</p>}
                  {companyEmail && <p>{companyEmail}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="mb-2">
            <p className="text-muted-foreground print:text-gray-500 text-lg font-medium">Angebot / Kalkulation</p>
          </div>

          <div className="mb-8 space-y-1">
            <h2 className="text-xl font-semibold print:text-black">{project.name}</h2>
            {project.customer && <p className="text-muted-foreground print:text-gray-600">Kunde: {project.customer}</p>}
            {project.location && <p className="text-muted-foreground print:text-gray-600">Standort: {project.location}</p>}
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground print:text-gray-500 mb-3">Raumliste</h3>
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-border print:border-gray-300">
                <th className="text-left py-2 font-semibold">Raum</th>
                <th className="text-left py-2 font-semibold">Raumart</th>
                <th className="text-right py-2 font-semibold">m²</th>
                <th className="text-right py-2 font-semibold">m²/h</th>
                <th className="text-right py-2 font-semibold">Häufigkeit</th>
                <th className="text-right py-2 font-semibold">h/Mo</th>
                <th className="text-right py-2 font-semibold">€/Mo</th>
              </tr>
            </thead>
            <tbody>
              {project.rooms.map((r) => {
                const rc = calcRoom(r, effectiveRate);
                const effPerf = getEffectivePerformance(r);
                return (
                  <tr key={r.id} className="border-b border-border/30 print:border-gray-200">
                    <td className="py-2">{r.name || r.typeName}</td>
                    <td className="py-2 text-muted-foreground print:text-gray-500">{r.typeName}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(r.area, 1)}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(effPerf, 0)}</td>
                    <td className="py-2 text-right">{FREQUENCY_LABELS[r.frequency]}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(rc.monthlyHours, 1)}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(rc.monthlyCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="border-t-2 border-border print:border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-base">
              <span>Gesamtfläche</span>
              <span className="font-medium">{formatNumber(totals.area, 0)} m²</span>
            </div>
            <div className="flex justify-between text-base">
              <span>Stunden / Monat</span>
              <span className="font-medium">{formatNumber(totals.hours, 1)} h</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Monatspreis (netto)</span>
              <span>{formatCurrency(totals.cost)}</span>
            </div>
            {vatRate > 0 && (
              <>
                <div className="flex justify-between text-base text-muted-foreground print:text-gray-500">
                  <span>MwSt. ({vatRate}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Monatspreis (brutto)</span>
                  <span>{formatCurrency(totals.cost + vatAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border/30 print:border-gray-200">
              <span>Jahrespreis {vatRate > 0 ? "(brutto)" : "(netto)"}</span>
              <span>{formatCurrency((totals.cost + vatAmount) * 12)}</span>
            </div>
          </div>

          {project.rooms.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground print:text-gray-500 mb-3">Leistungsverzeichnis</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border print:border-gray-300">
                    <th className="text-left py-2 font-semibold">Pos.</th>
                    <th className="text-left py-2 font-semibold">Bezeichnung</th>
                    <th className="text-left py-2 font-semibold">Raumgruppe</th>
                    <th className="text-right py-2 font-semibold">Fläche</th>
                    <th className="text-right py-2 font-semibold">Häufigkeit</th>
                    <th className="text-right py-2 font-semibold">LW (m²/h)</th>
                  </tr>
                </thead>
                <tbody>
                  {project.rooms.map((r, i) => {
                    const effPerf = getEffectivePerformance(r);
                    return (
                      <tr key={r.id} className="border-b border-border/30 print:border-gray-200">
                        <td className="py-2 text-muted-foreground print:text-gray-500">{i + 1}</td>
                        <td className="py-2">{r.name || r.typeName}</td>
                        <td className="py-2 text-muted-foreground print:text-gray-500">{r.groupName}</td>
                        <td className="py-2 text-right tabular-nums">{formatNumber(r.area, 1)} m²</td>
                        <td className="py-2 text-right">{FREQUENCY_LABELS[r.frequency]}</td>
                        <td className="py-2 text-right tabular-nums">{formatNumber(effPerf, 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasFooterData && (
            <div className="mt-12 pt-4 border-t border-border/30 print:border-gray-200">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground print:text-gray-500">
                {companyManagingDirector && <span>Geschäftsführer: {companyManagingDirector}</span>}
                {companyTaxNumber && <span>Steuernummer: {companyTaxNumber}</span>}
                {companyVatId && <span>USt-IdNr.: {companyVatId}</span>}
              </div>
              {pdfFooter && (
                <p className="text-xs text-muted-foreground print:text-gray-500 mt-2">{pdfFooter}</p>
              )}
            </div>
          )}

          <p className="mt-8 text-xs text-muted-foreground print:text-gray-400">
            Erstellt mit CleanCalc Pro · {new Date().toLocaleDateString("de-DE")}
          </p>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={pdfGate.reason || ""} triggerReason={pdfGate.trigger} />
    </div>
  );
}
