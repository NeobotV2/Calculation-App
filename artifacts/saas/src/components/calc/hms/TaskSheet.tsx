import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { ResponsiveSheet, ResponsiveSheetCancel, ResponsiveSheetFooterRow } from "@/components/ui/responsive-sheet";
import { NativeSelect } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HMS_FREQUENCY_PRESETS } from "@/data/frequencies";
import { HMS_UNIT_LABELS } from "@/data/hausmeisterservice";
import type { HmsTask, HmsUnit } from "@/lib/service-modules/types";
import { MonthPicker } from "../MonthPicker";
import { SwitchRow } from "../winterdienst/AreaSheet";
import { setOptional } from "../winterdienst/winterdienst-ui";
import {
  HMS_LIMITS,
  HMS_UNIT_OPTION_LABELS,
  HMS_UNIT_ORDER,
  catalogItemOf,
  formatCount,
  taskCategoryLabel,
  taskQuantityFieldLabel,
  taskTimeFieldLabel,
  validateTaskDraft,
  withTaskSeason,
} from "./hms-ui";

export interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Zu bearbeitende Leistung (neu: `createCustomTask(uuidv4())`). */
  task: HmsTask | null;
  /** true = neue Leistung (zeigt „Speichern & nächste Leistung“). */
  isNew: boolean;
  onSave: (task: HmsTask, opts: { next: boolean }) => void;
}

/** Leistungs-Editor (ResponsiveSheet md): Bezeichnung, Einheit, Menge, Zeitwert, Turnus, Saison, Material, Aktiv. */
export function TaskSheet({ open, onOpenChange, task, isNew, onSave }: TaskSheetProps) {
  const uid = React.useId();
  const [draft, setDraft] = React.useState<HmsTask | null>(task);
  const [initialJson, setInitialJson] = React.useState(() => JSON.stringify(task));
  const [labelError, setLabelError] = React.useState<string | undefined>();
  const [quantityError, setQuantityError] = React.useState<string | undefined>();
  const labelRef = React.useRef<HTMLInputElement>(null);
  const quantityRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(task);
    setInitialJson(JSON.stringify(task));
    setLabelError(undefined);
    setQuantityError(undefined);
  }, [open, task]);

  if (!draft) {
    return (
      <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Leistung">
        {null}
      </ResponsiveSheet>
    );
  }

  const item = catalogItemOf(draft);
  const sameUnitAsCatalog = !!item && item.unit === draft.unit;
  const timeLabel = taskTimeFieldLabel(draft.unit);
  const dirty = JSON.stringify(draft) !== initialJson;
  const isContingent = draft.unit === "kontingent";
  const presetValue = HMS_FREQUENCY_PRESETS.some((p) => p.perYear === draft.frequencyPerYear) ? String(draft.frequencyPerYear) : "";

  const update = (next: HmsTask) => {
    setDraft(next);
    if (labelError && next.label.trim()) setLabelError(undefined);
    if (quantityError && !validateTaskDraft(next).quantity) setQuantityError(undefined);
  };

  const submit = (next: boolean) => {
    const errors = validateTaskDraft(draft);
    setLabelError(errors.label);
    setQuantityError(errors.quantity);
    const target = errors.label ? labelRef.current : errors.quantity ? quantityRef.current : null;
    if (target) {
      target.focus({ preventScroll: true });
      requestAnimationFrame(() => target.scrollIntoView({ block: "center" }));
      return;
    }
    onSave({ ...draft, label: draft.label.trim() }, { next });
  };

  const footer = (
    <>
      <ResponsiveSheetFooterRow>
        <ResponsiveSheetCancel />
        {isNew && (
          <Button type="button" variant="secondary" onClick={() => submit(true)}>
            Speichern & nächste<span className="hidden sm:inline"> Leistung</span>
          </Button>
        )}
      </ResponsiveSheetFooterRow>
      <Button type="button" onClick={() => submit(false)}>
        Speichern
      </Button>
    </>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isNew ? "Leistung hinzufügen" : "Leistung bearbeiten"}
      description={item ? `${taskCategoryLabel(draft)} · Katalogwerte sind Richtwerte.` : "Eigene Leistung mit frei wählbarer Einheit."}
      dirty={dirty}
      footer={footer}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <FormField id={`${uid}-label`} label="Bezeichnung" required error={labelError}>
          <Input
            ref={labelRef}
            value={draft.label}
            maxLength={160}
            placeholder={item?.label ?? "z. B. Fahrradkeller fegen"}
            onChange={(e) => update({ ...draft, label: e.target.value })}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${uid}-unit`} label="Einheit">
            <NativeSelect value={draft.unit} onChange={(e) => update({ ...draft, unit: e.target.value as HmsUnit })}>
              {HMS_UNIT_ORDER.map((u) => (
                <option key={u} value={u}>
                  {HMS_UNIT_OPTION_LABELS[u]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={`${uid}-qty`}
            label={taskQuantityFieldLabel(draft.unit)}
            required={draft.enabled}
            error={quantityError}
            hint={item && sameUnitAsCatalog ? `Richtwert ${formatCount(item.defaultQuantity, 2)} ${item.quantityLabel}` : undefined}
          >
            <NumberInput
              ref={quantityRef}
              value={draft.quantity > 0 ? draft.quantity : undefined}
              onValueChange={(v) => update({ ...draft, quantity: v ?? 0 })}
              decimals={2}
              min={HMS_LIMITS.quantity.min}
              max={HMS_LIMITS.quantity.max}
              unit={HMS_UNIT_LABELS[draft.unit]?.short}
            />
          </FormField>

          {timeLabel && draft.unit === "m2" && (
            <FormField id={`${uid}-perf`} label={timeLabel} hint="Fläche je Stunde einer Kraft.">
              <NumberInput
                value={draft.perfM2h}
                onValueChange={(v) => update(setOptional(draft, "perfM2h", v, { positive: true }))}
                decimals={0}
                max={HMS_LIMITS.perfM2h.max}
                unit="m²/h"
                placeholder={item?.perfM2h ? `Richtwert ${formatCount(item.perfM2h, 0)}` : undefined}
              />
            </FormField>
          )}
          {timeLabel && draft.unit !== "m2" && (
            <FormField id={`${uid}-min`} label={timeLabel}>
              <NumberInput
                value={draft.minutesPerUnit}
                onValueChange={(v) => update(setOptional(draft, "minutesPerUnit", v))}
                decimals={1}
                min={HMS_LIMITS.minutesPerUnit.min}
                max={HMS_LIMITS.minutesPerUnit.max}
                unit="Min."
                placeholder={sameUnitAsCatalog && item?.minutesPerUnit ? `Richtwert ${formatCount(item.minutesPerUnit)}` : undefined}
              />
            </FormField>
          )}
          {isContingent && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Kontingent: Die Menge ist die Stundenzahl je Abrufperiode – ein Zeitwert entfällt.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <FormField
            id={`${uid}-freq`}
            label={isContingent ? "Abrufperioden pro Jahr" : "Turnus"}
            hint={isContingent ? "12 = monatliches Kontingent." : item ? `Richtwert ${formatCount(item.frequencyPerYear)}× pro Jahr` : undefined}
          >
            <NumberInput
              value={draft.frequencyPerYear}
              onValueChange={(v) => update({ ...draft, frequencyPerYear: v ?? 0 })}
              decimals={1}
              min={HMS_LIMITS.frequencyPerYear.min}
              max={HMS_LIMITS.frequencyPerYear.max}
              unit="× pro Jahr"
            />
          </FormField>
          <ToggleGroup
            type="single"
            variant="chip"
            size="sm"
            value={presetValue}
            onValueChange={(v) => v && update({ ...draft, frequencyPerYear: Number(v) })}
            aria-label="Turnus schnell wählen"
          >
            {HMS_FREQUENCY_PRESETS.map((p) => (
              <ToggleGroupItem key={p.perYear} value={String(p.perYear)}>
                {p.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <MonthPicker
          label="Saison"
          allowEmpty
          value={draft.seasonMonths ?? []}
          onChange={(months) => update(withTaskSeason(draft, months))}
          hint="Keine Auswahl = ganzjährig. Die Saison verteilt nur die Stunden; der Preis bleibt Jahreswert / 12."
        />

        <FormField
          id={`${uid}-material`}
          label="Material/Entsorgung"
          hint={item?.materialCostPerYear ? `Einkauf netto je Jahr · Richtwert ${formatCount(item.materialCostPerYear, 2)} €` : "Einkauf netto je Jahr."}
        >
          <NumberInput
            value={draft.materialCostPerYear}
            onValueChange={(v) => update(setOptional(draft, "materialCostPerYear", v))}
            decimals={2}
            min={HMS_LIMITS.materialCostPerYear.min}
            max={HMS_LIMITS.materialCostPerYear.max}
            unit="€/Jahr"
            placeholder="0"
          />
        </FormField>

        <SwitchRow
          id={`${uid}-enabled`}
          label="Aktiv"
          description="Inaktive Leistungen bleiben gespeichert, fließen aber nicht in den Preis ein."
          checked={draft.enabled}
          onCheckedChange={(enabled) => update({ ...draft, enabled })}
        />
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Speichern
        </button>
      </form>
    </ResponsiveSheet>
  );
}
