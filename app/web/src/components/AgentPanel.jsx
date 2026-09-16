import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useFetch } from "../live.jsx";
import { TYPES, fmtRelative, describeCron } from "../format.js";
import Markdown from "./Markdown.jsx";
import TaskForm from "./TaskForm.jsx";
import { TaskStatus, AgentTag } from "./Status.jsx";

export default function AgentPanel({ agentId, agents }) {
  const agent = agents.find((a) => a.id === agentId) || agents.find((a) => a.id === "ceo");
  const isCeo = agent.id === "ceo";
  const [tab, setTab] = useState("chat");

  const tabs = [
    ["chat", "Conversar"],
    ["encargar", "Encargar tarea"],
    ["trabajo", "Trabajo"],
    ...(isCeo ? [["aprobaciones", "Aprobaciones"]] : [])
  ];

  return (
    <section className="panel" aria-label={agent.name}>
      <header className="p-head">
        <span className={`p-dot ${isCeo ? "is-ceo" : ""}`} aria-hidden="true" />
        <div>
          <h2>{isCeo ? "CEO · Centro de decisión" : agent.name}</h2>
          <p>{agent.tagline}</p>
        </div>
        <div className="sys">{agent.systems.map((s) => <span key={s}>{s}</span>)}</div>
      </header>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
            {id === "trabajo" && agent.activeTasks + agent.pendingApprovals > 0 && <span className="badge">{agent.activeTasks + agent.pendingApprovals}</span>}
          </button>
        ))}
      </div>
      {tab === "chat" && <Chat agent={agent} />}
      {tab === "encargar" && <div className="p-body"><TaskForm agents={agents} agentId={isCeo ? undefined : agent.id} onDone={() => setTab("trabajo")} /></div>}
      {tab === "trabajo" && <Work agent={agent} agents={agents} />}
      {tab === "aprobaciones" && <Approvals agents={agents} />}
    </section>
  );
}

function Chat({ agent }) {
  const { data: messages } = useFetch(`/api/agents/${agent.id}/messages`);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const logRef = useRef(null);
  const isCeo = agent.id === "ceo";

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages, pending]);

  async function send(text) {
    text = text.trim();
    if (!text || pending) return;
    setDraft("");
    setError(null);
    setPending(text);
    try {
      await api.post(`/api/agents/${agent.id}/messages`, { content: text });
    } catch (e) {
      setError(e.message);
      setDraft(text);
    } finally {
      setPending(null);
    }
  }

  const list = messages || [];
  const lastIsPending = pending && list.length && list[list.length - 1].role === "user" && list[list.length - 1].content === pending;

  return (
    <>
      <div className="log" ref={logRef}>
        <div className="alerts">
          <span className="eyebrow">Hoy detectó</span>
          {agent.alerts.map((al) => (
            <div key={al.t} className={`alert ${al.sev}`}><i />{al.t}</div>
          ))}
        </div>
        {list.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.role === "user" ? m.content : (
              <>
                <div className="who">{isCeo ? "Centro de decisión" : agent.name}</div>
                <Markdown text={m.content} />
                {m.taskId && <a className="msg-link" href={`#/tareas/${m.taskId}`}>Ver tarea →</a>}
                {m.scheduleId && <a className="msg-link" href="#/programaciones">Ver programación →</a>}
              </>
            )}
          </div>
        ))}
        {pending && !lastIsPending && <div className="msg user">{pending}</div>}
        {pending && <div className="msg agent"><div className="who">{agent.name}</div><p className="thinking">Consultando sistemas…</p></div>}
        {error && <p className="form-error">{error}</p>}
      </div>
      <div className="suggest">
        {agent.suggestions.map((q) => (
          <button key={q} type="button" className="chip" disabled={!!pending} onClick={() => send(q)}>{q}</button>
        ))}
      </div>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <label htmlFor={`q-${agent.id}`} className="visually-hidden">Mensaje para {agent.name}</label>
        <textarea
          id={`q-${agent.id}`} rows={2} value={draft}
          placeholder={isCeo ? "Preguntá o pedí: «Pedile a Finanzas un reporte de cobranzas y mandalo a Dirección»" : "Preguntá o encargá: «Todos los lunes a las 8 armá el reporte y mandalo a Dirección»"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
        />
        <button className="btn primary" type="submit" disabled={!!pending || !draft.trim()}>Enviar</button>
      </form>
    </>
  );
}

function Work({ agent, agents }) {
  const q = agent.id === "ceo" ? "" : `?agentId=${agent.id}`;
  const { data: tasks } = useFetch(`/api/tasks${q}`);
  const { data: schedules } = useFetch(`/api/schedules${q}`);
  return (
    <div className="p-body stack">
      <div>
        <div className="row-head"><span className="eyebrow">Tareas recientes</span><a href="#/tareas">Ver todas</a></div>
        {!tasks?.length && <p className="empty">Todavía no hay tareas. Encargale algo desde «Encargar tarea».</p>}
        <ul className="mini-list">
          {(tasks || []).slice(0, 8).map((t) => (
            <li key={t.id}>
              <a href={`#/tareas/${t.id}`}>
                <span className="mini-title">{t.title}</span>
                <span className="mini-meta">
                  {agent.id === "ceo" && <AgentTag agents={agents} id={t.agentId} />}
                  {TYPES[t.type]} · {t.source === "programacion" ? "programada" : "encargada"} · {fmtRelative(t.createdAt)}
                </span>
              </a>
              <TaskStatus status={t.status} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="row-head"><span className="eyebrow">Programaciones</span><a href="#/programaciones">Administrar</a></div>
        {!schedules?.length && <p className="empty">Sin programaciones.</p>}
        <ul className="mini-list">
          {(schedules || []).slice(0, 8).map((s) => (
            <li key={s.id}>
              <span>
                <span className="mini-title">{s.name}</span>
                <span className="mini-meta">
                  {agent.id === "ceo" && <AgentTag agents={agents} id={s.agentId} />}
                  {describeCron(s.cron)} · {s.enabled ? `próxima ${fmtRelative(s.nextRunAt)}` : "pausada"}
                </span>
              </span>
              <span className={`status ${s.enabled ? "ok" : "muted"}`}><i />{s.enabled ? "Activa" : "Pausada"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Approvals({ agents }) {
  const { data: tasks } = useFetch("/api/tasks?status=esperando_aprobacion");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function decide(id, ok) {
    setBusy(id);
    setError(null);
    try { await api.post(`/api/tasks/${id}/${ok ? "approve" : "reject"}`); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="p-body stack">
      <span className="eyebrow">Esperan tu aprobación</span>
      {error && <p className="form-error">{error}</p>}
      {tasks && !tasks.length && <p className="empty">No hay nada pendiente. Los agentes te van a pedir aprobación antes de enviar mails o ejecutar acciones.</p>}
      {(tasks || []).map((t) => (
        <article key={t.id} className="approval">
          <div className="approval-head">
            <AgentTag agents={agents} id={t.agentId} />
            <span className="mini-meta">{TYPES[t.type]} · {fmtRelative(t.createdAt)}</span>
          </div>
          <h3>{t.title}</h3>
          <p className="muted">{t.instruction}</p>
          {t.recipients?.length > 0 && <p className="mini-meta">Para: {t.recipients.join(", ")}</p>}
          <div className="actions">
            <button className="btn primary" disabled={busy === t.id} onClick={() => decide(t.id, true)}>{t.type === "accion" ? "Aprobar acción" : "Aprobar y enviar"}</button>
            <button className="btn" disabled={busy === t.id} onClick={() => decide(t.id, false)}>Rechazar</button>
            <a className="btn ghost" href={t.emailId ? `#/bandeja/${t.emailId}` : `#/tareas/${t.id}`}>Ver detalle</a>
          </div>
        </article>
      ))}
    </div>
  );
}
