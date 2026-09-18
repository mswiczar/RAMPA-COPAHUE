// "Cerebro" MOCK de los agentes: responde, detecta encargos y genera entregables
// a partir de los datos simulados. Se reemplaza por Claude + sistemas reales.
import { AGENTS, CEO, byId, PERIODO, MAIL_ALIASES } from "./agents.js";
import * as consultas from "./solutions/consultas.js";

export const TYPES = { reporte: "Reporte", investigacion: "Investigación", email: "Email", accion: "Acción" };

const STOP = new Set("que los las del con por para una uno como esta este estos estas hay mes son sus que cual cuales donde cuanto cuanta tengo tenemos hoy me mi nos el la lo le les de en y o a al se es un".split(" "));

export const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const tokens = (s) => norm(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.slice(0, 5));

function score(question, item) {
  const q = new Set(tokens(question));
  let s = 0;
  for (const t of new Set(tokens(item.q))) if (q.has(t)) s += 2;
  for (const t of new Set(tokens(item.a))) if (q.has(t)) s += 0.5;
  return s;
}

function bestAnswers(agent, text, n = 1) {
  const pool = agent.id === "ceo"
    ? [...CEO.qa.map((x) => ({ ...x, agent: CEO })), ...AGENTS.flatMap((a) => a.qa.map((x) => ({ ...x, agent: a })))]
    : agent.qa.map((x) => ({ ...x, agent }));
  return pool.map((x) => ({ ...x, s: score(text, x) })).sort((a, b) => b.s - a.s).slice(0, n);
}

/* ---------- Conversación ---------- */

const COMMAND = /^(?:(?:por favor|che|necesito que|quiero que|podes|podrias)\s+)*(arma|armame|armen|prepara|preparame|genera|generame|envia|enviale|enviame|manda|mandale|mandame|investiga|analiza|hace|haceme|redacta|programa|programame|crea|pedile|decile|avisale|avisa|emiti|emitir|posterga|postergar|releva|busca|compara|calcula|actualiza|revisa|revisame|agenda|agendame|recordame|todos|todas|cada)\b/;

export function chat(agent, text) {
  const t = norm(text).trim();
  const schedule = parseSchedule(t);
  if (COMMAND.test(t) || schedule) {
    const agentId = agent.id === "ceo" ? mentionedAgent(t) || "ceo" : agent.id;
    const type = inferType(t);
    const recipients = extractRecipients(text, type);
    return { intent: { kind: schedule ? "schedule" : "task", agentId, type, instruction: text.trim(), recipients, schedule } };
  }
  return { text: answer(agent, text) };
}

export function answer(agent, text) {
  // Primero, la solución del agente: datos vivos del tablero.
  const delTablero = consultas.responder(agent.id, text);
  if (delTablero) return delTablero;
  const [best] = bestAnswers(agent, text);
  if (best && best.s >= 2) {
    if (agent.id === "ceo" && best.agent.id !== "ceo") return `Según el ${best.agent.name}:\n\n${best.a}`;
    return best.a;
  }
  const alerts = (agent.id === "ceo" ? AGENTS.flatMap((a) => a.alerts.filter((x) => x.sev === "crit")) : agent.alerts)
    .map((x) => `- ${x.t}`).join("\n");
  const sources = agent.systems.map((s) => `[${s}]`).join(" ");
  return `No tengo ese dato en los sistemas conectados hoy ${sources}. Lo que sí estoy viendo:\n\n${alerts}\n\nRecomendación: si necesitás ese dato de forma recurrente, encargame un reporte o una investigación y lo agrego a las fuentes a conectar.`;
}

function mentionedAgent(t) {
  const map = [
    [/\bcomercial\b|visitador|sell.?out|share/, "comercial"],
    [/\bfinanzas\b|presupuesto|cobranza|concilia/, "finanzas"],
    [/\boperaciones\b|stock|quiebre|vencimiento|deposito/, "operaciones"],
    [/\bproduccion\b|orden de produccion|planta|capataz/, "produccion"],
    [/\bproducto\b|packaging|lanzamiento|moondesk/, "producto"],
    [/\bmarketing\b|campana|influencer|google ads|meta/, "marketing"],
    [/\blegal\b|\briesgo\b|contrato|registro|ley 25/, "legal"],
    [/\br&d\b|\brd\b|\bi\+d\b|tendencia|segmento|investigacion y desarrollo/, "rd"]
  ];
  for (const [re, id] of map) if (re.test(t)) return id;
  return null;
}

function inferType(t) {
  if (/\b(investiga|analiza|releva|busca|compara|averigua|investigacion|analisis|tendencias?|oportunidad)/.test(t)) return "investigacion";
  if (/\b(emiti|emitir|orden de|posterga|postergar|pausa|pausar|aproba|actualiza|ajusta|carga)/.test(t)) return "accion";
  if (/\b(reporte|informe|resumen|brief|tablero)\b/.test(t)) return "reporte";
  if (/\b(mail|email|correo|enviale|mandale|envia|manda|avisale|avisa)\b/.test(t)) return "email";
  return "reporte";
}

export function extractRecipients(text, type) {
  const t = norm(text);
  const found = new Set(String(text).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []);
  const re = /(?:mail|correo|envia\w*|manda\w*|avisa\w*|para|a)\s+(?:a\s+|al\s+equipo\s+de\s+|el\s+equipo\s+de\s+)?(direccion|finanzas|comercial|marketing|legal|operaciones|produccion|producto)\b/g;
  let m;
  while ((m = re.exec(t))) {
    if (/mail|correo|envia|manda|avisa|para/.test(m[0]) || type === "email") found.add(MAIL_ALIASES[m[1]]);
  }
  if (/\bmandame|enviame|avisame\b/.test(t)) found.add(MAIL_ALIASES.direccion);
  if (type === "email" && found.size === 0) found.add(MAIL_ALIASES.direccion);
  return [...found];
}

/* ---------- Programaciones en lenguaje natural ---------- */

const DOW = { domingo: 0, domingos: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, sabados: 6 };

export function parseSchedule(t) {
  const hm = t.match(/a las (\d{1,2})(?:[:.](\d{2}))?/);
  const h = hm ? Math.min(23, Number(hm[1])) : 8;
  const m = hm && hm[2] ? Math.min(59, Number(hm[2])) : 0;
  const at = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  let r;
  if ((r = t.match(/cada (\d+) minutos?/))) return { cron: `*/${Math.max(1, Number(r[1]))} * * * *`, label: `cada ${r[1]} minutos` };
  if ((r = t.match(/cada (\d+) horas?/))) return { cron: `0 */${Math.max(1, Number(r[1]))} * * *`, label: `cada ${r[1]} horas` };
  if (/cada hora/.test(t)) return { cron: "0 * * * *", label: "cada hora" };
  if (/dias habiles|dia habil|de lunes a viernes/.test(t)) return { cron: `${m} ${h} * * 1-5`, label: `días hábiles a las ${at}` };
  if ((r = t.match(/(?:todos los|cada) (lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)/))) return { cron: `${m} ${h} * * ${DOW[r[1]]}`, label: `todos los ${r[1]} a las ${at}` };
  if (/todos los dias|cada dia|diariamente|\bdiario\b/.test(t)) return { cron: `${m} ${h} * * *`, label: `todos los días a las ${at}` };
  if (/cada semana|semanal/.test(t)) return { cron: `${m} ${h} * * 1`, label: `todos los lunes a las ${at}` };
  if (/cada mes|todos los meses|mensual|primer dia de cada mes|1 de cada mes/.test(t)) return { cron: `${m} ${h} 1 * *`, label: `el 1° de cada mes a las ${at}` };
  return null;
}

export function titleFrom(type, instruction) {
  const W = "[\\wáéíóúñ]+";
  let s = String(instruction).trim()
    .replace(/^(por favor|che|necesito que|quiero que)[,\s]+/i, "")
    .replace(new RegExp(`^(todos los ${W}|todas las ${W}|cada ${W}(?: ${W})?|de lunes a viernes|los días hábiles)(?:\\s+a las \\d{1,2}(?:[:.]\\d{2})?)?[,\\s]+`, "i"), "")
    .replace(new RegExp(`^(pedile|pedíle|decile|avisale)\\s+al?\\s+(?:agente\\s+(?:de\\s+)?)?${W}(?:\\s+y\\s+${W})?\\s+(?:que\\s+)?`, "i"), "")
    .replace(/\s+(todos los|todas las|cada)\s.*$/i, "")
    .replace(/\s+y\s+(mand|envi|avis)[\wáéíóú]*\s.*$/i, "")
    .replace(/^(un|una)\s+/i, "")
    .replace(/[.!?]+$/, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s.length > 70 ? s.slice(0, 67).trimEnd() + "…" : s || TYPES[type];
}

/* ---------- Entregables ---------- */

const esc = (s) => String(s).replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
const human = (k) => { const s = k.replace(/_/g, " "); return s.charAt(0).toUpperCase() + s.slice(1); };
const num = (v) => (typeof v === "number" ? v.toLocaleString("es-AR") : String(v));

function tables(agent) {
  return Object.entries(agent.data).map(([key, set]) => {
    const rows = set.filas || [];
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]);
    return `### ${human(key)}\n\n_Fuente: ${set.fuente}_\n\n| ${cols.map(human).join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |\n${rows.map((r) => `| ${cols.map((c) => num(r[c])).join(" | ")} |`).join("\n")}`;
  }).filter(Boolean).join("\n\n");
}

const recs = (answers) => answers.map((x) => (x.a.match(/Recomendación:\s*(.*)/) || [])[1]).filter(Boolean);
const withoutRec = (a) => a.replace(/\n*Recomendación:.*$/s, "").trim();

const stamp = () => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "long", timeStyle: "short" }).format(new Date());

function ceoReport(task) {
  const crit = AGENTS.map((a) => ({ a, al: a.alerts.filter((x) => x.sev !== "info") })).filter((x) => x.al.length);
  return `# ${esc(task.title)}\n\n_CEO · Centro de decisión · ${stamp()} · Datos simulados de demostración_\n\n## Pedido\n\n> ${esc(task.instruction)}\n\n## Lo que requiere atención\n\n${crit.map(({ a, al }) => `**${a.name}**\n\n${al.map((x) => `- ${x.t}`).join("\n")}`).join("\n\n")}\n\n## Lectura integrada\n\n${withoutRec(CEO.qa[0].a)}\n\n## Decisiones de la semana\n\n${withoutRec(CEO.qa[1].a)}\n\n## Recomendación\n\n${recs(CEO.qa.slice(0, 2)).map((r) => `- ${r}`).join("\n")}`;
}

export function buildReport(agent, task) {
  if (agent.id === "ceo") return ceoReport(task);
  const top = bestAnswers(agent, `${task.title} ${task.instruction}`, 2);
  return `# ${esc(task.title)}\n\n_${agent.name} · ${stamp()} · Período: ${PERIODO} · Datos simulados de demostración_\n\n## Pedido\n\n> ${esc(task.instruction)}\n\n## Resumen\n\n${agent.alerts.map((x) => `- ${x.t}`).join("\n")}\n\n## Análisis\n\n${top.map((x) => withoutRec(x.a)).join("\n\n")}\n\n## Datos\n\n${tables(agent)}\n\n## Recomendaciones\n\n${recs(top).map((r) => `- ${r}`).join("\n")}\n\n_Fuentes consultadas: ${agent.systems.join(", ")}._`;
}

export function buildResearch(agent, task) {
  const src = agent.id === "ceo" ? CEO : agent;
  const top = bestAnswers(src, `${task.title} ${task.instruction}`, 3);
  const systems = [...new Set(top.flatMap((x) => x.agent.systems))];
  return `# Investigación: ${esc(task.title)}\n\n_${src.name} · ${stamp()} · Datos simulados de demostración_\n\n## Pregunta\n\n> ${esc(task.instruction)}\n\n## Hallazgos\n\n${top.map((x, i) => `### ${i + 1}. ${x.q.replace(/[¿?]/g, "")}\n\n${withoutRec(x.a)}`).join("\n\n")}\n\n## Conclusiones\n\n${recs(top).map((r) => `- ${r}`).join("\n")}\n\n## Fuentes consultadas\n\n${systems.map((s) => `- ${s}`).join("\n")}\n\n## Límites\n\n- Trabajo hecho sobre datos simulados. En producción, el agente consulta los sistemas reales y cita cada registro.\n- Lo que no está en estas fuentes queda marcado como faltante, sin estimar.`;
}

export function buildEmail(agent, task, deliverable) {
  const top = bestAnswers(agent.id === "ceo" ? CEO : agent, `${task.title} ${task.instruction}`, 1)[0];
  const body = deliverable
    ? `Hola,\n\nAdjunto «${deliverable.title}». Lo más importante:\n\n${(agent.id === "ceo" ? CEO.alerts : agent.alerts).map((x) => `- ${x.t}`).join("\n")}\n\nEl detalle completo está en la sección Entregables de la Sala 24/7.\n\nSaludos,\n${agent.name} · Sala 24/7 Copahue`
    : `Hola,\n\n${task.instruction.replace(/^(\w)/, (c) => c.toUpperCase())}\n\n${top ? withoutRec(top.a).replace(/\*\*/g, "").replace(/\s*\[[^\]]+\]/g, "") : ""}\n\nSaludos,\n${agent.name} · Sala 24/7 Copahue`;
  return { subject: `[Sala 24/7] ${task.title}`, body };
}

export function actionPlan(agent, task) {
  const top = bestAnswers(agent, `${task.title} ${task.instruction}`, 1)[0];
  return `Acción propuesta: ${task.instruction}${top ? `\n\nFundamento: ${withoutRec(top.a).replace(/\*\*/g, "")}` : ""}`;
}

export { byId };
