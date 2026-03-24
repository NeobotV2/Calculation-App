import { useEffect } from "react";
import { useLocation } from "wouter";
import { isAndroid } from "@/lib/capacitor";
import { App } from "@capacitor/app";

export function useAndroidBack() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAndroid) return;

    const handler = App.addListener("backButton", ({ canGoBack }) => {
      if (location === "/" || location === "/splash" || location === "/onboarding") {
        App.minimizeApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        setLocation("/");
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [location, setLocation]);
}
