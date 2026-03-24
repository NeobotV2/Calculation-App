import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useStore, FrequencyKey } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit3, Trash2, Plus, Check } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_ROOM_TYPES = [
  { id: "t1", name: "Großraumbüro", perf: 350, gId: "g1", gName: "Büro" },
  { id: "t2", name: "Einzelbüro", perf: 280, gId: "g1", gName: "Büro" },
  { id: "t3", name: "Besprechungsraum", perf: 300, gId: "g1", gName: "Büro" },
  { id: "t4", name: "WC klein", perf: 50, gId: "g2", gName: "Sanitär" },
  { id: "t5", name: "WC groß", perf: 60, gId: "g2", gName: "Sanitär" },
  { id: "t6", name: "Flur / Treppe", perf: 350, gId: "g3", gName: "Verkehr" },
  { id: "t7", name: "Teeküche", perf: 120, gId: "g4", gName: "Küche" },
];

export default function KalkulationDetail() {
  const [, params] = useRoute("/kalkulation/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  
  const project = useStore(s => s.projects.find(p => p.id === id));
  const hourlyRate = useStore(s => s.hourlyRate);
  const updateProject = useStore(s => s.updateProject);
  const deleteProject = useStore(s => s.deleteProject);
  const addRoom = useStore(s => s.addRoom);
  const deleteRoom = useStore(s => s.deleteRoom);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (!project) return <div className="p-8 text-center text-muted-foreground mt-20">Objekt nicht gefunden</div>;

  const totals = calcProjectTotals(project, hourlyRate);

  const handleSaveName = () => {
    if(nameInput.trim()) updateProject(project.id, { name: nameInput.trim() });
    setIsEditingName(false);
  };

  const handleDelete = () => {
    if(confirm("Objekt wirklich löschen?")) {
      deleteProject(project.id);
      setLocation("/kalkulation");
    }
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-32">
      {/* Sticky Header */}
      <div className="bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 pt-12 pb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/kalkulation")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex gap-2">
          <Link href={`/auswertung/${project.id}`}>
            <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium">Auswertung</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Title Area */}
        <div className="mb-8">
          {isEditingName ? (
            <div className="flex gap-2 mb-2">
              <Input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} className="text-xl font-semibold bg-card border-border/50" />
              <Button size="icon" onClick={handleSaveName}><Check size={18}/></Button>
            </div>
          ) : (
            <h1 className="text-3xl font-semibold tracking-tight mb-1 flex items-center gap-3 group text-foreground">
              {project.name}
              <button onClick={() => {setNameInput(project.name); setIsEditingName(true)}} className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={18}/></button>
            </h1>
          )}
          <p className="text-muted-foreground text-sm">Kalkulationsbasis: {formatCurrency(hourlyRate)}/h</p>
        </div>

        {/* KPI Bar */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-8 -mx-6 px-6 snap-x">
          <div className="bg-card border border-border/30 rounded-2xl p-4 shrink-0 w-36 snap-start">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Monatspreis</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totals.cost)}</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-4 shrink-0 w-36 snap-start">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Stunden / Mo</p>
            <p className="text-xl font-bold text-foreground">{formatNumber(totals.hours, 1)} h</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-4 shrink-0 w-36 snap-start">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Gesamtfläche</p>
            <p className="text-xl font-bold text-foreground">{formatNumber(totals.area, 0)} m²</p>
          </div>
          <div className="bg-card border border-border/30 rounded-2xl p-4 shrink-0 w-36 snap-start">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ø Preis/m²</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totals.pricePerSqm)}</p>
          </div>
        </div>

        {/* Rooms List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg tracking-tight text-foreground mb-4">Räume ({project.rooms.length})</h3>
          
          {project.rooms.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border/50 rounded-2xl">
              <p className="text-muted-foreground mb-6">Noch keine Räume erfasst.</p>
              <Button onClick={() => setIsSheetOpen(true)} variant="outline" className="px-6">Ersten Raum hinzufügen</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {project.rooms.map(room => {
                const rc = calcRoom(room, hourlyRate);
                return (
                  <div key={room.id} className="glass-card p-4 flex gap-4 items-center group relative overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-semibold text-base text-foreground truncate">{room.name || room.typeName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide whitespace-nowrap">{room.groupName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{room.area} m²</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{FREQUENCY_LABELS[room.frequency]}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{room.typePerformance} m²/h</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground text-lg">{formatCurrency(rc.monthlyCost)}</p>
                      <p className="text-sm text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
                    </div>

                    {/* Swipe actions overlay */}
                    <div className="absolute inset-y-0 right-0 w-16 bg-destructive flex items-center justify-center translate-x-full group-hover:translate-x-0 transition-transform cursor-pointer" onClick={() => deleteRoom(project.id, room.id)}>
                      <Trash2 className="text-destructive-foreground" size={20} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6">
        <Button onClick={() => setIsSheetOpen(true)} className="w-full shadow-xl shadow-black/20" size="lg">
          <Plus size={20} className="mr-2" /> Raum hinzufügen
        </Button>
      </div>

      <RoomSheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        onSave={(data: any) => {
          addRoom(project.id, data);
          setIsSheetOpen(false);
        }}
      />
    </PageTransition>
  );
}

function RoomSheet({ isOpen, onClose, onSave }: any) {
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState(DEFAULT_ROOM_TYPES[0].id);
  const [area, setArea] = useState("");
  const [freq, setFreq] = useState<FrequencyKey>("5x_week");

  const selectedType = DEFAULT_ROOM_TYPES.find(t => t.id === typeId)!;

  const handleSave = () => {
    const areaNum = parseFloat(area.replace(",", "."));
    if (!areaNum || areaNum <= 0) return alert("Bitte gültige Fläche eingeben");

    onSave({
      name: name.trim(),
      typeId,
      typeName: selectedType.name,
      groupId: selectedType.gId,
      groupName: selectedType.gName,
      area: areaNum,
      frequency: freq,
      typePerformance: selectedType.perf,
    });
    // reset
    setName(""); setArea("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl border-t border-border z-50 p-6 pb-safe max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
            <h2 className="text-2xl font-semibold tracking-tight mb-6 text-foreground">Neuer Raum</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Raumart</label>
                <div className="grid grid-cols-2 gap-3">
                  {DEFAULT_ROOM_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTypeId(t.id)}
                      className={`p-4 rounded-xl border text-sm text-left transition-colors ${typeId === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 bg-card hover:bg-secondary text-foreground'}`}
                    >
                      <div className="font-semibold truncate">{t.name}</div>
                      <div className="text-xs opacity-80 mt-1">{t.perf} m²/h</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Bezeichnung (optional)</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Büro Müller" className="bg-card h-12" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Fläche (m²)</label>
                <Input type="decimal" value={area} onChange={e => setArea(e.target.value)} placeholder="0" className="text-xl font-semibold h-14 bg-card" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Häufigkeit</label>
                <select 
                  value={freq} 
                  onChange={e => setFreq(e.target.value as FrequencyKey)}
                  className="w-full h-14 rounded-xl border border-border/50 bg-card px-4 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="pt-6">
                <Button onClick={handleSave} className="w-full" size="lg">Raum speichern</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}