// src/mapa/generar.js — crea un mundo al azar (con semilla) en la máscara de biomas.
// Idea: tres "ruidos" distintos son la altura, la humedad y la temperatura de cada punto.
// Altura baja = mar; muy alta = montaña; fría = nieve; seca y caliente = desierto; muy húmeda = selva o pantano.
import { crearRuido } from "./ruido";
import { RGB_MASCARA, BIOMAS } from "./biomas";

const B = Object.fromEntries(BIOMAS.map((b, i) => [b.clave, i]));

export const FORMAS = [
  { clave: "continente", nombre: "Un continente" },
  { clave: "dos", nombre: "Dos continentes" },
  { clave: "islas", nombre: "Islas grandes" },
  { clave: "archipielago", nombre: "Archipiélago" },
  { clave: "pangea", nombre: "Tierra sin fin (poco mar)" },
];

// opciones: { semilla, forma, tierra (0.15–0.8: qué parte es tierra), clima (-1 frío … 1 cálido), humedad (-1 seco … 1 húmedo) }
export function generarMascara(ancho, alto, { semilla = 1, forma = "continente", tierra = 0.4, clima = 0, humedad = 0 } = {}) {
  const R = crearRuido(semilla), Rh = crearRuido(semilla + 101), Rt = crearRuido(semilla + 202);
  // Se calcula a media resolución (4 veces menos trabajo) y cada valor pinta un cuadrito de 2×2
  const w = Math.ceil(ancho / 2), h = Math.ceil(alto / 2), n = w * h;
  const alturas = new Float32Array(n), humedades = new Float32Array(n), temples = new Float32Array(n);
  const proporcion = ancho / alto;
  const escala = { continente: 2.2, dos: 2.4, islas: 3.4, archipielago: 6, pangea: 2.6 }[forma] || 2.2;

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x / w) * proporcion, ny = y / h, i = y * w + x;
    let a = R.capas(nx * escala, ny * escala, 6, 0.5);
    // Forma: qué tan "al centro" se junta la tierra (lejos del centro, más mar)
    const cx = x / w - 0.5, cy = y / h - 0.5;
    if (forma === "continente") a = a * 0.75 + (0.55 - Math.hypot(cx * 1.15, cy * 1.35) * 1.6) * 0.65;
    else if (forma === "dos") { const d = Math.min(Math.hypot((cx + 0.22) * 1.5, cy * 1.3), Math.hypot((cx - 0.22) * 1.5, cy * 1.3)); a = a * 0.75 + (0.4 - d * 2) * 0.6; }
    else if (forma === "islas") a = a * 0.9 + (0.3 - Math.hypot(cx, cy) * 0.9) * 0.4;
    else if (forma === "archipielago") a = a * 0.95 - Math.hypot(cx, cy) * 0.25;
    // Orilla del mapa siempre mar (que no se corte la tierra contra el borde), salvo "sin fin"
    if (forma !== "pangea") { const borde = Math.min(x / w, 1 - x / w, y / h, 1 - y / h); if (borde < 0.06) a -= (0.06 - borde) * 6; }
    alturas[i] = a;
    humedades[i] = (Rh.capas(nx * 3, ny * 3, 4, 0.55) + 1) / 2 + humedad * 0.2;
    temples[i] = Rt.simplex((x / w) * 4, (y / h) * 4);
  }

  // Nivel del mar exacto: el valor que deja la parte de tierra pedida (un percentil)
  const ordenadas = Float32Array.from(alturas).sort();
  const parte = forma === "pangea" ? Math.max(tierra, 0.7) : tierra;
  const mar = ordenadas[Math.floor((1 - parte) * (n - 1))];
  const cima = ordenadas[n - 1];

  // Cada pixel del mapa toma el valor MEZCLADO de sus 4 vecinos de la rejilla chica (interpolación bilineal):
  // así la costa sale suave y no en escalones de 2×2
  const mezcla = (arr, fx, fy) => {
    const x0 = Math.min(w - 1, Math.floor(fx)), y0 = Math.min(h - 1, Math.floor(fy)), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = arr[y0 * w + x0] * (1 - tx) + arr[y0 * w + x1] * tx, b = arr[y1 * w + x0] * (1 - tx) + arr[y1 * w + x1] * tx;
    return a * (1 - ty) + b * ty;
  };
  const img = new ImageData(ancho, alto);
  const d = img.data;
  for (let Y = 0; Y < alto; Y++) for (let X = 0; X < ancho; X++) {
    const fx = X / 2, fy = Y / 2, a = mezcla(alturas, fx, fy);
    let bioma;
    if (a < mar) bioma = B.oceano;
    else {
      const e = (a - mar) / Math.max(1e-6, cima - mar); // 0 en la costa, 1 en la cima más alta
      const latitud = Math.abs(Y / alto - 0.5) * 2;      // 0 en el ecuador, 1 en los polos
      const t = 1 - latitud * 0.85 - e * 0.45 + clima * 0.25 + mezcla(temples, fx, fy) * 0.08;
      const m = mezcla(humedades, fx, fy);
      if (e < 0.025) bioma = t < 0.2 ? B.nieve : B.arena;
      else if (e > 0.6) bioma = t < 0.38 ? B.nieve : B.montana;
      else if (e > 0.42) bioma = t < 0.2 ? B.nieve : B.colinas;
      else if (t < 0.16) bioma = B.nieve;
      else if (m < 0.36 && t > 0.55) bioma = B.desierto;
      else if (m > 0.66 && e < 0.12) bioma = B.pantano;
      else if (m > 0.62 && t > 0.62) bioma = B.selva;
      else if (m > 0.5) bioma = B.bosque;
      else bioma = B.llanura;
    }
    const [r, g, b] = RGB_MASCARA[bioma], k = (Y * ancho + X) * 4;
    d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
  }
  return img;
}

// Una máscara toda de mar (para empezar a dibujar desde cero)
export function mascaraVacia(ancho, alto) {
  const img = new ImageData(ancho, alto), [r, g, b] = RGB_MASCARA[B.oceano];
  for (let k = 0; k < img.data.length; k += 4) { img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255; }
  return img;
}
