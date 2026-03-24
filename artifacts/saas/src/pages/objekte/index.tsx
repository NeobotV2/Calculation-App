import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canAddProject } from "@/lib/feature-gates";
import { Building2, Search, Plus, MoreHorizontal, Copy, Archive, ArchiveRestore, Trash2, Calendar } from "lucide-react";
import { calcProjectTotals } from "@/lib/calc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ObjekteList() {
  const [, setLocation] = useLocation();
  const projects = useStore((s) => s.projects);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const addProject = useStore((s) => s.addProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const archiveProject = useStore((s) => s.archiveProject);
  const restoreProject = useStore((s) => s.restoreProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const plan = useStore((s) => s.plan);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = projects
    .filter((p) => {
      if (filter === "active") return p.status !== "archived";
      if (filter === "archived") return p.status === "archived";
      return true;
    })
    .filter((p) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.customer?.toLowerCase().includes(s) || p.location?.toLowerCase().includes(s);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleCreate = () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }
    const id = addProject("Neues Objekt");
    toast.success("Objekt erstellt");
    setLocation(`/objekte/${id}`);
  };

  const handleDuplicate = (id: string) => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }
    duplicateProject(id);
    toast.success("Objekt dupliziert");
    setMenuOpen(null);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    toast.success("Objekt gelöscht");
    setDeleteConfirm(null);
  };

  return (
    <PageTransition className="min-h-screen pb-24 bg-background flex flex-col">
      <div className="safe-header p-6 pb-2 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <div className="flex items-center justify-between mb-5 mt-2">
          <h1 className="text-4xl font-semibold tracking-tight">Objekte</h1>
          <span className="text-sm text-muted-foreground">{projects.filter(p => p.status !== "archived").length} aktiv</span>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Name, Kunde oder Standort suchen…" className="pl-11 bg-card border-border/40 h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 pb-3">
          {(["all", "active", "archived"] as const).map((f) => {
            const labels = { all: "Alle", active: "Aktiv", archived: "Archiviert" };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? "bg-foreground text-background" : "bg-card border border-border/30 text-muted-foreground hover:text-foreground"}`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {plan === "basic" && projects.filter(p => p.status !== "archived").length >= 3 && (
        <div className="mx-6 mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm text-muted-foreground flex items-center gap-2">
          <Building2 size={16} className="text-primary shrink-0" />
          <span>Du nutzt {projects.filter(p => p.status !== "archived").length}/3 Objekte im Basic-Plan.</span>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 size={28} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium mb-2">{search ? "Keine Treffer" : "Noch keine Objekte"}</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {search ? "Versuche einen anderen Suchbegriff." : "Erstelle dein erstes Objekt, um loszulegen."}
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const totals = calcProjectTotals(p, p.hourlyRate ?? hourlyRate);
            return (
              <div key={p.id} className="relative">
                <Link href={`/objekte/${p.id}`}>
                  <div className={`bg-card border border-border/20 rounded-2xl p-5 hover:bg-secondary transition-colors cursor-pointer active:scale-[0.98] ${p.status === "archived" ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1 pr-8">
                        <h3 className="font-semibold text-base text-foreground truncate">{p.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="truncate">{p.customer || "Kein Kunde"}</span>
                          {p.location && <><span className="w-1 h-1 rounded-full bg-border shrink-0" /><span className="truncate">{p.location}</span></>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground">{formatCurrency(totals.cost)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{totals.count} Räume</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/20">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(p.updatedAt)}</span>
                      {p.status === "archived" && <span className="text-[10px] uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">Archiviert</span>}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 border border-border/30 flex items-center justify-center z-10"
                >
                  <MoreHorizontal size={14} className="text-muted-foreground" />
                </button>

                {menuOpen === p.id && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                    <div className="absolute top-12 right-4 z-30 bg-card border border-border/40 rounded-xl shadow-xl shadow-black/20 overflow-hidden min-w-[180px]">
                      <button onClick={() => { handleDuplicate(p.id); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                        <Copy size={16} className="text-muted-foreground" /> Duplizieren
                      </button>
                      {p.status !== "archived" ? (
                        <button onClick={() => { archiveProject(p.id); toast.success("Objekt archiviert"); setMenuOpen(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                          <Archive size={16} className="text-muted-foreground" /> Archivieren
                        </button>
                      ) : (
                        <button onClick={() => { restoreProject(p.id); toast.success("Objekt wiederhergestellt"); setMenuOpen(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors">
                          <ArchiveRestore size={16} className="text-muted-foreground" /> Wiederherstellen
                        </button>
                      )}
                      <button onClick={() => { setMenuOpen(null); setDeleteConfirm(p.id); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 size={16} /> Löschen
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-20 right-6 z-40" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <Button onClick={handleCreate} size="icon" className="w-14 h-14 rounded-full shadow-lg shadow-black/30 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={26} />
        </Button>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Objekt löschen?" description="Das Objekt und alle zugehörigen Räume werden unwiderruflich gelöscht." confirmLabel="Löschen" destructive />

      <BottomNav />
    </PageTransition>
  );
}
