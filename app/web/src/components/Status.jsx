import { TASK_STATUS, EMAIL_STATUS } from "../format.js";

export function TaskStatus({ status }) {
  const [label, tone] = TASK_STATUS[status] || [status, "muted"];
  return <span className={`status ${tone}`}><i />{label}</span>;
}

export function EmailStatus({ status }) {
  const [label, tone] = EMAIL_STATUS[status] || [status, "muted"];
  return <span className={`status ${tone}`}><i />{label}</span>;
}

export function AgentTag({ agents, id }) {
  const a = agents.find((x) => x.id === id);
  return <span className={`agent-tag ${id === "ceo" ? "is-ceo" : ""}`}><i />{a ? a.short : id}</span>;
}
