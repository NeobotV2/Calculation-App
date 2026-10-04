import { useId, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, ClipboardCheck, Pencil } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MODULE_META, ModuleIcon } from "@/components/ui/module-badge";
import { Money } from "@/components/ui/money";
import { einsaetzeText } from "@/components/calc/winterdienst/winterdienst-ui";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { NextStep } from "@/lib/offer-readiness";
import { formatSeason } from "@/lib/service-modules/util";
import { formatDate, formatNumber, softHyphenate } from "@/lib/utils";
import type { Project } from "@/store/use-store";
import { FindingsPanel } from "./FindingsPanel";
import { NextStepCard } from "./NextStepCard";
import { useNachkalkulationSummary } from "./NachkalkulationSheet";
import { displayedModuleShares, isCleaningTabVisible, type WorkspaceModule, type WorkspaceTab } from "./workspace-tabs";

export interface OverviewTabProps {
  project: Project;
  economics: ObjectEconomics;
  nextStep: NextStep | null;
  onOffer: () => void;
  onOpenTab: (tab: WorkspaceTab) => void;
  onEditInfo: () => void;
  onOpenNachkalkulation: () => void;
  /** Unterhaltsreinigung ohne Räume sichtbar (nach „+ Leistung“). */
  forceCleaning?: boolean;
  readOnly?: boolean;
}

const MODULE_TAB: Record<WorkspaceModule, WorkspaceTab> = {
  unterhalt: "reinigung",
  winterdienst: "winterdienst",
  hms: "hms",
};

interface ModuleCardData {
  module: WorkspaceModule;
  figure: string;
  priceMonthly: number;
  share: number;
  paused: boolean;
}

function moduleCards(project: Project, economics: ObjectEconomics, forceCleaning: boolean): ModuleCardData[] {
  const shares = new Map(displayedModuleShares(project, economics).map((s) => [s.module, s]));
  const cards: ModuleCardData[] = [];
  const cleaning = economics.totals.cleaning;
  if (isCleaningTabVisible(project, { forceCleaning })) {
    const s = shares.get("unterhalt");
    cards.push({
      module: "unterhalt",
      figure: `${cleaning.count} ${cleaning.count === 1 ? "Raum" : "Räume"} · ${formatNumber(cleaning.area, 0)} m²`,
      priceMonthly: s?.priceMonthly ?? 0,
      share: s?.share ?? 0,
      paused: false,
    });
  }
  const wd = project.winterdienst;
  if (wd) {
    const s = shares.get("winterdienst");
    cards.push({
      module: "winterdienst",
      figure: `${einsaetzeText(wd.expectedEinsaetze)} · ${formatSeason(wd.seasonMonths)}`,
      priceMonthly: s?.priceMonthly ?? 0,
      share: s?.share ?? 0,
      paused: !wd.enabled,
    });
  }
  const hms = project.hms;
  if (hms) {
    const s = shares.get("hms");
    const n = hms.tasks.filter((t) => t.enabled).length;
    cards.push({
      module: "hms",
      figure: `${n} ${n === 1 ? "Leistung" : "Leistungen"}`,
      priceMonthly: s?.priceMonthly ?? 0,
      share: s?.share ?? 0,
      paused: !hms.enabled,
    });
  }
  return cards;
}

function ModuleCard({ data, onOpen }: { data: ModuleCardData; onOpen: () => void }) {
  const titleId = useId();
  const meta = MODULE_META[data.module];
  const sharePct = Math.round(data.share * 100);
  return (
    <Card as="li" padding="sm" aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <ModuleIcon module={data.module} decorative />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="hyphens-auto break-words text-h3 text-foreground">
            {softHyphenate(meta.label)}
          </h3>
          <p className="text-xs text-muted-foreground">{data.figure}</p>
        </div>
        {data.paused && <Badge tone="neutral">Pausiert</Badge>}
      </div>
      {data.paused ? (
        <p className="text-sm text-muted-foreground">Nicht im Monatspreis enthalten.</p>
      ) : (
        <div className="space-y-1.5">
          <Money value={data.priceMonthly} size="kpi" period="month" className="block" />
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={`h-full rounded-full ${meta.fill}`} style={{ width: `${Math.max(0, Math.min(100, data.share * 100))}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{sharePct} % des Monatspreises</p>
        </div>
      )}
      <Button type="button" variant="ghost" size="sm" className="mt-auto self-start" onClick={onOpen}>
        Öffnen<span className="sr-only">: {meta.label}</span>
        <ArrowRight aria-hidden="true" />
      </Button>
    </Card>
  );
}

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

const dash = <span className="text-muted-foreground">–</span>;

function ObjectDataCard({
  project,
  economics,
  onEdit,
  readOnly,
}: {
  project: Project;
  economics: ObjectEconomics;
  onEdit: () => void;
  readOnly: boolean;
}) {
  return (
    <Card as="section" aria-label="Objektdaten" padding="none">
      <CardHeader
        titleAs="h2"
        title="Objektdaten"
        action={
          readOnly ? undefined : (
            <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              Bearbeiten<span className="sr-only"> (Objektdaten)</span>
            </Button>
          )
        }
      />
      <CardContent>
        <dl className="divide-y divide-border">
          <DataRow label="Kunde">{project.customer || dash}</DataRow>
          <DataRow label="Standort">{project.location || dash}</DataRow>
          <DataRow label="Objektart">{project.objectType || dash}</DataRow>
          <DataRow label="Ansprechpartner">{project.rpiContactName || dash}</DataRow>
          <DataRow label="Verrechnungssatz">
            <span className="inline-flex flex-wrap items-center gap-2">
              <Money value={economics.effectiveRate} period="hour" />
              {project.hourlyRate === undefined && (
                <Badge tone="neutral" size="sm">
                  Standardsatz
                </Badge>
              )}
            </span>
          </DataRow>
          <DataRow label="Notizen">
            {project.notes ? <span className="whitespace-pre-line">{project.notes}</span> : dash}
          </DataRow>
        </dl>
      </CardContent>
    </Card>
  );
}

function NachkalkulationSummaryCard({
  project,
  onOpen,
  readOnly,
}: {
  project: Project;
  onOpen: () => void;
  readOnly: boolean;
}) {
  const summary = useNachkalkulationSummary(project);
  const showRooms = project.rooms.length > 0 || (!project.winterdienst && !project.hms);
  const missing = <span className="text-muted-foreground">Noch nicht erfasst</span>;
  return (
    <Card as="section" aria-label="Nachkalkulation" padding="none">
      <CardHeader
        titleAs="h2"
        title="Nachkalkulation"
        description="Plan/Ist-Vergleich der letzten Erfassung je Leistung."
        action={
          readOnly ? undefined : (
            <Button type="button" variant="secondary" size="sm" onClick={onOpen}>
              <ClipboardCheck aria-hidden="true" />
              {summary.hasAny ? "Bearbeiten" : "Erfassen"}
              <span className="sr-only"> (Nachkalkulation)</span>
            </Button>
          )
        }
      />
      <CardContent className="space-y-3">
        <dl className="divide-y divide-border">
          {showRooms && (
            <DataRow label={MODULE_META.unterhalt.label}>
              {summary.room
                ? `Ist ${formatNumber(summary.room.actualMonthlyHours, 1)} h/Monat · erfasst am ${formatDate(summary.room.recordedAt)}`
                : missing}
            </DataRow>
          )}
          {project.winterdienst && (
            <DataRow label={MODULE_META.winterdienst.label}>
              {summary.winter
                ? `Saison ${summary.winter.season}: ${einsaetzeText(summary.winter.einsaetze)}`
                : missing}
            </DataRow>
          )}
          {project.hms && (
            <DataRow label={MODULE_META.hms.label}>
              {summary.hms ? `Jahr ${summary.hms.year}: ${formatNumber(summary.hms.laborHours, 1)} h` : missing}
            </DataRow>
          )}
        </dl>
        <Button asChild variant="link" size="sm">
          <Link href={`/auswertung/${project.id}`}>
            <BarChart3 aria-hidden="true" />
            Controlling-Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Tab „Übersicht“ (§8.3): Modulkarten mit Preisanteil, Hinweise, Objektdaten,
 * Nachkalkulation und nächster Schritt (unter lg; ab lg in der Cockpit-Spalte).
 */
export function OverviewTab({
  project,
  economics,
  nextStep,
  onOffer,
  onOpenTab,
  onEditInfo,
  onOpenNachkalkulation,
  forceCleaning = false,
  readOnly = false,
}: OverviewTabProps) {
  const cards = moduleCards(project, economics, forceCleaning);
  return (
    <div className="space-y-8">
      <Section title="Leistungen">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <ModuleCard key={c.module} data={c} onOpen={() => onOpenTab(MODULE_TAB[c.module])} />
          ))}
        </ul>
      </Section>

      <FindingsPanel project={project} warnings={economics.warnings} readOnly={readOnly} />

      {nextStep && !readOnly && <NextStepCard step={nextStep} onOffer={onOffer} titleAs="h2" className="xl:hidden" />}

      <div className="grid gap-6 xl:grid-cols-2">
        <ObjectDataCard project={project} economics={economics} onEdit={onEditInfo} readOnly={readOnly} />
        <NachkalkulationSummaryCard project={project} onOpen={onOpenNachkalkulation} readOnly={readOnly} />
      </div>
    </div>
  );
}
