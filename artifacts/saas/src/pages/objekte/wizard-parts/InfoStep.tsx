import { motion } from "framer-motion";
import { Building2, MapPin, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InfoStepProps {
  name: string;
  setName: (v: string) => void;
  customer: string;
  setCustomer: (v: string) => void;
  location_: string;
  setLocation_: (v: string) => void;
  rateInput: string;
  setRateInput: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  hourlyRate: number;
}

export function InfoStep({
  name,
  setName,
  customer,
  setCustomer,
  location_,
  setLocation_,
  rateInput,
  setRateInput,
  notes,
  setNotes,
  hourlyRate,
}: InfoStepProps) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-5"
    >
      <div>
        <h3 className="text-2xl font-semibold tracking-tight mb-1">
          Basisdaten
        </h3>
        <p className="text-sm text-muted-foreground">
          Erfassen Sie die Grunddaten des Objekts.
        </p>
      </div>

      <div>
        <label htmlFor="wizard-name" className="text-sm font-medium mb-2 block">
          <Building2
            size={14}
            className="inline mr-1.5 text-muted-foreground"
            aria-hidden="true"
          />
          Objektname
        </label>
        <Input
          id="wizard-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Bürogebäude Musterstraße"
          className="bg-card h-12"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="wizard-customer" className="text-sm font-medium mb-2 block">
          <User
            size={14}
            className="inline mr-1.5 text-muted-foreground"
            aria-hidden="true"
          />
          Kunde
        </label>
        <Input
          id="wizard-customer"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="z.B. Muster GmbH"
          className="bg-card h-12"
        />
      </div>

      <div>
        <label htmlFor="wizard-location" className="text-sm font-medium mb-2 block">
          <MapPin
            size={14}
            className="inline mr-1.5 text-muted-foreground"
            aria-hidden="true"
          />
          Standort / Adresse
        </label>
        <Input
          id="wizard-location"
          value={location_}
          onChange={(e) => setLocation_(e.target.value)}
          placeholder="z.B. Berlin, Musterstraße 1"
          className="bg-card h-12"
        />
      </div>

      <div>
        <label htmlFor="wizard-rate" className="text-sm font-medium mb-2 block">
          Verrechnungssatz (€/h)
        </label>
        <Input
          id="wizard-rate"
          aria-describedby="wizard-rate-hint"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          inputMode="decimal"
          placeholder={`Standard: ${hourlyRate.toString().replace(".", ",")} €/h`}
          className="bg-card h-12"
        />
        <p id="wizard-rate-hint" className="text-xs text-muted-foreground mt-1 ml-1">
          Leer = globaler Standard (
          {hourlyRate.toString().replace(".", ",")} €/h)
        </p>
      </div>

      <div>
        <label htmlFor="wizard-notes" className="text-sm font-medium mb-2 block">
          <FileText
            size={14}
            className="inline mr-1.5 text-muted-foreground"
            aria-hidden="true"
          />
          Notizen
        </label>
        <Input
          id="wizard-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionale Notizen zur Begehung"
          className="bg-card h-12"
        />
      </div>
    </motion.div>
  );
}
