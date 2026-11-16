// src/menciones.js — las menciones @Nombre / @[Nombre con espacios] dentro de los textos.
// Se guardan como TEXTO (no como id) para que escribir sea natural; por eso, al renombrar una ficha,
// hay que cambiar también el texto de sus menciones en todo el mundo (renombrarMenciones).
export const RE_MENCION = /@\[([^\]]{1,80})\]|@([\p{L}\p{N}_'’-]{2,40})/gu;
export const normal = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Cómo se escribe la mención de un nombre: con corchetes si lleva espacios o signos
export const mencion = (nombre) => (/^[\p{L}\p{N}_'’-]{2,40}$/u.test(nombre) ? "@" + nombre : `@[${nombre}]`);

// Cambia en un texto las menciones de "viejo" por "nuevo". Regresa el texto y cuántas cambió.
export function cambiarEnTexto(texto, viejo, nuevo) {
  let n = 0;
  const t = String(texto || "").replace(RE_MENCION, (todo, conCorchetes, suelta) => {
    if (normal(conCorchetes || suelta) !== normal(viejo)) return todo;
    n++;
    return mencion(nuevo);
  });
  return { texto: t, n };
}
