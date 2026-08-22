import dns from "node:dns";
try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch (e) {}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
  ],
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
