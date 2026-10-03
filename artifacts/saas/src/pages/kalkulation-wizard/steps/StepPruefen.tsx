import * as React from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column, type DataTableGroup } from "@/components/ui/data-table";
import { ModuleIcon } from "@/components/ui/module-badge";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatOfferQuantity } from "@/components/offer/offer-meta";
import { getObjectStatus, type OfferReadiness, type ReadinessItem } from "@/lib/offer-readiness";
import type { OfferPosition, OfferPositionGroup } from "@/lib/offer-positions";
import { roundDisplay, roundGroupsForDisplay, sumDisplay } from "@/lib/display-rounding";
import { severityLabel, severityTone, type Tone } from "@/lib/status";
import { useMediaQuery } from "@/lib/theme";
import { MEDIA } from "@/lib/tokens";
import { cn, formatNumber } from "@/lib/utils";
import { EditDiffCallout } from "../EditDiffCallout";
import type { FlowStepProps } from "../flow-steps";

/* ── Prüfliste ────────────────────────────────────────────────────────── */

interface ChecklistGroup {
  key: string;
  title: string;
  items: ReadinessItem[];
}

function itemTone(item: ReadinessItem): Tone {
  switch (item.level) {
    case "blocker":
    case "critical":
      return "critical";
    case "offer":
      return "warning";
    default:
      return severityTone(item.severity ?? "info");
  }
}

function itemLabel(item: ReadinessItem): string {
  switch (item.level) {
    case "blocker":
      return "Pflicht";
    case "critical":
      return "Kritisch";
    case "offer":
      return "Angebot";
    default:
      return severityLabel(item.severity ?? "info");
  }
}

/** Zusammenfassung der Prüfliste: „Angebotsbereit“, „Prüfung offen (n)“ oder „Unvollständig (n)“. */
export function readinessSummary(r: OfferReadiness): { label: string; tone: Tone } {
  if (r.blockers.length > 0) return { label: `Unvollständig (${r.blockers.length})`, tone: "critical" };
  const serious = r.hints.filter((h) => h.severity === "warning" || h.severity === "critical").length;
  const open = r.criticals.length + r.offerGaps.length + serious;
  if (open > 0) return { label: `Prüfung offen (${open})`, tone: "warning" };
  return { label: "Angebotsbereit", tone: "success" };
}

function Checklist({ readiness, onFix }: { readiness: OfferReadiness; onFix: (item: ReadinessItem) => void }) {
  const uid = React.useId();
  const groups: ChecklistGroup[] = [
    { key: "blocker", title: "Muss erledigt werden", items: readiness.blockers },
    { key: "critical", title: "Kritisch – bitte bestätigen", items: readiness.criticals },
    { key: "offer", title: "Für das Angebot", items: readiness.offerGaps },
    { key: "hint", title: "Hinweise", items: readiness.hints },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine offenen Punkte – die Kalkulation ist angebotsbereit.</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`${uid}-${g.key}`} className="space-y-2">
          <h4 id={`${uid}-${g.key}`} className="text-label font-semibold text-foreground">
            {g.title} <span className="font-normal text-muted-foreground">({g.items.length})</span>
          </h4>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {g.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-3">
                <StatusBadge size="sm" tone={itemTone(item)} label={itemLabel(item)} className="shrink-0 self-start" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.message && <p className="text-sm text-muted-foreground">{item.message}</p>}
                </div>
                {item.fix &&
                  (item.fix.kind === "route" ? (
                    <Button asChild variant="ghost" size="sm" className="shrink-0 self-start">
                      <Link href={item.fix.href}>
                        Beheben
                        <ArrowRight aria-hidden="true" />
                        <span className="sr-only">: {item.title}</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" className="shrink-0 self-start" onClick={() => onFix(item)}>
                      Beheben
                      <ArrowRight aria-hidden="true" />
                      <span className="sr-only">: {item.title}</span>
                    </Button>
                  ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ── Positionsübersicht ───────────────────────────────────────────────── */

const fmtHours = (v: number) => formatNumber(v, 1);

function positionColumns(total: number): Column<OfferPosition>[] {
  return [
    {
      id: "label",
      header: "Position",
      cell: (p) => (
        <span className="block min-w-0">
          <span className="block text-foreground">{p.label}</span>
          {p.sublabel && <span className="block text-xs text-muted-foreground">{p.sublabel}</span>}
        </span>
      ),
      footer: "Gesamt netto",
    },
    { id: "qty", header: "Menge", align: "end", cell: (p) => <span className="tabular-nums">{formatOfferQuantity(p)}</span> },
    { id: "freq", header: "Turnus", hideBelow: "lg", cell: (p) => p.frequencyLabel ?? "" },
    { id: "hours", header: "Std./Mo", numeric: true, hideBelow: "xl", cell: (p) => fmtHours(p.hoursMonthly) },
    {
      id: "price",
      header: "Preis/Mo",
      numeric: true,
      cell: (p) => <Money value={p.priceMonthly} />,
      footer: <Money value={total} />,
    },
  ];
}

function GroupTitle({ group, suffix }: { group: OfferPositionGroup; suffix?: string }) {
  return (
    <span className="block">
      <span className="flex items-center gap-2">
        <ModuleIcon module={group.module} size="sm" />
        <span>
          {group.label}
          {suffix && <span className="font-normal text-muted-foreground"> · {suffix}</span>}
        </span>
      </span>
      {!suffix && group.details.length > 0 && (
        <span className="mt-1.5 block space-y-0.5 pl-8 text-xs font-normal text-muted-foreground">
          {group.details.map((d, i) => (
            <span key={`${d.label}-${i}`} className="block">
              {d.label}
              {d.quantity ? ` · ${d.quantity}` : ""} · {d.text}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function Subtotal({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <Money value={value} className="font-semibold" />
    </span>
  );
}

/** Raumpositionen nach Raumgruppe (Reihenfolge des ersten Auftretens). */
function splitRoomGroups(positions: OfferPosition[]) {
  const rooms = positions.filter((p) => p.kind === "room");
  const setup = positions.filter((p) => p.kind !== "room");
  const map = new Map<string, { id: string; name: string; rows: OfferPosition[] }>();
  for (const p of rooms) {
    const id = p.groupId ?? "__none";
    const entry = map.get(id) ?? { id, name: p.groupName || "Ohne Gruppe", rows: [] };
    entry.rows.push(p);
    map.set(id, entry);
  }
  return { roomGroups: [...map.values()], setup };
}

function tableGroups(groups: OfferPositionGroup[]): DataTableGroup<OfferPosition>[] {
  const out: DataTableGroup<OfferPosition>[] = [];
  for (const g of groups) {
    const subtotal = <Subtotal label={`Zwischensumme ${g.label}`} value={g.subtotalMonthly} />;
    if (g.module === "unterhalt") {
      const { roomGroups, setup } = splitRoomGroups(g.positions);
      if (roomGroups.length > 1) {
        roomGroups.forEach((rg, i) => {
          const last = i === roomGroups.length - 1 && setup.length === 0;
          out.push({
            id: `unterhalt-${rg.id}`,
            label: <GroupTitle group={g} suffix={rg.name} />,
            rows: rg.rows,
            footerCells: {
              label: <span className="text-muted-foreground">Summe {rg.name}</span>,
              price: <Money value={sumDisplay(rg.rows.map((p) => p.priceMonthly))} />,
            },
            ...(last ? { footer: subtotal } : {}),
          });
        });
        if (setup.length > 0) {
          out.push({
            id: "unterhalt-setup",
            label: <GroupTitle group={g} suffix="Rüst- und Wegezeit" />,
            rows: setup,
            footer: subtotal,
          });
        }
        continue;
      }
    }
    out.push({ id: g.module, label: <GroupTitle group={g} />, rows: g.positions, footer: subtotal });
  }
  return out;
}

function MobilePositions({ groups, total }: { groups: OfferPositionGroup[]; total: number }) {
  const [open, setOpen] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.module, g.positions.length <= 5])),
  );
  const uid = React.useId();
  const row = (p: OfferPosition) => (
    <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{p.label}</p>
        <p className="text-xs text-muted-foreground">
          {[formatOfferQuantity(p), p.frequencyLabel].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Money value={p.priceMonthly} className="shrink-0" />
    </li>
  );
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-surface">
      {groups.map((g) => {
        const isOpen = open[g.module] ?? true;
        const panelId = `${uid}-${g.module}`;
        const { roomGroups, setup } = g.module === "unterhalt" ? splitRoomGroups(g.positions) : { roomGroups: [], setup: [] };
        return (
          <section key={g.module} className="border-b border-border last:border-b-0">
            <h4>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((s) => ({ ...s, [g.module]: !isOpen }))}
                className="flex min-h-12 w-full items-center gap-3 bg-surface-sunken px-4 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <ModuleIcon module={g.module} size="sm" />
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  {g.label}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {g.positions.length} {g.positions.length === 1 ? "Position" : "Positionen"}
                  </span>
                </span>
                <Money value={g.subtotalMonthly} className="font-semibold" />
                <ChevronDown
                  aria-hidden="true"
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                />
              </button>
            </h4>
            <div id={panelId} hidden={!isOpen}>
              {g.details.length > 0 && (
                <ul className="space-y-0.5 border-b border-border px-4 py-2 text-xs text-muted-foreground" aria-label={`Flächen ${g.label}`}>
                  {g.details.map((d, i) => (
                    <li key={`${d.label}-${i}`}>
                      {d.label}
                      {d.quantity ? ` · ${d.quantity}` : ""} · {d.text}
                    </li>
                  ))}
                </ul>
              )}
              {g.module === "unterhalt" && roomGroups.length > 1 ? (
                <>
                  {roomGroups.map((rg) => (
                    <div key={rg.id}>
                      <p className="px-4 pt-3 text-overline uppercase text-muted-foreground">{rg.name}</p>
                      <ul className="divide-y divide-border">{rg.rows.map(row)}</ul>
                    </div>
                  ))}
                  {setup.length > 0 && <ul className="divide-y divide-border border-t border-border">{setup.map(row)}</ul>}
                </>
              ) : (
                <ul className="divide-y divide-border">{g.positions.map(row)}</ul>
              )}
            </div>
          </section>
        );
      })}
      <div className="flex items-center justify-between gap-3 border-t-2 border-border-strong bg-surface-sunken px-4 py-3 text-sm font-semibold">
        <span>Gesamt netto</span>
        <Money value={total} period="month" />
      </div>
    </div>
  );
}

/* ── Schritt ──────────────────────────────────────────────────────────── */

/** Schritt 7 · Prüfen & Abschließen: Preis, Änderungen, Prüfliste und Positionen. */
export function StepPruefen({ mode, draft, tempProject, econ, readiness, positions, existing, settings, goToStep }: FlowStepProps) {
  const uid = React.useId();
  const isMdUp = useMediaQuery(MEDIA.md, true);
  const { totals } = econ;
  const status = getObjectStatus(tempProject, readiness);
  const summary = readinessSummary(readiness);
  // Anzeige-Rundung: Zeilen auf Cent mit Restverteilung — Σ Zeilen = Zwischensumme,
  // Σ Zwischensummen = Gesamt netto = gerundeter Monatspreis oben.
  const shown = React.useMemo(
    () => roundGroupsForDisplay(positions, { totalMonthly: totals.priceMonthly }),
    [positions, totals.priceMonthly],
  );
  const total = sumDisplay(shown.map((g) => g.subtotalMonthly));
  const priceMonthly = roundDisplay(totals.priceMonthly);
  const columns = React.useMemo(() => positionColumns(total), [total]);
  const groups = React.useMemo(() => tableGroups(shown), [shown]);

  const fix = (item: ReadinessItem) => {
    if (item.fix?.kind === "flow") goToStep(item.fix.step, { focusField: item.fix.field });
  };

  return (
    <div className="space-y-8">
      <Card as="section" tone="brand" aria-labelledby={`${uid}-price`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h3 id={`${uid}-price`} className="text-label text-muted-foreground">
              Monatspreis netto{totals.hasModules ? " · Ø inkl. Zusatzleistungen" : ""}
            </h3>
            <Money value={priceMonthly} size="display" period="month" />
            <p className="text-sm text-muted-foreground">
              Jahreswert <Money value={roundDisplay(priceMonthly * 12)} period="year" className="font-medium text-foreground" /> · zzgl. USt.
            </p>
          </div>
          <StatusBadge tone={status.tone} label={status.label} className="self-start" />
        </div>
      </Card>

      {mode === "edit" && existing && (
        <EditDiffCallout existing={existing} draft={draft} draftEcon={econ} settings={settings} />
      )}

      <section aria-labelledby={`${uid}-check`} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${uid}-check`} className="text-h3 text-foreground">
            Prüfliste
          </h3>
          <StatusBadge tone={summary.tone} label={summary.label} />
        </div>
        <Checklist readiness={readiness} onFix={fix} />
      </section>

      <section aria-labelledby={`${uid}-positions`} className="space-y-3">
        <h3 id={`${uid}-positions`} className="text-h3 text-foreground">
          Positionsübersicht
        </h3>
        {positions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong bg-card p-4 text-sm text-muted-foreground">
            Noch keine Positionen – erfassen Sie Räume oder Zusatzleistungen.
          </p>
        ) : isMdUp ? (
          <DataTable
            caption="Positionen des Angebots je Leistung, Preise netto pro Monat"
            columns={columns}
            groups={groups}
            getRowId={(p) => `${p.module}-${p.id}`}
            density="compact"
            layout="table"
            mobile={() => null}
          />
        ) : (
          <MobilePositions groups={shown} total={total} />
        )}
        <p className="text-xs text-muted-foreground">
          Winterdienst und Hausmeisterservice als Ø-Monatswert (Jahreswert ÷ 12). Alle Preise zzgl. USt.
        </p>
      </section>
    </div>
  );
}
