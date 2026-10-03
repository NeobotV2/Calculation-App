import { useId, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { fixForWarningSuffix, fixHref } from "@/lib/offer-readiness";
import { TONE_RANK, severityLabel, severityTone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Warning } from "@/lib/warnings";
import type { Project } from "@/store/use-store";
import { warningSuffixOf } from "./workspace-tabs";

export interface FindingsPanelProps {
  project: Project;
  /** `econ.warnings` (bereits nach deaktivierten Prüfregeln gefiltert). */
  warnings: readonly Warning[];
  /** Archiviert: keine „Beheben“-Links. */
  readOnly?: boolean;
  className?: string;
}

/** Kritisch zuerst, dann Warnung, dann Hinweis (stabil). */
export function sortWarnings(list: readonly Warning[]): Warning[] {
  return list
    .map((w, i) => ({ w, i }))
    .sort((a, b) => TONE_RANK[severityTone(b.w.severity)] - TONE_RANK[severityTone(a.w.severity)] || a.i - b.i)
    .map((x) => x.w);
}

function FindingItem({ project, warning, readOnly }: { project: Project; warning: Warning; readOnly: boolean }) {
  const detailsId = useId();
  const critical = warning.severity === "critical";
  const [open, setOpen] = useState(critical);
  const fix = fixForWarningSuffix(warningSuffixOf(warning.id, project.id));
  const href = fix && !readOnly ? fixHref(project, fix) : undefined;
  const hasActions = !critical || !!href;

  return (
    <li>
      <Callout
        tone={severityTone(warning.severity)}
        title={
          <>
            <span className="sr-only">{severityLabel(warning.severity)}: </span>
            {warning.title}
          </>
        }
        action={
          hasActions ? (
            <>
              {href && (
                <Button asChild variant="secondary" size="sm">
                  <Link href={href}>
                    Beheben<span className="sr-only">: {warning.title}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              )}
              {!critical && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={open}
                  aria-controls={detailsId}
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? "Details ausblenden" : "Details"}
                  <ChevronDown aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        <div id={detailsId} hidden={!open} className="space-y-1">
          <p>{warning.message}</p>
          <p className="text-muted-foreground">Empfehlung: {warning.action}</p>
        </div>
      </Callout>
    </li>
  );
}

/**
 * Hinweise zur Kalkulation (§8.3): `econ.warnings` als Callouts, kritische
 * zuerst und aufgeklappt; jeweils „Beheben“ über die Fix-Zuordnung der Angebotsreife.
 */
export function FindingsPanel({ project, warnings, readOnly = false, className }: FindingsPanelProps) {
  const titleId = useId();
  const sorted = useMemo(() => sortWarnings(warnings), [warnings]);

  return (
    <section aria-labelledby={titleId} className={cn("space-y-3", className)}>
      <h2 id={titleId} className="text-h2 text-foreground">
        Hinweise zur Kalkulation
        {sorted.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({sorted.length})</span>}
      </h2>
      {sorted.length === 0 ? (
        <Callout tone="success">Keine Hinweise – die Kalkulation ist plausibel.</Callout>
      ) : (
        <ul className="space-y-2">
          {sorted.map((w) => (
            <FindingItem key={w.id} project={project} warning={w} readOnly={readOnly} />
          ))}
        </ul>
      )}
    </section>
  );
}
