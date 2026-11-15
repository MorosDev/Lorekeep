// src/App.jsx — las rutas. Se usa #/ en la dirección para que funcione en GitHub Pages sin servidor.
import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Inicio from "./vistas/Inicio.jsx";
import Mundo from "./vistas/Mundo.jsx";
import Compendio from "./vistas/Compendio.jsx";
import Categoria from "./vistas/Categoria.jsx";
import Ficha from "./vistas/Ficha.jsx";
import EditarFicha from "./vistas/EditarFicha.jsx";
import Cronologia from "./vistas/Cronologia.jsx";
import Mapas from "./vistas/Mapas.jsx";
import Ajustes from "./vistas/Ajustes.jsx";
import Arbol from "./vistas/Arbol.jsx";

// El grafo y el mapa usan librerías pesadas: se cargan solo cuando los abres
const Relaciones = lazy(() => import("./vistas/Relaciones.jsx"));
const Mapa = lazy(() => import("./vistas/Mapa.jsx"));
const Cargando = () => <p className="ayuda">Cargando…</p>;

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/m/:mid" element={<Mundo />}>
          <Route index element={<Compendio />} />
          <Route path="c/:tipo" element={<Categoria />} />
          <Route path="f/:fid" element={<Ficha />} />
          <Route path="f/:fid/editar" element={<EditarFicha />} />
          <Route path="relaciones" element={<Suspense fallback={<Cargando />}><Relaciones /></Suspense>} />
          <Route path="cronologia" element={<Cronologia />} />
          <Route path="arbol" element={<Arbol />} />
          <Route path="arbol/:fid" element={<Arbol />} />
          <Route path="mapas" element={<Mapas />} />
          <Route path="mapas/:mapaId" element={<Suspense fallback={<Cargando />}><Mapa /></Suspense>} />
          <Route path="ajustes" element={<Ajustes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
