import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProLockProps {
  title: string;
  description: string;
  onUpgrade: () => void;
}

/** Pro-plan upgrade overlay shown over gated settings sections. */
export function ProLock({ title, description, onUpgrade }: ProLockProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
      <div className="w-12 h-12 bg-background border border-border/50 rounded-full flex items-center justify-center mb-3">
        <Lock size={20} className="text-foreground" />
      </div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      <Button variant="outline" size="sm" onClick={onUpgrade}>Pro-Plan ansehen</Button>
    </div>
  );
}
