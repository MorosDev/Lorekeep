// src/plantillas.js — los tipos de ficha y qué pregunta cada uno.
// Para un tipo nuevo: una entrada en CATEGORIAS_BASE (se copia a cada mundo nuevo; cada mundo puede editar las suyas)
// y, si quieres campos propios, una entrada en PLANTILLAS con la misma clave.
//
// Campos de "datos": { clave, nombre, tipo: "texto" | "ref" (apunta a otra ficha) | "lista" (opciones), ref?: tipo al que apunta, opciones? }
// "listas": listas de frases (motivaciones, rasgos…) · "secciones": pestañas de texto largo

export const CATEGORIAS_BASE = [
  { clave: "personaje", nombre: "Personajes", uno: "Personaje", icono: "✦", color: "#c9a4ff", grupo: "Gente" },
  { clave: "criatura", nombre: "Criaturas", uno: "Criatura", icono: "☠", color: "#e07a7a", grupo: "Gente" },
  { clave: "especie", nombre: "Especies", uno: "Especie", icono: "❦", color: "#8fd3a8", grupo: "Gente" },
  { clave: "faccion", nombre: "Facciones", uno: "Facción", icono: "⚑", color: "#e7b45c", grupo: "Gente" },
  { clave: "deidad", nombre: "Deidades", uno: "Deidad", icono: "☼", color: "#f0d78a", grupo: "Gente" },
  { clave: "lugar", nombre: "Lugares", uno: "Lugar", icono: "⌖", color: "#7fb6e8", grupo: "Lugares" },
  { clave: "nacion", nombre: "Naciones", uno: "Nación", icono: "♜", color: "#9aa7ff", grupo: "Lugares" },
  { clave: "cultura", nombre: "Culturas", uno: "Cultura", icono: "☯", color: "#d9a0c8", grupo: "Sociedad" },
  { clave: "sistema", nombre: "Sistemas", uno: "Sistema", icono: "⚖", color: "#b7c08a", grupo: "Sociedad" },
  { clave: "magia", nombre: "Magia y poderes", uno: "Poder", icono: "✧", color: "#a8e0ff", grupo: "Cosas" },
  { clave: "objeto", nombre: "Objetos", uno: "Objeto", icono: "⚱", color: "#d1b48c", grupo: "Cosas" },
  { clave: "historia", nombre: "Historias", uno: "Historia", icono: "❧", color: "#e3c9a0", grupo: "Escritura" },
  { clave: "nota", nombre: "Notas", uno: "Nota", icono: "✎", color: "#a59fb3", grupo: "Escritura" },
];

const T = (clave, nombre) => ({ clave, nombre, tipo: "texto" });
const R = (clave, nombre, ref) => ({ clave, nombre, tipo: "ref", ref });
const O = (clave, nombre, opciones) => ({ clave, nombre, tipo: "lista", opciones });

export const PLANTILLAS = {
  personaje: {
    datos: [O("importancia", "Importancia", ["Principal", "Secundario", "Menor", "Mencionado"]), R("especie", "Especie", "especie"), T("genero", "Género"), T("edad", "Edad"), T("rol", "Rol"), R("faccion", "Facción", "faccion"), R("origen", "Origen", "lugar"), O("estado", "Estado", ["Vivo", "Muerto", "Desaparecido", "Desconocido"])],
    listas: [["motivaciones", "Motivaciones"], ["virtudes", "Virtudes"], ["defectos", "Defectos"]],
    secciones: ["Apariencia", "Historia", "Personalidad", "Extra"],
  },
  criatura: {
    datos: [O("peligro", "Peligro", ["Inofensiva", "Baja", "Media", "Alta", "Mortal"]), T("tamano", "Tamaño"), R("habitat", "Hábitat", "lugar"), T("dieta", "Dieta"), T("rareza", "Rareza")],
    listas: [["habilidades", "Habilidades"], ["debilidades", "Debilidades"]],
    secciones: ["Descripción", "Comportamiento", "Leyendas"],
  },
  especie: {
    datos: [T("longevidad", "Longevidad"), R("origen", "Origen", "lugar"), T("poblacion", "Población"), T("idioma", "Idioma")],
    listas: [["rasgos", "Rasgos"], ["costumbres", "Costumbres"]],
    secciones: ["Biología", "Sociedad", "Historia"],
  },
  faccion: {
    datos: [O("tipoFaccion", "Tipo", ["Gremio", "Orden", "Culto", "Ejército", "Casa noble", "Empresa", "Rebeldes", "Otro"]), R("lider", "Líder", "personaje"), R("sede", "Sede", "lugar"), T("lema", "Lema"), T("fundacion", "Fundación")],
    listas: [["objetivos", "Objetivos"], ["recursos", "Recursos"]],
    secciones: ["Descripción", "Estructura", "Historia"],
  },
  deidad: {
    datos: [T("dominio", "Dominio"), T("simbolo", "Símbolo"), O("alineacion", "Naturaleza", ["Benévola", "Neutral", "Cruel", "Caótica", "Desconocida"]), R("panteon", "Panteón / culto", "faccion")],
    listas: [["mandamientos", "Mandamientos"], ["seguidores", "Seguidores"]],
    secciones: ["Mito", "Culto", "Manifestaciones"],
  },
  lugar: {
    datos: [O("tipoLugar", "Tipo", ["Ciudad", "Pueblo", "Región", "Continente", "Bosque", "Montaña", "Ruinas", "Mar", "Edificio", "Plano", "Otro"]), R("dentro", "Está en", "lugar"), R("nacion", "Nación", "nacion"), T("poblacion", "Población"), T("clima", "Clima")],
    listas: [["lugaresClave", "Lugares clave"], ["recursos", "Recursos"]],
    secciones: ["Descripción", "Historia", "Geografía"],
  },
  nacion: {
    datos: [T("capital", "Capital"), R("gobernante", "Gobernante", "personaje"), R("sistemaPolitico", "Gobierno", "sistema"), R("sistemaEconomico", "Economía", "sistema"), R("culturaPrincipal", "Cultura", "cultura"), T("moneda", "Moneda"), T("poblacion", "Población")],
    listas: [["aliados", "Aliados"], ["enemigos", "Enemigos"], ["leyes", "Leyes"]],
    secciones: ["Descripción", "Política", "Historia"],
  },
  cultura: {
    datos: [T("idioma", "Idioma"), R("religion", "Religión", "deidad"), T("arte", "Arte"), T("vestimenta", "Vestimenta")],
    listas: [["tradiciones", "Tradiciones"], ["tabues", "Tabúes"], ["fiestas", "Fiestas"]],
    secciones: ["Costumbres", "Valores", "Historia"],
  },
  sistema: {
    datos: [O("tipoSistema", "Tipo", ["Político", "Económico", "Religioso", "Social", "Legal", "Militar", "Otro"]), T("quienManda", "Quién manda"), T("alcance", "Alcance")],
    listas: [["reglas", "Reglas"], ["fallas", "Fallas"]],
    secciones: ["Cómo funciona", "Historia", "Conflictos"],
  },
  magia: {
    datos: [T("fuente", "Fuente"), T("costo", "Costo"), O("raro", "Rareza", ["Común", "Poco común", "Rara", "Única", "Prohibida"])],
    listas: [["reglas", "Reglas"], ["limites", "Límites"]],
    secciones: ["Cómo funciona", "Usuarios", "Historia"],
  },
  objeto: {
    datos: [O("tipoObjeto", "Tipo", ["Arma", "Armadura", "Reliquia", "Herramienta", "Libro", "Joya", "Otro"]), R("dueno", "Dueño", "personaje"), R("ubicacion", "Ubicación", "lugar"), O("rareza", "Rareza", ["Común", "Rara", "Legendaria", "Única"])],
    listas: [["poderes", "Poderes"]],
    secciones: ["Descripción", "Historia"],
  },
  historia: {
    datos: [O("estadoEscritura", "Estado", ["Idea", "Borrador", "Escribiendo", "Revisión", "Terminada"]), R("protagonista", "Protagonista", "personaje"), T("genero", "Género")],
    listas: [["capitulos", "Capítulos"]],
    secciones: ["Sinopsis", "Texto", "Ideas"],
  },
  nota: { datos: [], listas: [], secciones: ["Nota"] },
};

// Plantilla de un tipo que el usuario inventó (o que no tiene plantilla propia)
export const PLANTILLA_LIBRE = { datos: [T("tipoLibre", "Tipo")], listas: [["rasgos", "Rasgos"]], secciones: ["Descripción", "Historia"] };
export const plantillaDe = (tipo) => PLANTILLAS[tipo] || PLANTILLA_LIBRE;

// Tipos de relación sugeridos (se puede escribir cualquier otro)
export const RELACIONES_SUGERIDAS = [
  "padre / madre de", "hijo / hija de", "hermano / hermana de", "pareja de", "amigo de", "rival de", "enemigo de",
  "mentor de", "aprendiz de", "sirve a", "líder de", "miembro de", "aliado de", "creó", "destruyó", "vive en", "nació en", "gobierna", "adora a", "posee",
];
// Las que cuentan como familia, para el árbol genealógico (cuando llegue)
export const FAMILIA = ["padre / madre de", "hijo / hija de", "hermano / hermana de", "pareja de"];
