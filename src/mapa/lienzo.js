// src/mapa/lienzo.js — ayudas para guardar y leer el dibujo del mapa
import { db, nuevoId } from "../db";
import { pintarMapa } from "./pintar";

export const aCanvas = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").putImageData(img, 0, 0); return c; };
export const aBlob = (canvas, tipo = "image/png", calidad) => new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo guardar la imagen"))), tipo, calidad));

// La máscara se guarda en PNG (sin pérdida: cada color de bioma tiene que quedar exacto)
export async function leerMascara(id) {
  const reg = await db.imagenes.get(id);
  const bmp = await createImageBitmap(reg.blob);
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

// Que las letras del mapa (Cinzel, Alegreya) estén cargadas antes de pintar; si no, salen en otra letra
export async function cargarLetras() {
  try { await Promise.all([document.fonts.load('600 32px "Cinzel"'), document.fonts.load('italic 400 32px "Alegreya"')]); } catch { /* sin letras, se usa Georgia */ }
}

// Guarda máscara + mapa terminado. Reusa los ids de imagen si ya existían (así el visor se actualiza solo).
export async function guardarDibujo(mapa, mascaraImg, dibujo) {
  await cargarLetras();
  const final = pintarMapa(mascaraImg, dibujo, dibujo.opciones);
  const idMascara = dibujo.mascara || nuevoId(), idImagen = mapa.imagen || nuevoId();
  const pngMascara = await aBlob(aCanvas(mascaraImg), "image/png");
  const terminado = await aBlob(final, "image/webp", 0.9);
  await db.transaction("rw", [db.imagenes, db.mapas], async () => {
    await db.imagenes.put({ id: idMascara, mundoId: mapa.mundoId, blob: pngMascara, tipo: "image/png" });
    await db.imagenes.put({ id: idImagen, mundoId: mapa.mundoId, blob: terminado, tipo: "image/webp" });
    await db.mapas.update(mapa.id, { imagen: idImagen, ancho: mascaraImg.width, alto: mascaraImg.height, dibujo: { ...dibujo, mascara: idMascara } });
  });
  return { ...mapa, imagen: idImagen, dibujo: { ...dibujo, mascara: idMascara } };
}
