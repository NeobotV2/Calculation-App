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
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-3xl accent-gradient flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
          <Sparkles className="w-12 h-12 text-background" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-display font-bold text-white mb-3 tracking-tight">
          CleanCalc <span className="text-primary">Pro</span>
        </h1>
        <p className="text-muted-foreground text-center max-w-xs text-lg font-light">
          Objektkalkulation für professionelle Gebäudereiniger.
        </p>
      </motion.div>
    </div>
  );
}
