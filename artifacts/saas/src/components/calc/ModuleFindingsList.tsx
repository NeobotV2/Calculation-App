import { Callout } from "@/components/ui/callout";
import { severityLabel, severityTone, type Severity } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Ein Befund (ModuleFinding oder Warning-artig). Schlüssel: `id` bzw. `idSuffix`. */
export interface FindingItem {
  id?: string;
  idSuffix?: string;
  severity: Severity;
  title: string;
  message: string;
  action?: string;
}

export interface ModuleFindingsListProps {
  findings: readonly FindingItem[];
  /** Weniger Innenabstand (Übersichten, Sheets). */
  compact?: boolean;
  /** Zugänglicher Name der Liste. Standard: „Hinweise“. */
  label?: string;
  /** Sichtbare Überschrift (h3) über der Liste. */
  heading?: string;
  className?: string;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** Kritisch → Warnung → Hinweis, sonst stabile Reihenfolge. */
export function sortFindings<T extends Pick<FindingItem, "severity">>(findings: readonly T[]): T[] {
  return findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (SEVERITY_RANK[a.f.severity] ?? 3) - (SEVERITY_RANK[b.f.severity] ?? 3) || a.i - b.i)
    .map((x) => x.f);
}

/**
 * Befunde eines Moduls als Callouts (kritisch zuerst). Die Empfehlung steht in
 * einer eigenen Zeile „Empfehlung: …“. Ohne Befunde wird nichts gerendert.
 */
export function ModuleFindingsList({ findings, compact = false, label = "Hinweise", heading, className }: ModuleFindingsListProps) {
  if (findings.length === 0) return null;
  const sorted = sortFindings(findings);
  return (
    <section aria-label={heading ? undefined : label} className={cn("space-y-3", className)}>
      {heading && <h3 className="text-h3 text-foreground">{heading}</h3>}
      <ul className="space-y-2">
        {sorted.map((f, i) => (
          <li key={f.id ?? f.idSuffix ?? i}>
            <Callout
              tone={severityTone(f.severity)}
              className={cn(compact && "p-3")}
              title={
                <>
                  <span className="sr-only">{severityLabel(f.severity)}: </span>
                  {f.title}
                </>
              }
            >
              <p>{f.message}</p>
              {f.action && (
                <p>
                  <span className="font-medium">Empfehlung:</span> {f.action}
                </p>
              )}
            </Callout>
          </li>
        ))}
      </ul>
    </section>
  );
}
