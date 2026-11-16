// src/vistas/EditarFicha.jsx — editar una ficha. Guarda solo mientras escribes (no hay botón de guardar que olvidar).
import React, { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { db, guardarFicha, guardarImagen, renombrarMenciones } from "../db";
import { plantillaDe } from "../plantillas";
import { useImagen, BuscarFicha, ElegirImagen, Ventana } from "../componentes/util.jsx";

// Campo que apunta a otra ficha (Especie → "Demonio")
function CampoRef({ d, valor, cambiar, mid, fichas }) {
  const elegida = valor?.ref ? fichas.find((f) => f.id === valor.ref) : null;
  return (
    <div className="campo"><span>{d.nombre}</span>
      {elegida
        ? <div className="chips"><span className="chip">{elegida.nombre}<button type="button" className="btn solo" style={{ padding: "0 6px", border: 0, background: "none" }} onClick={() => cambiar(null)} aria-label={`Quitar ${d.nombre}`}>×</button></span></div>
        : <BuscarFicha mid={mid} tipo={d.ref} placeholder={`Elegir ${d.nombre.toLowerCase()}…`} alElegir={(f) => cambiar({ ref: f.id })} />}
    </div>
  );
}

export default function EditarFicha() {
  const { mundo, fichas, mid } = useOutletContext();
  const { fid } = useParams();
  const original = fichas.find((x) => x.id === fid);
  const [f, setF] = useState(original || null);
  const [estado, setEstado] = useState("");
  const [pestana, setPestana] = useState(0);
  const url = useImagen(f?.imagen);
  const primera = useRef(true);
  // El nombre con el que se abrió (o el último ya revisado), para saber si cambió
  const nombreAntes = useRef(original?.nombre);
  const [renombre, setRenombre] = useState(null); // { viejo, nuevo, n } mientras se pregunta
  const reloj = useRef(0);

  // Si la ficha llega después (recarga de la página), se toma una sola vez
  useEffect(() => { if (!f && original) { setF(original); nombreAntes.current = original.nombre; } }, [original, f]);

  // Al terminar de escribir el nombre: si otros textos mencionaban el nombre viejo, pregunta si cambiarlos
  const revisarNombre = async () => {
    const viejo = nombreAntes.current, nuevo = f.nombre.trim();
    if (!viejo || !nuevo || viejo === nuevo) return;
    const n = await renombrarMenciones(mid, viejo, nuevo, true);
    if (n) setRenombre({ viejo, nuevo, n });
    else nombreAntes.current = nuevo;
  };

  // Guardado automático medio segundo después de dejar de escribir.
  // "pendiente" guarda la última versión sin guardar: si sales antes del medio segundo, se guarda al salir.
  const pendiente = useRef(null);
  useEffect(() => {
    if (!f) return;
    if (primera.current) { primera.current = false; return; }
    setEstado("Guardando…");
    pendiente.current = f;
    clearTimeout(reloj.current);
    reloj.current = setTimeout(async () => { pendiente.current = null; await guardarFicha(f); setEstado("Guardado ✓"); }, 500);
  }, [f]);
  useEffect(() => () => { clearTimeout(reloj.current); if (pendiente.current) guardarFicha(pendiente.current); }, []);

  if (!f) return original === undefined ? <p>Esa ficha no existe. <Link to={`/m/${mid}`}>Volver</Link></p> : null;
  const P = plantillaDe(f.tipo);
  const pon = (campo, valor) => setF((x) => ({ ...x, [campo]: valor }));
  const ponEn = (grupo, clave, valor) => setF((x) => ({ ...x, [grupo]: { ...(x[grupo] || {}), [clave]: valor } }));
  const extras = f.extras || [];
  const seccion = P.secciones[Math.min(pestana, P.secciones.length - 1)];

  return (
    <>
      <div className="cabeza">
        <Link className="btn solo" to={`/m/${mid}/f/${f.id}`} aria-label="Ver ficha">←</Link>
        <div><div className="eyebrow">Editando</div><h1>{f.nombre || "Sin nombre"}</h1></div>
        <div className="acciones"><span className="ayuda" role="status" style={{ alignSelf: "center" }}>{estado}</span><Link className="btn oro" to={`/m/${mid}/f/${f.id}`}>Listo</Link></div>
      </div>

      <div className="ficha">
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 12 }}>
            <label className="campo"><span>Nombre</span><input type="text" id="f-nombre" value={f.nombre} onChange={(e) => pon("nombre", e.target.value)} onBlur={revisarNombre} /></label>
            <label className="campo"><span>Tipo</span>
              <select id="f-tipo" value={f.tipo} onChange={(e) => pon("tipo", e.target.value)}>
                {mundo.categorias.map((c) => <option key={c.clave} value={c.clave}>{c.icono} {c.uno}</option>)}
              </select>
            </label>
          </div>
          <label className="campo"><span>Descripción</span>
            <textarea id="f-resumen" rows={7} value={f.resumen} onChange={(e) => pon("resumen", e.target.value)} placeholder="¿Quién es, qué es, por qué importa?" />
            <span className="ayuda">Escribe <b>@Nombre</b> (o <b>@[Nombre con espacios]</b>) para enlazar otra ficha.</span>
          </label>
          <label className="campo"><span>Etiquetas</span>
            <input type="text" id="f-etiquetas" value={(f.etiquetas || []).join(", ")} onChange={(e) => pon("etiquetas", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="separadas por comas: villano, arco 2, sin terminar" />
          </label>
        </div>

        <aside className="costado">
          <div className="imagen">{url ? <img src={url} alt="" /> : <span className="ayuda" style={{ fontSize: 14 }}>Sin imagen</span>}</div>
          <div className="chips">
            <ElegirImagen alElegir={async (a) => { const vieja = f.imagen; pon("imagen", await guardarImagen(mid, a)); if (vieja) db.imagenes.delete(vieja); }}>{f.imagen ? "Cambiar imagen" : "Subir imagen"}</ElegirImagen>
            {f.imagen && <button type="button" className="btn peligro" onClick={async () => { await db.imagenes.delete(f.imagen); pon("imagen", null); }}>Quitar</button>}
          </div>
          {P.datos.map((d) =>
            d.tipo === "ref" ? <CampoRef key={d.clave} d={d} valor={f.datos?.[d.clave]} cambiar={(v) => ponEn("datos", d.clave, v)} mid={mid} fichas={fichas} />
            : d.tipo === "lista" ? (
              <label key={d.clave} className="campo"><span>{d.nombre}</span>
                <select id={`d-${d.clave}`} value={f.datos?.[d.clave] || ""} onChange={(e) => ponEn("datos", d.clave, e.target.value)}>
                  <option value="">—</option>{d.opciones.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>)
            : <label key={d.clave} className="campo"><span>{d.nombre}</span><input type="text" id={`d-${d.clave}`} value={f.datos?.[d.clave] || ""} onChange={(e) => ponEn("datos", d.clave, e.target.value)} /></label>
          )}
          {/* Campos propios: lo que la plantilla no pregunta */}
          {extras.map((x, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.3fr) auto", gap: 6 }}>
              <input type="text" id={`x-n-${i}`} aria-label="Nombre del campo" value={x.nombre} placeholder="Campo" onChange={(e) => pon("extras", extras.map((y, j) => (j === i ? { ...y, nombre: e.target.value } : y)))} />
              <input type="text" id={`x-v-${i}`} aria-label="Valor" value={x.valor} placeholder="Valor" onChange={(e) => pon("extras", extras.map((y, j) => (j === i ? { ...y, valor: e.target.value } : y)))} />
              <button type="button" className="btn solo" onClick={() => pon("extras", extras.filter((_, j) => j !== i))} aria-label="Quitar campo">×</button>
            </div>
          ))}
          <button type="button" className="btn" onClick={() => pon("extras", [...extras, { nombre: "", valor: "" }])}>＋ Campo propio</button>
        </aside>
      </div>

      {P.listas.length > 0 && (
        <div className="bloque listas">
          {P.listas.map(([k, n]) => (
            <label key={k} className="campo"><span>{n} <i>(una por renglón)</i></span>
              <textarea id={`l-${k}`} rows={4} style={{ minHeight: 90, fontSize: 15 }} value={(f.listas?.[k] || []).join("\n")}
                onChange={(e) => ponEn("listas", k, e.target.value.split("\n").map((x) => x.replace(/^\s*[-•]\s*/, "")).filter((x, i, a) => x.trim() || i === a.length - 1))} />
            </label>
          ))}
        </div>
      )}

      <section className="bloque">
        <h2>Sobre {f.nombre}</h2>
        <div className="pestanas" role="tablist">
          {P.secciones.map((s, i) => <button key={s} type="button" role="tab" aria-selected={s === seccion} onClick={() => setPestana(i)}>{s}{f.secciones?.[s]?.trim() ? " ·" : ""}</button>)}
        </div>
        <textarea id={`s-${seccion}`} rows={12} value={f.secciones?.[seccion] || ""} onChange={(e) => ponEn("secciones", seccion, e.target.value)} placeholder={`${seccion} de ${f.nombre}…`} />
      </section>
      {renombre && (
        <Ventana titulo="¿Cambiar también las menciones?" alCerrar={() => { nombreAntes.current = renombre.nuevo; setRenombre(null); }}>
          <p style={{ margin: 0 }}>En otros textos hay <b>{renombre.n}</b> {renombre.n === 1 ? "mención" : "menciones"} de <b>@{renombre.viejo}</b>. Si no las cambias, quedarán en gris (sin enlace).</p>
          <div className="botones">
            <button className="btn" onClick={() => { nombreAntes.current = renombre.nuevo; setRenombre(null); }}>Dejarlas así</button>
            <button className="btn oro" onClick={async () => { await renombrarMenciones(mid, renombre.viejo, renombre.nuevo); nombreAntes.current = renombre.nuevo; setRenombre(null); setEstado(`Cambiadas ${renombre.n} menciones ✓`); }}>Cambiarlas a @{renombre.nuevo}</button>
          </div>
        </Ventana>
      )}
    </>
  );
}
