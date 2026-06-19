import type { RefObject } from "react";
import { FileText, Save, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { isPaidPlan, type PlanId } from "@/lib/billing-config";
import { ProLock } from "./ProLock";

interface PdfBrandingSectionProps {
  plan: PlanId;
  companyLogo: string;
  logoInputRef: RefObject<HTMLInputElement | null>;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  header: string;
  setHeader: (v: string) => void;
  footer: string;
  setFooter: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
  onUpgrade: () => void;
}

/** PDF header/footer and logo branding settings, gated behind Pro plan. */
export function PdfBrandingSection({
  plan,
  companyLogo,
  logoInputRef,
  onLogoUpload,
  onRemoveLogo,
  header,
  setHeader,
  footer,
  setFooter,
  isSaving,
  onSave,
  onUpgrade,
}: PdfBrandingSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <FileText size={16} /> PDF & Branding
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
        <div className={`space-y-5 ${!isPaidPlan(plan) ? "opacity-30 select-none pointer-events-none" : ""}`}>
          <p className="text-xs text-muted-foreground">
            Firmenstammdaten werden automatisch im PDF-Briefkopf und -Fuß verwendet. Hier können Sie optionale Zusatzzeilen eintragen.
          </p>
          <div>
            <span className="text-sm font-medium text-foreground mb-2 block">Firmenlogo</span>
            {companyLogo ? (
              <div className="flex items-center gap-4">
                <img src={companyLogo} alt="Firmenlogo" className="h-14 w-auto object-contain rounded-lg border border-border/30 bg-white p-1" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={!isPaidPlan(plan)}>
                    Ändern
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRemoveLogo} disabled={!isPaidPlan(plan)} className="text-destructive hover:bg-destructive/10">
                    <X size={14} className="mr-1" aria-hidden="true" /> Entfernen
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => logoInputRef.current?.click()} className="w-full h-20 border-dashed flex flex-col items-center gap-1" disabled={!isPaidPlan(plan)}>
                <ImagePlus size={20} className="text-muted-foreground" aria-hidden="true" />
                <span className="text-xs text-muted-foreground">Logo hochladen (max. 500 KB)</span>
              </Button>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
            <p className="text-xs text-muted-foreground mt-1.5 ml-1">Wird im PDF-Briefkopf neben dem Firmennamen angezeigt.</p>
          </div>
          <FormField id="pdf-header" label="Kopfzeile (optional)">
            <Input
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="z.B. Angebots-Nr., Datum, Adresse"
              disabled={!isPaidPlan(plan)}
              className="bg-background border-border/50 h-12"
            />
          </FormField>
          <FormField id="pdf-footer" label="Fußzeile (optional)">
            <Input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Bankverbindung, HRB, etc."
              disabled={!isPaidPlan(plan)}
              className="bg-background border-border/50 h-12"
            />
          </FormField>
          <Button onClick={onSave} className="w-full" disabled={!isPaidPlan(plan) || isSaving}>
            <Save size={18} className="mr-2" /> PDF-Einstellungen speichern
          </Button>
        </div>

        {!isPaidPlan(plan) && (
          <ProLock
            title="PDF-Dokumente anpassen"
            description="Gestalten Sie Kopf- und Fußzeilen Ihrer Angebots-PDFs individuell."
            onUpgrade={onUpgrade}
          />
        )}
      </div>
    </section>
  );
}
