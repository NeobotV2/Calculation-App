import * as React from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import type { GateResult } from "@/lib/feature-gates";
import { useMediaQuery } from "@/lib/theme";
import { MEDIA } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import type { FrequencyKey, Room } from "@/store/use-store";
import { BulkFrequencyMenu } from "./rooms/BulkFrequencyMenu";
import { RoomCardList } from "./rooms/RoomCardList";
import {
  RoomsFooterAmountsProvider,
  RoomsTable,
  formatArea,
  roomDisplayName,
  type MoveDirection,
  type RoomRowHandlers,
  type RoomsTotal,
} from "./rooms/RoomsTable";
import {
  commonFrequency,
  duplicateRoom,
  groupMove,
  groupRooms,
  roundRoomsForDisplay,
  stripRoomId,
  summarizeRooms,
  type RoomsFooterAmount,
} from "./rooms/rooms-editor-logic";

type MaybePromise<T> = T | Promise<T>;

export interface RoomsEditorProps {
  rooms: Room[];
  /** Verrechnungssatz in €/h (Objektsatz oder Standard). */
  rate: number;
  /** `draft` (Flow) oder `persisted` (Objekt) – nur für Texte; Schreiben macht der Aufrufer. */
  mode?: "draft" | "persisted";
  /** Schreibgeschützt (z. B. archiviertes Objekt): keine Werkzeugleiste, kein Menü. */
  readOnly?: boolean;
  onAdd: (room: Omit<Room, "id">) => MaybePromise<void>;
  onUpdate: (id: string, room: Omit<Room, "id">) => MaybePromise<void>;
  onDelete: (id: string) => MaybePromise<void>;
  /** Eigene Duplizier-Logik; ohne: Kopie „{Name} (Kopie)“ über `onAdd`. */
  onDuplicate?: (id: string) => MaybePromise<void>;
  /** Umsortieren (splice-Semantik wie `reorderRooms`); ohne: „Nach oben/unten“ ausgeblendet. */
  onReorder?: (from: number, to: number) => void;
  /** „Turnus für alle“ – Bestätigung bzw. direkte Übernahme macht der Aufrufer. */
  onSetAllFrequencies: (frequency: FrequencyKey) => void;
  /** Raumlimit prüfen – vor Hinzufügen, Duplizieren und Vorlage laden. */
  checkRoomLimit: () => GateResult;
  /** Wird bei gesperrtem Gate aufgerufen (z. B. UpgradeModal öffnen). */
  onGateBlocked: (gate: GateResult) => void;
  /** „Aus Vorlage“ / „Vorlage laden“ (nur wenn gesetzt). */
  onLoadTemplate?: () => void;
  /** Zusätzliche Fußzeilen über der Gesamtsumme, z. B. `<SetupTimeEditor compact … />` oder `RoomsFooterRow`. */
  footer?: React.ReactNode;
  /**
   * Beträge der Fußzeilen – werden zur Summe der Räume addiert. Mit `rows`
   * (je `RoomsFooterRow amountKey`) werden Zeilen und Summe gemeinsam gerundet,
   * so dass die angezeigten Beträge exakt aufgehen.
   */
  footerAmounts?: { hoursMonthly: number; priceMonthly: number; rows?: RoomsFooterAmount[] };
  /** Beschriftung der Summenzeile (Standard: „Summe Räume“ bzw. „Gesamt“ mit Fußzeilen). */
  totalLabel?: string;
  /** Eigener leerer Zustand statt „Noch keine Räume erfasst“. */
  emptyState?: React.ReactNode;
  /** Zusätzlicher Inhalt rechts in der Werkzeugleiste. */
  toolbarEnd?: React.ReactNode;
  /** sr-only Tabellenbeschriftung. */
  caption?: string;
  className?: string;
}

/** Imperativer Zugriff, z. B. für „+ Raum“ in einer Sticky-Action-Bar. */
export interface RoomsEditorHandle {
  /** Prüft das Raumlimit und öffnet den Editor für einen neuen Raum. */
  openAdd: () => void;
  /** Öffnet den Editor für einen vorhandenen Raum. */
  openEdit: (roomId: string) => void;
}

/**
 * Räume eines Objekts bzw. Entwurfs bearbeiten – gemeinsam genutzt von Flow
 * („Räume & Turnus“) und Objekt-Arbeitsbereich („Unterhaltsreinigung“).
 * Ab md eine gruppierte Tabelle, darunter eine Kartenliste. Kein Routing und
 * keine Store-Schreibzugriffe: alle Änderungen laufen über die Callbacks.
 */
export const RoomsEditor = React.forwardRef<RoomsEditorHandle, RoomsEditorProps>(function RoomsEditor(
  {
    rooms,
    rate,
    mode = "draft",
    readOnly = false,
    onAdd,
    onUpdate,
    onDelete,
    onDuplicate,
    onReorder,
    onSetAllFrequencies,
    checkRoomLimit,
    onGateBlocked,
    onLoadTemplate,
    footer,
    footerAmounts,
    totalLabel,
    emptyState,
    toolbarEnd,
    caption,
    className,
  },
  ref,
) {
  const isMdUp = useMediaQuery(MEDIA.md, true);
  const [sheet, setSheet] = React.useState<{ open: boolean; editRoom?: Room }>({ open: false });
  // Raum bleibt nach dem Schließen gespeichert, damit der Dialogtext nicht springt.
  const [deleteState, setDeleteState] = React.useState<{ open: boolean; room?: Room }>({ open: false });

  const exactGroups = React.useMemo(() => groupRooms(rooms, rate), [rooms, rate]);
  const summary = React.useMemo(() => summarizeRooms(rooms, rate), [rooms, rate]);
  // Anzeige-Rundung: Raumzeilen + Fußzeilen auf Cent mit Restverteilung (Σ Zeilen = Summen).
  const footerRows = React.useMemo<RoomsFooterAmount[]>(
    () =>
      footerAmounts?.rows ??
      (footerAmounts ? [{ key: "__footer", hoursMonthly: footerAmounts.hoursMonthly, priceMonthly: footerAmounts.priceMonthly }] : []),
    [footerAmounts],
  );
  const display = React.useMemo(() => roundRoomsForDisplay(exactGroups, footerRows), [exactGroups, footerRows]);
  const groups = display.groups;
  const current = React.useMemo(() => commonFrequency(rooms), [rooms]);

  /** Gate prüfen; bei Sperre `onGateBlocked` und false. */
  const passGate = React.useCallback((): boolean => {
    const gate = checkRoomLimit();
    if (!gate.allowed) {
      onGateBlocked(gate);
      return false;
    }
    return true;
  }, [checkRoomLimit, onGateBlocked]);

  const openAdd = React.useCallback(() => {
    if (readOnly) return;
    if (!passGate()) return;
    setSheet({ open: true, editRoom: undefined });
  }, [readOnly, passGate]);

  const openEditRoom = React.useCallback(
    (room: Room) => {
      if (readOnly) return;
      setSheet({ open: true, editRoom: room });
    },
    [readOnly],
  );

  React.useImperativeHandle(
    ref,
    () => ({
      openAdd,
      openEdit: (roomId: string) => {
        const room = rooms.find((r) => r.id === roomId);
        if (room) openEditRoom(room);
      },
    }),
    [openAdd, openEditRoom, rooms],
  );

  const closeSheet = () => setSheet((s) => ({ ...s, open: false }));

  const loadTemplate = () => {
    if (!onLoadTemplate) return;
    if (!passGate()) return;
    onLoadTemplate();
  };

  const handleDuplicate = (room: Room) => {
    if (!passGate()) return;
    if (onDuplicate) {
      void onDuplicate(room.id);
      return;
    }
    void onAdd(stripRoomId(duplicateRoom(room, () => "")));
  };

  const handleMove = (room: Room, direction: MoveDirection) => {
    const move = groupMove(rooms, room.id, direction);
    if (move && onReorder) onReorder(move.from, move.to);
  };

  const handlers: RoomRowHandlers | undefined = readOnly
    ? undefined
    : {
        onEdit: openEditRoom,
        onDuplicate: handleDuplicate,
        onMove: onReorder ? handleMove : undefined,
        canMove: (room, direction) => groupMove(rooms, room.id, direction) !== null,
        onDelete: (room) => setDeleteState({ open: true, room }),
        onFrequencyChange: (room, frequency) => {
          if (room.frequency === frequency) return;
          void onUpdate(room.id, { ...stripRoomId(room), frequency });
        },
      };

  const total: RoomsTotal = {
    label: totalLabel ?? (footer != null || footerAmounts ? "Gesamt" : "Summe Räume"),
    area: summary.area,
    hoursMonthly: display.total.hoursMonthly,
    priceMonthly: display.total.priceMonthly,
  };
  const shownFooter =
    footer != null ? <RoomsFooterAmountsProvider amounts={display.footer}>{footer}</RoomsFooterAmountsProvider> : undefined;

  // Speichern aus dem Sheet: neue Räume prüfen das Raumlimit erneut
  // (wichtig bei „Speichern & nächster Raum“). Ist das Limit erreicht, schließt
  // das Sheet, bevor `onGateBlocked` z. B. das UpgradeModal öffnet.
  const editRoom = sheet.editRoom;
  const passGateOrClose = (): boolean => {
    const gate = checkRoomLimit();
    if (gate.allowed) return true;
    closeSheet();
    onGateBlocked(gate);
    return false;
  };
  const handleSave = async (room: Omit<Room, "id">): Promise<boolean> => {
    if (editRoom) {
      await onUpdate(editRoom.id, room);
    } else {
      if (!passGateOrClose()) return false;
      await onAdd(room);
    }
    closeSheet();
    return true;
  };
  const handleSaveAndNext = async (room: Omit<Room, "id">): Promise<boolean> => {
    if (!passGateOrClose()) return false;
    await onAdd(room);
    return true;
  };

  const isEmpty = rooms.length === 0;
  const location = mode === "persisted" ? "dem Objekt" : "der Kalkulation";

  return (
    <div className={cn("space-y-3", className)}>
      {!readOnly && !isEmpty && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="tonal" onClick={openAdd}>
            <Plus aria-hidden="true" />
            Raum<span className="sr-only"> hinzufügen</span>
          </Button>
          {onLoadTemplate && (
            <Button type="button" variant="ghost" onClick={loadTemplate}>
              <LayoutTemplate aria-hidden="true" />
              Aus Vorlage
            </Button>
          )}
          <BulkFrequencyMenu onSelect={onSetAllFrequencies} current={current} roomCount={rooms.length} />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {rooms.length} {rooms.length === 1 ? "Raum" : "Räume"} · {formatArea(summary.area, 0)} m²
            </span>
            {toolbarEnd}
          </div>
        </div>
      )}

      {isEmpty ? (
        emptyState ?? (
          <div className="rounded-lg border border-dashed border-border-strong bg-card">
            <StateView
              kind="empty"
              compact
              titleAs="h3"
              title="Noch keine Räume erfasst"
              description={
                readOnly
                  ? "Für dieses Objekt sind keine Räume hinterlegt."
                  : "Erfassen Sie Räume mit Raumart, Fläche und Turnus – der Monatspreis wird live berechnet."
              }
              action={readOnly ? undefined : { label: "Ersten Raum hinzufügen", icon: Plus, onClick: openAdd }}
              secondaryAction={
                !readOnly && onLoadTemplate
                  ? { label: "Vorlage laden", icon: LayoutTemplate, onClick: loadTemplate }
                  : undefined
              }
            />
          </div>
        )
      ) : isMdUp ? (
        <RoomsTable groups={groups} rate={rate} handlers={handlers} footer={shownFooter} total={total} caption={caption} />
      ) : (
        <RoomCardList groups={groups} rate={rate} handlers={handlers} footer={shownFooter} total={total} caption={caption} />
      )}

      {!readOnly && (
        <>
          <RoomEditorSheet
            open={sheet.open}
            onClose={closeSheet}
            editRoom={editRoom}
            hourlyRate={rate}
            onSave={handleSave}
            onSaveAndNext={editRoom ? undefined : handleSaveAndNext}
          />
          <ConfirmDialog
            open={deleteState.open}
            onClose={() => setDeleteState((s) => ({ ...s, open: false }))}
            onConfirm={() => {
              if (deleteState.room) void onDelete(deleteState.room.id);
            }}
            title="Raum entfernen?"
            description={
              deleteState.room ? `„${roomDisplayName(deleteState.room)}“ wird aus ${location} entfernt.` : ""
            }
            confirmLabel="Entfernen"
            destructive
          />
        </>
      )}
    </div>
  );
});
