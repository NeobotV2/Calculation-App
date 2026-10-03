import * as React from "react";
import { Callout } from "@/components/ui/callout";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OBJECT_TYPES } from "@/data/object-types";
import type { CalcDraft } from "@/lib/drafts";
import { STEP_BLOCK_MESSAGES } from "../flow-state";
import type { FlowStepProps } from "../flow-steps";

function sourceCallout(draft: CalcDraft): React.ReactNode {
  if (draft.source === "tender") {
    return (
      <Callout tone="info" title={`Aus Ausschreibung${draft.sourceLabel ? ` „${draft.sourceLabel}“` : ""} übernommen`}>
        Räume und Satz stammen aus der Ausschreibungs-Kalkulation. Die Rüstzeit steht auf 0 Min., damit der Preis dem
        Szenario entspricht – passen Sie sie im Schritt Räume &amp; Turnus bei Bedarf an.
      </Callout>
    );
  }
  if (draft.source === "template") {
    const n = draft.rooms.length;
    return (
      <Callout tone="info" title={`Aus Vorlage${draft.sourceLabel ? ` „${draft.sourceLabel}“` : ""}`}>
        {n} {n === 1 ? "Raum wurde" : "Räume wurden"} aus der Vorlage übernommen.
      </Callout>
    );
  }
  return null;
}

/** Schritt 2 · Objekt: Grunddaten mit vollständiger Label-/Fehler-Verknüpfung. */
export function StepObjekt({ draft, dispatch, showValidation }: FlowStepProps) {
  const uid = React.useId();
  const b = draft.base;
  const set = (patch: Partial<CalcDraft["base"]>) => dispatch({ type: "setBase", patch });
  const nameError = showValidation && b.name.trim() === "" ? STEP_BLOCK_MESSAGES.name_missing : null;

  return (
    <div className="space-y-6">
      {sourceCallout(draft)}
      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
        <FormField id="name" label="Objektname" required error={nameError}>
          <Input
            value={b.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="z. B. Bürogebäude Musterstraße"
            autoComplete="off"
            enterKeyHint="next"
          />
        </FormField>
        <FormField id="customer" label="Kunde" hint="Empfänger des Angebots">
          <Input
            value={b.customer}
            onChange={(e) => set({ customer: e.target.value })}
            placeholder="z. B. Muster GmbH"
            autoComplete="organization"
          />
        </FormField>
        <FormField id="location" label="Standort / Adresse">
          <Input
            value={b.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="z. B. Berlin, Musterstraße 1"
            autoComplete="street-address"
          />
        </FormField>
        <FormField id="contactName" label="Ansprechpartner">
          <Input
            value={b.contactName}
            onChange={(e) => set({ contactName: e.target.value })}
            placeholder="z. B. Frau Müller"
            autoComplete="name"
          />
        </FormField>

        <div className="space-y-1.5 md:col-span-2">
          <p id={`${uid}-type`} className="text-label text-muted-foreground">
            Objektart
          </p>
          <ToggleGroup
            type="single"
            variant="chip"
            aria-labelledby={`${uid}-type`}
            value={b.objectType}
            onValueChange={(v) => set({ objectType: v })}
            className="justify-start"
          >
            {OBJECT_TYPES.map((t) => (
              <ToggleGroupItem key={t} value={t}>
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            Bestimmt den Vorschlag für den Hausmeisterservice. Erneutes Antippen hebt die Auswahl auf.
          </p>
        </div>

        <FormField id="notes" label="Notizen" className="md:col-span-2">
          <Textarea
            value={b.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Optionale Notizen zur Begehung"
            rows={3}
          />
        </FormField>
      </div>
    </div>
  );
}
