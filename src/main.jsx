import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/cinzel/600.css";
import "@fontsource/alegreya/400.css";
import "@fontsource/alegreya/400-italic.css";
import "@fontsource/alegreya/700.css";
import "@fontsource-variable/inter";
import "./estilos.css";
import App from "./App.jsx";
import { pedirPersistencia } from "./db";

createRoot(document.getElementById("raiz")).render(<App />);
pedirPersistencia();

// Para que funcione sin internet y se pueda instalar (solo en la versión publicada)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
}
