// src/componentes/PanelLugar.jsx — lo que se ve al tocar un lugar en el mapa (y en su ficha):
// quién está ahí, qué lugares tiene dentro y qué pasó ahí. Desde aquí se puede "mudar" a alguien al lugar.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, nuevoId, tocarMundo } from "../db";
import { queHayEn } from "../lugares";
import { Retrato, BuscarFicha, useImagen } from "./util.jsx";

// La lista "quién está aquí", agrupada por cómo (Origen, vive en, Sede…)
export function ListaAqui({ lugar, mundo, mid, alAbrir = null, compacto = false }) {
  const relaciones = useLiveQuery(() => db.relaciones.where("mundoId").equals(mid).toArray(), [mid]) || [];
  const eventos = useLiveQuery(() => db.eventos.where("mundoId").equals(mid).toArray(), [mid]) || [];
  const fichas = useLiveQuery(() => db.fichas.where("mundoId").equals(mid).toArray(), [mid]) || [];
  const [agregando, setAgregando] = useState(false);
  const { aqui, dentro, paso } = queHayEn(lugar, fichas, relaciones, eventos);
  const cat = (t) => mundo.categorias.find((c) => c.clave === t);
  const grupos = {};
  for (const x of aqui) (grupos[x.como] ||= []).push(x);
  const enlace = (f, extra = null) => (
    <Link key={f.id + (extra || "")} to={`/m/${mid}/f/${f.id}`} className="chip" onClick={alAbrir}>
      <Retrato id={f.imagen} icono={cat(f.tipo)?.icono} tam={22} /> {f.nombre}
    </Link>
  );
  const mudar = async (f) => {
    await db.relaciones.add({ id: nuevoId(), mundoId: mid, de: f.id, a: lugar.id, tipo: "vive en", nota: "" });
    await tocarMundo(mid);
    setAgregando(false);
  };
  return (
    <div className="lista-aqui">
      <div className="sub-aqui">Aquí</div>
      {aqui.length ? Object.entries(grupos).map(([como, l]) => (
        <div key={como}><div className="como">{como}</div><div className="chips">{l.map((x) => enlace(x.ficha, como))}</div></div>
      )) : <p className="ayuda" style={{ margin: 0 }}>Nadie todavía. Se llena solo con quien tenga este lugar como origen, sede o hábitat, o una relación como "vive en".</p>}
      {agregando
        ? <BuscarFicha mid={mid} excluir={lugar.id} autoFocus placeholder="¿Quién vive aquí?" alElegir={mudar} />
        : <div><button type="button" className="btn" style={{ padding: "4px 12px", fontSize: 13 }} onClick={() => setAgregando(true)}>＋ Alguien vive aquí</button></div>}
      {dentro.length > 0 && <><div className="sub-aqui">Dentro</div><div className="chips">{dentro.map((f) => enlace(f))}</div></>}
      {paso.length > 0 && !compacto && (
        <><div className="sub-aqui">Lo que pasó aquí</div>
          <div className="chips">{paso.map((e) => <Link key={e.id} to={`/m/${mid}/cronologia#${e.id}`} className="chip" onClick={alAbrir}>⧗ {e.titulo} <span className="tipo-rel">{e.fecha}</span></Link>)}</div></>
      )}
    </div>
  );
}

// El panel sobre el mapa
export default function PanelLugar({ ficha, etiqueta, mundo, mid, alCerrar, alQuitar }) {
  const url = useImagen(ficha?.imagen);
  const c = ficha && mundo.categorias.find((x) => x.clave === ficha.tipo);
  return (
    <aside className="panel-lugar" aria-label={`Lugar: ${ficha?.nombre || etiqueta}`}>
      <button type="button" className="btn solo cerrar" onClick={alCerrar} aria-label="Cerrar">×</button>
      {url && <img src={url} alt="" className="foto" />}
      <div className="eyebrow" style={{ color: c?.color }}>{c ? `${c.icono} ${ficha.datos?.tipoLugar || c.uno}` : "Marca"}</div>
      <h2>{ficha?.nombre || etiqueta}</h2>
      {ficha?.resumen && <p className="resumen-lugar">{ficha.resumen.replace(/@\[([^\]]+)\]|@/g, "$1").slice(0, 220)}{ficha.resumen.length > 220 ? "…" : ""}</p>}
      {ficha ? (
        <>
          <div className="chips"><Link className="btn oro" to={`/m/${mid}/f/${ficha.id}`}>Abrir ficha</Link><button type="button" className="btn peligro" onClick={alQuitar}>Quitar del mapa</button></div>
          <ListaAqui lugar={ficha} mundo={mundo} mid={mid} />
        </>
      ) : (
        <div className="chips"><p className="ayuda" style={{ margin: 0 }}>Esta marca no tiene ficha.</p><button type="button" className="btn peligro" onClick={alQuitar}>Quitar del mapa</button></div>
      )}
    </aside>
  );
}
