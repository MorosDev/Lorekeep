// src/vistas/EditorMapa.jsx — dibujar un mapa: pintar biomas, rellenar, ríos, fronteras y nombres.
// Hay dos lienzos: la MÁSCARA (colores exactos de bioma, invisible) y la PANTALLA (lo que ves).
// En "vista rápida" la pantalla muestra la máscara tal cual; en "acabado" muestra el mapa terminado.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, nuevoId } from "../db";
import { BIOMAS, RGB_MASCARA } from "../mapa/biomas";
import { crearRuido } from "../mapa/ruido";
import { generarMascara, FORMAS } from "../mapa/generar";
import { pintarMapa, dibujarVectores, TAM_ETIQUETA } from "../mapa/pintar";
import { aCanvas, aBlob, leerMascara, guardarDibujo, cargarLetras } from "../mapa/lienzo";
import { Ventana, useAviso } from "../componentes/util.jsx";

const HERRAMIENTAS = [
  ["pincel", "🖌", "Pincel"], ["relleno", "🪣", "Rellenar"], ["rio", "〰", "Río"], ["frontera", "┅", "Frontera"],
  ["texto", "A", "Nombre"], ["borrar", "⌫", "Quitar"], ["mover", "✋", "Mover"],
];
const ruidoPincel = crearRuido(3);

// ── Pintar en la máscara (pixel por pixel, sin suavizado, para que los colores queden exactos) ──
function sello(img, x, y, r, rgb, natural, sucio) {
  const { width: W, height: H, data: d } = img;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dist = Math.hypot(px - x, py - y);
    // Borde "natural": el radio cambia con ruido, así la costa no sale redonda como sello de goma
    const lim = natural ? r * (0.72 + 0.28 * (ruidoPincel.capas(px / 22, py / 22, 3) + 1)) : r;
    if (dist > lim) continue;
    const k = (py * W + px) * 4; d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255;
  }
  sucio.x0 = Math.min(sucio.x0, x0); sucio.y0 = Math.min(sucio.y0, y0); sucio.x1 = Math.max(sucio.x1, x1); sucio.y1 = Math.max(sucio.y1, y1);
}

// Bote de pintura: cambia toda la mancha del mismo color que toca (por renglones, rápido)
function rellenar(img, x, y, rgb) {
  const { width: W, height: H, data: d } = img;
  x = Math.floor(x); y = Math.floor(y);
  const k0 = (y * W + x) * 4, objetivo = [d[k0], d[k0 + 1], d[k0 + 2]];
  if (objetivo.every((v, i) => v === rgb[i])) return false;
  const igual = (k) => d[k] === objetivo[0] && d[k + 1] === objetivo[1] && d[k + 2] === objetivo[2];
  const pila = [[x, y]];
  while (pila.length) {
    let [px, py] = pila.pop();
    let k = (py * W + px) * 4;
    while (px >= 0 && igual(k)) { px--; k -= 4; }
    px++; k += 4;
    let arriba = false, abajo = false;
    while (px < W && igual(k)) {
      d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2];
      if (py > 0) { const s = igual(k - W * 4); if (s && !arriba) { pila.push([px, py - 1]); arriba = true; } else if (!s) arriba = false; }
      if (py < H - 1) { const s = igual(k + W * 4); if (s && !abajo) { pila.push([px, py + 1]); abajo = true; } else if (!s) abajo = false; }
      px++; k += 4;
    }
  }
  return true;
}

// Distancia de un punto a un trazo (para "Quitar")
function distanciaATrazo(pts, x, y) {
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return m;
}

// ── Ventanas ──
export function OpcionesGenerar({ inicial, alGenerar, alCerrar, aviso = null }) {
  const [o, setO] = useState(inicial || { semilla: Math.floor(Math.random() * 99999), forma: "continente", tierra: 0.4, clima: 0, humedad: 0 });
  const pon = (k, v) => setO((x) => ({ ...x, [k]: v }));
  return (
    <Ventana titulo="Generar un mundo" alCerrar={alCerrar}>
      {aviso && <p className="ayuda" style={{ margin: 0, color: "var(--oro)" }}>{aviso}</p>}
      <label className="campo"><span>Forma</span>
        <select id="gen-forma" value={o.forma} onChange={(e) => pon("forma", e.target.value)}>{FORMAS.map((f) => <option key={f.clave} value={f.clave}>{f.nombre}</option>)}</select>
      </label>
      <label className="campo"><span>Cuánta tierra: {Math.round(o.tierra * 100)}%</span><input type="range" id="gen-tierra" min="0.15" max="0.8" step="0.01" value={o.tierra} onChange={(e) => pon("tierra", Number(e.target.value))} /></label>
      <label className="campo"><span>Clima: {o.clima < -0.3 ? "frío" : o.clima > 0.3 ? "cálido" : "templado"}</span><input type="range" id="gen-clima" min="-1" max="1" step="0.1" value={o.clima} onChange={(e) => pon("clima", Number(e.target.value))} /></label>
      <label className="campo"><span>Humedad: {o.humedad < -0.3 ? "seco" : o.humedad > 0.3 ? "húmedo" : "normal"}</span><input type="range" id="gen-humedad" min="-1" max="1" step="0.1" value={o.humedad} onChange={(e) => pon("humedad", Number(e.target.value))} /></label>
      <label className="campo"><span>Semilla (el mismo número da el mismo mundo)</span>
        <div style={{ display: "flex", gap: 8 }}><input type="number" id="gen-semilla" value={o.semilla} onChange={(e) => pon("semilla", Number(e.target.value) || 0)} /><button type="button" className="btn" onClick={() => pon("semilla", Math.floor(Math.random() * 99999))}>🎲 Otra</button></div>
      </label>
      <div className="botones"><button className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro" onClick={() => alGenerar(o)}>Generar</button></div>
    </Ventana>
  );
}

function NuevaEtiqueta({ alGuardar, alCerrar }) {
  const [e, setE] = useState({ texto: "", tamano: "m", estilo: "tierra", giro: 0 });
  const pon = (k, v) => setE((x) => ({ ...x, [k]: v }));
  return (
    <Ventana titulo="Nombre decorativo" alCerrar={alCerrar}>
      <p className="ayuda" style={{ margin: 0 }}>Para mares, cordilleras o regiones: solo se pinta en el dibujo. Para ciudades y pueblos que lleven a su ficha, usa <b>⌖ Poner lugar</b> en el mapa.</p>
      <form onSubmit={(ev) => { ev.preventDefault(); if (e.texto.trim()) alGuardar({ ...e, texto: e.texto.trim() }); }} style={{ display: "grid", gap: 14 }}>
        <label className="campo"><span>Texto</span><input type="text" id="eti-texto" value={e.texto} onChange={(x) => pon("texto", x.target.value)} placeholder="Ej. Mar de los Susurros" autoFocus /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="campo"><span>Tamaño</span><select id="eti-tam" value={e.tamano} onChange={(x) => pon("tamano", x.target.value)}>{Object.keys(TAM_ETIQUETA).map((k) => <option key={k} value={k}>{{ s: "Chico (pueblo)", m: "Mediano (ciudad)", l: "Grande (región)", xl: "Enorme (reino)" }[k]}</option>)}</select></label>
          <label className="campo"><span>Estilo</span><select id="eti-estilo" value={e.estilo} onChange={(x) => pon("estilo", x.target.value)}><option value="tierra">Lugar</option><option value="region">Región / reino</option><option value="mar">Mar o río</option></select></label>
        </div>
        <label className="campo"><span>Inclinación: {e.giro}°</span><input type="range" id="eti-giro" min="-45" max="45" value={e.giro} onChange={(x) => pon("giro", Number(x.target.value))} /></label>
        <div className="botones"><button type="button" className="btn" onClick={alCerrar}>Cancelar</button><button className="btn oro" disabled={!e.texto.trim()}>Poner</button></div>
      </form>
    </Ventana>
  );
}

export default function EditorMapa() {
  const { mid } = useOutletContext();
  const { mapaId } = useParams();
  const mapa = useLiveQuery(() => db.mapas.get(mapaId), [mapaId]);
  const ir = useNavigate();
  const [avisar, aviso] = useAviso();

  const pantalla = useRef(null), caja = useRef(null);
  const mascara = useRef(null);       // ImageData con los biomas
  const capas = useRef({ rios: [], fronteras: [], etiquetas: [] });
  const trazo = useRef(null);         // lo que se está dibujando ahora
  const acabado = useRef(null);       // canvas del mapa terminado (cache)
  const deshacer = useRef([]), rehacer = useRef([]);

  const [listo, setListo] = useState(false);
  const [herramienta, setHerramienta] = useState("pincel");
  const [bioma, setBioma] = useState(2);
  const [radio, setRadio] = useState(28);
  const [natural, setNatural] = useState(true);
  const [vista, setVista] = useState("rapida");
  const [zoom, setZoom] = useState(0.6);
  const [opciones, setOpciones] = useState({ pergamino: false, rosa: true, densidad: 1, semilla: 7 });
  const [cambios, setCambios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [etiquetaEn, setEtiquetaEn] = useState(null);
  const [, refrescar] = useState(0);

  // Cargar una vez lo guardado
  useEffect(() => {
    if (!mapa || listo) return;
    (async () => {
      if (!mapa.dibujo?.mascara) { ir(`/m/${mid}/mapas/${mapa.id}`, { replace: true }); return; }
      await cargarLetras();
      mascara.current = await leerMascara(mapa.dibujo.mascara);
      capas.current = { rios: mapa.dibujo.rios || [], fronteras: mapa.dibujo.fronteras || [], etiquetas: mapa.dibujo.etiquetas || [], generador: mapa.dibujo.generador };
      setOpciones((o) => ({ ...o, ...(mapa.dibujo.opciones || {}) }));
      const caben = (caja.current?.clientWidth || 800) / mascara.current.width;
      setZoom(Math.min(1, Math.max(0.2, Math.round(caben * 20) / 20)));
      setListo(true);
    })();
  }, [mapa, listo, mid, ir]);

  // ── Dibujar en pantalla ──
  const redibujar = useCallback(() => {
    const c = pantalla.current, m = mascara.current;
    if (!c || !m) return;
    if (c.width !== m.width) { c.width = m.width; c.height = m.height; }
    const ctx = c.getContext("2d");
    if (vista === "acabado") {
      if (!acabado.current) acabado.current = pintarMapa(m, capas.current, opciones);
      ctx.drawImage(acabado.current, 0, 0);
    } else {
      ctx.putImageData(m, 0, 0);
      dibujarVectores(ctx, capas.current);
    }
    // El trazo en curso (río o frontera), encima de todo
    const t = trazo.current;
    if (t?.puntos?.length > 1 && (t.tipo === "rio" || t.tipo === "frontera")) dibujarVectores(ctx, t.tipo === "rio" ? { rios: [t] } : { fronteras: [t] });
  }, [vista, opciones]);

  useEffect(() => { acabado.current = null; if (listo) redibujar(); }, [listo, vista, opciones, redibujar]);

  // Guarda cómo estaba todo antes de un cambio (para deshacer). La máscara se copia solo si la herramienta la toca.
  const recordar = (conMascara) => {
    deshacer.current.push({ mascara: conMascara ? new ImageData(new Uint8ClampedArray(mascara.current.data), mascara.current.width) : null, capas: structuredClone(capas.current) });
    if (deshacer.current.length > 8) deshacer.current.shift(); // cada copia pesa varios MB (en el celular la memoria se acaba): pocas
    rehacer.current = [];
  };
  const tras = () => { acabado.current = null; setCambios(true); redibujar(); refrescar((n) => n + 1); };
  const volver = (desde, hacia) => {
    const paso = desde.current.pop(); if (!paso) return;
    hacia.current.push({ mascara: paso.mascara ? new ImageData(new Uint8ClampedArray(mascara.current.data), mascara.current.width) : null, capas: structuredClone(capas.current) });
    if (paso.mascara) mascara.current = paso.mascara;
    capas.current = paso.capas;
    tras();
  };

  // ── Lápiz / dedo ──
  const punto = (e) => { const r = pantalla.current.getBoundingClientRect(); return [((e.clientX - r.left) * mascara.current.width) / r.width, ((e.clientY - r.top) * mascara.current.height) / r.height]; };
  const pintarHasta = (x, y) => {
    const t = trazo.current, rgb = RGB_MASCARA[bioma], sucio = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
    const [lx, ly] = t.ultimo, pasos = Math.max(1, Math.ceil(Math.hypot(x - lx, y - ly) / Math.max(1, radio / 3)));
    for (let i = 1; i <= pasos; i++) sello(mascara.current, lx + ((x - lx) * i) / pasos, ly + ((y - ly) * i) / pasos, radio, rgb, natural, sucio);
    t.ultimo = [x, y];
    // Solo se repinta el pedacito que cambió (rápido aunque el mapa sea grande)
    if (sucio.x1 >= 0) pantalla.current.getContext("2d").putImageData(mascara.current, 0, 0, sucio.x0, sucio.y0, sucio.x1 - sucio.x0 + 1, sucio.y1 - sucio.y0 + 1);
  };

  const alBajar = (e) => {
    if (!listo || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = punto(e);
    if (herramienta === "mover") { trazo.current = { tipo: "mover", inicio: [e.clientX, e.clientY], scroll: [caja.current.scrollLeft, caja.current.scrollTop] }; return; }
    if (herramienta === "pincel") {
      recordar(true);
      if (vista === "acabado") { pantalla.current.getContext("2d").putImageData(mascara.current, 0, 0); }
      trazo.current = { tipo: "pincel", ultimo: [x, y] };
      pintarHasta(x + 0.01, y);
    } else if (herramienta === "relleno") {
      recordar(true);
      if (rellenar(mascara.current, x, y, RGB_MASCARA[bioma])) tras(); else deshacer.current.pop();
    } else if (herramienta === "rio" || herramienta === "frontera") {
      trazo.current = { tipo: herramienta, id: nuevoId(), puntos: [[x, y]], ...(herramienta === "rio" ? { ancho: Math.max(2, Math.min(7, radio / 8)) } : {}) };
    } else if (herramienta === "texto") setEtiquetaEn([x, y]);
    else if (herramienta === "borrar") {
      const c = capas.current, lejos = 18 * (mascara.current.width / pantalla.current.getBoundingClientRect().width);
      const eti = c.etiquetas.find((q) => Math.hypot(q.x - x, q.y - y) < Math.max(lejos * 1.5, (TAM_ETIQUETA[q.tamano] || 24) * 1.2));
      const rio = !eti && c.rios.find((q) => distanciaATrazo(q.puntos, x, y) < lejos);
      const fro = !eti && !rio && c.fronteras.find((q) => distanciaATrazo(q.puntos, x, y) < lejos);
      if (!eti && !rio && !fro) return avisar("Toca cerca de un río, frontera o nombre para quitarlo.");
      recordar(false);
      capas.current = { rios: c.rios.filter((q) => q !== rio), fronteras: c.fronteras.filter((q) => q !== fro), etiquetas: c.etiquetas.filter((q) => q !== eti) };
      tras();
    }
  };
  const alMover = (e) => {
    const t = trazo.current; if (!t) return;
    if (t.tipo === "mover") { caja.current.scrollLeft = t.scroll[0] - (e.clientX - t.inicio[0]); caja.current.scrollTop = t.scroll[1] - (e.clientY - t.inicio[1]); return; }
    const [x, y] = punto(e);
    if (t.tipo === "pincel") pintarHasta(x, y);
    else { const u = t.puntos[t.puntos.length - 1]; if (Math.hypot(x - u[0], y - u[1]) > 5) { t.puntos.push([x, y]); redibujar(); } }
  };
  const alSoltar = () => {
    const t = trazo.current; trazo.current = null; if (!t) return;
    if (t.tipo === "pincel") tras();
    else if ((t.tipo === "rio" || t.tipo === "frontera") && t.puntos.length > 1) {
      recordar(false);
      const { tipo, ...dato } = t;
      capas.current = { ...capas.current, [tipo === "rio" ? "rios" : "fronteras"]: [...capas.current[tipo === "rio" ? "rios" : "fronteras"], dato] };
      tras();
    } else redibujar();
  };

  // ── Acciones ──
  const generar = async (o) => {
    setGenerando(false);
    recordar(true);
    avisar("Generando…");
    await new Promise((ok) => setTimeout(ok, 30)); // deja que se vea el aviso antes del cálculo
    mascara.current = generarMascara(mascara.current.width, mascara.current.height, o);
    setOpciones((x) => ({ ...x, semilla: o.semilla }));
    capas.current.generador = o;
    tras();
    avisar("Listo. Retócalo con el pincel.");
  };
  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarDibujo(mapa, mascara.current, { ...capas.current, mascara: mapa.dibujo?.mascara, opciones });
      setCambios(false); avisar("Mapa guardado ✓");
    } catch (err) { avisar(err.message || "No se pudo guardar."); }
    setGuardando(false);
  };

  // Atajos de teclado: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const k = (e) => {
      if (!(e.ctrlKey || e.metaKey) || ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); volver(deshacer, rehacer); }
      if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); volver(rehacer, deshacer); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (mapa === undefined) return null;
  if (!mapa) return <p>Ese mapa no existe. <Link to={`/m/${mid}/mapas`}>Volver</Link></p>;
  const pinta = herramienta === "pincel" || herramienta === "relleno";
  return (
    <>
      <div className="cabeza">
        <Link className="btn solo" to={`/m/${mid}/mapas/${mapa.id}`} aria-label="Ver mapa">←</Link>
        <div><div className="eyebrow">Dibujando</div><h1>{mapa.nombre}</h1></div>
        <div className="acciones">
          <span className="ayuda" style={{ alignSelf: "center" }}>{cambios ? "Sin guardar" : "Todo guardado"}</span>
          <button className="btn" onClick={() => setGenerando(true)}>🎲 Generar</button>
          <button className="btn oro" onClick={guardar} disabled={guardando || !listo}>{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>

      <div className="editor-mapa">
        <aside className="herramientas">
          <div className="grupo-h">
            {HERRAMIENTAS.map(([k, ico, n]) => (
              <button key={k} type="button" className={"herr" + (herramienta === k ? " activa" : "")} onClick={() => setHerramienta(k)} title={n}><span aria-hidden="true">{ico}</span>{n}</button>
            ))}
          </div>
          {pinta && (
            <div className="grupo-h">
              <div className="eyebrow">Bioma</div>
              <div className="paleta">
                {BIOMAS.map((b, i) => (
                  <button key={b.clave} type="button" className={"color" + (bioma === i ? " activo" : "")} onClick={() => setBioma(i)} title={b.nombre}>
                    <span style={{ background: b.real }} />{b.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(herramienta === "pincel" || herramienta === "rio") && (
            <div className="grupo-h">
              <label className="campo"><span>{herramienta === "rio" ? "Grosor del río" : "Tamaño del pincel"}: {radio}</span><input type="range" id="radio" min="3" max="120" value={radio} onChange={(e) => setRadio(Number(e.target.value))} /></label>
              {herramienta === "pincel" && <label className="chip" style={{ cursor: "pointer" }}><input type="checkbox" checked={natural} onChange={(e) => setNatural(e.target.checked)} /> Borde natural</label>}
            </div>
          )}
          <div className="grupo-h">
            <div className="chips">
              <button type="button" className="btn" disabled={!deshacer.current.length} onClick={() => volver(deshacer, rehacer)}>↶ Deshacer</button>
              <button type="button" className="btn" disabled={!rehacer.current.length} onClick={() => volver(rehacer, deshacer)}>↷</button>
            </div>
          </div>
          <div className="grupo-h">
            <div className="eyebrow">Vista</div>
            <div className="chips">
              <button type="button" className={"btn" + (vista === "rapida" ? " oro" : "")} onClick={() => setVista("rapida")}>Rápida</button>
              <button type="button" className={"btn" + (vista === "acabado" ? " oro" : "")} onClick={() => setVista("acabado")}>Acabado</button>
            </div>
            <label className="chip" style={{ cursor: "pointer" }}><input type="checkbox" checked={opciones.pergamino} onChange={(e) => setOpciones((o) => ({ ...o, pergamino: e.target.checked }))} /> Pergamino</label>
            <label className="chip" style={{ cursor: "pointer" }}><input type="checkbox" checked={opciones.rosa} onChange={(e) => setOpciones((o) => ({ ...o, rosa: e.target.checked }))} /> Rosa de los vientos</label>
            <label className="campo"><span>Símbolos: {opciones.densidad < 0.8 ? "pocos" : opciones.densidad > 1.3 ? "muchos" : "normal"}</span><input type="range" id="densidad" min="0.5" max="2" step="0.1" value={opciones.densidad} onChange={(e) => setOpciones((o) => ({ ...o, densidad: Number(e.target.value) }))} /></label>
            <label className="campo"><span>Zoom: {Math.round(zoom * 100)}%</span><input type="range" id="zoom" min="0.15" max="2" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
          </div>
        </aside>
        <div ref={caja} className="lienzo-editor">
          {!listo && <p className="ayuda" style={{ padding: 16 }}>Abriendo el mapa…</p>}
          <canvas ref={pantalla} className={"herr-" + herramienta}
            style={{ width: mascara.current ? mascara.current.width * zoom : 0, height: mascara.current ? mascara.current.height * zoom : 0 }}
            onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} />
        </div>
      </div>
      <p className="ayuda">Pinta con el dedo o el mouse. <b>Rellenar</b> cambia toda una mancha de golpe (útil para el mar). La vista <b>Acabado</b> muestra el mapa final con montañas, árboles y costas; al <b>Guardar</b> se actualiza el mapa con sus pines.</p>

      {generando && <OpcionesGenerar inicial={capas.current.generador} aviso="Esto reemplaza el terreno (los ríos, fronteras y nombres se quedan). Puedes deshacerlo." alGenerar={generar} alCerrar={() => setGenerando(false)} />}
      {etiquetaEn && <NuevaEtiqueta alCerrar={() => setEtiquetaEn(null)} alGuardar={(e) => { recordar(false); capas.current = { ...capas.current, etiquetas: [...capas.current.etiquetas, { id: nuevoId(), x: etiquetaEn[0], y: etiquetaEn[1], ...e }] }; setEtiquetaEn(null); tras(); }} />}
      {aviso}
    </>
  );
}
