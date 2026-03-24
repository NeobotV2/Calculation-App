import { useLocation } from "wouter";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Datenschutz() {
  const [, setLocation] = useLocation();

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="safe-header bg-background/95 sticky top-0 z-40 border-b border-border/20 px-4 pt-12 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/konto")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Datenschutz</h1>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">1. Datenschutz auf einen Blick</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Anwendung nutzen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">2. Datenerfassung in dieser App</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Datenverarbeitung in dieser App erfolgt durch den App-Betreiber. Kontaktdaten finden Sie im Impressum.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen (z.B. bei der Registrierung).
            Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der App durch unsere IT-Systeme erfasst.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">3. Lokale Datenspeicherung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Im Demo-Modus werden alle Daten ausschließlich lokal in Ihrem Browser gespeichert (Local Storage).
            Es erfolgt keine Übertragung an externe Server. Beim Löschen der Browserdaten gehen diese Daten verloren.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">4. Cloud-Synchronisation</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bei Nutzung eines registrierten Kontos werden Ihre Kalkulationsdaten verschlüsselt in der Cloud gespeichert (Supabase).
            Diese Daten umfassen: Objekte, Räume, Vorlagen, Einstellungen und Kontoinformationen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">5. Ihre Rechte</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten.
            Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
          </p>
        </section>

        <div className="pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            Diese Seite enthält Platzhalter-Inhalte. Bitte ersetzen Sie die Angaben durch Ihre tatsächliche Datenschutzerklärung nach Abstimmung mit Ihrem Datenschutzbeauftragten.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
