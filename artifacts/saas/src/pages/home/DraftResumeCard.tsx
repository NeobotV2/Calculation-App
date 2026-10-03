import { useMemo, useState } from "react";
import { Link } from "wouter";
import { FilePen, Trash2 } from "lucide-react";
import { useStore } from "@/store/use-store";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { computeObjectEconomics } from "@/lib/object-economics";
import { draftToProject, isCalcDraftEmpty, type CalcDraft } from "@/lib/drafts";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ModuleBadge } from "@/components/ui/module-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";

const MODULE_KEYS = ["unterhalt", "winterdienst", "hms"] as const;

export function draftSourceLabel(d: CalcDraft): string {
  switch (d.source) {
    case "template":
      return d.sourceLabel ? `Aus Vorlage „${d.sourceLabel}“` : "Aus Vorlage";
    case "tender":
      return d.sourceLabel ? `Aus Ausschreibung „${d.sourceLabel}“` : "Aus Ausschreibung";
    case "edit":
      return d.sourceLabel ? `Bearbeitung von „${d.sourceLabel}“` : "Bearbeitung eines Objekts";
    default:
      return "Neue Kalkulation";
  }
}

export function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const date = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time} Uhr`;
}

/** Ziel „Fortsetzen": Flow im gespeicherten Schritt (Neuanlage oder Bearbeitung). */
export function draftResumeHref(d: CalcDraft): string {
  return `/kalkulation/${d.editingId ?? "neu"}/${d.stepId}`;
}

/**
 * „Entwurf fortsetzen" (§10): zeigt den automatisch gesicherten Flow-Entwurf
 * mit Name, Herkunft, Zeitpunkt und Monatspreis; [Fortsetzen] / [Verwerfen].
 */
export function DraftResumeCard() {
  const draft = useStore((s) => s.calcDraft);
  const setCalcDraft = useStore((s) => s.setCalcDraft);
  const settings = useEconomicsSettings();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const priceMonthly = useMemo(() => {
    if (!draft) return 0;
    try {
      return computeObjectEconomics(draftToProject(draft), settings).totals.priceMonthly;
    } catch {
      return 0;
    }
  }, [draft, settings]);

  if (!draft || isCalcDraftEmpty(draft)) return null;

  const name = draft.base.name.trim() || "Ohne Namen";
  const activeModules = MODULE_KEYS.filter((m) => draft.modules[m]);

  return (
    <Card as="section" tone="brand" aria-label="Entwurf fortsetzen">
      <CardHeader
        title="Entwurf fortsetzen"
        titleAs="h2"
        description={`${draftSourceLabel(draft)} · gespeichert am ${formatSavedAt(draft.savedAt)}`}
        action={<FilePen aria-hidden="true" className="size-5 text-primary" />}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {activeModules.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeModules.map((m) => (
                <ModuleBadge key={m} module={m} size="sm" />
              ))}
            </div>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-label text-muted-foreground">Monatspreis netto</p>
          <Money value={priceMonthly} size="kpi" period="month" />
        </div>
      </div>
      <CardFooter>
        <Button asChild>
          <Link href={draftResumeHref(draft)}>Fortsetzen</Link>
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)}>
          <Trash2 aria-hidden="true" />
          Verwerfen
        </Button>
      </CardFooter>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setCalcDraft(null)}
        title="Entwurf verwerfen?"
        description={`Der Entwurf „${name}“ wird gelöscht. Bereits gespeicherte Objekte bleiben unverändert.`}
        confirmLabel="Verwerfen"
        destructive
      />
    </Card>
  );
}
