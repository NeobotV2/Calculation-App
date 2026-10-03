import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { isPaidPlan, type PlanId } from "@/lib/billing-config";
import { ProLock } from "./ProLock";
import type { SettingsForm } from "./use-settings-form";

interface PdfBrandingSectionProps {
  plan: PlanId;
  companyLogo: string;
  /** Logo sofort übernehmen (Datei bereits geprüft vom Aufrufer). */
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  form: Pick<SettingsForm, "values" | "setField">;
}

/** Logo (sofort wirksam) sowie Kopf- und Fußzeile der Angebote (Pro-Plan). */
export function PdfBrandingSection({ plan, companyLogo, onLogoUpload, onRemoveLogo, form }: PdfBrandingSectionProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const paid = isPaidPlan(plan);
  const { values, setField } = form;

  return (
    <Card as="section" aria-labelledby="settings-branding-title">
      <CardHeader
        title={<span id="settings-branding-title">Angebots-Layout</span>}
        description="Ihre Firmendaten stehen automatisch im Briefkopf und in der Fußzeile. Hier ergänzen Sie Logo und Zusatzzeilen."
      />
      {!paid && (
        <div className="mb-4">
          <ProLock
            title="Angebote individuell gestalten"
            description="Mit dem Pro-Plan erscheinen Ihr Logo und eigene Kopf- und Fußzeilen auf allen Angeboten."
          />
        </div>
      )}
      <div className="space-y-4" inert={!paid} aria-disabled={!paid || undefined}>
        <div className="space-y-1.5">
          <p id="settings-logo-label" className="text-label text-muted-foreground">
            Firmenlogo
          </p>
          {companyLogo ? (
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={companyLogo}
                alt="Aktuelles Firmenlogo"
                className="h-14 w-auto rounded-md border border-border bg-surface-sunken object-contain p-1"
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()} disabled={!paid}>
                  Ändern
                </Button>
                <Button type="button" variant="destructive-ghost" size="sm" onClick={onRemoveLogo} disabled={!paid}>
                  <Trash2 aria-hidden="true" />
                  Entfernen
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => logoInputRef.current?.click()}
              disabled={!paid}
              aria-describedby="settings-logo-hint"
              className="h-20 w-full flex-col gap-1 border-dashed"
            >
              <ImagePlus aria-hidden="true" className="size-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Logo hochladen (max. 500 KB)</span>
            </Button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={onLogoUpload}
            className="sr-only"
            tabIndex={-1}
            aria-labelledby="settings-logo-label"
          />
          <p id="settings-logo-hint" className="text-xs text-muted-foreground">
            Wird im Briefkopf neben dem Firmennamen angezeigt und sofort übernommen.
          </p>
        </div>
        <FormField id="pdf-header" label="Kopfzeile (optional)">
          <Input
            value={values.pdfHeader}
            onChange={(e) => setField("pdfHeader", e.target.value)}
            placeholder="z. B. Zertifizierungen oder Slogan"
            disabled={!paid}
          />
        </FormField>
        <FormField id="pdf-footer" label="Fußzeile (optional)">
          <Input
            value={values.pdfFooter}
            onChange={(e) => setField("pdfFooter", e.target.value)}
            placeholder="z. B. Bankverbindung, Handelsregister"
            disabled={!paid}
          />
        </FormField>
      </div>
    </Card>
  );
}
