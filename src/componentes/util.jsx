// src/componentes/util.jsx — piezas pequeñas que usan varias vistas
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";

// Una imagen guardada en la base → URL que el navegador puede mostrar
export function useImagen(id) {
  const reg = useLiveQuery(() => (id ? db.imagenes.get(id) : null), [id]);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!reg?.blob) { setUrl(null); return; }
    const u = URL.createObjectURL(reg.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [reg]);
  return url;
}

export function Retrato({ id, icono = "✦", grande = false, tam = null }) {
  const url = useImagen(id);
  const t = tam || (grande ? 72 : null);
  const medida = t ? { width: t, height: t, fontSize: t * 0.45, borderRadius: t < 30 ? "50%" : undefined } : {};
  return <div className="retrato" style={{ backgroundImage: url ? `url(${url})` : undefined, ...medida }}>{url ? null : icono}</div>;
}

// Ventana sobre la página (para crear, confirmar…)
export function Ventana({ titulo, alCerrar, children }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [alCerrar]);
  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="ventana" role="dialog" aria-modal="true" aria-label={titulo}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

// Aviso que se va solo ("Guardado", "Exportado"…)
export function useAviso() {
  const [t, setT] = useState(null);
  const ref = useRef(0);
  const avisar = (texto) => { setT(texto); clearTimeout(ref.current); ref.current = setTimeout(() => setT(null), 2600); };
  const nodo = t ? <div className="aviso" role="status">{t}</div> : null;
  return [avisar, nodo];
}

// ── Menciones: en cualquier texto, @Nombre (o @[Nombre con espacios]) enlaza a esa ficha ──
import { RE_MENCION, normal } from "../menciones";
export { normal };

export function nombresDe(fichas) {
  const m = new Map();
  for (const f of fichas || []) m.set(normal(f.nombre), f);
  return m;
}
// Las fichas que menciona un texto (para "Mencionado en")
export function mencionesDe(texto, nombres) {
  const out = new Set();
  for (const m of String(texto || "").matchAll(RE_MENCION)) {
    const f = nombres.get(normal(m[1] || m[2]));
    if (f) out.add(f.id);
  }
  return out;
}

// Texto largo → párrafos con las menciones como enlaces
export function TextoLore({ texto, nombres, mid, vacio = "Todavía no hay nada escrito." }) {
  const parrafos = String(texto || "").split(/\n{2,}|\n/).filter((p) => p.trim());
  if (!parrafos.length) return <div className="lore"><p className="vacio">{vacio}</p></div>;
  return (
    <div className="lore">
      {parrafos.map((p, i) => {
        const partes = []; let ultimo = 0;
        for (const m of p.matchAll(RE_MENCION)) {
          const nombre = m[1] || m[2], f = nombres?.get(normal(nombre));
          partes.push(p.slice(ultimo, m.index));
          partes.push(f
            ? <Link key={m.index} className="mencion" to={`/m/${mid}/f/${f.id}`}>{nombre}</Link>
            : <span key={m.index} className="mencion-rota" title="Todavía no existe una ficha con ese nombre">{nombre}</span>);
          ultimo = m.index + m[0].length;
        }
        partes.push(p.slice(ultimo));
        return <p key={i}>{partes}</p>;
      })}
    </div>
  );
}

// Buscador de fichas del mundo (para elegir a quién apunta un campo, una relación, un pin…)
export function BuscarFicha({ mid, alElegir, tipo = null, placeholder = "Buscar una ficha…", excluir = null, autoFocus = false }) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marca, setMarca] = useState(0);
  const mundo = useLiveQuery(() => db.mundos.get(mid), [mid]);
  const todas = useLiveQuery(() => db.fichas.where("mundoId").equals(mid).toArray(), [mid]) || [];
  const lista = useMemo(() => {
    const n = normal(q);
    return todas
      .filter((f) => (!tipo || f.tipo === tipo) && f.id !== excluir && (!n || normal(f.nombre).includes(n)))
      .sort((a, b) => (normal(a.nombre).startsWith(n) ? -1 : 0) - (normal(b.nombre).startsWith(n) ? -1 : 0) || a.nombre.localeCompare(b.nombre))
      .slice(0, 30);
  }, [q, todas, tipo, excluir]);
  const cat = (t) => mundo?.categorias.find((c) => c.clave === t);
  const elegir = (f) => { alElegir(f); setQ(""); setAbierto(false); };
  return (
    <div className="buscador">
      <input type="search" value={q} placeholder={placeholder} autoFocus={autoFocus}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); setMarca(0); }} onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setMarca((m) => Math.min(m + 1, lista.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setMarca((m) => Math.max(m - 1, 0)); }
          if (e.key === "Enter" && lista[marca]) { e.preventDefault(); elegir(lista[marca]); }
        }} />
      {abierto && lista.length > 0 && (
        <div className="resultados">
          {lista.map((f, i) => (
            <button type="button" key={f.id} className={i === marca ? "marcado" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(f)}>
              <span style={{ color: cat(f.tipo)?.color }}>{cat(f.tipo)?.icono || "•"}</span> {f.nombre}
              <span className="tipo">{cat(f.tipo)?.uno || f.tipo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Elegir un archivo de imagen
export function ElegirImagen({ alElegir, children = "Subir imagen", className = "btn" }) {
  const ref = useRef(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>{children}</button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const a = e.target.files?.[0]; if (a) alElegir(a); e.target.value = ""; }} />
    </>
  );
}

export const fechaCorta = (t) => new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
