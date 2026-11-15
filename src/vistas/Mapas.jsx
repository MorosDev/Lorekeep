// src/vistas/Mapas.jsx — los mapas del mundo (un continente, una ciudad, un calabozo…)
import React, { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, guardarImagen, nuevoId, tocarMundo } from "../db";
import { Ventana, ElegirImagen, useImagen } from "../componentes/util.jsx";

function TarjetaMapa({ m, mid }) {
  const url = useImagen(m.imagen);
  return (
    <Link to={`/m/${mid}/mapas/${m.id}`} className="tarjeta mundo-tarjeta">
      {url && <div className="fondo" style={{ backgroundImage: `url(${url})`, opacity: 0.6 }} />}
      <div className="dentro"><div className="titulo">⌖ {m.nombre}</div><div className="meta">{m.pines.length} {m.pines.length === 1 ? "lugar marcado" : "lugares marcados"}</div></div>
    </Link>
  );
}

export default function Mapas() {
  const { mid } = useOutletContext();
  const mapas = useLiveQuery(() => db.mapas.where("mundoId").equals(mid).toArray(), [mid]);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const ir = useNavigate();

  const crear = async (e) => {
    e.preventDefault();
    if (!archivo) { setError("Elige la imagen del mapa."); return; }
    // Los mapas se guardan más grandes que las demás imágenes, para poder acercarse
    const imagen = await guardarImagen(mid, archivo, 4096);
    const blob = (await db.imagenes.get(imagen)).blob;
    const bmp = await createImageBitmap(blob);
    const m = { id: nuevoId(), mundoId: mid, nombre: nombre.trim() || "Mapa", imagen, ancho: bmp.width, alto: bmp.height, pines: [] };
    await db.mapas.add(m);
    await tocarMundo(mid);
    ir(`/m/${mid}/mapas/${m.id}`);
  };

  return (
    <>
      <div className="cabeza"><div><div className="eyebrow">Cartografía</div><h1>Mapas</h1></div>
        <div className="acciones"><button className="btn oro" onClick={() => setCreando(true)}>＋ Mapa</button></div></div>
      {mapas && !mapas.length ? (
        <div className="vacio-grande"><div className="simbolo">⌖</div>
          <div>Sube la imagen de un mapa (dibujado a mano, hecho en otra app o generado) y márcale lugares que lleven a sus fichas.</div>
          <button className="btn oro" onClick={() => setCreando(true)}>＋ Subir un mapa</button></div>
      ) : <div className="rejilla">{(mapas || []).map((m) => <TarjetaMapa key={m.id} m={m} mid={mid} />)}</div>}
      {creando && (
        <Ventana titulo="Nuevo mapa" alCerrar={() => setCreando(false)}>
          <form onSubmit={crear} style={{ display: "grid", gap: 14 }}>
            <label className="campo"><span>Nombre</span><input type="text" id="mapa-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. El continente de Aethermoor" autoFocus /></label>
            <div className="campo"><span>Imagen</span>
              <div className="chips"><ElegirImagen alElegir={(a) => { setArchivo(a); setError(""); }}>{archivo ? "Cambiar imagen" : "Elegir imagen"}</ElegirImagen>{archivo && <span className="ayuda" style={{ alignSelf: "center" }}>{archivo.name}</span>}</div>
              {error && <span className="ayuda" style={{ color: "var(--peligro)" }}>{error}</span>}
            </div>
            <div className="botones"><button type="button" className="btn" onClick={() => setCreando(false)}>Cancelar</button><button className="btn oro">Crear mapa</button></div>
          </form>
        </Ventana>
      )}
    </>
  );
}
