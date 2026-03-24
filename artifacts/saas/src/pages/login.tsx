import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useStore(s => s.login);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with Supabase auth — call supabase.auth.signInWithPassword()
    login({ name: name || "Benutzer", email: email || "demo@example.com" });
    setLocation("/");
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </div>
        
        <h1 className="text-4xl font-semibold tracking-tight text-center mb-3 text-foreground">Willkommen</h1>
        <p className="text-muted-foreground text-lg text-center mb-10">Melde dich an, um fortzufahren.</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Input 
              type="text" 
              placeholder="Name" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
            />
          </div>
          <div>
            <Input 
              type="email" 
              placeholder="E-Mail Adresse" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-14 bg-card border-border/50 text-base"
            />
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="Passwort" 
              className="h-14 bg-card border-border/50 text-base"
            />
          </div>
          
          <Button type="submit" className="w-full h-14 text-lg mt-6">
            Anmelden <ArrowRight size={20} className="ml-2" />
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