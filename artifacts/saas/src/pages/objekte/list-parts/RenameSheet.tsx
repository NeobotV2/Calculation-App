import { useEffect, useId, useState, type FormEvent } from "react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface RenameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titel des Sheets, z. B. „Objekt umbenennen". */
  title: string;
  /** Feldbezeichnung, z. B. „Objektname". */
  label: string;
  initialName: string;
  /** Speichert den (getrimmten) Namen; Fehler werden inline angezeigt. */
  onSave: (name: string) => Promise<void> | void;
}

/** Umbenennen im ResponsiveSheet (Drawer/Sheet) mit Pflichtfeld und Ladezustand. */
export function RenameSheet({ open, onOpenChange, title, label, initialName, onSave }: RenameSheetProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formId = useId();
  const fieldId = `${formId}-name`;

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
      setSaving(false);
    }
  }, [open, initialName]);

  const trimmed = name.trim();
  const dirty = trimmed !== initialName.trim();

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    if (!trimmed) {
      setError("Bitte geben Sie einen Namen ein.");
      return;
    }
    if (!dirty) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der Name konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      dirty={dirty && !saving}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Speichern
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <FormField id={fieldId} label={label} required error={error}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            autoFocus
            maxLength={200}
          />
        </FormField>
      </form>
    </ResponsiveSheet>
  );
}
