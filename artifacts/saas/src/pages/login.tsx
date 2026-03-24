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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ name: "Demo User", email: email || "demo@example.com" });
    setLocation("/");
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-8 h-8 text-background" />
          </div>
        </div>
        
        <h1 className="text-3xl font-display font-bold text-center mb-2">Willkommen zurück</h1>
        <p className="text-muted-foreground text-center mb-8">Melde dich an, um fortzufahren.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input 
              type="email" 
              placeholder="E-Mail Adresse" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-14"
            />
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="Passwort" 
              className="h-14"
            />
          </div>
          
          <Button type="submit" className="w-full h-14 text-lg mt-4">
            Anmelden <ArrowRight size={20} className="ml-1" />
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Neu hier? <Link href="/register" className="text-primary font-medium hover:underline">Account erstellen</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
