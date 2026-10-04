import { useMemo } from "react";
import { Link } from "wouter";
import { Calculator, Landmark, Plus, RotateCcw } from "lucide-react";
import { isDemoProject, useStore } from "@/store/use-store";
import { useEconomicsSettings, usePortfolioEconomics } from "@/hooks/use-object-economics";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { isRateChecked } from "@/lib/object-economics";
import { DEFAULT_COMPANY_NAME, type CompanyInfo } from "@/lib/offer-readiness";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { marginStatusLabel, marginTone } from "@/lib/status";
import { countLimitedProjects, getObjectLimit, isPaidPlan } from "@/lib/feature-gates";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { AppFooter } from "@/components/layout/AppFooter";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { Skeleton } from "@/components/ui/skeleton";
import { StateView } from "@/components/ui/state-view";
import { buildObjectRow, formatPercent } from "@/pages/objekte/list-parts/objects-filter";
import { GettingStartedCard } from "@/pages/home/GettingStartedCard";
import { DraftResumeCard } from "@/pages/home/DraftResumeCard";
import { OpenTasksSection, buildOpenTasks } from "@/pages/home/OpenTasksSection";
import { RecentObjectsTable, pickRecentRows } from "@/pages/home/RecentObjectsTable";

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

const blank = (v: string | undefined | null) => !v || v.trim() === "";

function KpiSkeleton() {
  return (
    <KpiGroup columns={4} aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      ))}
    </KpiGroup>
  );
}

export default function Home() {
  const projects = useStore((s) => s.projects);
  const plan = useStore((s) => s.plan);
  const nachkalkulationen = useStore((s) => s.nachkalkulationen);
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const settings = useEconomicsSettings();
  const { status: syncStatus, hasLoadedOnce, reload } = useSyncStatus();
  const initialLoading = useInitialLoading();

  const company = useMemo<CompanyInfo>(
    () => ({ companyName, companyStreet, companyZip, companyCity }),
    [companyName, companyStreet, companyZip, companyCity],
  );
  const activeProjects = useMemo(() => projects.filter((p) => p.status !== "archived"), [projects]);
  const economics = usePortfolioEconomics(activeProjects);
  const rows = useMemo(
    () =>
      activeProjects.flatMap((p) => {
        const econ = economics.get(p.id);
        return econ ? [buildObjectRow(p, econ, company)] : [];
      }),
    [activeProjects, economics, company],
  );

  const kpis = useMemo(() => {
    let revenue = 0;
    let contribution = 0;
    let actionNeeded = 0;
    for (const r of rows) {
      revenue += r.econ.totals.priceMonthly;
      contribution += r.econ.totals.contributionMonthly;
      if (r.status.key === "entwurf" || r.status.key === "pruefung_offen") actionNeeded += 1;
    }
    const margin = revenue > 0 ? (contribution / revenue) * 100 : Number.NaN;
    return { revenue, margin, actionNeeded };
  }, [rows]);

  const tasks = useMemo(() => {
    const withActuals = new Set(rows.filter((r) => r.project.serviceActuals).map((r) => r.project.id));
    return buildOpenTasks(rows, (id) => !!nachkalkulationen[id] || withActuals.has(id));
  }, [rows, nachkalkulationen]);
  const recent = useMemo(() => pickRecentRows(rows), [rows]);

  const targetMarginPct = markupToRevenueMargin(settings.targetMargin);
  const paid = isPaidPlan(plan);
  const objectLimit = getObjectLimit();
  const companyComplete =
    !blank(companyName) && companyName.trim() !== DEFAULT_COMPANY_NAME && !blank(companyStreet) && !blank(companyCity);
  const rateChecked = useMemo(
    () => isRateChecked(settings.hourlyRate, settings.hourlyRateConfig, settings.confirmedHourlyRate),
    [settings.hourlyRate, settings.hourlyRateConfig, settings.confirmedHourlyRate],
  );
  // Beispielobjekte zählen weder zum Objektlimit noch als eigene Kalkulation.
  const ownProjects = projects.filter((p) => !isDemoProject(p));
  const refreshing = syncStatus === "loading" && hasLoadedOnce;
  const firstLoadPending = !hasLoadedOnce;

  const renderPortfolio = () => {
    if (firstLoadPending) {
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
      if (!initialLoading) return <div className="min-h-64" aria-busy="true" />;
      return (
        <>
          <KpiSkeleton />
          <RecentObjectsTable rows={[]} loading />
        </>
      );
    }

    if (rows.length === 0) {
      const hasArchived = projects.length > 0;
      return (
        <StateView
          kind="empty"
          title={hasArchived ? "Keine aktiven Objekte" : "Noch keine Objekte"}
          description={
            hasArchived
              ? "Alle Objekte sind archiviert. Starten Sie eine neue Kalkulation oder stellen Sie ein Objekt wieder her."
              : "Kalkulieren Sie Ihr erstes Objekt – Unterhaltsreinigung, Winterdienst oder Hausmeisterservice."
          }
          action={{ label: "Neue Kalkulation", icon: Plus, href: "/kalkulation/neu" }}
          secondaryAction={hasArchived ? { label: "Zu den Objekten", href: "/objekte" } : undefined}
        />
      );
    }

    return (
      <>
        <Section title="Überblick">
          <KpiGroup columns={4}>
            <Kpi
              label="Monatsumsatz"
              value={kpis.revenue}
              format="currency"
              emphasis="primary"
              info="Summe der Monatspreise netto (Ø pro Monat) aller aktiven Objekte, inklusive Winterdienst und Hausmeisterservice."
            />
            <Kpi
              label="Ø Marge"
              value={formatPercent(kpis.margin)}
              emphasis="primary"
              tone={Number.isFinite(kpis.margin) ? marginTone(kpis.margin, targetMarginPct) : undefined}
              statusLabel={marginStatusLabel(kpis.margin, targetMarginPct)}
              hint={`Ziel ${formatPercent(targetMarginPct)} vom Umsatz`}
              info="Preisgewichtet: Summe der Deckungsbeiträge geteilt durch die Summe der Monatspreise."
            />
            <Kpi
              label="Aktive Objekte"
              value={rows.length}
              format="number"
              emphasis="primary"
              hint={paid ? undefined : `${countLimitedProjects(projects)} von ${objectLimit} im Basic-Plan`}
            />
            <Kpi
              label="Handlungsbedarf"
              value={kpis.actionNeeded}
              format="number"
              emphasis="primary"
              tone={kpis.actionNeeded > 0 ? "warning" : undefined}
              hint={kpis.actionNeeded > 0 ? "Entwurf oder Prüfung offen" : "Alles angebotsbereit"}
            />
          </KpiGroup>
        </Section>

        <OpenTasksSection tasks={tasks} />

        <Section
          title="Zuletzt bearbeitet"
          action={
            <Button asChild variant="link" size="sm">
              <Link href="/objekte">Alle Objekte</Link>
            </Button>
          }
        >
          <RecentObjectsTable rows={recent} />
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
            title={greeting()}
            width="wide"
            meta={
              <>
                <span className="truncate">{companyName}</span>
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
        {hasLoadedOnce && (
          <GettingStartedCard
            companyComplete={companyComplete}
            rateChecked={rateChecked}
            hasCalculation={ownProjects.length > 0}
          />
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg">
            <Link href="/kalkulation/neu">
              <Plus aria-hidden="true" />
              Neue Kalkulation
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/ausschreibung">
              <Landmark aria-hidden="true" />
              Ausschreibung importieren
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/verrechnungssatz">
              <Calculator aria-hidden="true" />
              Verrechnungssatz prüfen
            </Link>
          </Button>
        </div>

        <DraftResumeCard />

        {renderPortfolio()}

        <AppFooter />
      </PageShell>
    </PageTransition>
  );
}
