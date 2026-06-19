import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type WizardStep } from "./constants";

interface ActionBarProps {
  step: WizardStep;
  isSaving: boolean;
  canProceedStep1: boolean;
  canProceedStep2: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}

export function ActionBar({
  step,
  isSaving,
  canProceedStep1,
  canProceedStep2,
  onBack,
  onNext,
  onSave,
}: ActionBarProps) {
  return (
    <div
      className="sticky bottom-0 bg-background/95 border-t border-border/20 px-6 py-4 z-30"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
    >
      <div className="flex gap-3">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={onBack}
            className="h-12 px-4"
          >
            <ArrowLeft size={16} className="mr-1" aria-hidden="true" />
            Zurück
          </Button>
        )}
        {step < 3 ? (
          <Button
            onClick={onNext}
            className="flex-1 h-12"
            disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
          >
            Weiter
            <ArrowRight size={16} className="ml-1" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            onClick={onSave}
            className="flex-1 h-12"
            disabled={isSaving}
          >
            <Check size={16} className="mr-1" aria-hidden="true" />
            {isSaving ? "Wird gespeichert…" : "Objekt speichern"}
          </Button>
        )}
      </div>
    </div>
  );
}
