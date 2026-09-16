import { useState } from "react";
import { useFetch } from "../live.jsx";
import { TYPES, fmtDate, fmtRelative } from "../format.js";
import { AgentTag } from "./Status.jsx";
import Markdown from "./Markdown.jsx";

export default function DeliverablesView({ agents, focus }) {
  const [kind, setKind] = useState("");
  const { data: list } = useFetch("/api/deliverables");
  const items = (list || []).filter((d) => !kind || d.kind === kind);
  const [selected, setSelected] = useState(focus || null);
  const currentId = items.some((d) => d.id === selected) ? selected : items[0]?.id;
  const { data: doc } = useFetch(currentId ? `/api/deliverables/${currentId}` : null);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Lo que produjeron los agentes</span>
          <h1>Entregables</h1>
        </div>
        <div className="filters">
          <label htmlFor="d-kind">Tipo</label>
          <select id="d-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Todos</option>
            <option value="reporte">Reportes</option>
            <option value="investigacion">Investigaciones</option>
          </select>
        </div>
      </div>

      {list && !items.length && <p className="empty">Todavía no hay entregables de este tipo.</p>}

      {items.length > 0 && (
        <div className="split">
          <ul className="list" aria-label="Entregables">
            {items.map((d) => (
              <li key={d.id}>
                <button className={currentId === d.id ? "active" : ""} onClick={() => setSelected(d.id)}>
                  <span className="list-top"><AgentTag agents={agents} id={d.agentId} /><span className="mini-meta">{fmtRelative(d.createdAt)}</span></span>
                  <span className="list-title">{d.title}</span>
                  <span className="mini-meta">{TYPES[d.kind]}</span>
                </button>
              </li>
            ))}
          </ul>
          <article className="reader">
            {doc && doc.id === currentId ? (
              <>
                <div className="reader-meta">
                  <span>{TYPES[doc.kind]} · {fmtDate(doc.createdAt, true)}</span>
                  <a href={`#/tareas/${doc.taskId}`}>Ver tarea</a>
                </div>
                <Markdown text={doc.content} className="doc" />
              </>
            ) : <p className="thinking">Cargando…</p>}
          </article>
        </div>
      )}
    </div>
  );
}
