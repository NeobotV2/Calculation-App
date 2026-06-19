import { defineConfig } from "vitest/config";
import path from "path";

// Eigenständige Vitest-Konfiguration. Bewusst NICHT vite.config.ts importieren,
// da diese PORT/BASE_PATH-Env voraussetzt; für Unit-Tests der reinen Logik
// genügen Alias-Auflösung und die Node-Umgebung.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: false,
  },
});
