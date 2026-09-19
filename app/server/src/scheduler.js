// Programaciones tipo crontab por agente. Corren de verdad con croner.
import { Cron } from "croner";
import { db, newId, now, changed, logActivity, HttpError } from "./store.js";
import { byId } from "./agents.js";
import { TYPES } from "./brain.js";
import { createTask, normRecipients, normIA } from "./worker.js";

export const TZ = process.env.APP_TZ || "America/Argentina/Buenos_Aires";
const jobs = new Map();

export function nextRun(expr) {
  try {
    const job = new Cron(expr, { timezone: TZ });
    const next = job.nextRun();
    job.stop();
    return next ? next.toISOString() : null;
  } catch {
    return null;
  }
}

function assertValid(s) {
  if (!byId[s.agentId]) throw new HttpError(400, "No existe ese agente");
  if (!TYPES[s.type]) throw new HttpError(400, "Tipo de tarea inválido");
  if (!String(s.name || "").trim()) throw new HttpError(400, "Poné un nombre a la programación");
  if (!String(s.instruction || "").trim()) throw new HttpError(400, "Escribí qué tiene que hacer el agente");
  if (String(s.cron || "").trim().split(/\s+/).length !== 5 || !nextRun(s.cron)) {
    throw new HttpError(400, "La expresión cron no es válida. Usá 5 campos: minuto hora día mes día-de-semana");
  }
}

function arm(s) {
  disarm(s.id);
  if (!s.enabled) {
    s.nextRunAt = null;
    return;
  }
  const job = new Cron(s.cron, { timezone: TZ, protect: true }, () => fire(s.id));
  jobs.set(s.id, job);
  s.nextRunAt = job.nextRun()?.toISOString() ?? null;
}

function disarm(id) {
  jobs.get(id)?.stop();
  jobs.delete(id);
}

export function fire(id, manual = false) {
  const s = db.schedules.find((x) => x.id === id);
  if (!s) throw new HttpError(404, "No existe esa programación");
  const task = createTask({
    agentId: s.agentId, type: s.type, title: s.name, instruction: s.instruction,
    recipients: s.recipients, source: "programacion", scheduleId: s.id, requiresApproval: s.requiresApproval,
    ia: s.ia ? { ...s.ia, origen: "definido en la programación" } : null
  });
  s.lastRunAt = now();
  s.runs = (s.runs || 0) + 1;
  s.lastTaskId = task.id;
  s.nextRunAt = jobs.get(s.id)?.nextRun()?.toISOString() ?? null;
  logActivity(s.agentId, `${manual ? "Ejecución manual" : "Se ejecutó"}: ${s.name}`);
  changed("schedules");
  return task;
}

export function create(input) {
  const s = {
    id: newId("sch"),
    agentId: input.agentId,
    name: String(input.name || "").trim(),
    type: input.type || "reporte",
    instruction: String(input.instruction || "").trim(),
    recipients: normRecipients(input.recipients),
    cron: String(input.cron || "").trim(),
    requiresApproval: input.requiresApproval !== false,
    enabled: input.enabled !== false,
    ia: normIA(input.ia),
    createdAt: now(), lastRunAt: null, nextRunAt: null, runs: 0, lastTaskId: null
  };
  assertValid(s);
  db.schedules.unshift(s);
  arm(s);
  logActivity(s.agentId, `Nueva programación: ${s.name}`);
  changed("schedules");
  return s;
}

export function update(id, patch) {
  const s = db.schedules.find((x) => x.id === id);
  if (!s) throw new HttpError(404, "No existe esa programación");
  const next = { ...s };
  for (const k of ["agentId", "name", "type", "instruction", "cron", "requiresApproval", "enabled"]) {
    if (patch[k] !== undefined) next[k] = typeof patch[k] === "string" ? patch[k].trim() : patch[k];
  }
  if (patch.recipients !== undefined) next.recipients = normRecipients(patch.recipients);
  if (patch.ia !== undefined) next.ia = normIA(patch.ia);
  assertValid(next);
  Object.assign(s, next);
  arm(s);
  changed("schedules");
  return s;
}

export function remove(id) {
  const i = db.schedules.findIndex((x) => x.id === id);
  if (i < 0) throw new HttpError(404, "No existe esa programación");
  disarm(id);
  const [s] = db.schedules.splice(i, 1);
  logActivity(s.agentId, `Programación eliminada: ${s.name}`);
  changed("schedules");
}

export function init() {
  db.schedules.forEach(arm);
  changed("schedules");
}
