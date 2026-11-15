// src/vistas/Relaciones.jsx — todas las fichas y cómo se conectan, como una red.
// Cuentan las relaciones que hiciste a mano, los campos que apuntan a otra ficha (Especie, Líder…) y las menciones con @.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import cytoscape from "cytoscape";
import { db } from "../db";
import { plantillaDe } from "../plantillas";
import { mencionesDe } from "../componentes/util.jsx";

export default function Relaciones() {
  const { mundo, fichas, nombres, mid } = useOutletContext();
  const relaciones = useLiveQuery(() => db.relaciones.where("mundoId").equals(mid).toArray(), [mid]);
  const caja = useRef(null);
  const ir = useNavigate();
  const [ver, setVer] = useState({ manuales: true, campos: true, menciones: false });
  const [tipos, setTipos] = useState(() => new Set(mundo.categorias.map((c) => c.clave)));

  // Las conexiones de las tres fuentes, sin repetir
  const aristas = useMemo(() => {
    if (!relaciones) return [];
    const out = [], visto = new Set();
    const poner = (de, a, etiqueta, clase) => {
      const k = [de, a].sort().join("|") + clase + etiqueta;
      if (de === a || visto.has(k)) return; visto.add(k);
      out.push({ data: { id: "e" + out.length, source: de, target: a, etiqueta }, classes: clase });
    };
    if (ver.manuales) for (const r of relaciones) poner(r.de, r.a, r.tipo, "manual");
    if (ver.campos) for (const f of fichas) for (const d of plantillaDe(f.tipo).datos) { const v = f.datos?.[d.clave]; if (v?.ref) poner(f.id, v.ref, d.nombre.toLowerCase(), "campo"); }
    if (ver.menciones) for (const f of fichas) for (const id of mencionesDe([f.resumen, ...Object.values(f.secciones || {})].join("\n"), nombres)) poner(f.id, id, "", "mencion");
    return out;
  }, [relaciones, fichas, nombres, ver]);

  // Quién tiene más conexiones (como el "Most influential" de LoreGrid)
  const grados = useMemo(() => { const g = {}; for (const e of aristas) { g[e.data.source] = (g[e.data.source] || 0) + 1; g[e.data.target] = (g[e.data.target] || 0) + 1; } return g; }, [aristas]);
  const top = fichas.filter((f) => grados[f.id]).sort((a, b) => grados[b.id] - grados[a.id]).slice(0, 5);

  useEffect(() => {
    if (!caja.current || !relaciones) return;
    const visibles = new Set(fichas.filter((f) => tipos.has(f.tipo)).map((f) => f.id));
    const color = (t) => mundo.categorias.find((c) => c.clave === t)?.color || "#d6b26e";
    const cy = cytoscape({
      container: caja.current,
      elements: [
        ...fichas.filter((f) => visibles.has(f.id)).map((f) => ({ data: { id: f.id, nombre: f.nombre, color: color(f.tipo), peso: grados[f.id] || 0 } })),
        ...aristas.filter((e) => visibles.has(e.data.source) && visibles.has(e.data.target)),
      ],
      style: [
        { selector: "node", style: { "background-color": "data(color)", label: "data(nombre)", color: "#e9e3ef", "font-size": 11, "text-valign": "bottom", "text-margin-y": 5,
          width: "mapData(peso, 0, 10, 14, 40)", height: "mapData(peso, 0, 10, 14, 40)", "border-width": 2, "border-color": "#110e17", "text-outline-color": "#0b0910", "text-outline-width": 2 } },
        { selector: "edge", style: { width: 1.4, "line-color": "#4a4058", "curve-style": "bezier", label: "data(etiqueta)", "font-size": 9, color: "#9d94a9", "text-rotation": "autorotate", "text-outline-color": "#0b0910", "text-outline-width": 2, "target-arrow-shape": "triangle", "target-arrow-color": "#4a4058", "arrow-scale": 0.7 } },
        { selector: "edge.campo", style: { "line-style": "dashed", "line-color": "#6b5b45", "target-arrow-color": "#6b5b45" } },
        { selector: "edge.mencion", style: { "line-style": "dotted", "line-color": "#3a3346", "target-arrow-shape": "none" } },
        { selector: "node:selected", style: { "border-color": "#d6b26e", "border-width": 3 } },
      ],
      layout: { name: "cose", animate: false, nodeRepulsion: 9000, idealEdgeLength: 90, padding: 30 },
      wheelSensitivity: 0.25,
    });
    // Con pocas fichas el acercamiento automático queda enorme: se limita
    if (cy.zoom() > 1.3) { cy.zoom(1.3); cy.center(); }
    cy.on("tap", "node", (e) => ir(`/m/${mid}/f/${e.target.id()}`));
    return () => cy.destroy();
  }, [fichas, aristas, tipos, relaciones, mundo.categorias, mid, ir, grados]);

  const cambiar = (k) => setVer((v) => ({ ...v, [k]: !v[k] }));
  const conTipos = mundo.categorias.filter((c) => fichas.some((f) => f.tipo === c.clave));
  return (
    <>
      <div className="cabeza"><div><div className="eyebrow">Conexiones</div><h1>Relaciones</h1></div></div>
      {fichas.length < 2 ? (
        <div className="vacio-grande"><div className="simbolo">⟁</div><div>Hacen falta al menos dos fichas para ver cómo se conectan.</div><Link className="btn oro" to={`/m/${mid}`}>Ir al compendio</Link></div>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 12 }}>
            {[["manuales", "Relaciones"], ["campos", "Campos (especie, líder…)"], ["menciones", "Menciones @"]].map(([k, n]) => (
              <label key={k} className="chip" style={{ cursor: "pointer" }}><input type="checkbox" checked={ver[k]} onChange={() => cambiar(k)} /> {n}</label>
            ))}
          </div>
          <div className="chips" style={{ marginBottom: 14 }}>
            {conTipos.map((c) => (
              <label key={c.clave} className="chip" style={{ cursor: "pointer", opacity: tipos.has(c.clave) ? 1 : 0.45 }}>
                <input type="checkbox" checked={tipos.has(c.clave)} onChange={() => setTipos((t) => { const n = new Set(t); n.has(c.clave) ? n.delete(c.clave) : n.add(c.clave); return n; })} />
                <span style={{ color: c.color }}>{c.icono}</span> {c.nombre}
              </label>
            ))}
          </div>
          <div ref={caja} className="lienzo-grafo" aria-label="Red de relaciones: toca un punto para abrir su ficha" />
          {top.length > 0 && (
            <section className="bloque">
              <h2>Los más conectados</h2>
              <div className="chips">{top.map((f) => <Link key={f.id} className="chip" to={`/m/${mid}/f/${f.id}`}>{f.nombre} <span className="tipo-rel">{grados[f.id]} conexiones</span></Link>)}</div>
            </section>
          )}
        </>
      )}
    </>
  );
}
