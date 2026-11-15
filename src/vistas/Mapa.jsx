// src/vistas/Mapa.jsx — un mapa con pines. Usa Leaflet en modo "imagen plana" (CRS.Simple):
// las coordenadas de cada pin son pixeles de la imagen, así no dependen del zoom.
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db, nuevoId, tocarMundo } from "../db";
import { Ventana, BuscarFicha, useImagen } from "../componentes/util.jsx";

function NuevoPin({ mid, alGuardar, alCerrar }) {
  const [ficha, setFicha] = useState(null);
  const [etiqueta, setEtiqueta] = useState("");
  return (
    <Ventana titulo="Marcar un lugar" alCerrar={alCerrar}>
      <div className="campo"><span>¿Qué ficha es? (opcional)</span>
        {ficha ? <div className="chips"><span className="chip">{ficha.nombre}<button type="button" className="btn solo" style={{ padding: "0 6px", border: 0, background: "none" }} onClick={() => setFicha(null)} aria-label="Quitar">×</button></span></div>
          : <BuscarFicha mid={mid} autoFocus alElegir={(f) => { setFicha(f); if (!etiqueta) setEtiqueta(f.nombre); }} />}
      </div>
      <label className="campo"><span>Nombre en el mapa</span><input type="text" id="pin-etiqueta" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej. Torre del Vigía" /></label>
      <div className="botones"><button className="btn" onClick={alCerrar}>Cancelar</button>
        <button className="btn oro" disabled={!ficha && !etiqueta.trim()} onClick={() => alGuardar({ fichaId: ficha?.id || null, etiqueta: etiqueta.trim() || ficha?.nombre })}>Poner pin</button></div>
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
      const icono = L.divIcon({ className: "", html: `<div class="pin" style="background:${c?.color || "#d6b26e"}"><span>${c?.icono || "◆"}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
      const mk = L.marker([p.y, p.x], { icon: icono, draggable: true, title: p.etiqueta || f?.nombre || "" }).addTo(capa);
      if (nombres) mk.bindTooltip(p.etiqueta || f?.nombre || "", { permanent: true, direction: "bottom", offset: [0, 2], className: "etiqueta-pin" });
      mk.on("click", () => { if (!modoPin.current && f) ir(`/m/${mid}/f/${f.id}`); });
      mk.on("dragend", async (e) => {
        const ll = e.target.getLatLng();
        await db.mapas.update(mapa.id, { pines: mapa.pines.map((q) => (q.id === p.id ? { ...q, x: ll.lng, y: ll.lat } : q)) });
      });
      mk.on("contextmenu", () => setQuitar(p));
    }
  }, [mapa, fichas, nombres, mundo.categorias, mid, ir]);

  if (mapa === undefined) return null;
  if (!mapa) return <p>Ese mapa no existe. <Link to={`/m/${mid}/mapas`}>Volver a los mapas</Link></p>;

  const guardarPin = async (datos) => {
    await db.mapas.update(mapa.id, { pines: [...mapa.pines, { id: nuevoId(), ...pendiente, ...datos }] });
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
          <button className={"btn" + (poniendo ? " oro" : "")} onClick={() => setPoniendo((v) => !v)}>{poniendo ? "Toca el mapa donde va…" : "⌖ Poner pin"}</button>
          <button className="btn" onClick={() => setNombres((v) => !v)}>{nombres ? "Ocultar nombres" : "Ver nombres"}</button>
          <button className="btn peligro solo" onClick={() => setBorrando(true)} aria-label="Borrar mapa" title="Borrar mapa">🗑</button>
        </div>
      </div>
      <div ref={caja} className="lienzo-mapa" style={{ cursor: poniendo ? "crosshair" : undefined }} />
      <p className="ayuda">Toca un pin para abrir su ficha · arrástralo para moverlo · mantén presionado (o clic derecho) para quitarlo.</p>
      {mapa.pines.length > 0 && (
        <section className="bloque"><h2>En este mapa</h2>
          <div className="chips">{mapa.pines.map((p) => {
            const f = p.fichaId && fichas.find((x) => x.id === p.fichaId);
            return f ? <Link key={p.id} className="chip" to={`/m/${mid}/f/${f.id}`}>{p.etiqueta || f.nombre}</Link>
              : <button key={p.id} className="chip" onClick={() => lf.current?.flyTo([p.y, p.x], 1)}>{p.etiqueta}</button>;
          })}</div>
        </section>
      )}
      {pendiente && <NuevoPin mid={mid} alGuardar={guardarPin} alCerrar={() => setPendiente(null)} />}
      {quitar && (
        <Ventana titulo={`¿Quitar el pin "${quitar.etiqueta}"?`} alCerrar={() => setQuitar(null)}>
          <p style={{ margin: 0 }}>Solo se quita del mapa; la ficha se queda.</p>
          <div className="botones"><button className="btn" onClick={() => setQuitar(null)}>Cancelar</button>
            <button className="btn peligro" onClick={async () => { await db.mapas.update(mapa.id, { pines: mapa.pines.filter((q) => q.id !== quitar.id) }); setQuitar(null); }}>Quitar pin</button></div>
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
