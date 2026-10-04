import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useStore } from "@/store/use-store";

export default function Splash() {
  const [, setLocation] = useLocation();
  const setHasSeenSplash = useStore(s => s.setHasSeenSplash);
  const hasOnboarded = useStore(s => s.hasOnboarded);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasSeenSplash();
      if (hasOnboarded) setLocation("/");
      else setLocation("/onboarding");
    }, 2500);
    return () => clearTimeout(timer);
  }, [setLocation, setHasSeenSplash, hasOnboarded]);

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-dvh flex-col items-center justify-center bg-background p-6 outline-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="mb-8 flex size-20 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-raised">
          <Sparkles aria-hidden="true" className="size-10" strokeWidth={2} />
        </div>

        <h1 className="mb-3 text-display text-foreground">
          CleanCalc <span className="text-primary">Pro</span>
        </h1>
        <p className="max-w-xs text-center text-base text-muted-foreground">
          Objektkalkulation für professionelle Gebäudereiniger.
        </p>
      </motion.div>
    </main>
  );
}
