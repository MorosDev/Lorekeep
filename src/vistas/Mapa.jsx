// src/vistas/Mapa.jsx — un mapa con pines. Usa Leaflet en modo "imagen plana" (CRS.Simple):
// las coordenadas de cada pin son pixeles de la imagen, así no dependen del zoom.
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSearchParams } from "react-router-dom";
import { db, nuevoId, tocarMundo, crearFicha } from "../db";
import { Ventana, BuscarFicha, useImagen } from "../componentes/util.jsx";
import PanelLugar from "../componentes/PanelLugar.jsx";
import { TIPOS_LUGAR, simboloLugar } from "../lugares";

// Poner un lugar: lo normal es crear uno NUEVO aquí mismo (ficha + pin de una vez).
// También se puede marcar una ficha que ya existe (un lugar, o hasta un personaje).
function NuevoLugar({ mid, alGuardar, alCerrar }) {
  const [modo, setModo] = useState("nuevo");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("Pueblo");
  return (
    <Ventana titulo="Poner un lugar" alCerrar={alCerrar}>
      <div className="pestanas" role="tablist" style={{ marginBottom: 0 }}>
        <button type="button" role="tab" aria-selected={modo === "nuevo"} onClick={() => setModo("nuevo")}>Lugar nuevo</button>
        <button type="button" role="tab" aria-selected={modo === "existe"} onClick={() => setModo("existe")}>Una ficha que ya existe</button>
      </div>
      {modo === "nuevo" ? (
        <form onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) alGuardar({ nuevo: { nombre: nombre.trim(), tipo } }); }} style={{ display: "grid", gap: 14 }}>
          <label className="campo"><span>Nombre</span><input type="text" id="lugar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Villa Las Flores" autoFocus /></label>
          <div className="campo"><span>Qué es</span>
            <div className="tipos-lugar">
              {TIPOS_LUGAR.map(([t, s]) => <button key={t} type="button" className={"chip" + (tipo === t ? " activo" : "")} onClick={() => setTipo(t)}><b>{s}</b> {t}</button>)}
            </div>
          </div>
          <span className="ayuda">Se crea su ficha en Lugares. Después la llenas con su historia, y quien tenga este lugar como origen o "vive en" aparecerá aquí.</span>
          <div className="botones"><button type="button" className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro" disabled={!nombre.trim()}>Poner en el mapa</button></div>
        </form>
      ) : (
        <div className="campo"><span>Busca la ficha (un lugar, una facción, un personaje…)</span>
          <BuscarFicha mid={mid} autoFocus alElegir={(f) => alGuardar({ fichaId: f.id, etiqueta: f.nombre })} />
        </div>
      )}
    </Ventana>
  );
}

export default function Mapa() {
  const { mundo, fichas, mid } = useOutletContext();
  const { mapaId } = useParams();
  const mapa = useLiveQuery(() => db.mapas.get(mapaId), [mapaId]);
  const url = useImagen(mapa?.imagen);
  const caja = useRef(null);
  const lf = useRef(null);
  const capaPines = useRef(null);
  const [poniendo, setPoniendo] = useState(false);
  const [pendiente, setPendiente] = useState(null); // dónde se tocó para el pin nuevo
  const [nombres, setNombres] = useState(true);
  const [borrando, setBorrando] = useState(false);
  const [quitar, setQuitar] = useState(null); // pin a quitar (pide confirmar)
  const [elegido, setElegido] = useState(null); // id del pin cuyo panel está abierto
  const [buscar] = useSearchParams();             // ?foco=pinId cuando vienes de "Ver en el mapa"
  const ir = useNavigate();
  const modoPin = useRef(false);
  modoPin.current = poniendo;

  // El mapa de Leaflet se crea una vez por imagen
  useEffect(() => {
    if (!caja.current || !url || !mapa) return;
    const limites = [[0, 0], [mapa.alto, mapa.ancho]];
    const m = L.map(caja.current, { crs: L.CRS.Simple, minZoom: -5, maxZoom: 3, zoomSnap: 0.25, attributionControl: false });
    L.imageOverlay(url, limites).addTo(m);
    m.fitBounds(limites);
    m.setMaxBounds(L.latLngBounds(limites).pad(0.3));
    capaPines.current = L.layerGroup().addTo(m);
    m.on("click", (e) => { if (modoPin.current) setPendiente({ x: e.latlng.lng, y: e.latlng.lat }); });
    lf.current = m;
    return () => { m.remove(); lf.current = null; };
  }, [url, mapa?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dibuja los pines cada vez que cambian
  useEffect(() => {
    const capa = capaPines.current;
    if (!capa || !mapa) return;
    capa.clearLayers();
    for (const p of mapa.pines) {
      const f = p.fichaId ? fichas.find((x) => x.id === p.fichaId) : null;
      const c = f ? mundo.categorias.find((x) => x.clave === f.tipo) : null;
      // Los lugares llevan el símbolo de su tipo (♜ ciudad, ⌂ pueblo…); lo demás, el de su categoría
      const simbolo = simboloLugar(f?.datos?.tipoLugar) || c?.icono || "◆";
      const icono = L.divIcon({ className: "", html: `<div class="pin${p.id === elegido ? " elegido" : ""}" style="background:${c?.color || "#d6b26e"}"><span>${simbolo}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
      const mk = L.marker([p.y, p.x], { icon: icono, draggable: true, title: p.etiqueta || f?.nombre || "" }).addTo(capa);
      if (nombres) mk.bindTooltip(p.etiqueta || f?.nombre || "", { permanent: true, direction: "bottom", offset: [0, 2], className: "etiqueta-pin" });
      mk.on("click", () => { if (!modoPin.current) setElegido(p.id); });
      mk.on("dragend", async (e) => {
        const ll = e.target.getLatLng();
        await db.mapas.update(mapa.id, { pines: mapa.pines.map((q) => (q.id === p.id ? { ...q, x: ll.lng, y: ll.lat } : q)) });
      });
      mk.on("contextmenu", () => setQuitar(p));
    }
  }, [mapa, fichas, nombres, mundo.categorias, mid, ir, elegido]);

  // Si vienes de "Ver en el mapa", vuela a ese lugar y abre su panel
  useEffect(() => {
    const foco = buscar.get("foco"), p = foco && mapa?.pines.find((q) => q.id === foco);
    if (p && lf.current) { lf.current.flyTo([p.y, p.x], 0.5, { duration: 0.6 }); setElegido(p.id); }
  }, [buscar, mapa?.id, url]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mapa === undefined) return null;
  if (!mapa) return <p>Ese mapa no existe. <Link to={`/m/${mid}/mapas`}>Volver a los mapas</Link></p>;

  const guardarPin = async (datos) => {
    // Lugar nuevo: primero su ficha (en Lugares, con su tipo), luego el pin que apunta a ella
    if (datos.nuevo) {
      const f = await crearFicha(mid, "lugar", datos.nuevo.nombre);
      await db.fichas.update(f.id, { datos: { tipoLugar: datos.nuevo.tipo } });
      datos = { fichaId: f.id, etiqueta: f.nombre };
    }
    const id = nuevoId();
    await db.mapas.update(mapa.id, { pines: [...mapa.pines, { id, ...pendiente, ...datos }] });
    setElegido(id);
    await tocarMundo(mid);
    setPendiente(null); setPoniendo(false);
  };
  return (
    <>
      <div className="cabeza">
        <Link className="btn solo" to={`/m/${mid}/mapas`} aria-label="Mapas">←</Link>
        <div><div className="eyebrow">Mapa</div><h1>{mapa.nombre}</h1></div>
        <div className="acciones">
          {mapa.dibujo && <Link className="btn oro" to={`/m/${mid}/mapas/${mapa.id}/dibujar`}>✎ Editar dibujo</Link>}
          <button className={"btn" + (poniendo ? " oro" : "")} onClick={() => setPoniendo((v) => !v)}>{poniendo ? "Toca el mapa donde va…" : "⌖ Poner lugar"}</button>
          <button className="btn" onClick={() => setNombres((v) => !v)}>{nombres ? "Ocultar nombres" : "Ver nombres"}</button>
          <button className="btn peligro solo" onClick={() => setBorrando(true)} aria-label="Borrar mapa" title="Borrar mapa">🗑</button>
        </div>
      </div>
      <div className="mapa-con-panel">
        <div ref={caja} className="lienzo-mapa" style={{ cursor: poniendo ? "crosshair" : undefined }} />
        {elegido && (() => {
          const p = mapa.pines.find((q) => q.id === elegido);
          if (!p) return null;
          const f = p.fichaId && fichas.find((x) => x.id === p.fichaId);
          return <PanelLugar ficha={f || null} etiqueta={p.etiqueta} mundo={mundo} mid={mid} alCerrar={() => setElegido(null)} alQuitar={() => setQuitar(p)} />;
        })()}
      </div>
      <p className="ayuda">Toca un lugar para ver quién está ahí · arrástralo para moverlo. Los nombres decorativos (mares, cordilleras) se ponen en <b>✎ Editar dibujo</b>.</p>
      {mapa.pines.length > 0 && (
        <section className="bloque"><h2>En este mapa</h2>
          <div className="chips">{mapa.pines.map((p) => {
            const f = p.fichaId && fichas.find((x) => x.id === p.fichaId);
            return <button key={p.id} className="chip" onClick={() => { lf.current?.flyTo([p.y, p.x], 0.5, { duration: 0.6 }); setElegido(p.id); }}>{simboloLugar(f?.datos?.tipoLugar) || "◆"} {f ? f.nombre : p.etiqueta}</button>;
          })}</div>
        </section>
      )}
      {pendiente && <NuevoLugar mid={mid} alGuardar={guardarPin} alCerrar={() => setPendiente(null)} />}
      {quitar && (
        <Ventana titulo={`¿Quitar el pin "${quitar.etiqueta}"?`} alCerrar={() => setQuitar(null)}>
          <p style={{ margin: 0 }}>Solo se quita del mapa; la ficha se queda.</p>
          <div className="botones"><button className="btn" onClick={() => setQuitar(null)}>Cancelar</button>
            <button className="btn peligro" onClick={async () => { await db.mapas.update(mapa.id, { pines: mapa.pines.filter((q) => q.id !== quitar.id) }); setQuitar(null); setElegido(null); }}>Quitar del mapa</button></div>
        </Ventana>
      )}
      {borrando && (
        <Ventana titulo={`¿Borrar el mapa "${mapa.nombre}"?`} alCerrar={() => setBorrando(false)}>
          <p style={{ margin: 0 }}>Se borran la imagen y los pines. Las fichas no se tocan.</p>
          <div className="botones"><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn peligro" onClick={async () => { await db.imagenes.delete(mapa.imagen); await db.mapas.delete(mapa.id); ir(`/m/${mid}/mapas`, { replace: true }); }}>Borrar mapa</button></div>
        </Ventana>
      )}
    </>
  );
}
