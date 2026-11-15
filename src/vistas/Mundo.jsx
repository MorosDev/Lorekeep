// src/vistas/Mundo.jsx — el armazón de un mundo: barra lateral + la vista elegida
import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { nombresDe } from "../componentes/util.jsx";

export default function Mundo() {
  const { mid } = useParams();
  const mundo = useLiveQuery(() => db.mundos.get(mid), [mid]);
  const fichas = useLiveQuery(() => db.fichas.where("mundoId").equals(mid).toArray(), [mid]);
  const [abierta, setAbierta] = useState(false);
  const lugar = useLocation();
  useEffect(() => setAbierta(false), [lugar.pathname]);
  const nombres = useMemo(() => nombresDe(fichas), [fichas]);
  const cuenta = useMemo(() => { const c = {}; for (const f of fichas || []) c[f.tipo] = (c[f.tipo] || 0) + 1; return c; }, [fichas]);

  if (mundo === undefined || fichas === undefined) return null;
  if (!mundo) return <div className="contenido"><p>Ese mundo no existe (¿lo borraste?). <Link to="/">Volver a tus mundos</Link></p></div>;

  // Las categorías se agrupan como en la barra de las referencias: Gente, Lugares, Sociedad, Cosas, Escritura
  const grupos = [];
  for (const c of mundo.categorias) { let g = grupos.find((x) => x.nombre === c.grupo); if (!g) grupos.push(g = { nombre: c.grupo || "Otros", cats: [] }); g.cats.push(c); }
  const it = (to, ico, texto, extra = null, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => "item" + (isActive ? " activo" : "")}><span className="ico" aria-hidden="true">{ico}</span>{texto}{extra}</NavLink>
  );

  return (
    <div className="armazon">
      <nav className={"lateral" + (abierta ? " abierta" : "")} aria-label="Secciones del mundo">
        <Link to="/" className="marca">Lorekeep</Link>
        <div className="mundo-nombre">{mundo.nombre}</div>
        {it(`/m/${mid}`, "◈", "Compendio", null, true)}
        {it(`/m/${mid}/relaciones`, "⟁", "Relaciones")}
        {it(`/m/${mid}/cronologia`, "⧗", "Cronología")}
        {it(`/m/${mid}/mapas`, "⌖", "Mapas")}
        {grupos.map((g) => (
          <React.Fragment key={g.nombre}>
            <div className="grupo">{g.nombre}</div>
            {g.cats.map((c) => it(`/m/${mid}/c/${c.clave}`, <span style={{ color: c.color }}>{c.icono}</span>, c.nombre, <span className="cuenta">{cuenta[c.clave] || ""}</span>))}
          </React.Fragment>
        ))}
        <div className="pie">
          {it(`/m/${mid}/ajustes`, "⚙", "Ajustes del mundo")}
          <Link to="/" className="item"><span className="ico">←</span>Todos los mundos</Link>
        </div>
      </nav>
      <main className="contenido">
        <button className="btn solo boton-menu" style={{ marginBottom: 12 }} onClick={() => setAbierta(true)} aria-label="Abrir menú">☰ {mundo.nombre}</button>
        <div className="ancho"><Outlet context={{ mundo, fichas, nombres, mid }} /></div>
      </main>
    </div>
  );
}
