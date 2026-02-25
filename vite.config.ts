import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * GH Pages:
 *   set VITE_BASE=/YOUR_REPO_NAME/
 * Example (Windows CMD):
 *   set VITE_BASE=/NAP_News_VNEXT/
 */
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
