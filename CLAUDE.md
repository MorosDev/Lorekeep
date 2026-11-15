# Lorekeep — guía para cada sesión de Claude

> Léela antes de tocar algo. Si agregas un sistema, una regla o un pendiente, anótalo aquí en el mismo cambio.

## Qué es
App web (PWA instalable) para crear mundos ficticios, de **Moros** (principiante: respuestas en español, cortas y sin tecnicismos; comentarios del código en español explicando el *porqué*). Proyecto aparte de su bot Null (`MorosDev/null2`).

## Cómo se trabaja
- Rama principal: **`main`**. Cambios chicos, probados (`npm run build` sin errores + probar en navegador con Playwright), PR a `main` y unirlo uno mismo al pasar las pruebas (como en null2). Si algo borra o cambia datos guardados, preguntar antes.
- GitHub Pages publica solo con cada push a `main`. En el repo: Settings → Pages → Source = **GitHub Actions**.

## Arquitectura
- Vite + React 18 (JS, sin TypeScript) · rutas con `HashRouter` (`#/m/:mid/...`) para que Pages no necesite servidor · `base: "/lorekeep/"` en `vite.config.js`.
- **Datos:** Dexie (IndexedDB) en `src/db.js`. Tablas: `mundos`, `fichas`, `relaciones`, `eventos`, `mapas`, `imagenes` (Blob, achicadas a 1600 px; mapas a 4096). Todo lleva `mundoId`. Si cambias tablas o índices: **nueva** `db.version(N)` (nunca edites la 1), o se rompen los datos de quien ya la usa.
- **Fichas:** `{ id, mundoId, tipo, nombre, resumen, imagen, datos, listas, secciones, etiquetas, extras }`. `datos[x]` es texto o `{ ref: idDeFicha }`. Los tipos y lo que pregunta cada uno: `src/plantillas.js` (`CATEGORIAS_BASE` se copia a cada mundo nuevo; cada mundo puede editar las suyas en Ajustes; tipos inventados usan `PLANTILLA_LIBRE`).
- **Menciones:** `@Nombre` / `@[Nombre con espacios]`, se resuelven por nombre al mostrar (`TextoLore`, `mencionesDe` en `src/componentes/util.jsx`). No se guardan como ids: si renombras una ficha, las menciones viejas quedan "rotas" (se ven en gris). Pendiente: ofrecer renombrar las menciones.
- **Exportar/importar:** `exportarMundo` / `importarMundo` (siempre importa como mundo nuevo con ids nuevos; cambia también las refs de `datos`, eventos y pines).
- Vistas en `src/vistas/`: Inicio, Mundo (armazón con barra lateral; pasa `{ mundo, fichas, nombres, mid }` por `useOutletContext`), Compendio, Categoria (+ `NuevaFicha`), Ficha, EditarFicha (guarda solo a los 500 ms), Relaciones (Cytoscape, carga diferida), Cronologia, Mapas, Mapa (Leaflet `CRS.Simple`: pines en pixeles de la imagen; carga diferida), Ajustes.
- Estilo: `src/estilos.css`, oscuro (tinta violeta + oro). Cinzel (títulos), Alegreya (lore), Inter (interfaz), con `@fontsource` (funcionan sin internet). `public/sw.js`: primero la red, si no hay, lo guardado.

## Pendientes (ideas de Moros, en orden sugerido)
1. Árbol genealógico (desde las relaciones de `FAMILIA` en `plantillas.js`).
2. Renombrar menciones al cambiar el nombre de una ficha.
3. Editor para **dibujar** mapas (terreno, ríos, regiones) además de subir imagen; capas políticas.
4. Plantillas editables por el usuario (campos propios por categoría, no solo por ficha).
5. Generación con IA (descripciones, nombres, mapas) — necesita llave/servidor: decidir con Moros.
6. Sincronizar entre dispositivos / cuenta (hoy solo exportar e importar).
7. APK (desde la PWA, con Bubblewrap/PWABuilder).
