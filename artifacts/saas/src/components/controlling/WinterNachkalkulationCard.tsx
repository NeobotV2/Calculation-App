import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Plus, Snowflake, Trash2 } from "lucide-react";
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
import { compareWinterNachkalkulation } from "@/lib/service-modules/nachkalkulation";
import type { ServiceActuals, WinterdienstActual, WinterdienstResult } from "@/lib/service-modules/types";
import { marginTone, verdictLabel, verdictTone } from "@/lib/status";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { useStore, type Project } from "@/store/use-store";
import {
  defaultWinterSeasonLabel,
  formatCount,
  latestWinterActual,
  sortWinterActuals,
} from "@/components/calc/winterdienst/winterdienst-ui";

export interface WinterNachkalkulationCardProps {
  project: Project;
  /** Aktueller Plan (`calcWinterdienst`), gegen den die jüngste Saison verglichen wird. */
  result: WinterdienstResult;
  readOnly?: boolean;
  /** Ziel-Marge auf den Umsatz in %; Standard: aus den Einstellungen. */
  targetMarginPct?: number;
  titleAs?: "h2" | "h3";
  className?: string;
}

const signedPct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), 1)} %`;

/** Ohne leere Listen; ganz leer ⇒ undefined (Spalte service_actuals = NULL). */
export function compactActuals(a: ServiceActuals): ServiceActuals | undefined {
  const next: ServiceActuals = {};
  if (a.winterdienst && a.winterdienst.length > 0) next.winterdienst = a.winterdienst;
  if (a.hms && a.hms.length > 0) next.hms = a.hms;
  return next.winterdienst || next.hms ? next : undefined;
}

interface FormState {
  season: string;
  einsaetze: number | undefined;
  laborHours: number | undefined;
  materialKg: number | undefined;
  note: string;
}

const emptyForm = (): FormState => ({
  season: defaultWinterSeasonLabel(),
  einsaetze: undefined,
  laborHours: undefined,
  materialKg: undefined,
  note: "",
});

/**
 * Nachkalkulation Winterdienst je Saison: Ist-Einsätze, -Stunden und -Streugut
 * erfassen (`serviceActuals.winterdienst`) und die jüngste Saison mit dem
 * aktuellen Plan vergleichen (Überleitung Wetter / Produktivität / Material).
 */
export function WinterNachkalkulationCard({
  project,
  result,
  readOnly = false,
  targetMarginPct,
  titleAs = "h2",
  className,
}: WinterNachkalkulationCardProps) {
  const uid = React.useId();
  const actions = useStoreActions();
  const markup = useStore((s) => s.targetMargin);
  const target = targetMarginPct ?? markupToRevenueMargin(markup);

  const entries = project.serviceActuals?.winterdienst ?? [];
  const latest = latestWinterActual(entries);
  const history = sortWinterActuals(entries);
  const cmp = latest ? compareWinterNachkalkulation(result, latest) : null;

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [errors, setErrors] = React.useState<{ season?: string; einsaetze?: string }>({});
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
    const e: { season?: string; einsaetze?: string } = {};
    if (!form.season.trim()) e.season = "Bitte geben Sie die Saison an, z. B. 2025/26.";
    if (form.einsaetze === undefined || form.einsaetze < 0) e.einsaetze = "Bitte geben Sie die Ist-Einsätze ein.";
    setErrors(e);
    if (e.season || e.einsaetze) {
      document.getElementById(e.season ? `${uid}-season` : `${uid}-einsaetze`)?.focus();
      return;
    }
    const entry: WinterdienstActual = {
      id: uuidv4(),
      season: form.season.trim(),
      einsaetze: form.einsaetze as number,
      ...(form.laborHours !== undefined ? { laborHours: form.laborHours } : {}),
      ...(form.materialKg !== undefined ? { materialKg: form.materialKg } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
      recordedAt: new Date().toISOString(),
    };
    const prev = project.serviceActuals;
    setSaving(true);
    setSaveError(null);
    try {
      await persist({ ...prev, winterdienst: [...(prev?.winterdienst ?? []), entry] });
      setEditing(false);
      toast.success("Nachkalkulation Winterdienst gespeichert");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const prev = project.serviceActuals ?? {};
    try {
      await persist(compactActuals({ ...prev, winterdienst: (prev.winterdienst ?? []).filter((a) => a.id !== id) }));
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
            <Snowflake aria-hidden="true" className="size-4 shrink-0 text-module-winter" />
            Nachkalkulation Winterdienst
          </span>
        }
        description="Ist-Werte je Saison gegen den aktuellen Plan. Einsatzabweichungen sind Wetter, keine Kalkulationsfehler."
        action={
          !readOnly && !editing ? (
            <Button type="button" variant="secondary" size="sm" onClick={start}>
              <Plus aria-hidden="true" />
              Saison erfassen
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
              <FormField id={`${uid}-season`} label="Saison" required error={errors.season} hint="z. B. 2025/26">
                <Input value={form.season} onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} maxLength={20} />
              </FormField>
              <FormField
                id={`${uid}-einsaetze`}
                label="Ist-Einsätze"
                required
                error={errors.einsaetze}
                hint={`Plan: ${formatCount(result.einsaetze)} Einsätze`}
              >
                <NumberInput
                  value={form.einsaetze}
                  onValueChange={(v) => setForm((f) => ({ ...f, einsaetze: v }))}
                  decimals={0}
                  min={0}
                  max={365}
                  unit="Einsätze"
                />
              </FormField>
              <FormField
                id={`${uid}-hours`}
                label="Ist-Arbeitsstunden (optional)"
                hint={`Einsatzstunden ohne Saisonvorbereitung · Plan ${formatNumber(result.perEinsatz.laborHours, 2)} h je Einsatz`}
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
              <FormField
                id={`${uid}-kg`}
                label="Ist-Streugut (optional)"
                hint={`Plan ${formatNumber(result.perEinsatz.materialKg, 1)} kg je Einsatz`}
              >
                <NumberInput
                  value={form.materialKg}
                  onValueChange={(v) => setForm((f) => ({ ...f, materialKg: v }))}
                  decimals={0}
                  min={0}
                  max={10_000_000}
                  unit="kg"
                />
              </FormField>
              <FormField id={`${uid}-note`} label="Notiz (optional)" className="sm:col-span-2">
                <Input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="z. B. strenger Februar, zwei Kolonnen im Einsatz"
                />
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
            Noch keine Saison erfasst. Tragen Sie nach dem Winter die tatsächlichen Einsätze aus Ihren Räum- und
            Streuprotokollen ein.
          </p>
        )}

        {cmp && latest && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Saison <span className="font-medium text-foreground">{latest.season}</span> · erfasst am{" "}
                {formatDate(latest.recordedAt)}
              </p>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                Leistung je Einsatz
                <StatusBadge tone={verdictTone(cmp.verdict)} label={verdictLabel(cmp.verdict)} />
              </span>
            </div>

            <KpiGroup columns={3}>
              <Kpi
                label="Einsätze Plan → Ist"
                value={`${formatCount(cmp.plannedEinsaetze)} → ${formatCount(cmp.actualEinsaetze)}`}
                hint={`${signedPct(cmp.einsaetzeDeviationPct)} (Wetter)`}
              />
              <Kpi
                label="h je Einsatz Plan → Ist"
                value={`${formatNumber(cmp.plannedHoursPerEinsatz, 2)} → ${formatNumber(cmp.actualHoursPerEinsatz, 2)} h`}
                hint={`${signedPct(cmp.productivityDeviationPct)} (Produktivität)`}
              />
              <Kpi
                label="Marge Ist"
                value={<StatusBadge tone={marginTone(cmp.actualMarginPct, target)} label={`${formatNumber(cmp.actualMarginPct, 1)} %`} />}
                hint={`Plan ${formatNumber(result.marginPct, 1)} %`}
              />
              <Kpi
                label="Erlös Ist"
                value={<Money value={cmp.revenueActual} size="kpi" period="season" />}
                hint={<>Plan <Money value={result.revenue.total} size="sm" /></>}
              />
              <Kpi
                label="Kosten Ist"
                value={<Money value={cmp.costActual} size="kpi" period="season" />}
                hint={<>Plan <Money value={result.cost.total} size="sm" /></>}
              />
              <Kpi
                label="Deckungsbeitrag Ist"
                value={
                  <Money value={cmp.contributionActual} size="kpi" signed tone={cmp.contributionActual < 0 ? "critical" : undefined} />
                }
                hint={<>Plan <Money value={cmp.contributionPlanned} size="sm" signed /></>}
              />
            </KpiGroup>

            <div className="space-y-2">
              <h3 className="text-label text-muted-foreground">Überleitung Deckungsbeitrag</h3>
              <dl className="divide-y divide-border rounded-lg border border-border text-sm">
                <BridgeRow label="Deckungsbeitrag Plan" value={cmp.contributionPlanned} />
                <BridgeRow label="Wetter (Einsätze)" value={cmp.bridge.weather} signed />
                <BridgeRow label="Produktivität (Stunden je Einsatz)" value={cmp.bridge.productivity} signed />
                <BridgeRow label="Material (Streugut)" value={cmp.bridge.material} signed />
                <BridgeRow label="Deckungsbeitrag Ist" value={cmp.contributionActual} signed strong />
              </dl>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-label text-muted-foreground">Erfasste Saisons</h3>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {history.map((a) => (
                <ListRow
                  key={a.id}
                  as="li"
                  title={
                    <>
                      Saison {a.season}
                      {a.id === latest?.id && (
                        <Badge tone="brand" size="sm" className="ml-2 align-middle">
                          im Vergleich
                        </Badge>
                      )}
                    </>
                  }
                  meta={[
                    `${formatCount(a.einsaetze)} Einsätze`,
                    a.laborHours !== undefined ? `${formatNumber(a.laborHours, 1)} h` : null,
                    a.materialKg !== undefined ? `${formatCount(a.materialKg, 0)} kg` : null,
                    `erfasst am ${formatDate(a.recordedAt)}`,
                    a.note ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={
                    readOnly ? undefined : (
                      <IconButton
                        label={`Eintrag Saison ${a.season} löschen`}
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
        description={`Die Ist-Werte der Saison ${removeEntry?.season ?? ""} werden gelöscht.`}
        confirmLabel="Löschen"
        destructive
      />
    </Card>
  );
}

function BridgeRow({ label, value, signed = false, strong = false }: { label: string; value: number; signed?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-3 py-2", strong && "bg-surface-sunken font-semibold")}>
      <dt className={cn(strong ? "text-foreground" : "text-muted-foreground")}>{label}</dt>
      <dd>
        <Money value={value} signed={signed} tone={value < 0 ? "critical" : undefined} />
      </dd>
    </div>
  );
}
