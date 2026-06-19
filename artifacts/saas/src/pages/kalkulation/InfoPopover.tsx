import { useState } from "react";
import { Info, X } from "lucide-react";

export function InfoPopover({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
      >
        {open ? <X size={12} className="text-primary" /> : <Info size={12} className="text-primary" />}
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 bg-card border border-border/50 rounded-xl p-3 shadow-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}
