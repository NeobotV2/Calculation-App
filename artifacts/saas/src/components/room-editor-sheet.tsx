import * as React from "react";
import { CircleCheck, ChevronDown, Lock, Ruler, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { NumberInput } from "@/components/ui/number-input";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UpgradeModal } from "@/components/upgrade-modal";
import { FrequencySelect } from "@/components/calc/rooms/FrequencySelect";
import { buildRoom, roomTypeFromRoom, type RoomTypeLike } from "@/components/calc/rooms/rooms-editor-logic";
import { DEFAULT_ROOM_GROUPS, DEFAULT_ROOM_TYPES } from "@/data/room-types";
import {
  SURCHARGE_DEFINITIONS,
  getSurchargeEffectLabel,
  getTotalModifier,
  type SurchargeCategory,
} from "@/data/surcharges";
import { calcRoom, getEffectivePerformance } from "@/lib/calc";
import { canOverridePerformance } from "@/lib/feature-gates";
import { useMediaQuery } from "@/lib/theme";
import { MEDIA } from "@/lib/tokens";
import { cn, formatNumber } from "@/lib/utils";
import { useStore, type FrequencyKey, type Room } from "@/store/use-store";

/** Rückgabe `false` = nicht gespeichert (z. B. Raumlimit) – Eingaben bleiben stehen. */
type SaveResult = void | boolean;

interface RoomEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Speichern. Darf ein Promise liefern (Button zeigt dann „lädt“; bei Fehler
   * bleibt das Sheet mit Fehlermeldung offen). Das Schließen übernimmt der Aufrufer.
   */
  onSave: (room: Omit<Room, "id">) => SaveResult | Promise<SaveResult>;
  editRoom?: Room;
  hourlyRate: number;
  /**
   * Optional (nur beim Hinzufügen): „Speichern & nächster Raum“. Der Aufrufer
   * fügt den Raum hinzu und lässt das Sheet offen; Raumart, Turnus und
   * Zu-/Abschläge bleiben, Bezeichnung und Fläche werden geleert.
   */
  onSaveAndNext?: (room: Omit<Room, "id">) => SaveResult | Promise<SaveResult>;
}

interface FormState {
  name: string;
  typeId: string;
  area: number | undefined;
  length: number | undefined;
  width: number | undefined;
  frequency: FrequencyKey;
  customPerformance: number | undefined;
  soilingLevel: string | undefined;
  furnishingLevel: string | undefined;
  floorType: string | undefined;
}

function initialForm(editRoom: Room | undefined, defaultFrequency: FrequencyKey): FormState {
  if (editRoom) {
    return {
      name: editRoom.name,
      typeId: editRoom.typeId,
      area: editRoom.area,
      length: undefined,
      width: undefined,
      frequency: editRoom.frequency,
      customPerformance: editRoom.customPerformance ? editRoom.customPerformance : undefined,
      soilingLevel: editRoom.soilingLevel,
      furnishingLevel: editRoom.furnishingLevel,
      floorType: editRoom.floorType,
    };
  }
  return {
    name: "",
    typeId: DEFAULT_ROOM_TYPES[0].id,
    area: undefined,
    length: undefined,
    width: undefined,
    frequency: defaultFrequency,
    customPerformance: undefined,
    soilingLevel: undefined,
    furnishingLevel: undefined,
    floorType: undefined,
  };
}

function sameForm(a: FormState, b: FormState): boolean {
  return (Object.keys(a) as (keyof FormState)[]).every((k) => (a[k] ?? "") === (b[k] ?? ""));
}

function areaFromDims(length: number | undefined, width: number | undefined): number | undefined {
  if (length !== undefined && width !== undefined && length > 0 && width > 0) {
    return Number((length * width).toFixed(1));
  }
  return undefined;
}

/**
 * Raum anlegen oder bearbeiten (ResponsiveSheet: Phone-Drawer, ab md rechtes
 * Sheet). Raumart-Auswahl klappt nach der Wahl zu einer Zeile zusammen,
 * Zu-/Abschläge zeigen ihre Zeitwirkung, die Preisvorschau rechnet live mit
 * `calcRoom`. Ungespeicherte Eingaben werden beim Schließen abgefragt.
 */
export function RoomEditorSheet({ open, onClose, onSave, editRoom, hourlyRate, onSaveAndNext }: RoomEditorSheetProps) {
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const customRoomTypes = useStore((s) => s.customRoomTypes);
  const isCoarse = useMediaQuery(MEDIA.coarse);

  // ── Sitzung: Formular beim Öffnen (synchron) zurücksetzen ──────────────
  const [session, setSession] = React.useState<{ open: boolean; editRoom?: Room }>({ open: false });
  const [form, setForm] = React.useState<FormState>(() => initialForm(editRoom, defaultFrequency));
  const [baseline, setBaseline] = React.useState<FormState>(form);
  const [pickerOpen, setPickerOpen] = React.useState(!editRoom);
  const [showSurcharges, setShowSurcharges] = React.useState(false);
  const [showDims, setShowDims] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<null | "save" | "next">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [areaError, setAreaError] = React.useState<string | null>(null);
  const [addedNames, setAddedNames] = React.useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  if (open && (!session.open || session.editRoom?.id !== editRoom?.id)) {
    const next = initialForm(editRoom, defaultFrequency);
    setSession({ open: true, editRoom });
    setForm(next);
    setBaseline(next);
    setPickerOpen(!editRoom);
    setShowSurcharges(!!(editRoom && (editRoom.soilingLevel || editRoom.furnishingLevel || editRoom.floorType)));
    setShowDims(false);
    setSearchQuery("");
    setGroupFilter(null);
    setSaving(null);
    setError(null);
    setAreaError(null);
    setAddedNames([]);
  } else if (!open && session.open) {
    // editRoom der Sitzung behalten, damit Titel/Felder beim Schließen nicht springen
    setSession((s) => ({ ...s, open: false }));
  }

  const formRef = React.useRef(form);
  React.useEffect(() => {
    formRef.current = form;
  });

  const isEdit = !!session.editRoom;
  const ids = React.useId();
  const formId = `${ids}-form`;
  const areaRef = React.useRef<HTMLInputElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ── Raumarten ──────────────────────────────────────────────────────────
  const allRoomTypes = React.useMemo<RoomTypeLike[]>(
    () => [...DEFAULT_ROOM_TYPES, ...customRoomTypes],
    [customRoomTypes],
  );
  const allGroups = React.useMemo(() => {
    const groupIds = new Set(allRoomTypes.map((t) => t.groupId));
    return DEFAULT_ROOM_GROUPS.filter((g) => groupIds.has(g.id));
  }, [allRoomTypes]);
  const filteredRoomTypes = React.useMemo(() => {
    let types = allRoomTypes;
    if (groupFilter) types = types.filter((t) => t.groupId === groupFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) types = types.filter((t) => t.name.toLowerCase().includes(q) || t.groupName.toLowerCase().includes(q));
    return types;
  }, [allRoomTypes, groupFilter, searchQuery]);

  // Raumart eines bestehenden Raums bleibt erhalten, auch wenn sie nicht (mehr) im Katalog steht.
  const editType = session.editRoom ? roomTypeFromRoom(session.editRoom) : undefined;
  const selectedType: RoomTypeLike =
    allRoomTypes.find((t) => t.id === form.typeId) ??
    (editType && editType.id === form.typeId ? editType : DEFAULT_ROOM_TYPES[0]);

  // ── Ableitungen ────────────────────────────────────────────────────────
  const areaNum = form.area !== undefined && form.area > 0 ? form.area : 0;
  const totalModifier = getTotalModifier(form);
  const draftRoom = buildRoom({
    name: form.name,
    type: selectedType,
    area: areaNum,
    frequency: form.frequency,
    customPerformance: form.customPerformance,
    soilingLevel: form.soilingLevel,
    furnishingLevel: form.furnishingLevel,
    floorType: form.floorType,
  });
  const previewRoom: Room = { ...draftRoom, id: "preview" };
  const preview = areaNum > 0 ? calcRoom(previewRoom, hourlyRate) : null;
  const effectivePerformance = getEffectivePerformance(previewRoom);
  const basePerformance = draftRoom.customPerformance || selectedType.performanceValue;
  const dirty = session.open && !sameForm(form, baseline);
  const overrideGate = canOverridePerformance();
  const canSaveAndNext = !isEdit && !!onSaveAndNext;

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const setDims = (patch: { length?: number | undefined; width?: number | undefined }) =>
    setForm((f) => {
      const next = { ...f, ...patch };
      const area = areaFromDims(next.length, next.width);
      return area !== undefined ? { ...next, area } : next;
    });

  const pickType = (id: string) => {
    update({ typeId: id });
    setPickerOpen(false);
  };

  const openPicker = () => {
    setPickerOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const setSurcharge = (category: SurchargeCategory, value: string | undefined) => {
    update({ [category]: value } as Partial<FormState>);
  };

  // ── Speichern ──────────────────────────────────────────────────────────
  const savingRef = React.useRef(false);
  const commit = async (kind: "save" | "next") => {
    if (savingRef.current) return;
    if (!(areaNum > 0)) {
      setAreaError("Bitte geben Sie eine Fläche größer als 0 m² ein.");
      areaRef.current?.focus();
      return;
    }
    const room = draftRoom;
    savingRef.current = true;
    setSaving(kind);
    setError(null);
    try {
      const handler = kind === "next" && onSaveAndNext ? onSaveAndNext : onSave;
      const result = await handler(room);
      if (result === false) return;
      if (kind === "next") {
        const next: FormState = { ...formRef.current, name: "", area: undefined, length: undefined, width: undefined };
        setForm(next);
        setBaseline(next);
        setAreaError(null);
        setAddedNames((list) => [...list, room.name]);
        window.setTimeout(() => areaRef.current?.focus(), 0);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Der Raum konnte nicht gespeichert werden.");
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void commit("save");
  };

  const lastAdded = addedNames[addedNames.length - 1];

  const footer = (
    <>
      {canSaveAndNext && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void commit("next")}
          loading={saving === "next"}
          disabled={saving !== null && saving !== "next"}
        >
          Speichern &amp; nächster Raum
        </Button>
      )}
      <Button
        type="submit"
        form={formId}
        loading={saving === "save"}
        disabled={saving !== null && saving !== "save"}
      >
        {isEdit ? "Änderungen speichern" : "Raum hinzufügen"}
      </Button>
    </>
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
        title={isEdit ? "Raum bearbeiten" : "Neuer Raum"}
        description={
          isEdit
            ? "Raumart, Fläche, Turnus und Leistung anpassen – die Vorschau rechnet live mit."
            : "Raumart, Fläche und Turnus erfassen – der Preis wird live berechnet."
        }
        size="md"
        dirty={dirty}
        footer={footer}
        onOpenAutoFocus={(event) => {
          if (isCoarse) return;
          event.preventDefault();
          if (isEdit || !pickerOpen) areaRef.current?.focus();
          else searchRef.current?.focus();
        }}
      >
        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">
          <div role="status" aria-live="polite" className="empty:hidden">
            {lastAdded !== undefined && (
              <p className="flex items-center gap-2 text-sm text-success">
                <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  „{lastAdded}“ hinzugefügt
                  {addedNames.length > 1 ? ` (${addedNames.length} Räume in dieser Erfassung)` : ""}. Erfassen Sie
                  den nächsten Raum.
                </span>
              </p>
            )}
          </div>

          {error && (
            <Callout tone="critical" title="Speichern fehlgeschlagen" live>
              {error}
            </Callout>
          )}

          {/* Raumart */}
          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-label text-muted-foreground">Raumart</legend>
            {pickerOpen ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    ref={searchRef}
                    type="search"
                    aria-label="Raumart suchen"
                    placeholder="Raumart suchen …"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const first = filteredRoomTypes[0];
                        if (first) pickType(first.id);
                      }
                    }}
                    className="pl-9"
                  />
                </div>
                <ToggleGroup
                  type="single"
                  variant="chip"
                  size="sm"
                  aria-label="Raumgruppe filtern"
                  value={groupFilter ?? "alle"}
                  onValueChange={(v) => setGroupFilter(v && v !== "alle" ? v : null)}
                  className="-mx-4 flex-nowrap justify-start overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-6 md:px-6"
                >
                  <ToggleGroupItem value="alle" className="shrink-0">
                    Alle
                  </ToggleGroupItem>
                  {allGroups.map((g) => (
                    <ToggleGroupItem key={g.id} value={g.id} className="shrink-0">
                      {g.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <div role="group" aria-label="Raumarten" className="grid grid-cols-2 gap-2">
                  {filteredRoomTypes.map((t) => {
                    const selected = t.id === form.typeId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => pickType(t.id)}
                        className={cn(
                          "flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        <span className="w-full truncate font-medium">{t.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{t.performanceValue} m²/h</span>
                      </button>
                    );
                  })}
                  {filteredRoomTypes.length === 0 && (
                    <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">
                      Keine Raumart gefunden. Passen Sie Suche oder Filter an.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium text-foreground">{selectedType.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatNumber(selectedType.performanceValue, 0)} m²/h
                    </span>
                  </p>
                  {selectedType.groupName && (
                    <p className="truncate text-xs text-muted-foreground">{selectedType.groupName}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openPicker}
                  aria-label={`Raumart ändern (aktuell: ${selectedType.name})`}
                >
                  ändern
                </Button>
              </div>
            )}
          </fieldset>

          <FormField id={`${ids}-name`} label="Bezeichnung (optional)">
            <Input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder={selectedType.name}
              autoComplete="off"
            />
          </FormField>

          <div className="space-y-2">
            <FormField
              id={`${ids}-area`}
              label="Fläche"
              required
              error={areaError}
              hint={areaNum > 0 ? undefined : "Geben Sie eine Fläche ein, um den Raum zu speichern."}
            >
              <NumberInput
                // nach „Speichern & nächster Raum“ neu aufbauen, damit das Feld sicher leer ist
                key={`area-${addedNames.length}`}
                ref={areaRef}
                value={form.area}
                onValueChange={(v) => {
                  update({ area: v });
                  if (v !== undefined && v > 0) setAreaError(null);
                }}
                unit="m²"
                decimals={2}
                min={0}
                placeholder="0"
                inputSize="lg"
                className="font-semibold text-h3 md:text-h3"
              />
            </FormField>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={showDims}
              aria-controls={`${ids}-dims`}
              onClick={() => setShowDims((v) => !v)}
              className="-ml-2 text-muted-foreground"
            >
              <Ruler aria-hidden="true" />
              Aus Länge × Breite berechnen
            </Button>
            {showDims && (
              <div id={`${ids}-dims`} className="grid grid-cols-2 gap-3">
                <FormField id={`${ids}-length`} label="Länge">
                  <NumberInput key={`length-${addedNames.length}`} value={form.length} onValueChange={(v) => setDims({ length: v })} unit="m" min={0} placeholder="–" />
                </FormField>
                <FormField id={`${ids}-width`} label="Breite">
                  <NumberInput key={`width-${addedNames.length}`} value={form.width} onValueChange={(v) => setDims({ width: v })} unit="m" min={0} placeholder="–" />
                </FormField>
                <p className="col-span-2 text-xs text-muted-foreground">Länge × Breite ergibt die Fläche (gerundet auf 0,1 m²).</p>
              </div>
            )}
          </div>

          <FormField id={`${ids}-frequency`} label="Turnus">
            <FrequencySelect value={form.frequency} onValueChange={(f) => update({ frequency: f })} />
          </FormField>

          {/* Leistungswert */}
          {overrideGate.allowed ? (
            <FormField
              id={`${ids}-perf`}
              label="Eigener Leistungswert"
              hint={`Leer lassen für den Richtwert der Raumart (${formatNumber(selectedType.performanceValue, 0)} m²/h).`}
            >
              <NumberInput
                value={form.customPerformance}
                onValueChange={(v) => update({ customPerformance: v })}
                unit="m²/h"
                decimals={1}
                min={0}
                placeholder={String(selectedType.performanceValue)}
              />
            </FormField>
          ) : (
            <div className="space-y-1.5">
              <p className="text-label text-muted-foreground">Eigener Leistungswert</p>
              <div className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-surface-sunken px-3 py-2">
                <Lock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {form.customPerformance
                    ? `${formatNumber(form.customPerformance, 0)} m²/h (bleibt erhalten)`
                    : `Richtwert ${formatNumber(selectedType.performanceValue, 0)} m²/h`}
                </p>
                <Badge tone="brand" size="sm">
                  Pro
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={() => setUpgradeOpen(true)}>
                  Freischalten
                </Button>
              </div>
            </div>
          )}

          {/* Zu-/Abschläge */}
          <div className="rounded-lg border border-border">
            <button
              type="button"
              aria-expanded={showSurcharges}
              aria-controls={`${ids}-surcharges`}
              onClick={() => setShowSurcharges((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-4 py-2 text-left text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />
                Zu-/Abschläge
                {totalModifier !== 0 && (
                  <Badge tone="neutral" size="sm">
                    {getSurchargeEffectLabel(totalModifier)}
                  </Badge>
                )}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", showSurcharges && "rotate-180")}
              />
            </button>
            {showSurcharges && (
              <div id={`${ids}-surcharges`} className="space-y-4 border-t border-border px-4 py-4">
                {SURCHARGE_DEFINITIONS.map((def) => {
                  const labelId = `${ids}-sc-${def.category}`;
                  return (
                    <div key={def.category} className="space-y-1.5">
                      <p id={labelId} className="text-label text-muted-foreground">
                        {def.label}
                      </p>
                      <ToggleGroup
                        type="single"
                        variant="chip"
                        size="sm"
                        aria-labelledby={labelId}
                        className="justify-start"
                        value={form[def.category] ?? def.defaultId}
                        onValueChange={(v) => setSurcharge(def.category, !v || v === def.defaultId ? undefined : v)}
                      >
                        {def.options.map((opt) => (
                          <ToggleGroupItem key={opt.id} value={opt.id}>
                            {opt.label}
                            {opt.modifier !== 0 && (
                              <span className="font-normal text-muted-foreground">· {getSurchargeEffectLabel(opt.modifier)}</span>
                            )}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  );
                })}
                <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Basis</dt>
                    <dd className="font-medium tabular-nums text-foreground">{formatNumber(basePerformance, 0)} m²/h</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Anpassung</dt>
                    <dd className="font-medium text-foreground">{getSurchargeEffectLabel(totalModifier)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Effektiv</dt>
                    <dd className="font-medium tabular-nums text-foreground">{formatNumber(effectivePerformance, 0)} m²/h</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Live-Vorschau */}
          <section aria-label="Preisvorschau" className="rounded-lg border border-border bg-surface-sunken p-4">
            {preview ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-label text-muted-foreground">Preis / Monat</dt>
                  <dd>
                    <Money value={preview.monthlyCost} size="kpi" />
                  </dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Std. / Monat</dt>
                  <dd className="text-sm font-medium tabular-nums text-foreground">{formatNumber(preview.monthlyHours, 1)} h</dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Min. / Reinigung</dt>
                  <dd className="text-sm font-medium tabular-nums text-foreground">
                    {formatNumber(preview.timePerCleaning * 60, 0)} Min.
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Die Preisvorschau erscheint, sobald eine Fläche eingegeben ist.
              </p>
            )}
          </section>
        </form>
      </ResponsiveSheet>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={overrideGate.reason || ""}
        triggerReason="performance_override"
      />
    </>
  );
}
