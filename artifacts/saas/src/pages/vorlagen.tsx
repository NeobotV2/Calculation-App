import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canUseTemplates } from "@/lib/feature-gates";
import { isPaidPlan } from "@/lib/billing-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function Vorlagen() {
  const [, setLocation] = useLocation();
  const templates = useStore((s) => s.templates);
  const plan = useStore((s) => s.plan);
  const actions = useStoreActions();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleLoad = async (templateId: string) => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      setUpgradeOpen(true);
      return;
    }
    try {
      const id = await actions.loadTemplate(templateId, "Neues Objekt (Vorlage)");
      if (id) {
        toast.success("Objekt aus Vorlage erstellt");
        setLocation(`/objekte/${id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Laden");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await actions.deleteTemplate(id);
      toast.success("Vorlage gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
    setDeleteConfirm(null);
  };

  const handleRename = async (id: string, name: string) => {
    try {
      await actions.renameTemplate(id, name);
      toast.success("Umbenannt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Umbenennen");
    }
    setEditingId(null);
  };

  if (!isPaidPlan(plan)) {
    return (
      <PageTransition className="min-h-screen bg-background">
        <div className="safe-header px-4 pt-12 pb-3 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="-ml-2">
            <ArrowLeft size={20} />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center text-center py-20 px-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Vorlagen</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">Speichere Objekte als Vorlagen, um sie für neue Kalkulationen wiederzuverwenden. Verfügbar im Pro-Plan.</p>
          <Button onClick={() => setLocation("/upgrade")} size="lg">Auf Pro upgraden</Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background pb-10">
      <div className="safe-header bg-background/95 sticky top-0 z-40 border-b border-border/20 px-4 pt-12 md:pt-6 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Vorlagen</h1>
      </div>

      <div className="p-6 space-y-3 max-w-5xl mx-auto">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen size={28} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Keine Vorlagen</h3>
            <p className="text-sm text-muted-foreground max-w-[260px]">Öffne ein Objekt und speichere es als Vorlage über das Menü.</p>
          </div>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.id} className="bg-card border border-border/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                {editingId === tpl.id ? (
                  <div className="flex gap-2 flex-1 mr-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-sm bg-background" autoFocus />
                    <Button size="icon" variant="ghost" onClick={() => handleRename(tpl.id, editName)}>
                      <Check size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <h3 className="font-semibold text-sm truncate">{tpl.name}</h3>
                )}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingId(tpl.id); setEditName(tpl.name); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary">
                    <Edit3 size={14} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteConfirm(tpl.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10">
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{tpl.rooms.length} Räume · {formatDate(tpl.createdAt)}</p>
              <Button variant="outline" size="sm" onClick={() => handleLoad(tpl.id)} className="w-full">
                <Plus size={14} className="mr-1.5" /> Neues Objekt aus Vorlage
              </Button>
            </div>
          ))
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason="Vorlagen sind ein Pro-Feature." />
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm); }} title="Vorlage löschen?" description="Die Vorlage wird unwiderruflich gelöscht." confirmLabel="Löschen" destructive />
    </PageTransition>
  );
}
