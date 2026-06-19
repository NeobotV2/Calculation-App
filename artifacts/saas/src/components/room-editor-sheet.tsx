import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_ROOM_TYPES, DEFAULT_ROOM_GROUPS } from "@/data/room-types";
import { SURCHARGE_DEFINITIONS, getTotalModifier } from "@/data/surcharges";
import { FREQUENCY_LABELS, calcRoom, getEffectivePerformance } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { canOverridePerformance } from "@/lib/feature-gates";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useStore, type FrequencyKey, type Room } from "@/store/use-store";
import { X, Lock, ChevronDown, SlidersHorizontal, Search } from "lucide-react";

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

  const [soilingLevel, setSoilingLevel] = useState<string | undefined>();
  const [furnishingLevel, setFurnishingLevel] = useState<string | undefined>();
  const [floorType, setFloorType] = useState<string | undefined>();
  const [showSurcharges, setShowSurcharges] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  useEffect(() => {
    if (editRoom) {
      setName(editRoom.name);
      setTypeId(editRoom.typeId);
      setArea(editRoom.area.toString().replace(".", ","));
      setFreq(editRoom.frequency);
      setCustomPerf(editRoom.customPerformance ? editRoom.customPerformance.toString() : "");
      setSoilingLevel(editRoom.soilingLevel);
      setFurnishingLevel(editRoom.furnishingLevel);
      setFloorType(editRoom.floorType);
      const hasSurcharges = editRoom.soilingLevel || editRoom.furnishingLevel || editRoom.floorType;
      setShowSurcharges(!!hasSurcharges);
    } else {
      setName("");
      setTypeId(DEFAULT_ROOM_TYPES[0].id);
      setArea("");
      setLength("");
      setWidth("");
      setFreq(defaultFrequency);
      setCustomPerf("");
      setSoilingLevel(undefined);
      setFurnishingLevel(undefined);
      setFloorType(undefined);
      setShowSurcharges(false);
    }
    setSearchQuery("");
    setSelectedGroupFilter(null);
  }, [editRoom, open, defaultFrequency]);

  const allRoomTypes = useMemo(() => [...DEFAULT_ROOM_TYPES, ...customRoomTypes], [customRoomTypes]);

  const allGroups = useMemo(() => {
    const groupIds = new Set(allRoomTypes.map(t => t.groupId));
    return DEFAULT_ROOM_GROUPS.filter(g => groupIds.has(g.id));
  }, [allRoomTypes]);

  const filteredRoomTypes = useMemo(() => {
    let types = allRoomTypes;
    if (selectedGroupFilter) {
      types = types.filter(t => t.groupId === selectedGroupFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      types = types.filter(t => t.name.toLowerCase().includes(q) || t.groupName.toLowerCase().includes(q));
    }
    return types;
  }, [allRoomTypes, selectedGroupFilter, searchQuery]);

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

  const surcharges = useMemo(() => ({
    soilingLevel,
    furnishingLevel,
    floorType,
  }), [soilingLevel, furnishingLevel, floorType]);

  const totalModifier = getTotalModifier(surcharges);

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
      soilingLevel,
      furnishingLevel,
      floorType,
    };
    return calcRoom(room, hourlyRate);
  }, [areaNum, freq, selectedType, hourlyRate, customPerf, name, typeId, soilingLevel, furnishingLevel, floorType]);

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
      soilingLevel: soilingLevel || undefined,
      furnishingLevel: furnishingLevel || undefined,
      floorType: floorType || undefined,
    });
    setName(""); setArea(""); setLength(""); setWidth(""); setCustomPerf("");
    setSoilingLevel(undefined); setFurnishingLevel(undefined); setFloorType(undefined);
  };

  const overrideGate = canOverridePerformance();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const surchargeSetters: Record<string, (v: string | undefined) => void> = {
    soilingLevel: setSoilingLevel,
    furnishingLevel: setFurnishingLevel,
    floorType: setFloorType,
  };

  const surchargeValues: Record<string, string | undefined> = {
    soilingLevel,
    furnishingLevel,
    floorType,
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-editor-title"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl border-t border-border z-50 max-h-[92vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:max-w-2xl md:w-full md:max-h-[85vh]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)" }}
          >
            <div className="sticky top-0 bg-background z-10 px-6 pt-4 pb-2 md:rounded-t-3xl">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 md:hidden" />
              <div className="flex items-center justify-between mb-2">
                <h2 id="room-editor-title" className="text-2xl font-semibold tracking-tight">{editRoom ? "Raum bearbeiten" : "Neuer Raum"}</h2>
                <button onClick={onClose} aria-label="Schließen" className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center">
                  <X size={16} className="text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">
              <div>
                <span className="text-sm font-medium text-foreground mb-2 block">Raumart</span>

                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Raumart suchen"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Raumart suchen…"
                    className="bg-card h-10 pl-9 text-sm"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                  <button
                    onClick={() => setSelectedGroupFilter(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedGroupFilter ? "bg-primary text-primary-foreground" : "bg-card border border-border/40 text-muted-foreground hover:text-foreground"}`}
                  >
                    Alle
                  </button>
                  {allGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupFilter(selectedGroupFilter === g.id ? null : g.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedGroupFilter === g.id ? "bg-primary text-primary-foreground" : "bg-card border border-border/40 text-muted-foreground hover:text-foreground"}`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mt-2">
                  {filteredRoomTypes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTypeId(t.id)}
                      className={`p-3 rounded-xl border text-sm text-left transition-colors ${typeId === t.id ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-card hover:bg-secondary text-foreground"}`}
                    >
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-[11px] opacity-70 mt-0.5">{t.performanceValue} m²/h</div>
                    </button>
                  ))}
                  {filteredRoomTypes.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-sm text-muted-foreground">
                      Keine Raumarten gefunden
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="room-name" className="text-sm font-medium text-foreground mb-2 block">Bezeichnung (optional)</label>
                <Input id="room-name" value={name} onChange={e => setName(e.target.value)} placeholder={selectedType.name} className="bg-card h-12" />
              </div>

              <div>
                <label htmlFor="room-area" className="text-sm font-medium text-foreground mb-2 block">Fläche (m²)</label>
                <Input id="room-area" inputMode="decimal" value={area} onChange={e => setArea(e.target.value)} placeholder="0" className="text-xl font-semibold h-14 bg-card" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="room-length" className="text-xs text-muted-foreground mb-1 block">Länge (m)</label>
                  <Input id="room-length" inputMode="decimal" value={length} onChange={e => setLength(e.target.value)} placeholder="—" className="bg-card h-11 text-sm" />
                </div>
                <div>
                  <label htmlFor="room-width" className="text-xs text-muted-foreground mb-1 block">Breite (m)</label>
                  <Input id="room-width" inputMode="decimal" value={width} onChange={e => setWidth(e.target.value)} placeholder="—" className="bg-card h-11 text-sm" />
                </div>
              </div>

              <div>
                <label htmlFor="room-frequency" className="text-sm font-medium text-foreground mb-2 block">Häufigkeit</label>
                <select
                  id="room-frequency"
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
                <label htmlFor="room-custom-perf" className="text-sm font-medium text-foreground mb-2 block">Leistungswert überschreiben (m²/h)</label>
                {overrideGate.allowed ? (
                  <Input id="room-custom-perf" inputMode="decimal" value={customPerf} onChange={e => setCustomPerf(e.target.value)} placeholder={selectedType.performanceValue.toString()} className="bg-card h-12" />
                ) : (
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="w-full h-12 rounded-xl border border-border/40 bg-card px-4 text-sm text-muted-foreground flex items-center gap-2 hover:bg-secondary transition-colors"
                  >
                    <Lock size={14} aria-hidden="true" /> Pro-Feature — tippen zum Upgraden
                  </button>
                )}
              </div>

              <div className="border border-border/30 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowSurcharges(!showSurcharges)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <SlidersHorizontal size={16} className="text-muted-foreground" aria-hidden="true" />
                    Zu-/Abschläge
                    {totalModifier !== 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${totalModifier > 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {totalModifier > 0 ? "+" : ""}{Math.round(totalModifier * 100)}%
                      </span>
                    )}
                  </span>
                  <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showSurcharges ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>

                {showSurcharges && (
                  <div className="px-4 py-4 space-y-4 bg-card/50 border-t border-border/20">
                    {SURCHARGE_DEFINITIONS.map(def => (
                      <div key={def.category}>
                        <span className="text-xs font-medium text-muted-foreground mb-1.5 block">{def.label}</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {def.options.map(opt => {
                            const isSelected = surchargeValues[def.category] === opt.id;
                            const isDefault = opt.id === def.defaultId;
                            const isActive = isSelected || (!surchargeValues[def.category] && isDefault);
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  const setter = surchargeSetters[def.category];
                                  if (setter) {
                                    setter(isDefault ? undefined : (isSelected ? undefined : opt.id));
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-background border border-border/40 text-muted-foreground hover:text-foreground"}`}
                              >
                                {opt.label}
                                {opt.modifier !== 0 && (
                                  <span className="ml-1 opacity-70">
                                    ({opt.modifier > 0 ? "+" : ""}{Math.round(opt.modifier * 100)}%)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {preview && (
                      <div className="pt-2 border-t border-border/20">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Basis-Leistungswert:</span>
                          <span className="font-medium text-foreground">{customPerf ? parseFloat(customPerf.replace(",", ".")) || selectedType.performanceValue : selectedType.performanceValue} m²/h</span>
                        </div>
                        {totalModifier !== 0 && (
                          <>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-muted-foreground">Anpassung:</span>
                              <span className={`font-medium ${totalModifier > 0 ? "text-success" : "text-warning"}`}>
                                {totalModifier > 0 ? "+" : ""}{Math.round(totalModifier * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-muted-foreground">Eff. Leistungswert:</span>
                              <span className="font-semibold text-primary">{formatNumber(preview.effectivePerformance, 0)} m²/h</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
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
    <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={overrideGate.reason || ""} triggerReason="performance_override" />
    </>
  );
}
