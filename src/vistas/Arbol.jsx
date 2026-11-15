// src/vistas/Arbol.jsx — el árbol genealógico de una ficha (normalmente un personaje).
// Tocar a alguien lo vuelve el centro del árbol; desde el centro se agregan padres, hijos, parejas y hermanos.
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, nuevoId, tocarMundo, crearFicha } from "../db";
import { grafoFamilia, armarArbol, cuantosFamiliares, TARJETA } from "../familia";
import { Retrato, Ventana, BuscarFicha } from "../componentes/util.jsx";

// Qué guardar según lo que agregas desde el centro (siempre con los nombres de FAMILIA en plantillas.js)
const AGREGAR = {
  padre: { titulo: "Agregar padre o madre", rel: (nuevo, raiz) => ({ de: nuevo, a: raiz, tipo: "padre / madre de" }) },
  hijo: { titulo: "Agregar hijo o hija", rel: (nuevo, raiz) => ({ de: raiz, a: nuevo, tipo: "padre / madre de" }) },
  pareja: { titulo: "Agregar pareja", rel: (nuevo, raiz) => ({ de: raiz, a: nuevo, tipo: "pareja de" }) },
  hermano: { titulo: "Agregar hermano o hermana", rel: (nuevo, raiz) => ({ de: raiz, a: nuevo, tipo: "hermano / hermana de" }) },
};

function AgregarFamiliar({ que, raiz, mid, alCerrar }) {
  const [nombre, setNombre] = useState("");
  const guardar = async (ficha) => {
    await db.relaciones.add({ id: nuevoId(), mundoId: mid, nota: "", ...AGREGAR[que].rel(ficha.id, raiz.id) });
    await tocarMundo(mid);
    alCerrar();
  };
  return (
    <Ventana titulo={AGREGAR[que].titulo} alCerrar={alCerrar}>
      <div className="campo"><span>Alguien que ya existe</span><BuscarFicha mid={mid} excluir={raiz.id} autoFocus alElegir={guardar} /></div>
      <form className="campo" onSubmit={async (e) => { e.preventDefault(); if (nombre.trim()) guardar(await crearFicha(mid, raiz.tipo, nombre)); }}>
        <span>…o crea un personaje nuevo</span>
        <div style={{ display: "flex", gap: 8 }}><input type="text" id="familiar-nuevo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /><button className="btn oro" disabled={!nombre.trim()}>Crear</button></div>
      </form>
      <div className="botones"><button className="btn" onClick={alCerrar}>Cancelar</button></div>
    </Ventana>
  );
}

// Elegir de quién ver el árbol (cuando se entra sin nadie elegido)
function Elegir({ fichas, G, mid, mundo }) {
  const ir = useNavigate();
  const conFamilia = fichas.filter((f) => cuantosFamiliares(G, f.id) > 0).sort((a, b) => cuantosFamiliares(G, b.id) - cuantosFamiliares(G, a.id));
  const cat = (t) => mundo.categorias.find((c) => c.clave === t);
  return (
    <>
      <div style={{ maxWidth: 480, marginBottom: 20 }}><BuscarFicha mid={mid} placeholder="¿De quién quieres ver el árbol?" alElegir={(f) => ir(`/m/${mid}/arbol/${f.id}`)} /></div>
      {conFamilia.length ? (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Con familia registrada</div>
          <div className="rejilla chica">
            {conFamilia.map((f) => (
              <Link key={f.id} to={`/m/${mid}/arbol/${f.id}`} className="tarjeta ficha-mini">
                <Retrato id={f.imagen} icono={cat(f.tipo)?.icono} />
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{f.nombre}</div><div className="meta">{cuantosFamiliares(G, f.id)} familiares</div></div>
              </Link>
            ))}
          </div>
        </>
      ) : <div className="vacio-grande"><div className="simbolo">⚭</div><div>Nadie tiene familia todavía. Elige a alguien arriba y agrégale padres, hijos, pareja o hermanos.</div></div>}
    </>
  );
}

export default function Arbol() {
  const { mundo, fichas, mid } = useOutletContext();
  const { fid } = useParams();
  const relaciones = useLiveQuery(() => db.relaciones.where("mundoId").equals(mid).toArray(), [mid]);
  const [agregando, setAgregando] = useState(null);
  const [alcance, setAlcance] = useState(2);
  const ir = useNavigate();
  const G = useMemo(() => grafoFamilia(relaciones || []), [relaciones]);
  const existe = useMemo(() => new Set(fichas.map((f) => f.id)), [fichas]);
  const raiz = fichas.find((f) => f.id === fid);
  const arbol = useMemo(() => {
    if (!raiz || !relaciones) return null;
    // Solo fichas que siguen existiendo
    const Gv = { padres: (i) => G.padres(i).filter((y) => existe.has(y)), hijos: (i) => G.hijos(i).filter((y) => existe.has(y)), parejas: (i) => G.parejas(i).filter((y) => existe.has(y)), hermanos: (i) => G.hermanos(i).filter((y) => existe.has(y)) };
    return { ...armarArbol(raiz.id, Gv, { arriba: alcance, abajo: alcance }), Gv };
  }, [raiz, relaciones, G, existe, alcance]);

  if (relaciones === undefined) return null;
  const encabezado = (
    <div className="cabeza">
      <div><div className="eyebrow">Linajes</div><h1>{raiz ? `Familia de ${raiz.nombre}` : "Árbol genealógico"}</h1></div>
      {raiz && <div className="acciones">
        <Link className="btn" to={`/m/${mid}/f/${raiz.id}`}>Ver ficha</Link>
        <select id="alcance" aria-label="Generaciones" value={alcance} onChange={(e) => setAlcance(Number(e.target.value))} style={{ width: "auto" }}>
          <option value={1}>1 generación</option><option value={2}>2 generaciones</option><option value={3}>3 generaciones</option><option value={5}>5 generaciones</option>
        </select>
      </div>}
    </div>
  );
  if (!raiz) return <>{encabezado}<Elegir fichas={fichas} G={G} mid={mid} mundo={mundo} /></>;

  const { nodos, ancho, alto, Gv } = arbol;
  const pos = new Map(nodos.map((n) => [n.id, n]));
  const ficha = (id) => fichas.find((f) => f.id === id);
  const cat = (t) => mundo.categorias.find((c) => c.clave === t);
  const M = 24; // margen alrededor del dibujo
  const W = TARJETA.ancho, H = TARJETA.alto;

  // ── Líneas ──
  const lineas = [];
  const hecho = new Set();
  // Parejas: una línea doble entre las dos tarjetas
  for (const n of nodos) for (const p of Gv.parejas(n.id)) {
    const q = pos.get(p); const k = [n.id, p].sort().join("|");
    if (!q || hecho.has(k) || q.gen !== n.gen) continue; hecho.add(k);
    const [a, b] = n.x < q.x ? [n, q] : [q, n];
    const y = a.y + H / 2;
    lineas.push(<g key={"p" + k} className="arbol-pareja"><line x1={a.x + W} y1={y - 2} x2={b.x} y2={y - 2} /><line x1={a.x + W} y1={y + 2} x2={b.x} y2={y + 2} /></g>);
  }
  // Padres → hijos: si los dos padres son pareja, la línea baja desde el medio de los dos
  for (const n of nodos) {
    const padres = Gv.padres(n.id).filter((p) => pos.has(p));
    if (!padres.length) continue;
    const xs = padres.map((p) => pos.get(p).x + W / 2);
    const desde = { x: xs.reduce((a, b) => a + b) / xs.length, y: pos.get(padres[0]).y + (padres.length > 1 ? H / 2 : H) };
    const medio = n.y - TARJETA.piso / 2;
    lineas.push(<path key={"h" + n.id} className="arbol-linea" d={`M${desde.x},${desde.y} V${medio} H${n.x + W / 2} V${n.y}`} />);
  }
  // Hermanos sin padres en el árbol: un corchete punteado arriba de ellos
  for (const n of nodos) for (const h of Gv.hermanos(n.id)) {
    const q = pos.get(h); const k = [n.id, h].sort().join("|");
    if (!q || hecho.has(k) || q.gen !== n.gen || Gv.padres(n.id).some((p) => pos.has(p) && Gv.padres(h).includes(p))) continue; hecho.add(k);
    const y = n.y - 14;
    lineas.push(<path key={"s" + k} className="arbol-hermanos" d={`M${n.x + W / 2},${n.y} V${y} H${q.x + W / 2} V${q.y}`} />);
  }

  return (
    <>
      {encabezado}
      <div className="chips" style={{ marginBottom: 12 }}>
        {Object.entries({ padre: "＋ Padre o madre", pareja: "＋ Pareja", hermano: "＋ Hermano/a", hijo: "＋ Hijo/a" }).map(([k, t]) => (
          <button key={k} className="btn" onClick={() => setAgregando(k)}>{t}</button>
        ))}
      </div>
      <div className="lienzo-arbol">
        <div style={{ position: "relative", width: ancho + M * 2, height: alto + M * 2 }}>
          <svg width={ancho + M * 2} height={alto + M * 2} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
            <g transform={`translate(${M},${M})`}>{lineas}</g>
          </svg>
          {nodos.map((n) => {
            const f = ficha(n.id); if (!f) return null;
            const c = cat(f.tipo), esRaiz = n.id === raiz.id;
            return (
              <button key={n.id} type="button" className={"arbol-tarjeta" + (esRaiz ? " raiz" : "")} style={{ left: n.x + M, top: n.y + M, width: W, height: H }}
                onClick={() => (esRaiz ? ir(`/m/${mid}/f/${f.id}`) : ir(`/m/${mid}/arbol/${f.id}`))}
                title={esRaiz ? "Abrir su ficha" : `Ver el árbol de ${f.nombre}`}>
                <Retrato id={f.imagen} icono={c?.icono} tam={40} />
                <span style={{ minWidth: 0 }}>
                  <span className="nombre">{f.nombre}</span>
                  <span className="meta">{f.datos?.estado === "Muerto" ? "✝ " : ""}{f.datos?.rol || c?.uno || ""}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="ayuda">Toca a alguien para volverlo el centro · toca el centro para abrir su ficha. El árbol sale de las relaciones de familia: lo que agregues aquí también aparece en la ficha.</p>
      {agregando && <AgregarFamiliar que={agregando} raiz={raiz} mid={mid} alCerrar={() => setAgregando(null)} />}
    </>
  );
}
