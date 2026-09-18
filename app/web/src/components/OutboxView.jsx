import { useState } from "react";
import { api } from "../api.js";
import { useFetch, useSesion } from "../live.jsx";
import { EMAIL_STATUS, fmtDate, fmtRelative } from "../format.js";
import { EmailStatus, AgentTag } from "./Status.jsx";

export default function OutboxView({ agents, focus }) {
  const { permisos } = useSesion();
  const [status, setStatus] = useState("");
  const { data: emails } = useFetch(`/api/emails${status ? `?status=${status}` : ""}`);
  const [selected, setSelected] = useState(focus || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const current = (emails || []).find((e) => e.id === selected) || (emails || [])[0];

  async function decide(ok) {
    setBusy(true);
    setError(null);
    try { await api.post(`/api/emails/${current.id}/${ok ? "approve" : "reject"}`); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Mails preparados por los agentes</span>
          <h1>Bandeja de salida</h1>
          <p className="muted">Mockup: aprobar marca el mail como enviado, pero no sale ningún correo real.</p>
        </div>
        <div className="filters">
          <label htmlFor="o-status">Estado</label>
          <select id="o-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(EMAIL_STATUS).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
      </div>

      {emails && !emails.length && <p className="empty">No hay mails en este estado.</p>}

      {emails?.length > 0 && (
        <div className="split">
          <ul className="list" aria-label="Mails">
            {emails.map((e) => (
              <li key={e.id}>
                <button className={current?.id === e.id ? "active" : ""} onClick={() => setSelected(e.id)}>
                  <span className="list-top"><AgentTag agents={agents} id={e.agentId} /><span className="mini-meta">{fmtRelative(e.createdAt)}</span></span>
                  <span className="list-title">{e.subject}</span>
                  <EmailStatus status={e.status} />
                </button>
              </li>
            ))}
          </ul>

          {current && (
            <article className="reader mail">
              <dl className="mail-head">
                <dt>De</dt><dd>{agents.find((a) => a.id === current.agentId)?.name || current.agentId} · Sala 24/7</dd>
                <dt>Para</dt><dd>{current.to.join(", ")}</dd>
                <dt>Asunto</dt><dd><strong>{current.subject}</strong></dd>
                <dt>Creado</dt><dd>{fmtDate(current.createdAt, true)}</dd>
                <dt>Estado</dt><dd><EmailStatus status={current.status} />{current.decidedAt && <span className="mini-meta"> · {fmtDate(current.decidedAt)}</span>}</dd>
              </dl>
              <pre className="mail-body">{current.body}</pre>
              <div className="actions">
                {current.status === "esperando_aprobacion" && permisos.aprobar && (
                  <>
                    <button className="btn primary" disabled={busy} onClick={() => decide(true)}>Aprobar y enviar</button>
                    <button className="btn" disabled={busy} onClick={() => decide(false)}>Rechazar</button>
                  </>
                )}
                {current.deliverableId && <a className="btn ghost" href={`#/entregables/${current.deliverableId}`}>Abrir adjunto</a>}
                <a className="btn ghost" href={`#/tareas/${current.taskId}`}>Ver tarea</a>
              </div>
              {error && <p className="form-error">{error}</p>}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
