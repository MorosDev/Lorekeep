# Lorekeep — guía para cada sesión de Claude

> Léela antes de tocar algo. Si agregas un sistema, una regla o un pendiente, anótalo aquí en el mismo cambio.

## Qué es
App web (PWA instalable) para crear mundos ficticios, de **Moros** (principiante: respuestas en español, cortas y sin tecnicismos; comentarios del código en español explicando el *porqué*). Proyecto aparte de su bot Null (`MorosDev/null2`).

## Sobre Moros y cómo ayudarle (lo pidió el 15 nov 2026)
- Claude trabaja de lleno solo en **tres proyectos**: `MorosDev/null2` (su bot), este (**Lorekeep**, que Moros quiere solo para él) y **Forja ANSI** (el taller de arte ASCII/ANSI, hoy un artifact), más lo que él pida.
- Moros quiere **aprender a programar de verdad**, sobre todo para **ghost-bot**, un bot más grande que Null que va a escribir **él**. Ahí Claude **enseña, no escribe por él**: explica, propone ejercicios, revisa su código y le da pistas antes que soluciones.
- Aun en estos proyectos, cuando haya algo nuevo e interesante, explícale en 2-3 líneas la idea clave (sin sermón), para que vaya aprendiendo de lo que ve.

## Cómo se trabaja
- Rama principal: **`main`**. Cambios chicos, probados (`npm run build` sin errores + probar en navegador con Playwright), PR a `main` y unirlo uno mismo al pasar las pruebas (como en null2). Si algo borra o cambia datos guardados, preguntar antes.
- GitHub Pages publica solo con cada push a `main`. En el repo: Settings → Pages → Source = **GitHub Actions**.

## Arquitectura
- Vite + React 18 (JS, sin TypeScript) · rutas con `HashRouter` (`#/m/:mid/...`) para que Pages no necesite servidor · `base: "./"` en `vite.config.js` (rutas relativas; el repo es `MorosDev/Lorekeep` con mayúscula y Pages respeta mayúsculas: `morosdev.github.io/Lorekeep/`).
- **Datos:** Dexie (IndexedDB) en `src/db.js`. Tablas: `mundos`, `fichas`, `relaciones`, `eventos`, `mapas`, `imagenes` (Blob, achicadas a 1600 px; mapas a 4096). Todo lleva `mundoId`. Si cambias tablas o índices: **nueva** `db.version(N)` (nunca edites la 1), o se rompen los datos de quien ya la usa.
- **Fichas:** `{ id, mundoId, tipo, nombre, resumen, imagen, datos, listas, secciones, etiquetas, extras }`. `datos[x]` es texto o `{ ref: idDeFicha }`. Los tipos y lo que pregunta cada uno: `src/plantillas.js` (`CATEGORIAS_BASE` se copia a cada mundo nuevo; cada mundo puede editar las suyas en Ajustes; tipos inventados usan `PLANTILLA_LIBRE`).
- **Menciones:** `@Nombre` / `@[Nombre con espacios]`, se resuelven por nombre al mostrar (`TextoLore`, `mencionesDe` en `src/componentes/util.jsx`). No se guardan como ids (para escribir natural): al cambiar el nombre de una ficha, `EditarFicha` (al salir del campo Nombre) cuenta las menciones del nombre viejo y pregunta si cambiarlas (`renombrarMenciones` en `db.js`, usa `src/menciones.js`; cambia fichas y cronología). Si no se cambian, quedan en gris. El guardado automático guarda lo pendiente al salir del editor (antes se perdía lo escrito en el último medio segundo).
- **Exportar/importar:** `exportarMundo` / `importarMundo` (siempre importa como mundo nuevo con ids nuevos; cambia también las refs de `datos`, eventos y pines).
- **Árbol genealógico** (`src/familia.js` + `src/vistas/Arbol.jsx`, ruta `#/m/:mid/arbol/:fid`, "Linajes" en la barra): sale de las relaciones normales; `tipoFamiliar()` reconoce padre/madre, hijo/a, hermano/a, pareja/esposo… aunque se escriban a mano. `armarArbol()` pone generaciones (padres −1, hijos +1), ordena cada fila cerca del promedio de sus padres/hijos (3 vueltas) y junta parejas. Desde el centro se agregan familiares (existentes o nuevos). Tocar a alguien lo vuelve el centro.
- **Editor de mapas** (`src/mapa/` + `src/vistas/EditorMapa.jsx`, ruta `#/m/:mid/mapas/:mapaId/dibujar`): se pinta una **máscara** de biomas (cada bioma con un color EXACTO, `BIOMAS` en `biomas.js`; se pinta pixel por pixel sin suavizado para que no se mezclen) y `pintarMapa()` (`pintar.js`) la convierte en el mapa terminado: agua más clara cerca de la costa, línea de costa y espuma, textura, símbolos por bioma (montañas, árboles, dunas…), ríos, fronteras, nombres, pergamino y rosa de los vientos. `generarMascara()` (`generar.js`) crea mundos con ruido Simplex (`ruido.js`, con semilla): altura, humedad y temperatura → bioma; el nivel del mar es un percentil (así "40% de tierra" es exacto). Se calcula a media resolución y se interpola (bilineal) para que la costa no salga en escalones. Herramientas: pincel (borde natural con ruido), relleno (por renglones), río, frontera, nombre, quitar, mover; deshacer guarda copias de la máscara (máx. 8: pesan ~7 MB c/u). Al guardar (`guardarDibujo` en `lienzo.js`) la máscara va en PNG (sin pérdida) y el mapa terminado en WebP, reusando los ids de imagen: los pines del visor siguen igual. El mapa guarda `dibujo: { mascara, rios, fronteras, etiquetas, generador, opciones }`.
- Vistas en `src/vistas/`: Inicio, Mundo (armazón con barra lateral; pasa `{ mundo, fichas, nombres, mid }` por `useOutletContext`), Compendio, Categoria (+ `NuevaFicha`), Ficha, EditarFicha (guarda solo a los 500 ms), Relaciones (Cytoscape, carga diferida), Cronologia, Mapas, Mapa (Leaflet `CRS.Simple`: pines en pixeles de la imagen; carga diferida), Ajustes.
- Estilo: `src/estilos.css`, oscuro (tinta violeta + oro). Cinzel (títulos), Alegreya (lore), Inter (interfaz), con `@fontsource` (funcionan sin internet). `public/sw.js`: primero la red, si no hay, lo guardado.

## Pendientes (ideas de Moros, en orden sugerido)
1. ~~Árbol genealógico~~ (hecho). Mejoras posibles: exportar como imagen, ver hermanos de distintas madres/padres.
2. ~~Renombrar menciones~~ (hecho).
3. ~~Editor para dibujar mapas~~ (hecho). Mejoras posibles: ríos automáticos al generar, regiones rellenas de color (capa política), ciudades como símbolo, retocar un mapa SUBIDO (hoy solo se dibujan los creados aquí), más estilos (acuarela, tinta).
4. Plantillas editables por el usuario (campos propios por categoría, no solo por ficha).
5. Generación con IA (descripciones, nombres, mapas) — necesita llave/servidor: decidir con Moros.
6. Sincronizar entre dispositivos / cuenta (hoy solo exportar e importar).
7. APK (desde la PWA, con Bubblewrap/PWABuilder).
