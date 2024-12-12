import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import checker from "vite-plugin-checker";

const __dirname = import.meta.dirname;
export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: true, overlay: false }),
    themePlugin(),
    // runtimeErrorOverlay() wurde entfernt, um Probleme im Production-Build zu vermeiden
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@db": path.resolve(__dirname, "db"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
