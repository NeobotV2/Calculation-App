import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { FilePlus2, Plus, RotateCcw } from "lucide-react";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { usePortfolioEconomics } from "@/hooks/use-object-economics";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StateView } from "@/components/ui/state-view";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlanLimitError, canAddProject, canRestoreProject, countLimitedProjects, getObjectLimit, isPaidPlan } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import type { CompanyInfo } from "@/lib/offer-readiness";
import { trackFreeLimitReached } from "@/services/analytics-service";
import { ObjectsToolbar } from "./list-parts/ObjectsToolbar";
import { ObjectsTable } from "./list-parts/ObjectsTable";
import { RenameSheet } from "./list-parts/RenameSheet";
import {
  DEFAULT_OBJECTS_FILTER,
  DEFAULT_OBJECTS_SORT,
  buildObjectRow,
  countObjectsByTab,
  filterObjectRows,
  hasActiveObjectFilters,
  sortObjectRows,
  type ObjectRow,
  type ObjectsFilterState,
  type ObjectsSort,
  type ObjectsTab,
} from "./list-parts/objects-filter";

export default function ObjekteList() {
  const [, setLocation] = useLocation();
  const projects = useStore((s) => s.projects);
  const plan = useStore((s) => s.plan);
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const actions = useStoreActions();
  const { status: syncStatus, hasLoadedOnce, reload } = useSyncStatus();
  const initialLoading = useInitialLoading();

  const [filter, setFilter] = useState<ObjectsFilterState>(DEFAULT_OBJECTS_FILTER);
  const [sort, setSort] = useState<ObjectsSort>(DEFAULT_OBJECTS_SORT);
  // Erhöht sich bei Sortierwahl unter md → Tabelle übernimmt die neue Sortierung.
  const [sortEpoch, setSortEpoch] = useState(0);
  const [renameRow, setRenameRow] = useState<ObjectRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ObjectRow | null>(null);
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason?: string; trigger?: UpgradeTrigger }>({ open: false });
  const [isWorking, setIsWorking] = useState(false);

  const company = useMemo<CompanyInfo>(
    () => ({ companyName, companyStreet, companyZip, companyCity }),
    [companyName, companyStreet, companyZip, companyCity],
  );
  const economics = usePortfolioEconomics(projects);
  const rows = useMemo(
    () =>
      projects.flatMap((p) => {
        const econ = economics.get(p.id);
        return econ ? [buildObjectRow(p, econ, company)] : [];
      }),
    [projects, economics, company],
  );
  const counts = useMemo(() => countObjectsByTab(rows), [rows]);
  const visible = useMemo(() => sortObjectRows(filterObjectRows(rows, filter), sort), [rows, filter, sort]);
  const activeCount = counts.active;
  const limitedCount = useMemo(() => countLimitedProjects(projects), [projects]);
  const objectLimit = getObjectLimit();
  const paid = isPaidPlan(plan);

  const showUpgrade = (gate: { reason?: string; trigger?: UpgradeTrigger }) => {
    setUpgrade({ open: true, reason: gate.reason, trigger: gate.trigger });
    if (gate.trigger) trackFreeLimitReached(gate.trigger, activeCount);
  };

  const handleCreate = () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    setLocation("/kalkulation/neu");
  };

  const handleQuickCreate = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    setIsWorking(true);
    try {
      const id = await actions.addProject("Neues Objekt");
      toast.success("Objekt erstellt");
      setLocation(`/objekte/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Das Objekt konnte nicht erstellt werden.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDuplicate = async (row: ObjectRow) => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    try {
      await actions.duplicateProject(row.project.id);
      toast.success("Objekt dupliziert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Das Objekt konnte nicht dupliziert werden.");
    }
  };

  const handleRestore = async (row: ObjectRow) => {
    const gate = canRestoreProject(row.project.id);
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    try {
      await actions.restoreProject(row.project.id);
      toast.success("Objekt wiederhergestellt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Das Objekt konnte nicht wiederhergestellt werden.");
    }
  };

  const handleArchive = async (row: ObjectRow) => {
    try {
      await actions.archiveProject(row.project.id);
      toast.success("Objekt archiviert", {
        action: { label: "Rückgängig", onClick: () => void handleRestore(row) },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Das Objekt konnte nicht archiviert werden.");
    }
  };

  const handleDelete = async (row: ObjectRow) => {
    try {
      await actions.deleteProject(row.project.id);
      toast.success("Objekt gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Das Objekt konnte nicht gelöscht werden.");
    }
  };

  const resetFilters = () => setFilter((f) => ({ ...DEFAULT_OBJECTS_FILTER, tab: f.tab }));

  const rowActions = {
    onDuplicate: (row: ObjectRow) => void handleDuplicate(row),
    onRename: (row: ObjectRow) => setRenameRow(row),
    onArchive: (row: ObjectRow) => void handleArchive(row),
    onRestore: (row: ObjectRow) => void handleRestore(row),
    onDelete: (row: ObjectRow) => setDeleteRow(row),
  };

  const renderList = () => {
    if (!hasLoadedOnce) {
      if (syncStatus === "error") {
        return (
          <StateView
            kind="error"
            title="Objekte konnten nicht geladen werden"
            description="Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
            action={{ label: "Erneut versuchen", icon: RotateCcw, onClick: reload }}
          />
        );
      }
      // Erstes Laden: Skelett erst nach 200 ms, nie „Noch keine Objekte".
      return initialLoading ? (
        <ObjectsTable rows={[]} loading sort={sort} onSortChange={setSort} {...rowActions} />
      ) : (
        <div className="min-h-64" aria-busy="true" />
      );
    }

    if (rows.length === 0) {
      return (
        <StateView
          kind="empty"
          title="Noch keine Objekte"
          description="Kalkulieren Sie Ihr erstes Objekt – Unterhaltsreinigung, Winterdienst oder Hausmeisterservice."
          action={{ label: "Neue Kalkulation", icon: Plus, onClick: handleCreate }}
        />
      );
    }

    let empty;
    if (hasActiveObjectFilters(filter)) {
      empty = (
        <StateView
          kind="empty"
          compact
          title="Keine Treffer"
          description="Kein Objekt passt zu Suche und Filtern."
          action={{ label: "Filter zurücksetzen", onClick: resetFilters }}
        />
      );
    } else if (filter.tab === "archived") {
      empty = (
        <StateView
          kind="empty"
          compact
          title="Keine archivierten Objekte"
          description="Archivierte Objekte erscheinen hier und können wiederhergestellt werden."
          action={{ label: "Aktive Objekte anzeigen", onClick: () => setFilter((f) => ({ ...f, tab: "active" })) }}
        />
      );
    } else {
      empty = (
        <StateView
          kind="empty"
          compact
          title="Keine aktiven Objekte"
          description="Alle Objekte sind archiviert."
          action={{ label: "Neue Kalkulation", icon: Plus, onClick: handleCreate }}
        />
      );
    }

    return (
      <ObjectsTable
        key={sortEpoch}
        caption={filter.tab === "archived" ? "Archivierte Objekte" : "Aktive Objekte"}
        rows={visible}
        sort={sort}
        onSortChange={setSort}
        empty={empty}
        {...rowActions}
      />
    );
  };

  const refreshing = syncStatus === "loading" && hasLoadedOnce;

  return (
    <PageTransition>
      <PageShell
        width="wide"
        header={
          <PageHeader
            title="Objekte"
            width="wide"
            meta={
              <>
                <span>{hasLoadedOnce ? `${activeCount} aktiv` : "Wird geladen…"}</span>
                {refreshing && (
                  <span role="status" className="text-xs">
                    Aktualisiere…
                  </span>
                )}
              </>
            }
            actions={
              <Button type="button" onClick={handleCreate} disabled={isWorking}>
                <Plus aria-hidden="true" />
                Neue Kalkulation
              </Button>
            }
            menuActions={[
              {
                id: "quick-create",
                label: "Leeres Objekt anlegen",
                icon: FilePlus2,
                onClick: () => void handleQuickCreate(),
                disabled: isWorking,
              },
            ]}
          />
        }
      >
        {!paid && hasLoadedOnce && (
          <Callout
            tone="info"
            action={
              limitedCount >= objectLimit ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/upgrade">Pro-Plan ansehen</Link>
                </Button>
              ) : undefined
            }
          >
            Sie nutzen {limitedCount} von {objectLimit} kostenlosen {objectLimit === 1 ? "Objekt" : "Objekten"}
            {limitedCount < activeCount && " (Beispielobjekte zählen nicht)"}.
            {limitedCount >= objectLimit && " Für weitere Objekte wechseln Sie zum Pro-Plan."}
          </Callout>
        )}

        {hasLoadedOnce && rows.length === 0 ? (
          renderList()
        ) : (
          <Tabs
            value={filter.tab}
            onValueChange={(v) => setFilter((f) => ({ ...f, tab: v as ObjectsTab }))}
            className="space-y-4"
          >
            <ObjectsToolbar
              filter={filter}
              onFilterChange={setFilter}
              counts={counts}
              sort={sort}
              onSortChange={(s) => {
                setSort(s);
                setSortEpoch((e) => e + 1);
              }}
            />
            <TabsContent value="active">{filter.tab === "active" && renderList()}</TabsContent>
            <TabsContent value="archived">{filter.tab === "archived" && renderList()}</TabsContent>
          </Tabs>
        )}
      </PageShell>

      <UpgradeModal
        open={upgrade.open}
        onClose={() => setUpgrade({ open: false })}
        reason={upgrade.reason}
        triggerReason={upgrade.trigger}
      />
      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={() => {
          if (deleteRow) void handleDelete(deleteRow);
        }}
        title="Objekt löschen?"
        description={`„${deleteRow?.project.name || "Objekt"}“ und alle zugehörigen Daten werden unwiderruflich gelöscht.`}
        confirmLabel="Löschen"
        destructive
      />
      <RenameSheet
        open={!!renameRow}
        onOpenChange={(open) => {
          if (!open) setRenameRow(null);
        }}
        title="Objekt umbenennen"
        label="Objektname"
        initialName={renameRow?.project.name ?? ""}
        onSave={async (name) => {
          if (!renameRow) return;
          try {
            await actions.updateProject(renameRow.project.id, { name });
          } catch (err) {
            // Umbenanntes Beispielobjekt zählt zum Objektlimit.
            if (err instanceof PlanLimitError) showUpgrade(err.gate);
            throw err;
          }
          toast.success("Objekt umbenannt");
        }}
      />
    </PageTransition>
  );
}
