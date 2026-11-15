// src/vistas/Compendio.jsx — la portada del mundo: una tarjeta por categoría + lo último que editaste
import React, { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useImagen, Retrato, BuscarFicha } from "../componentes/util.jsx";
import { NuevaFicha } from "./Categoria.jsx";

function TarjetaCategoria({ c, fichas, mid }) {
  // De fondo, la imagen de la ficha más reciente de esa categoría que tenga una
  const conImagen = fichas.filter((f) => f.tipo === c.clave && f.imagen).sort((a, b) => b.editado - a.editado)[0];
  const url = useImagen(conImagen?.imagen);
  const n = fichas.filter((f) => f.tipo === c.clave).length;
  return (
    <Link to={`/m/${mid}/c/${c.clave}`} className="tarjeta">
      {url && <div className="fondo" style={{ backgroundImage: `url(${url})` }} />}
      <div className="dentro">
        <div className="titulo"><span className="ico" style={{ color: c.color }}>{c.icono}</span>{c.nombre.toUpperCase()}</div>
        <div className="meta" style={{ color: n ? c.color : undefined }}>{n} {n === 1 ? "ficha" : "fichas"}</div>
      </div>
    </Link>
  );
}

export default function Compendio() {
  const { mundo, fichas, mid } = useOutletContext();
  const [nueva, setNueva] = useState(false);
  const ir = useNavigate();
  const recientes = [...fichas].sort((a, b) => b.editado - a.editado).slice(0, 6);
  const cat = (t) => mundo.categorias.find((c) => c.clave === t);
  return (
    <>
      <div className="cabeza">
        <div>
          <div className="eyebrow">Compendio</div>
          <h1>{mundo.nombre}</h1>
          {mundo.lema && <div className="sub">{mundo.lema}</div>}
        </div>
        <div className="acciones"><button className="btn oro" onClick={() => setNueva(true)}>＋ Nueva ficha</button></div>
      </div>
      <div style={{ maxWidth: 520, marginBottom: 22 }}>
        <BuscarFicha mid={mid} placeholder="Buscar en todo el mundo…" alElegir={(f) => ir(`/m/${mid}/f/${f.id}`)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 26 }}>
        <div className="rejilla">{mundo.categorias.map((c) => <TarjetaCategoria key={c.clave} c={c} fichas={fichas} mid={mid} />)}</div>
        {recientes.length > 0 && (
          <section>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Lo último que tocaste</div>
            <div className="rejilla chica">
              {recientes.map((f) => (
                <Link key={f.id} to={`/m/${mid}/f/${f.id}`} className="tarjeta ficha-mini">
                  <Retrato id={f.imagen} icono={cat(f.tipo)?.icono} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nombre}</div>
                    <div className="meta" style={{ color: cat(f.tipo)?.color }}>{cat(f.tipo)?.uno || f.tipo}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      {nueva && <NuevaFicha mundo={mundo} alCerrar={() => setNueva(false)} />}
    </>
  );
}
