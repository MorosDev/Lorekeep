import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": rutas relativas, así funciona en cualquier carpeta (GitHub Pages distingue mayúsculas:
// el repo se llama "Lorekeep", la dirección es morosdev.github.io/Lorekeep/)
export default defineConfig({
  base: "./",
  plugins: [react()],
});
