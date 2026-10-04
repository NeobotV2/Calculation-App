import * as React from "react";
import { Link } from "wouter";
import { ArrowRight, Check, FileSpreadsheet, LayoutTemplate, FilePlus2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ModuleIcon, type ServiceModule } from "@/components/ui/module-badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { CalcModuleKey } from "@/lib/drafts";
import { cn, softHyphenate } from "@/lib/utils";
import { STEP_BLOCK_MESSAGES, hasAnyModule } from "../flow-state";
import type { FlowStepProps } from "../flow-steps";

interface ModuleCardMeta {
  key: CalcModuleKey & ServiceModule;
  title: string;
  description: string;
  billing: string;
}

const MODULE_CARDS: readonly ModuleCardMeta[] = [
  {
    key: "unterhalt",
    title: "Unterhaltsreinigung",
    description: "Räume, Flächen, Turnus und Leistungswerte (BIV/RAL)",
    billing: "monatlich",
  },
  {
    key: "winterdienst",
    title: "Winterdienst",
    description: "Räum- und Streuflächen, Einsätze je Saison, Streugut, Bereitschaft",
    billing: "Saisonpauschale oder je Einsatz",
  },
  {
    key: "hms",
    title: "Hausmeisterservice",
    description: "Kontrollgänge, Außenanlagen, Grünpflege, Mülltonnen, Kleinreparaturen",
    billing: "Monatspauschale aus Jahresleistung",
  },
];

type StartPoint = "blank" | "template" | "tender";

/** Schritt 1 · Leistungen: Module wählen und (Neuanlage) den Startpunkt. */
export function StepLeistungen({
  mode,
  draft,
  dispatch,
  existing,
  showValidation,
  openTemplatePicker,
  templatesAllowed,
}: FlowStepProps) {
  const uid = React.useId();
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [start, setStart] = React.useState<StartPoint>(
    draft.source === "template" || draft.source === "tender" ? draft.source : "blank",
  );
  const noModule = !hasAnyModule(draft);
  const roomCount = draft.rooms.length;
  const errorId = `${uid}-error`;

  const toggle = (key: CalcModuleKey, on: boolean) => {
    if (key === "unterhalt" && !on && roomCount > 0) {
      if (mode === "create") setConfirmClear(true);
      return;
    }
    dispatch({ type: "toggleModule", module: key, on });
  };

  const hintFor = (key: CalcModuleKey, checked: boolean): string | null => {
    if (mode !== "edit") return null;
    if (key === "unterhalt" && roomCount > 0) {
      return "Um die Unterhaltsreinigung zu beenden, entfernen Sie die Räume im Schritt Räume & Turnus.";
    }
    if (key === "winterdienst" && !checked && existing?.winterdienst) {
      return "Daten bleiben erhalten und können wieder aktiviert werden.";
    }
    if (key === "hms" && !checked && existing?.hms) {
      return "Daten bleiben erhalten und können wieder aktiviert werden.";
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <fieldset
        aria-describedby={showValidation && noModule ? errorId : undefined}
        aria-invalid={showValidation && noModule ? true : undefined}
        className="space-y-3"
        id="leistungen"
        tabIndex={-1}
      >
        <legend className="mb-3 text-h3 text-foreground">Welche Leistungen umfasst das Objekt?</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {MODULE_CARDS.map((m) => {
            const checked = draft.modules[m.key];
            const disabled = mode === "edit" && m.key === "unterhalt" && roomCount > 0 && checked;
            const hint = hintFor(m.key, checked);
            const descId = `${uid}-${m.key}-desc`;
            const hintId = `${uid}-${m.key}-hint`;
            return (
              <label
                key={m.key}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-surface transition-colors",
                  "hover:border-border-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                  checked && "border-primary ring-1 ring-primary hover:border-primary",
                  disabled && "cursor-not-allowed",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={disabled}
                  aria-describedby={hint ? `${descId} ${hintId}` : descId}
                  onChange={(e) => toggle(m.key, e.target.checked)}
                />
                <span className="flex items-start justify-between gap-3">
                  <ModuleIcon module={m.key} size="md" decorative />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card",
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={2.5} />}
                  </span>
                </span>
                <span className="hyphens-auto break-words text-h3 text-foreground">{softHyphenate(m.title)}</span>
                <span id={descId} className="text-sm text-muted-foreground">
                  {m.description}
                  <span className="mt-2 block text-xs">Abrechnung: {m.billing}</span>
                </span>
                {hint && (
                  <span id={hintId} className="text-xs text-foreground">
                    {hint}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {showValidation && noModule && (
          <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
            {STEP_BLOCK_MESSAGES.no_module}
          </p>
        )}
      </fieldset>

      {mode === "create" && (
        <section aria-labelledby={`${uid}-start`} className="space-y-3">
          <h3 id={`${uid}-start`} className="text-h3 text-foreground">
            Startpunkt
          </h3>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="Startpunkt"
            value={start}
            onValueChange={(v) => {
              if (!v) return;
              const next = v as StartPoint;
              setStart(next);
              if (next === "template") openTemplatePicker();
            }}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            <ToggleGroupItem value="blank" className="h-auto justify-start py-2.5">
              <FilePlus2 aria-hidden="true" />
              Leer beginnen
            </ToggleGroupItem>
            <ToggleGroupItem value="template" className="h-auto justify-start py-2.5">
              <LayoutTemplate aria-hidden="true" />
              Aus Vorlage
              {!templatesAllowed && (
                <Badge tone="brand" size="sm" className="ml-auto">
                  Pro
                </Badge>
              )}
            </ToggleGroupItem>
            <ToggleGroupItem value="tender" className="h-auto justify-start py-2.5">
              <FileSpreadsheet aria-hidden="true" />
              Aus Ausschreibung
            </ToggleGroupItem>
          </ToggleGroup>

          {start === "template" && draft.source === "template" && (
            <Callout tone="success">
              Vorlage „{draft.sourceLabel}“ geladen ({roomCount} {roomCount === 1 ? "Raum" : "Räume"}).
            </Callout>
          )}
          {start === "template" && draft.source !== "template" && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                Die Räume der Vorlage werden in die Kalkulation übernommen. Vorlagen enthalten nur Räume.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={openTemplatePicker}>
                <LayoutTemplate aria-hidden="true" />
                Vorlage wählen
              </Button>
            </div>
          )}
          {start === "tender" && (
            <Link
              href="/ausschreibung"
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-surface outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <FileSpreadsheet aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">Zur Ausschreibung</span>
                <span className="block text-sm text-muted-foreground">
                  LV-Datei importieren, Szenarien vergleichen und anschließend hier prüfen.
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => dispatch({ type: "toggleModule", module: "unterhalt", on: false })}
        title={`${roomCount} ${roomCount === 1 ? "Raum" : "Räume"} verwerfen?`}
        description="Ohne Unterhaltsreinigung werden die erfassten Räume aus der Kalkulation entfernt."
        confirmLabel="Verwerfen"
        destructive
      />
    </div>
  );
}
