import { X, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/capacitor";
import type { Project } from "@/store/use-store";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";

type ProjectTotals = ReturnType<typeof calcProjectTotals>;

export function PdfPreviewOverlay({
  project,
  totals,
  effectiveRate,
  vatRate,
  pdfHeader,
  pdfFooter,
  companyName,
  companyLogo,
  companyStreet,
  companyZip,
  companyCity,
  companyPhone,
  companyEmail,
  companyTaxNumber,
  companyVatId,
  companyManagingDirector,
  onClose,
  onPrint,
}: {
  project: Project;
  totals: ProjectTotals;
  effectiveRate: number;
  vatRate: number;
  pdfHeader: string;
  pdfFooter: string;
  companyName: string;
  companyLogo: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxNumber: string;
  companyVatId: string;
  companyManagingDirector: string;
  onClose: () => void;
  onPrint: () => void;
}) {
  const vatAmount = vatRate > 0 ? totals.cost * (vatRate / 100) : 0;
  const hasAddress = companyStreet || companyZip || companyCity;
  const hasContact = companyPhone || companyEmail;
  const hasFooterData = companyTaxNumber || companyVatId || companyManagingDirector || pdfFooter;
  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" className="fixed inset-0 z-[80] flex flex-col">
        <div className="bg-background/95 border-b border-border/20 px-4 py-3 flex items-center justify-between safe-header">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Schließen">
            <X size={20} aria-hidden="true" />
          </Button>
          <h3 id="pdf-preview-title" className="font-semibold text-sm">PDF-Vorschau</h3>
          <Button size="sm" className="gap-2" onClick={onPrint}>
            {isNative ? <Share2 size={14} aria-hidden="true" /> : <Printer size={14} aria-hidden="true" />}
            {isNative ? "Teilen" : "Drucken"}
          </Button>
        </div>
        <div className="flex-1 overflow-auto bg-white p-6">
          <div className="max-w-2xl mx-auto text-black">
            {pdfHeader && <p className="text-sm text-gray-600 mb-4">{pdfHeader}</p>}
            <div className="mb-8 flex justify-between items-start">
              <div className="flex items-center gap-4">
                {companyLogo && <img src={companyLogo} alt="Logo" className="h-12 w-auto object-contain" />}
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-black">{companyName}</h1>
                  {hasAddress && (
                    <p className="text-sm text-gray-500 mt-1">
                      {companyStreet}{companyStreet && (companyZip || companyCity) ? ", " : ""}{companyZip} {companyCity}
                    </p>
                  )}
                </div>
              </div>
              {hasContact && (
                <div className="text-right text-sm text-gray-500 mt-1">
                  {companyPhone && <p>{companyPhone}</p>}
                  {companyEmail && <p>{companyEmail}</p>}
                </div>
              )}
            </div>
            <div className="mb-2">
              <p className="text-gray-500 text-lg font-medium">Angebot</p>
            </div>
            <div className="mb-8 space-y-1">
              <h2 className="text-xl font-semibold text-black">{project.name}</h2>
              {project.customer && <p className="text-gray-600">Kunde: {project.customer}</p>}
              {project.location && <p className="text-gray-600">Standort: {project.location}</p>}
            </div>
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-semibold text-black">Raum</th>
                  <th className="text-right py-2 font-semibold text-black">m²</th>
                  <th className="text-right py-2 font-semibold text-black">Häufigkeit</th>
                  <th className="text-right py-2 font-semibold text-black">h/Mo</th>
                  <th className="text-right py-2 font-semibold text-black">€/Mo</th>
                </tr>
              </thead>
              <tbody>
                {project.rooms.map((r) => {
                  const rc = calcRoom(r, effectiveRate);
                  return (
                    <tr key={r.id} className="border-b border-gray-200">
                      <td className="py-2 text-black">{r.name || r.typeName}</td>
                      <td className="py-2 text-right tabular-nums text-black">{formatNumber(r.area, 1)}</td>
                      <td className="py-2 text-right text-black">{FREQUENCY_LABELS[r.frequency]}</td>
                      <td className="py-2 text-right tabular-nums text-black">{formatNumber(rc.monthlyHours, 1)}</td>
                      <td className="py-2 text-right tabular-nums font-medium text-black">{formatCurrency(rc.monthlyCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t-2 border-gray-300 pt-4 space-y-2">
              <div className="flex justify-between text-base text-black">
                <span>Gesamtfläche</span>
                <span className="font-medium">{formatNumber(totals.area, 0)} m²</span>
              </div>
              <div className="flex justify-between text-base text-black">
                <span>Stunden / Monat</span>
                <span className="font-medium">{formatNumber(totals.hours, 1)} h</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-black">
                <span>Monatspreis (netto)</span>
                <span>{formatCurrency(totals.cost)}</span>
              </div>
              {vatRate > 0 && (
                <>
                  <div className="flex justify-between text-base text-gray-500">
                    <span>MwSt. ({vatRate}%)</span>
                    <span>{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-black">
                    <span>Monatspreis (brutto)</span>
                    <span>{formatCurrency(totals.cost + vatAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 text-black">
                <span>Jahrespreis {vatRate > 0 ? "(brutto)" : "(netto)"}</span>
                <span>{formatCurrency((totals.cost + vatAmount) * 12)}</span>
              </div>
            </div>
            {hasFooterData && (
              <div className="mt-12 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  {companyManagingDirector && <span>Geschäftsführer: {companyManagingDirector}</span>}
                  {companyTaxNumber && <span>Steuernummer: {companyTaxNumber}</span>}
                  {companyVatId && <span>USt-IdNr.: {companyVatId}</span>}
                </div>
                {pdfFooter && <p className="text-xs text-gray-500 mt-2">{pdfFooter}</p>}
              </div>
            )}
            <p className="mt-8 text-xs text-gray-400">
              Erstellt mit CleanCalc Pro · {new Date().toLocaleDateString("de-DE")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
