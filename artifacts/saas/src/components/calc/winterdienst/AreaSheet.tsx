import * as React from "react";
import { ChevronDown, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { ResponsiveSheet, ResponsiveSheetCancel, ResponsiveSheetFooterRow } from "@/components/ui/responsive-sheet";
import { NativeSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WD_GEHWEG_DEFAULT_WIDTH_M } from "@/data/winterdienst";
import { effectiveMethod } from "@/lib/service-modules/winterdienst";
import type { ClearingMethod, SpreadMaterial, WinterArea, WinterAreaType, WinterdienstConfig } from "@/lib/service-modules/types";
import { cn } from "@/lib/utils";
import {
  AREA_TYPE_ORDER,
  MATERIAL_LABELS,
  MATERIAL_ORDER,
  WD_LIMITS,
  areaTypeDef,
  areaTypeLabel,
  changeAreaMethod,
  changeAreaType,
  formatCount,
  lengthTimesWidth,
  setOptional,
} from "./winterdienst-ui";

export interface AreaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Zu bearbeitende Fläche (neue Flächen mit `createWinterArea(uuidv4(), type)` anlegen). */
  area: WinterArea | null;
  /** true = neue Fläche (zeigt „Speichern & nächste Fläche“). */
  isNew: boolean;
  /** Für den Standard-Streugut-Hinweis. */
  config: Pick<WinterdienstConfig, "material">;
  /** `next`: danach direkt eine neue Fläche erfassen. */
  onSave: (area: WinterArea, opts: { next: boolean }) => void;
}

interface Errors {
  areaM2?: string;
  work?: string;
}

/** Flächen-Editor (ResponsiveSheet md): Typ, Bezeichnung, m² (mit Länge × Breite), Methode, Räumen/Streuen, Streugut, Leistungswerte. */
export function AreaSheet({ open, onOpenChange, area, isNew, config, onSave }: AreaSheetProps) {
  const uid = React.useId();
  const [draft, setDraft] = React.useState<WinterArea | null>(area);
  const [initialJson, setInitialJson] = React.useState(() => JSON.stringify(area));
  const [errors, setErrors] = React.useState<Errors>({});
  const [helperOpen, setHelperOpen] = React.useState(false);
  const [length, setLength] = React.useState<number | undefined>(undefined);
  const [width, setWidth] = React.useState<number | undefined>(undefined);
  const areaInputRef = React.useRef<HTMLInputElement>(null);

  // Neuer Datensatz → lokalen Entwurf zurücksetzen.
  React.useEffect(() => {
    if (!open) return;
    setDraft(area);
    setInitialJson(JSON.stringify(area));
    setErrors({});
    setHelperOpen(false);
    setLength(undefined);
    setWidth(area?.type === "gehweg" ? WD_GEHWEG_DEFAULT_WIDTH_M : undefined);
  }, [open, area]);

  if (!draft) {
    return (
      <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Fläche">
        {null}
      </ResponsiveSheet>
    );
  }

  const def = areaTypeDef(draft.type);
  const method = effectiveMethod(draft);
  const dirty = JSON.stringify(draft) !== initialJson;

  const update = (next: WinterArea) => {
    setDraft(next);
    if (errors.areaM2 && next.areaM2 > 0) setErrors((e) => ({ ...e, areaM2: undefined }));
    if (errors.work && (next.clear || next.spread)) setErrors((e) => ({ ...e, work: undefined }));
  };

  const applyHelper = (l: number | undefined, w: number | undefined) => {
    setLength(l);
    setWidth(w);
    const m2 = lengthTimesWidth(l, w);
    if (m2 !== undefined) update({ ...draft, areaM2: Math.min(m2, WD_LIMITS.areaM2.max) });
  };

  const handleType = (type: string) => {
    if (!type || type === draft.type) return;
    const next = changeAreaType(draft, type as WinterAreaType);
    update(next);
    if (type === "gehweg" && width === undefined) setWidth(WD_GEHWEG_DEFAULT_WIDTH_M);
  };

  const submit = (next: boolean) => {
    const e: Errors = {};
    if (!(draft.areaM2 > 0)) e.areaM2 = "Bitte geben Sie die Fläche in m² ein.";
    if (!draft.clear && !draft.spread) e.work = "Bitte wählen Sie Räumen und/oder Streuen.";
    setErrors(e);
    if (e.areaM2) {
      // Feld und Meldung mittig zeigen — sonst liegt die Meldung unter der Fußleiste.
      areaInputRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        (document.getElementById(`${uid}-m2-error`) ?? areaInputRef.current)?.scrollIntoView({ block: "center" });
      });
      return;
    }
    if (e.work) return;
    const label = draft.label.trim() || def.label;
    onSave({ ...draft, label }, { next });
  };

  const perfPlaceholder = (kind: "clearingPerfM2h" | "spreadingPerfM2h") =>
    `Richtwert ${formatCount(def[kind][method], 0)} m²/h`;

  const footer = (
    <>
      <ResponsiveSheetFooterRow>
        <ResponsiveSheetCancel />
        {isNew && (
          <Button type="button" variant="secondary" onClick={() => submit(true)}>
            Speichern & nächste<span className="hidden sm:inline"> Fläche</span>
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
      title={isNew ? "Fläche hinzufügen" : "Fläche bearbeiten"}
      description="Leistungswerte sind Richtwerte und können überschrieben werden."
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
        <fieldset className="min-w-0">
          <legend className="mb-2 text-label text-muted-foreground">Flächentyp</legend>
          <ToggleGroup type="single" variant="chip" value={draft.type} onValueChange={handleType}>
            {AREA_TYPE_ORDER.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {areaTypeLabel(t)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="mt-2 text-xs text-muted-foreground">{def.hint}</p>
        </fieldset>

        <FormField id={`${uid}-label`} label="Bezeichnung">
          <Input
            value={draft.label}
            placeholder={def.label}
            maxLength={120}
            onChange={(e) => update({ ...draft, label: e.target.value })}
          />
        </FormField>

        <div className="space-y-2">
          <FormField id={`${uid}-m2`} label="Fläche" required error={errors.areaM2}>
            <NumberInput
              ref={areaInputRef}
              value={draft.areaM2 > 0 ? draft.areaM2 : undefined}
              onValueChange={(v) => update({ ...draft, areaM2: v ?? 0 })}
              decimals={2}
              min={WD_LIMITS.areaM2.min}
              max={WD_LIMITS.areaM2.max}
              unit="m²"
              placeholder="0"
            />
          </FormField>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={helperOpen}
            aria-controls={`${uid}-helper`}
            onClick={() => setHelperOpen((o) => !o)}
          >
            <Ruler aria-hidden="true" />
            Länge × Breite
          </Button>
          {helperOpen && (
            <div id={`${uid}-helper`} className="grid grid-cols-2 gap-3 rounded-md bg-surface-sunken p-3">
              <FormField id={`${uid}-len`} label="Länge">
                <NumberInput value={length} onValueChange={(v) => applyHelper(v, width)} decimals={2} min={0} unit="lfm" />
              </FormField>
              <FormField
                id={`${uid}-wid`}
                label="Breite"
                hint={draft.type === "gehweg" ? `Richtwert Gehweg ${formatCount(WD_GEHWEG_DEFAULT_WIDTH_M, 2)} m` : undefined}
              >
                <NumberInput value={width} onValueChange={(v) => applyHelper(length, v)} decimals={2} min={0} unit="m" />
              </FormField>
            </div>
          )}
        </div>

        <fieldset className="min-w-0">
          <legend className="mb-2 text-label text-muted-foreground">Methode</legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={method}
            onValueChange={(m) => m && update(changeAreaMethod(draft, m as ClearingMethod))}
            className="justify-start"
            aria-describedby={!def.machineAllowed ? `${uid}-method-hint` : undefined}
          >
            <ToggleGroupItem value="manuell" className="px-4">
              manuell
            </ToggleGroupItem>
            <ToggleGroupItem value="maschinell" className="px-4" disabled={!def.machineAllowed}>
              maschinell
            </ToggleGroupItem>
          </ToggleGroup>
          {!def.machineAllowed && (
            <p id={`${uid}-method-hint`} className="mt-2 text-xs text-muted-foreground">
              Treppen werden immer manuell geräumt.
            </p>
          )}
        </fieldset>

        <fieldset className="min-w-0 space-y-3" aria-describedby={errors.work ? `${uid}-work-error` : undefined}>
          <legend className="mb-2 text-label text-muted-foreground">Leistung</legend>
          <SwitchRow
            id={`${uid}-clear`}
            label="Räumen"
            description="Schnee räumen – nur bei Einsätzen mit Schneefall (Räumanteil)."
            checked={draft.clear}
            onCheckedChange={(clear) => update({ ...draft, clear })}
          />
          <SwitchRow
            id={`${uid}-spread`}
            label="Streuen"
            description="Glätte bekämpfen – bei jedem Einsatz."
            checked={draft.spread}
            onCheckedChange={(spread) => update({ ...draft, spread })}
          />
          {errors.work && (
            <p id={`${uid}-work-error`} role="alert" className="text-xs font-medium text-destructive">
              {errors.work}
            </p>
          )}
        </fieldset>

        <FormField id={`${uid}-material`} label="Streugut" hint={!draft.spread ? "Ohne Streuen wird kein Streugut berechnet." : undefined}>
          <NativeSelect
            value={draft.material ?? ""}
            disabled={!draft.spread}
            onChange={(e) => {
              const v = e.target.value as SpreadMaterial | "";
              const next = { ...draft };
              if (v) next.material = v;
              else delete next.material;
              update(next);
            }}
          >
            <option value="">Standard des Objekts ({MATERIAL_LABELS[config.material]})</option>
            {MATERIAL_ORDER.map((m) => (
              <option key={m} value={m}>
                {MATERIAL_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="group -ml-2">
              <ChevronDown aria-hidden="true" className="transition-transform group-data-[state=open]:rotate-180" />
              Erweitert: Leistungswerte
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
            <FormField id={`${uid}-perf-clear`} label="Räumleistung" hint="Leer lassen für den Richtwert.">
              <NumberInput
                value={draft.clearingPerfM2h}
                onValueChange={(v) => update(setOptional(draft, "clearingPerfM2h", v, { positive: true }))}
                decimals={0}
                max={WD_LIMITS.perfM2h.max}
                unit="m²/h"
                placeholder={perfPlaceholder("clearingPerfM2h")}
              />
            </FormField>
            <FormField id={`${uid}-perf-spread`} label="Streuleistung" hint="Leer lassen für den Richtwert.">
              <NumberInput
                value={draft.spreadingPerfM2h}
                onValueChange={(v) => update(setOptional(draft, "spreadingPerfM2h", v, { positive: true }))}
                decimals={0}
                max={WD_LIMITS.perfM2h.max}
                unit="m²/h"
                placeholder={perfPlaceholder("spreadingPerfM2h")}
              />
            </FormField>
          </CollapsibleContent>
        </Collapsible>
        {/* Enter in einem Feld speichert */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Speichern
        </button>
      </form>
    </ResponsiveSheet>
  );
}

interface SwitchRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Schalter mit Label und Beschreibung (ganze Zeile klickbar über das Label). */
export function SwitchRow({ id, label, description, checked, onCheckedChange, disabled, className }: SwitchRowProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-0.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="mt-0.5"
      />
    </div>
  );
}
