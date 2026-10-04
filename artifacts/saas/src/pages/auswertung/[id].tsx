import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FileText } from "lucide-react";
import { useStore, type Room } from "@/store/use-store";
import { useObjectEconomics } from "@/hooks/use-object-economics";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { Money } from "@/components/ui/money";
import { StateView } from "@/components/ui/state-view";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ListRow } from "@/components/ui/list-row";
import { ModuleBadge } from "@/components/ui/module-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { RoomNachkalkulationCard } from "@/components/controlling/RoomNachkalkulationCard";
import { WinterNachkalkulationCard } from "@/components/controlling/WinterNachkalkulationCard";
import { HmsNachkalkulationCard } from "@/components/controlling/HmsNachkalkulationCard";
import { calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { marginStatusLabel, marginTone } from "@/lib/status";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { displayOfferGroups, sumDisplay } from "@/lib/display-rounding";
import { buildOfferPositions } from "@/lib/offer-positions";
import { SliceChartCard } from "./index";
import { formatPercent, objectRevenueSlices, objectSliceDisplayValues, portfolioModules } from "./portfolio";

interface RoomRow {
  room: Room;
  hours: number;
  cost: number;
  /** Angezeigte Werte (gerundet, Σ = Summenzeile). */
  hoursShown: number;
  costShown: number;
}

const HOURS_CHART_CONFIG: ChartConfig = {
  stunden: { label: "Stunden", color: "hsl(var(--chart-1))" },
};

function DetailSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only" role="status">
        Daten werden geladen…
      </span>
      <Skeleton className="h-28 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function AuswertungDetail() {
  const [, params] = useRoute("/auswertung/:id");
  const id = params?.id;
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const economics = useObjectEconomics(project);
  const { hasLoadedOnce } = useSyncStatus();
  const initialLoading = useInitialLoading();

  const roomRows = useMemo<RoomRow[]>(() => {
    if (!project || !economics) return [];
    // Anzeige: dieselben gerundeten Raumbeträge wie Prüfschritt, Arbeitsbereich und Angebot.
    const shown = displayOfferGroups(
      buildOfferPositions(project, economics.totals, economics.effectiveRate),
      economics.totals.priceMonthly,
    );
    const byId = new Map(
      (shown.find((g) => g.module === "unterhalt")?.positions ?? []).filter((p) => p.kind === "room").map((p) => [p.id, p]),
    );
    return project.rooms.map((room) => {
      const rc = calcRoom(room, economics.effectiveRate);
      const p = byId.get(room.id);
      return { room, hours: rc.monthlyHours, cost: rc.monthlyCost, costShown: p?.priceMonthly ?? 0, hoursShown: p?.hoursMonthly ?? 0 };
    });
  }, [project, economics]);

  const slices = useMemo(
    () => (project && economics ? objectRevenueSlices(project, economics) : []),
    [project, economics],
  );
  const sliceValues = useMemo(
    () => (project && economics ? objectSliceDisplayValues(project, economics, slices) : undefined),
    [project, economics, slices],
  );

  if (!project || !economics) {
    if (!hasLoadedOnce) {
      return (
        <PageTransition>
          <PageShell header={<PageHeader title="Controlling" back={{ href: "/auswertung", label: "Controlling" }} />}>
            {initialLoading ? <DetailSkeleton /> : <div className="min-h-64" aria-busy="true" />}
          </PageShell>
        </PageTransition>
      );
    }
    return (
      <PageTransition>
        <PageShell chrome="app">
          <StateView
            kind="not-found"
            titleAs="h1"
            title="Objekt nicht gefunden"
            description="Das Objekt wurde möglicherweise gelöscht."
            action={{ label: "Zum Controlling", href: "/auswertung" }}
            secondaryAction={{ label: "Zur Objektliste", href: "/objekte" }}
          />
        </PageShell>
      </PageTransition>
    );
  }

  const totals = economics.totals;
  const cleaning = totals.cleaning;
  // Nachkalkulationen bleiben auch für archivierte Objekte erfassbar: Sie sind
  // nachträgliche Ist-Aufzeichnungen (oft zum Vertragsende), keine Kalkulationsänderung.
  const archived = project.status === "archived";
  const showRoomNk = cleaning.count > 0 || !totals.hasModules;
  const modules = portfolioModules(project);

  const hoursData = roomRows
    .map((r) => {
      const name = r.room.name || r.room.typeName;
      return {
        name: name.length > 18 ? `${name.slice(0, 17)}…` : name,
        fullName: name,
        stunden: Math.round(r.hours * 10) / 10,
      };
    })
    .sort((a, b) => b.stunden - a.stunden);

  const roomColumns: Column<RoomRow>[] = [
    {
      id: "name",
      header: "Raum",
      sortable: true,
      sortValue: (r) => r.room.name || r.room.typeName,
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-foreground">{r.room.name || r.room.typeName}</span>
          <span className="block truncate text-xs text-muted-foreground">{r.room.typeName}</span>
        </span>
      ),
      footer: "Summe Räume",
    },
    {
      id: "group",
      header: "Raumgruppe",
      hideBelow: "lg",
      sortable: true,
      sortValue: (r) => r.room.groupName,
      cell: (r) => r.room.groupName,
    },
    {
      id: "area",
      header: "Fläche",
      unit: "m²",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.room.area,
      cell: (r) => formatNumber(r.room.area, 0),
      footer: formatNumber(cleaning.area, 0),
    },
    {
      id: "frequency",
      header: "Turnus",
      hideBelow: "xl",
      cell: (r) => FREQUENCY_LABELS[r.room.frequency],
    },
    {
      id: "hours",
      header: "Std./Mo",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.hours,
      cell: (r) => formatNumber(r.hoursShown, 1),
      footer: formatNumber(sumDisplay(roomRows.map((r) => r.hoursShown), 1), 1),
    },
    {
      id: "cost",
      header: "Preis/Mo",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.cost,
      cell: (r) => <Money value={r.costShown} />,
      footer: <Money value={sumDisplay(roomRows.map((r) => r.costShown))} />,
    },
  ];

  return (
    <PageTransition>
      <PageShell
        header={
          <PageHeader
            title={project.name || "Ohne Namen"}
            eyebrow="Controlling"
            back={{ href: `/objekte/${project.id}`, label: project.name || "Objekt" }}
            meta={
              <>
                {project.customer && <span>{project.customer}</span>}
                <span className="flex flex-wrap items-center gap-1.5">
                  {modules.map((m) => (
                    <ModuleBadge key={m} module={m} size="sm" />
                  ))}
                </span>
                {archived && <StatusBadge size="sm" tone="neutral" label="Archiviert" />}
              </>
            }
            secondaryActions={[{ id: "offer", label: "Angebot ansehen", icon: FileText, href: `/print/${project.id}` }]}
          />
        }
      >
        <Card>
          <Kpi
            label="Monatspreis netto (Ø Monat)"
            value={totals.priceMonthly}
            format="currency"
            emphasis="hero"
            hint={`${formatCurrency(totals.priceAnnual)} / Jahr`}
          />
          <KpiGroup columns={showRoomNk ? 4 : 2} className="mt-5">
            <Kpi label="Std./Monat" value={totals.laborHoursMonthly} format="hours" />
            {showRoomNk && (
              <>
                <Kpi label="Fläche Reinigung" value={cleaning.area} format="area" hint={`${cleaning.count} ${cleaning.count === 1 ? "Raum" : "Räume"}`} />
                <Kpi label="Ø Preis/m² Reinigung" value={cleaning.pricePerSqm} format="currency" />
              </>
            )}
            <Kpi label="Verrechnungssatz" value={economics.effectiveRate} format="currency" period="hour" />
          </KpiGroup>
        </Card>

        <Section title="Wirtschaftlichkeit" description="Plan-Werte pro Monat auf Basis Ihrer Vollkosten.">
          <KpiGroup columns={3}>
            <Kpi
              label="Vollkosten/Monat"
              value={totals.costMonthly}
              format="currency"
              hint={`Vollkostensatz ${formatCurrency(economics.breakdown.vollkosten)} / Std.`}
              info="Lohn, Sozialversicherung, Ausfallzeiten und Gemeinkosten (ohne Gewinn), inklusive Winterdienst und Hausmeisterservice."
            />
            <Kpi
              label="Deckungsbeitrag"
              value={totals.contributionMonthly}
              format="currency"
              signed
              tone={totals.contributionMonthly < 0 ? "critical" : undefined}
              statusLabel={totals.contributionMonthly < 0 ? "Verlust" : undefined}
              info="Monatspreis minus Vollkosten."
            />
            <Kpi
              label="Marge (vom Umsatz)"
              value={formatPercent(totals.marginPct)}
              tone={marginTone(totals.marginPct, economics.strategy.targetMarginPct)}
              statusLabel={marginStatusLabel(totals.marginPct, economics.strategy.targetMarginPct)}
              hint={`Ziel ${formatPercent(economics.strategy.targetMarginPct)}`}
            />
          </KpiGroup>
          <p className="text-xs text-muted-foreground">
            Basis:{" "}
            <Link
              href="/verrechnungssatz"
              className="font-medium text-primary underline underline-offset-4 focus-visible:rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ihr Verrechnungssatz
            </Link>{" "}
            (Vollkosten ohne Gewinnaufschlag).
          </p>
        </Section>

        {/* Ohne Unterhaltsreinigung (nur Winterdienst/HMS) entfällt der Raum-Chart. */}
        <div className={cn("grid gap-4", showRoomNk && "lg:grid-cols-2")}>
          <SliceChartCard
            title="Umsatz nach Raumgruppe und Leistung"
            description="Ø Monatsumsatz netto"
            slices={slices}
            shownValues={sliceValues}
            emptyText="Noch kein Umsatz vorhanden."
          />
          {showRoomNk && (
            <Card>
              <CardHeader title="Stunden pro Raum" description="Monatsstunden je Raum" />
              {hoursData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Räume vorhanden.</p>
              ) : (
                <div aria-hidden="true">
                  <ChartContainer
                    config={HOURS_CHART_CONFIG}
                    className="aspect-auto w-full"
                    style={{ height: Math.min(hoursData.length, 14) * 32 + 48 }}
                  >
                    <BarChart data={hoursData.slice(0, 14)} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${formatNumber(Number(v), 0)} h`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={112} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => String(payload?.[0]?.payload?.fullName ?? "")}
                            formatter={(value) => <span className="font-medium tabular-nums">{formatNumber(Number(value), 1)} h</span>}
                          />
                        }
                      />
                      <Bar dataKey="stunden" fill="var(--color-stunden)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </Card>
          )}
        </div>

        {roomRows.length > 0 && (
          <Section title="Raumaufstellung" description={`Rüst-/Wegezeit: ${formatNumber(cleaning.ruestzeitHours + cleaning.wegezeitHours, 1)} h/Monat zusätzlich`}>
            <DataTable<RoomRow>
              caption="Räume mit Monatsstunden und Monatspreis"
              columns={roomColumns}
              rows={roomRows}
              getRowId={(r) => r.room.id}
              density="compact"
              defaultSort={{ id: "cost", dir: "desc" }}
              mobile={(r) => (
                <ListRow
                  title={r.room.name || r.room.typeName}
                  meta={`${formatNumber(r.room.area, 0)} m² · ${FREQUENCY_LABELS[r.room.frequency]} · ${formatNumber(r.hoursShown, 1)} h`}
                  trailing={<Money value={r.costShown} className="font-medium" />}
                />
              )}
            />
          </Section>
        )}

        <Section title="Nachkalkulation" description="Vergleichen Sie Plan und Ist – die Grundlage für bessere zukünftige Kalkulationen.">
          <div className="space-y-4">
            {showRoomNk && <RoomNachkalkulationCard project={project} economics={economics} titleAs="h3" />}
            {totals.winterdienst && (
              <WinterNachkalkulationCard project={project} result={totals.winterdienst} titleAs="h3" />
            )}
            {totals.hms && <HmsNachkalkulationCard project={project} result={totals.hms} titleAs="h3" />}
          </div>
        </Section>
      </PageShell>
    </PageTransition>
  );
}
