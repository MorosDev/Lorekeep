// src/mapa/biomas.js — los "colores de pintura" del editor de mapas.
// En el lienzo de trabajo cada bioma se guarda con su color "mascara" EXACTO (sin mezclas),
// así al terminar se sabe qué bioma hay en cada pixel. El color "real" es el que se ve en el mapa terminado.
export const BIOMAS = [
  { clave: "oceano", nombre: "Océano", mascara: "#1d3a52", real: "#1f3a54", simbolo: null },
  { clave: "arena", nombre: "Costa / arena", mascara: "#d9c38f", real: "#d8c592", simbolo: null },
  { clave: "llanura", nombre: "Llanura", mascara: "#8fae6b", real: "#9db574", simbolo: null },
  { clave: "bosque", nombre: "Bosque", mascara: "#4f7a45", real: "#7c9a5e", simbolo: "arbol" },
  { clave: "selva", nombre: "Selva", mascara: "#2f6b3a", real: "#5f8a4f", simbolo: "arbolDenso" },
  { clave: "colinas", nombre: "Colinas", mascara: "#a39561", real: "#a8a06a", simbolo: "colina" },
  { clave: "montana", nombre: "Montaña", mascara: "#8a7f72", real: "#a99a85", simbolo: "montana" },
  { clave: "nieve", nombre: "Nieve", mascara: "#e8ecef", real: "#e9edf0", simbolo: "montanaNieve" },
  { clave: "desierto", nombre: "Desierto", mascara: "#d8b36a", real: "#dcc086", simbolo: "duna" },
  { clave: "pantano", nombre: "Pantano", mascara: "#5f6e4a", real: "#73805a", simbolo: "junco" },
  { clave: "ceniza", nombre: "Tierra muerta", mascara: "#6b5a5a", real: "#7e706a", simbolo: "grieta" },
  { clave: "corrupcion", nombre: "Corrupción", mascara: "#5b3f6e", real: "#6a4f7e", simbolo: "espina" },
];
export const OCEANO = 0;

const hexARgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const RGB_MASCARA = BIOMAS.map((b) => hexARgb(b.mascara));
export const RGB_REAL = BIOMAS.map((b) => hexARgb(b.real));

// De un color de la máscara al número de bioma (el más parecido, por si algo se mezcló)
const cache = new Map();
export function biomaDe(r, g, b) {
  const k = (r << 16) | (g << 8) | b;
  let i = cache.get(k);
  if (i !== undefined) return i;
  let mejor = Infinity;
  RGB_MASCARA.forEach(([R, G, B], j) => { const d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < mejor) { mejor = d; i = j; } });
  cache.set(k, i);
  return i;
}

// Tamaños de mapa (en pixeles del mapa terminado)
export const TAMANOS = [
  { clave: "chico", nombre: "Chico (1200 × 800)", ancho: 1200, alto: 800 },
  { clave: "mediano", nombre: "Mediano (1600 × 1100)", ancho: 1600, alto: 1100 },
  { clave: "grande", nombre: "Grande (2400 × 1600)", ancho: 2400, alto: 1600 },
];
