import * as React from "react";
import { toast } from "sonner";
import { ClipboardCheck, Smartphone } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { Money } from "@/components/ui/money";
import { NumberInput } from "@/components/ui/number-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/auth-context";
import { compareNachkalkulation } from "@/lib/nachkalkulation";
import type { ObjectEconomics } from "@/lib/object-economics";
import { verdictLabel, verdictTone, type Tone } from "@/lib/status";
import { formatDate, formatNumber } from "@/lib/utils";
import { useStore, type Project } from "@/store/use-store";

export interface RoomNachkalkulationCardProps {
  project: Project;
  /** `useObjectEconomics(project)` – liefert Reinigungsstunden, -preis, -fläche und Vollkosten. */
  economics: ObjectEconomics;
  /** Schreibgeschützt (z. B. archiviertes Objekt). */
  readOnly?: boolean;
  /** Überschriften-Ebene des Titels (Standard h2). */
  titleAs?: "h2" | "h3";
  className?: string;
}

const signedPct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), 1)} %`;

/**
 * Plan/Ist-Vergleich der Unterhaltsreinigung (Monatsstunden). Gleiche
 * Store-Aufrufe und `compareNachkalkulation`-Eingaben wie bisher in
 * `pages/auswertung/[id].tsx` (Reinigungsstunden und -preis ohne Module).
 */
export function RoomNachkalkulationCard({ project, economics, readOnly = false, titleAs = "h2", className }: RoomNachkalkulationCardProps) {
  const uid = React.useId();
  const { isAuthenticated } = useAuth();
  const nachkalkulation = useStore((s) => s.nachkalkulationen[project.id]);
  const setNachkalkulation = useStore((s) => s.setNachkalkulation);
  const removeNachkalkulation = useStore((s) => s.removeNachkalkulation);

  const [editing, setEditing] = React.useState(false);
  const [hours, setHours] = React.useState<number | undefined>(undefined);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const cleaning = economics.totals.cleaning;
  const vollkosten = economics.breakdown.vollkosten;
  const title = `Nachkalkulation Unterhaltsreinigung${economics.totals.hasModules ? " (ohne Winterdienst/HMS)" : ""}`;

  const result = nachkalkulation
    ? compareNachkalkulation({
        plannedHours: cleaning.hours,
        actualHours: nachkalkulation.actualMonthlyHours,
        monthlyPrice: cleaning.cost,
        vollkosten,
        area: cleaning.area,
      })
    : null;

  const verdict: { tone: Tone; label: string } | null = result
    ? result.verdict === "schlechter" && result.actualMarginPct < 0
      ? { tone: "critical", label: "Kritisch – Verlust" }
      : { tone: verdictTone(result.verdict), label: verdictLabel(result.verdict) }
    : null;

  const startEditing = () => {
    setHours(nachkalkulation?.actualMonthlyHours);
    setNote(nachkalkulation?.note ?? "");
    setError(undefined);
    setEditing(true);
  };

  const save = () => {
    if (hours === undefined || !Number.isFinite(hours) || hours <= 0) {
      setError("Bitte geben Sie die tatsächlichen Monatsstunden ein (z. B. 42,5).");
      document.getElementById(`${uid}-hours`)?.focus();
      return;
    }
    setNachkalkulation(project.id, { actualMonthlyHours: hours, note });
    setEditing(false);
    setHours(undefined);
    setNote("");
    toast.success("Nachkalkulation gespeichert");
  };

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        titleAs={titleAs}
        title={
          <span id={`${uid}-title`} className="flex items-center gap-2">
            <ClipboardCheck aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {title}
          </span>
        }
        description="Plan/Ist-Vergleich der Monatsstunden bei festem Monatspreis."
        action={verdict ? <StatusBadge tone={verdict.tone} label={verdict.label} /> : undefined}
      />

      <div className="space-y-4">
        {isAuthenticated && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone aria-hidden="true" className="size-3.5 shrink-0" />
            Nur auf diesem Gerät gespeichert
          </p>
        )}

        {!nachkalkulation && !editing && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Erfassen Sie die tatsächlichen Monatsstunden, um Plan und Realität zu vergleichen – die Grundlage für bessere
              zukünftige Kalkulationen.
            </p>
            {!readOnly && (
              <Button type="button" variant="secondary" onClick={startEditing}>
                Ist-Stunden erfassen
              </Button>
            )}
          </div>
        )}

        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${uid}-hours`}
                label="Ist-Stunden pro Monat"
                required
                error={error}
                hint={`Plan: ${formatNumber(cleaning.hours, 1)} h/Monat`}
              >
                <NumberInput
                  value={hours}
                  onValueChange={(v) => {
                    setHours(v);
                    if (error && v !== undefined && v > 0) setError(undefined);
                  }}
                  decimals={2}
                  min={0}
                  unit="h"
                  placeholder="z. B. 42,5"
                />
              </FormField>
              <FormField id={`${uid}-note`} label="Notiz (optional)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Mehraufwand durch Umbau im EG" />
              </FormField>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
              <Button type="submit">Speichern</Button>
            </div>
          </form>
        )}

        {nachkalkulation && result && !editing && (
          <div className="space-y-4">
            <KpiGroup columns={4}>
              <Kpi
                label="Stunden Plan → Ist"
                value={`${formatNumber(cleaning.hours, 1)} → ${formatNumber(nachkalkulation.actualMonthlyHours, 1)} h`}
                hint={`${signedPct(result.hoursDeviationPct)} Abweichung`}
              />
              <Kpi
                label="Marge Plan → Ist"
                value={`${formatNumber(result.plannedMarginPct, 1)} → ${formatNumber(result.actualMarginPct, 1)} %`}
                hint="bei festem Monatspreis"
              />
              <Kpi
                label="Ist-Kosten/Monat"
                value={<Money value={result.actualCostMonthly} size="kpi" />}
                hint="zu Vollkosten"
              />
              <Kpi
                label="Erfasst am"
                value={formatDate(nachkalkulation.recordedAt)}
                hint={nachkalkulation.note ? <span className="line-clamp-2">{nachkalkulation.note}</span> : undefined}
              />
            </KpiGroup>
            {!readOnly && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="destructive-ghost" onClick={() => setConfirmRemove(true)}>
                  Entfernen
                </Button>
                <Button type="button" variant="secondary" onClick={startEditing}>
                  Aktualisieren
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          removeNachkalkulation(project.id);
          setConfirmRemove(false);
          toast.success("Nachkalkulation entfernt");
        }}
        title="Nachkalkulation entfernen?"
        description="Die erfassten Ist-Stunden werden gelöscht."
        confirmLabel="Entfernen"
        destructive
      />
    </Card>
  );
}
