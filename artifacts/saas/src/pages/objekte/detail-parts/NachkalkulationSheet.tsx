import { useMemo } from "react";
import { Link } from "wouter";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { RoomNachkalkulationCard } from "@/components/controlling/RoomNachkalkulationCard";
import { WinterNachkalkulationCard } from "@/components/controlling/WinterNachkalkulationCard";
import { HmsNachkalkulationCard } from "@/components/controlling/HmsNachkalkulationCard";
import { latestWinterActual } from "@/components/calc/winterdienst/winterdienst-ui";
import { latestHmsActual } from "@/components/calc/hms/hms-ui";
import type { ObjectEconomics } from "@/lib/object-economics";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import { calcHms } from "@/lib/service-modules/hms";
import type { HmsActual, WinterdienstActual } from "@/lib/service-modules/types";
import { useStore, type Nachkalkulation, type Project } from "@/store/use-store";

export interface NachkalkulationSummary {
  /** Raum-Nachkalkulation (Monatsstunden, lokal gespeichert). */
  room?: Nachkalkulation;
  /** Jüngste Winterdienst-Saison. */
  winter?: WinterdienstActual;
  /** Jüngstes HMS-Jahr. */
  hms?: HmsActual;
  hasAny: boolean;
  /** Jüngstes Erfassungsdatum aller Einträge (ISO) oder undefined. */
  latestRecordedAt?: string;
}

/** Stand der Nachkalkulation je Leistung (für Cockpit und Übersicht). */
export function useNachkalkulationSummary(project: Project | undefined): NachkalkulationSummary {
  const room = useStore((s) => (project ? s.nachkalkulationen[project.id] : undefined));
  const actuals = project?.serviceActuals;
  return useMemo(() => {
    const winter = latestWinterActual(actuals?.winterdienst);
    const hms = latestHmsActual(actuals?.hms);
    const dates = [room?.recordedAt, winter?.recordedAt, hms?.recordedAt].filter((d): d is string => !!d).sort();
    return {
      room,
      winter,
      hms,
      hasAny: !!room || !!winter || !!hms,
      latestRecordedAt: dates.length > 0 ? dates[dates.length - 1] : undefined,
    };
  }, [room, actuals]);
}

export interface NachkalkulationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  economics: ObjectEconomics;
  readOnly?: boolean;
}

/**
 * Nachkalkulation erfassen (§8.1): Raum-Nachkalkulation sowie – falls angelegt –
 * Winterdienst-Saison und HMS-Jahr. Die Karten speichern selbst.
 */
export function NachkalkulationSheet({ open, onOpenChange, project, economics, readOnly = false }: NachkalkulationSheetProps) {
  const wdConfig = project.winterdienst;
  const hmsConfig = project.hms;
  const { rates, totals, strategy } = economics;
  // Pausierte Module: Plan trotzdem rechnen, damit der Vergleich möglich bleibt.
  const wdResult = useMemo(
    () => (wdConfig ? totals.winterdienst ?? calcWinterdienst(wdConfig, rates) : null),
    [wdConfig, totals.winterdienst, rates],
  );
  const hmsResult = useMemo(
    () => (hmsConfig ? totals.hms ?? calcHms(hmsConfig, rates) : null),
    [hmsConfig, totals.hms, rates],
  );
  const showRooms = project.rooms.length > 0 || (!wdResult && !hmsResult);
  const multiple = [showRooms, !!wdResult, !!hmsResult].filter(Boolean).length > 1;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      size={multiple ? "lg" : "md"}
      title="Nachkalkulation"
      description="Vergleichen Sie die geplanten mit den tatsächlichen Werten je Leistung."
      footer={
        <>
          <Button asChild variant="ghost">
            <Link href={`/auswertung/${project.id}`}>
              <BarChart3 aria-hidden="true" />
              Controlling-Details
            </Link>
          </Button>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </>
      }
      bodyClassName="space-y-4"
    >
      {showRooms && <RoomNachkalkulationCard project={project} economics={economics} readOnly={readOnly} titleAs="h3" />}
      {wdResult && (
        <WinterNachkalkulationCard
          project={project}
          result={wdResult}
          readOnly={readOnly}
          targetMarginPct={strategy.targetMarginPct}
          titleAs="h3"
        />
      )}
      {hmsResult && (
        <HmsNachkalkulationCard
          project={project}
          result={hmsResult}
          readOnly={readOnly}
          targetMarginPct={strategy.targetMarginPct}
          titleAs="h3"
        />
      )}
    </ResponsiveSheet>
  );
}
