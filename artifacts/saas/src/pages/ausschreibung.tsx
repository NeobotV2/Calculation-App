import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Download,
  Ellipsis,
  FilePlus2,
  FileUp,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useStore, type Room } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { AppFooter } from "@/components/layout/AppFooter";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Kpi } from "@/components/ui/kpi";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { NumberInput } from "@/components/ui/number-input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canAddProject } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { parseLvFile } from "@/lib/lv-import";
import { calcTenderScenarios, type ScenarioKey } from "@/lib/tender-calc";
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { isDefaultRateSetting } from "@/lib/object-economics";
import { calcPriceStrategy } from "@/lib/price-strategy";
import { calcRiskScore } from "@/lib/risk-score";
import { calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { calcDraftFromTender, isCalcDraftEmpty } from "@/lib/drafts";
import { marginTone, riskLabel, riskTone, strategyLabel, strategyTone } from "@/lib/status";
import { cn, formatCurrency, formatNumber, parseDecimal } from "@/lib/utils";
import { trackTenderImported, trackTenderConverted } from "@/services/analytics-service";
import { formatPercent } from "@/pages/auswertung/portfolio";
import { downloadSampleCsv } from "./ausschreibung/sample-csv";
import { formatDraftTime, useTenderDraft } from "./ausschreibung/use-tender-draft";

/* ─────────────────────────────────────────────────────────────────────────
   Ausschreibungs-Kalkulation: LV-Datei (CSV/JSON) importieren und eine
   Bieterspanne (Mindest-/Mittel-/Höchstwert) berechnen. Der Mittelwert wird
   als Kalkulation in den Flow übernommen („Übernehmen & prüfen") oder direkt
   als Objekt angelegt. Der Seitenzustand liegt im Store-Entwurf `tenderDraft`.
   ───────────────────────────────────────────────────────────────────────── */

const newId = () => `tender-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const TENDER_NOTE = "Aus Ausschreibungs-Kalkulation übernommen";

const SCENARIO_ORDER: ScenarioKey[] = ["min", "mid", "max"];

const SCENARIO_NOTES: Record<ScenarioKey, string> = {
  min: "Aggressiv – knappe Reserven",
  mid: "Kalkulatorische Empfehlung",
  max: "Konservativ – volle Reserven",
};

/** Nur die Raumfelder (ohne Import-Metadaten wie `matched`/`sourceName`). */
function toRoom(r: Omit<Room, "id">, id: string): Room {
  return {
    id,
    name: r.name,
    typeId: r.typeId,
    typeName: r.typeName,
    groupId: r.groupId,
    groupName: r.groupName,
    area: r.area,
    frequency: r.frequency,
    typePerformance: r.typePerformance,
    ...(r.customPerformance !== undefined ? { customPerformance: r.customPerformance } : {}),
    ...(r.soilingLevel !== undefined ? { soilingLevel: r.soilingLevel } : {}),
    ...(r.furnishingLevel !== undefined ? { furnishingLevel: r.furnishingLevel } : {}),
    ...(r.floorType !== undefined ? { floorType: r.floorType } : {}),
  };
}

/** Prozentfeld als Text im Entwurf (Dezimalkomma). */
const toInput = (v: number | undefined) => (v === undefined ? "" : String(v).replace(".", ","));

interface RoomLine {
  room: Room;
  hours: number;
  cost: number;
  perf: number;
}

export default function Ausschreibung() {
  const [, setLocation] = useLocation();
  const hourlyRate = useStore((s) => s.hourlyRate);
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const targetMargin = useStore((s) => s.targetMargin);
  const confirmedHourlyRate = useStore((s) => s.confirmedHourlyRate);
  const calcDraft = useStore((s) => s.calcDraft);
  const setCalcDraft = useStore((s) => s.setCalcDraft);
  const actions = useStoreActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { draft, update, clear, savedAt, isEmpty } = useTenderDraft();
  const { tenderName, rooms, warnings, fileName, rateInput, perfSpread, rateSpread } = draft;

  const [dragOver, setDragOver] = useState(false);
  const [showRiskFactors, setShowRiskFactors] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);

  const baseRate = useMemo(() => {
    const parsed = parseFloat(rateInput.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : hourlyRate;
  }, [rateInput, hourlyRate]);

  const result = useMemo(
    () =>
      calcTenderScenarios(rooms, baseRate, {
        perfSpreadPct: parseFloat(perfSpread.replace(",", ".")),
        rateSpreadPct: parseFloat(rateSpread.replace(",", ".")),
      }),
    [rooms, baseRate, perfSpread, rateSpread],
  );

  const vollkosten = useMemo(() => calcHourlyRate(hourlyRateConfig).vollkosten, [hourlyRateConfig]);

  // Wirtschaftlichkeit & Risiko des Mittelwert-Szenarios — die „rote Linie"
  // für die Vergabe: darunter sollte kein Gebot abgegeben werden.
  const wirtschaft = useMemo(() => {
    const mid = result.scenarios.mid;
    const strategy = calcPriceStrategy({
      monthlyHours: mid.hours,
      area: result.area,
      effectiveRate: baseRate,
      vollkosten,
      targetMarkupPct: targetMargin,
    });
    const risk = calcRiskScore({
      project: {
        id: "tender",
        name: tenderName || "Ausschreibung",
        status: "active",
        createdAt: "",
        updatedAt: "",
        rooms,
      },
      monthlyHours: mid.hours,
      area: result.area,
      monthlyCost: mid.cost,
      marginPct: strategy.marginPct,
      targetMarginPct: strategy.targetMarginPct,
      usesDefaultRate: !rateInput.trim() && isDefaultRateSetting(hourlyRate, hourlyRateConfig, confirmedHourlyRate),
    });
    return { strategy, risk };
  }, [vollkosten, result, baseRate, targetMargin, rooms, tenderName, rateInput, hourlyRate, hourlyRateConfig, confirmedHourlyRate]);

  // Wirtschaftlichkeit je Szenario (gleiche Preisstrategie, jeweiliger Satz).
  const scenarioStrategies = useMemo(
    () =>
      Object.fromEntries(
        SCENARIO_ORDER.map((key) => {
          const s = result.scenarios[key];
          return [
            key,
            calcPriceStrategy({
              monthlyHours: s.hours,
              area: result.area,
              effectiveRate: s.rate,
              vollkosten,
              targetMarkupPct: targetMargin,
            }),
          ];
        }),
      ) as Record<ScenarioKey, ReturnType<typeof calcPriceStrategy>>,
    [result, vollkosten, targetMargin],
  );

  const lines = useMemo<RoomLine[]>(
    () =>
      rooms.map((room) => {
        const rc = calcRoom(room, baseRate);
        return { room, hours: rc.monthlyHours, cost: rc.monthlyCost, perf: rc.effectivePerformance };
      }),
    [rooms, baseRate],
  );

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseLvFile(text, file.name, defaultFrequency);
      if (parsed.rooms.length === 0) {
        toast.error(parsed.warnings[0] || "Keine Räume in der Datei gefunden.");
        update({ warnings: parsed.warnings });
        return;
      }
      update((d) => ({
        rooms: parsed.rooms.map((r) => toRoom(r, newId())),
        warnings: parsed.warnings,
        fileName: file.name,
        tenderName: d.tenderName.trim() ? d.tenderName : file.name.replace(/\.(csv|json|txt)$/i, ""),
      }));
      trackTenderImported(parsed.rooms.length);
      toast.success(`${parsed.rooms.length} Räume importiert`);
    };
    reader.onerror = () => toast.error("Die Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const openRoomEditor = (room?: Room) => {
    setEditingRoom(room);
    setSheetOpen(true);
  };

  const handleSaveRoom = (room: Omit<Room, "id">) => {
    const target = editingRoom;
    update((d) => ({
      rooms: target
        ? d.rooms.map((r) => (r.id === target.id ? toRoom(room, r.id) : r))
        : [...d.rooms, toRoom(room, newId())],
    }));
    setSheetOpen(false);
    setEditingRoom(undefined);
  };

  const handleSaveRoomAndNext = (room: Omit<Room, "id">) => {
    update((d) => ({ rooms: [...d.rooms, toRoom(room, newId())] }));
  };

  /** Bisheriger Weg: direkt als Objekt anlegen (unverändert inkl. Gate und Tracking). */
  const handleConvert = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeTrigger(gate.trigger);
      setUpgradeOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const name = tenderName.trim() || "Ausschreibung";
      const id = await actions.addProject(name);
      const updates: Record<string, unknown> = { notes: TENDER_NOTE };
      if (rateInput.trim() && baseRate !== hourlyRate) updates.hourlyRate = baseRate;
      await actions.updateProject(id, updates);
      for (const room of rooms) {
        const { id: _rid, ...roomData } = room;
        await actions.addRoom(id, roomData);
      }
      trackTenderConverted(rooms.length);
      toast.success("Als Objekt übernommen");
      setLocation(`/objekte/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Die Ausschreibung konnte nicht übernommen werden.");
    } finally {
      setIsSaving(false);
    }
  };

  /** „Übernehmen & prüfen": Entwurf für den Kalkulations-Flow, Start bei „Objekt". */
  const startFlow = () => {
    setCalcDraft(
      calcDraftFromTender(
        {
          name: tenderName.trim(),
          rooms,
          hourlyRate: rateInput.trim() && baseRate !== hourlyRate ? baseRate : undefined,
          notes: TENDER_NOTE,
        },
        uuidv4,
      ),
    );
    setLocation("/kalkulation/neu/objekt");
  };

  const handleTakeOver = () => {
    if (calcDraft && !isCalcDraftEmpty(calcDraft)) {
      setConfirmReplace(true);
      return;
    }
    startFlow();
  };

  const hasRooms = rooms.length > 0;
  const midStrategy = wirtschaft.strategy;

  const roomColumns: Column<RoomLine>[] = [
    {
      id: "name",
      header: "Position",
      sortable: true,
      sortValue: (l) => l.room.name || l.room.typeName,
      cell: (l) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-foreground">{l.room.name || l.room.typeName}</span>
          <span className="block truncate text-xs text-muted-foreground">{l.room.typeName}</span>
        </span>
      ),
      footer: `${rooms.length} ${rooms.length === 1 ? "Position" : "Positionen"}`,
    },
    {
      id: "group",
      header: "Raumgruppe",
      hideBelow: "xl",
      sortable: true,
      sortValue: (l) => l.room.groupName,
      cell: (l) => l.room.groupName,
    },
    {
      id: "area",
      header: "Fläche",
      unit: "m²",
      numeric: true,
      sortable: true,
      sortValue: (l) => l.room.area,
      cell: (l) => formatNumber(l.room.area, 0),
      footer: formatNumber(result.area, 0),
    },
    {
      id: "frequency",
      header: "Turnus",
      cell: (l) => FREQUENCY_LABELS[l.room.frequency],
    },
    {
      id: "perf",
      header: "Leistung",
      unit: "m²/h",
      numeric: true,
      hideBelow: "lg",
      sortable: true,
      sortValue: (l) => l.perf,
      cell: (l) => formatNumber(l.perf, 0),
    },
    {
      id: "hours",
      header: "Std./Mo",
      numeric: true,
      hideBelow: "lg",
      sortable: true,
      sortValue: (l) => l.hours,
      cell: (l) => formatNumber(l.hours, 1),
      footer: formatNumber(result.scenarios.mid.hours, 1),
    },
    {
      id: "cost",
      header: "Preis/Mo",
      numeric: true,
      sortable: true,
      sortValue: (l) => l.cost,
      cell: (l) => <Money value={l.cost} />,
      footer: <Money value={lines.reduce((s, l) => s + l.cost, 0)} />,
    },
  ];

  const roomActions = (l: RoomLine) => {
    const label = l.room.name || l.room.typeName;
    return (
      <span className="no-print inline-flex items-center gap-1">
        <IconButton label={`Position „${label}“ bearbeiten`} icon={Pencil} size="sm" onClick={() => openRoomEditor(l.room)} />
        <IconButton
          label={`Position „${label}“ entfernen`}
          icon={Trash2}
          size="sm"
          variant="destructive-ghost"
          onClick={() => setDeleteRoomId(l.room.id)}
        />
      </span>
    );
  };

  const headerActions =
    hasRooms || !isEmpty ? (
      <div className="no-print flex items-center gap-2">
        {hasRooms && (
          <>
            <Button type="button" variant="secondary" className="hidden md:inline-flex" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Gebotsübersicht drucken
            </Button>
            <Button type="button" onClick={handleTakeOver} disabled={isSaving}>
              <ArrowRight aria-hidden="true" />
              <span className="sm:hidden">Übernehmen</span>
              <span className="hidden sm:inline">Übernehmen &amp; prüfen</span>
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Weitere Aktionen" icon={Ellipsis} variant="secondary" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            {hasRooms && (
              <>
                <DropdownMenuItem className="md:hidden" onSelect={() => window.print()}>
                  <Printer aria-hidden="true" />
                  Gebotsübersicht drucken
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isSaving} onSelect={() => void handleConvert()}>
                  <FilePlus2 aria-hidden="true" />
                  Direkt als Objekt anlegen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem destructive onSelect={() => setConfirmClear(true)}>
              <RotateCcw aria-hidden="true" />
              Neue Ausschreibung
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) : undefined;

  return (
    <PageTransition>
      <PageShell
        width="wide"
        header={
          <PageHeader
            title="Ausschreibung"
            width="wide"
            subtitle={tenderName.trim() || "Leistungsverzeichnis importieren, Bieterspanne berechnen und als Kalkulation übernehmen"}
            meta={
              savedAt || fileName ? (
                <>
                  {fileName && <span className="truncate">Datei: {fileName}</span>}
                  {savedAt && (
                    <span role="status" className="no-print text-xs">
                      Entwurf gespeichert {formatDraftTime(savedAt)}
                    </span>
                  )}
                </>
              ) : undefined
            }
            actions={headerActions}
          />
        }
      >
        {/* ── Import ──────────────────────────────────────────────── */}
        <Section
          id="tender-import"
          title="Import"
          description="CSV aus Excel (Bezeichnung; Fläche; Häufigkeit) oder JSON"
          className="no-print"
        >
          <Card tone="sunken" className="space-y-4">
            <FormField id="tender-name" label="Name der Ausschreibung" hint="Wird als Objektname übernommen.">
              <Input
                value={tenderName}
                onChange={(e) => update({ tenderName: e.target.value })}
                placeholder="z. B. Ausschreibung Rathaus 2026"
              />
            </FormField>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                dragOver ? "border-primary bg-primary-soft" : "border-border-strong bg-card",
              )}
            >
              <span
                aria-hidden="true"
                className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-primary-soft text-primary"
              >
                <FileUp className="size-5" strokeWidth={2} />
              </span>
              <p className="mb-1 text-sm font-medium text-foreground">
                {fileName ? `Importiert: ${fileName}` : "LV-Datei hierher ziehen oder auswählen"}
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Die App ordnet Raumarten automatisch zu und berechnet Ihre Bieterspanne.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileChange}
                className="sr-only"
                id="tender-file"
                tabIndex={-1}
                aria-label="LV-Datei auswählen"
              />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant={hasRooms ? "secondary" : "primary"} onClick={() => fileInputRef.current?.click()}>
                  <FileUp aria-hidden="true" />
                  {hasRooms ? "Andere Datei wählen" : "Datei wählen"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => openRoomEditor(undefined)}>
                  <Plus aria-hidden="true" />
                  Räume manuell erfassen
                </Button>
              </div>
              <Button type="button" variant="link" size="sm" className="mt-3" onClick={downloadSampleCsv}>
                <Download aria-hidden="true" />
                Beispiel-CSV herunterladen
              </Button>
            </div>

            {warnings.length > 0 && (
              <Callout tone="warning" live title="Hinweise zum Import">
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Callout>
            )}
          </Card>
        </Section>

        {hasRooms && (
          <>
            {/* ── Zuordnung ───────────────────────────────────────── */}
            <Section
              id="tender-mapping"
              title="Zuordnung"
              description={`${rooms.length} ${rooms.length === 1 ? "Position" : "Positionen"} · ${formatNumber(result.area, 0)} m² · Werte zum Mittelwert`}
              action={
                <Button type="button" variant="secondary" size="sm" className="no-print" onClick={() => openRoomEditor(undefined)}>
                  <Plus aria-hidden="true" />
                  Position hinzufügen
                </Button>
              }
            >
              <DataTable<RoomLine>
                caption="Leistungsverzeichnis mit zugeordneten Raumarten"
                columns={roomColumns}
                rows={lines}
                getRowId={(l) => l.room.id}
                density="compact"
                onRowClick={(l) => openRoomEditor(l.room)}
                rowActions={roomActions}
                mobile={(l) => (
                  <ListRow
                    onClick={() => openRoomEditor(l.room)}
                    chevron={false}
                    title={l.room.name || l.room.typeName}
                    meta={`${formatNumber(l.room.area, 0)} m² · ${FREQUENCY_LABELS[l.room.frequency]} · ${l.room.typeName}`}
                    trailing={
                      <>
                        <Money value={l.cost} className="font-medium" />
                        {roomActions(l)}
                      </>
                    }
                  />
                )}
              />
            </Section>

            {/* ── Szenarien ───────────────────────────────────────── */}
            <Section id="tender-scenarios" title="Szenarien" description="Bieterspanne pro Monat, netto">
              <Card padding="sm">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField id="tender-rate" label="Verrechnungssatz" hint={`Leer = Standard (${formatCurrency(hourlyRate)} / Std.)`}>
                    <NumberInput
                      value={parseDecimal(rateInput)}
                      onValueChange={(v) => update({ rateInput: toInput(v) })}
                      unit="€/h"
                      decimals={2}
                      min={0}
                      placeholder={formatNumber(hourlyRate)}
                    />
                  </FormField>
                  <FormField id="tender-perf-spread" label="Leistungsspanne (±)" hint="Unsicherheit der Leistungswerte">
                    <NumberInput
                      value={parseDecimal(perfSpread)}
                      onValueChange={(v) => update({ perfSpread: toInput(v) })}
                      unit="%"
                      decimals={1}
                      min={0}
                      max={90}
                      placeholder="15"
                    />
                  </FormField>
                  <FormField id="tender-rate-spread" label="Satzspanne (±)" hint="Spielraum beim Verrechnungssatz">
                    <NumberInput
                      value={parseDecimal(rateSpread)}
                      onValueChange={(v) => update({ rateSpread: toInput(v) })}
                      unit="%"
                      decimals={1}
                      min={0}
                      max={90}
                      placeholder="10"
                    />
                  </FormField>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {SCENARIO_ORDER.map((key) => {
                  const s = result.scenarios[key];
                  const st = scenarioStrategies[key];
                  const recommended = key === "mid";
                  return (
                    <Card key={key} as="article" tone={recommended ? "brand" : "default"} aria-labelledby={`tender-scn-${key}`}>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <h3 id={`tender-scn-${key}`} className="text-h3 text-foreground">
                          {s.label}
                        </h3>
                        {recommended && (
                          <Badge tone="brand" size="sm">
                            Empfohlen
                          </Badge>
                        )}
                      </div>
                      <Kpi
                        label="Monatspreis"
                        value={<Money value={s.cost} size="kpi" tone={recommended ? "brand" : undefined} period="month" />}
                        hint={`${formatCurrency(s.annualCost)} / Jahr`}
                      />
                      <dl className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Stunden</dt>
                          <dd className="tabular-nums text-foreground">{formatNumber(s.hours, 1)} h / Monat</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Satz</dt>
                          <dd className="tabular-nums text-foreground">{formatCurrency(s.rate)} / Std.</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Preis je m²</dt>
                          <dd className="tabular-nums text-foreground">{formatCurrency(s.pricePerSqm)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge size="sm" tone={strategyTone(st.status)} label={strategyLabel(st.status)} />
                        <StatusBadge
                          size="sm"
                          tone={marginTone(st.marginPct, st.targetMarginPct)}
                          icon={false}
                          label={`Marge ${formatPercent(st.marginPct)}`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{SCENARIO_NOTES[key]}</p>
                    </Card>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Mindestwert: Leistungswerte +{perfSpread || "15"} %, Satz −{rateSpread || "10"} %. Höchstwert entsprechend
                umgekehrt. Der Mittelwert entspricht Ihrer regulären Kalkulation.
              </p>
            </Section>

            {/* ── Wirtschaftlichkeit & Risiko (Mittelwert) ─────────── */}
            <Section id="tender-economics" title="Wirtschaftlichkeit und Risiko" description="Bezogen auf den Mittelwert">
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={strategyTone(midStrategy.status)} label={strategyLabel(midStrategy.status)} />
                  <StatusBadge
                    tone={riskTone(wirtschaft.risk.level)}
                    label={`${riskLabel(wirtschaft.risk.level)} · ${wirtschaft.risk.score}/100`}
                  />
                  <span className="text-xs text-muted-foreground">
                    Marge {formatPercent(midStrategy.marginPct)} · Ziel {formatPercent(midStrategy.targetMarginPct)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground">
                  Rote Linie für dieses Gebot:{" "}
                  <Money value={midStrategy.minPriceMonthly} period="month" tone="critical" className="font-semibold" />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vollkosten, Break-even-Satz {formatCurrency(midStrategy.breakEvenRate)} / Std. · Personalbedarf ca.{" "}
                  {formatNumber(wirtschaft.risk.fte, 1)} VZÄ
                </p>
                {wirtschaft.risk.factors.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => setShowRiskFactors((s) => !s)}
                      aria-expanded={showRiskFactors}
                      aria-controls="tender-risk-factors"
                      className="flex min-h-10 w-full items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <ShieldAlert aria-hidden="true" className="size-4 text-muted-foreground" />
                        Risikofaktoren ({wirtschaft.risk.factors.length})
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "size-4 text-muted-foreground transition-transform motion-reduce:transition-none",
                          showRiskFactors && "rotate-180",
                        )}
                      />
                    </button>
                    <ul id="tender-risk-factors" hidden={!showRiskFactors} className="mt-2 space-y-2">
                      {wirtschaft.risk.factors.map((f) => (
                        <li key={f.key} className="rounded-md border border-border bg-surface-sunken p-3">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{f.title}</p>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">+{f.points}</span>
                          </div>
                          <p className="mb-1 text-xs text-muted-foreground">{f.detail}</p>
                          <p className="text-xs text-foreground">Empfehlung: {f.recommendation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </Section>

            {/* ── Übernehmen ──────────────────────────────────────── */}
            <Card tone="sunken" className="no-print">
              <CardHeader
                title="Als Kalkulation übernehmen"
                titleAs="h2"
                description="„Übernehmen & prüfen“ öffnet die Kalkulation mit allen Positionen und dem Mittelwert-Satz – dort ergänzen Sie Objekt- und Kundendaten und prüfen das Angebot."
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={handleTakeOver} disabled={isSaving}>
                  <ArrowRight aria-hidden="true" />
                  Übernehmen &amp; prüfen
                </Button>
                <Button type="button" variant="secondary" onClick={() => void handleConvert()} loading={isSaving}>
                  <FilePlus2 aria-hidden="true" />
                  Direkt als Objekt anlegen
                </Button>
              </div>
            </Card>
          </>
        )}

        <AppFooter />
      </PageShell>

      <RoomEditorSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingRoom(undefined);
        }}
        onSave={handleSaveRoom}
        onSaveAndNext={editingRoom ? undefined : handleSaveRoomAndNext}
        editRoom={editingRoom}
        hourlyRate={baseRate}
      />
      <ConfirmDialog
        open={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        onConfirm={() => {
          const id = deleteRoomId;
          if (id) update((d) => ({ rooms: d.rooms.filter((r) => r.id !== id) }));
          setDeleteRoomId(null);
        }}
        title="Position entfernen?"
        description="Die Position wird aus der Ausschreibungs-Kalkulation entfernt."
        confirmLabel="Entfernen"
        destructive
      />
      <ConfirmDialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        onConfirm={startFlow}
        title="Vorhandenen Entwurf ersetzen?"
        description={
          calcDraft?.editingId
            ? "Es gibt eine nicht abgeschlossene Bearbeitung eines Objekts. Wenn Sie fortfahren, wird dieser Entwurf durch die Ausschreibung ersetzt."
            : "Es gibt einen nicht abgeschlossenen Kalkulationsentwurf. Wenn Sie fortfahren, wird er durch die Ausschreibung ersetzt."
        }
        confirmLabel="Entwurf ersetzen"
        destructive
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clear();
          toast.success("Neue Ausschreibung begonnen");
        }}
        title="Neue Ausschreibung beginnen?"
        description="Alle importierten Positionen und Einstellungen dieser Ausschreibung werden verworfen."
        confirmLabel="Verwerfen"
        destructive
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} triggerReason={upgradeTrigger} />
    </PageTransition>
  );
}
