// Documentación de la Sala 24/7: una página Markdown por pantalla, en app/ayuda.
// De acá leen el sitio de ayuda (/ayuda), el popup de cada pantalla, la guía de
// primera vez y el agente de ayuda. Una sola fuente, versionada en git.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, changed, now } from "./store.js";
import * as catIA from "./ia/catalogo.js";
import { completar } from "./ia/cliente.js";

export const DIR = process.env.AYUDA_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ayuda");
export const DIR_CAPTURAS = path.join(DIR, "capturas");

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const STOP = new Set(("que los las del con por para una uno como esta este estos estas hay son sus cual cuales donde cuanto cuanta cuantos cuando quien quienes " +
  "tengo tenemos hoy mis nos les ese esa eso puedo puede pueden podes hago hace hacer veo ver ves tiene tienen algo sobre desde entre muy mas").split(" "));
// Normalización mínima del español: saca plurales y terminaciones verbales frecuentes,
// para que «envío», «enviar» y «enviamos» se encuentren entre sí.
const SUFIJOS = ["amos", "emos", "imos", "aron", "ieron", "ando", "iendo", "ados", "adas", "ado", "ada", "ar", "er", "ir", "as", "es", "os", "o", "a", "e", "s"];
function raiz(w) {
  let r = w.replace(/prueb/, "prob").replace(/cuest/, "cost");
  for (const s of SUFIJOS) if (r.length - s.length >= 4 && r.endsWith(s)) { r = r.slice(0, -s.length); break; }
  return r.slice(0, 6);
}
const stems = (s) => norm(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(raiz);
export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Frontmatter simple: `clave: valor` por línea; `guia` va en JSON. */
function parsear(archivo) {
  const crudo = fs.readFileSync(archivo, "utf8").replace(/\r\n/g, "\n");
  const m = crudo.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (m) {
    for (const linea of m[1].split("\n")) {
      const i = linea.indexOf(":");
      if (i > 0) meta[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
    }
  }
  const cuerpo = (m ? m[2] : crudo).trim();
  const id = path.basename(archivo, ".md");
  let guia = null;
  try { guia = meta.guia ? JSON.parse(meta.guia) : null; } catch { guia = null; }
  const secciones = [];
  let actual = { titulo: meta.titulo || id, ancla: "", texto: [] };
  for (const linea of cuerpo.split("\n")) {
    const h = linea.match(/^##\s+(.*)$/);
    if (h) {
      secciones.push(actual);
      actual = { titulo: h[1].trim(), ancla: slug(h[1]), texto: [] };
    } else actual.texto.push(linea);
  }
  secciones.push(actual);
  return {
    id, titulo: meta.titulo || id, grupo: meta.grupo || "Otros", orden: Number(meta.orden || 999),
    ruta: meta.ruta || null, resumen: meta.resumen || "", roles: meta.roles || "",
    captura: meta.captura || null, relacionadas: (meta.relacionadas || "").split(",").map((x) => x.trim()).filter(Boolean),
    guia, cuerpo,
    secciones: secciones.map((s) => ({ ...s, texto: s.texto.join("\n").trim() })).filter((s) => s.texto)
  };
}

let PAGINAS = [];
// Peso de cada palabra según lo rara que es en la documentación: «misión» pesa más que «pantalla».
let IDF = new Map();
export function cargar() {
  if (!fs.existsSync(DIR)) { PAGINAS = []; return; }
  PAGINAS = fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => parsear(path.join(DIR, f)))
    .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo));
  const df = new Map();
  let n = 0;
  for (const p of PAGINAS) for (const s of p.secciones) {
    n++;
    for (const w of new Set(stems(`${p.titulo} ${s.titulo} ${s.texto}`))) df.set(w, (df.get(w) || 0) + 1);
  }
  IDF = new Map([...df].map(([w, c]) => [w, Math.log(1 + n / c)]));
}
cargar();

export const GRUPOS = ["Empezar", "La compañía", "La Sala", "Comercial", "R&D", "Operaciones", "Producción", "Finanzas", "Trabajo de los agentes", "Administración", "Conceptos", "Referencia"];

export function indice() {
  return PAGINAS.map(({ id, titulo, grupo, orden, ruta, resumen, captura, guia }) => ({ id, titulo, grupo, orden, ruta, resumen, captura, tieneGuia: Boolean(guia?.length) }));
}

export const pagina = (id) => {
  const p = PAGINAS.find((x) => x.id === id);
  if (!p) return null;
  const { secciones, ...resto } = p;
  return { ...resto, relacionadas: p.relacionadas.map((r) => PAGINAS.find((x) => x.id === r)).filter(Boolean).map(({ id: rid, titulo, resumen }) => ({ id: rid, titulo, resumen })) };
};

/** La página que corresponde a una ruta de la app: la de prefijo más largo. */
export function paraRuta(ruta) {
  const r = String(ruta || "").replace(/^#?\/?/, "").split("?")[0];
  const partes = r.split("/").filter(Boolean);
  for (let n = partes.length; n > 0; n--) {
    const intento = partes.slice(0, n).join("/");
    const hit = PAGINAS.find((p) => p.ruta === intento);
    if (hit) return hit.id;
  }
  // Rutas con un id al final (tareas/tsk_…, sala/comercial): se busca por la primera parte.
  return PAGINAS.find((p) => p.ruta === partes[0])?.id || "inicio";
}

/** Búsqueda por secciones: devuelve las mejores con un fragmento. */
export function buscar(q, { limite = 8, pagina: preferida = null } = {}) {
  const t = new Set(stems(q));
  if (!t.size) return [];
  // Una palabra que no está en la documentación pesa como una palabra de rareza media:
  // cuenta para detectar preguntas fuera de tema sin tumbar las que usan otra forma verbal.
  const valores = [...IDF.values()].sort((a, b) => a - b);
  const medio = valores[Math.floor(valores.length * 0.8)] || 1;
  const peso = (w) => IDF.get(w) || medio;
  const total = [...t].reduce((a, w) => a + peso(w), 0);
  const base = preferida ? PAGINAS.find((p) => p.id === preferida)?.ruta?.split("/")[0] : null;
  const res = [];
  for (const p of PAGINAS) {
    const enTitulo = new Set(stems(p.titulo));
    for (const s of p.secciones) {
      let score = 0;
      let cubierto = 0;
      const enSeccion = new Set(stems(s.titulo));
      const enCuerpo = new Set(stems(s.texto));
      for (const w of t) {
        if (enTitulo.has(w)) score += 2 * peso(w);
        if (enSeccion.has(w)) score += 1.5 * peso(w);
        if (enCuerpo.has(w)) score += peso(w);
        if (enTitulo.has(w) || enSeccion.has(w) || enCuerpo.has(w)) cubierto += peso(w);
      }
      const cobertura = total ? cubierto / total : 0;
      // La página de la pantalla donde está la persona, y las de su misma solución, pesan más.
      if (p.id === preferida) score *= 1.5;
      else if (base && p.ruta?.startsWith(base)) score *= 1.2;
      if (score > 0) res.push({ pagina: p.id, paginaTitulo: p.titulo, seccion: s.titulo, ancla: s.ancla, score, cobertura, texto: s.texto, fragmento: fragmento(s.texto, t) });
    }
  }
  return res.sort((a, b) => b.score - a.score).slice(0, limite);
}

function fragmento(texto, t) {
  const plano = texto.replace(/[#*_`>|]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
  const palabras = plano.split(" ");
  const i = palabras.findIndex((w) => t.has(raiz(norm(w).replace(/[^a-z0-9ñ]/g, ""))));
  const desde = Math.max(0, i - 8);
  return (desde > 0 ? "…" : "") + palabras.slice(desde, desde + 38).join(" ") + (palabras.length > desde + 38 ? "…" : "");
}

/* ---------- Agente de ayuda ---------- */

export const esPreguntaDeUso = (texto) => {
  const t = norm(texto);
  return /\b(como (uso|hago|se usa|programo|apruebo|encargo|creo|cargo|agrego|cambio|veo|funciona|configuro)|para que sirve|donde (veo|esta|encuentro|se ve|cargo)|que significa|que es el|que es la)\b/.test(t);
};

function modeloAyuda() {
  const p = catIA.perfil("rapido");
  const cadena = [p?.principal, ...(p?.respaldo || [])].map(catIA.modelo).filter(Boolean);
  return cadena.find((m) => catIA.modeloListo(m).listo) || null;
}

/**
 * Responde una duda de uso SOLO con la documentación. Con un modelo disponible redacta;
 * sin modelo devuelve las secciones más relevantes. Siempre cita las páginas.
 */
export async function responder({ pregunta, ruta = null, usuario = null, rol = null }) {
  const preferida = ruta ? paraRuta(ruta) : null;
  const hallados = buscar(pregunta, { limite: 4, pagina: preferida });
  const fuentes = [...new Map(hallados.map((h) => [`${h.pagina}#${h.ancla}`, { id: h.pagina, titulo: h.paginaTitulo, seccion: h.seccion, ancla: h.ancla }])).values()];
  // Alcanza si la mejor sección cubre la mayor parte de lo que se preguntó (ponderado por rareza).
  const suficiente = hallados.length && hallados.slice(0, 3).some((h) => h.cobertura >= 0.55);

  if (!suficiente) {
    db.ayudaSinRespuesta ||= [];
    db.ayudaSinRespuesta.unshift({ ts: now(), usuario, rol, pregunta: String(pregunta).slice(0, 300), ruta });
    if (db.ayudaSinRespuesta.length > 500) db.ayudaSinRespuesta.length = 500;
    changed("ayuda");
    return {
      modo: "sin-respuesta", fuentes: [],
      respuesta: "No encuentro eso en la documentación. Dejé registrada la pregunta para que se documente. Mientras tanto, probá con otras palabras o mirá el índice de la ayuda."
    };
  }

  const m = modeloAyuda();
  if (m) {
    const contexto = hallados.map((h) => `### ${h.paginaTitulo} › ${h.seccion} (página: ${h.pagina}#${h.ancla})\n${h.texto}`).join("\n\n");
    try {
      const r = await completar(m, [
        { role: "system", content: `Sos el agente de ayuda de la Sala 24/7 del Laboratorio Copahue. Respondés dudas de USO del sistema en español rioplatense, corto y concreto, con pasos numerados cuando haga falta. Usá SOLO la documentación que te paso; si no alcanza, decilo. No inventes botones ni pantallas.${rol ? ` Quien pregunta tiene el rol ${rol}: si algo no lo puede hacer su rol, aclaralo.` : ""}` },
        { role: "user", content: `DOCUMENTACIÓN:\n${contexto}\n\nPREGUNTA${ruta ? ` (está en la pantalla ${ruta})` : ""}: ${pregunta}` }
      ], { maxTokens: 700 });
      catIA.registrarConsumo({ ts: now(), taskId: null, agentId: "ayuda", paso: "ayuda", proveedor: m.proveedor, modelo: m.id, tokensIn: r.tokensIn, tokensOut: r.tokensOut, costoUSD: r.costoUSD, estado: "ok", simulado: false });
      if (r.texto) return { modo: "ia", respuesta: r.texto, fuentes, modelo: m.nombre, costoUSD: r.costoUSD };
    } catch { /* si el modelo falla, se responde con la búsqueda */ }
  }
  const mejor = hallados[0];
  const parrafos = mejor.texto.split(/\n{2,}/).slice(0, 3).join("\n\n");
  return {
    modo: "busqueda", fuentes,
    respuesta: `Según **${mejor.paginaTitulo} › ${mejor.seccion}**:\n\n${parrafos}${hallados.length > 1 ? `\n\nTambién puede servirte: ${fuentes.slice(1, 3).map((f) => `${f.titulo} › ${f.seccion}`).join("; ")}.` : ""}`
  };
}

/** Respuesta corta para el chat de la Sala, con link a la ayuda. Sincrónica: sin modelo. */
export function respuestaSala(texto) {
  const hallados = buscar(texto, { limite: 3 });
  if (!hallados.length || hallados[0].cobertura < 0.55) return null;
  const h = hallados[0];
  const parrafos = h.texto.split(/\n{2,}/).slice(0, 2).join("\n\n");
  return `Eso es una duda de uso de la Sala. Según la ayuda (**${h.paginaTitulo} › ${h.seccion}**):\n\n${parrafos}\n\n[Abrir la ayuda completa](/ayuda#/${h.pagina}/${h.ancla})`;
}

/* ---------- Guías de primera vez, por usuario ---------- */

export function guiasVistas(usuario) {
  return (db.guiasVistas || {})[usuario] || [];
}
export function marcarGuia(usuario, id) {
  db.guiasVistas ||= {};
  const lista = new Set(db.guiasVistas[usuario] || []);
  lista.add(String(id).slice(0, 60));
  db.guiasVistas[usuario] = [...lista];
  changed("ayuda");
}
export function reiniciarGuias(usuario) {
  db.guiasVistas ||= {};
  db.guiasVistas[usuario] = [];
  changed("ayuda");
}
export const guia = (id) => PAGINAS.find((p) => p.id === id)?.guia || null;
