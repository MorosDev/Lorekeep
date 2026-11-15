// src/vistas/Mapas.jsx — los mapas del mundo (un continente, una ciudad, un calabozo…)
import React, { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, guardarImagen, nuevoId, tocarMundo } from "../db";
import { Ventana, ElegirImagen, useImagen } from "../componentes/util.jsx";
import { TAMANOS } from "../mapa/biomas";
import { generarMascara, mascaraVacia, FORMAS } from "../mapa/generar";
import { guardarDibujo } from "../mapa/lienzo";

function TarjetaMapa({ m, mid }) {
  const url = useImagen(m.imagen);
  return (
    <Link to={`/m/${mid}/mapas/${m.id}`} className="tarjeta mundo-tarjeta">
      {url && <div className="fondo" style={{ backgroundImage: `url(${url})`, opacity: 0.6 }} />}
      <div className="dentro"><div className="titulo">⌖ {m.nombre}</div><div className="meta">{m.dibujo ? "dibujado · " : ""}{m.pines.length} {m.pines.length === 1 ? "lugar marcado" : "lugares marcados"}</div></div>
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
  // Mapa dibujado aquí mismo
  const [dibujando, setDibujando] = useState(false);
  const [nd, setNd] = useState({ nombre: "", tamano: "mediano", inicio: "generar", forma: "continente", tierra: 0.4 });
  const [trabajando, setTrabajando] = useState(false);
  const crearDibujo = async (e) => {
    e.preventDefault();
    setTrabajando(true);
    const t = TAMANOS.find((x) => x.clave === nd.tamano);
    const semilla = Math.floor(Math.random() * 99999);
    const generador = { semilla, forma: nd.forma, tierra: nd.tierra, clima: 0, humedad: 0 };
    await new Promise((ok) => setTimeout(ok, 30));
    const mascara = nd.inicio === "generar" ? generarMascara(t.ancho, t.alto, generador) : mascaraVacia(t.ancho, t.alto);
    const m = { id: nuevoId(), mundoId: mid, nombre: nd.nombre.trim() || "Mapa", imagen: null, ancho: t.ancho, alto: t.alto, pines: [] };
    await db.mapas.add(m);
    await guardarDibujo(m, mascara, { rios: [], fronteras: [], etiquetas: [], generador, opciones: { pergamino: false, rosa: true, densidad: 1, semilla } });
    await tocarMundo(mid);
    ir(`/m/${mid}/mapas/${m.id}/dibujar`);
  };

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
        <div className="acciones"><button className="btn oro" onClick={() => setDibujando(true)}>✎ Dibujar un mapa</button><button className="btn" onClick={() => setCreando(true)}>⇪ Subir imagen</button></div></div>
      {mapas && !mapas.length ? (
        <div className="vacio-grande"><div className="simbolo">⌖</div>
          <div>Dibuja tu mapa aquí (o genera un continente al azar y retócalo), o sube una imagen hecha en otro lado. Luego márcale lugares que lleven a sus fichas.</div>
          <div className="chips" style={{ justifyContent: "center" }}><button className="btn oro" onClick={() => setDibujando(true)}>✎ Dibujar un mapa</button><button className="btn" onClick={() => setCreando(true)}>⇪ Subir imagen</button></div></div>
      ) : <div className="rejilla">{(mapas || []).map((m) => <TarjetaMapa key={m.id} m={m} mid={mid} />)}</div>}
      {dibujando && (
        <Ventana titulo="Dibujar un mapa" alCerrar={() => !trabajando && setDibujando(false)}>
          <form onSubmit={crearDibujo} style={{ display: "grid", gap: 14 }}>
            <label className="campo"><span>Nombre</span><input type="text" id="nd-nombre" value={nd.nombre} onChange={(e) => setNd({ ...nd, nombre: e.target.value })} placeholder="Ej. El mundo conocido" autoFocus /></label>
            <label className="campo"><span>Tamaño</span><select id="nd-tam" value={nd.tamano} onChange={(e) => setNd({ ...nd, tamano: e.target.value })}>{TAMANOS.map((t) => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}</select></label>
            <div className="campo"><span>Empezar con</span>
              <div className="chips">
                <label className="chip" style={{ cursor: "pointer" }}><input type="radio" name="inicio" checked={nd.inicio === "generar"} onChange={() => setNd({ ...nd, inicio: "generar" })} /> 🎲 Un mundo al azar</label>
                <label className="chip" style={{ cursor: "pointer" }}><input type="radio" name="inicio" checked={nd.inicio === "vacio"} onChange={() => setNd({ ...nd, inicio: "vacio" })} /> 🌊 Solo mar (dibujo desde cero)</label>
              </div>
            </div>
            {nd.inicio === "generar" && <>
              <label className="campo"><span>Forma</span><select id="nd-forma" value={nd.forma} onChange={(e) => setNd({ ...nd, forma: e.target.value })}>{FORMAS.map((f) => <option key={f.clave} value={f.clave}>{f.nombre}</option>)}</select></label>
              <label className="campo"><span>Cuánta tierra: {Math.round(nd.tierra * 100)}%</span><input type="range" id="nd-tierra" min="0.15" max="0.8" step="0.01" value={nd.tierra} onChange={(e) => setNd({ ...nd, tierra: Number(e.target.value) })} /></label>
              <span className="ayuda">Luego puedes volver a generar con otras opciones, o retocarlo con el pincel.</span>
            </>}
            <div className="botones"><button type="button" className="btn" disabled={trabajando} onClick={() => setDibujando(false)}>Cancelar</button><button className="btn oro" disabled={trabajando}>{trabajando ? "Creando…" : "Empezar a dibujar"}</button></div>
          </form>
        </Ventana>
      )}
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
