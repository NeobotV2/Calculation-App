import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { useStore } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";

export default function Datenschutz() {
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  const { isAuthenticated } = useAuth();
  const back =
    isAuthenticated || hasOnboarded ? { href: "/mehr", label: "Mehr" } : { href: "/willkommen", label: "Startseite" };

  return (
    <PageTransition>
      <PageShell as="main" width="narrow" chrome="focus" header={<PageHeader title="Datenschutz" width="narrow" back={back} />}>
        <Card as="article" padding="lg" className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">1. Datenschutz auf einen Blick</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
              passiert, wenn Sie die App „CleanCalc Pro" nutzen. Personenbezogene Daten sind alle Daten, mit denen
              Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">2. Verantwortliche Stelle</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
              <p className="text-primary font-medium">[HIER EINTRAGEN: Firmenname]</p>
              <p className="text-primary font-medium">[HIER EINTRAGEN: Anschrift]</p>
              <p>E-Mail: <span className="text-primary font-medium">[HIER EINTRAGEN]</span></p>
              <p>Telefon: <span className="text-primary font-medium">[HIER EINTRAGEN]</span></p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">3. Datenerfassung in dieser App</h2>
            <h3 className="text-sm font-semibold text-foreground mt-3">a) Registrierung und Konto</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bei der Registrierung erheben wir: Name, E-Mail-Adresse und ein verschlüsseltes Passwort.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
            <h3 className="text-sm font-semibold text-foreground mt-3">b) Nutzungsdaten (Kalkulationen)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sie speichern in der App Reinigungsobjekte, Räume, Kalkulationsdaten, Vorlagen und
              Firmeneinstellungen. Diese Daten werden ausschließlich zur Bereitstellung des Dienstes verarbeitet.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">4. Lokale Datenspeicherung</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Im Demo-Modus (ohne Registrierung) werden alle Daten ausschließlich lokal auf Ihrem Gerät gespeichert
              (Local Storage bzw. Capacitor Preferences). Es erfolgt keine Übertragung an externe Server.
              Beim Löschen der App-Daten gehen diese Daten verloren.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">5. Cloud-Synchronisation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bei Nutzung eines registrierten Kontos werden Ihre Daten verschlüsselt übertragen und in der Cloud
              gespeichert. Wir nutzen dafür den Dienst Supabase (Supabase Inc., San Francisco, USA).
              Die Daten werden in der EU gehostet. Gespeichert werden: Objekte, Räume, Vorlagen,
              Firmeneinstellungen, Kontoinformationen und Abonnementdaten.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">6. In-App-Käufe und Zahlungsdaten</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Die Zahlungsabwicklung für das Pro-Abonnement erfolgt über Apple (App Store) bzw. Google (Play Store).
              Wir erhalten keine Zahlungsdaten (Kreditkartennummern etc.). Wir speichern lediglich den
              Abonnementstatus (aktiv/gekündigt) und die Plattform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">7. Ihre Rechte (DSGVO)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sie haben jederzeit folgende Rechte bezüglich Ihrer personenbezogenen Daten:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Zur Ausübung Ihrer Rechte wenden Sie sich an:{" "}
              <span className="text-primary font-medium">[HIER EINTRAGEN: E-Mail-Adresse]</span>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">8. Datenlöschung</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sie können Ihr Konto und alle damit verbundenen Daten jederzeit über die Konto-Seite in der App
              löschen. Die Löschung erfolgt unwiderruflich. Im Demo-Modus können Sie alle lokalen Daten
              über „Alle Daten löschen" entfernen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-h3 text-foreground">9. Beschwerderecht</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer
              personenbezogenen Daten zu beschweren.
            </p>
          </section>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Alle mit <span className="text-primary">[HIER EINTRAGEN]</span> markierten Stellen müssen vor der
              Veröffentlichung mit Ihren tatsächlichen Daten ergänzt werden. Diese Datenschutzerklärung sollte
              von einem Datenschutzbeauftragten oder Rechtsanwalt geprüft werden.
            </p>
          </div>
        </Card>
      </PageShell>
    </PageTransition>
  );
}
