// src/vistas/Inicio.jsx — tus mundos
import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, crearMundo, importarMundo } from "../db";
import { Ventana, useImagen, useAviso, fechaCorta } from "../componentes/util.jsx";

function TarjetaMundo({ m }) {
  const url = useImagen(m.portada);
  const n = useLiveQuery(() => db.fichas.where("mundoId").equals(m.id).count(), [m.id]);
  return (
    <Link to={`/m/${m.id}`} className="tarjeta mundo-tarjeta">
      {url && <div className="fondo" style={{ backgroundImage: `url(${url})` }} />}
      <div className="dentro">
        <div className="titulo">{m.nombre}</div>
        {m.lema && <div className="resumen">{m.lema}</div>}
        <div className="meta">{n ?? "…"} fichas · editado {fechaCorta(m.editado)}</div>
      </div>
    </Link>
  );
}

export default function Inicio() {
  const mundos = useLiveQuery(() => db.mundos.orderBy("editado").reverse().toArray(), []);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState(""), [lema, setLema] = useState("");
  const ir = useNavigate();
  const archivo = useRef(null);
  const [avisar, aviso] = useAviso();

  const crear = async (e) => {
    e.preventDefault();
    const m = await crearMundo({ nombre, lema });
    ir(`/m/${m.id}`);
  };
  const importar = async (a) => {
    try { const id = await importarMundo(JSON.parse(await a.text())); avisar("Mundo importado"); ir(`/m/${id}`); }
    catch (err) { avisar(err.message || "No pude leer ese archivo."); }
  };

  return (
    <div className="contenido">
      <div className="ancho">
        <header className="portada-inicio">
          <div className="eyebrow">Lorekeep</div>
          <h1>Tus mundos</h1>
          <p>Personajes, lugares, facciones, eras y mapas. Todo lo que inventas, en un solo lugar y enlazado entre sí.</p>
        </header>
        <div className="cabeza">
          <div className="acciones" style={{ marginLeft: 0 }}>
            <button className="btn oro" onClick={() => setCreando(true)}>＋ Crear un mundo</button>
            <button className="btn" onClick={() => archivo.current?.click()}>Importar un mundo</button>
            <input ref={archivo} type="file" accept=".json,application/json" hidden onChange={(e) => { const a = e.target.files?.[0]; if (a) importar(a); e.target.value = ""; }} />
          </div>
        </div>
        {mundos === undefined ? null : mundos.length ? (
          <div className="rejilla">{mundos.map((m) => <TarjetaMundo key={m.id} m={m} />)}</div>
        ) : (
          <div className="vacio-grande">
            <div className="simbolo">❦</div>
            <div>Todavía no hay mundos. Crea el primero: ponle nombre y empieza por un personaje o un lugar.</div>
            <button className="btn oro" onClick={() => setCreando(true)}>＋ Crear un mundo</button>
          </div>
        )}
        <p className="ayuda" style={{ marginTop: 28 }}>Todo se guarda solo en este dispositivo. Para tener respaldo o pasarlo a otro aparato, entra al mundo → Ajustes → Exportar.</p>
      </div>
      {creando && (
        <Ventana titulo="Un mundo nuevo" alCerrar={() => setCreando(false)}>
          <form onSubmit={crear} style={{ display: "grid", gap: 14 }}>
            <label className="campo"><span>Nombre</span><input type="text" id="nombre-mundo" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. El Vacío" autoFocus required /></label>
            <label className="campo"><span>Una frase que lo describa (opcional)</span><input type="text" id="lema-mundo" value={lema} onChange={(e) => setLema(e.target.value)} placeholder="Ej. Lo que nadie guardó" /></label>
            <div className="botones"><button type="button" className="btn" onClick={() => setCreando(false)}>Cancelar</button><button className="btn oro">Crear</button></div>
          </form>
        </Ventana>
      )}
      {aviso}
    </div>
  );
}
