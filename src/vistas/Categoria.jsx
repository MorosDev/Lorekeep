// src/vistas/Categoria.jsx — todas las fichas de un tipo (personajes, lugares…)
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { crearFicha } from "../db";
import { Retrato, Ventana, normal } from "../componentes/util.jsx";

export function NuevaFicha({ mundo, tipo = null, alCerrar }) {
  const [t, setT] = useState(tipo || mundo.categorias[0]?.clave);
  const [nombre, setNombre] = useState("");
  const ir = useNavigate();
  const crear = async (e) => {
    e.preventDefault();
    const f = await crearFicha(mundo.id, t, nombre);
    ir(`/m/${mundo.id}/f/${f.id}/editar`);
  };
  return (
    <Ventana titulo="Nueva ficha" alCerrar={alCerrar}>
      <form onSubmit={crear} style={{ display: "grid", gap: 14 }}>
        <label className="campo"><span>Nombre</span><input type="text" id="nombre-ficha" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Evelynn, Ciudad de Ceniza, La Orden del Velo…" autoFocus required /></label>
        <label className="campo"><span>Tipo</span>
          <select id="tipo-ficha" value={t} onChange={(e) => setT(e.target.value)}>
            {mundo.categorias.map((c) => <option key={c.clave} value={c.clave}>{c.icono} {c.uno}</option>)}
          </select>
        </label>
        <div className="botones"><button type="button" className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro">Crear y editar</button></div>
      </form>
    </Ventana>
  );
}

export default function Categoria() {
  const { mundo, fichas, mid } = useOutletContext();
  const { tipo } = useParams();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState("nombre");
  const [nueva, setNueva] = useState(false);
  const c = mundo.categorias.find((x) => x.clave === tipo);
  const lista = useMemo(() => {
    const n = normal(q);
    return fichas.filter((f) => f.tipo === tipo && (!n || normal(f.nombre + " " + f.resumen + " " + (f.etiquetas || []).join(" ")).includes(n)))
      .sort((a, b) => (orden === "nombre" ? a.nombre.localeCompare(b.nombre) : b.editado - a.editado));
  }, [fichas, tipo, q, orden]);
  if (!c) return <p>Esta categoría ya no existe. <Link to={`/m/${mid}`}>Volver al compendio</Link></p>;
  return (
    <>
      <div className="cabeza">
        <div>
          <div className="eyebrow" style={{ color: c.color }}>{c.icono} {c.grupo}</div>
          <h1>{c.nombre}</h1>
        </div>
        <div className="acciones"><button className="btn oro" onClick={() => setNueva(true)}>＋ {c.uno}</button></div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <input type="search" id="filtro" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar en ${c.nombre.toLowerCase()}…`} style={{ maxWidth: 360 }} />
        <select id="orden" value={orden} onChange={(e) => setOrden(e.target.value)} style={{ width: "auto" }}>
          <option value="nombre">Por nombre</option><option value="reciente">Lo más reciente</option>
        </select>
      </div>
      {lista.length ? (
        <div className="rejilla">
          {lista.map((f) => (
            <Link key={f.id} to={`/m/${mid}/f/${f.id}`} className="tarjeta ficha-mini" style={{ gridTemplateColumns: "72px minmax(0,1fr)" }}>
              <Retrato id={f.imagen} icono={c.icono} grande />
              <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                <div style={{ font: "600 16px var(--f-titulo)" }}>{f.nombre}</div>
                {f.resumen ? <div className="resumen">{f.resumen.replace(/@\[([^\]]+)\]|@/g, "$1")}</div> : <div className="meta">Sin descripción</div>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="vacio-grande">
          <div className="simbolo" style={{ color: c.color }}>{c.icono}</div>
          <div>{q ? "Nada coincide con esa búsqueda." : `Todavía no hay ${c.nombre.toLowerCase()} en ${mundo.nombre}.`}</div>
          {!q && <button className="btn oro" onClick={() => setNueva(true)}>＋ Crear {c.uno.toLowerCase()}</button>}
        </div>
      )}
      {nueva && <NuevaFicha mundo={mundo} tipo={tipo} alCerrar={() => setNueva(false)} />}
    </>
  );
}
