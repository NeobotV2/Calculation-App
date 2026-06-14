import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const rawPort = process.env.PORT;

if (!isCapacitorBuild && !rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = rawPort ? Number(rawPort) : 5173;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = isCapacitorBuild ? "./" : process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Stabile Vendor-Chunks für besseres Caching und parallele Ladezeiten.
        // Auf den realen Paketordner (/node_modules/<pkg>/) matchen, damit die
        // pnpm-Virtual-Store-Ordnernamen (z. B. "framer-motion@11_react@19") nicht
        // fälschlich in den React-Chunk wandern.
        manualChunks(id: string) {
          if (!id.includes("/node_modules/")) return;
          if (/\/node_modules\/(react-dom|scheduler)\//.test(id)) return "react-vendor";
          if (/\/node_modules\/react\//.test(id)) return "react-vendor";
          if (/\/node_modules\/(recharts|d3-[^/]+|victory-vendor)\//.test(id)) return "charts";
          if (id.includes("/node_modules/framer-motion/")) return "framer";
          if (id.includes("/node_modules/@supabase/")) return "supabase";
          if (id.includes("/node_modules/lucide-react/")) return "icons";
          if (id.includes("/node_modules/@radix-ui/")) return "radix";
          return "vendor";
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
