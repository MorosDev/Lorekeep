// src/lugares.js — qué hay en un lugar: quién está ahí, qué lugares tiene dentro y qué pasó ahí.
// No se guarda nada nuevo: se lee de lo que ya existe (campos como "Origen" o "Sede" que apuntan al lugar,
// relaciones como "vive en", y eventos de la cronología). Así, si cambias la ficha de alguien, el mapa se entera solo.
import { plantillaDe } from "./plantillas";
import { normal } from "./menciones";

// Relaciones que significan "esta persona/cosa está en este lugar" (escritas a mano también cuentan)
const ESTAR = /vive|habita|reside|naci|esta en|trabaja|se esconde|gobierna|custodia|protege|duerme|yace|posee/;

// Tipos de lugar que se pueden elegir al ponerlo en el mapa, con su símbolo en el pin
export const TIPOS_LUGAR = [
  ["Ciudad", "♜"], ["Pueblo", "⌂"], ["Fortaleza", "♖"], ["Templo", "✝"], ["Puerto", "⚓"], ["Torre", "♙"],
  ["Ruinas", "☗"], ["Cueva", "◓"], ["Bosque", "♣"], ["Montaña", "▲"], ["Región", "◎"], ["Otro", "◆"],
];
export const simboloLugar = (tipo) => TIPOS_LUGAR.find(([t]) => t === tipo)?.[1] || null;

export function queHayEn(lugar, fichas, relaciones = [], eventos = []) {
  const aqui = [], dentro = [];
  for (const f of fichas) {
    if (f.id === lugar.id) continue;
    for (const d of plantillaDe(f.tipo).datos) {
      if (f.datos?.[d.clave]?.ref !== lugar.id) continue;
      // "Está en" de otro lugar = es un lugar DENTRO de este (un barrio, una torre)
      if (d.clave === "dentro") dentro.push(f);
      else aqui.push({ ficha: f, como: d.nombre });
    }
  }
  for (const r of relaciones) {
    const t = normal(r.tipo);
    if (!ESTAR.test(t)) continue;
    // "Kael vive en Villa" (la relación sale de la persona) o "Villa … de Kael" (sale del lugar, raro pero posible)
    const otra = r.a === lugar.id ? r.de : r.de === lugar.id ? r.a : null;
    const f = otra && fichas.find((x) => x.id === otra);
    if (f && !aqui.some((x) => x.ficha.id === f.id && x.como === r.tipo)) aqui.push({ ficha: f, como: r.tipo, relacion: r.id });
  }
  const paso = eventos.filter((e) => (e.fichas || []).includes(lugar.id)).sort((a, b) => a.fecha - b.fecha);
  return { aqui, dentro, paso };
}

// En qué mapas aparece una ficha (para "Ver en el mapa")
export const pinesDe = (fichaId, mapas = []) => mapas.flatMap((m) => m.pines.filter((p) => p.fichaId === fichaId).map((p) => ({ mapa: m, pin: p })));
