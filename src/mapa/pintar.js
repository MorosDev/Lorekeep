// src/mapa/pintar.js — de la máscara de biomas (manchas de color) al mapa terminado.
// Pasos: 1) colores de cada pixel (agua más clara cerca de la costa, tierra con textura),
// 2) línea de costa y espuma, 3) símbolos (montañas, árboles, dunas…), 4) ríos, fronteras y nombres, 5) acabado.
import { BIOMAS, RGB_REAL, OCEANO, biomaDe } from "./biomas";
import { crearRuido, azarCon } from "./ruido";

// Cada pixel → número de bioma (Uint8Array del tamaño del mapa)
export function leerBiomas(img) {
  const { width: W, height: H, data: d } = img, out = new Uint8Array(W * H);
  for (let i = 0, k = 0; i < out.length; i++, k += 4) out[i] = biomaDe(d[k], d[k + 1], d[k + 2]);
  return out;
}

// Qué tan cerca de tierra está cada punto (0 mar abierto … 1 pegado a la costa), a 1/4 de resolución
function cercaniaCosta(bio, W, H) {
  const w = Math.ceil(W / 4), h = Math.ceil(H / 4);
  let a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = bio[Math.min(H - 1, y * 4) * W + Math.min(W - 1, x * 4)] !== OCEANO ? 1 : 0;
  // Difuminar 3 veces = la tierra "se derrama" un poco sobre el agua
  const r = 4;
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const b = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * w + Math.max(0, Math.min(w - 1, x))]; for (let x = 0; x < w; x++) { b[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.max(0, Math.min(h - 1, y)) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = s / (2 * r + 1); s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
  }
  return { a, w };
}

const HONDO = [22, 44, 66], BAJO = [64, 112, 138], COSTA = [52, 42, 30], ESPUMA = [168, 200, 210];

export function pintarMapa(mascara, capas = {}, op = {}) {
  const W = mascara.width, H = mascara.height;
  const bio = leerBiomas(mascara);
  const { a: cerca, w: wc } = cercaniaCosta(bio, W, H);
  const R = crearRuido(op.semilla || 7);
  // Textura suave para la tierra, a 1/4 de resolución
  const tw = Math.ceil(W / 4), th = Math.ceil(H / 4), tex = new Float32Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) tex[y * tw + x] = R.capas(x / 24, y / 24, 3, 0.5);

  const img = new ImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = i * 4, b = bio[i];
    let c;
    if (b === OCEANO) {
      const t = Math.min(1, cerca[(y >> 2) * wc + (x >> 2)] * 1.6) ** 0.8;
      c = [HONDO[0] + (BAJO[0] - HONDO[0]) * t, HONDO[1] + (BAJO[1] - HONDO[1]) * t, HONDO[2] + (BAJO[2] - HONDO[2]) * t];
      // Espuma: el agua pegada a tierra se aclara
      if ((x > 1 && bio[i - 2] !== OCEANO) || (x < W - 2 && bio[i + 2] !== OCEANO) || (y > 1 && bio[i - 2 * W] !== OCEANO) || (y < H - 2 && bio[i + 2 * W] !== OCEANO)) c = c.map((v, j) => v * 0.5 + ESPUMA[j] * 0.5);
    } else {
      const v = 0.93 + tex[(y >> 2) * tw + (x >> 2)] * 0.14;
      c = RGB_REAL[b].map((n) => n * v);
      // Costa: tierra que toca el mar
      const izq = x > 0 ? bio[i - 1] : b, der = x < W - 1 ? bio[i + 1] : b, arr = y > 0 ? bio[i - W] : b, aba = y < H - 1 ? bio[i + W] : b;
      if (izq === OCEANO || der === OCEANO || arr === OCEANO || aba === OCEANO) c = COSTA;
      // Entre dos biomas de tierra, una sombra leve marca el cambio
      else if (izq !== b || arr !== b) c = c.map((n) => n * 0.9);
    }
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }

  const lienzo = document.createElement("canvas");
  lienzo.width = W; lienzo.height = H;
  const ctx = lienzo.getContext("2d");
  ctx.putImageData(img, 0, 0);
  dibujarSimbolos(ctx, bio, W, H, op.semilla || 7, op.densidad ?? 1);
  dibujarVectores(ctx, capas);
  if (op.pergamino) acabadoPergamino(ctx, W, H);
  if (op.rosa) rosaDeLosVientos(ctx, W - Math.min(W, H) * 0.11, H - Math.min(W, H) * 0.12, Math.min(W, H) * 0.075);
  return lienzo;
}

// ── Símbolos ──
function dibujarSimbolos(ctx, bio, W, H, semilla, densidad) {
  const azar = azarCon(semilla * 31 + 5);
  const lista = [];
  const paso = 15 / Math.sqrt(densidad || 1);
  const bioEn = (x, y) => bio[Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))];
  for (let y = 10; y < H - 6; y += paso) for (let x = 8; x < W - 8; x += paso) {
    const px = x + (azar() - 0.5) * paso * 0.9, py = y + (azar() - 0.5) * paso * 0.9;
    const b = bioEn(px, py), tipo = BIOMAS[b].simbolo;
    if (!tipo) continue;
    // Que el símbolo quepa en su bioma (no encima de la costa)
    if (bioEn(px - 8, py) !== b || bioEn(px + 8, py) !== b || bioEn(px, py + 5) !== b) continue;
    const prob = { montana: 0.5, montanaNieve: 0.5, colina: 0.3, arbol: 0.65, arbolDenso: 0.9, duna: 0.25, junco: 0.35, grieta: 0.25, espina: 0.4 }[tipo];
    if (azar() > prob) continue;
    // Las montañas, más grandes y variadas (parecen cordillera, no alfombra)
    const t = tipo.startsWith("montana") ? 1 + azar() * 0.7 : 0.8 + azar() * 0.5;
    lista.push({ tipo, x: px, y: py, t, v: azar() });
  }
  lista.sort((a, b) => a.y - b.y); // los de abajo tapan a los de arriba
  for (const s of lista) SIMBOLO[s.tipo](ctx, s.x, s.y, s.t, s.v);
}

const linea = (ctx, color, ancho = 1.2) => { ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineJoin = "round"; ctx.lineCap = "round"; };
function montana(ctx, x, y, t, claro, sombra, borde, nieve) {
  const w = 13 * t, h = 13 * t;
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = claro; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = sombra; ctx.fill();
  if (nieve) { ctx.beginPath(); ctx.moveTo(x - w * 0.32, y - h * 0.68); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.32, y - h * 0.68); ctx.lineTo(x + w * 0.1, y - h * 0.6); ctx.lineTo(x - w * 0.1, y - h * 0.7); ctx.closePath(); ctx.fillStyle = "#fbfdff"; ctx.fill(); }
  linea(ctx, borde, 1.3); ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y); ctx.stroke();
}
const SIMBOLO = {
  montana: (c, x, y, t) => montana(c, x, y, t, "#d9ccb4", "#8f806b", "#4a3e2f", false),
  montanaNieve: (c, x, y, t) => montana(c, x, y, t, "#f4f6f8", "#aab6c2", "#5b6673", true),
  colina: (c, x, y, t) => { linea(c, "#6d6440", 1.3); c.beginPath(); c.arc(x, y + 3 * t, 8 * t, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); },
  arbol: (c, x, y, t) => {
    linea(c, "#4b3a26", 1.2); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 4 * t); c.stroke();
    c.beginPath(); c.arc(x, y - 7 * t, 4.6 * t, 0, 7); c.fillStyle = "#4f7a3c"; c.fill(); linea(c, "#2c4423", 1); c.stroke();
  },
  arbolDenso: (c, x, y, t, v) => {
    for (const [dx, dy] of [[-4, 0], [4, 0], [0, -3]]) { c.beginPath(); c.arc(x + dx * t, y - 6 * t + dy * t, 4.6 * t, 0, 7); c.fillStyle = v > 0.5 ? "#36643a" : "#2f5a33"; c.fill(); linea(c, "#1e3a22", 0.9); c.stroke(); }
  },
  duna: (c, x, y, t) => { linea(c, "#a8834a", 1.2); c.beginPath(); c.moveTo(x - 8 * t, y); c.quadraticCurveTo(x - 2 * t, y - 5 * t, x + 7 * t, y); c.stroke(); },
  junco: (c, x, y, t) => { linea(c, "#3f4c30", 1.1); for (const dx of [-3, 0, 3]) { c.beginPath(); c.moveTo(x + dx * t, y); c.lineTo(x + dx * t * 1.4, y - (5 + Math.abs(dx)) * t * 0.8); c.stroke(); } c.beginPath(); c.moveTo(x - 6 * t, y); c.lineTo(x + 6 * t, y); c.stroke(); },
  grieta: (c, x, y, t) => { linea(c, "#4a3b37", 1.2); c.beginPath(); c.moveTo(x - 7 * t, y - 2 * t); c.lineTo(x - 2 * t, y + 1 * t); c.lineTo(x + 1 * t, y - 3 * t); c.lineTo(x + 7 * t, y); c.stroke(); },
  espina: (c, x, y, t) => { c.fillStyle = "#35204a"; for (const dx of [-4, 0, 4]) { c.beginPath(); c.moveTo(x + dx * t - 2 * t, y); c.lineTo(x + dx * t, y - (dx ? 7 : 11) * t); c.lineTo(x + dx * t + 2 * t, y); c.fill(); } },
};

// ── Ríos, fronteras y nombres (también se usan en la vista rápida del editor) ──
function trazoSuave(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const u = pts[pts.length - 1]; ctx.lineTo(u[0], u[1]);
}
export const TAM_ETIQUETA = { s: 16, m: 24, l: 36, xl: 56 };

export function dibujarVectores(ctx, { rios = [], fronteras = [], etiquetas = [] } = {}) {
  ctx.save();
  for (const f of fronteras) {
    trazoSuave(ctx, f.puntos); linea(ctx, "rgba(250,236,210,.45)", 5.5); ctx.setLineDash([]); ctx.stroke();
    trazoSuave(ctx, f.puntos); linea(ctx, f.color || "#8e2f2f", 2.4); ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]);
  }
  for (const r of rios) {
    trazoSuave(ctx, r.puntos); linea(ctx, "#2a4658", (r.ancho || 3) + 2.2); ctx.stroke();
    trazoSuave(ctx, r.puntos); linea(ctx, "#5d97b5", r.ancho || 3); ctx.stroke();
  }
  for (const e of etiquetas) {
    const tam = TAM_ETIQUETA[e.tamano] || 24;
    ctx.save(); ctx.translate(e.x, e.y); if (e.giro) ctx.rotate((e.giro * Math.PI) / 180);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (e.estilo === "mar") { ctx.font = `italic 400 ${tam}px "Alegreya", Georgia, serif`; linea(ctx, "rgba(15,30,45,.65)", 4); ctx.fillStyle = "#d4e6ef"; }
    else if (e.estilo === "region") { ctx.font = `600 ${tam}px "Cinzel", Georgia, serif`; ctx.letterSpacing = `${Math.round(tam * 0.25)}px`; linea(ctx, "rgba(245,232,205,.75)", 3); ctx.fillStyle = "rgba(90,30,30,.85)"; }
    else { ctx.font = `600 ${tam}px "Cinzel", Georgia, serif`; linea(ctx, "rgba(245,234,210,.9)", Math.max(3, tam / 6)); ctx.fillStyle = "#2b2116"; }
    ctx.strokeText(e.texto, 0, 0); ctx.fillText(e.texto, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ── Acabados ──
function acabadoPergamino(ctx, W, H) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "#f2e3c2"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(120,90,55,1)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Marco
  ctx.save(); linea(ctx, "#3d2f1e", 3); ctx.strokeRect(10, 10, W - 20, H - 20); linea(ctx, "#3d2f1e", 1); ctx.strokeRect(17, 17, W - 34, H - 34); ctx.restore();
}

function rosaDeLosVientos(ctx, x, y, r) {
  ctx.save(); ctx.translate(x, y);
  linea(ctx, "#3a2e20", 1.2);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.strokeStyle = "rgba(58,46,32,.8)"; ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const largo = i % 2 ? r * 0.55 : r, ang = (i * Math.PI) / 4;
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -largo); ctx.lineTo(r * 0.11, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fillStyle = i % 2 ? "#cdb98f" : "#efe2c4"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -largo); ctx.lineTo(-r * 0.11, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fillStyle = i % 2 ? "#6b5a3e" : "#3a2e20"; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.font = `600 ${Math.round(r * 0.32)}px "Cinzel", Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  linea(ctx, "rgba(245,234,210,.9)", 3); ctx.strokeText("N", 0, -r - 2); ctx.fillStyle = "#2b2116"; ctx.fillText("N", 0, -r - 2);
  ctx.restore();
}
