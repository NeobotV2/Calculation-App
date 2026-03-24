import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <span className="text-4xl font-bold text-muted-foreground">404</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Seite nicht gefunden</h1>
      <p className="text-muted-foreground mb-8 max-w-xs">Die angeforderte Seite existiert nicht oder wurde verschoben.</p>
      <Button onClick={() => setLocation("/")} size="lg" className="gap-2">
        <Home size={18} /> Zur Übersicht
      </Button>
    </div>
  );
}
