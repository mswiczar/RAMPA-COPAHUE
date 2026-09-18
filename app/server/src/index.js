import express from "express";
import path from "node:path";
import fs from "node:fs";
import * as auth from "./auth.js";
import { fileURLToPath } from "node:url";
import { db, bus, load, newId, now, changed, HttpError } from "./store.js";
import { ALL, byId } from "./agents.js";
import * as brain from "./brain.js";
import { createTask, decide, resume } from "./worker.js";
import * as scheduler from "./scheduler.js";
import * as finanzas from "./solutions/finanzas.js";
import { seed } from "./seed.js";

const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

const app = express();
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "200kb" }));

// Login con página propia (APP_USER / APP_PASSWORD / SESSION_SECRET)
auth.routes(app);
app.use(auth.requireSession);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).then((out) => out !== undefined && res.json(out)).catch(next);
const agentOr404 = (id) => { const a = byId[id]; if (!a) throw new HttpError(404, "No existe ese agente"); return a; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Estado general ---------- */

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/summary", wrap(() => ({
  pendingApprovals: db.tasks.filter((t) => t.status === "esperando_aprobacion").length,
  runningTasks: db.tasks.filter((t) => ["pendiente", "en_curso"].includes(t.status)).length,
  activeSchedules: db.schedules.filter((s) => s.enabled).length,
  emailsPending: db.emails.filter((e) => e.status === "esperando_aprobacion").length,
  deliverables: db.deliverables.length
})));

app.get("/api/activity", wrap((req) => {
  const list = req.query.agentId ? db.activity.filter((a) => a.agentId === req.query.agentId) : db.activity;
  return list.slice(0, Number(req.query.limit) || 50);
}));

app.get("/api/events", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  const onChange = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  bus.on("change", onChange);
  req.on("close", () => { clearInterval(ping); bus.off("change", onChange); });
});

/* ---------- Agentes y conversación ---------- */

function agentSummary(a) {
  const tasks = db.tasks.filter((t) => t.agentId === a.id);
  return {
    id: a.id, name: a.name, short: a.short, tagline: a.tagline, mission: a.mission, systems: a.systems, alerts: a.alerts,
    suggestions: a.qa.map((x) => x.q),
    activeTasks: tasks.filter((t) => ["pendiente", "en_curso"].includes(t.status)).length,
    pendingApprovals: tasks.filter((t) => t.status === "esperando_aprobacion").length,
    schedules: db.schedules.filter((s) => s.agentId === a.id && s.enabled).length
  };
}

app.get("/api/agents", wrap(() => ALL.map(agentSummary)));
app.get("/api/agents/:id", wrap((req) => agentSummary(agentOr404(req.params.id))));
app.get("/api/agents/:id/messages", wrap((req) => { agentOr404(req.params.id); return db.messages[req.params.id] || []; }));

app.post("/api/agents/:id/messages", wrap(async (req) => {
  const agent = agentOr404(req.params.id);
  const content = String(req.body.content || "").trim();
  if (!content) throw new HttpError(400, "Escribí un mensaje");
  const thread = (db.messages[agent.id] ||= []);
  const user = { id: newId("msg"), role: "user", content, ts: now() };
  thread.push(user);
  changed("messages");

  await wait(700 + Math.random() * 900);
  const result = brain.chat(agent, content);
  const reply = { id: newId("msg"), role: "agent", content: "", ts: null };

  if (result.intent?.kind === "task") {
    const { agentId, type, instruction, recipients } = result.intent;
    const task = createTask({ agentId, type, instruction, recipients });
    const who = agentId !== agent.id ? `Se lo encargué al **${byId[agentId].name}**. ` : "Lo tomo. ";
    const approval = type === "accion" || recipients.length || type === "email" ? " Antes de enviar o ejecutar te voy a pedir aprobación." : "";
    reply.content = `${who}Creé la tarea **${task.title}** (${brain.TYPES[type]}).${approval}${recipients.length ? `\n\nDestinatarios: ${recipients.join(", ")}` : ""}`;
    reply.taskId = task.id;
  } else if (result.intent?.kind === "schedule") {
    const { agentId, type, instruction, recipients, schedule } = result.intent;
    const s = scheduler.create({ agentId, type, name: brain.titleFrom(type, instruction), instruction, recipients, cron: schedule.cron });
    const when = s.nextRunAt ? new Intl.DateTimeFormat("es-AR", { timeZone: scheduler.TZ, dateStyle: "full", timeStyle: "short" }).format(new Date(s.nextRunAt)) : "—";
    reply.content = `Programado para **${schedule.label}**: ${s.name} (${brain.TYPES[type]}, cron \`${s.cron}\`).\n\nPróxima ejecución: ${when}${agentId !== agent.id ? `\n\nLo va a ejecutar el **${byId[agentId].name}**.` : ""}`;
    reply.scheduleId = s.id;
  } else {
    reply.content = result.text;
  }
  reply.ts = now();
  thread.push(reply);
  if (thread.length > 200) thread.splice(0, thread.length - 200);
  changed("messages");
  return { user, reply };
}));

/* ---------- Tareas ---------- */

app.get("/api/tasks", wrap((req) => db.tasks.filter((t) =>
  (!req.query.agentId || t.agentId === req.query.agentId) && (!req.query.status || t.status === req.query.status))));
app.get("/api/tasks/:id", wrap((req) => { const t = db.tasks.find((x) => x.id === req.params.id); if (!t) throw new HttpError(404, "No existe esa tarea"); return t; }));
app.post("/api/tasks", wrap((req, res) => { res.status(201); return createTask({ ...req.body, source: "ceo" }); }));
app.post("/api/tasks/:id/approve", wrap((req) => decide(req.params.id, true)));
app.post("/api/tasks/:id/reject", wrap((req) => decide(req.params.id, false)));

/* ---------- Programaciones ---------- */

app.get("/api/schedules", wrap((req) => db.schedules.filter((s) => !req.query.agentId || s.agentId === req.query.agentId)));
app.post("/api/schedules", wrap((req, res) => { res.status(201); return scheduler.create(req.body); }));
app.patch("/api/schedules/:id", wrap((req) => scheduler.update(req.params.id, req.body)));
app.delete("/api/schedules/:id", wrap((req) => { scheduler.remove(req.params.id); return { ok: true }; }));
app.post("/api/schedules/:id/run", wrap((req) => scheduler.fire(req.params.id, true)));
app.get("/api/cron/preview", wrap((req) => ({ next: scheduler.nextRun(String(req.query.expr || "")) })));

/* ---------- Soluciones (tableros por agente) ---------- */

app.get("/api/solutions", wrap(() => [{ id: finanzas.META.id, agentId: finanzas.META.agentId, titulo: finanzas.META.titulo, bajada: finanzas.META.bajada }]));

app.get("/api/solutions/finanzas", wrap(() => ({
  meta: finanzas.META,
  indicadores: finanzas.indicadores(),
  caja: finanzas.caja(),
  puente: finanzas.puente(),
  pnl: finanzas.pnl()
})));

app.get("/api/solutions/finanzas/dimensiones", wrap((req) => finanzas.dimensiones(Math.min(12, Math.max(1, Number(req.query.meses ?? 8))))));
app.get("/api/solutions/finanzas/linea/:id", wrap((req) => {
  const detalle = finanzas.detalleLinea(req.params.id);
  if (!detalle) throw new HttpError(404, "Esa línea no tiene apertura por centro de costo");
  return detalle;
}));
app.post("/api/solutions/finanzas/escenario", wrap((req) => {
  const deltas = {};
  for (const v of finanzas.VARIABLES_ESCENARIO) {
    const raw = req.body?.[v.id];
    if (raw === undefined || raw === null || raw === "") continue;
    const n = Number(raw);
    if (Number.isNaN(n)) throw new HttpError(400, `Valor inválido para ${v.label}`);
    deltas[v.id] = Math.min(v.max, Math.max(v.min, n));
  }
  return finanzas.escenario(deltas);
}));

/* ---------- Entregables y bandeja de salida ---------- */

app.get("/api/deliverables", wrap((req) => db.deliverables
  .filter((d) => !req.query.agentId || d.agentId === req.query.agentId)
  .map(({ content, ...rest }) => rest)));
app.get("/api/deliverables/:id", wrap((req) => { const d = db.deliverables.find((x) => x.id === req.params.id); if (!d) throw new HttpError(404, "No existe ese entregable"); return d; }));

app.get("/api/emails", wrap((req) => db.emails.filter((e) => !req.query.status || e.status === req.query.status)));
app.post("/api/emails/:id/:decision(approve|reject)", wrap((req) => {
  const e = db.emails.find((x) => x.id === req.params.id);
  if (!e) throw new HttpError(404, "No existe ese mail");
  decide(e.taskId, req.params.decision === "approve");
  return e;
}));

app.use("/api", (req, res) => res.status(404).json({ error: "Ruta inexistente" }));

/* ---------- Frontend ---------- */

if (fs.existsSync(PUBLIC_DIR)) {
  // Los assets llevan hash en el nombre: se cachean. index.html nunca, así cada deploy se ve al instante.
  app.use("/assets", express.static(path.join(PUBLIC_DIR, "assets"), { maxAge: "30d", immutable: true }));
  app.use(express.static(PUBLIC_DIR, { index: false, maxAge: 0 }));
  app.get("*", (req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(PUBLIC_DIR, "index.html")));
}

app.use((err, req, res, next) => {
  const status = err.status || (err.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Error interno del servidor" : err.message });
});

const fresh = load();
scheduler.init();
if (fresh) seed();
resume();
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`Sala 24/7 Copahue escuchando en http://${HOST}:${PORT}`));
