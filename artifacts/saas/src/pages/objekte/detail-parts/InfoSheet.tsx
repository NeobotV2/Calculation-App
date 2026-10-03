import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OBJECT_TYPES } from "@/data/object-types";
import { formatNumber } from "@/lib/utils";
import type { Project } from "@/store/use-store";

/** Felder der Objektdaten. Leere Texte ("") löschen den Wert, `hourlyRate` undefined = Standardsatz. */
export interface InfoSheetValues {
  name: string;
  customer: string;
  location: string;
  objectType: string;
  /** Ansprechpartner (Project.rpiContactName). */
  contactName: string;
  hourlyRate: number | undefined;
  notes: string;
}

export interface InfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  /** Globaler Verrechnungssatz (Platzhalter/Hinweis für „leer = Standard“). */
  defaultRate: number;
  /** Speichert die Änderungen; Fehler werden im Sheet angezeigt. */
  onSave: (values: InfoSheetValues) => Promise<void>;
}

function valuesFromProject(p: Project): InfoSheetValues {
  return {
    name: p.name ?? "",
    customer: p.customer ?? "",
    location: p.location ?? "",
    objectType: p.objectType ?? "",
    contactName: p.rpiContactName ?? "",
    hourlyRate: p.hourlyRate,
    notes: p.notes ?? "",
  };
}

function normalize(v: InfoSheetValues): InfoSheetValues {
  return {
    name: v.name.trim(),
    customer: v.customer.trim(),
    location: v.location.trim(),
    objectType: v.objectType.trim(),
    contactName: v.contactName.trim(),
    hourlyRate: v.hourlyRate !== undefined && v.hourlyRate > 0 ? v.hourlyRate : undefined,
    notes: v.notes.trim(),
  };
}

const sameValues = (a: InfoSheetValues, b: InfoSheetValues) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

/**
 * Objektdaten bearbeiten (§8.1) auf `ResponsiveSheet` (md): Name, Kunde,
 * Standort, Objektart (Chips), Ansprechpartner, Verrechnungssatz, Notizen.
 * Ungespeicherte Änderungen fragen beim Schließen nach.
 */
export function InfoSheet({ open, onOpenChange, project, defaultRate, onSave }: InfoSheetProps) {
  const ids = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [initial, setInitial] = useState<InfoSheetValues>(() => valuesFromProject(project));
  const [values, setValues] = useState<InfoSheetValues>(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Beim Öffnen frisch aus dem Objekt laden.
  useEffect(() => {
    if (!open) return;
    const v = valuesFromProject(project);
    setInitial(v);
    setValues(v);
    setNameError(null);
    setSaveError(null);
    // Nur beim Öffnen – spätere Sync-Updates überschreiben keine Eingaben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dirty = !sameValues(values, initial);

  // Unbekannte Altwerte (Freitext) bleiben als eigener Chip wählbar.
  const typeOptions = useMemo(() => {
    const current = initial.objectType.trim();
    return current && !OBJECT_TYPES.includes(current) ? [...OBJECT_TYPES, current] : [...OBJECT_TYPES];
  }, [initial.objectType]);

  const set = <K extends keyof InfoSheetValues>(key: K, v: InfoSheetValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const rateText = formatNumber(defaultRate, 2);

  const save = async () => {
    const next = normalize(values);
    if (!next.name) {
      setNameError("Bitte geben Sie einen Objektnamen ein.");
      nameRef.current?.focus();
      return;
    }
    setNameError(null);
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(next);
      onOpenChange(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Die Objektdaten konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
      title="Objektdaten bearbeiten"
      description="Änderungen wirken sofort auf Preis und Angebot."
      size="md"
      dirty={dirty}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button type="submit" form={`${ids}-form`} loading={saving}>
            Speichern
          </Button>
        </>
      }
    >
      <form
        id={`${ids}-form`}
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {saveError && (
          <Callout tone="critical" live title="Speichern fehlgeschlagen">
            {saveError}
          </Callout>
        )}
        <FormField id={`${ids}-name`} label="Objektname" required error={nameError}>
          <Input
            ref={nameRef}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            autoComplete="off"
            placeholder="z. B. Bürogebäude Musterstraße"
          />
        </FormField>
        <FormField id={`${ids}-customer`} label="Kunde">
          <Input
            value={values.customer}
            onChange={(e) => set("customer", e.target.value)}
            autoComplete="organization"
            placeholder="z. B. Muster GmbH"
          />
        </FormField>
        <FormField id={`${ids}-location`} label="Standort">
          <Input
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            autoComplete="street-address"
            placeholder="z. B. Musterstraße 1, 10115 Berlin"
          />
        </FormField>
        <div className="space-y-1.5">
          <p id={`${ids}-type-label`} className="text-label text-muted-foreground">
            Objektart
          </p>
          <ToggleGroup
            type="single"
            variant="chip"
            aria-labelledby={`${ids}-type-label`}
            value={values.objectType}
            onValueChange={(v) => set("objectType", v)}
            className="justify-start"
          >
            {typeOptions.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <FormField id={`${ids}-contact`} label="Ansprechpartner">
          <Input
            value={values.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            autoComplete="name"
            placeholder="z. B. Frau Schmidt"
          />
        </FormField>
        <FormField
          id={`${ids}-rate`}
          label="Verrechnungssatz"
          hint={`Leer = Standardsatz (${rateText} €/h).`}
        >
          <NumberInput
            value={values.hourlyRate}
            onValueChange={(v) => set("hourlyRate", v)}
            unit="€/h"
            decimals={2}
            min={0}
            placeholder={rateText}
          />
        </FormField>
        <FormField id={`${ids}-notes`} label="Notizen">
          <Textarea
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Optionale Notizen"
          />
        </FormField>
      </form>
    </ResponsiveSheet>
  );
}
