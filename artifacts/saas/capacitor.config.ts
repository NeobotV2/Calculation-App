import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cleancalc.pro",
  appName: "CleanCalc Pro",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#0d1117",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d1117",
    },
    Preferences: {
      group: "cleancalc",
    },
  },
  ios: {
    scheme: "cleancalcpro",
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
