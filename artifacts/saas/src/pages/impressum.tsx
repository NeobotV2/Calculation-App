import { useLocation } from "wouter";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Impressum() {
  const [, setLocation] = useLocation();

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="safe-header bg-background/95 sticky top-0 z-40 border-b border-border/20 px-4 pt-12 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/konto")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Impressum</h1>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>[Firmenname eintragen]</p>
            <p>[Straße und Hausnummer]</p>
            <p>[PLZ Ort]</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Kontakt</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>Telefon: [Telefonnummer]</p>
            <p>E-Mail: [E-Mail-Adresse]</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Vertreten durch</h2>
          <p className="text-sm text-muted-foreground">[Name des Vertretungsberechtigten]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Registereintrag</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>Eintragung im Handelsregister.</p>
            <p>Registergericht: [Registergericht]</p>
            <p>Registernummer: [HRB-Nummer]</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Umsatzsteuer-ID</h2>
          <p className="text-sm text-muted-foreground">
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: [USt-IdNr.]
          </p>
        </section>

        <div className="pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            Diese Seite enthält Platzhalter-Inhalte. Bitte ersetzen Sie die Angaben durch Ihre tatsächlichen Unternehmensdaten.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
