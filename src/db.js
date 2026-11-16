// src/db.js — todo se guarda en el navegador (IndexedDB) con Dexie. Nada sale del dispositivo.
// Para respaldar o pasar un mundo a otro aparato: exportar / importar (abajo).
import Dexie from "dexie";
import { CATEGORIAS_BASE } from "./plantillas";
import { cambiarEnTexto } from "./menciones";

export const db = new Dexie("lorekeep");

// Tablas e índices (solo se listan los campos por los que se busca; el resto se guarda igual)
db.version(1).stores({
  mundos: "id, editado",
  fichas: "id, mundoId, [mundoId+tipo], editado, nombre",
  relaciones: "id, mundoId, de, a",
  eventos: "id, mundoId, fecha",
  mapas: "id, mundoId",
  imagenes: "id, mundoId",
});

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const ahora = () => Date.now();

// ── Mundos ──
export async function crearMundo({ nombre, lema = "" }) {
  const m = {
    id: nuevoId(), nombre: nombre.trim() || "Mundo sin nombre", lema, portada: null,
    categorias: CATEGORIAS_BASE.map((c) => ({ ...c })),
    eras: [], calendario: { sufijo: "" }, creado: ahora(), editado: ahora(),
  };
  await db.mundos.add(m);
  return m;
}
export const tocarMundo = (id) => db.mundos.update(id, { editado: ahora() });

export async function borrarMundo(id) {
  await db.transaction("rw", [db.mundos, db.fichas, db.relaciones, db.eventos, db.mapas, db.imagenes], async () => {
    for (const t of [db.fichas, db.relaciones, db.eventos, db.mapas, db.imagenes]) await t.where("mundoId").equals(id).delete();
    await db.mundos.delete(id);
  });
}

// ── Fichas (todo lo que vive en el mundo: personajes, lugares, facciones…) ──
export async function crearFicha(mundoId, tipo, nombre = "") {
  const f = {
    id: nuevoId(), mundoId, tipo, nombre: nombre.trim() || "Sin nombre", resumen: "", imagen: null,
    datos: {}, listas: {}, secciones: {}, etiquetas: [], creado: ahora(), editado: ahora(),
  };
  await db.fichas.add(f);
  await tocarMundo(mundoId);
  return f;
}
export async function guardarFicha(f) {
  await db.fichas.put({ ...f, editado: ahora() });
  await tocarMundo(f.mundoId);
}
export async function borrarFicha(f) {
  await db.transaction("rw", [db.fichas, db.relaciones, db.mapas, db.mundos], async () => {
    await db.relaciones.where("de").equals(f.id).delete();
    await db.relaciones.where("a").equals(f.id).delete();
    // Los pines del mapa que apuntaban a esta ficha se quedan, pero sin ficha
    for (const m of await db.mapas.where("mundoId").equals(f.mundoId).toArray()) {
      if (m.pines.some((p) => p.fichaId === f.id)) await db.mapas.update(m.id, { pines: m.pines.map((p) => (p.fichaId === f.id ? { ...p, fichaId: null } : p)) });
    }
    await db.fichas.delete(f.id);
    await tocarMundo(f.mundoId);
  });
}

// Al renombrar una ficha: cambia "@Viejo" por "@Nuevo" en todos los textos del mundo (fichas y cronología).
// Con soloContar = true no cambia nada, solo dice cuántas hay (para preguntar antes).
export async function renombrarMenciones(mundoId, viejo, nuevo, soloContar = false) {
  let total = 0;
  await db.transaction("rw", [db.fichas, db.eventos], async () => {
    for (const f of await db.fichas.where("mundoId").equals(mundoId).toArray()) {
      let n = 0;
      const r = cambiarEnTexto(f.resumen, viejo, nuevo); n += r.n;
      const secciones = {};
      for (const [k, v] of Object.entries(f.secciones || {})) { const s = cambiarEnTexto(v, viejo, nuevo); secciones[k] = s.texto; n += s.n; }
      if (n && !soloContar) await db.fichas.update(f.id, { resumen: r.texto, secciones });
      total += n;
    }
    for (const e of await db.eventos.where("mundoId").equals(mundoId).toArray()) {
      const r = cambiarEnTexto(e.texto, viejo, nuevo);
      if (r.n && !soloContar) await db.eventos.update(e.id, { texto: r.texto });
      total += r.n;
    }
  });
  return total;
}

// ── Imágenes: se guardan como archivo (Blob), achicadas para no llenar el celular ──
export async function guardarImagen(mundoId, archivo, lado = 1600) {
  const blob = await achicar(archivo, lado);
  const id = nuevoId();
  await db.imagenes.add({ id, mundoId, blob, tipo: blob.type });
  return id;
}
async function achicar(archivo, lado) {
  try {
    const bmp = await createImageBitmap(archivo);
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    if (k === 1 && archivo.size < 900_000) return archivo;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b || archivo), "image/webp", 0.86));
  } catch { return archivo; }
}

// ── Exportar / importar un mundo completo (un .json con las imágenes adentro) ──
const aDataUrl = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
const deDataUrl = async (url) => (await fetch(url)).blob();

export async function exportarMundo(id) {
  const mundo = await db.mundos.get(id);
  const de = (t) => t.where("mundoId").equals(id).toArray();
  const imagenes = await Promise.all((await de(db.imagenes)).map(async (i) => ({ ...i, blob: await aDataUrl(i.blob) })));
  return {
    formato: "lorekeep", version: 1, exportado: new Date().toISOString(),
    mundo, fichas: await de(db.fichas), relaciones: await de(db.relaciones), eventos: await de(db.eventos), mapas: await de(db.mapas), imagenes,
  };
}

// Importa como un mundo NUEVO (ids nuevos), así nunca pisa uno que ya tengas
export async function importarMundo(datos) {
  if (datos?.formato !== "lorekeep" || !datos.mundo) throw new Error("Ese archivo no es un mundo de Lorekeep.");
  const mapa = new Map();
  const id = (viejo) => { if (!viejo) return viejo; if (!mapa.has(viejo)) mapa.set(viejo, nuevoId()); return mapa.get(viejo); };
  const mundoId = id(datos.mundo.id);
  await db.transaction("rw", [db.mundos, db.fichas, db.relaciones, db.eventos, db.mapas, db.imagenes], async () => {
    for (const i of datos.imagenes || []) await db.imagenes.add({ ...i, id: id(i.id), mundoId, blob: await deDataUrl(i.blob) });
    await db.mundos.add({ ...datos.mundo, id: mundoId, portada: id(datos.mundo.portada), nombre: datos.mundo.nombre, editado: ahora() });
    for (const f of datos.fichas || []) await db.fichas.add({ ...f, id: id(f.id), mundoId, imagen: id(f.imagen), datos: cambiarRefs(f.datos, id) });
    for (const r of datos.relaciones || []) await db.relaciones.add({ ...r, id: id(r.id), mundoId, de: id(r.de), a: id(r.a) });
    for (const e of datos.eventos || []) await db.eventos.add({ ...e, id: id(e.id), mundoId, fichas: (e.fichas || []).map(id) });
    for (const m of datos.mapas || []) await db.mapas.add({ ...m, id: id(m.id), mundoId, imagen: id(m.imagen), pines: (m.pines || []).map((p) => ({ ...p, id: id(p.id), fichaId: id(p.fichaId) })) });
  });
  return mundoId;
}
// Los campos que apuntan a otra ficha guardan { ref: id }
function cambiarRefs(datos = {}, id) {
  const out = {};
  for (const [k, v] of Object.entries(datos)) out[k] = v && typeof v === "object" && "ref" in v ? { ref: id(v.ref) } : v;
  return out;
}

// Pide al navegador que no borre los datos si se llena el espacio
export const pedirPersistencia = () => navigator.storage?.persist?.().catch(() => false);
