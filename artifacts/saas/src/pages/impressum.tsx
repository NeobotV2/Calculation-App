import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Impressum() {
  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="safe-header bg-background/95 sticky top-0 z-40 border-b border-border/20 px-4 pt-12 pb-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Impressum</h1>
      </div>

      <div className="p-6 space-y-6 max-w-lg mx-auto">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p className="text-primary font-medium">[HIER EINTRAGEN: Firmenname]</p>
            <p className="text-primary font-medium">[HIER EINTRAGEN: Straße und Hausnummer]</p>
            <p className="text-primary font-medium">[HIER EINTRAGEN: PLZ und Ort]</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Vertreten durch</h2>
          <p className="text-sm text-primary font-medium">[HIER EINTRAGEN: Name des/der Geschäftsführer(s)]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Kontakt</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>Telefon: <span className="text-primary font-medium">[HIER EINTRAGEN]</span></p>
            <p>E-Mail: <span className="text-primary font-medium">[HIER EINTRAGEN]</span></p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Registereintrag</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p>Eintragung im Handelsregister.</p>
            <p>Registergericht: <span className="text-primary font-medium">[HIER EINTRAGEN]</span></p>
            <p>Registernummer: <span className="text-primary font-medium">[HIER EINTRAGEN: HRB-Nummer]</span></p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Umsatzsteuer-ID</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{" "}
            <span className="text-primary font-medium">[HIER EINTRAGEN: USt-IdNr.]</span>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <p className="text-primary font-medium">[HIER EINTRAGEN: Name]</p>
            <p className="text-primary font-medium">[HIER EINTRAGEN: Anschrift]</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Streitschlichtung</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Haftung für Inhalte</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte in dieser App nach den
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
            zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
        </section>

        <div className="pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            Alle mit <span className="text-primary">[HIER EINTRAGEN]</span> markierten Stellen müssen vor der Veröffentlichung
            mit Ihren tatsächlichen Unternehmensdaten ergänzt werden.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
