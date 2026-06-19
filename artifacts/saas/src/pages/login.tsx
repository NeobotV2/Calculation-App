import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { ArrowRight } from "lucide-react";
import { hasDemoData, getDemoData, migrateDemoData } from "@/services/migration-service";
import { toast } from "sonner";

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
      const success = await migrateDemoData(migrationData);
      setIsMigrating(false);
      if (success) {
        toast.success("Demo-Daten erfolgreich übernommen!");
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
            Sie haben im Demo-Modus Daten erstellt. Möchten Sie diese in Ihr Konto übernehmen?
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

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            CleanCalc <span className="text-primary">Pro</span>
          </h2>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-center mb-3 text-foreground">Willkommen</h1>
        <p className="text-muted-foreground text-lg text-center mb-10">Melden Sie sich an, um fortzufahren.</p>

        {error && (
          <div role="alert" className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <FormField id="login-email" label="E-Mail-Adresse">
            <Input
              type="email"
              placeholder="name@firma.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
              autoComplete="email"
            />
          </FormField>
          <FormField id="login-password" label="Passwort">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
              autoComplete="current-password"
            />
          </FormField>

          {isSupabaseReady && (
            <div className="text-right">
              <Link href="/passwort-vergessen" className="text-sm text-primary font-medium hover:underline">
                Passwort vergessen?
              </Link>
            </div>
          )}

          <Button type="submit" className="w-full h-14 text-lg mt-6" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Wird angemeldet...
              </span>
            ) : (
              <>
                Anmelden <ArrowRight size={20} className="ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-muted-foreground text-base">
            Neu hier? <Link href="/register" className="text-primary font-medium hover:underline">Account erstellen</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
