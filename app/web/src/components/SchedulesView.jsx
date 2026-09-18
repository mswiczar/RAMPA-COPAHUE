import { useState } from "react";
import { api } from "../api.js";
import { useFetch, useSesion } from "../live.jsx";
import { TYPES, fmtDate, fmtRelative, describeCron } from "../format.js";
import { AgentTag } from "./Status.jsx";
import TaskForm from "./TaskForm.jsx";

export default function SchedulesView({ agents }) {
  const { permisos } = useSesion();
  const { data: schedules, error } = useFetch("/api/schedules");
  const [editing, setEditing] = useState(null); // null | "new" | schedule
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function act(id, fn) {
    setBusy(id);
    setActionError(null);
    try { await fn(); } catch (e) { setActionError(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Crontab de los agentes</span>
          <h1>Programaciones</h1>
          <p className="muted">Reportes, mails e investigaciones que los agentes ejecutan solos, en hora de Buenos Aires.</p>
        </div>
        {permisos.programar && <button className="btn primary" onClick={() => setEditing(editing ? null : "new")}>{editing ? "Cerrar" : "Nueva programación"}</button>}
      </div>

      {editing && (
        <div className="card">
          <TaskForm
            key={editing === "new" ? "new" : editing.id}
            agents={agents} mode="schedule"
            initial={editing === "new" ? null : editing}
            onDone={() => setEditing(null)} onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {(error || actionError) && <p className="form-error">{error || actionError}</p>}
      {schedules && !schedules.length && <p className="empty">No hay programaciones. Creá una o pedíselo a un agente: «Todos los lunes a las 8 armá el reporte comercial».</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Activa</th>
              <th scope="col">Programación</th>
              <th scope="col">Agente</th>
              <th scope="col">Frecuencia</th>
              <th scope="col">Próxima</th>
              <th scope="col">Última</th>
              <th scope="col"><span className="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {(schedules || []).map((s) => (
              <tr key={s.id} className={s.enabled ? "" : "is-off"}>
                <td>
                  <label className="switch">
                    <input
                      type="checkbox" checked={s.enabled} disabled={busy === s.id || !permisos.programar}
                      onChange={(e) => act(s.id, () => api.patch(`/api/schedules/${s.id}`, { enabled: e.target.checked }))}
                    />
                    <span aria-hidden="true" />
                    <span className="visually-hidden">{s.enabled ? "Pausar" : "Activar"} {s.name}</span>
                  </label>
                </td>
                <td>
                  <strong>{s.name}</strong>
                  <span className="cell-sub">{TYPES[s.type]}{s.recipients.length ? ` · para ${s.recipients.join(", ")}` : ""}{s.requiresApproval ? "" : " · envía sin aprobación"}</span>
                </td>
                <td><AgentTag agents={agents} id={s.agentId} /></td>
                <td>
                  {describeCron(s.cron)}
                  <code className="cell-sub">{s.cron}</code>
                </td>
                <td className="num">{s.enabled ? <>{fmtDate(s.nextRunAt)}<span className="cell-sub">{fmtRelative(s.nextRunAt)}</span></> : "—"}</td>
                <td className="num">{s.lastRunAt ? <>{fmtDate(s.lastRunAt)}<span className="cell-sub">{s.runs} ejecuciones</span></> : "Nunca"}</td>
                <td className="row-actions">{permisos.programar && <>
                  <button className="btn small" disabled={busy === s.id} onClick={() => act(s.id, () => api.post(`/api/schedules/${s.id}/run`))}>Ejecutar ahora</button>
                  <button className="btn small ghost" onClick={() => setEditing(s)}>Editar</button>
                  <button
                    className="btn small ghost danger" disabled={busy === s.id}
                    onClick={() => window.confirm(`¿Eliminar «${s.name}»?`) && act(s.id, () => api.del(`/api/schedules/${s.id}`))}
                  >Eliminar</button>
                </>}                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
