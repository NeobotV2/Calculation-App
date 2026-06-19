import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InfoSheet({
  hourlyRate,
  customerInput,
  locationInput,
  rateInput,
  notesInput,
  onCustomerChange,
  onLocationChange,
  onRateChange,
  onNotesChange,
  onClose,
  onSave,
}: {
  hourlyRate: number;
  customerInput: string;
  locationInput: string;
  rateInput: string;
  notesInput: string;
  onCustomerChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onRateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="objekt-info-title" className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border p-6 pb-safe md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:max-w-lg md:w-full">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 md:hidden" />
        <h2 id="objekt-info-title" className="text-2xl font-semibold tracking-tight mb-4">Objektinfo</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="objekt-customer" className="text-sm font-medium mb-1 block">Kunde</label>
            <Input id="objekt-customer" value={customerInput} onChange={(e) => onCustomerChange(e.target.value)} placeholder="z.B. Muster GmbH" className="bg-card h-11" />
          </div>
          <div>
            <label htmlFor="objekt-location" className="text-sm font-medium mb-1 block">Standort</label>
            <Input id="objekt-location" value={locationInput} onChange={(e) => onLocationChange(e.target.value)} placeholder="z.B. Berlin, Musterstraße 1" className="bg-card h-11" />
          </div>
          <div>
            <label htmlFor="objekt-rate" className="text-sm font-medium mb-1 block">Verrechnungssatz (€/h)</label>
            <Input id="objekt-rate" aria-describedby="objekt-rate-hint" value={rateInput} onChange={(e) => onRateChange(e.target.value)} inputMode="decimal" placeholder={`Standard: ${hourlyRate.toString().replace(".", ",")} €/h`} className="bg-card h-11" />
            <p id="objekt-rate-hint" className="text-xs text-muted-foreground mt-1 ml-1">Leer = globaler Standard ({hourlyRate.toString().replace(".", ",")} €/h)</p>
          </div>
          <div>
            <label htmlFor="objekt-notes" className="text-sm font-medium mb-1 block">Notizen</label>
            <Input id="objekt-notes" value={notesInput} onChange={(e) => onNotesChange(e.target.value)} placeholder="Optionale Notizen" className="bg-card h-11" />
          </div>
          <Button onClick={onSave} className="w-full" size="lg">Speichern</Button>
        </div>
      </div>
    </>
  );
}
