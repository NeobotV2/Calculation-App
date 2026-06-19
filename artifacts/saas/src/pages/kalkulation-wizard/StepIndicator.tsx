import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_LABELS, type WizardStep } from "./constants";

export function StepIndicator({
  current,
  onStepClick,
}: {
  current: WizardStep;
  onStepClick: (s: WizardStep) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 w-full max-w-lg mx-auto px-2">
      {([1, 2, 3, 4, 5, 6, 7, 8] as WizardStep[]).map((step) => {
        const isCompleted = step < current;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center flex-1 gap-0.5">
            <div className="flex flex-col items-center flex-1">
              <button
                onClick={() => onStepClick(step)}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors",
                  isCompleted
                    ? "bg-primary text-primary-foreground cursor-pointer"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                      : "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80"
                )}
              >
                {isCompleted ? <Check size={12} /> : step}
              </button>
              <span
                className={cn(
                  "text-[9px] mt-0.5 font-medium hidden sm:block",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {step < 8 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full -mt-3 sm:-mt-5 min-w-[8px]",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
