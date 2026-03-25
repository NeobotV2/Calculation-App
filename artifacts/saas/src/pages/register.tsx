import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { hasDemoData, getDemoData, migrateDemoData, clearDemoData } from "@/services/migration-service";
import { toast } from "sonner";

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
      setError("Bitte gib deinen Namen ein.");
      return;
    }

    if (!email.trim()) {
      setError("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }

    if (!isSupabaseReady) {
      setDemoUser({ name: name || "Neu", email: email || "neu@example.com" });
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
      const success = await migrateDemoData(migrationData);
      setIsMigrating(false);
      if (success) {
        toast.success("Demo-Daten erfolgreich übernommen!");
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
      <PageTransition className="min-h-screen bg-background flex flex-col px-6">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="flex justify-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              CleanCalc <span className="text-primary">Pro</span>
            </h2>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-center mb-3 text-foreground">
            Demo-Daten gefunden
          </h1>
          <p className="text-muted-foreground text-base text-center mb-8">
            Du hast im Demo-Modus Daten erstellt. Möchtest du diese in dein neues Konto übernehmen?
          </p>
          {migrationData && (
            <div className="bg-card border border-border/40 rounded-2xl p-4 mb-8">
              <p className="text-sm text-muted-foreground">
                {migrationData.projects.length} Objekt{migrationData.projects.length !== 1 ? "e" : ""},
                {" "}{migrationData.templates.length} Vorlage{migrationData.templates.length !== 1 ? "n" : ""}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-lg"
              onClick={() => handleMigrate(true)}
              disabled={isMigrating}
            >
              {isMigrating ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Wird übertragen...
                </span>
              ) : (
                "Ja, Daten übernehmen"
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={() => handleMigrate(false)}
              disabled={isMigrating}
            >
              Nein, mit leerem Konto starten
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (needsConfirmation) {
    return (
      <PageTransition className="min-h-screen bg-background flex flex-col px-6">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
            Registrierung erfolgreich!
          </h1>
          <p className="text-muted-foreground text-base mb-8">
            Wir haben dir eine Bestätigungs-E-Mail an <span className="font-medium text-foreground">{email}</span> gesendet.
            Bitte bestätige deine E-Mail-Adresse, um dich anzumelden.
          </p>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  Wird gesendet...
                </span>
              ) : resendCooldown > 0 ? (
                `Erneut senden (${resendCooldown}s)`
              ) : (
                <>
                  <RefreshCw size={18} className="mr-2" /> E-Mail erneut senden
                </>
              )}
            </Button>
            <Button variant="outline" className="w-full h-14 text-base" onClick={() => setLocation("/login")}>
              Zum Login
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            CleanCalc <span className="text-primary">Pro</span>
          </h2>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight mb-3 text-foreground">Account erstellen</h1>
        <p className="text-muted-foreground text-lg mb-10">Speichere deine Kalkulationen sicher in der Cloud.</p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <Input
            placeholder="Dein Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 bg-card border-border/50 text-base"
            autoComplete="name"
          />
          <Input
            type="email"
            placeholder="E-Mail Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 bg-card border-border/50 text-base"
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Passwort wählen (mind. 6 Zeichen)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 bg-card border-border/50 text-base"
            autoComplete="new-password"
          />

          <Button type="submit" className="w-full h-14 text-lg mt-6" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Wird registriert...
              </span>
            ) : (
              "Kostenlos registrieren"
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-muted-foreground text-base">
            Schon registriert? <Link href="/login" className="text-primary font-medium hover:underline">Anmelden</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
