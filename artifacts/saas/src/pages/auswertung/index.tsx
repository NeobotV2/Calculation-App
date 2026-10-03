import { useId, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Plus, RotateCcw } from "lucide-react";
import { useStore } from "@/store/use-store";
import { usePortfolioEconomics } from "@/hooks/use-object-economics";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { ModuleIcon } from "@/components/ui/module-badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ListRow } from "@/components/ui/list-row";
import { StateView } from "@/components/ui/state-view";
import { NativeSelect } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { getObjectStatus, getOfferReadiness, type CompanyInfo, type ObjectStatusKey } from "@/lib/offer-readiness";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { marginStatusLabel, marginTone } from "@/lib/status";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { allocateRounded, sumDisplay } from "@/lib/display-rounding";
import {
  aggregatePortfolio,
  COMPONENT_SLICE_META,
  COMPONENT_SLICE_ORDER,
  DEFAULT_PORTFOLIO_FILTER,
  filterPortfolioRows,
  formatPercent,
  hasActivePortfolioFilter,
  hoursByObject,
  portfolioModules,
  PORTFOLIO_MODULE_FILTER_LABELS,
  PORTFOLIO_STATUS_FILTER_LABELS,
  revenueByGroup,
  revenueByModule,
  roomNachkalkulationVerdict,
  shareOf,
  sumSlices,
  type ChartSlice,
  type PortfolioFilter,
  type PortfolioModuleFilter,
  type PortfolioRow,
  type PortfolioStatusFilter,
} from "./portfolio";

/* ── Diagramme ───────────────────────────────────────────────────────────── */

export interface SliceChartCardProps {
  title: string;
  description?: ReactNode;
  slices: ChartSlice[];
  /** Text, wenn keine Anteile vorhanden sind. */
  emptyText: string;
  className?: string;
}

/**
 * Ringdiagramm mit Legende als Liste (Bezeichnung, Betrag, Anteil). Die
 * Legende trägt die Information zugänglich; das Diagramm ist dekorativ.
 */
export function SliceChartCard({ title, description, slices, emptyText, className }: SliceChartCardProps) {
  const total = sumSlices(slices);
  // Legende: Beträge auf Cent mit Restverteilung — Σ Zeilen = „Summe“.
  const shownValues = useMemo(() => allocateRounded(slices.map((s) => s.value), total), [slices, total]);
  const shownTotal = sumDisplay(shownValues);
  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(slices.map((s, i) => [`s${i}`, { label: s.label, color: s.color }])),
    [slices],
  );
  const data = slices.map((s) => ({ name: s.label, value: s.value }));

  return (
    <Card className={className}>
      <CardHeader title={title} description={description} />
      {slices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
          <div aria-hidden="true" className="mx-auto w-full max-w-44">
            <ChartContainer config={config} className="aspect-square w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, name) => (
                        <span className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">{String(name)}</span>
                          <span className="font-medium tabular-nums">{formatCurrency(Number(value))}</span>
                        </span>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="95%"
                  paddingAngle={slices.length > 1 ? 1 : 0}
                  // Dekorativ (aria-hidden): keine Tab-Stopps im Diagramm — die Legende ist die zugängliche Fassung.
                  rootTabIndex={-1}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
          <ul className="min-w-0 divide-y divide-border text-sm">
            {slices.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 py-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-xs" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1 hyphens-auto break-words text-foreground">{s.label}</span>
                <Money value={shownValues[i]} className="font-medium" />
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {formatPercent(shareOf(s.value, total), 0)}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 py-2 font-semibold">
              <span aria-hidden="true" className="size-2.5 shrink-0" />
              <span className="min-w-0 flex-1">Summe</span>
              <Money value={shownTotal} />
              <span className="w-14 shrink-0" />
            </li>
          </ul>
        </div>
      )}
    </Card>
  );
}

const HOURS_CHART_LIMIT = 10;

function HoursByObjectCard({ rows }: { rows: ReturnType<typeof hoursByObject> }) {
  const shown = rows.slice(0, HOURS_CHART_LIMIT);
  const keys = COMPONENT_SLICE_ORDER.filter((k) => shown.some((r) => r[k] > 0));
  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(keys.map((k) => [k, { label: COMPONENT_SLICE_META[k].label.replace(" (Ø)", ""), color: COMPONENT_SLICE_META[k].color }])),
    [keys],
  );
  const data = shown.map((r) => ({
    ...r,
    short: r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name,
  }));

  return (
    <Card>
      <CardHeader
        title="Stunden pro Objekt"
        description={
          rows.length > HOURS_CHART_LIMIT
            ? `Ø Monatsstunden nach Leistung · die ${HOURS_CHART_LIMIT} größten von ${rows.length} Objekten`
            : "Ø Monatsstunden nach Leistung"
        }
      />
      {shown.length === 0 || keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Stundendaten vorhanden.</p>
      ) : (
        <>
          <div aria-hidden="true">
            <ChartContainer config={config} className="aspect-auto w-full" style={{ height: shown.length * 36 + 72 }}>
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${formatNumber(Number(v), 0)} h`} />
                <YAxis type="category" dataKey="short" tickLine={false} axisLine={false} width={112} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => String(payload?.[0]?.payload?.name ?? "")}
                      formatter={(value, name) => (
                        <span className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">{config[String(name)]?.label}</span>
                          <span className="font-medium tabular-nums">{formatNumber(Number(value), 1)} h</span>
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {keys.map((k, i) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="h"
                    fill={`var(--color-${k})`}
                    radius={i === keys.length - 1 ? [0, 4, 4, 0] : 0}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>
          <div className="sr-only">
            <table>
              <caption>Ø Monatsstunden pro Objekt</caption>
              <thead>
                <tr>
                  <th scope="col">Objekt</th>
                  <th scope="col">Stunden pro Monat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{formatNumber(r.total, 1)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

/* ── Portfolio-Tabelle ──────────────────────────────────────────────────── */

function ModuleIcons({ row }: { row: PortfolioRow }) {
  return (
    <span className="inline-flex items-center gap-1">
      {row.modules.map((m) => (
        <ModuleIcon key={m} module={m} size="sm" />
      ))}
    </span>
  );
}

function MarginBadge({ row }: { row: PortfolioRow }) {
  const m = row.econ.strategy.marginPct;
  return <StatusBadge size="sm" tone={marginTone(m, row.econ.strategy.targetMarginPct)} label={formatPercent(m)} />;
}

function VerdictCell({ row }: { row: PortfolioRow }) {
  if (!row.verdict) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">–</span>
        <span className="sr-only">Keine Nachkalkulation</span>
      </span>
    );
  }
  return <StatusBadge size="sm" tone={row.verdict.tone} label={row.verdict.label} />;
}

const STATUS_RANK: Record<ObjectStatusKey, number> = { entwurf: 0, pruefung_offen: 1, angebotsbereit: 2, archiviert: 3 };
const MODULE_FILTERS: PortfolioModuleFilter[] = ["all", "unterhalt", "winterdienst", "hms"];
const STATUS_FILTERS: PortfolioStatusFilter[] = ["all", "entwurf", "pruefung_offen", "angebotsbereit"];

const detailHref = (row: PortfolioRow) => `/auswertung/${row.project.id}`;

function PortfolioTable({ rows, empty }: { rows: PortfolioRow[]; empty?: ReactNode }) {
  const columns: Column<PortfolioRow>[] = [
    {
      id: "name",
      header: "Objekt",
      sortable: true,
      sortValue: (r) => r.project.name,
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-foreground">{r.project.name || "Ohne Namen"}</span>
          <span className="block truncate text-xs text-muted-foreground">{r.project.customer || "Kein Kunde"}</span>
        </span>
      ),
    },
    { id: "modules", header: "Leistungen", cell: (r) => <ModuleIcons row={r} /> },
    {
      id: "price",
      header: "Preis/Mo",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.econ.totals.priceMonthly,
      cell: (r) => <Money value={r.econ.totals.priceMonthly} />,
    },
    {
      id: "margin",
      header: "Marge",
      align: "end",
      sortable: true,
      sortValue: (r) => r.econ.strategy.marginPct,
      cell: (r) => <MarginBadge row={r} />,
    },
    {
      id: "contribution",
      header: "DB/Mo",
      numeric: true,
      hideBelow: "lg",
      sortable: true,
      sortValue: (r) => r.econ.totals.contributionMonthly,
      cell: (r) => (
        <Money value={r.econ.totals.contributionMonthly} tone={r.econ.totals.contributionMonthly < 0 ? "critical" : undefined} />
      ),
    },
    {
      id: "hours",
      header: "Std./Mo",
      numeric: true,
      hideBelow: "lg",
      sortable: true,
      sortValue: (r) => r.econ.totals.laborHoursMonthly,
      cell: (r) => formatNumber(r.econ.totals.laborHoursMonthly, 1),
    },
    {
      id: "nk",
      header: "Nachkalkulation",
      hideBelow: "xl",
      sortable: true,
      sortValue: (r) => r.verdict?.label ?? null,
      cell: (r) => <VerdictCell row={r} />,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => STATUS_RANK[r.status.key],
      cell: (r) => <StatusBadge size="sm" tone={r.status.tone} label={r.status.label} />,
    },
  ];

  return (
    <DataTable<PortfolioRow>
      caption="Portfolio: Wirtschaftlichkeit je Objekt"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.project.id}
      rowHref={detailHref}
      defaultSort={{ id: "price", dir: "desc" }}
      empty={empty}
      mobile={(r) => (
        <ListRow
          href={detailHref(r)}
          title={r.project.name || "Ohne Namen"}
          meta={
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <ModuleIcons row={r} />
              <StatusBadge size="sm" tone={r.status.tone} label={r.status.label} />
              {r.verdict && <StatusBadge size="sm" tone={r.verdict.tone} label={r.verdict.label} />}
            </span>
          }
          trailing={
            <span className="flex flex-col items-end gap-1">
              <Money value={r.econ.totals.priceMonthly} className="font-medium" />
              <MarginBadge row={r} />
            </span>
          }
        />
      )}
    />
  );
}

function PortfolioFilters({ filter, onChange }: { filter: PortfolioFilter; onChange: (f: PortfolioFilter) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor={`${id}-module`} className="sr-only">
        Leistung
      </label>
      <NativeSelect
        id={`${id}-module`}
        inputSize="sm"
        wrapperClassName="sm:w-60"
        value={filter.module}
        onChange={(e) => onChange({ ...filter, module: e.target.value as PortfolioModuleFilter })}
      >
        {MODULE_FILTERS.map((m) => (
          <option key={m} value={m}>
            {PORTFOLIO_MODULE_FILTER_LABELS[m]}
          </option>
        ))}
      </NativeSelect>
      <label htmlFor={`${id}-status`} className="sr-only">
        Status
      </label>
      <NativeSelect
        id={`${id}-status`}
        inputSize="sm"
        wrapperClassName="sm:w-48"
        value={filter.status}
        onChange={(e) => onChange({ ...filter, status: e.target.value as PortfolioStatusFilter })}
      >
        {STATUS_FILTERS.map((s) => (
          <option key={s} value={s}>
            {PORTFOLIO_STATUS_FILTER_LABELS[s]}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function ControllingSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only" role="status">
        Daten werden geladen…
      </span>
      <KpiGroup columns={3} className="grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </KpiGroup>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
      <DataTable<PortfolioRow>
        caption="Portfolio wird geladen"
        columns={[{ id: "name", header: "Objekt", cell: () => null }]}
        rows={[]}
        getRowId={(r) => r.project.id}
        mobile={() => null}
        loading
      />
    </div>
  );
}

/* ── Seite ──────────────────────────────────────────────────────────────── */

export default function AuswertungGlobal() {
  const projects = useStore((s) => s.projects);
  const nachkalkulationen = useStore((s) => s.nachkalkulationen);
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const targetMargin = useStore((s) => s.targetMargin);
  const { status: syncStatus, hasLoadedOnce, reload } = useSyncStatus();
  const initialLoading = useInitialLoading();
  const [filter, setFilter] = useState<PortfolioFilter>(DEFAULT_PORTFOLIO_FILTER);

  const activeProjects = useMemo(() => projects.filter((p) => p.status !== "archived"), [projects]);
  const economics = usePortfolioEconomics(activeProjects);
  const econList = useMemo(
    () => activeProjects.flatMap((p) => {
      const e = economics.get(p.id);
      return e ? [e] : [];
    }),
    [activeProjects, economics],
  );
  const company = useMemo<CompanyInfo>(
    () => ({ companyName, companyStreet, companyZip, companyCity }),
    [companyName, companyStreet, companyZip, companyCity],
  );

  const totals = useMemo(() => aggregatePortfolio(econList), [econList]);
  const moduleSlices = useMemo(() => revenueByModule(econList), [econList]);
  const groupSlices = useMemo(() => revenueByGroup(activeProjects, economics), [activeProjects, economics]);
  const hoursRows = useMemo(() => hoursByObject(activeProjects, economics), [activeProjects, economics]);

  const rows = useMemo<PortfolioRow[]>(
    () =>
      activeProjects.flatMap((p) => {
        const econ = economics.get(p.id);
        if (!econ) return [];
        const readiness = getOfferReadiness(p, econ, company);
        return [{
          project: p,
          econ,
          status: getObjectStatus(p, readiness),
          modules: portfolioModules(p),
          verdict: roomNachkalkulationVerdict(econ, nachkalkulationen[p.id]),
        }];
      }),
    [activeProjects, economics, company, nachkalkulationen],
  );
  const visibleRows = useMemo(() => filterPortfolioRows(rows, filter), [rows, filter]);

  const targetMarginPct = markupToRevenueMargin(targetMargin);
  const refreshing = syncStatus === "loading" && hasLoadedOnce;

  const renderBody = () => {
    if (!hasLoadedOnce) {
      if (syncStatus === "error") {
        return (
          <StateView
            kind="error"
            title="Daten konnten nicht geladen werden"
            description="Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
            action={{ label: "Erneut versuchen", icon: RotateCcw, onClick: reload }}
          />
        );
      }
      return initialLoading ? <ControllingSkeleton /> : <div className="min-h-64" aria-busy="true" />;
    }

    if (activeProjects.length === 0) {
      return (
        <StateView
          kind="empty"
          title="Noch keine Daten"
          description="Kalkulieren Sie Ihr erstes Objekt, um hier Umsatz, Deckungsbeitrag und Marge Ihres Portfolios zu sehen."
          action={{ label: "Erste Kalkulation", icon: Plus, href: "/kalkulation/neu" }}
        />
      );
    }

    return (
      <>
        <section aria-label="Kennzahlen">
          <KpiGroup columns={3} className="grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-6">
            <Kpi
              label="Umsatz/Monat"
              value={totals.priceMonthly}
              format="currency"
              hint={`${formatCurrency(totals.priceAnnual)} / Jahr`}
              info="Summe der Ø-Monatspreise netto aller aktiven Objekte, inklusive Winterdienst (Jahresmittel) und Hausmeisterservice."
            />
            <Kpi
              label="Vollkosten/Monat"
              value={totals.costMonthly}
              format="currency"
              info="Summe der Vollkosten (Lohn, Sozialversicherung, Ausfallzeiten, Gemeinkosten; ohne Gewinn) aller aktiven Objekte."
            />
            <Kpi
              label="Deckungsbeitrag"
              value={totals.contributionMonthly}
              format="currency"
              signed
              tone={totals.contributionMonthly < 0 ? "critical" : undefined}
              statusLabel={totals.contributionMonthly < 0 ? "Verlust" : undefined}
              hint="pro Monat"
              info="Umsatz minus Vollkosten pro Monat."
            />
            <Kpi
              label="Ø Marge"
              value={formatPercent(totals.marginPct)}
              tone={marginTone(totals.marginPct, targetMarginPct)}
              statusLabel={marginStatusLabel(totals.marginPct, targetMarginPct)}
              hint={`Ziel ${formatPercent(targetMarginPct)}`}
              info="Summe Deckungsbeitrag geteilt durch Summe Umsatz (Marge vom Umsatz, umsatzgewichtet)."
            />
            <Kpi label="Std./Monat" value={totals.laborHoursMonthly} format="hours" hint={`${totals.objectCount} Objekte · ${totals.roomCount} Räume`} />
            <Kpi
              label="Ø €/m² Reinigung"
              value={totals.cleaningPricePerSqm}
              format="currency"
              hint={`${formatNumber(totals.cleaningArea, 0)} m² Fläche`}
              info="Summe Reinigungspreis (inkl. Rüst-/Wegezeit) geteilt durch die Summe der Reinigungsfläche."
            />
          </KpiGroup>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <SliceChartCard
            title="Umsatz nach Leistung"
            description="Ø Monatsumsatz netto je Leistung"
            slices={moduleSlices}
            emptyText="Noch kein Umsatz vorhanden."
          />
          <SliceChartCard
            title="Umsatz nach Raumgruppe"
            description="Unterhaltsreinigung inkl. Rüst-/Wegezeit"
            slices={groupSlices}
            emptyText="Keine Räume vorhanden."
          />
        </div>

        <HoursByObjectCard rows={hoursRows} />

        <Section
          id="portfolio"
          title="Portfolio"
          description="Öffnen Sie ein Objekt für Details und die Nachkalkulation."
        >
          <PortfolioFilters filter={filter} onChange={setFilter} />
          <PortfolioTable
            rows={visibleRows}
            empty={
              hasActivePortfolioFilter(filter) ? (
                <StateView
                  kind="empty"
                  compact
                  title="Keine Treffer"
                  description="Kein Objekt passt zu den gewählten Filtern."
                  action={{ label: "Filter zurücksetzen", onClick: () => setFilter(DEFAULT_PORTFOLIO_FILTER) }}
                />
              ) : undefined
            }
          />
        </Section>
      </>
    );
  };

  return (
    <PageTransition>
      <PageShell
        width="wide"
        header={
          <PageHeader
            title="Controlling"
            width="wide"
            meta={
              <>
                <span>
                  {hasLoadedOnce
                    ? `${activeProjects.length} ${activeProjects.length === 1 ? "aktives Objekt" : "aktive Objekte"}`
                    : "Wird geladen…"}
                </span>
                {refreshing && (
                  <span role="status" className="text-xs">
                    Aktualisiere…
                  </span>
                )}
              </>
            }
          />
        }
      >
        {renderBody()}
      </PageShell>
    </PageTransition>
  );
}
