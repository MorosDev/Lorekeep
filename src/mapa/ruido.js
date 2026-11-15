// src/mapa/ruido.js — "ruido" para terrenos: números al azar que cambian suave de un punto al vecino.
// Con eso, en vez de manchas sin forma, salen continentes, cordilleras y costas que parecen naturales.
// Es Simplex 2D (de Ken Perlin / Stefan Gustavson) con una semilla, para que el mismo número dé el mismo mundo.

// Azar con semilla (mulberry32): mismo número de semilla → misma secuencia
export function azarCon(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;

export function crearRuido(semilla) {
  const azar = azarCon(semilla);
  const p = new Uint8Array(512), base = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];

  // Un valor entre -1 y 1 para el punto (x, y)
  function simplex(x, y) {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const esquina = (gi, xx, yy) => { let tt = 0.5 - xx * xx - yy * yy; if (tt < 0) return 0; tt *= tt; const g = G[gi % 8]; return tt * tt * (g[0] * xx + g[1] * yy); };
    return 70 * (esquina(p[ii + p[jj]], x0, y0) + esquina(p[ii + i1 + p[jj + j1]], x1, y1) + esquina(p[ii + 1 + p[jj + 1]], x2, y2));
  }
  // Varias capas de ruido una sobre otra (grande + mediano + chico): da detalle a la costa
  function capas(x, y, octavas = 5, persistencia = 0.5) {
    let total = 0, amplitud = 1, frecuencia = 1, max = 0;
    for (let o = 0; o < octavas; o++) { total += simplex(x * frecuencia, y * frecuencia) * amplitud; max += amplitud; amplitud *= persistencia; frecuencia *= 2; }
    return total / max;
  }
  return { simplex, capas };
}
