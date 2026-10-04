import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { ResponsiveSheet, ResponsiveSheetCancel } from "@/components/ui/responsive-sheet";
import { NativeSelect } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useStoreActions } from "@/hooks/use-store-actions";
import { isPaidPlan, type PlanId } from "@/lib/billing-config";
import { formatNumber } from "@/lib/utils";
import { DEFAULT_ROOM_GROUPS } from "@/data/room-types";
import type { CustomRoomType } from "@/store/use-store";
import { ProLock } from "./ProLock";

interface RoomTypesSectionProps {
  plan: PlanId;
  customRoomTypes: CustomRoomType[];
}

interface RoomTypeDraft {
  name: string;
  groupId: string;
  performance: number | undefined;
}

const emptyDraft = (): RoomTypeDraft => ({ name: "", groupId: DEFAULT_ROOM_GROUPS[0].id, performance: undefined });

/** Eigene Raumarten (Pro-Plan); Anlegen, Bearbeiten und Löschen wirken sofort. */
export function RoomTypesSection({ plan, customRoomTypes }: RoomTypesSectionProps) {
  const actions = useStoreActions();
  const paid = isPaidPlan(plan);
  const [editing, setEditing] = useState<CustomRoomType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<RoomTypeDraft>(emptyDraft);
  const [initial, setInitial] = useState<RoomTypeDraft>(emptyDraft);
  const [errors, setErrors] = useState<{ name?: string; performance?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRoomType | null>(null);

  const openEditor = (rt: CustomRoomType | null) => {
    const next = rt ? { name: rt.name, groupId: rt.groupId, performance: rt.performanceValue } : emptyDraft();
    setEditing(rt);
    setDraft(next);
    setInitial(next);
    setErrors({});
    setSheetOpen(true);
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const handleSave = async () => {
    const nextErrors: typeof errors = {};
    if (!draft.name.trim()) nextErrors.name = "Bitte geben Sie einen Namen ein.";
    if (draft.performance === undefined || !(draft.performance > 0)) {
      nextErrors.performance = "Bitte geben Sie einen Leistungswert größer als 0 ein.";
    }
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.performance) {
      document.getElementById(nextErrors.name ? "room-type-name" : "room-type-perf")?.focus();
      return;
    }
    const group = DEFAULT_ROOM_GROUPS.find((g) => g.id === draft.groupId) ?? DEFAULT_ROOM_GROUPS[0];
    const data = {
      name: draft.name.trim(),
      groupId: group.id,
      groupName: group.name,
      performanceValue: draft.performance as number,
    };
    setSaving(true);
    try {
      if (editing) {
        await actions.updateCustomRoomType(editing.id, data);
        toast.success("Raumart aktualisiert");
      } else {
        await actions.addCustomRoomType(data);
        toast.success("Raumart hinzugefügt");
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Die Raumart konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rt: CustomRoomType) => {
    try {
      await actions.deleteCustomRoomType(rt.id);
      toast.success("Raumart entfernt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Die Raumart konnte nicht gelöscht werden.");
    }
  };

  return (
    <Card as="section" aria-labelledby="settings-room-types-title">
      <CardHeader
        title={<span id="settings-room-types-title">Eigene Raumarten</span>}
        description="Ergänzen Sie den Katalog um Raumarten mit Ihren eigenen Leistungswerten."
        action={
          paid ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => openEditor(null)}>
              <Plus aria-hidden="true" />
              Raumart hinzufügen
            </Button>
          ) : undefined
        }
      />

      {!paid ? (
        <ProLock
          title="Eigene Raumarten im Pro-Plan"
          description="Legen Sie eigene Raumarten an, die zu Ihren Objekten passen."
        />
      ) : customRoomTypes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong p-4 text-center">
          <p className="text-sm text-muted-foreground">Noch keine eigenen Raumarten angelegt.</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => openEditor(null)}>
            <Plus aria-hidden="true" />
            Erste Raumart anlegen
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {customRoomTypes.map((rt) => (
            <li key={rt.id} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{rt.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {rt.groupName} · {formatNumber(rt.performanceValue, 0)} m²/h
                </p>
              </div>
              <IconButton label={`Raumart „${rt.name}“ bearbeiten`} icon={Pencil} size="sm" onClick={() => openEditor(rt)} />
              <IconButton
                label={`Raumart „${rt.name}“ löschen`}
                icon={Trash2}
                size="sm"
                variant="destructive-ghost"
                onClick={() => setDeleteTarget(rt)}
              />
            </li>
          ))}
        </ul>
      )}

      <ResponsiveSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Raumart bearbeiten" : "Raumart hinzufügen"}
        description="Der Leistungswert gibt an, wie viele m² pro Stunde gereinigt werden."
        dirty={dirty && !saving}
        footer={
          <div className="flex w-full justify-end gap-2">
            <ResponsiveSheetCancel disabled={saving} />
            <Button type="button" onClick={() => void handleSave()} loading={saving}>
              {editing ? "Speichern" : "Hinzufügen"}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <FormField id="room-type-name" label="Name" required error={errors.name}>
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} autoComplete="off" />
          </FormField>
          <FormField id="room-type-group" label="Raumgruppe">
            <NativeSelect value={draft.groupId} onChange={(e) => setDraft((d) => ({ ...d, groupId: e.target.value }))}>
              {DEFAULT_ROOM_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="room-type-perf" label="Leistungswert" required error={errors.performance}>
            <NumberInput
              value={draft.performance}
              onValueChange={(v) => setDraft((d) => ({ ...d, performance: v }))}
              unit="m²/h"
              decimals={0}
              min={0}
            />
          </FormField>
          <button type="submit" className="sr-only" tabIndex={-1}>
            Speichern
          </button>
        </form>
      </ResponsiveSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        title="Raumart löschen?"
        description="Die eigene Raumart wird unwiderruflich entfernt. Bestehende Räume, die diese Raumart verwenden, bleiben erhalten."
        confirmLabel="Löschen"
        destructive
      />
    </Card>
  );
}
