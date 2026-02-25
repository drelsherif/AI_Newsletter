import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * GitHub Pages deployment:
 *   Set VITE_BASE to your repo name in GitHub Actions variables.
 *   Example: if your repo is github.com/yourname/newsforge
 *   Set VITE_BASE = /newsforge/
 *
 *   Go to: Repo → Settings → Variables and secrets → Actions → New repository variable
 *   Name: VITE_BASE  Value: /newsforge/
 */
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          zod: ["zod"]
        }
      }
    }
  }
});
