import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canAddProject, getObjectLimit, isPaidPlan } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { Building2, Search, Plus, MoreHorizontal, Copy, Archive, ArchiveRestore, Trash2, Edit3, Zap, ChevronDown, Clock, Ruler, AlertTriangle, Calendar, ArrowUpDown } from "lucide-react";
import { calcProjectTotals } from "@/lib/calc";
import { FREQUENCY_LABELS } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { getProjectWarnings, getWarningTypeKey, type Warning } from "@/lib/warnings";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/list-skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { trackFreeLimitReached } from "@/services/analytics-service";
import type { Project, FrequencyKey } from "@/store/use-store";

type FilterKey = "all" | "active" | "archived" | "low_margin" | "high_hours";
type SortKey = "date" | "revenue" | "margin" | "area";

function getDominantFrequency(project: Project): string {
  if (project.rooms.length === 0) return "—";
  const counts = new Map<FrequencyKey, number>();
  project.rooms.forEach((r) => {
    counts.set(r.frequency, (counts.get(r.frequency) || 0) + 1);
  });
  let maxKey: FrequencyKey = project.rooms[0].frequency;
  let maxCount = 0;
  counts.forEach((count, key) => {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  });
  return FREQUENCY_LABELS[maxKey];
}

function getMarginColor(marginPercent: number, targetMargin: number): string {
  if (marginPercent <= 0) return "text-destructive";
  if (marginPercent < targetMargin) return "text-warning";
  return "text-success";
}

function getMarginBgColor(marginPercent: number, targetMargin: number): string {
  if (marginPercent <= 0) return "bg-destructive/10 border-destructive/20";
  if (marginPercent < targetMargin) return "bg-warning/10 border-warning/20";
  return "bg-success/10 border-success/20";
}

const HIGH_HOURS_THRESHOLD = 80;

export default function ObjekteList() {
  const [, setLocation] = useLocation();
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const storeTargetMargin = useStore((s) => s.targetMargin);
  const plan = useStore((s) => s.plan);
  const actions = useStoreActions();

  const [search, setSearch] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const hydrated = useHydrated();

  const breakdown = useMemo(() => calcHourlyRate(hourlyRateConfig), [hourlyRateConfig]);
  // Anzeige-/Filter-Schwelle in Umsatzmargen-Basis (storeTargetMargin ist ein
  // Aufschlag auf Vollkosten); die Warnings-Engine konvertiert selbst und
  // erhält weiterhin den Rohwert.
  const targetMargin = markupToRevenueMargin(storeTargetMargin);
  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());

  const projectsWithTotals = useMemo(() => {
    const disabled = new Set(disabledWarnings);
    return projects.map((p) => {
      const effectiveRate = p.hourlyRate ?? hourlyRate;
      const totals = calcProjectTotals(p, effectiveRate);
      const vollkosten = breakdown.vollkosten;
      const marginPercent = effectiveRate > 0 && vollkosten > 0
        ? ((effectiveRate - vollkosten) / effectiveRate) * 100
        : targetMargin;
      const warnings = getProjectWarnings(p, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, storeTargetMargin)
        .filter((w) => !disabled.has(getWarningTypeKey(w.id)));
      return { project: p, totals, marginPercent, effectiveRate, warnings };
    });
  }, [projects, hourlyRate, breakdown, targetMargin, hourlyRateConfig, isDefaultRate, disabledWarnings, storeTargetMargin]);

  const filtered = useMemo(() => {
    let result = projectsWithTotals;

    if (filter === "active") result = result.filter((x) => x.project.status !== "archived");
    else if (filter === "archived") result = result.filter((x) => x.project.status === "archived");
    else if (filter === "low_margin") result = result.filter((x) => x.project.status !== "archived" && x.marginPercent < targetMargin);
    else if (filter === "high_hours") result = result.filter((x) => x.project.status !== "archived" && x.totals.hours > HIGH_HOURS_THRESHOLD);

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((x) => {
        const p = x.project;
        return p.name.toLowerCase().includes(s) || p.customer?.toLowerCase().includes(s) || p.location?.toLowerCase().includes(s);
      });
    }

    if (sortBy === "date") result = [...result].sort((a, b) => new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime());
    else if (sortBy === "revenue") result = [...result].sort((a, b) => b.totals.cost - a.totals.cost);
    else if (sortBy === "margin") result = [...result].sort((a, b) => a.marginPercent - b.marginPercent);
    else if (sortBy === "area") result = [...result].sort((a, b) => b.totals.area - a.totals.area);

    return result;
  }, [projectsWithTotals, filter, search, sortBy, targetMargin]);

  const activeProjectCount = projects.filter(p => p.status !== "archived").length;

  const showUpgrade = (gate: { reason?: string; trigger?: UpgradeTrigger }) => {
    setUpgradeReason(gate.reason || "");
    setUpgradeTrigger(gate.trigger);
    setUpgradeOpen(true);
    if (gate.trigger) {
      trackFreeLimitReached(gate.trigger, activeProjectCount);
    }
  };

  const handleCreate = () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    setLocation("/objekte/neu");
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
      toast.error(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    setMenuOpen(null);
    try {
      await actions.duplicateProject(id);
      toast.success("Objekt dupliziert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Duplizieren");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      await actions.deleteProject(id);
      toast.success("Objekt gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  const handleArchive = async (id: string) => {
    setMenuOpen(null);
    try {
      await actions.archiveProject(id);
      toast.success("Objekt archiviert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Archivieren");
    }
  };

  const handleRestore = async (id: string) => {
    setMenuOpen(null);
    try {
      await actions.restoreProject(id);
      toast.success("Objekt wiederhergestellt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Wiederherstellen");
    }
  };

  const handleRename = async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      await actions.updateProject(id, { name: name.trim() });
      toast.success("Umbenannt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Umbenennen");
    }
    setRenameId(null);
  };

  const sortLabels: Record<SortKey, string> = {
    date: "Letzte Bearbeitung",
    revenue: "Monatsumsatz",
    margin: "Marge (niedrig → hoch)",
    area: "Fläche (groß → klein)",
  };

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "active", label: "Aktiv" },
    { key: "archived", label: "Archiviert" },
    { key: "low_margin", label: "Schwach kalkuliert" },
    { key: "high_hours", label: "Hoher Stundenanteil" },
  ];

  return (
    <PageTransition className="min-h-screen pb-24 md:pb-8 bg-background flex flex-col">
      <div className="safe-header p-6 pb-2 bg-background/95 sticky top-0 z-40 border-b border-border/20 md:pt-6">
        <div className="flex items-center justify-between mb-5 mt-2 max-w-6xl mx-auto">
          <h1 className="text-4xl font-semibold tracking-tight">Objekte</h1>
          <span className="text-sm text-muted-foreground">{activeProjectCount} aktiv</span>
        </div>
        <div className="relative mb-4 max-w-6xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} aria-hidden="true" />
          <Input aria-label="Objekte suchen" placeholder="Name, Kunde oder Standort suchen…" className="pl-11 bg-card border-border/40 h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar max-w-6xl mx-auto">
          {filterChips.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === f.key ? "bg-foreground text-background" : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pb-3 max-w-6xl mx-auto">
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sortierung: <span className="font-medium text-foreground">{sortLabels[sortBy]}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {showSortMenu && (
              <>
                <div aria-hidden="true" className="fixed inset-0 z-20" onClick={() => setShowSortMenu(false)} />
                <div role="menu" className="absolute top-8 left-0 z-30 bg-card border border-border/40 rounded-xl shadow-xl shadow-black/20 overflow-hidden min-w-[200px]">
                  {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                    <button
                      key={key}
                      role="menuitemradio"
                      aria-checked={sortBy === key}
                      onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${sortBy === key ? "text-primary font-medium" : "text-foreground"}`}
                    >
                      {sortLabels[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} Objekte</span>
        </div>
      </div>

      {!isPaidPlan(plan) && (
        <div className="mx-6 mt-4 max-w-6xl md:mx-auto md:px-6">
          <p className="text-xs text-muted-foreground">
            Sie nutzen {activeProjectCount} von {getObjectLimit()} kostenlosen {getObjectLimit() === 1 ? "Objekt" : "Objekten"}.
            {activeProjectCount >= getObjectLimit() && " Für weitere Objekte wechseln Sie zum Pro-Plan."}
          </p>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col gap-3 max-w-6xl mx-auto w-full">
        {!hydrated ? (
          <ListSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 size={28} className="text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium mb-2">{search ? "Keine Treffer" : filter === "low_margin" ? "Keine schwach kalkulierten Objekte" : filter === "high_hours" ? "Keine Objekte mit hohem Stundenanteil" : "Noch keine Objekte"}</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {search ? "Versuchen Sie einen anderen Suchbegriff." : filter === "low_margin" ? "Alle Objekte liegen über der Ziel-Marge." : filter === "high_hours" ? `Kein Objekt hat mehr als ${HIGH_HOURS_THRESHOLD} Stunden/Monat.` : "Erstellen Sie Ihr erstes Objekt, um loszulegen."}
            </p>
          </div>
        ) : (
          filtered.map(({ project: p, totals, marginPercent, warnings }) => {
            const dominantInterval = getDominantFrequency(p);
            const hasCritical = warnings.some((w) => w.severity === "critical");
            const hasWarning = warnings.some((w) => w.severity === "warning");
            return (
              <div key={p.id} className="relative">
                <Link href={`/objekte/${p.id}`}>
                  <div className={`bg-card border border-border/20 rounded-2xl p-5 hover:bg-secondary transition-colors cursor-pointer active:scale-[0.98] ${p.status === "archived" ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1 pr-8">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-foreground truncate">{p.name}</h3>
                          {(hasCritical || hasWarning) && (
                            <AlertTriangle size={14} aria-hidden="true" className={`shrink-0 ${hasCritical ? "text-destructive" : "text-warning"}`} />
                          )}
                          {p.status === "archived" && (
                            <span className="text-[10px] uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full shrink-0">Archiviert</span>
                          )}
                          {p.status !== "archived" && (new Date().getTime() - new Date(p.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 && (
                            <span className="text-[10px] uppercase tracking-widest bg-info/10 text-info px-2 py-0.5 rounded-full shrink-0">Neu</span>
                          )}
                          {p.status !== "archived" && (new Date().getTime() - new Date(p.createdAt).getTime()) >= 7 * 24 * 60 * 60 * 1000 && (
                            <span className="text-[10px] uppercase tracking-widest bg-success/10 text-success px-2 py-0.5 rounded-full shrink-0">Aktiv</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="truncate">{p.customer || "Kein Kunde"}</span>
                          {p.location && <><span className="w-1 h-1 rounded-full bg-border shrink-0" /><span className="truncate">{p.location}</span></>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground">{formatCurrency(totals.cost)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">/ Monat</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/20">
                      <div className="flex items-center gap-1.5">
                        <Ruler size={12} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">{formatNumber(totals.area, 0)} m²</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">{formatNumber(totals.hours, 1)} h</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-muted-foreground">{dominantInterval}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                      <span className="text-[11px] text-muted-foreground">{totals.count} Räume · {formatDate(p.updatedAt)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getMarginBgColor(marginPercent, targetMargin)} ${getMarginColor(marginPercent, targetMargin)}`}>
                        {formatNumber(marginPercent, 1)}% Marge
                      </span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                  aria-label={`Optionen für ${p.name}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen === p.id}
                  className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-background/80 border border-border/30 flex items-center justify-center z-10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MoreHorizontal size={16} aria-hidden="true" />
                </button>

                {menuOpen === p.id && (
                  <>
                    <div aria-hidden="true" className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                    <div role="menu" className="absolute top-12 right-4 z-30 bg-card border border-border/40 rounded-xl shadow-xl shadow-black/20 overflow-hidden min-w-[180px]">
                      <button role="menuitem" onClick={() => { setRenameId(p.id); setRenameName(p.name); setMenuOpen(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                        <Edit3 size={16} className="text-muted-foreground" aria-hidden="true" /> Umbenennen
                      </button>
                      <button role="menuitem" onClick={() => handleDuplicate(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                        <Copy size={16} className="text-muted-foreground" aria-hidden="true" /> Duplizieren
                      </button>
                      {p.status !== "archived" ? (
                        <button role="menuitem" onClick={() => handleArchive(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                          <Archive size={16} className="text-muted-foreground" aria-hidden="true" /> Archivieren
                        </button>
                      ) : (
                        <button role="menuitem" onClick={() => handleRestore(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                          <ArchiveRestore size={16} className="text-muted-foreground" aria-hidden="true" /> Wiederherstellen
                        </button>
                      )}
                      <button role="menuitem" onClick={() => { setMenuOpen(null); setDeleteConfirm(p.id); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={16} aria-hidden="true" /> Löschen
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-20 md:bottom-6 right-6 md:right-10 z-40 flex flex-col items-end gap-3" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button
          onClick={handleQuickCreate}
          disabled={isWorking}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/30 shadow-lg shadow-black/20 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Zap size={14} aria-hidden="true" />
          Schnell erstellen
        </button>
        <Button onClick={handleCreate} className="h-14 px-6 rounded-full shadow-lg shadow-black/30 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2" disabled={isWorking}>
          <Plus size={22} aria-hidden="true" />
          <span className="font-semibold">Neues Objekt</span>
        </Button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} triggerReason={upgradeTrigger} />
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Objekt löschen?" description="Das Objekt und alle zugehörigen Räume werden unwiderruflich gelöscht." confirmLabel="Löschen" destructive />

      {renameId && (
        <>
          <div aria-hidden="true" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]" onClick={() => setRenameId(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-title"
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[70] bg-card border border-border/40 rounded-3xl p-6 max-w-sm md:max-w-md mx-auto"
          >
            <h3 id="rename-title" className="font-semibold text-lg mb-4">Objekt umbenennen</h3>
            <label htmlFor="rename-input" className="sr-only">Objektname</label>
            <Input
              id="rename-input"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              autoFocus
              className="bg-background h-12 mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(renameId, renameName);
                if (e.key === "Escape") setRenameId(null);
              }}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRenameId(null)} className="flex-1 h-12">Abbrechen</Button>
              <Button onClick={() => handleRename(renameId, renameName)} className="flex-1 h-12">Speichern</Button>
            </div>
          </div>
        </>
      )}

    </PageTransition>
  );
}
