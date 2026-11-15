// src/vistas/Ajustes.jsx — nombre, portada, categorías propias, respaldo y borrar el mundo
import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { db, exportarMundo, borrarMundo, guardarImagen } from "../db";
import { Ventana, ElegirImagen, useImagen, useAviso, normal } from "../componentes/util.jsx";

const GRUPOS = ["Gente", "Lugares", "Sociedad", "Cosas", "Escritura", "Otros"];
const ICONOS = ["✦", "☠", "❦", "⚑", "☼", "⌖", "♜", "☯", "⚖", "✧", "⚱", "❧", "✎", "⚔", "♛", "☾", "✠", "⚙", "❖", "⛧", "♆", "⚘", "☄", "⌘"];

export default function Ajustes() {
  const { mundo, fichas, mid } = useOutletContext();
  const [nombre, setNombre] = useState(mundo.nombre);
  const [lema, setLema] = useState(mundo.lema || "");
  const [cats, setCats] = useState(mundo.categorias);
  const [borrando, setBorrando] = useState(false);
  const [confirma, setConfirma] = useState("");
  const portada = useImagen(mundo.portada);
  const [avisar, aviso] = useAviso();
  const ir = useNavigate();

  const guardar = async () => {
    const limpias = cats.filter((c) => c.nombre.trim()).map((c) => ({ ...c, uno: c.uno?.trim() || c.nombre.trim() }));
    await db.mundos.update(mid, { nombre: nombre.trim() || mundo.nombre, lema: lema.trim(), categorias: limpias, editado: Date.now() });
    avisar("Guardado ✓");
  };
  const cambiar = (i, k, v) => setCats((l) => l.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const nueva = () => {
    let clave = "tipo-" + Date.now().toString(36);
    setCats((l) => [...l, { clave, nombre: "", uno: "", icono: "❖", color: "#d6b26e", grupo: "Otros" }]);
  };
  const exportar = async () => {
    const datos = await exportarMundo(mid);
    const blob = new Blob([JSON.stringify(datos)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${normal(mundo.nombre).replace(/[^a-z0-9]+/g, "-") || "mundo"}.lorekeep.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    avisar("Respaldo descargado");
  };

  return (
    <>
      <div className="cabeza"><div><div className="eyebrow">Ajustes</div><h1>{mundo.nombre}</h1></div>
        <div className="acciones"><button className="btn oro" onClick={guardar}>Guardar cambios</button></div></div>

      <section style={{ display: "grid", gap: 14, maxWidth: 640 }}>
        <label className="campo"><span>Nombre del mundo</span><input type="text" id="aj-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        <label className="campo"><span>Frase</span><input type="text" id="aj-lema" value={lema} onChange={(e) => setLema(e.target.value)} /></label>
        <div className="campo"><span>Portada (sale en la tarjeta del mundo)</span>
          {portada && <img src={portada} alt="" style={{ borderRadius: 10, maxHeight: 180, objectFit: "cover" }} />}
          <div className="chips"><ElegirImagen alElegir={async (a) => { const vieja = mundo.portada; await db.mundos.update(mid, { portada: await guardarImagen(mid, a) }); if (vieja) db.imagenes.delete(vieja); }}>{portada ? "Cambiar portada" : "Subir portada"}</ElegirImagen></div>
        </div>
      </section>

      <section className="bloque">
        <h2>Categorías</h2>
        <p className="ayuda" style={{ marginTop: 0 }}>Cámbiales nombre, ícono y color, o inventa las tuyas (hechizos, vehículos, profecías…). Una categoría con fichas no se puede quitar.</p>
        <div style={{ display: "grid", gap: 8 }}>
          {cats.map((c, i) => {
            const n = fichas.filter((f) => f.tipo === c.clave).length;
            return (
              <div key={c.clave} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1fr) 44px auto", gap: 6, alignItems: "center" }}>
                <select id={`cat-i-${i}`} aria-label="Ícono" value={c.icono} onChange={(e) => cambiar(i, "icono", e.target.value)} style={{ color: c.color }}>{ICONOS.map((x) => <option key={x}>{x}</option>)}</select>
                <input type="text" id={`cat-n-${i}`} aria-label="Nombre en plural" placeholder="Plural (Hechizos)" value={c.nombre} onChange={(e) => cambiar(i, "nombre", e.target.value)} />
                <input type="text" id={`cat-u-${i}`} aria-label="Nombre en singular" placeholder="Singular (Hechizo)" value={c.uno} onChange={(e) => cambiar(i, "uno", e.target.value)} />
                <select id={`cat-g-${i}`} aria-label="Grupo" value={c.grupo} onChange={(e) => cambiar(i, "grupo", e.target.value)}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select>
                <input type="color" id={`cat-c-${i}`} aria-label="Color" value={c.color} onChange={(e) => cambiar(i, "color", e.target.value)} style={{ height: 40, width: 44, padding: 2, background: "var(--fondo)", border: "1px solid var(--raya)", borderRadius: 8 }} />
                <button className="btn solo" disabled={n > 0} title={n ? `Tiene ${n} fichas` : "Quitar"} aria-label="Quitar categoría" onClick={() => setCats((l) => l.filter((_, j) => j !== i))}>×</button>
              </div>
            );
          })}
        </div>
        <div className="chips" style={{ marginTop: 12 }}><button className="btn" onClick={nueva}>＋ Categoría propia</button><button className="btn oro" onClick={guardar}>Guardar cambios</button></div>
      </section>

      <section className="bloque">
        <h2>Respaldo</h2>
        <p className="ayuda" style={{ marginTop: 0 }}>Tu mundo vive solo en este dispositivo. Descarga un respaldo de vez en cuando; con él lo puedes abrir en otro celular o en la laptop (Inicio → Importar).</p>
        <button className="btn oro" onClick={exportar}>⇩ Descargar respaldo</button>
      </section>

      <section className="bloque">
        <h2 style={{ color: "var(--peligro)" }}>Borrar el mundo</h2>
        <button className="btn peligro" onClick={() => setBorrando(true)}>Borrar {mundo.nombre}…</button>
      </section>

      {borrando && (
        <Ventana titulo={`¿Borrar ${mundo.nombre}?`} alCerrar={() => setBorrando(false)}>
          <p style={{ margin: 0 }}>Se borran sus {fichas.length} fichas, relaciones, cronología, mapas e imágenes. No se puede deshacer. Si no tienes respaldo, descárgalo antes.</p>
          <label className="campo"><span>Escribe el nombre del mundo para confirmar</span><input type="text" id="confirma" value={confirma} onChange={(e) => setConfirma(e.target.value)} /></label>
          <div className="botones"><button className="btn" onClick={() => setBorrando(false)}>Cancelar</button>
            <button className="btn peligro" disabled={confirma.trim() !== mundo.nombre} onClick={async () => { await borrarMundo(mid); ir("/", { replace: true }); }}>Borrar para siempre</button></div>
        </Ventana>
      )}
      {aviso}
    </>
  );
}
