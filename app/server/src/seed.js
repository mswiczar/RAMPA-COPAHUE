// Datos iniciales para que la sala abra con actividad realista.
import { db, changed } from "./store.js";
import { createTask, produce, decide } from "./worker.js";
import * as scheduler from "./scheduler.js";

const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();

export function seed() {
  const schedules = [
    { agentId: "ceo", name: "Brief de dirección", type: "reporte", cron: "30 7 * * 1-5", instruction: "Armá el brief del día con lo que requiere decisión.", recipients: ["direccion@copahue.demo"], requiresApproval: false },
    { agentId: "comercial", name: "Reporte semanal comercial", type: "reporte", cron: "0 8 * * 1", instruction: "Reporte de sell-in, sell-out y share por zona, con productividad de visitadores.", recipients: ["direccion@copahue.demo", "comercial@copahue.demo"], requiresApproval: true },
    { agentId: "operaciones", name: "Quiebres en farmacias online", type: "investigacion", cron: "0 7 * * *", instruction: "Relevá los quiebres de stock en farmacias online y cruzalos con el stock en depósito.", recipients: [], requiresApproval: true },
    { agentId: "finanzas", name: "Conciliación diaria del e-commerce", type: "reporte", cron: "30 18 * * 1-5", instruction: "Conciliá Shopify, Mercado Libre y Mercado Pago contra Tango y listá las órdenes sin factura.", recipients: ["finanzas@copahue.demo"], requiresApproval: true },
    { agentId: "legal", name: "Vencimientos de la semana", type: "email", cron: "0 9 * * 1", instruction: "Avisá los vencimientos de contratos y registros de los próximos 60 días.", recipients: ["direccion@copahue.demo", "legal@copahue.demo"], requiresApproval: true },
    { agentId: "rd", name: "Radar de tendencias", type: "investigacion", cron: "0 10 1 * *", instruction: "Investigá qué segmentos crecen y qué tendencias de consumo conviene aprovechar.", recipients: [], requiresApproval: true },
    { agentId: "produccion", name: "Pulso de producción (demo)", type: "reporte", cron: "*/15 * * * *", instruction: "Revisá si el plan de producción cubre la demanda del próximo ciclo.", recipients: [], requiresApproval: true, enabled: false }
  ];
  schedules.forEach((s) => scheduler.create(s));

  const history = [
    { h: 50, agentId: "comercial", type: "reporte", title: "Reporte semanal comercial", instruction: "Reporte de sell-in, sell-out y share por zona, con productividad de visitadores.", recipients: ["direccion@copahue.demo", "comercial@copahue.demo"], source: "programacion", approve: true },
    { h: 9, agentId: "operaciones", type: "investigacion", title: "Quiebres en farmacias online", instruction: "Relevá los quiebres de stock en farmacias online y cruzalos con el stock en depósito.", source: "programacion" },
    { h: 5, agentId: "rd", type: "investigacion", title: "Oportunidad en protección solar facial", instruction: "Investigá la oportunidad de lanzamiento en protección solar facial." },
    { h: 3, agentId: "finanzas", type: "email", title: "Órdenes online sin facturar", instruction: "Mandale a Finanzas el detalle de las órdenes online sin factura en Tango.", recipients: ["finanzas@copahue.demo"] },
    { h: 2, agentId: "produccion", type: "accion", title: "Emitir orden adicional de FPS50 por 6.000 u", instruction: "Emitir orden adicional de Protector Solar FPS50 por 6.000 unidades." },
    { h: 1, agentId: "legal", type: "email", title: "Preaviso contrato Droguería B", instruction: "Avisá a Dirección que hay que dar preaviso a Droguería B antes del 01/10.", recipients: ["direccion@copahue.demo", "legal@copahue.demo"] }
  ];

  for (const item of history) {
    const task = createTask(item, { run: false });
    const ts = ago(item.h);
    task.createdAt = ts;
    task.startedAt = ts;
    task.log.forEach((l) => (l.ts = ts));
    produce(task);
    task.log.forEach((l) => (l.ts = ts));
    for (const coll of ["deliverables", "emails"]) db[coll].filter((x) => x.taskId === task.id).forEach((x) => (x.createdAt = ts));
    if (task.status === "completada") task.finishedAt = ts;
    if (item.approve) decide(task.id, true);
  }
  db.activity.forEach((a, i) => (a.ts = ago(Math.min(50, i * 0.4))));
  changed("seed");
}
