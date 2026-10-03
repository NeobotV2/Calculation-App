import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { RoomsEditor } from "@/components/calc/RoomsEditor";
import { SetupTimeEditor } from "@/components/calc/SetupTimeEditor";
import { getRoomLimit, getUpgradeTriggerReason, type GateResult } from "@/lib/feature-gates";
import type { FlowStepProps } from "../flow-steps";

/**
 * Schritt 3 · Räume & Turnus: RoomsEditor im Entwurfsmodus (Raumlimit gegen
 * die Entwurfsräume) und Rüst-/Wegezeit je Einsatz.
 */
export function StepRaeume({ mode, draft, dispatch, econ, openUpgrade, openTemplatePicker }: FlowStepProps) {
  const roomCountRef = React.useRef(draft.rooms.length);
  roomCountRef.current = draft.rooms.length;

  const checkRoomLimit = React.useCallback(
    (): GateResult =>
      roomCountRef.current >= getRoomLimit() ? getUpgradeTriggerReason("room_limit") : { allowed: true },
    [],
  );

  return (
    <div className="space-y-6">
      <RoomsEditor
        mode="draft"
        rooms={draft.rooms}
        rate={econ.effectiveRate}
        caption="Räume der Kalkulation"
        onAdd={(room) => {
          roomCountRef.current += 1;
          dispatch({ type: "addRoom", room: { ...room, id: uuidv4() } });
        }}
        onUpdate={(id, room) => dispatch({ type: "updateRoom", id, room })}
        onDelete={(id) => dispatch({ type: "deleteRoom", id })}
        onDuplicate={(id) => {
          roomCountRef.current += 1;
          dispatch({ type: "duplicateRoom", id, newId: uuidv4() });
          toast.success("Raum dupliziert");
        }}
        onReorder={mode === "create" ? (from, to) => dispatch({ type: "moveRoom", from, to }) : undefined}
        onSetAllFrequencies={(frequency) => dispatch({ type: "setAllFrequencies", frequency })}
        checkRoomLimit={checkRoomLimit}
        onGateBlocked={openUpgrade}
        onLoadTemplate={openTemplatePicker}
      />

      <div id="ruestzeit" tabIndex={-1} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <SetupTimeEditor
          ruestzeit={draft.ruestzeit}
          wegezeit={draft.wegezeit}
          onChange={(v) => dispatch({ type: "setSetupTime", ruestzeit: v.ruestzeit, wegezeit: v.wegezeit })}
          rooms={draft.rooms}
          rate={econ.effectiveRate}
          isDefault={draft.ruestzeitIsDefault}
        />
      </div>
    </div>
  );
}
