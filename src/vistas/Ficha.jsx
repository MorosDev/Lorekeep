// src/vistas/Ficha.jsx — ver una ficha: lore a la izquierda, imagen y datos a la derecha,
// y abajo listas, pestañas, relaciones y dónde la mencionan.
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, borrarFicha, nuevoId, tocarMundo } from "../db";
import { plantillaDe, RELACIONES_SUGERIDAS } from "../plantillas";
import { useImagen, TextoLore, Ventana, BuscarFicha, mencionesDe, Retrato } from "../componentes/util.jsx";

// Valor de un dato: texto o enlace a otra ficha
export function ValorDato({ v, fichas, mid }) {
  if (v && typeof v === "object" && v.ref) {
    const f = fichas.find((x) => x.id === v.ref);
    return f ? <Link to={`/m/${mid}/f/${f.id}`}>{f.nombre}</Link> : <span className="ayuda">(ficha borrada)</span>;
  }
  return <>{String(v)}</>;
}

function NuevaRelacion({ ficha, mid, alCerrar }) {
  const [otra, setOtra] = useState(null);
  const [tipo, setTipo] = useState("");
  const [nota, setNota] = useState("");
  const guardar = async (e) => {
    e.preventDefault();
    if (!otra) return;
    await db.relaciones.add({ id: nuevoId(), mundoId: mid, de: ficha.id, a: otra.id, tipo: tipo.trim() || "relacionado con", nota: nota.trim() });
    await tocarMundo(mid);
    alCerrar();
  };
  return (
    <Ventana titulo={`Relacionar a ${ficha.nombre}`} alCerrar={alCerrar}>
      <form onSubmit={guardar} style={{ display: "grid", gap: 14 }}>
        <div className="campo"><span>{ficha.nombre} es…</span>
          <input type="text" id="tipo-rel" list="relaciones-sugeridas" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ej. hermana de, rival de, vive en…" autoFocus />
          <datalist id="relaciones-sugeridas">{RELACIONES_SUGERIDAS.map((r) => <option key={r} value={r} />)}</datalist>
        </div>
        <div className="campo"><span>…de quién / de qué</span>
          {otra ? <div className="chips"><span className="chip">{otra.nombre} <button type="button" className="btn solo" style={{ padding: "0 6px", border: 0 }} onClick={() => setOtra(null)} aria-label="Quitar">×</button></span></div>
            : <BuscarFicha mid={mid} excluir={ficha.id} alElegir={setOtra} />}
        </div>
        <label className="campo"><span>Nota (opcional)</span><input type="text" id="nota-rel" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. desde la Guerra del Velo" /></label>
        <div className="botones"><button type="button" className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro" disabled={!otra}>Guardar relación</button></div>
      </form>
    </Ventana>
  );
}

export default function Ficha() {
  const { mundo, fichas, nombres, mid } = useOutletContext();
  const { fid } = useParams();
  const ir = useNavigate();
  const f = fichas.find((x) => x.id === fid);
  const url = useImagen(f?.imagen);
  const relaciones = useLiveQuery(() => db.relaciones.where("mundoId").equals(mid).toArray(), [mid]) || [];
  const eventos = useLiveQuery(() => db.eventos.where("mundoId").equals(mid).toArray(), [mid]) || [];
  const [pestana, setPestana] = useState(0);
  const [relacionando, setRelacionando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  // Fichas cuyo texto menciona a esta (@Nombre)
  const mencionadoEn = useMemo(() => {
    if (!f) return [];
    return fichas.filter((o) => o.id !== f.id && mencionesDe([o.resumen, ...Object.values(o.secciones || {})].join("\n"), nombres).has(f.id));
  }, [fichas, f, nombres]);

  if (!f) return <p>Esa ficha no existe. <Link to={`/m/${mid}`}>Volver al compendio</Link></p>;
  const c = mundo.categorias.find((x) => x.clave === f.tipo) || { uno: f.tipo, icono: "•", color: "var(--oro)" };
  const P = plantillaDe(f.tipo);
  const datos = [...P.datos.filter((d) => f.datos?.[d.clave]).map((d) => [d.nombre, f.datos[d.clave]]), ...(f.extras || []).filter((x) => x.nombre && x.valor).map((x) => [x.nombre, x.valor])];
  const secciones = P.secciones.filter((s) => f.secciones?.[s]?.trim());
  const listas = P.listas.map(([k, n]) => [n, (f.listas?.[k] || []).filter((x) => x.trim())]);
  const rels = relaciones.filter((r) => r.de === f.id || r.a === f.id).map((r) => ({ ...r, otra: fichas.find((x) => x.id === (r.de === f.id ? r.a : r.de)), sale: r.de === f.id })).filter((r) => r.otra);
  const susEventos = eventos.filter((e) => (e.fichas || []).includes(f.id)).sort((a, b) => a.fecha - b.fecha);

  return (
    <>
      <div className="cabeza">
        <button className="btn solo" onClick={() => ir(-1)} aria-label="Atrás">←</button>
        <div style={{ borderLeft: `3px solid ${c.color}`, paddingLeft: 12 }}>
          <h1>{f.nombre}</h1>
          <Link to={`/m/${mid}/c/${f.tipo}`} className="sub" style={{ color: c.color }}>{c.icono} {c.uno}</Link>
        </div>
        <div className="acciones">
          <Link className="btn oro" to={`/m/${mid}/f/${f.id}/editar`}>✎ Editar</Link>
          <button className="btn" onClick={() => setRelacionando(true)}>⟁ Relacionar</button>
          <Link className="btn" to={`/m/${mid}/arbol/${f.id}`}>⚭ Árbol</Link>
          <button className="btn peligro solo" onClick={() => setBorrando(true)} aria-label="Borrar ficha" title="Borrar ficha">🗑</button>
        </div>
      </div>

      <div className="ficha">
        <div><TextoLore texto={f.resumen} nombres={nombres} mid={mid} vacio="Sin descripción todavía. Toca Editar para escribirla." />
          {(f.etiquetas || []).length > 0 && <div className="chips" style={{ marginTop: 16 }}>{f.etiquetas.map((e) => <span key={e} className="chip">#{e}</span>)}</div>}
        </div>
        <aside className="costado">
          <div className="imagen">{url ? <img src={url} alt={f.nombre} /> : <span style={{ color: c.color }}>{c.icono}</span>}</div>
          {datos.length > 0 && (
            <dl className="datos">
              {datos.map(([n, v]) => <React.Fragment key={n}><dt>{n}</dt><dd><ValorDato v={v} fichas={fichas} mid={mid} /></dd></React.Fragment>)}
            </dl>
          )}
        </aside>
      </div>

      {listas.some(([, l]) => l.length) && (
        <div className="bloque listas">
          {listas.map(([n, l]) => (
            <div key={n}><h3>{n}</h3>{l.length ? <ul>{l.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="ayuda" style={{ fontStyle: "italic" }}>Nada todavía.</div>}</div>
          ))}
        </div>
      )}

      {secciones.length > 0 && (
        <section className="bloque">
          <h2>Sobre {f.nombre}</h2>
          <div className="pestanas" role="tablist">
            {secciones.map((s, i) => <button key={s} role="tab" aria-selected={i === Math.min(pestana, secciones.length - 1)} onClick={() => setPestana(i)}>{s}</button>)}
          </div>
          <TextoLore texto={f.secciones[secciones[Math.min(pestana, secciones.length - 1)]]} nombres={nombres} mid={mid} />
        </section>
      )}

      <section className="bloque">
        <h2>Relaciones</h2>
        {rels.length ? (
          <div className="chips">
            {rels.map((r) => (
              <Link key={r.id} to={`/m/${mid}/f/${r.otra.id}`} className="chip" title={r.nota || undefined}>
                <Retrato id={r.otra.imagen} icono={mundo.categorias.find((x) => x.clave === r.otra.tipo)?.icono} tam={22} />
                {/* "hermana de Kael" si sale de esta ficha; "Kael · mentor de esta ficha" si llega */}
                {r.sale ? <span><span className="tipo-rel">{r.tipo}</span> {r.otra.nombre}</span>
                  : <span>{r.otra.nombre} <span className="tipo-rel">· {r.tipo} {f.nombre}</span></span>}
              </Link>
            ))}
          </div>
        ) : <p className="ayuda">Sin relaciones. Toca <b>⟁ Relacionar</b> para conectarla con otra ficha, o menciónala con @ en algún texto.</p>}
      </section>

      {(mencionadoEn.length > 0 || susEventos.length > 0) && (
        <section className="bloque">
          <h2>Aparece en</h2>
          <div className="chips">
            {mencionadoEn.map((o) => <Link key={o.id} to={`/m/${mid}/f/${o.id}`} className="chip">✎ {o.nombre}</Link>)}
            {susEventos.map((e) => <Link key={e.id} to={`/m/${mid}/cronologia#${e.id}`} className="chip">⧗ {e.titulo} <span className="tipo-rel">{e.fecha}</span></Link>)}
          </div>
        </section>
      )}

      {relacionando && <NuevaRelacion ficha={f} mid={mid} alCerrar={() => setRelacionando(false)} />}
      {borrando && (
        <Ventana titulo={`¿Borrar ${f.nombre}?`} alCerrar={() => setBorrando(false)}>
          <p style={{ margin: 0 }}>Se borra la ficha y sus relaciones. Las menciones en otros textos se quedan, pero ya no llevan a ningún lado. No se puede deshacer.</p>
          <div className="botones"><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn peligro" onClick={async () => { await borrarFicha(f); ir(`/m/${mid}/c/${f.tipo}`, { replace: true }); }}>Borrar para siempre</button></div>
        </Ventana>
      )}
    </>
  );
}
