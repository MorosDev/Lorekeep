// src/vistas/Cronologia.jsx — la historia del mundo: eras y acontecimientos en orden, enlazados a sus fichas.
// Las fechas son números (pueden ser negativos: antes de algo). El "sufijo" del calendario se pone al mostrarlas (806 d.S.).
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, nuevoId, tocarMundo } from "../db";
import { Ventana, BuscarFicha, TextoLore } from "../componentes/util.jsx";

const fechaDe = (n, mundo) => `${Number(n).toLocaleString("es-MX")}${mundo.calendario?.sufijo ? " " + mundo.calendario.sufijo : ""}`;

function EditarEvento({ evento, mundo, fichas, alCerrar }) {
  const [e, setE] = useState(evento || { titulo: "", fecha: 0, texto: "", fichas: [] });
  const pon = (k, v) => setE((x) => ({ ...x, [k]: v }));
  const guardar = async (ev) => {
    ev.preventDefault();
    const datos = { ...e, fecha: Number(e.fecha) || 0, titulo: e.titulo.trim() || "Sin título" };
    if (evento) await db.eventos.put(datos);
    else await db.eventos.add({ ...datos, id: nuevoId(), mundoId: mundo.id });
    await tocarMundo(mundo.id);
    alCerrar();
  };
  return (
    <Ventana titulo={evento ? "Editar acontecimiento" : "Nuevo acontecimiento"} alCerrar={alCerrar}>
      <form onSubmit={guardar} style={{ display: "grid", gap: 14 }}>
        <label className="campo"><span>Qué pasó</span><input type="text" id="ev-titulo" value={e.titulo} onChange={(x) => pon("titulo", x.target.value)} placeholder="Ej. La Caída del Velo" autoFocus required /></label>
        <label className="campo"><span>Año {mundo.calendario?.sufijo ? `(${mundo.calendario.sufijo})` : ""}</span>
          <input type="number" id="ev-fecha" value={e.fecha} onChange={(x) => pon("fecha", x.target.value)} />
          <span className="ayuda">Usa números negativos para lo que pasó antes del año 0 de tu calendario.</span>
        </label>
        <label className="campo"><span>Detalle (opcional)</span><textarea id="ev-texto" rows={4} value={e.texto} onChange={(x) => pon("texto", x.target.value)} placeholder="Puedes mencionar fichas con @Nombre" /></label>
        <div className="campo"><span>Quién o qué participó</span>
          {e.fichas.length > 0 && <div className="chips">{e.fichas.map((id) => { const f = fichas.find((x) => x.id === id); return f ? (
            <span key={id} className="chip">{f.nombre}<button type="button" className="btn solo" style={{ padding: "0 6px", border: 0, background: "none" }} onClick={() => pon("fichas", e.fichas.filter((y) => y !== id))} aria-label={`Quitar ${f.nombre}`}>×</button></span>) : null; })}</div>}
          <BuscarFicha mid={mundo.id} placeholder="Agregar una ficha…" alElegir={(f) => !e.fichas.includes(f.id) && pon("fichas", [...e.fichas, f.id])} />
        </div>
        <div className="botones">
          {evento && <button type="button" className="btn peligro" style={{ marginRight: "auto" }} onClick={async () => { await db.eventos.delete(evento.id); alCerrar(); }}>Borrar</button>}
          <button type="button" className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro">Guardar</button>
        </div>
      </form>
    </Ventana>
  );
}

function EditarEras({ mundo, alCerrar }) {
  const [eras, setEras] = useState(mundo.eras || []);
  const [sufijo, setSufijo] = useState(mundo.calendario?.sufijo || "");
  const cambiar = (i, k, v) => setEras((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const guardar = async () => {
    const limpias = eras.filter((x) => x.nombre.trim()).map((x) => ({ ...x, desde: Number(x.desde) || 0 })).sort((a, b) => a.desde - b.desde);
    await db.mundos.update(mundo.id, { eras: limpias, calendario: { ...(mundo.calendario || {}), sufijo: sufijo.trim() }, editado: Date.now() });
    alCerrar();
  };
  return (
    <Ventana titulo="Calendario y eras" alCerrar={alCerrar}>
      <label className="campo"><span>Cómo se escriben los años (opcional)</span><input type="text" id="sufijo" value={sufijo} onChange={(e) => setSufijo(e.target.value)} placeholder="Ej. d.S. (después del Sundering), AC, de la Era Angélica" /></label>
      <div className="campo"><span>Eras: cada una empieza en un año y dura hasta que empieza la siguiente</span>
        {eras.map((x, i) => (
          <div key={x.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 44px auto", gap: 6 }}>
            <input type="text" id={`era-n-${i}`} aria-label="Nombre de la era" value={x.nombre} placeholder="Nombre" onChange={(e) => cambiar(i, "nombre", e.target.value)} />
            <input type="number" id={`era-d-${i}`} aria-label="Año en que empieza" value={x.desde} onChange={(e) => cambiar(i, "desde", e.target.value)} />
            <input type="color" id={`era-c-${i}`} aria-label="Color" value={x.color} onChange={(e) => cambiar(i, "color", e.target.value)} style={{ padding: 2, background: "var(--fondo)", border: "1px solid var(--raya)", borderRadius: 8, height: 40, width: 44 }} />
            <button type="button" className="btn solo" onClick={() => setEras((l) => l.filter((_, j) => j !== i))} aria-label="Quitar era">×</button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setEras((l) => [...l, { id: nuevoId(), nombre: "", desde: (l.at(-1)?.desde ?? 0) + 100, color: "#d6b26e" }])}>＋ Era</button>
      </div>
      <div className="botones"><button className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro" onClick={guardar}>Guardar</button></div>
    </Ventana>
  );
}

export default function Cronologia() {
  const { mundo, fichas, nombres, mid } = useOutletContext();
  const eventos = useLiveQuery(() => db.eventos.where("mundoId").equals(mid).sortBy("fecha"), [mid]);
  const [editando, setEditando] = useState(null); // null | "nuevo" | evento
  const [eras, setEras] = useState(false);
  const { hash } = useLocation();
  useEffect(() => { if (hash && eventos) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "center" }); }, [hash, eventos]);

  // Mete el título de cada era justo antes de su primer acontecimiento
  const filas = useMemo(() => {
    const out = [], lista = mundo.eras || [];
    let actual = null;
    for (const e of eventos || []) {
      const era = [...lista].reverse().find((x) => e.fecha >= x.desde) || null;
      if (era && era.id !== actual?.id) out.push({ tipo: "era", era });
      actual = era;
      out.push({ tipo: "evento", e });
    }
    return out;
  }, [eventos, mundo.eras]);

  return (
    <>
      <div className="cabeza">
        <div><div className="eyebrow">Historia</div><h1>Cronología</h1></div>
        <div className="acciones">
          <button className="btn" onClick={() => setEras(true)}>⧗ Calendario y eras</button>
          <button className="btn oro" onClick={() => setEditando("nuevo")}>＋ Acontecimiento</button>
        </div>
      </div>
      {eventos && !eventos.length ? (
        <div className="vacio-grande"><div className="simbolo">⧗</div>
          <div>La historia de {mundo.nombre} está en blanco. Agrega el primer acontecimiento: una fundación, una guerra, un nacimiento.</div>
          <button className="btn oro" onClick={() => setEditando("nuevo")}>＋ Acontecimiento</button></div>
      ) : (
        <div className="linea">
          {filas.map((x) => x.tipo === "era"
            ? <div key={"era" + x.era.id} className="era" style={{ color: x.era.color }}>{x.era.nombre}</div>
            : (
              <article key={x.e.id} id={x.e.id} className="evento">
                <div className="fecha">{fechaDe(x.e.fecha, mundo)}</div>
                <h3>{x.e.titulo}</h3>
                {x.e.texto && <TextoLore texto={x.e.texto} nombres={nombres} mid={mid} />}
                {(x.e.fichas || []).length > 0 && <div className="chips">{x.e.fichas.map((id) => { const f = fichas.find((y) => y.id === id); return f ? <Link key={id} className="chip" to={`/m/${mid}/f/${id}`}>{f.nombre}</Link> : null; })}</div>}
                <div><button className="btn" style={{ padding: "4px 12px", fontSize: 13 }} onClick={() => setEditando(x.e)}>Editar</button></div>
              </article>
            ))}
        </div>
      )}
      {editando && <EditarEvento evento={editando === "nuevo" ? null : editando} mundo={mundo} fichas={fichas} alCerrar={() => setEditando(null)} />}
      {eras && <EditarEras mundo={mundo} alCerrar={() => setEras(false)} />}
    </>
  );
}
