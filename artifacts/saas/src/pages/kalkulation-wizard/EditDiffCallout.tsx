import * as React from "react";
import { Callout } from "@/components/ui/callout";
import { formatMoney } from "@/components/ui/money";
import type { Project } from "@/store/use-store";
import { draftToProject, type CalcDraft } from "@/lib/drafts";
import { computeObjectEconomics, type EconomicsSettings, type ObjectEconomics } from "@/lib/object-economics";
import { formatNumber } from "@/lib/utils";
import { changedFields, draftContentKey, effectiveEditDraft } from "./flow-state";

export interface EditDiffCalloutProps {
  /** Gespeicherter Stand des Objekts. */
  existing: Project;
  draft: CalcDraft;
  /** Wirtschaftlichkeit des Entwurfs (computeObjectEconomics(draftToProject(draft))). */
  draftEcon: ObjectEconomics;
  settings: EconomicsSettings;
  className?: string;
}

/** Mindestabweichung, ab der ein Preisunterschied angezeigt wird (unter einem halben Cent = unverändert). */
const EPS = 0.005;

function signedPct(v: number): string {
  const s = formatNumber(Math.abs(v), 1);
  if (Math.abs(v) < 0.05) return `${formatNumber(0, 1)} %`;
  return `${v > 0 ? "+" : "−"}${s} %`;
}

/** Preisvergleich gespeichert → neu und Liste der Änderungen (Bearbeiten-Modus, §6.4 Schritt 7). */
export function EditDiffCallout({ existing, draft, draftEcon, settings, className }: EditDiffCalloutProps) {
  const existingEcon = React.useMemo(() => computeObjectEconomics(existing, settings), [existing, settings]);
  // Was das Speichern tatsächlich bewirkt (Drei-Wege-Abgleich mit dem aktuellen Objektstand).
  const effective = React.useMemo(() => effectiveEditDraft(draft, existing), [draft, existing]);
  const effectiveEcon = React.useMemo(
    () =>
      draftContentKey(effective) === draftContentKey(draft)
        ? draftEcon
        : computeObjectEconomics(draftToProject(effective, { id: existing.id, createdAt: existing.createdAt }), settings),
    [effective, draft, draftEcon, existing.id, existing.createdAt, settings],
  );
  const changes = React.useMemo(() => changedFields(existing, effective), [existing, effective]);
  const before = existingEcon.totals.priceMonthly;
  const after = effectiveEcon.totals.priceMonthly;
  const delta = after - before;
  const unchanged = Math.abs(delta) < EPS;

  const title = unchanged
    ? `Monatspreis unverändert: ${formatMoney(before)}`
    : `Gespeichert ${formatMoney(before)} → neu ${formatMoney(after)} (${formatMoney(delta, { signed: true })}${
        before > 0 ? `, ${signedPct((delta / before) * 100)}` : ""
      })`;

  return (
    <Callout tone="info" title={title} className={className}>
      {changes.length > 0 ? (
        <>
          <p className="sr-only">Änderungen gegenüber dem gespeicherten Stand:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>Keine Änderungen gegenüber dem gespeicherten Stand.</p>
      )}
    </Callout>
  );
}
