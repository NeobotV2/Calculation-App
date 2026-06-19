import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoPopover } from "./InfoPopover";

export function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  badge,
  tooltip,
  children,
}: {
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tooltip && <InfoPopover text={tooltip} />}
          {badge && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {badge}
            </span>
          )}
          <ChevronDown
            size={18}
            onClick={onToggle}
            className={cn(
              "text-muted-foreground transition-transform duration-200 cursor-pointer",
              open && "rotate-180"
            )}
          />
        </div>
      </div>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border/20 pt-4">{children}</div>}
    </div>
  );
}
