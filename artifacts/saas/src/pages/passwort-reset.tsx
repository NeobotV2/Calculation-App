import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Lock, CheckCircle2 } from "lucide-react";

export default function PasswortReset() {
  const [, setLocation] = useLocation();
  const { updatePassword, isSupabaseReady, isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady) {
      setError("Backend nicht konfiguriert.");
    }
  }, [isSupabaseReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setLocation("/"), 2000);
    }
  };

  if (success) {
    return (
      <PageTransition className="min-h-screen bg-background flex flex-col px-6">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
            Passwort geändert
          </h1>
          <p className="text-muted-foreground text-base">
            Dein Passwort wurde erfolgreich geändert. Du wirst weitergeleitet...
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-center mb-3 text-foreground">
          Neues Passwort
        </h1>
        <p className="text-muted-foreground text-base text-center mb-10">
          Wähle ein neues Passwort für dein Konto.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Input
              type="password"
              placeholder="Neues Passwort (mind. 6 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
              autoFocus
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Passwort bestätigen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
            />
          </div>

          <Button type="submit" className="w-full h-14 text-lg mt-6" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Wird gespeichert...
              </span>
            ) : (
              <>
                <Lock size={20} className="mr-2" /> Passwort ändern
              </>
            )}
          </Button>
        </form>
      </div>
    </PageTransition>
  );
}
