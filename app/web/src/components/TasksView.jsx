import { useState } from "react";
import { api } from "../api.js";
import { useFetch, useSesion } from "../live.jsx";
import { TYPES, TASK_STATUS, fmtDate, fmtRelative } from "../format.js";
import { TaskStatus, AgentTag } from "./Status.jsx";
import TaskForm from "./TaskForm.jsx";

export default function TasksView({ agents, focus }) {
  const [agentId, setAgentId] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const params = new URLSearchParams({ ...(agentId && { agentId }), ...(status && { status }) }).toString();
  const { data: tasks, error } = useFetch(`/api/tasks${params ? `?${params}` : ""}`);
  const [open, setOpen] = useState(focus || null);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Trabajo de los agentes</span>
          <h1>Tareas</h1>
        </div>
        <button className="btn primary" onClick={() => setCreating((v) => !v)}>{creating ? "Cerrar" : "Encargar tarea"}</button>
      </div>

      {creating && <div className="card"><TaskForm agents={agents} onDone={() => {}} onCancel={() => setCreating(false)} /></div>}

      <div className="filters">
        <label htmlFor="f-agent">Agente</label>
        <select id="f-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          <option value="">Todos</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}
        </select>
        <label htmlFor="f-status">Estado</label>
        <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(TASK_STATUS).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}
      {tasks && !tasks.length && <p className="empty">No hay tareas con esos filtros.</p>}

      <ul className="rows">
        {(tasks || []).map((t) => (
          <TaskRow key={t.id} task={t} agents={agents} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} />
        ))}
      </ul>
    </div>
  );
}

function TaskRow({ task: t, agents, open, onToggle }) {
  const { permisos } = useSesion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function decide(ok) {
    setBusy(true);
    setError(null);
    try { await api.post(`/api/tasks/${t.id}/${ok ? "approve" : "reject"}`); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <li className={`row ${open ? "open" : ""}`}>
      <button className="row-main" onClick={onToggle} aria-expanded={open}>
        <TaskStatus status={t.status} />
        <span className="row-title">{t.title}</span>
        <span className="row-meta">
          <AgentTag agents={agents} id={t.agentId} />
          <span>{TYPES[t.type]}</span>
          <span>{t.source === "programacion" ? "Programada" : "Encargada"}</span>
          <span title={fmtDate(t.createdAt, true)}>{fmtRelative(t.createdAt)}</span>
        </span>
      </button>
      {open && (
        <div className="row-detail">
          <div className="detail-grid">
            <div>
              <span className="eyebrow">Instrucción</span>
              <p>{t.instruction}</p>
              {t.recipients?.length > 0 && <p className="mini-meta">Para: {t.recipients.join(", ")}</p>}
              {t.plan && <pre className="plan">{t.plan}</pre>}
              <div className="actions">
                {t.status === "esperando_aprobacion" && permisos.aprobar && (
                  <>
                    <button className="btn primary" disabled={busy} onClick={() => decide(true)}>{t.type === "accion" ? "Aprobar acción" : "Aprobar y enviar"}</button>
                    <button className="btn" disabled={busy} onClick={() => decide(false)}>Rechazar</button>
                  </>
                )}
                {t.deliverableId && <a className="btn ghost" href={`#/entregables/${t.deliverableId}`}>Abrir entregable</a>}
                {t.emailId && <a className="btn ghost" href={`#/bandeja/${t.emailId}`}>Ver mail</a>}
              </div>
              {error && <p className="form-error">{error}</p>}
            </div>
            <div>
              <span className="eyebrow">Registro</span>
              <ol className="timeline">
                {t.log.map((l, i) => <li key={i}><time>{fmtDate(l.ts)}</time>{l.text}</li>)}
              </ol>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
