// Ejecución de tareas (mock): pendiente → en curso → completada o esperando aprobación.
import { db, newId, now, changed, logActivity, HttpError } from "./store.js";
import { byId } from "./agents.js";
import * as brain from "./brain.js";
import * as motor from "./ia/motor.js";
import * as catIA from "./ia/catalogo.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.]+$/;

export function normRecipients(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[,;\s]+/);
  const clean = list.map((s) => String(s).trim()).filter(Boolean);
  const bad = clean.filter((s) => !EMAIL_RE.test(s));
  if (bad.length) throw new HttpError(400, `Destinatario inválido: ${bad.join(", ")}`);
  return [...new Set(clean)];
}

/** Elección de modelo que viene con la tarea: perfil y flujo, o automático. */
export function normIA(ia) {
  const perfil = ia?.perfil && ia.perfil !== "auto" && catIA.perfil(ia.perfil) ? ia.perfil : "auto";
  const flujo = ia?.flujo && catIA.FLUJOS[ia.flujo] ? ia.flujo : "auto";
  return { perfil, flujo, ...(ia?.origen ? { origen: String(ia.origen).slice(0, 80) } : {}) };
}

export function createTask({ agentId, type, title, instruction, recipients = [], source = "ceo", scheduleId = null, requiresApproval = true, pedidoPor = null, ia = null, rol = null }, { run = true } = {}) {
  const agent = byId[agentId];
  if (!agent) throw new HttpError(404, "No existe ese agente");
  if (!brain.TYPES[type]) throw new HttpError(400, "Tipo de tarea inválido");
  instruction = String(instruction || "").trim();
  if (!instruction) throw new HttpError(400, "Escribí qué tiene que hacer el agente");
  const task = {
    id: newId("tsk"), agentId, type,
    title: String(title || "").trim() || brain.titleFrom(type, instruction),
    instruction, recipients: normRecipients(recipients),
    source, scheduleId, requiresApproval: requiresApproval !== false,
    status: "pendiente", createdAt: now(), startedAt: null, finishedAt: null,
    deliverableId: null, emailId: null,
    log: [{ ts: now(), text: source === "programacion" ? "Creada por una programación" : `Encargada por ${pedidoPor || "el CEO"}` }], pedidoPor,
    // Con qué inteligencia se hace, y sobre qué datos. Hoy todos los datos son sintéticos.
    ia: normIA(ia), rol, datos: "sintetico", inferencias: []
  };
  db.tasks.unshift(task);
  logActivity(agentId, `Nueva tarea: ${task.title}`);
  changed("tasks");
  if (run) execute(task.id);
  return task;
}

const step = (task, text) => task.log.push({ ts: now(), text });

/** Texto que arma el sistema con los datos de los tableros: es el contexto del modelo. */
export function contenidoBase(agent, task) {
  if (task.type === "reporte") return brain.buildReport(agent, task);
  if (task.type === "investigacion") return brain.buildResearch(agent, task);
  if (task.type === "email") return brain.buildEmail(agent, task, null).body;
  return brain.actionPlan(agent, task);
}

function pieIA(task) {
  const r = task.ia;
  if (!r?.modo) return "";
  if (r.modo !== "real") return `\n\n---\n\n_Generado por el sistema de reglas, sin modelo de IA: ${r.motivo}. Perfil previsto: ${r.perfilNombre} · ${r.flujoNombre}. Datos sintéticos._`;
  const hechos = (task.inferencias || []).filter((i) => ["ok", "respaldo", "alerta"].includes(i.estado));
  const pasos = hechos.map((i) => `${i.paso === "borrador" ? "escrito" : i.paso === "revision" ? "revisado" : i.paso === "correccion" ? "corregido" : "cifras verificadas"} por ${i.modelo}${i.proveedor !== "Sistema" ? ` (${i.proveedor})` : ""}`);
  const sin = r.verificacion?.sinRespaldo?.length ? ` Cifras sin respaldo en los datos: ${r.verificacion.sinRespaldo.slice(0, 8).join(", ")}.` : "";
  return `\n\n---\n\n_${pasos.join("; ")}. Perfil ${r.perfilNombre} · costo USD ${r.costoUSD.toFixed(4)}. Datos sintéticos.${sin}_`;
}

/** Genera los resultados de la tarea en forma sincrónica. `texto` es lo que escribió el modelo. */
export function produce(task, texto = null) {
  const agent = byId[task.agentId];
  let deliverable = null;
  let email = null;

  if (task.type === "reporte" || task.type === "investigacion") {
    const content = (texto || (task.type === "reporte" ? brain.buildReport(agent, task) : brain.buildResearch(agent, task))) + pieIA(task);
    deliverable = { id: newId("dlv"), agentId: agent.id, taskId: task.id, kind: task.type, title: task.title, content, createdAt: now() };
    db.deliverables.unshift(deliverable);
    task.deliverableId = deliverable.id;
    step(task, `${brain.TYPES[task.type]} generado a partir de ${agent.systems.slice(0, 4).join(", ")}`);
  }

  if (task.type === "email" || (deliverable && task.recipients.length)) {
    const recipients = task.recipients.length ? task.recipients : ["direccion@copahue.demo"];
    const armado = brain.buildEmail(agent, task, deliverable);
    const subject = armado.subject;
    const body = task.type === "email" && texto ? texto : armado.body;
    email = { id: newId("eml"), agentId: agent.id, taskId: task.id, to: recipients, subject, body, deliverableId: deliverable?.id || null, status: "esperando_aprobacion", createdAt: now(), decidedAt: null };
    db.emails.unshift(email);
    task.emailId = email.id;
    step(task, `Mail preparado para ${recipients.join(", ")}`);
  }

  if (task.type === "accion") {
    task.plan = texto || brain.actionPlan(agent, task);
    step(task, "Acción preparada");
  }

  const needsApproval = task.type === "accion" || (email && task.requiresApproval);
  if (needsApproval) {
    task.status = "esperando_aprobacion";
    step(task, "Esperando aprobación de Dirección");
    logActivity(agent.id, `Pide aprobación: ${task.title}`);
  } else {
    if (email) {
      email.status = "enviado";
      email.decidedAt = now();
      step(task, "Mail enviado sin aprobación, según la programación (simulado)");
    }
    task.status = "completada";
    task.finishedAt = now();
    step(task, "Completada");
    logActivity(agent.id, `Terminó: ${task.title}`);
  }
}

export async function execute(taskId) {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task || !["pendiente", "en_curso"].includes(task.status)) return;
  await wait(900);
  task.status = "en_curso";
  task.startedAt = now();
  const agent = byId[task.agentId];
  step(task, `Consultando ${agent.systems.slice(0, 3).join(", ")}`);
  changed("tasks");
  try {
    const contexto = contenidoBase(agent, task);
    const plan = motor.resolver({ agentId: agent.id, type: task.type, instruction: task.instruction, recipients: task.recipients, ia: task.ia, rol: task.rol, datos: task.datos });
    step(task, `Inteligencia: ${plan.perfil.nombre} · ${plan.flujo.nombre} (${plan.origen}; complejidad ${plan.complejidad.nivel})`);
    changed("tasks");
    const r = await motor.ejecutar({ agent, task, contexto, rol: task.rol });
    task.ia = { perfilElegido: task.ia?.perfil || "auto", flujoElegido: task.ia?.flujo || "auto", ...r.resumen };
    task.inferencias = r.inferencias;
    for (const i of r.inferencias) {
      if (i.estado === "simulado") continue;
      step(task, `${{ borrador: "Borrador", revision: "Revisión", correccion: "Corrección", verificacion: "Verificación de cifras" }[i.paso] || i.paso}: ${i.modelo}${i.estado === "error" ? ` falló (${i.detalle})` : i.estado === "respaldo" ? " (respaldo)" : ""}${i.detalle && i.estado !== "error" ? ` · ${i.detalle}` : ""}`);
    }
    if (r.resumen.modo !== "real") {
      step(task, `Sin modelo de IA: ${r.resumen.motivo}. Se usa el sistema de reglas`);
      await wait(1500 + Math.random() * 1500);
    }
    produce(task, r.texto);
  } catch (e) {
    task.status = "fallida";
    task.finishedAt = now();
    step(task, `Error: ${e.message}`);
  }
  changed("tasks");
}

export function decide(taskId, approve, actor = "el CEO") {
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) throw new HttpError(404, "No existe esa tarea");
  if (task.status !== "esperando_aprobacion") throw new HttpError(409, "La tarea no está esperando aprobación");
  const email = task.emailId && db.emails.find((e) => e.id === task.emailId);
  if (email) {
    email.status = approve ? "enviado" : "rechazado";
    email.decidedAt = now();
  }
  task.status = approve ? "completada" : "rechazada";
  task.finishedAt = now();
  step(task, approve
    ? email ? `Aprobada por ${actor}. Mail enviado (simulado)` : `Aprobada por ${actor}. Acción registrada (simulado)`
    : `Rechazada por ${actor}`);
  logActivity(task.agentId, `${approve ? "Aprobada" : "Rechazada"}: ${task.title}`);
  changed("tasks");
  changed("emails");
  return task;
}

/** Retoma tareas interrumpidas por un reinicio del servidor. */
export function resume() {
  db.tasks.filter((t) => ["pendiente", "en_curso"].includes(t.status)).forEach((t) => execute(t.id));
}
