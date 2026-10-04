import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { FormField } from "@/components/ui/form-field";
import { ArrowRight } from "lucide-react";
import { hasDemoData, getDemoData, migrateDemoDataDetailed } from "@/services/migration-service";
import { toast } from "sonner";
import { SERVICE_MODULES_MIGRATION_MESSAGE } from "@/services/object-service";

export default function Login() {
  const [, setLocation] = useLocation();
  const setDemoUser = useStore((s) => s.setDemoUser);
  const { signIn, isSupabaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMigration, setShowMigration] = useState(false);
  const [migrationData, setMigrationData] = useState<ReturnType<typeof getDemoData>>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      return;
    }

    if (!isSupabaseReady) {
      setDemoUser({ name: "Benutzer", email: email || "demo@example.com" });
      setLocation("/");
      return;
    }

    if (!password) {
      setError("Bitte geben Sie Ihr Passwort ein.");
      return;
    }

    setIsLoading(true);
    const result = await signIn(email.trim(), password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (hasDemoData()) {
      const data = getDemoData();
      if (data) {
        setMigrationData(data);
        setShowMigration(true);
        return;
      }
    }

    setLocation("/");
  };

  const handleMigrate = async (accept: boolean) => {
    if (accept && migrationData) {
      setIsMigrating(true);
      const result = await migrateDemoDataDetailed(migrationData);
      setIsMigrating(false);
      if (result.ok) {
        toast.success("Demo-Daten erfolgreich übernommen!");
      } else if (result.migrationMissing) {
        toast.error(SERVICE_MODULES_MIGRATION_MESSAGE, {
          description: "Objekte, Räume und Einstellungen wurden übernommen, Winterdienst und Hausmeisterservice noch nicht.",
        });
      } else {
        toast.error("Fehler beim Übernehmen der Demo-Daten.");
      }
    } else {
      const { clearDemoData } = await import("@/services/migration-service");
      clearDemoData();
    }
    setShowMigration(false);
    setLocation("/");
  };

  if (showMigration) {
    return (
      <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
        <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 outline-none">
          <p className="mb-8 text-center text-h1 text-foreground" aria-hidden="true">
            CleanCalc <span className="text-primary">Pro</span>
          </p>
          <h1 className="mb-3 text-center text-h1 text-foreground">Demo-Daten gefunden</h1>
          <p className="mb-8 text-center text-base text-muted-foreground">
            Sie haben im Demo-Modus Daten erstellt. Möchten Sie diese in Ihr Konto übernehmen?
          </p>
          {migrationData && (
            <Card tone="sunken" padding="sm" className="mb-8">
              <p className="text-sm text-muted-foreground">
                {migrationData.projects.length} Objekt{migrationData.projects.length !== 1 ? "e" : ""},
                {" "}{migrationData.templates.length} Vorlage{migrationData.templates.length !== 1 ? "n" : ""}
              </p>
            </Card>
          )}
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => handleMigrate(true)} loading={isMigrating}>
              {isMigrating ? "Wird übertragen…" : "Ja, Daten übernehmen"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => handleMigrate(false)}
              disabled={isMigrating}
            >
              Nein, mit leerem Konto starten
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 outline-none">
        <p className="mb-10 text-center text-h1 text-foreground" aria-hidden="true">
          CleanCalc <span className="text-primary">Pro</span>
        </p>

        <h1 className="mb-3 text-center text-h1 text-foreground">Willkommen</h1>
        <p className="mb-10 text-center text-base text-muted-foreground">Melden Sie sich an, um fortzufahren.</p>

        {error && (
          <Callout tone="critical" live className="mb-6">
            {error}
          </Callout>
        )}

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <FormField id="login-email" label="E-Mail-Adresse">
            <Input
              type="email"
              placeholder="name@firma.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputSize="lg"
              autoComplete="email"
            />
          </FormField>
          <FormField id="login-password" label="Passwort">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputSize="lg"
              autoComplete="current-password"
            />
          </FormField>

          {isSupabaseReady && (
            <div className="text-right">
              <Link href="/passwort-vergessen" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Passwort vergessen?
              </Link>
            </div>
          )}

          <Button type="submit" size="lg" className="mt-6 w-full" loading={isLoading}>
            {isLoading ? (
              "Wird angemeldet…"
            ) : (
              <>
                Anmelden <ArrowRight aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-base text-muted-foreground">
            Neu hier?{" "}
            <Link href="/register" className="font-medium text-primary underline underline-offset-4">
              Konto erstellen
            </Link>
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
