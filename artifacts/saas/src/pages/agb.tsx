import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AGB() {
  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="safe-header bg-background/95 sticky top-0 z-40 border-b border-border/20 px-4 pt-12 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">AGB</h1>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 1 Geltungsbereich</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der mobilen Anwendung
            „CleanCalc Pro" (nachfolgend „App"), bereitgestellt von{" "}
            <span className="text-primary font-medium">[HIER EINTRAGEN: Firmenname und Anschrift]</span>{" "}
            (nachfolgend „Anbieter"). Mit der Nutzung der App akzeptiert der Nutzer diese AGB.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 2 Vertragsgegenstand</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            CleanCalc Pro ist eine Kalkulationsanwendung für Gebäudereinigungsunternehmen.
            Die App ermöglicht die Erstellung von Kalkulationen für Reinigungsobjekte, die Verwaltung
            von Räumen und Vorlagen sowie die Generierung von PDF-Angeboten (Pro-Version).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 3 Leistungsumfang</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die App ist in zwei Versionen verfügbar:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
            <li><span className="text-foreground font-medium">Basic (kostenlos):</span> Bis zu 3 aktive Objekte, bis zu 20 Räume pro Objekt, Standard-Leistungswerte</li>
            <li><span className="text-foreground font-medium">Pro (Abonnement):</span> Unbegrenzte Objekte und Räume, PDF-Angebote, eigenes Firmenlogo, individuelle Leistungswerte, Vorlagen, Cloud-Synchronisation</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 4 Preise und Zahlung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Der aktuelle Preis für das Pro-Abonnement wird auf der Upgrade-Seite innerhalb der App angezeigt.
            Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
            Die Zahlungsabwicklung erfolgt ausschließlich über den jeweiligen App Store
            (Apple App Store oder Google Play Store) und unterliegt den dortigen Nutzungsbedingungen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 5 Vertragslaufzeit und Kündigung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Das Pro-Abonnement verlängert sich automatisch um den jeweiligen Abrechnungszeitraum, sofern
            es nicht mindestens 24 Stunden vor Ablauf des aktuellen Zeitraums gekündigt wird. Die Kündigung
            erfolgt über die Abo-Verwaltung des jeweiligen App Stores. Nach Kündigung bleibt der
            Pro-Zugang bis zum Ende des bezahlten Zeitraums bestehen. Danach wird der Zugang auf
            die Basic-Version zurückgestuft.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 6 Widerrufsrecht</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Das Widerrufsrecht für In-App-Käufe richtet sich nach den Bestimmungen des jeweiligen App Stores
            (Apple oder Google). Bitte beachten Sie die dortigen Widerrufsbelehrungen und Rückerstattungsrichtlinien.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 7 Haftung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Kalkulationsergebnisse der App dienen als Orientierungshilfe und ersetzen keine
            professionelle Kalkulation. Der Anbieter übernimmt keine Haftung für die Richtigkeit der
            berechneten Werte oder daraus resultierende geschäftliche Entscheidungen. Der Anbieter haftet
            nur für Vorsatz und grobe Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen,
            soweit gesetzlich zulässig.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 8 Datenschutz</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer Datenschutzerklärung,
            die über die App abrufbar ist.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 9 Änderungen der AGB</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Der Anbieter behält sich vor, diese AGB jederzeit zu ändern. Nutzer werden über Änderungen
            innerhalb der App informiert. Die weitere Nutzung nach Benachrichtigung gilt als Zustimmung
            zu den geänderten AGB.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">§ 10 Schlussbestimmungen</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Es gilt das Recht der Bundesrepublik Deutschland. Sollten einzelne Bestimmungen dieser AGB
            unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
          </p>
        </section>

        <div className="pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            Alle mit <span className="text-primary">[HIER EINTRAGEN]</span> markierten Stellen müssen vor der
            Veröffentlichung mit Ihren tatsächlichen Angaben ergänzt werden. Diese AGB sollten vor
            Veröffentlichung rechtlich geprüft werden.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
