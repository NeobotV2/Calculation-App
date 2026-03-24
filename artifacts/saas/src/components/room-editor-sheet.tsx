import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_ROOM_TYPES } from "@/data/room-types";
import { FREQUENCY_LABELS, calcRoom } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { canOverridePerformance } from "@/lib/feature-gates";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useStore, type FrequencyKey, type Room } from "@/store/use-store";
import { X, Lock } from "lucide-react";

interface RoomEditorSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (room: Omit<Room, "id">) => void;
  editRoom?: Room;
  hourlyRate: number;
}

export function RoomEditorSheet({ open, onClose, onSave, editRoom, hourlyRate }: RoomEditorSheetProps) {
  const defaultFrequency = useStore(s => s.defaultFrequency);
  const customRoomTypes = useStore(s => s.customRoomTypes);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState(DEFAULT_ROOM_TYPES[0].id);
  const [area, setArea] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [freq, setFreq] = useState<FrequencyKey>(defaultFrequency);
  const [customPerf, setCustomPerf] = useState("");

  useEffect(() => {
    if (editRoom) {
      setName(editRoom.name);
      setTypeId(editRoom.typeId);
      setArea(editRoom.area.toString().replace(".", ","));
      setFreq(editRoom.frequency);
      setCustomPerf(editRoom.customPerformance ? editRoom.customPerformance.toString() : "");
    } else {
      setName("");
      setTypeId(DEFAULT_ROOM_TYPES[0].id);
      setArea("");
      setLength("");
      setWidth("");
      setFreq(defaultFrequency);
      setCustomPerf("");
    }
  }, [editRoom, open, defaultFrequency]);

  const allRoomTypes = [...DEFAULT_ROOM_TYPES, ...customRoomTypes];
  const selectedType = allRoomTypes.find(t => t.id === typeId) || DEFAULT_ROOM_TYPES[0];

  const areaNum = useMemo(() => {
    const parsed = parseFloat(area.replace(",", "."));
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [area]);

  useEffect(() => {
    const l = parseFloat(length.replace(",", "."));
    const w = parseFloat(width.replace(",", "."));
    if (l > 0 && w > 0) {
      setArea((l * w).toFixed(1).replace(".", ","));
    }
  }, [length, width]);

  const preview = useMemo(() => {
    if (areaNum <= 0) return null;
    const perfVal = customPerf ? parseFloat(customPerf.replace(",", ".")) : undefined;
    const room: Room = {
      id: "preview",
      name,
      typeId,
      typeName: selectedType.name,
      groupId: selectedType.groupId,
      groupName: selectedType.groupName,
      area: areaNum,
      frequency: freq,
      typePerformance: selectedType.performanceValue,
      customPerformance: perfVal && perfVal > 0 ? perfVal : undefined,
    };
    return calcRoom(room, hourlyRate);
  }, [areaNum, freq, selectedType, hourlyRate, customPerf, name, typeId]);

  const handleSave = () => {
    if (areaNum <= 0) return;
    const perfVal = customPerf ? parseFloat(customPerf.replace(",", ".")) : undefined;

    onSave({
      name: name.trim() || selectedType.name,
      typeId,
      typeName: selectedType.name,
      groupId: selectedType.groupId,
      groupName: selectedType.groupName,
      area: areaNum,
      frequency: freq,
      typePerformance: selectedType.performanceValue,
      customPerformance: perfVal && perfVal > 0 ? perfVal : undefined,
    });
    setName(""); setArea(""); setLength(""); setWidth(""); setCustomPerf("");
  };

  const overrideGate = canOverridePerformance();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl border-t border-border z-50 max-h-[92vh] overflow-y-auto"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)" }}
          >
            <div className="sticky top-0 bg-background z-10 px-6 pt-4 pb-2">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold tracking-tight">{editRoom ? "Raum bearbeiten" : "Neuer Raum"}</h2>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Raumart</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {allRoomTypes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTypeId(t.id)}
                      className={`p-3 rounded-xl border text-sm text-left transition-colors ${typeId === t.id ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-card hover:bg-secondary text-foreground"}`}
                    >
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-[11px] opacity-70 mt-0.5">{t.performanceValue} m²/h · {t.groupName}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Bezeichnung (optional)</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={selectedType.name} className="bg-card h-12" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Fläche (m²)</label>
                <Input inputMode="decimal" value={area} onChange={e => setArea(e.target.value)} placeholder="0" className="text-xl font-semibold h-14 bg-card" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Länge (m)</label>
                  <Input inputMode="decimal" value={length} onChange={e => setLength(e.target.value)} placeholder="—" className="bg-card h-11 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Breite (m)</label>
                  <Input inputMode="decimal" value={width} onChange={e => setWidth(e.target.value)} placeholder="—" className="bg-card h-11 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Häufigkeit</label>
                <select
                  value={freq}
                  onChange={e => setFreq(e.target.value as FrequencyKey)}
                  className="w-full h-12 rounded-xl border border-border/40 bg-card px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Leistungswert überschreiben (m²/h)</label>
                {overrideGate.allowed ? (
                  <Input inputMode="decimal" value={customPerf} onChange={e => setCustomPerf(e.target.value)} placeholder={selectedType.performanceValue.toString()} className="bg-card h-12" />
                ) : (
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="w-full h-12 rounded-xl border border-border/40 bg-card px-4 text-sm text-muted-foreground flex items-center gap-2 hover:bg-secondary transition-colors"
                  >
                    <Lock size={14} /> Pro-Feature — tippen zum Upgraden
                  </button>
                )}
              </div>

              {preview && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Kosten / Monat</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(preview.monthlyCost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Stunden / Monat</p>
                    <p className="text-lg font-semibold text-primary mt-1">{formatNumber(preview.monthlyHours, 1)} h</p>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={areaNum <= 0} className="w-full h-14 text-base" size="lg">
                {editRoom ? "Änderungen speichern" : "Raum hinzufügen"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={overrideGate.reason || ""} />
    </>
  );
}
