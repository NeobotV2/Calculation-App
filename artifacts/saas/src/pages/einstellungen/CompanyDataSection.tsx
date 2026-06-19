import { Building2, Save, MapPin, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

interface CompanyDataSectionProps {
  company: string;
  setCompany: (v: string) => void;
  street: string;
  setStreet: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  taxNumber: string;
  setTaxNumber: (v: string) => void;
  vatId: string;
  setVatId: (v: string) => void;
  managingDirector: string;
  setManagingDirector: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

/** Presentational form for company master data (Firmenstammdaten). */
export function CompanyDataSection({
  company,
  setCompany,
  street,
  setStreet,
  zip,
  setZip,
  city,
  setCity,
  phone,
  setPhone,
  email,
  setEmail,
  taxNumber,
  setTaxNumber,
  vatId,
  setVatId,
  managingDirector,
  setManagingDirector,
  isSaving,
  onSave,
}: CompanyDataSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <Building2 size={16} /> Firmenstammdaten
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
        <FormField id="company-name" label="Firmenname">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-background border-border/50 h-12" />
        </FormField>
        <div>
          <span className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
            <MapPin size={14} aria-hidden="true" /> Adresse
          </span>
          <div className="space-y-3">
            <Input aria-label="Straße und Hausnummer" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Straße und Hausnummer" className="bg-background border-border/50 h-12" />
            <div className="flex gap-3">
              <Input aria-label="PLZ" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="PLZ" className="bg-background border-border/50 h-12 w-28" />
              <Input aria-label="Ort" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ort" className="bg-background border-border/50 h-12 flex-1" />
            </div>
          </div>
        </div>
        <FormField id="company-phone" label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="z.B. +49 123 456789" type="tel" className="bg-background border-border/50 h-12" />
        </FormField>
        <FormField id="company-email" label="E-Mail">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@firma.de" type="email" className="bg-background border-border/50 h-12" />
        </FormField>
        <div>
          <span className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
            <FileCheck size={14} aria-hidden="true" /> Steuerliche Angaben
          </span>
          <div className="space-y-3">
            <Input aria-label="Steuernummer" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="Steuernummer" className="bg-background border-border/50 h-12" />
            <Input aria-label="USt-IdNr." value={vatId} onChange={(e) => setVatId(e.target.value)} placeholder="USt-IdNr. (z.B. DE123456789)" className="bg-background border-border/50 h-12" />
          </div>
        </div>
        <FormField id="company-director" label="Geschäftsführer">
          <Input value={managingDirector} onChange={(e) => setManagingDirector(e.target.value)} placeholder="Vor- und Nachname" className="bg-background border-border/50 h-12" />
        </FormField>
        <div className="pt-2">
          <Button onClick={onSave} className="w-full" disabled={isSaving}>
            <Save size={18} className="mr-2" /> Firmenstammdaten speichern
          </Button>
        </div>
      </div>
    </section>
  );
}
