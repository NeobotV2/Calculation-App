import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import type { SettingsForm } from "./use-settings-form";

interface CompanyDataSectionProps {
  form: Pick<SettingsForm, "values" | "setField" | "errors">;
}

/** Firmenstammdaten und steuerliche Angaben (Teil von „Firma & Angebot"). */
export function CompanyDataSection({ form }: CompanyDataSectionProps) {
  const { values, setField, errors } = form;
  return (
    <>
      <Card as="section" aria-labelledby="settings-company-title">
        <CardHeader
          title={<span id="settings-company-title">Firmendaten</span>}
          description="Erscheinen im Briefkopf und in der Fußzeile Ihrer Angebote."
        />
        <div className="space-y-4">
          <FormField id="company-name" label="Firmenname">
            <Input
              value={values.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              autoComplete="organization"
            />
          </FormField>
          <FormField id="company-street" label="Straße und Hausnummer">
            <Input
              value={values.companyStreet}
              onChange={(e) => setField("companyStreet", e.target.value)}
              autoComplete="street-address"
            />
          </FormField>
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3">
            <FormField id="company-zip" label="PLZ">
              <Input
                value={values.companyZip}
                onChange={(e) => setField("companyZip", e.target.value)}
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </FormField>
            <FormField id="company-city" label="Ort">
              <Input
                value={values.companyCity}
                onChange={(e) => setField("companyCity", e.target.value)}
                autoComplete="address-level2"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="company-phone" label="Telefon">
              <Input
                type="tel"
                value={values.companyPhone}
                onChange={(e) => setField("companyPhone", e.target.value)}
                placeholder="z. B. +49 30 123456"
                autoComplete="tel"
              />
            </FormField>
            <FormField id="company-email" label="E-Mail">
              <Input
                type="email"
                value={values.companyEmail}
                onChange={(e) => setField("companyEmail", e.target.value)}
                placeholder="info@firma.de"
                autoComplete="email"
              />
            </FormField>
          </div>
          <FormField id="company-director" label="Geschäftsführung">
            <Input
              value={values.companyManagingDirector}
              onChange={(e) => setField("companyManagingDirector", e.target.value)}
              placeholder="Vor- und Nachname"
              autoComplete="name"
            />
          </FormField>
        </div>
      </Card>

      <Card as="section" aria-labelledby="settings-tax-title">
        <CardHeader title={<span id="settings-tax-title">Steuerliche Angaben</span>} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="company-tax-number" label="Steuernummer">
            <Input value={values.companyTaxNumber} onChange={(e) => setField("companyTaxNumber", e.target.value)} />
          </FormField>
          <FormField id="company-vat-id" label="USt-IdNr.">
            <Input
              value={values.companyVatId}
              onChange={(e) => setField("companyVatId", e.target.value)}
              placeholder="z. B. DE123456789"
            />
          </FormField>
          <FormField
            id="setting-vat"
            label="MwSt.-Satz"
            hint="Wird im Angebot ausgewiesen. 0 = ohne MwSt."
            error={errors.vatRate}
            className="sm:col-span-2"
          >
            <NumberInput
              value={values.vatRate}
              onValueChange={(v) => setField("vatRate", v)}
              unit="%"
              decimals={2}
              min={0}
              max={100}
              placeholder="0"
              wrapperClassName="sm:max-w-40"
            />
          </FormField>
        </div>
      </Card>
    </>
  );
}
