import { useLocation } from "wouter";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AGB() {
  const [, setLocation] = useLocation();

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="safe-header bg-background/95 sticky top-0 z-40 border-b border-border/20 px-4 pt-12 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/konto")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">AGB</h1>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 1 Geltungsbereich</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Anwendung CleanCalc Pro
            sowie aller damit verbundenen Dienste.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 2 Vertragsgegenstand</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            CleanCalc Pro ist eine Kalkulationsanwendung für Gebäudereinigungsunternehmen.
            Die App ermöglicht die Erstellung von Kalkulationen, Angeboten und die Verwaltung von Reinigungsobjekten.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 3 Nutzungsbedingungen</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Nutzung der kostenlosen Basic-Version ist ohne Registrierung möglich.
            Für den vollen Funktionsumfang (Pro-Version) ist eine Registrierung und ein kostenpflichtiges Abonnement erforderlich.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 4 Preise und Zahlung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Preise für die Pro-Version werden auf der Upgrade-Seite der App angezeigt.
            Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
            Die Zahlung erfolgt per Kreditkarte oder anderen angebotenen Zahlungsmethoden.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 5 Kündigung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Das Pro-Abonnement kann jederzeit zum Ende des aktuellen Abrechnungszeitraums gekündigt werden.
            Nach Kündigung wird der Zugang auf die Basic-Version zurückgestuft.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 6 Haftung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Kalkulationsergebnisse dienen als Orientierungshilfe.
            Der Betreiber übernimmt keine Haftung für die Richtigkeit der berechneten Werte
            oder daraus resultierende geschäftliche Entscheidungen.
          </p>
        </section>

        <div className="pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            Diese Seite enthält Platzhalter-Inhalte. Bitte ersetzen Sie die Angaben durch Ihre tatsächlichen AGB nach rechtlicher Prüfung.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
