// src/familia.js — de las relaciones sale la familia, y de la familia, el dibujo del árbol.
// No hay una tabla aparte: "padre / madre de", "pareja de", etc. son relaciones normales (las de FAMILIA en plantillas.js),
// así lo que conectas en la ficha aparece en el árbol y al revés.
import { normal } from "./componentes/util.jsx";

// Qué parentesco es una relación, aunque la hayan escrito a mano ("madre de", "esposa de", "hermanastro de")
export function tipoFamiliar(tipo) {
  const t = normal(tipo);
  if (/padre|madre|progenitor/.test(t)) return "padre";
  if (/\bhij[oa]/.test(t)) return "hijo";
  if (/herman/.test(t)) return "hermano";
  if (/pareja|espos|casad|consorte|conyuge/.test(t)) return "pareja";
  return null;
}

// Arma los cuatro mapas: padres, hijos, parejas y hermanos de cada ficha
export function grafoFamilia(relaciones) {
  const m = { padres: new Map(), hijos: new Map(), parejas: new Map(), hermanos: new Map() };
  const poner = (mapa, a, b) => { if (!mapa.has(a)) mapa.set(a, new Set()); mapa.get(a).add(b); };
  for (const r of relaciones) {
    const k = tipoFamiliar(r.tipo);
    // "A padre de B": A es padre, B es hijo. "A hijo de B": al revés.
    if (k === "padre") { poner(m.hijos, r.de, r.a); poner(m.padres, r.a, r.de); }
    else if (k === "hijo") { poner(m.padres, r.de, r.a); poner(m.hijos, r.a, r.de); }
    else if (k === "hermano") { poner(m.hermanos, r.de, r.a); poner(m.hermanos, r.a, r.de); }
    else if (k === "pareja") { poner(m.parejas, r.de, r.a); poner(m.parejas, r.a, r.de); }
  }
  const lista = (mapa) => (id) => [...(mapa.get(id) || [])];
  return { padres: lista(m.padres), hijos: lista(m.hijos), parejas: lista(m.parejas), hermanos: lista(m.hermanos) };
}

export const cuantosFamiliares = (G, id) => G.padres(id).length + G.hijos(id).length + G.parejas(id).length + G.hermanos(id).length;

// ── El dibujo ──
// 1) Generaciones: la raíz es 0, sus padres -1, sus hijos +1, parejas y hermanos en la misma.
// 2) Orden dentro de cada generación: cada quien cerca del promedio de sus padres (abajo) o de sus hijos (arriba).
// 3) Posiciones: se acomodan sin encimarse y las parejas quedan juntas.
export const TARJETA = { ancho: 168, alto: 64, hueco: 28, piso: 120 }; // piso = distancia entre generaciones

export function armarArbol(raiz, G, { arriba = 3, abajo = 3, maximo = 90 } = {}) {
  const gen = new Map([[raiz, 0]]);
  const cola = [raiz];
  while (cola.length && gen.size < maximo) {
    const x = cola.shift(), g = gen.get(x);
    const vecinos = [
      ...G.parejas(x).map((y) => [y, g]), ...G.hermanos(x).map((y) => [y, g]),
      ...G.padres(x).map((y) => [y, g - 1]), ...G.hijos(x).map((y) => [y, g + 1]),
    ];
    for (const [y, gy] of vecinos) {
      if (gy < -arriba || gy > abajo || gen.has(y)) continue;
      gen.set(y, gy); cola.push(y);
    }
  }

  // Filas por generación, en el orden en que se encontraron
  const filas = new Map();
  for (const [id, g] of gen) { if (!filas.has(g)) filas.set(g, []); filas.get(g).push(id); }
  const gens = [...filas.keys()].sort((a, b) => a - b);
  const paso = TARJETA.ancho + TARJETA.hueco;
  const x = new Map();
  const promedio = (ids) => { const v = ids.filter((i) => x.has(i)).map((i) => x.get(i)); return v.length ? v.reduce((a, b) => a + b) / v.length : null; };

  // Pone una fila en orden: cada quien donde quiere estar, empujando a la derecha si se enciman
  const acomodar = (fila, deseado) => {
    const orden = juntarParejas(fila.map((id, i) => [id, deseado(id) ?? (x.get(id) ?? i * paso)]).sort((a, b) => a[1] - b[1]).map(([id]) => id), G);
    let ultimo = -Infinity;
    const pos = orden.map((id) => { const d = deseado(id) ?? x.get(id) ?? 0; const p = Math.max(d, ultimo + paso); ultimo = p; return p; });
    // Re-centrar la fila sobre lo que quería (si se empujó, no queda toda corrida a la derecha)
    const quer = orden.map((id) => deseado(id) ?? pos[orden.indexOf(id)]);
    const corrimiento = (quer.reduce((a, b) => a + b, 0) - pos.reduce((a, b) => a + b, 0)) / pos.length;
    orden.forEach((id, i) => x.set(id, pos[i] + corrimiento));
    filas.set(gen.get(orden[0]), orden);
  };

  // Primera pasada de arriba hacia abajo (hijos bajo sus padres), luego de abajo hacia arriba (padres sobre sus hijos)
  filas.get(gens[0]).forEach((id, i) => x.set(id, i * paso));
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    for (const g of gens.slice(vuelta ? 0 : 1)) acomodar(filas.get(g), (id) => promedio(G.padres(id)));
    for (const g of [...gens].reverse().slice(1)) acomodar(filas.get(g), (id) => promedio(G.hijos(id)));
  }

  // A coordenadas desde 0
  const minX = Math.min(...x.values());
  const nodos = [...gen.keys()].map((id) => ({ id, gen: gen.get(id), x: x.get(id) - minX, y: (gen.get(id) - gens[0]) * (TARJETA.alto + TARJETA.piso) }));
  const ancho = Math.max(...nodos.map((n) => n.x)) + TARJETA.ancho;
  const alto = (gens.length - 1) * (TARJETA.alto + TARJETA.piso) + TARJETA.alto;
  return { nodos, ancho, alto, dentro: gen };
}

// Las parejas lado a lado: si A y B son pareja y están en la misma fila, B va justo después de A
function juntarParejas(orden, G) {
  const out = [], puestos = new Set();
  for (const id of orden) {
    if (puestos.has(id)) continue;
    out.push(id); puestos.add(id);
    for (const p of G.parejas(id)) if (orden.includes(p) && !puestos.has(p)) { out.push(p); puestos.add(p); }
  }
  return out;
}
