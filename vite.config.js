import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: la carpeta donde vive en GitHub Pages (morosdev.github.io/lorekeep/)
export default defineConfig({
  base: "/lorekeep/",
  plugins: [react()],
});
