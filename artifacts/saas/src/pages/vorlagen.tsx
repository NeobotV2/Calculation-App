import { useState } from "react";
import { useLocation, Link } from "wouter";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Building2, Crown, Ellipsis, FilePlus2, PenLine, Trash2 } from "lucide-react";
import { useStore, type Template } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { canUseTemplates } from "@/lib/feature-gates";
import { isPaidPlan } from "@/lib/billing-config";
import { calcDraftFromTemplate, isCalcDraftEmpty } from "@/lib/drafts";
import { formatDate, formatNumber } from "@/lib/utils";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ListRow } from "@/components/ui/list-row";
import { StateView } from "@/components/ui/state-view";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RenameSheet } from "@/pages/objekte/list-parts/RenameSheet";

function templateArea(t: Template): number {
  return t.rooms.reduce((sum, r) => sum + (Number.isFinite(r.area) ? r.area : 0), 0);
}

export default function Vorlagen() {
  const [, navigate] = useLocation();
  const templates = useStore((s) => s.templates);
  const plan = useStore((s) => s.plan);
  const calcDraft = useStore((s) => s.calcDraft);
  const setCalcDraft = useStore((s) => s.setCalcDraft);
  const actions = useStoreActions();
  const { hasLoadedOnce } = useSyncStatus();
  const initialLoading = useInitialLoading();
  const paid = isPaidPlan(plan);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [deleteTpl, setDeleteTpl] = useState<Template | null>(null);
  const [renameTpl, setRenameTpl] = useState<Template | null>(null);
  const [replaceTpl, setReplaceTpl] = useState<Template | null>(null);

  const applyTemplate = (t: Template) => {
    setCalcDraft(calcDraftFromTemplate(t, uuidv4));
    navigate("/kalkulation/neu/objekt");
  };

  const startFromTemplate = (t: Template) => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      setUpgradeOpen(true);
      return;
    }
    if (calcDraft && !isCalcDraftEmpty(calcDraft)) {
      setReplaceTpl(t);
      return;
    }
    applyTemplate(t);
  };

  const handleDelete = async (t: Template) => {
    try {
      await actions.deleteTemplate(t.id);
      toast.success("Vorlage gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Die Vorlage konnte nicht gelöscht werden.");
    }
  };

  const renderRowMenu = (t: Template, includeStart = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Aktionen für Vorlage ${t.name}`} icon={Ellipsis} size="sm" tooltip={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {includeStart && (
          <>
            <DropdownMenuItem onSelect={() => startFromTemplate(t)}>
              <FilePlus2 aria-hidden="true" />
              Neue Kalkulation aus Vorlage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => setRenameTpl(t)}>
          <PenLine aria-hidden="true" />
          Umbenennen
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => setDeleteTpl(t)}>
          <Trash2 aria-hidden="true" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<Template>[] = [
    {
      id: "name",
      header: "Vorlage",
      sortable: true,
      sortValue: (t) => t.name,
      cell: (t) => <span className="font-medium text-foreground">{t.name}</span>,
    },
    { id: "rooms", header: "Räume", numeric: true, sortable: true, sortValue: (t) => t.rooms.length, cell: (t) => t.rooms.length },
    {
      id: "area",
      header: "Fläche",
      unit: "m²",
      numeric: true,
      sortable: true,
      sortValue: templateArea,
      cell: (t) => formatNumber(templateArea(t), 0),
    },
    {
      id: "created",
      header: "Erstellt",
      sortable: true,
      sortValue: (t) => new Date(t.createdAt).getTime() || 0,
      cell: (t) => <span className="tabular-nums text-muted-foreground">{formatDate(t.createdAt)}</span>,
    },
  ];

  const renderList = () => {
    if (!hasLoadedOnce) {
      return initialLoading ? (
        <DataTable<Template> caption="Vorlagen" columns={columns} rows={[]} getRowId={(t) => t.id} mobile={() => null} loading />
      ) : (
        <div className="min-h-48" aria-busy="true" />
      );
    }
    if (templates.length === 0) {
      return (
        <StateView
          kind="empty"
          title="Noch keine Vorlagen"
          description="Öffnen Sie ein Objekt und wählen Sie „Als Vorlage speichern“."
          action={{ label: "Zu den Objekten", icon: Building2, href: "/objekte" }}
        />
      );
    }
    return (
      <DataTable<Template>
        caption="Vorlagen"
        columns={columns}
        rows={templates}
        getRowId={(t) => t.id}
        defaultSort={{ id: "created", dir: "desc" }}
        rowActions={(t) => (
          <div className="flex items-center justify-end gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => startFromTemplate(t)}>
              <FilePlus2 aria-hidden="true" />
              Neue Kalkulation aus Vorlage
            </Button>
            {renderRowMenu(t)}
          </div>
        )}
        mobile={(t) => (
          <ListRow
            title={t.name}
            meta={`${t.rooms.length} ${t.rooms.length === 1 ? "Raum" : "Räume"} · ${formatNumber(templateArea(t), 0)} m² · ${formatDate(t.createdAt)}`}
            trailing={
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="tonal"
                  aria-label={`Verwenden: neue Kalkulation aus Vorlage ${t.name}`}
                  onClick={() => startFromTemplate(t)}
                >
                  Verwenden
                </Button>
                {renderRowMenu(t, true)}
              </>
            }
          />
        )}
      />
    );
  };

  return (
    <PageTransition>
      <PageShell header={<PageHeader title="Vorlagen" back={{ href: "/mehr", label: "Mehr" }} />}>
        {!paid && (
          <Callout
            tone="info"
            icon={Crown}
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                Vorlagen sind im Pro-Plan enthalten
                <Badge tone="brand" size="sm">
                  <Crown aria-hidden="true" />
                  Pro
                </Badge>
              </span>
            }
            action={
              <Button asChild size="sm" variant="secondary">
                <Link href="/upgrade">Pro-Plan ansehen</Link>
              </Button>
            }
          >
            Speichern Sie bewährte Leistungsverzeichnisse als Vorlage und starten Sie damit neue Kalkulationen für
            ähnliche Objekte.
          </Callout>
        )}

        <Callout tone="neutral">Vorlagen enthalten nur Räume (keine Winterdienst-/HMS-Daten).</Callout>

        {renderList()}
      </PageShell>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} triggerReason="template_save" />
      <ConfirmDialog
        open={!!deleteTpl}
        onClose={() => setDeleteTpl(null)}
        onConfirm={() => {
          if (deleteTpl) void handleDelete(deleteTpl);
        }}
        title="Vorlage löschen?"
        description={`Die Vorlage „${deleteTpl?.name ?? ""}“ wird unwiderruflich gelöscht. Bestehende Objekte bleiben unverändert.`}
        confirmLabel="Löschen"
        destructive
      />
      <ConfirmDialog
        open={!!replaceTpl}
        onClose={() => setReplaceTpl(null)}
        onConfirm={() => {
          if (replaceTpl) applyTemplate(replaceTpl);
        }}
        title="Vorhandenen Entwurf ersetzen?"
        description={
          calcDraft?.editingId
            ? "Es gibt eine nicht abgeschlossene Bearbeitung eines Objekts. Wenn Sie fortfahren, wird dieser Entwurf durch die Vorlage ersetzt."
            : "Es gibt einen nicht abgeschlossenen Kalkulationsentwurf. Wenn Sie fortfahren, wird er durch die Vorlage ersetzt."
        }
        confirmLabel="Entwurf ersetzen"
        destructive
      />
      <RenameSheet
        open={!!renameTpl}
        onOpenChange={(open) => {
          if (!open) setRenameTpl(null);
        }}
        title="Vorlage umbenennen"
        label="Name der Vorlage"
        initialName={renameTpl?.name ?? ""}
        onSave={async (name) => {
          if (!renameTpl) return;
          await actions.renameTemplate(renameTpl.id, name);
          toast.success("Vorlage umbenannt");
        }}
      />
    </PageTransition>
  );
}
