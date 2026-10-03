import { CircleCheck } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { Callout } from "@/components/ui/callout";
import { getNextStep, type NextStep } from "@/lib/offer-readiness";
import type { ObjectRow } from "@/pages/objekte/list-parts/objects-filter";

export interface OpenTask {
  row: ObjectRow;
  nextStep: NextStep;
  href: string;
  /** 0 kritisch · 1 Blocker (Entwurf) · 2 Prüfung offen · 3 Nachkalkulation. */
  rank: number;
}

export const OPEN_TASKS_LIMIT = 5;

function time(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Offene Aufgaben aus Angebotsreife und nächstem Schritt: kritische Objekte
 * zuerst, dann Entwürfe, offene Prüfungen und fällige Nachkalkulationen.
 */
export function buildOpenTasks(
  rows: readonly ObjectRow[],
  hasNachkalkulation: (projectId: string) => boolean,
  now?: Date | string | number,
): OpenTask[] {
  const tasks: OpenTask[] = [];
  for (const row of rows) {
    if (row.project.status === "archived") continue;
    const r = row.readiness;
    const nextStep = getNextStep(row.project, r, { hasNachkalkulation: hasNachkalkulation(row.project.id), now });
    let rank: number | null = null;
    if (r.criticals.length > 0) rank = 0;
    else if (r.blockers.length > 0) rank = 1;
    else if (row.status.key === "pruefung_offen") rank = 2;
    else if (nextStep.action.kind === "href") rank = 3;
    if (rank === null) continue;
    const href = nextStep.action.kind === "href" ? nextStep.action.href : `/objekte/${row.project.id}`;
    tasks.push({ row, nextStep, href, rank });
  }
  return tasks.sort((a, b) => a.rank - b.rank || time(b.row.project.updatedAt) - time(a.row.project.updatedAt));
}

/** „Offene Aufgaben" (§10): höchstens fünf Zeilen, je Objekt der nächste Schritt. */
export function OpenTasksSection({ tasks }: { tasks: OpenTask[] }) {
  const shown = tasks.slice(0, OPEN_TASKS_LIMIT);
  const more = tasks.length - shown.length;

  return (
    <Section
      title="Offene Aufgaben"
      description={
        tasks.length > 0
          ? more > 0
            ? `${tasks.length} Objekte brauchen Ihre Aufmerksamkeit – die wichtigsten zuerst.`
            : "Die wichtigsten Punkte zuerst."
          : undefined
      }
    >
      {shown.length === 0 ? (
        <Callout tone="success" icon={CircleCheck}>
          Keine offenen Aufgaben – alle aktiven Objekte sind angebotsbereit.
        </Callout>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-border">
            {shown.map((t) => (
              <ListRow
                key={t.row.project.id}
                as="li"
                href={t.href}
                title={t.row.project.name || "Ohne Namen"}
                meta={t.nextStep.label}
                trailing={<StatusBadge size="sm" tone={t.row.status.tone} label={t.row.status.label} />}
              />
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}
