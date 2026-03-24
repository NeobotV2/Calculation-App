import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { sharePrintView } from "@/lib/native-share";
import { isNative } from "@/lib/capacitor";

export default function PrintView() {
  const [, params] = useRoute("/print/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const plan = useStore((s) => s.plan);

  useEffect(() => {
    const gate = canUsePDF();
    if (!gate.allowed) {
      setLocation("/upgrade");
    }
  }, [plan, setLocation]);

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const companyName = useStore((s) => s.companyName);
  const vatRate = useStore((s) => s.vatRate);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print safe-header bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 pt-12 pb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/auswertung/${project.id}`)} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <Button onClick={() => sharePrintView()} size="sm" className="gap-2">
          {isNative ? <Share2 size={16} /> : <Printer size={16} />}
          {isNative ? "Teilen" : "Drucken / PDF"}
        </Button>
      </div>

      <div className="max-w-2xl mx-auto p-6 print:p-0 print:max-w-none">
        <div className="print:text-black print:bg-white">
          {pdfHeader && <p className="text-sm text-muted-foreground print:text-gray-600 mb-4">{pdfHeader}</p>}

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight print:text-black">{companyName}</h1>
            <p className="text-muted-foreground print:text-gray-500 mt-1">Angebot</p>
          </div>

          <div className="mb-8 space-y-1">
            <h2 className="text-xl font-semibold print:text-black">{project.name}</h2>
            {project.customer && <p className="text-muted-foreground print:text-gray-600">Kunde: {project.customer}</p>}
            {project.location && <p className="text-muted-foreground print:text-gray-600">Standort: {project.location}</p>}
          </div>

          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-border print:border-gray-300">
                <th className="text-left py-2 font-semibold">Raum</th>
                <th className="text-right py-2 font-semibold">m²</th>
                <th className="text-right py-2 font-semibold">Häufigkeit</th>
                <th className="text-right py-2 font-semibold">h/Mo</th>
                <th className="text-right py-2 font-semibold">€/Mo</th>
              </tr>
            </thead>
            <tbody>
              {project.rooms.map((r) => {
                const rc = calcRoom(r, effectiveRate);
                return (
                  <tr key={r.id} className="border-b border-border/30 print:border-gray-200">
                    <td className="py-2">{r.name || r.typeName}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(r.area, 1)}</td>
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

          {pdfFooter && (
            <div className="mt-12 pt-4 border-t border-border/30 print:border-gray-200">
              <p className="text-xs text-muted-foreground print:text-gray-500">{pdfFooter}</p>
            </div>
          )}

          <p className="mt-8 text-xs text-muted-foreground print:text-gray-400">
            Erstellt mit CleanCalc Pro · {new Date().toLocaleDateString("de-DE")}
          </p>
        </div>
      </div>
    </div>
  );
}
