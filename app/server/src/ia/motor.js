// Motor de inteligencia: recomienda según la complejidad, resuelve qué modelo usa
// cada tarea y corre el flujo de varias inferencias (borrador, revisión, corrección
// y verificación de cifras). Sin clave, simula el flujo y lo deja marcado.
import * as cat from "./catalogo.js";
import { completar } from "./cliente.js";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const AREAS = ["finanzas", "comercial", "operaciones", "produccion", "marketing", "legal", "producto", "r&d", "i+d", "stock", "caja", "forecast", "pipeline"];
const ANALISIS = /\b(por que|analiz|compar|proyect|escenario|estrategi|recomend|impacto|causa|evalu|prioriz|conviene|decid|riesgo|simul|investig)/;
const SALIDA_TOKENS = { chat: 700, reporte: 1800, investigacion: 2600, email: 450, accion: 700 };

/**
 * Complejidad de una tarea: señales explicables, no una caja negra.
 * Devuelve { nivel: simple|media|compleja, puntos, senales: [texto] }.
 */
export function complejidad({ agentId, type, instruction = "", recipients = [] }) {
  const t = norm(instruction);
  const senales = [];
  let puntos = 0;
  const suma = (n, texto) => { puntos += n; senales.push(`${n > 0 ? "+" : ""}${n} ${texto}`); };
  if (type === "investigacion") suma(2, "es una investigación");
  if (type === "reporte") suma(1, "es un reporte");
  if (type === "accion") suma(2, "es una acción que cambia algo");
  if (ANALISIS.test(t)) suma(2, "pide análisis, comparación o recomendación");
  const areas = AREAS.filter((a) => t.includes(a));
  if (areas.length >= 2) suma(1, `cruza áreas (${areas.slice(0, 3).join(", ")})`);
  if (agentId === "ceo") suma(1, "es para el CEO: mira toda la compañía");
  if (t.length > 220) suma(1, "la instrucción es larga y detallada");
  const externos = (recipients || []).filter((r) => !/copahue\.demo$/.test(r));
  if (externos.length) suma(1, "sale por mail fuera de la empresa");
  else if ((recipients || []).length || type === "email") suma(0, "se envía por mail interno");
  if (!senales.length) senales.push("0 tarea corta y directa");
  const nivel = puntos <= 1 ? "simple" : puntos <= 3 ? "media" : "compleja";
  return { nivel, puntos, senales };
}

const PERFIL_POR_NIVEL = { simple: "rapido", media: "equilibrado", compleja: "profundo" };

/**
 * Qué perfil y qué flujo usa una tarea. Gana lo más específico:
 * elección en la tarea → programación → agente + tipo → agente → recomendación por complejidad.
 */
export function resolver({ agentId, type, instruction, recipients, ia = {}, rol = null, datos = "sintetico" }) {
  const c = cat.cfg();
  const cx = complejidad({ agentId, type, instruction, recipients });
  const asig = c.asignaciones[agentId] || {};
  let perfilId = null;
  let origen = null;
  if (ia.perfil && ia.perfil !== "auto") { perfilId = ia.perfil; origen = ia.origen || "elegido en la tarea"; }
  else if (asig[type]) { perfilId = asig[type]; origen = `asignado a ${agentId} para ${type}`; }
  else if (asig.default) { perfilId = asig.default; origen = `asignado a ${agentId}`; }
  else { perfilId = PERFIL_POR_NIVEL[cx.nivel]; origen = `recomendado por complejidad ${cx.nivel}`; }
  let perfil = cat.perfil(perfilId) || cat.perfil("equilibrado");

  // Un rol solo puede usar los perfiles que Dirección le habilitó.
  if (rol && perfil.roles?.length && !perfil.roles.includes(rol)) {
    origen = `${perfil.nombre} no está habilitado para tu rol; se usa Equilibrado`;
    perfil = cat.perfil("equilibrado");
  }
  const flujoId = ia.flujo && ia.flujo !== "auto" ? ia.flujo : c.flujoPorNivel[cx.nivel];
  const flujo = cat.FLUJOS[flujoId] || cat.FLUJOS.directo;

  // Cadena de modelos: principal y respaldos. Con datos reales, solo proveedores aptos.
  const cadena = [perfil.principal, ...(perfil.respaldo || [])].map(cat.modelo).filter(Boolean)
    .filter((m) => datos !== "real" || cat.proveedor(m.proveedor)?.aptoDatosReales);
  let revisor = cat.modelo(perfil.revisor);
  if (datos === "real" && revisor && !cat.proveedor(revisor.proveedor)?.aptoDatosReales) revisor = null;

  const estimacion = estimar({ cadena, revisor, flujo, type, instruction });
  return { complejidad: cx, perfil, origen, flujo, cadena, revisor, datos, estimacion, recomendado: { perfil: PERFIL_POR_NIVEL[cx.nivel], flujo: c.flujoPorNivel[cx.nivel] } };
}

/** Costo estimado del flujo completo, antes de ejecutarlo. */
export function estimar({ cadena, revisor, flujo, type, instruction }) {
  const m = cadena[0];
  const contexto = 2500 + Math.round(String(instruction || "").length / 4);
  const salida = SALIDA_TOKENS[type] || 1200;
  const pasos = [];
  for (const paso of flujo.pasos) {
    if (paso === "borrador") pasos.push({ paso, m, tin: contexto, tout: salida });
    if (paso === "revision" && revisor) pasos.push({ paso, m: revisor, tin: contexto + salida, tout: 500 });
    // La corrección solo corre si la revisión encuentra problemas: se estima con probabilidad 0,5.
    if (paso === "correccion" && revisor) pasos.push({ paso, m, tin: contexto + salida + 500, tout: salida, prob: 0.5 });
  }
  const detalle = pasos.filter((p) => p.m).map((p) => ({ paso: p.paso, modelo: p.m.nombre, proveedor: cat.proveedor(p.m.proveedor)?.nombre, costoUSD: cat.costo(p.m, p.tin, p.tout) * (p.prob ?? 1) }));
  return { costoUSD: detalle.reduce((a, x) => a + x.costoUSD, 0), detalle, tokens: pasos.reduce((a, p) => a + (p.tin + p.tout) * (p.prob ?? 1), 0) };
}

/* ---------- Ejecución ---------- */

const REGLAS = `Reglas:
- Respondé en español rioplatense, claro y sin relleno.
- Usá SOLO los datos del bloque DATOS DEL SISTEMA. No inventes cifras, clientes ni fechas.
- Si un dato no está, decí que falta; no lo estimes.
- Mantené las fuentes entre corchetes, por ejemplo [Tango], junto al dato que respaldan.
- Separá lo que es dato, lo que es análisis y la recomendación. La recomendación va al final, con el título «Recomendación», y aclara que decide una persona.
- Respetá el formato Markdown del borrador del sistema (títulos, listas y tablas).`;

const INSTRUCCION_TIPO = {
  reporte: "Escribí el reporte pedido.",
  investigacion: "Escribí la investigación pedida: hallazgos, conclusiones, fuentes y límites.",
  email: "Escribí el cuerpo del mail pedido: corto, con lo importante primero y firmado por el agente.",
  accion: "Escribí la propuesta de acción: qué se hace, por qué, riesgo y qué pasa si no se hace. No la des por ejecutada: la aprueba Dirección.",
  chat: "Respondé la pregunta."
};

function mensajesBorrador(agent, task, contexto) {
  return [
    { role: "system", content: `Sos el ${agent.name} de la Sala 24/7 del Laboratorio Copahue (marca Caviahue). ${agent.mission || ""}\n\n${REGLAS}` },
    { role: "user", content: `${INSTRUCCION_TIPO[task.type] || ""}\n\nPEDIDO: ${task.instruction}\n\nDATOS DEL SISTEMA (armado con los tableros y los sistemas conectados; los datos de esta demo son sintéticos):\n\n${contexto}` }
  ];
}

function mensajesRevision(task, contexto, borrador) {
  return [
    { role: "system", content: "Sos un revisor exigente. Controlás un texto escrito por otro modelo contra los datos del sistema. No reescribís el texto: listás problemas concretos. Respondé solo JSON." },
    { role: "user", content: `PEDIDO: ${task.instruction}\n\nDATOS DEL SISTEMA:\n${contexto}\n\nTEXTO A REVISAR:\n${borrador}\n\nDevolvé JSON con esta forma exacta: {"veredicto":"ok" o "corregir","problemas":[{"tipo":"cifra|fuente|omision|invento|recomendacion|tono","detalle":"qué está mal y cómo debería ser"}]}. Marcá "corregir" solo si hay errores de cifras, datos inventados, fuentes faltantes, algo importante omitido o una recomendación que no se desprende de los datos.` }
  ];
}

function mensajesCorreccion(agent, task, contexto, borrador, problemas) {
  return [
    ...mensajesBorrador(agent, task, contexto),
    { role: "assistant", content: borrador },
    { role: "user", content: `Un revisor encontró estos problemas:\n${problemas.map((p, i) => `${i + 1}. [${p.tipo}] ${p.detalle}`).join("\n")}\n\nCorregí el texto. Devolvé solo la versión final completa.` }
  ];
}

/** Controla cada número del texto contra los datos del sistema. Sin costo: no usa un modelo. */
export function verificarCifras(texto, contexto) {
  const limpiar = (s) => s.replace(/\./g, "").replace(",", ".");
  const enDatos = new Set((contexto.match(/\d[\d.,]*/g) || []).map(limpiar).map(Number).filter((n) => Number.isFinite(n)));
  const candidatos = [...new Set((texto.match(/\d[\d.,]*\d|\d/g) || []))];
  const sinRespaldo = candidatos.filter((c) => {
    const n = Number(limpiar(c));
    if (!Number.isFinite(n) || n <= 31) return false; // días, meses y conteos chicos no se controlan
    if (/^20\d\d$/.test(c)) return false; // años
    return ![...enDatos].some((d) => Math.abs(d - n) <= Math.max(0.05, Math.abs(d) * 0.005));
  });
  return { controladas: candidatos.length, sinRespaldo };
}

function parseJSON(s) {
  try { return JSON.parse(s); } catch { /* sigue */ }
  const m = String(s).match(/\{[\s\S]*\}/);
  try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
}

async function llamarConRespaldo(cadena, mensajes, opciones, paso, registro) {
  let ultimoError = null;
  for (const [i, m] of cadena.entries()) {
    const listo = cat.modeloListo(m);
    if (!listo.listo) { ultimoError = `${m.nombre}: ${listo.motivo}`; continue; }
    try {
      const r = await completar(m, mensajes, opciones);
      registro({ paso, m, r, respaldo: i > 0 });
      return { r, m };
    } catch (e) {
      ultimoError = e.message;
      registro({ paso, m, error: e.message, respaldo: i > 0 });
    }
  }
  return { error: ultimoError || "No hay modelos disponibles en el perfil" };
}

/**
 * Corre el flujo de una tarea. `contexto` es el borrador que arma el sistema con los
 * datos de los tableros: es lo único que el modelo puede usar.
 * Devuelve { texto, inferencias, resumen }.
 */
export async function ejecutar({ agent, task, contexto, rol = null }) {
  const plan = resolver({ agentId: agent.id, type: task.type, instruction: task.instruction, recipients: task.recipients, ia: task.ia || {}, rol, datos: task.datos || "sintetico" });
  const inferencias = [];
  const ts = () => new Date().toISOString();
  const c = cat.cfg();

  const registro = ({ paso, m, r, error, respaldo, simulado, detalle }) => {
    const p = cat.proveedor(m?.proveedor);
    const fila = {
      ts: ts(), paso, proveedor: p?.nombre || "—", modelo: m?.nombre || "—", modeloId: m?.id || null,
      estado: error ? "error" : simulado ? "simulado" : respaldo ? "respaldo" : "ok",
      tokensIn: r?.tokensIn || 0, tokensOut: r?.tokensOut || 0, tokensRazonamiento: r?.tokensRazonamiento || 0,
      costoUSD: r?.costoUSD || 0, ms: r?.ms || 0, detalle: error || detalle || null
    };
    inferencias.push(fila);
    if (m && !simulado) cat.registrarConsumo({ ts: fila.ts, taskId: task.id, agentId: agent.id, paso, proveedor: m.proveedor, modelo: m.id, tokensIn: fila.tokensIn, tokensOut: fila.tokensOut, costoUSD: fila.costoUSD, estado: fila.estado, simulado: false });
  };

  // Topes de gasto: si se llegó al tope del mes, la tarea sale con el sistema de reglas.
  const gastado = cat.gastoDelMes();
  const topeAgente = c.topes.porAgenteUSD?.[agent.id];
  const sinPresupuesto = (c.topes.mensualUSD > 0 && gastado >= c.topes.mensualUSD) || (topeAgente && cat.gastoDelMes(agent.id) >= topeAgente);
  const disponible = plan.cadena.some((m) => cat.modeloListo(m).listo);

  if (sinPresupuesto || !disponible || !plan.cadena.length) {
    const motivo = sinPresupuesto ? "Se alcanzó el tope de gasto del mes"
      : !plan.cadena.length ? "Ningún modelo del perfil está habilitado para estos datos"
      : `Sin modelo disponible: ${plan.cadena.map((m) => `${m.nombre} (${cat.modeloListo(m).motivo})`).join("; ")}`;
    for (const paso of plan.flujo.pasos) {
      if (paso === "correccion") continue;
      const m = paso === "revision" ? plan.revisor : plan.cadena[0];
      if (paso === "verificacion") {
        const v = verificarCifras(contexto, contexto);
        registro({ paso, m: null, simulado: true, detalle: `${v.controladas} cifras controladas contra los datos` });
      } else if (m || paso === "borrador") {
        registro({ paso, m, simulado: true, detalle: paso === "borrador" ? "Se usó el texto armado por el sistema de reglas" : "Revisión simulada: no se llamó a ningún modelo" });
      }
    }
    return { texto: contexto, inferencias, resumen: resumen(plan, inferencias, { modo: "simulado", motivo }) };
  }

  // 1. Borrador
  const opts = { razonamiento: plan.perfil.razonamiento, maxTokens: Math.max(1500, (SALIDA_TOKENS[task.type] || 1500) * 2) };
  const b = await llamarConRespaldo(plan.cadena, mensajesBorrador(agent, task, contexto), opts, "borrador", registro);
  if (b.error) return { texto: contexto, inferencias, resumen: resumen(plan, inferencias, { modo: "fallo", motivo: b.error }) };
  let texto = b.r.texto || contexto;
  let problemas = [];

  // 2. Revisión con otro modelo, idealmente de otro proveedor
  if (plan.flujo.pasos.includes("revision") && plan.revisor && cat.modeloListo(plan.revisor).listo) {
    const rv = await llamarConRespaldo([plan.revisor], mensajesRevision(task, contexto, texto), { maxTokens: 1200, json: true }, "revision", registro);
    const j = rv.r ? parseJSON(rv.r.texto) : null;
    if (j) {
      problemas = Array.isArray(j.problemas) ? j.problemas.slice(0, 12) : [];
      inferencias.at(-1).detalle = j.veredicto === "ok" || !problemas.length ? "Sin problemas" : `${problemas.length} problema${problemas.length > 1 ? "s" : ""}: ${problemas.map((p) => p.detalle).join(" · ").slice(0, 400)}`;
      inferencias.at(-1).problemas = problemas;
      if (j.veredicto === "ok") problemas = [];
    }
  } else if (plan.flujo.pasos.includes("revision")) {
    inferencias.push({ ts: ts(), paso: "revision", proveedor: "—", modelo: plan.revisor?.nombre || "—", estado: "omitido", tokensIn: 0, tokensOut: 0, costoUSD: 0, ms: 0, detalle: plan.revisor ? cat.modeloListo(plan.revisor).motivo : "El perfil no tiene revisor" });
  }

  // 3. Corrección, solo si el revisor encontró problemas
  if (plan.flujo.pasos.includes("correccion") && problemas.length) {
    const cr = await llamarConRespaldo([b.m, ...plan.cadena.filter((m) => m !== b.m)], mensajesCorreccion(agent, task, contexto, texto, problemas), opts, "correccion", registro);
    if (cr.r?.texto) texto = cr.r.texto;
  }

  // 4. Verificación de cifras contra los datos
  let verificacion = null;
  if (plan.flujo.pasos.includes("verificacion")) {
    verificacion = verificarCifras(texto, contexto);
    inferencias.push({ ts: ts(), paso: "verificacion", proveedor: "Sistema", modelo: "Control de cifras", estado: verificacion.sinRespaldo.length ? "alerta" : "ok", tokensIn: 0, tokensOut: 0, costoUSD: 0, ms: 0, detalle: verificacion.sinRespaldo.length ? `${verificacion.sinRespaldo.length} cifras sin respaldo en los datos: ${verificacion.sinRespaldo.slice(0, 8).join(", ")}` : verificacion.controladas === 1 ? "La cifra tiene respaldo" : `${verificacion.controladas} cifras, todas con respaldo` });
  }

  return { texto, inferencias, resumen: resumen(plan, inferencias, { modo: "real", verificacion }) };
}

/* ---------- Contraste: segunda opinión y auditoría cruzada ---------- */

const numeros = (s) => new Set((String(s).match(/\d[\d.,]*\d|\d{2,}/g) || []).map((x) => x.replace(/\./g, "").replace(",", ".")).filter((x) => Number(x) > 31 && !/^20\d\d$/.test(x)));

/** Diferencias de cifras entre dos textos, sin modelo. */
export function diferenciaCifras(a, b) {
  const na = numeros(a);
  const nb = numeros(b);
  return { soloA: [...na].filter((x) => !nb.has(x)).slice(0, 15), soloB: [...nb].filter((x) => !na.has(x)).slice(0, 15), comunes: [...na].filter((x) => nb.has(x)).length };
}

/**
 * Dos modos:
 * - «mismo_pedido»: el mismo pedido y los mismos datos van a otro perfil; después se comparan las dos respuestas.
 * - «auditar»: el resultado va a otro agente, que lo audita con sus propios datos y su criterio de área.
 * Devuelve { textoB, resultado, inferencias, modo }.
 */
export async function contrastar({ modo, task, agenteOrigen, agenteAuditor, perfilId, textoA, contextoA, contextoAuditor, rol }) {
  const inferencias = [];
  const registro = ({ paso, m, r, error, respaldo, detalle }) => {
    const p = cat.proveedor(m?.proveedor);
    const fila = { ts: new Date().toISOString(), paso, proveedor: p?.nombre || "—", modelo: m?.nombre || "—", estado: error ? "error" : respaldo ? "respaldo" : "ok", tokensIn: r?.tokensIn || 0, tokensOut: r?.tokensOut || 0, costoUSD: r?.costoUSD || 0, ms: r?.ms || 0, detalle: error || detalle || null };
    inferencias.push(fila);
    if (m) cat.registrarConsumo({ ts: fila.ts, taskId: task.id, agentId: agenteAuditor?.id || agenteOrigen.id, paso: `contraste-${paso}`, proveedor: m.proveedor, modelo: m.id, tokensIn: fila.tokensIn, tokensOut: fila.tokensOut, costoUSD: fila.costoUSD, estado: fila.estado, simulado: false });
  };
  const plan = resolver({ agentId: (agenteAuditor || agenteOrigen).id, type: task.type, instruction: task.instruction, recipients: task.recipients, ia: { perfil: perfilId || "auto", flujo: "directo" }, rol, datos: task.datos || "sintetico" });
  const disponible = plan.cadena.some((m) => cat.modeloListo(m).listo);

  if (modo === "mismo_pedido") {
    let textoB = contextoA;
    let simulado = !disponible;
    if (disponible) {
      const b = await llamarConRespaldo(plan.cadena, mensajesBorrador(agenteOrigen, task, contextoA), { razonamiento: plan.perfil.razonamiento, maxTokens: 4000 }, "segunda-opinion", registro);
      if (b.r?.texto) textoB = b.r.texto; else simulado = true;
    }
    const cifras = diferenciaCifras(textoA, textoB);
    let comparacion = null;
    const juez = plan.revisor && cat.modeloListo(plan.revisor).listo ? plan.revisor : null;
    if (juez && !simulado) {
      const msgs = [
        { role: "system", content: "Comparás dos respuestas al mismo pedido, hechas con los mismos datos por modelos distintos. Sos neutral. Respondé solo JSON." },
        { role: "user", content: `PEDIDO: ${task.instruction}\n\nDATOS DEL SISTEMA:\n${contextoA}\n\nRESPUESTA A:\n${textoA}\n\nRESPUESTA B:\n${textoB}\n\nDevolvé JSON: {"coinciden":["..."],"diferencias":[{"tema":"...","a":"...","b":"...","correcta":"A|B|ninguna|ambas"}],"mejor":"A|B|empate","porque":"..."}` }
      ];
      const j = await llamarConRespaldo([juez], msgs, { maxTokens: 1500, json: true }, "comparacion", registro);
      comparacion = j.r ? parseJSON(j.r.texto) : null;
    }
    return {
      modo, textoB, simulado, perfil: plan.perfil.nombre,
      resultado: {
        veredicto: simulado ? "simulado" : comparacion?.mejor ? `Mejor: ${comparacion.mejor}` : "Comparado",
        resumen: simulado ? "Sin modelo disponible: se compararon solo las cifras" : comparacion?.porque || "Comparación de cifras hecha por el sistema",
        coinciden: comparacion?.coinciden || [], diferencias: comparacion?.diferencias || [], cifras
      },
      inferencias
    };
  }

  // Auditoría cruzada: otro agente revisa el resultado con sus datos.
  const verif = verificarCifras(textoA, `${contextoA}\n${contextoAuditor}`);
  if (!disponible) {
    return {
      modo, simulado: true, perfil: plan.perfil.nombre, textoB: null, inferencias,
      resultado: { veredicto: verif.sinRespaldo.length ? "observado" : "sin observaciones", resumen: `Auditoría simulada: sin modelo, solo se controlaron ${verif.controladas} cifras contra los datos de las dos áreas.`, problemas: verif.sinRespaldo.map((x) => ({ tipo: "cifra", detalle: `${x} no aparece en los datos` })), cifras: verif }
    };
  }
  const msgs = [
    { role: "system", content: `Sos el ${agenteAuditor.name} de la Sala 24/7 del Laboratorio Copahue. ${agenteAuditor.mission || ""} Auditás un trabajo hecho por el ${agenteOrigen.name}, mirándolo desde tu área y con tus datos. Sos concreto y justo. Respondé solo JSON.` },
    { role: "user", content: `PEDIDO ORIGINAL: ${task.instruction}\n\nDATOS DEL ÁREA QUE HIZO EL TRABAJO:\n${contextoA}\n\nTUS DATOS (${agenteAuditor.name}):\n${contextoAuditor}\n\nTRABAJO A AUDITAR:\n${textoA}\n\nDevolvé JSON: {"veredicto":"aprobado|observado|rechazado","resumen":"una o dos oraciones","problemas":[{"tipo":"cifra|supuesto|omision|impacto-en-mi-area|recomendacion","detalle":"..."}],"impactoEnMiArea":"qué implica para ${agenteAuditor.short || agenteAuditor.name}"}` }
  ];
  const r = await llamarConRespaldo(plan.cadena, msgs, { razonamiento: plan.perfil.razonamiento, maxTokens: 1800, json: true }, "auditoria", registro);
  const j = r.r ? parseJSON(r.r.texto) : null;
  return {
    modo, simulado: !j, perfil: plan.perfil.nombre, textoB: null, inferencias,
    resultado: j
      ? { veredicto: j.veredicto || "observado", resumen: j.resumen || "", problemas: Array.isArray(j.problemas) ? j.problemas.slice(0, 15) : [], impacto: j.impactoEnMiArea || null, cifras: verif }
      : { veredicto: "error", resumen: r.error || "El modelo no devolvió una auditoría válida", problemas: [], cifras: verif }
  };
}

function resumen(plan, inferencias, extra) {
  return {
    ...extra,
    perfil: plan.perfil.id, perfilNombre: plan.perfil.nombre, origen: plan.origen,
    flujo: plan.flujo.id, flujoNombre: plan.flujo.nombre,
    complejidad: plan.complejidad, datos: plan.datos,
    costoUSD: inferencias.reduce((a, x) => a + (x.costoUSD || 0), 0),
    costoEstimadoUSD: plan.estimacion.costoUSD,
    tokens: inferencias.reduce((a, x) => a + (x.tokensIn || 0) + (x.tokensOut || 0), 0),
    ms: inferencias.reduce((a, x) => a + (x.ms || 0), 0)
  };
}
