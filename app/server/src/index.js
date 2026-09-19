import express from "express";
import path from "node:path";
import fs from "node:fs";
import * as auth from "./auth.js";
import * as users from "./users.js";
import * as audit from "./audit.js";
import { fileURLToPath } from "node:url";
import { db, bus, load, newId, now, changed, HttpError } from "./store.js";
import { ALL, byId } from "./agents.js";
import * as brain from "./brain.js";
import { createTask, decide, resume, contenidoBase } from "./worker.js";
import * as scheduler from "./scheduler.js";
import * as finanzas from "./solutions/finanzas.js";
import * as comercial from "./solutions/comercial.js";
import * as rd from "./solutions/rd.js";
import * as operaciones from "./solutions/operaciones.js";
import * as produccion from "./solutions/produccion.js";
import * as consultas from "./solutions/consultas.js";
import * as pdv from "./solutions/pdv.js";
import * as catIA from "./ia/catalogo.js";
import * as motor from "./ia/motor.js";
import { listarModelos, completar } from "./ia/cliente.js";
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

app.get("/api/summary", wrap((req) => ({
  pendingApprovals: visibles(req, db.tasks).filter((t) => t.status === "esperando_aprobacion").length,
  runningTasks: visibles(req, db.tasks).filter((t) => ["pendiente", "en_curso"].includes(t.status)).length,
  activeSchedules: visibles(req, db.schedules).filter((s) => s.enabled).length,
  emailsPending: visibles(req, db.emails).filter((e) => e.status === "esperando_aprobacion").length,
  deliverables: visibles(req, db.deliverables).length
})));

app.get("/api/activity", wrap((req) => {
  const list = visibles(req, req.query.agentId ? db.activity.filter((a) => a.agentId === req.query.agentId) : db.activity);
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
    solucion: ["finanzas", "comercial", "rd", "operaciones", "produccion"].includes(a.id) ? a.id : null,
    suggestions: [...consultas.ejemplos(a.id).slice(0, 4), ...a.qa.map((x) => x.q)].slice(0, 6),
    activeTasks: tasks.filter((t) => ["pendiente", "en_curso"].includes(t.status)).length,
    pendingApprovals: tasks.filter((t) => t.status === "esperando_aprobacion").length,
    schedules: db.schedules.filter((s) => s.agentId === a.id && s.enabled).length
  };
}

/** Corta el pedido con 403 y deja constancia en la auditoría. */
function exigir(condicion, req, accion, recurso, mensaje) {
  if (condicion) return;
  audit.registrar(req, accion, recurso, mensaje, "rechazado");
  throw new HttpError(403, mensaje);
}

function agenteVisible(req, id) {
  const agent = agentOr404(id);
  exigir(users.puedeAgente(req.user, agent.id), req, "intentó acceder", agent.name, `Tu rol no tiene acceso al ${agent.name}`);
  return agent;
}

const visibles = (req, lista, campo = "agentId") => lista.filter((x) => users.puedeAgente(req.user, x[campo]));

app.get("/api/agents", wrap((req) => ALL.filter((a) => users.puedeAgente(req.user, a.id)).map(agentSummary)));
app.get("/api/agents/:id", wrap((req) => agentSummary(agenteVisible(req, req.params.id))));
app.get("/api/agents/:id/messages", wrap((req) => { agenteVisible(req, req.params.id); return db.messages[req.params.id] || []; }));

app.post("/api/agents/:id/messages", wrap(async (req) => {
  const agent = agenteVisible(req, req.params.id);
  const content = String(req.body.content || "").trim();
  if (!content) throw new HttpError(400, "Escribí un mensaje");
  audit.registrar(req, "preguntó", agent.name, content);
  const thread = (db.messages[agent.id] ||= []);
  const user = { id: newId("msg"), role: "user", content, ts: now() };
  thread.push(user);
  changed("messages");

  await wait(700 + Math.random() * 900);
  const result = brain.chat(agent, content, { puedeSolucion: (id) => users.puedeSolucion(req.user, id) });
  const reply = { id: newId("msg"), role: "agent", content: "", ts: null };

  // Un encargo o una programación desde el chat respeta los mismos permisos que el formulario.
  const intent = result.intent;
  const bloqueo = intent && (!users.puedeAgente(req.user, intent.agentId)
    ? `Tu rol no puede encargarle trabajo al ${byId[intent.agentId].name}.`
    : intent.kind === "schedule" && !users.puede(req.user, "programar") ? "Tu rol no puede crear programaciones." : null);

  if (bloqueo) {
    audit.registrar(req, intent.kind === "schedule" ? "intentó programar" : "intentó encargar", byId[intent.agentId].name, bloqueo, "rechazado");
    reply.content = `${bloqueo} Pedíselo a alguien de Dirección.`;
  } else if (intent?.kind === "task") {
    const { agentId, type, instruction, recipients } = intent;
    const task = createTask({ agentId, type, instruction, recipients, pedidoPor: req.user.nombre, rol: req.user.rol });
    audit.registrar(req, "encargó", byId[agentId].name, task.title);
    const who = agentId !== agent.id ? `Se lo encargué al **${byId[agentId].name}**. ` : "Lo tomo. ";
    const approval = type === "accion" || recipients.length || type === "email" ? " Antes de enviar o ejecutar te voy a pedir aprobación." : "";
    reply.content = `${who}Creé la tarea **${task.title}** (${brain.TYPES[type]}).${approval}${recipients.length ? `\n\nDestinatarios: ${recipients.join(", ")}` : ""}`;
    reply.taskId = task.id;
  } else if (intent?.kind === "schedule") {
    const { agentId, type, instruction, recipients, schedule } = intent;
    const s = scheduler.create({ agentId, type, name: brain.titleFrom(type, instruction), instruction, recipients, cron: schedule.cron });
    audit.registrar(req, "programó", byId[agentId].name, `${s.name} · ${s.cron}`);
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

app.get("/api/tasks", wrap((req) => visibles(req, db.tasks).filter((t) =>
  (!req.query.agentId || t.agentId === req.query.agentId) && (!req.query.status || t.status === req.query.status))));
app.get("/api/tasks/:id", wrap((req) => {
  const t = db.tasks.find((x) => x.id === req.params.id);
  if (!t) throw new HttpError(404, "No existe esa tarea");
  agenteVisible(req, t.agentId);
  return t;
}));
app.post("/api/tasks", wrap((req, res) => {
  agenteVisible(req, req.body.agentId);
  const perfilPedido = req.body.ia?.perfil && catIA.perfil(req.body.ia.perfil);
  exigir(!perfilPedido || !perfilPedido.roles?.length || perfilPedido.roles.includes(req.user.rol), req, "intentó usar el perfil", perfilPedido?.nombre, `El perfil ${perfilPedido?.nombre} no está habilitado para tu rol`);
  const task = createTask({ ...req.body, ia: { perfil: req.body.ia?.perfil, flujo: req.body.ia?.flujo }, source: "ceo", pedidoPor: req.user.nombre, rol: req.user.rol });
  audit.registrar(req, "encargó", byId[task.agentId].name, `${task.title}${task.ia.perfil !== "auto" || task.ia.flujo !== "auto" ? ` · IA: ${task.ia.perfil}/${task.ia.flujo}` : ""}`);
  res.status(201);
  return task;
}));

/** Texto que produjo una tarea: el entregable, el mail o la acción propuesta. */
function textoDeTarea(t) {
  const d = t.deliverableId && db.deliverables.find((x) => x.id === t.deliverableId);
  if (d) return d.content.replace(/\n\n---\n\n_[^]*$/, "");
  const e = t.emailId && db.emails.find((x) => x.id === t.emailId);
  if (e && t.type === "email") return e.body;
  return t.plan || null;
}

// Contraste: el mismo pedido a otro modelo, o el resultado a otro agente para que lo audite.
app.post("/api/tasks/:id/contraste", wrap((req, res) => {
  const t = db.tasks.find((x) => x.id === req.params.id);
  if (!t) throw new HttpError(404, "No existe esa tarea");
  const origen = agenteVisible(req, t.agentId);
  const modo = req.body?.modo === "auditar" ? "auditar" : "mismo_pedido";
  const auditor = modo === "auditar" ? agenteVisible(req, req.body?.agentId) : null;
  if (auditor && auditor.id === origen.id) throw new HttpError(400, "Elegí un agente distinto del que hizo el trabajo");
  const textoA = textoDeTarea(t);
  if (!textoA) throw new HttpError(409, "La tarea todavía no tiene un resultado para contrastar");
  const perfilPedido = req.body?.perfil && catIA.perfil(req.body.perfil);
  exigir(!perfilPedido || !perfilPedido.roles?.length || perfilPedido.roles.includes(req.user.rol), req, "intentó usar el perfil", perfilPedido?.nombre, `El perfil ${perfilPedido?.nombre} no está habilitado para tu rol`);

  const c = {
    id: newId("ctr"), modo, estado: "en_curso", ts: now(), pedidoPor: req.user.nombre,
    auditor: auditor ? { id: auditor.id, nombre: auditor.name } : null, perfil: perfilPedido?.nombre || "Automático",
    resultado: null, textoB: null, inferencias: [], costoUSD: 0
  };
  (t.contrastes ||= []).unshift(c);
  t.log.push({ ts: now(), text: modo === "auditar" ? `${req.user.nombre} pidió que el ${auditor.name} audite el resultado` : `${req.user.nombre} pidió una segunda opinión con ${c.perfil}` });
  audit.registrar(req, modo === "auditar" ? "pidió auditoría cruzada" : "pidió segunda opinión", t.title, modo === "auditar" ? `Audita: ${auditor.name}` : `Perfil: ${c.perfil}`);
  changed("tasks");

  const contextoA = contenidoBase(origen, t);
  const contextoAuditor = auditor ? brain.buildReport(auditor, { ...t, agentId: auditor.id }) : null;
  motor.contrastar({ modo, task: t, agenteOrigen: origen, agenteAuditor: auditor, perfilId: req.body?.perfil, textoA, contextoA, contextoAuditor, rol: req.user.rol })
    .then((r) => {
      Object.assign(c, { estado: "listo", resultado: r.resultado, textoB: r.textoB, textoA, inferencias: r.inferencias, simulado: r.simulado, perfil: r.perfil, costoUSD: r.inferencias.reduce((a, x) => a + (x.costoUSD || 0), 0) });
      t.log.push({ ts: now(), text: `${modo === "auditar" ? `Auditoría del ${auditor.name}` : "Segunda opinión"}: ${r.resultado.veredicto}${r.simulado ? " (simulado, sin modelo)" : ""}` });
      audit.registrar({ user: { usuario: "sistema", nombre: "Sala 24/7", rolLabel: "Sistema" }, ip: null }, modo === "auditar" ? "auditoría cruzada terminada" : "segunda opinión terminada", t.title, `${r.resultado.veredicto} · USD ${c.costoUSD.toFixed(4)}`);
    })
    .catch((e) => Object.assign(c, { estado: "error", resultado: { veredicto: "error", resumen: e.message } }))
    .finally(() => changed("tasks"));
  res.status(202);
  return c;
}));

function decidir(req, id, aprobar) {
  const t = db.tasks.find((x) => x.id === id);
  if (!t) throw new HttpError(404, "No existe esa tarea");
  exigir(users.puede(req.user, "aprobar"), req, aprobar ? "intentó aprobar" : "intentó rechazar", t.title, "Tu rol no puede aprobar ni rechazar. Lo decide Dirección.");
  const resultado = decide(id, aprobar, `${req.user.nombre} (${req.user.rolLabel})`);
  audit.registrar(req, aprobar ? "aprobó" : "rechazó", t.title, byId[t.agentId].name);
  return resultado;
}
app.post("/api/tasks/:id/approve", wrap((req) => decidir(req, req.params.id, true)));
app.post("/api/tasks/:id/reject", wrap((req) => decidir(req, req.params.id, false)));

/* ---------- Programaciones ---------- */

function puedeProgramar(req, agentId, accion) {
  exigir(users.puede(req.user, "programar"), req, `intentó ${accion}`, "Programaciones", "Tu rol no puede crear ni modificar programaciones.");
  agenteVisible(req, agentId);
}
const programacion = (id) => { const s = db.schedules.find((x) => x.id === id); if (!s) throw new HttpError(404, "No existe esa programación"); return s; };

app.get("/api/schedules", wrap((req) => visibles(req, db.schedules).filter((s) => !req.query.agentId || s.agentId === req.query.agentId)));
app.post("/api/schedules", wrap((req, res) => {
  puedeProgramar(req, req.body.agentId, "programar");
  const s = scheduler.create(req.body);
  audit.registrar(req, "programó", byId[s.agentId].name, `${s.name} · ${s.cron}`);
  res.status(201);
  return s;
}));
app.patch("/api/schedules/:id", wrap((req) => {
  const previa = programacion(req.params.id);
  puedeProgramar(req, req.body.agentId || previa.agentId, "modificar");
  const s = scheduler.update(req.params.id, req.body);
  const cambio = req.body.enabled === undefined ? "editó" : req.body.enabled ? "activó" : "pausó";
  audit.registrar(req, `${cambio} programación`, s.name, s.cron);
  return s;
}));
app.delete("/api/schedules/:id", wrap((req) => {
  const s = programacion(req.params.id);
  puedeProgramar(req, s.agentId, "eliminar");
  scheduler.remove(req.params.id);
  audit.registrar(req, "eliminó programación", s.name);
  return { ok: true };
}));
app.post("/api/schedules/:id/run", wrap((req) => {
  const s = programacion(req.params.id);
  puedeProgramar(req, s.agentId, "ejecutar");
  audit.registrar(req, "ejecutó a mano", s.name);
  return scheduler.fire(req.params.id, true);
}));
app.get("/api/cron/preview", wrap((req) => ({ next: scheduler.nextRun(String(req.query.expr || "")) })));

/* ---------- Inteligencia: modelos, perfiles y consumo ---------- */

const soloDireccion = (req, accion, recurso) => exigir(users.puede(req.user, "auditoria"), req, accion, recurso, "La configuración de modelos la administra Dirección");

const perfilPublico = (p) => {
  const m = catIA.modelo(p.principal);
  const rv = catIA.modelo(p.revisor);
  return {
    id: p.id, nombre: p.nombre, descripcion: p.descripcion, razonamiento: p.razonamiento, roles: p.roles,
    principal: m ? `${m.nombre} · ${catIA.proveedor(m.proveedor)?.nombre}` : "Sin modelo",
    revisor: rv ? `${rv.nombre} · ${catIA.proveedor(rv.proveedor)?.nombre}` : null,
    listo: [p.principal, ...(p.respaldo || [])].some((id) => catIA.modeloListo(catIA.modelo(id)).listo)
  };
};

app.get("/api/ia/opciones", wrap((req) => {
  const c = catIA.cfg();
  return {
    perfiles: c.perfiles.filter((p) => !p.roles?.length || p.roles.includes(req.user.rol)).map(perfilPublico),
    flujos: Object.values(catIA.FLUJOS).map(({ id, nombre, detalle }) => ({ id, nombre, detalle })),
    flujoPorNivel: c.flujoPorNivel
  };
}));

const modeloPublico = (m) => m && { id: m.id, nombre: m.nombre, proveedor: catIA.proveedor(m.proveedor)?.nombre, ...catIA.modeloListo(m), precio: catIA.precio(m) };

app.post("/api/ia/recomendar", wrap((req) => {
  const b = req.body || {};
  if (!byId[b.agentId]) throw new HttpError(400, "Elegí un agente");
  const plan = motor.resolver({ agentId: b.agentId, type: b.type || "reporte", instruction: b.instruction || "", recipients: String(b.recipients || "").split(/[,;\s]+/).filter(Boolean), ia: b.ia || {}, rol: req.user.rol });
  const listo = plan.cadena.some((m) => catIA.modeloListo(m).listo);
  return {
    complejidad: plan.complejidad, recomendado: plan.recomendado, origen: plan.origen,
    perfil: perfilPublico(plan.perfil), flujo: plan.flujo,
    cadena: plan.cadena.map(modeloPublico), revisor: modeloPublico(plan.revisor),
    estimacion: plan.estimacion,
    modo: listo ? "real" : "simulado",
    aviso: listo ? null : "Ningún modelo del perfil tiene clave cargada: la tarea sale con el sistema de reglas y el flujo queda simulado."
  };
}));

app.get("/api/ia/admin", wrap((req) => {
  soloDireccion(req, "intentó ver", "Configuración de modelos");
  const c = catIA.cfg();
  const mes = new Date().toISOString().slice(0, 7);
  const delMes = c.consumo.filter((x) => x.ts.startsWith(mes) && !x.simulado);
  const agrupar = (campo, nombre) => Object.values(delMes.reduce((acc, x) => {
    const k = x[campo] || "—";
    acc[k] ||= { id: k, nombre: nombre(k), costoUSD: 0, tokens: 0, llamadas: 0 };
    acc[k].costoUSD += x.costoUSD || 0; acc[k].tokens += (x.tokensIn || 0) + (x.tokensOut || 0); acc[k].llamadas++;
    return acc;
  }, {})).sort((a, b) => b.costoUSD - a.costoUSD);
  const gastado = catIA.gastoDelMes();
  const dia = new Date().getUTCDate();
  const diasMes = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0).getDate();
  return {
    proveedores: c.proveedores.map((p) => ({ ...p, estado: catIA.estadoProveedor(p), modelos: c.modelos.filter((m) => m.proveedor === p.id).length })),
    modelos: c.modelos.map((m) => ({ ...m, estado: catIA.modeloListo(m), proveedorNombre: catIA.proveedor(m.proveedor)?.nombre })),
    perfiles: c.perfiles.map((p) => ({ ...p, publico: perfilPublico(p) })),
    asignaciones: c.asignaciones, flujoPorNivel: c.flujoPorNivel, flujos: Object.values(catIA.FLUJOS),
    tiposTarea: catIA.TIPOS_TAREA, tipos: catIA.TIPOS, roles: Object.entries(users.ROLES).map(([id, r]) => ({ id, label: r.label })),
    agentes: ALL.map((a) => ({ id: a.id, nombre: a.name })),
    topes: c.topes,
    consumo: {
      gastadoUSD: gastado, proyeccionUSD: dia ? (gastado / dia) * diasMes : 0,
      diasMes, dia,
      llamadas: delMes.length,
      tokens: delMes.reduce((a, x) => a + (x.tokensIn || 0) + (x.tokensOut || 0), 0),
      tokensIn: delMes.reduce((a, x) => a + (x.tokensIn || 0), 0),
      tokensOut: delMes.reduce((a, x) => a + (x.tokensOut || 0), 0),
      errores: delMes.filter((x) => x.estado === "error").length,
      respaldos: delMes.filter((x) => x.estado === "respaldo").length,
      tareas: new Set(delMes.map((x) => x.taskId).filter(Boolean)).size,
      porDia: Array.from({ length: diasMes }, (_, i) => {
        const d = `${mes}-${String(i + 1).padStart(2, "0")}`;
        const del = delMes.filter((x) => x.ts.startsWith(d));
        return { dia: i + 1, costoUSD: del.reduce((a, x) => a + (x.costoUSD || 0), 0), llamadas: del.length, futuro: i + 1 > dia };
      }),
      porPaso: agrupar("paso", (k) => ({ borrador: "Borrador", revision: "Revisión", correccion: "Corrección", prueba: "Pruebas de conexión", "contraste-auditoria": "Auditoría cruzada", "contraste-segunda-opinion": "Segunda opinión", "contraste-comparacion": "Comparación de respuestas" }[k] || k)),
      porProveedor: agrupar("proveedor", (k) => catIA.proveedor(k)?.nombre || k),
      porModelo: agrupar("modelo", (k) => catIA.modelo(k)?.nombre || k),
      porAgente: agrupar("agentId", (k) => byId[k]?.name || (k === "—" ? "Pruebas" : k)),
      // Tareas que salieron sin modelo (sin clave o por tope): cuánto habrían costado.
      simuladas: db.tasks.filter((t) => t.ia?.modo && t.ia.modo !== "real" && (t.finishedAt || t.createdAt || "").startsWith(mes)).length,
      ultimas: delMes.slice(0, 60).map((x) => ({ ...x, modeloNombre: catIA.modelo(x.modelo)?.nombre || x.modelo, agente: byId[x.agentId]?.short || x.agentId }))
    },
    verificado: catIA.VERIFICADO
  };
}));

const cambioIA = (accion, recurso, detalle) => (req) => audit.registrar(req, accion, recurso, detalle);

app.put("/api/ia/proveedores/:id", wrap((req) => {
  soloDireccion(req, "intentó modificar", "Proveedor de IA");
  const p = catIA.guardarProveedor(req.params.id, req.body || {});
  cambioIA("configuró proveedor de IA", p.nombre, `${p.habilitado ? "habilitado" : "deshabilitado"} · ${p.baseUrl}${p.aptoDatosReales ? " · apto datos reales" : ""}`)(req);
  return { ...p, estado: catIA.estadoProveedor(p) };
}));
app.post("/api/ia/proveedores", wrap((req, res) => {
  soloDireccion(req, "intentó crear", "Proveedor de IA");
  const p = catIA.guardarProveedor("__nuevo__", req.body || {});
  cambioIA("agregó proveedor de IA", p.nombre, p.baseUrl)(req);
  res.status(201);
  return p;
}));
app.post("/api/ia/proveedores/:id/probar", wrap(async (req) => {
  soloDireccion(req, "intentó probar", "Proveedor de IA");
  const p = catIA.proveedor(req.params.id);
  if (!p) throw new HttpError(404, "No existe ese proveedor");
  const e = catIA.estadoProveedor({ ...p, habilitado: true });
  if (!e.listo) return { ok: false, mensaje: e.motivo };
  try {
    const lista = await listarModelos(p);
    return { ok: true, mensaje: `Conexión correcta: ${lista.length} modelos disponibles` };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}));
app.post("/api/ia/proveedores/:id/sincronizar", wrap(async (req) => {
  soloDireccion(req, "intentó sincronizar", "Proveedor de IA");
  const p = catIA.proveedor(req.params.id);
  if (!p) throw new HttpError(404, "No existe ese proveedor");
  const e = catIA.estadoProveedor({ ...p, habilitado: true });
  if (!e.listo) throw new HttpError(400, e.motivo);
  const remotos = await listarModelos(p).catch((err) => { throw new HttpError(502, err.message); });
  const c = catIA.cfg();
  let vinculados = 0;
  let nuevos = 0;
  for (const r of remotos.slice(0, 400)) {
    const s = catIA.slug(r.id);
    const existente = c.modelos.find((m) => m.proveedor === p.id && (m.modelo === r.id || (!m.modelo && (s === catIA.slug(m.nombre) || s.endsWith(catIA.slug(m.nombre)) || s.includes(catIA.slug(m.nombre))))));
    if (existente) {
      if (!existente.modelo) { existente.modelo = r.id; vinculados++; }
      if (r.contexto) existente.contexto = r.contexto;
      continue;
    }
    // Los modelos nuevos entran deshabilitados: Dirección revisa el precio y los habilita.
    c.modelos.push({
      id: `${p.id}:${s}`, proveedor: p.id, modelo: r.id, nombre: r.nombre, contexto: r.contexto,
      entrada: r.entrada ?? 0, salida: r.salida ?? 0, razona: false, habilitado: false,
      fuentePrecio: r.entrada != null ? `API de ${p.nombre}` : "Sin precio: cargarlo a mano", verificado: new Date().toISOString().slice(0, 10)
    });
    nuevos++;
  }
  changed("ia");
  audit.registrar(req, "sincronizó modelos", p.nombre, `${vinculados} vinculados, ${nuevos} nuevos`);
  return { vinculados, nuevos, total: remotos.length };
}));

app.put("/api/ia/modelos/:id", wrap((req) => {
  soloDireccion(req, "intentó modificar", "Modelo de IA");
  const m = catIA.guardarModelo(req.params.id, req.body || {});
  audit.registrar(req, "configuró modelo de IA", m.nombre, `${m.habilitado ? "habilitado" : "deshabilitado"} · USD ${m.entrada}/${m.salida} por millón`);
  return m;
}));
app.post("/api/ia/modelos", wrap((req, res) => {
  soloDireccion(req, "intentó crear", "Modelo de IA");
  const m = catIA.guardarModelo("__nuevo__", req.body || {});
  audit.registrar(req, "agregó modelo de IA", m.nombre, m.proveedor);
  res.status(201);
  return m;
}));
app.post("/api/ia/modelos/:id/probar", wrap(async (req) => {
  soloDireccion(req, "intentó probar", "Modelo de IA");
  const m = catIA.modelo(req.params.id);
  const e = catIA.modeloListo(m);
  if (!e.listo) return { ok: false, mensaje: e.motivo };
  try {
    const r = await completar(m, [{ role: "user", content: "Respondé solo con la palabra: listo" }], { maxTokens: 20 });
    catIA.registrarConsumo({ ts: now(), taskId: null, agentId: null, paso: "prueba", proveedor: m.proveedor, modelo: m.id, tokensIn: r.tokensIn, tokensOut: r.tokensOut, costoUSD: r.costoUSD, estado: "ok", simulado: false });
    return { ok: true, mensaje: `Respondió «${r.texto.slice(0, 40)}» en ${(r.ms / 1000).toFixed(1)} s · USD ${r.costoUSD.toFixed(6)}` };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}));

app.put("/api/ia/perfiles/:id", wrap((req) => {
  soloDireccion(req, "intentó modificar", "Perfil de IA");
  const p = catIA.guardarPerfil(req.params.id, req.body || {});
  audit.registrar(req, "configuró perfil de IA", p.nombre, `${p.principal || "sin modelo"} · revisor ${p.revisor || "—"}`);
  return p;
}));
app.post("/api/ia/perfiles", wrap((req, res) => {
  soloDireccion(req, "intentó crear", "Perfil de IA");
  const p = catIA.guardarPerfil("__nuevo__", req.body || {});
  audit.registrar(req, "agregó perfil de IA", p.nombre);
  res.status(201);
  return p;
}));
app.put("/api/ia/asignaciones", wrap((req) => {
  soloDireccion(req, "intentó modificar", "Asignaciones de IA");
  catIA.guardarAsignaciones(req.body?.asignaciones, req.body?.flujoPorNivel);
  audit.registrar(req, "cambió asignaciones de IA", "Modelos por agente y tarea");
  return { ok: true };
}));
app.put("/api/ia/topes", wrap((req) => {
  soloDireccion(req, "intentó modificar", "Topes de IA");
  catIA.guardarTopes(req.body || {});
  audit.registrar(req, "cambió topes de gasto de IA", "Consumo", `USD ${catIA.cfg().topes.mensualUSD} por mes`);
  return catIA.cfg().topes;
}));

/* ---------- Geografía (mapas) ---------- */

const GEO_PROVINCIAS = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "geo/provincias-ar.json"), "utf8"));
app.get("/api/geo/provincias", wrap((req, res) => { res.set("Cache-Control", "public, max-age=86400"); return GEO_PROVINCIAS; }));

/* ---------- Soluciones (tableros por agente) ---------- */

const SOLUCIONES = { finanzas: finanzas.META, comercial: comercial.META, rd: rd.META, operaciones: operaciones.META, produccion: produccion.META };

// Cada solución se abre solo para los roles que la necesitan; los intentos sin permiso quedan registrados.
app.use("/api/solutions/:sol", (req, res, next) => {
  const meta = SOLUCIONES[req.params.sol];
  if (!meta) return next();
  if (!users.puedeSolucion(req.user, meta.id)) {
    audit.registrar(req, "intentó consultar", meta.titulo, "Sin permiso para esta solución", "rechazado");
    return res.status(403).json({ error: `Tu rol no tiene acceso a la ${meta.titulo}` });
  }
  audit.consulta(req, meta.titulo);
  next();
});

app.get("/api/solutions", wrap((req) => Object.values(SOLUCIONES)
  .filter((m) => users.puedeSolucion(req.user, m.id))
  .map(({ id, agentId, titulo, bajada }) => ({ id, agentId, titulo, bajada }))));

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
  if (Object.keys(deltas).length) audit.registrar(req, "simuló escenario", "Solución Finanzas", Object.entries(deltas).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", "));
  return finanzas.escenario(deltas);
}));

app.get("/api/solutions/comercial", wrap(() => comercial.resumen()));
app.get("/api/solutions/comercial/oportunidades", wrap((req) => {
  const { etapa, vendedor } = req.query;
  return comercial.oportunidades().filter((o) => (!etapa || o.etapa === etapa) && (!vendedor || o.vendedor === vendedor));
}));
app.get("/api/solutions/comercial/clientes", wrap(() => comercial.clientes()));

app.get("/api/solutions/rd", wrap(() => rd.resumen()));
app.get("/api/solutions/rd/inversion", wrap((req) => {
  const monto = Number(req.query.monto ?? 200);
  if (!Number.isFinite(monto) || monto <= 0) throw new HttpError(400, "El monto tiene que ser un número mayor a cero");
  return rd.inversionAdicional(Math.min(2000, monto));
}));
app.get("/api/solutions/comercial/integracion", wrap((req) => {
  const integ = comercial.integracion(String(req.query.escenario || "probable"));
  // Quien no tiene acceso a Finanzas ve que hay impacto, pero no la caja ni el EBITDA.
  if (!users.puedeSolucion(req.user, "finanzas")) integ.finanzas = { restringido: true, nota: "El impacto en caja y EBITDA requiere acceso a la solución Finanzas" };
  return integ;
}));

/* Auditoría de punto de venta (dentro de Comercial): misiones, góndola y calidad del relevamiento. */
app.get("/api/solutions/comercial/pdv", wrap(() => pdv.resumen(db.misiones, db.tasks)));
app.get("/api/solutions/comercial/pdv/gondola/:id", wrap((req) => {
  const g = pdv.gondola(req.params.id);
  if (!g) throw new HttpError(404, "No existe ese relevamiento");
  return g;
}));
app.post("/api/solutions/comercial/pdv/misiones", wrap((req) => {
  // Crear una misión compromete saldo: la arma Comercial o Dirección, y siempre la aprueba Dirección.
  if (!["direccion", "comercial"].includes(req.user?.rol)) throw new HttpError(403, "Solo Comercial o Dirección pueden crear misiones");
  const b = req.body || {};
  const modalidad = pdv.MODALIDADES.find((m) => m.id === b.modalidad);
  if (!modalidad) throw new HttpError(400, "Elegí una modalidad");
  const nombre = String(b.nombre || "").trim().slice(0, 120);
  if (!nombre) throw new HttpError(400, "Poné un nombre a la misión");
  const puntos = Math.round(Number(b.puntos));
  if (!Number.isFinite(puntos) || puntos < 1 || puntos > 500) throw new HttpError(400, "La cantidad de puntos tiene que estar entre 1 y 500");
  const recompensa = Math.round(Number(b.recompensa));
  if (!Number.isFinite(recompensa) || recompensa < 1000 || recompensa > 20000) throw new HttpError(400, "La recompensa tiene que estar entre ARS 1.000 y 20.000");
  const lista = (v, validos) => (Array.isArray(v) ? v : []).map(String).filter((x) => validos.includes(x));
  const skus = lista(b.skus, pdv.resumen().skus.map((s) => s.id));
  const cadenas = lista(b.cadenas, pdv.CADENAS.map((c) => c.label));
  if (modalidad.id === "control" && !skus.length) throw new HttpError(400, "Elegí al menos un producto para controlar");
  if (!cadenas.length) throw new HttpError(400, "Elegí al menos una cadena");
  const mision = {
    id: `M-${String(33 + db.misiones.length).padStart(3, "0")}`, nombre, modalidad: modalidad.id, puntos, recompensa,
    pro: Boolean(b.pro) && modalidad.id === "control", fee: modalidad.fee,
    skus, cadenas, zonas: [...new Set(pdv.CADENAS.filter((c) => cadenas.includes(c.label)).map((c) => c.zona))],
    objetivo: String(b.objetivo || "").trim().slice(0, 400),
    creada: new Date().toISOString().slice(0, 10), creadaPor: req.user.nombre, taskId: null,
    // Si viene de una sugerencia del agente, queda registrado: la sugerencia deja de ofrecerse.
    sugerencia: pdv.sugerencias().some((s) => s.id === b.sugerencia) ? b.sugerencia : null
  };
  const unitario = pdv.costoUnitario(mision);
  const costo = unitario === null ? null : unitario * puntos;
  const actual = pdv.saldo(pdv.misiones(db.misiones, db.tasks));
  if (costo !== null && costo > actual.disponible) throw new HttpError(400, `Saldo insuficiente: la misión compromete ARS ${costo.toLocaleString("es-AR")} y hay ${actual.disponible.toLocaleString("es-AR")} disponibles`);
  const task = createTask({
    agentId: "comercial", type: "accion",
    title: `Publicar misión de relevamiento ${mision.id}: ${nombre}`,
    instruction: `Publicar la misión «${nombre}» (${modalidad.label}): ${puntos} puntos en ${cadenas.join(", ")}${skus.length ? `, SKU ${skus.join(", ")}` : ""}. ${costo === null ? "Costo a cotizar por el proveedor." : `Compromete hasta ARS ${costo.toLocaleString("es-AR")} (ARS ${unitario.toLocaleString("es-AR")} por relevamiento); solo se descuenta lo validado.`}`,
    pedidoPor: req.user.nombre
  });
  mision.taskId = task.id;
  db.misiones.unshift(mision);
  audit.registrar(req, "creó misión de relevamiento", `${mision.id} · ${nombre}`, `${costo === null ? "A cotizar" : `ARS ${costo.toLocaleString("es-AR")}`}${mision.sugerencia ? " · sugerida por el agente" : ""}`);
  changed("misiones");
  return { ...mision, costo };
}));

app.get("/api/solutions/operaciones", wrap(() => ({ ...operaciones.resumen(), proyeccion: operaciones.proyeccion(produccion.ORDENES) })));
app.get("/api/solutions/produccion", wrap(() => produccion.resumen()));
app.get("/api/solutions/produccion/simular", wrap((req) => produccion.simular({
  aprobarSugeridas: req.query.aprobar !== "0",
  postergarSobrantes: req.query.postergar !== "0"
})));

/* ---------- Entregables y bandeja de salida ---------- */

app.get("/api/deliverables", wrap((req) => visibles(req, db.deliverables)
  .filter((d) => !req.query.agentId || d.agentId === req.query.agentId)
  .map(({ content, ...rest }) => rest)));
app.get("/api/deliverables/:id", wrap((req) => {
  const d = db.deliverables.find((x) => x.id === req.params.id);
  if (!d) throw new HttpError(404, "No existe ese entregable");
  agenteVisible(req, d.agentId);
  audit.consulta(req, `Entregable: ${d.title}`);
  return d;
}));

app.get("/api/emails", wrap((req) => visibles(req, db.emails).filter((e) => !req.query.status || e.status === req.query.status)));
app.post("/api/emails/:id/:decision(approve|reject)", wrap((req) => {
  const e = db.emails.find((x) => x.id === req.params.id);
  if (!e) throw new HttpError(404, "No existe ese mail");
  decidir(req, e.taskId, req.params.decision === "approve");
  return e;
}));

/* ---------- Auditoría y permisos ---------- */

app.get("/api/audit", wrap((req) => {
  exigir(users.puede(req.user, "auditoria"), req, "intentó ver", "Auditoría", "Tu rol no tiene acceso a la auditoría.");
  return audit.listar({ usuario: req.query.usuario || undefined, accion: req.query.accion || undefined, limite: Math.min(1000, Number(req.query.limite) || 300) });
}));
app.get("/api/roles", wrap((req) => {
  exigir(users.puede(req.user, "auditoria"), req, "intentó ver", "Roles y permisos", "Tu rol no tiene acceso a la configuración de permisos.");
  return { roles: users.ROLES, usuarios: users.listarUsuarios() };
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
catIA.asegurar();
scheduler.init();
if (fresh) seed();
resume();
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`Sala 24/7 Copahue escuchando en http://${HOST}:${PORT}`));
