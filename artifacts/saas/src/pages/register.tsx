import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Register() {
  const [, setLocation] = useLocation();
  const login = useStore(s => s.login);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    login({ name: name || "Neu", email: email || "neu@example.com" });
    setLocation("/");
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="text-3xl font-display font-bold mb-2">Account erstellen</h1>
        <p className="text-muted-foreground mb-8">Speichere deine Kalkulationen sicher in der Cloud.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input 
            placeholder="Dein Name" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-14"
          />
          <Input 
            type="email" 
            placeholder="E-Mail Adresse" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-14"
          />
          <Input 
            type="password" 
            placeholder="Passwort wählen" 
            className="h-14"
          />
          
          <Button type="submit" className="w-full h-14 text-lg mt-4">
            Kostenlos registrieren
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Schon registriert? <Link href="/login" className="text-primary font-medium hover:underline">Anmelden</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
