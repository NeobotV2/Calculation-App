import { Check } from "lucide-react";
import { type WizardStep, STEP_LABELS } from "./constants";

export function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto">
      {([1, 2, 3] as WizardStep[]).map((step) => {
        const isCompleted = step < current;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center flex-1 gap-2">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check size={14} aria-hidden="true" /> : step}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {step < 3 && (
              <div
                className={`h-0.5 flex-1 rounded-full -mt-4 ${
                  isCompleted ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
