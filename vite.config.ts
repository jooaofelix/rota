import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    injectRegister: null,
    strategies: "injectManifest",
    srcDir: "src/sw",
    filename: "sw.ts",
    manifest: false,
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    },
    devOptions: {
      enabled: false,
    },
  }), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});