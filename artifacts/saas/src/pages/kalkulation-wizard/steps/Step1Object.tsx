import { Building2, MapPin, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OBJECT_TYPES } from "../constants";

interface Step1ObjectProps {
  name: string;
  setName: (v: string) => void;
  customer: string;
  setCustomer: (v: string) => void;
  location_: string;
  setLocation_: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  objectType: string;
  setObjectType: (v: string) => void;
  contactName: string;
  setContactName: (v: string) => void;
}

export function Step1Object({
  name,
  setName,
  customer,
  setCustomer,
  location_,
  setLocation_,
  notes,
  setNotes,
  objectType,
  setObjectType,
  contactName,
  setContactName,
}: Step1ObjectProps) {
  return (
    <>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Objekt & Grunddaten</h3>
        <p className="text-sm text-muted-foreground">Erfasse die Grunddaten des Objekts.</p>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          <Building2 size={14} className="inline mr-1.5 text-muted-foreground" />
          Objektname *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Bürogebäude Musterstraße"
          className="bg-card h-12"
          autoFocus
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          <User size={14} className="inline mr-1.5 text-muted-foreground" />
          Kunde
        </label>
        <Input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="z.B. Muster GmbH"
          className="bg-card h-12"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          <MapPin size={14} className="inline mr-1.5 text-muted-foreground" />
          Standort / Adresse
        </label>
        <Input
          value={location_}
          onChange={(e) => setLocation_(e.target.value)}
          placeholder="z.B. Berlin, Musterstraße 1"
          className="bg-card h-12"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Objektart</label>
        <div className="flex flex-wrap gap-2">
          {OBJECT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setObjectType(objectType === t ? "" : t)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                objectType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/40 text-muted-foreground hover:border-border"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Ansprechpartner</label>
        <Input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="z.B. Herr Müller"
          className="bg-card h-12"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          <FileText size={14} className="inline mr-1.5 text-muted-foreground" />
          Notizen
        </label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Notizen zur Begehung"
          className="bg-card h-12"
        />
      </div>
    </>
  );
}
