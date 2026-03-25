import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function PasswortVergessen() {
  const [, setLocation] = useLocation();
  const { resetPassword, isSupabaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }

    if (!isSupabaseReady) {
      setError("Backend nicht konfiguriert. Bitte kontaktiere den Support.");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <PageTransition className="min-h-screen bg-background flex flex-col px-6">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-center mb-3 text-foreground">
            E-Mail gesendet
          </h1>
          <p className="text-muted-foreground text-base text-center mb-10">
            Falls ein Konto mit <span className="font-medium text-foreground">{email}</span> existiert, haben wir dir einen Link zum Zurücksetzen deines Passworts gesendet.
          </p>
          <Button variant="outline" className="w-full h-14 text-base" onClick={() => setLocation("/login")}>
            <ArrowLeft size={18} className="mr-2" /> Zurück zum Login
          </Button>
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
          Passwort vergessen?
        </h1>
        <p className="text-muted-foreground text-base text-center mb-10">
          Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Input
              type="email"
              placeholder="E-Mail Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full h-14 text-lg mt-6" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Wird gesendet...
              </span>
            ) : (
              <>
                <Mail size={20} className="mr-2" /> Link senden
              </>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-muted-foreground text-base">
            <Link href="/login" className="text-primary font-medium hover:underline">
              <ArrowLeft size={14} className="inline mr-1" />Zurück zum Login
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
