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
import { CircleCheck, RefreshCw } from "lucide-react";
import { hasDemoData, getDemoData, migrateDemoDataDetailed, clearDemoData } from "@/services/migration-service";
import { trackSignupCompleted } from "@/services/analytics-service";
import { toast } from "sonner";
import { SERVICE_MODULES_MIGRATION_MESSAGE } from "@/services/object-service";

export default function Register() {
  const [, setLocation] = useLocation();
  const setDemoUser = useStore((s) => s.setDemoUser);
  const { signUp, resendConfirmation, isSupabaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationData, setMigrationData] = useState<ReturnType<typeof getDemoData>>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Bitte geben Sie Ihren Namen ein.");
      return;
    }

    if (!email.trim()) {
      setError("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      return;
    }

    if (!isSupabaseReady) {
      setDemoUser({ name: name || "Neu", email: email || "neu@example.com" });
      trackSignupCompleted();
      setLocation("/");
      return;
    }

    if (!password || password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setIsLoading(true);
    const result = await signUp(email.trim(), password, name.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    trackSignupCompleted();

    if (result.needsConfirmation) {
      setNeedsConfirmation(true);
      return;
    }

    if (hasDemoData()) {
      const data = getDemoData();
      if (data && (data.projects.length > 0 || data.templates.length > 0)) {
        setMigrationData(data);
        setShowMigration(true);
        return;
      }
    }
    clearDemoData();
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
      clearDemoData();
    }
    setShowMigration(false);
    setLocation("/");
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    const result = await resendConfirmation(email);
    setIsResending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Bestätigungs-E-Mail erneut gesendet!");
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
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
            Sie haben im Demo-Modus Daten erstellt. Möchten Sie diese in Ihr neues Konto übernehmen?
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

  if (needsConfirmation) {
    return (
      <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
        <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 text-center outline-none">
          <div className="mb-8 flex justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
              <CircleCheck className="size-8" aria-hidden="true" strokeWidth={2} />
            </span>
          </div>
          <h1 className="mb-3 text-h1 text-foreground">Registrierung erfolgreich</h1>
          <p className="mb-8 text-base text-muted-foreground">
            Wir haben Ihnen eine Bestätigungs-E-Mail an <span className="font-medium text-foreground">{email}</span> gesendet.
            Bitte bestätigen Sie Ihre E-Mail-Adresse, um sich anzumelden.
          </p>
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleResend}
              loading={isResending}
              disabled={resendCooldown > 0}
            >
              {isResending ? (
                "Wird gesendet…"
              ) : resendCooldown > 0 ? (
                `Erneut senden (${resendCooldown} s)`
              ) : (
                <>
                  <RefreshCw aria-hidden="true" /> E-Mail erneut senden
                </>
              )}
            </Button>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => setLocation("/login")}>
              Zur Anmeldung
            </Button>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 outline-none">
        <p className="mb-8 text-center text-h2 text-foreground" aria-hidden="true">
          CleanCalc <span className="text-primary">Pro</span>
        </p>

        <h1 className="mb-3 text-h1 text-foreground">Konto erstellen</h1>
        <p className="mb-10 text-base text-muted-foreground">Speichern Sie Ihre Kalkulationen sicher in der Cloud.</p>

        {error && (
          <Callout tone="critical" live className="mb-6">
            {error}
          </Callout>
        )}

        <form onSubmit={handleRegister} className="space-y-5" noValidate>
          <FormField id="register-name" label="Name">
            <Input
              placeholder="Vor- und Nachname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputSize="lg"
              autoComplete="name"
            />
          </FormField>
          <FormField id="register-email" label="E-Mail-Adresse">
            <Input
              type="email"
              placeholder="name@firma.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputSize="lg"
              autoComplete="email"
            />
          </FormField>
          <FormField id="register-password" label="Passwort" hint="Mindestens 6 Zeichen">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputSize="lg"
              autoComplete="new-password"
            />
          </FormField>

          <Button type="submit" size="lg" className="mt-6 w-full" loading={isLoading}>
            {isLoading ? "Wird registriert…" : "Kostenlos registrieren"}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-base text-muted-foreground">
            Schon registriert?{" "}
            <Link href="/login" className="font-medium text-primary underline underline-offset-4">
              Anmelden
            </Link>
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
