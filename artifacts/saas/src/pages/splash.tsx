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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center mb-8 shadow-sm">
          <Sparkles className="w-12 h-12 text-primary-foreground" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">
          CleanCalc <span className="text-primary">Pro</span>
        </h1>
        <p className="text-muted-foreground text-center max-w-xs text-base">
          Objektkalkulation für professionelle Gebäudereiniger.
        </p>
      </motion.div>
    </div>
  );
}