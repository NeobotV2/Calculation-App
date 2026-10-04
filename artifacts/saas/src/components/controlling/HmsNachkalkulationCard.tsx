import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Plus, Trash2, Wrench } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { NumberInput } from "@/components/ui/number-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStoreActions } from "@/hooks/use-store-actions";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { compareHmsNachkalkulation } from "@/lib/service-modules/nachkalkulation";
import type { HmsActual, HmsResult, ServiceActuals } from "@/lib/service-modules/types";
import { marginTone, nachkalkulationBadge } from "@/lib/status";
import { formatDate, formatNumber } from "@/lib/utils";
import { useStore, type Project } from "@/store/use-store";
import { defaultHmsYear, latestHmsActual, sortHmsActuals } from "@/components/calc/hms/hms-ui";
import { compactActuals } from "./WinterNachkalkulationCard";

export interface HmsNachkalkulationCardProps {
  project: Project;
  /** Aktueller Plan (`calcHms`), gegen den das jüngste Jahr verglichen wird. */
  result: HmsResult;
  readOnly?: boolean;
  /** Ziel-Marge auf den Umsatz in %; Standard: aus den Einstellungen. */
  targetMarginPct?: number;
  titleAs?: "h2" | "h3";
  className?: string;
}

const signedPct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), 1)} %`;

interface FormState {
  year: number | undefined;
  laborHours: number | undefined;
  contingentHoursUsed: number | undefined;
  note: string;
}

const emptyForm = (): FormState => ({ year: defaultHmsYear(), laborHours: undefined, contingentHoursUsed: undefined, note: "" });

/**
 * Nachkalkulation Hausmeisterservice je Jahr: Ist-Stunden (inkl. Anfahrt) und
 * abgerufenes Kontingent erfassen (`serviceActuals.hms`) und das jüngste Jahr
 * mit dem aktuellen Plan vergleichen.
 */
export function HmsNachkalkulationCard({
  project,
  result,
  readOnly = false,
  targetMarginPct,
  titleAs = "h2",
  className,
}: HmsNachkalkulationCardProps) {
  const uid = React.useId();
  const actions = useStoreActions();
  const markup = useStore((s) => s.targetMargin);
  const target = targetMarginPct ?? markupToRevenueMargin(markup);
  const overageBilled = project.hms?.contingentOverageBilled ?? false;
  const hasContingent = result.contingentHoursAnnual > 0;

  const entries = project.serviceActuals?.hms ?? [];
  const latest = latestHmsActual(entries);
  const history = sortHmsActuals(entries);
  const cmp = latest ? compareHmsNachkalkulation(result, latest, overageBilled) : null;

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [errors, setErrors] = React.useState<{ year?: string; laborHours?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const start = () => {
    setForm(emptyForm());
    setErrors({});
    setSaveError(null);
    setEditing(true);
  };

  const persist = async (next: ServiceActuals | undefined) => {
    await actions.updateProject(project.id, { serviceActuals: next });
  };

  const save = async () => {
    const e: { year?: string; laborHours?: string } = {};
    if (form.year === undefined || !Number.isInteger(form.year)) e.year = "Bitte geben Sie das Jahr an.";
    if (form.laborHours === undefined || form.laborHours < 0) e.laborHours = "Bitte geben Sie die Ist-Stunden des Jahres ein.";
    setErrors(e);
    if (e.year || e.laborHours) {
      document.getElementById(e.year ? `${uid}-year` : `${uid}-hours`)?.focus();
      return;
    }
    const entry: HmsActual = {
      id: uuidv4(),
      year: form.year as number,
      laborHours: form.laborHours as number,
      ...(form.contingentHoursUsed !== undefined ? { contingentHoursUsed: form.contingentHoursUsed } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
      recordedAt: new Date().toISOString(),
    };
    const prev = project.serviceActuals;
    setSaving(true);
    setSaveError(null);
    try {
      await persist({ ...prev, hms: [...(prev?.hms ?? []), entry] });
      setEditing(false);
      toast.success("Nachkalkulation Hausmeisterservice gespeichert");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const prev = project.serviceActuals ?? {};
    try {
      await persist(compactActuals({ ...prev, hms: (prev.hms ?? []).filter((a) => a.id !== id) }));
      toast.success("Eintrag gelöscht");
    } catch (err) {
      toast.error(`Löschen fehlgeschlagen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
    }
  };

  const removeEntry = history.find((a) => a.id === removeId);

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        titleAs={titleAs}
        title={
          <span id={`${uid}-title`} className="flex items-center gap-2">
            <Wrench aria-hidden="true" className="size-4 shrink-0 text-module-hms" />
            Nachkalkulation Hausmeisterservice
          </span>
        }
        description="Ist-Stunden je Jahr (inkl. Anfahrt) gegen den aktuellen Plan."
        action={
          !readOnly && !editing ? (
            <Button type="button" variant="secondary" size="sm" onClick={start}>
              <Plus aria-hidden="true" />
              Jahr erfassen
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-5">
        {editing && (
          <form
            className="space-y-4 rounded-lg bg-surface-sunken p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${uid}-year`} label="Jahr" required error={errors.year}>
                <NumberInput
                  value={form.year}
                  onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}
                  decimals={0}
                  min={2000}
                  max={2100}
                  align="start"
                />
              </FormField>
              <FormField
                id={`${uid}-hours`}
                label="Ist-Stunden"
                required
                error={errors.laborHours}
                hint={`Inkl. Anfahrt · Plan ${formatNumber(result.laborHoursAnnual, 1)} h je Jahr`}
              >
                <NumberInput
                  value={form.laborHours}
                  onValueChange={(v) => setForm((f) => ({ ...f, laborHours: v }))}
                  decimals={1}
                  min={0}
                  max={100_000}
                  unit="h"
                />
              </FormField>
              {hasContingent && (
                <FormField
                  id={`${uid}-contingent`}
                  label="Kontingent abgerufen (optional)"
                  hint={`Plan ${formatNumber(result.contingentHoursAnnual, 1)} Std. je Jahr`}
                >
                  <NumberInput
                    value={form.contingentHoursUsed}
                    onValueChange={(v) => setForm((f) => ({ ...f, contingentHoursUsed: v }))}
                    decimals={1}
                    min={0}
                    max={100_000}
                    unit="Std."
                  />
                </FormField>
              )}
              <FormField id={`${uid}-note`} label="Notiz (optional)" className={hasContingent ? undefined : "sm:col-span-2"}>
                <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </FormField>
            </div>
            {saveError && (
              <Callout
                tone="critical"
                live
                title={`Speichern fehlgeschlagen: ${saveError}`}
                action={
                  <Button type="button" size="sm" variant="secondary" onClick={() => void save()}>
                    Erneut versuchen
                  </Button>
                }
              />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Abbrechen
              </Button>
              <Button type="submit" loading={saving}>
                Speichern
              </Button>
            </div>
          </form>
        )}

        {!cmp && !editing && (
          <p className="text-sm text-muted-foreground">
            Noch kein Jahr erfasst. Tragen Sie nach Jahresende die tatsächlich geleisteten Stunden ein.
          </p>
        )}

        {cmp && latest && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Jahr <span className="font-medium text-foreground">{latest.year}</span> · erfasst am {formatDate(latest.recordedAt)}
              </p>
              <StatusBadge tone={nachkalkulationBadge(cmp).tone} label={nachkalkulationBadge(cmp).label} />
            </div>
            <KpiGroup columns={3}>
              <Kpi
                label="Stunden Plan → Ist"
                value={`${formatNumber(result.laborHoursAnnual, 1)} → ${formatNumber(latest.laborHours, 1)} h`}
                hint={`${signedPct(cmp.hoursDeviationPct)} Abweichung`}
              />
              <Kpi
                label="Mehrstunden Kontingent"
                value={`${formatNumber(cmp.overageHours, 1)} h`}
                hint={hasContingent ? (overageBilled ? "werden berechnet" : "werden nicht berechnet") : "kein Kontingent"}
              />
              <Kpi
                label="Marge Ist"
                value={<StatusBadge tone={marginTone(cmp.actualMarginPct, target)} label={`${formatNumber(cmp.actualMarginPct, 1)} %`} />}
                hint={`Plan ${formatNumber(result.marginPct, 1)} %`}
              />
              <Kpi
                label="Erlös Ist"
                value={<Money value={cmp.revenueActual} size="kpi" period="year" />}
                hint={<>Plan <Money value={result.revenueAnnual} size="sm" /></>}
              />
              <Kpi
                label="Kosten Ist"
                value={<Money value={cmp.costActual} size="kpi" period="year" />}
                hint={<>Plan <Money value={result.costAnnual} size="sm" /></>}
              />
              <Kpi
                label="Deckungsbeitrag Ist"
                value={
                  <Money value={cmp.contributionActual} size="kpi" signed tone={cmp.contributionActual < 0 ? "critical" : undefined} />
                }
                hint={<>Plan <Money value={result.contributionAnnual} size="sm" signed /></>}
              />
            </KpiGroup>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-label text-muted-foreground">Erfasste Jahre</h3>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {history.map((a) => (
                <ListRow
                  key={a.id}
                  as="li"
                  title={
                    <>
                      Jahr {a.year}
                      {a.id === latest?.id && (
                        <Badge tone="brand" size="sm" className="ml-2 align-middle">
                          im Vergleich
                        </Badge>
                      )}
                    </>
                  }
                  meta={[
                    `${formatNumber(a.laborHours, 1)} h`,
                    a.contingentHoursUsed !== undefined ? `Kontingent ${formatNumber(a.contingentHoursUsed, 1)} Std.` : null,
                    `erfasst am ${formatDate(a.recordedAt)}`,
                    a.note ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={
                    readOnly ? undefined : (
                      <IconButton
                        label={`Eintrag ${a.year} löschen`}
                        icon={Trash2}
                        variant="destructive-ghost"
                        size="sm"
                        tooltip={false}
                        onClick={() => setRemoveId(a.id)}
                      />
                    )
                  }
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removeId !== null}
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeId) void remove(removeId);
          setRemoveId(null);
        }}
        title="Eintrag löschen?"
        description={`Die Ist-Werte des Jahres ${removeEntry?.year ?? ""} werden gelöscht.`}
        confirmLabel="Löschen"
        destructive
      />
    </Card>
  );
}
