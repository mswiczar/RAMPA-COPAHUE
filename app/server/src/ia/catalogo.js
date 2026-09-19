// Catálogo de inteligencia: proveedores, modelos con precio, perfiles y asignaciones.
// Se guarda en la base (db.ia) y lo administra Dirección desde la pantalla Modelos.
// Las claves NO se guardan acá: cada proveedor dice en qué variable de entorno está la suya.
import { db, changed, HttpError } from "../store.js";

export const VERIFICADO = "2026-09-19";

/**
 * Tipos de conexión. Hoy todos los proveedores se hablan con el formato de OpenAI
 * (chat/completions), que DigitalOcean, DeepSeek, OpenRouter, Gemini, xAI y los
 * servidores locales aceptan. Los adaptadores nativos se suman cuando hagan falta.
 */
export const TIPOS = { openai: "Compatible con OpenAI" };

const PROVEEDORES_BASE = [
  { id: "digitalocean", nombre: "DigitalOcean", tipo: "openai", baseUrl: "https://inference.do-ai.run/v1", claveEnv: "DIGITALOCEAN_INFERENCE_KEY", habilitado: true, aptoDatosReales: false, notas: "Inferencia serverless. Una sola clave para modelos de Anthropic, OpenAI, DeepSeek, Meta, Mistral y otros." },
  { id: "deepseek", nombre: "DeepSeek", tipo: "openai", baseUrl: "https://api.deepseek.com", claveEnv: "DEEPSEEK_API_KEY", habilitado: true, aptoDatosReales: false, notas: "API directa. Precio más alto en horario pico: 01–04 y 06–10 UTC, lunes a viernes." },
  { id: "openrouter", nombre: "OpenRouter", tipo: "openai", baseUrl: "https://openrouter.ai/api/v1", claveEnv: "OPENROUTER_API_KEY", habilitado: false, aptoDatosReales: false, notas: "Plantilla. Cientos de modelos con una clave." },
  { id: "openai", nombre: "OpenAI", tipo: "openai", baseUrl: "https://api.openai.com/v1", claveEnv: "OPENAI_API_KEY", habilitado: false, aptoDatosReales: false, notas: "Plantilla." },
  { id: "anthropic", nombre: "Claude (Anthropic)", tipo: "openai", baseUrl: "https://api.anthropic.com/v1", claveEnv: "ANTHROPIC_API_KEY", habilitado: false, aptoDatosReales: false, notas: "Plantilla, por la capa compatible con OpenAI. Verificar al configurar." },
  { id: "gemini", nombre: "Gemini (Google)", tipo: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", claveEnv: "GEMINI_API_KEY", habilitado: false, aptoDatosReales: false, notas: "Plantilla, por la capa compatible con OpenAI. Verificar al configurar." },
  { id: "xai", nombre: "Grok (xAI)", tipo: "openai", baseUrl: "https://api.x.ai/v1", claveEnv: "XAI_API_KEY", habilitado: false, aptoDatosReales: false, notas: "Plantilla." },
  { id: "local", nombre: "Inferencia propia", tipo: "openai", baseUrl: "http://127.0.0.1:11434/v1", claveEnv: "", habilitado: false, aptoDatosReales: true, notas: "Plantilla para Ollama, vLLM o LM Studio en un servidor propio. Los datos no salen de la empresa." }
];

// Precios en USD por millón de tokens, tomados de las páginas de cada proveedor el 19/09/2026.
// En DigitalOcean el id del modelo se completa con «Traer modelos».
const DO = "Página de precios de DigitalOcean";
const MODELOS_BASE = [
  { proveedor: "deepseek", modelo: "deepseek-flash", nombre: "DeepSeek V4.1 Flash", entrada: 0.15, salida: 0.6, entradaPico: 0.3, salidaPico: 1.2, contexto: 1000000, razona: true, fuentePrecio: "Página de precios de DeepSeek" },
  { proveedor: "deepseek", modelo: "deepseek-v4-pro", nombre: "DeepSeek V4 Pro", entrada: 0.66, salida: 1.98, entradaPico: 1.32, salidaPico: 3.96, contexto: 1000000, razona: true, fuentePrecio: "Página de precios de DeepSeek" },
  { proveedor: "digitalocean", modelo: null, nombre: "Claude Sonnet 5", entrada: 2, salida: 10, razona: true, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "Claude Haiku 4.5", entrada: 1, salida: 5, razona: true, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "Claude Opus 5", entrada: 5, salida: 25, razona: true, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "GPT-5.4 mini", entrada: 0.75, salida: 4.5, razona: true, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "GPT-5.4 nano", entrada: 0.2, salida: 1.25, razona: false, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "DeepSeek V4.1 Flash", entrada: 0.3, salida: 1.2, razona: true, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "Llama 4 Maverick 17B 128E Instruct", entrada: 0.25, salida: 0.87, razona: false, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "Qwen 3.5 397B A17B", entrada: 0.55, salida: 3.5, razona: true, fuentePrecio: DO },
  { proveedor: "digitalocean", modelo: null, nombre: "Ministral 3 14B Instruct", entrada: 0.2, salida: 0.2, razona: false, fuentePrecio: DO }
];

export const slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const idModelo = (m) => `${m.proveedor}:${slug(m.nombre)}`;

const PERFILES_BASE = [
  { id: "rapido", nombre: "Rápido y barato", descripcion: "Tareas simples y repetitivas: avisos, resúmenes cortos, reportes programados.", principal: "deepseek:deepseek-v4-1-flash", respaldo: ["digitalocean:llama-4-maverick-17b-128e-instruct"], revisor: "digitalocean:gpt-5-4-nano", razonamiento: "none", roles: [] },
  { id: "equilibrado", nombre: "Equilibrado", descripcion: "La mayoría de los reportes e investigaciones: buen análisis a costo moderado.", principal: "deepseek:deepseek-v4-pro", respaldo: ["digitalocean:deepseek-v4-1-flash"], revisor: "digitalocean:claude-haiku-4-5", razonamiento: "low", roles: [] },
  { id: "profundo", nombre: "Razonamiento profundo", descripcion: "Decisiones de Dirección, escenarios, cruces entre áreas y todo lo que sale hacia afuera.", principal: "digitalocean:claude-sonnet-5", respaldo: ["deepseek:deepseek-v4-pro"], revisor: "deepseek:deepseek-v4-pro", razonamiento: "high", roles: ["direccion", "finanzas"] },
  { id: "local", nombre: "Privado (inferencia propia)", descripcion: "Para datos reales sensibles: el modelo corre en un servidor propio y los datos no salen.", principal: null, respaldo: [], revisor: null, razonamiento: "none", roles: [] }
];

/** Qué flujo corre según la complejidad. Dirección lo puede cambiar. */
export const FLUJOS = {
  directo: { id: "directo", nombre: "Directo", detalle: "Una sola inferencia. Para tareas simples.", pasos: ["borrador"] },
  revisado: { id: "revisado", nombre: "Borrador + revisión", detalle: "Un modelo escribe, otro de otro proveedor revisa y, si encuentra problemas, el primero corrige.", pasos: ["borrador", "revision", "correccion"] },
  verificado: { id: "verificado", nombre: "Revisión + verificación de cifras", detalle: "Como el anterior, y al final cada número de la respuesta se controla contra los datos del sistema. Lo que no tiene respaldo queda marcado.", pasos: ["borrador", "revision", "correccion", "verificacion"] }
};

export const TIPOS_TAREA = ["chat", "reporte", "investigacion", "email", "accion"];

function inicial() {
  return {
    proveedores: PROVEEDORES_BASE.map((p) => ({ ...p })),
    modelos: MODELOS_BASE.map((m) => ({ id: idModelo(m), contexto: null, habilitado: true, verificado: VERIFICADO, ...m })),
    perfiles: PERFILES_BASE.map((p) => ({ ...p })),
    // Por agente: un perfil por defecto y, opcionalmente, uno por tipo de tarea. null = automático por complejidad.
    asignaciones: { finanzas: { default: null, reporte: "equilibrado" }, ceo: { default: "profundo" }, operaciones: { default: "rapido" } },
    flujoPorNivel: { simple: "directo", media: "revisado", compleja: "verificado" },
    topes: { mensualUSD: 25, porAgenteUSD: {}, alertaPct: 80 },
    consumo: []
  };
}

/** Garantiza la configuración en la base sin pisar lo que Dirección ya cambió. */
export function asegurar() {
  if (!db.ia) {
    db.ia = inicial();
    changed("ia");
  }
  return db.ia;
}

export const cfg = () => asegurar();
export const proveedor = (id) => cfg().proveedores.find((p) => p.id === id);
export const modelo = (id) => cfg().modelos.find((m) => m.id === id);
export const perfil = (id) => cfg().perfiles.find((p) => p.id === id);

export function clave(p) {
  return p?.claveEnv ? process.env[p.claveEnv] || null : null;
}

/** Un proveedor está listo si está habilitado y tiene clave (la inferencia propia puede no pedir clave). */
export function estadoProveedor(p) {
  if (!p.habilitado) return { listo: false, motivo: "Deshabilitado" };
  if (p.claveEnv && !clave(p)) return { listo: false, motivo: `Falta la clave en ${p.claveEnv}` };
  return { listo: true, motivo: p.claveEnv ? "Clave configurada" : "Sin clave (servidor propio)" };
}

export function modeloListo(m) {
  if (!m || !m.habilitado) return { listo: false, motivo: "Modelo deshabilitado o inexistente" };
  const p = proveedor(m.proveedor);
  if (!p) return { listo: false, motivo: "Proveedor inexistente" };
  const e = estadoProveedor(p);
  if (!e.listo) return e;
  if (!m.modelo) return { listo: false, motivo: "Falta el id del modelo: usá «Traer modelos»" };
  return { listo: true, motivo: e.motivo };
}

/** Precio vigente: DeepSeek cobra más en horario pico. */
export function precio(m, fecha = new Date()) {
  const pico = m.entradaPico != null && esPico(fecha);
  return { entrada: pico ? m.entradaPico : m.entrada, salida: pico ? m.salidaPico : m.salida, pico };
}

function esPico(d) {
  const dia = d.getUTCDay();
  const h = d.getUTCHours();
  return dia >= 1 && dia <= 5 && ((h >= 1 && h < 4) || (h >= 6 && h < 10));
}

export const costo = (m, tokensIn, tokensOut, fecha) => {
  const p = precio(m, fecha);
  return ((tokensIn * (p.entrada || 0)) + (tokensOut * (p.salida || 0))) / 1e6;
};

/* ---------- Edición (solo Dirección, lo controla la ruta) ---------- */

const URL_OK = /^https:\/\/[^\s/]+|^http:\/\/(127\.0\.0\.1|localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?(\/|$)/;

export function guardarProveedor(id, datos) {
  const c = cfg();
  let p = c.proveedores.find((x) => x.id === id);
  if (!p) {
    const nuevoId = slug(datos.nombre || id);
    if (!nuevoId) throw new HttpError(400, "Poné un nombre al proveedor");
    if (c.proveedores.some((x) => x.id === nuevoId)) throw new HttpError(409, "Ya existe un proveedor con ese nombre");
    p = { id: nuevoId, nombre: "", tipo: "openai", baseUrl: "", claveEnv: "", habilitado: false, aptoDatosReales: false, notas: "" };
    c.proveedores.push(p);
  }
  if (datos.nombre !== undefined) p.nombre = String(datos.nombre).trim().slice(0, 60) || p.nombre;
  if (datos.baseUrl !== undefined) {
    const u = String(datos.baseUrl).trim().replace(/\/+$/, "");
    // https para servicios externos; http solo para un servidor propio en la red interna.
    if (!URL_OK.test(u)) throw new HttpError(400, "La dirección tiene que ser https, o http a un servidor de la red interna");
    p.baseUrl = u;
  }
  if (datos.claveEnv !== undefined) {
    const v = String(datos.claveEnv).trim();
    if (v && !/^[A-Z][A-Z0-9_]{2,63}$/.test(v)) throw new HttpError(400, "El nombre de la variable va en mayúsculas, por ejemplo MI_PROVEEDOR_KEY");
    p.claveEnv = v;
  }
  if (datos.tipo !== undefined && TIPOS[datos.tipo]) p.tipo = datos.tipo;
  for (const k of ["habilitado", "aptoDatosReales"]) if (datos[k] !== undefined) p[k] = Boolean(datos[k]);
  if (datos.notas !== undefined) p.notas = String(datos.notas).slice(0, 300);
  changed("ia");
  return p;
}

export function guardarModelo(id, datos) {
  const c = cfg();
  let m = c.modelos.find((x) => x.id === id);
  if (!m) {
    if (!proveedor(datos.proveedor)) throw new HttpError(400, "Elegí un proveedor");
    if (!String(datos.nombre || "").trim()) throw new HttpError(400, "Poné un nombre al modelo");
    m = { proveedor: datos.proveedor, nombre: String(datos.nombre).trim(), modelo: null, entrada: 0, salida: 0, razona: false, contexto: null, habilitado: true, fuentePrecio: "Cargado a mano", verificado: new Date().toISOString().slice(0, 10) };
    m.id = idModelo(m);
    if (c.modelos.some((x) => x.id === m.id)) throw new HttpError(409, "Ese modelo ya existe");
    c.modelos.push(m);
  }
  const num = (v, max) => { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, "Precio inválido"); return n; };
  if (datos.modelo !== undefined) m.modelo = String(datos.modelo).trim() || null;
  if (datos.nombre !== undefined && String(datos.nombre).trim()) m.nombre = String(datos.nombre).trim().slice(0, 80);
  if (datos.entrada !== undefined) { m.entrada = num(datos.entrada, 1000); m.fuentePrecio = "Cargado a mano"; m.verificado = new Date().toISOString().slice(0, 10); }
  if (datos.salida !== undefined) { m.salida = num(datos.salida, 1000); m.fuentePrecio = "Cargado a mano"; m.verificado = new Date().toISOString().slice(0, 10); }
  for (const k of ["habilitado", "razona"]) if (datos[k] !== undefined) m[k] = Boolean(datos[k]);
  changed("ia");
  return m;
}

export function guardarPerfil(id, datos) {
  const c = cfg();
  let p = c.perfiles.find((x) => x.id === id);
  if (!p) {
    const nuevoId = slug(datos.nombre || id);
    if (!nuevoId) throw new HttpError(400, "Poné un nombre al perfil");
    if (c.perfiles.some((x) => x.id === nuevoId)) throw new HttpError(409, "Ya existe un perfil con ese nombre");
    p = { id: nuevoId, nombre: "", descripcion: "", principal: null, respaldo: [], revisor: null, razonamiento: "none", roles: [] };
    c.perfiles.push(p);
  }
  const existe = (mid) => mid === null || mid === "" || modelo(mid);
  if (datos.nombre !== undefined) p.nombre = String(datos.nombre).trim().slice(0, 60) || p.nombre;
  if (datos.descripcion !== undefined) p.descripcion = String(datos.descripcion).slice(0, 200);
  for (const k of ["principal", "revisor"]) {
    if (datos[k] === undefined) continue;
    if (!existe(datos[k])) throw new HttpError(400, "Ese modelo no está en el catálogo");
    p[k] = datos[k] || null;
  }
  if (datos.respaldo !== undefined) {
    const lista = (Array.isArray(datos.respaldo) ? datos.respaldo : []).filter(Boolean);
    if (!lista.every(existe)) throw new HttpError(400, "Un modelo de respaldo no está en el catálogo");
    p.respaldo = lista.slice(0, 3);
  }
  if (datos.razonamiento !== undefined && ["none", "low", "medium", "high"].includes(datos.razonamiento)) p.razonamiento = datos.razonamiento;
  if (datos.roles !== undefined) p.roles = (Array.isArray(datos.roles) ? datos.roles : []).map(String);
  changed("ia");
  return p;
}

export function guardarAsignaciones(asignaciones, flujoPorNivel) {
  const c = cfg();
  if (asignaciones) {
    const limpio = {};
    for (const [agente, porTipo] of Object.entries(asignaciones)) {
      limpio[agente] = {};
      for (const [tipo, pid] of Object.entries(porTipo || {})) {
        if (tipo !== "default" && !TIPOS_TAREA.includes(tipo)) continue;
        if (pid && !perfil(pid)) throw new HttpError(400, `No existe el perfil ${pid}`);
        if (pid) limpio[agente][tipo] = pid;
      }
    }
    c.asignaciones = limpio;
  }
  if (flujoPorNivel) {
    for (const [nivel, f] of Object.entries(flujoPorNivel)) if (FLUJOS[f] && ["simple", "media", "compleja"].includes(nivel)) c.flujoPorNivel[nivel] = f;
  }
  changed("ia");
}

export function guardarTopes(datos) {
  const c = cfg();
  const n = Number(datos.mensualUSD);
  if (datos.mensualUSD !== undefined) { if (!Number.isFinite(n) || n < 0) throw new HttpError(400, "Tope inválido"); c.topes.mensualUSD = n; }
  if (datos.porAgenteUSD) c.topes.porAgenteUSD = Object.fromEntries(Object.entries(datos.porAgenteUSD).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]));
  if (datos.alertaPct !== undefined) c.topes.alertaPct = Math.min(100, Math.max(1, Number(datos.alertaPct) || 80));
  changed("ia");
}

/* ---------- Consumo ---------- */

export function registrarConsumo(entrada) {
  const c = cfg();
  c.consumo.unshift(entrada);
  if (c.consumo.length > 20000) c.consumo.length = 20000;
  changed("ia");
}

export function gastoDelMes(agentId = null, fecha = new Date()) {
  const mes = fecha.toISOString().slice(0, 7);
  return cfg().consumo
    .filter((x) => !x.simulado && x.ts.startsWith(mes) && (!agentId || x.agentId === agentId))
    .reduce((a, x) => a + (x.costoUSD || 0), 0);
}
