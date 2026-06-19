import { Layers, Plus, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPaidPlan, type PlanId } from "@/lib/billing-config";
import { DEFAULT_ROOM_GROUPS } from "@/data/room-types";
import type { CustomRoomType } from "@/store/use-store";
import { ProLock } from "./ProLock";

interface RoomTypesSectionProps {
  plan: PlanId;
  customRoomTypes: CustomRoomType[];
  showAddRoom: boolean;
  setShowAddRoom: (v: boolean) => void;
  editingRoomType: CustomRoomType | null;
  setEditingRoomType: (v: CustomRoomType | null) => void;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  newRoomGroup: string;
  setNewRoomGroup: (v: string) => void;
  newRoomPerf: string;
  setNewRoomPerf: (v: string) => void;
  onSaveRoomType: () => void;
  onStartEditRoomType: (rt: CustomRoomType) => void;
  onRequestDeleteRoomType: (id: string) => void;
  onUpgrade: () => void;
}

/** Manager for custom room types (eigene Raumarten), gated behind Pro plan. */
export function RoomTypesSection({
  plan,
  customRoomTypes,
  showAddRoom,
  setShowAddRoom,
  editingRoomType,
  setEditingRoomType,
  newRoomName,
  setNewRoomName,
  newRoomGroup,
  setNewRoomGroup,
  newRoomPerf,
  setNewRoomPerf,
  onSaveRoomType,
  onStartEditRoomType,
  onRequestDeleteRoomType,
  onUpgrade,
}: RoomTypesSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <Layers size={16} /> Raumarten
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
        <div className={!isPaidPlan(plan) ? "opacity-30 select-none pointer-events-none" : ""}>
          {customRoomTypes.length === 0 && isPaidPlan(plan) && (
            <p className="text-sm text-muted-foreground mb-4">Noch keine eigenen Raumarten definiert.</p>
          )}
          {customRoomTypes.length > 0 && (
            <div className="space-y-2 mb-4">
              {customRoomTypes.map((rt) => (
                <div key={rt.id} className="flex items-center justify-between bg-background rounded-xl px-4 py-3 border border-border/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{rt.name}</p>
                    <p className="text-xs text-muted-foreground">{rt.groupName} · {rt.performanceValue} m²/h</p>
                  </div>
                  <div className="flex gap-1">
                    <button aria-label={`Raumart „${rt.name}" bearbeiten`} onClick={() => onStartEditRoomType(rt)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                      <Edit3 size={14} className="text-muted-foreground" aria-hidden="true" />
                    </button>
                    <button aria-label={`Raumart „${rt.name}" löschen`} onClick={() => onRequestDeleteRoomType(rt.id)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center">
                      <Trash2 size={14} className="text-destructive" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddRoom ? (
            <div className="space-y-3 bg-background rounded-xl p-4 border border-border/30">
              <Input aria-label="Raumart-Name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Raumart-Name" className="bg-card h-11" />
              <select aria-label="Raumgruppe" value={newRoomGroup} onChange={(e) => setNewRoomGroup(e.target.value)} className="w-full h-11 rounded-xl border border-border/40 bg-card px-4 text-sm text-foreground focus:outline-none appearance-none">
                {DEFAULT_ROOM_GROUPS.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <Input aria-label="Leistungswert (m²/h)" value={newRoomPerf} onChange={(e) => setNewRoomPerf(e.target.value)} inputMode="decimal" placeholder="Leistungswert (m²/h)" className="bg-card h-11" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowAddRoom(false); setEditingRoomType(null); setNewRoomName(""); setNewRoomPerf(""); }} className="flex-1">Abbrechen</Button>
                <Button onClick={onSaveRoomType} className="flex-1">{editingRoomType ? "Speichern" : "Hinzufügen"}</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowAddRoom(true)} className="w-full">
              <Plus size={16} className="mr-2" /> Raumart hinzufügen
            </Button>
          )}
        </div>
        {!isPaidPlan(plan) && (
          <ProLock
            title="Erweiterte Raumarten im Pro-Plan"
            description="Legen Sie eigene Raumarten an, die zu Ihren Objekten passen."
            onUpgrade={onUpgrade}
          />
        )}
      </div>
    </section>
  );
}
