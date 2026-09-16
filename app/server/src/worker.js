// Ejecución de tareas (mock): pendiente → en curso → completada o esperando aprobación.
import { db, newId, now, changed, logActivity, HttpError } from "./store.js";
import { byId } from "./agents.js";
import * as brain from "./brain.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.]+$/;

export function normRecipients(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[,;\s]+/);
  const clean = list.map((s) => String(s).trim()).filter(Boolean);
  const bad = clean.filter((s) => !EMAIL_RE.test(s));
  if (bad.length) throw new HttpError(400, `Destinatario inválido: ${bad.join(", ")}`);
  return [...new Set(clean)];
}

export function createTask({ agentId, type, title, instruction, recipients = [], source = "ceo", scheduleId = null, requiresApproval = true }, { run = true } = {}) {
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
    log: [{ ts: now(), text: source === "programacion" ? "Creada por una programación" : "Encargada por el CEO" }]
  };
  db.tasks.unshift(task);
  logActivity(agentId, `Nueva tarea: ${task.title}`);
  changed("tasks");
  if (run) execute(task.id);
  return task;
}

const step = (task, text) => task.log.push({ ts: now(), text });

/** Genera los resultados de la tarea en forma sincrónica. */
export function produce(task) {
  const agent = byId[task.agentId];
  let deliverable = null;
  let email = null;

  if (task.type === "reporte" || task.type === "investigacion") {
    const content = task.type === "reporte" ? brain.buildReport(agent, task) : brain.buildResearch(agent, task);
    deliverable = { id: newId("dlv"), agentId: agent.id, taskId: task.id, kind: task.type, title: task.title, content, createdAt: now() };
    db.deliverables.unshift(deliverable);
    task.deliverableId = deliverable.id;
    step(task, `${brain.TYPES[task.type]} generado a partir de ${agent.systems.slice(0, 4).join(", ")}`);
  }

  if (task.type === "email" || (deliverable && task.recipients.length)) {
    const recipients = task.recipients.length ? task.recipients : ["direccion@copahue.demo"];
    const { subject, body } = brain.buildEmail(agent, task, deliverable);
    email = { id: newId("eml"), agentId: agent.id, taskId: task.id, to: recipients, subject, body, deliverableId: deliverable?.id || null, status: "esperando_aprobacion", createdAt: now(), decidedAt: null };
    db.emails.unshift(email);
    task.emailId = email.id;
    step(task, `Mail preparado para ${recipients.join(", ")}`);
  }

  if (task.type === "accion") {
    task.plan = brain.actionPlan(agent, task);
    step(task, "Acción preparada");
  }

  const needsApproval = task.type === "accion" || (email && task.requiresApproval);
  if (needsApproval) {
    task.status = "esperando_aprobacion";
    step(task, "Esperando aprobación del CEO");
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
  step(task, `Consultando ${byId[task.agentId].systems.slice(0, 3).join(", ")}`);
  changed("tasks");
  await wait(2200 + Math.random() * 2500);
  try {
    produce(task);
  } catch (e) {
    task.status = "fallida";
    task.finishedAt = now();
    step(task, `Error: ${e.message}`);
  }
  changed("tasks");
}

export function decide(taskId, approve) {
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
    ? email ? "Aprobada por el CEO. Mail enviado (simulado)" : "Aprobada por el CEO. Acción registrada (simulado)"
    : "Rechazada por el CEO");
  logActivity(task.agentId, `${approve ? "Aprobada" : "Rechazada"}: ${task.title}`);
  changed("tasks");
  changed("emails");
  return task;
}

/** Retoma tareas interrumpidas por un reinicio del servidor. */
export function resume() {
  db.tasks.filter((t) => ["pendiente", "en_curso"].includes(t.status)).forEach((t) => execute(t.id));
}
