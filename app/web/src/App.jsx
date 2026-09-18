import { useEffect, useRef, useState } from "react";
import { useFetch } from "./live.jsx";
import Room from "./components/Room.jsx";
import AgentPanel from "./components/AgentPanel.jsx";
import TasksView from "./components/TasksView.jsx";
import SchedulesView from "./components/SchedulesView.jsx";
import OutboxView from "./components/OutboxView.jsx";
import DeliverablesView from "./components/DeliverablesView.jsx";
import FinanzasView from "./components/FinanzasView.jsx";
import ComercialView from "./components/ComercialView.jsx";
import RDView from "./components/RDView.jsx";

function useRoute() {
  const read = () => (window.location.hash.replace(/^#\/?/, "") || "sala").split("/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export default function App({ user, onLogout }) {
  const [view, param] = useRoute();
  const { data: agents } = useFetch("/api/agents");
  const { data: summary } = useFetch("/api/summary");
  const agentId = view === "sala" ? param || "ceo" : null;

  // En pantallas angostas el panel queda debajo de la sala: llevarlo a la vista al cambiar de agente.
  const firstAgent = useRef(true);
  useEffect(() => {
    if (!agentId) return;
    if (firstAgent.current) { firstAgent.current = false; return; }
    if (window.matchMedia("(max-width: 900px)").matches) {
      document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [agentId]);

  const nav = [
    ["sala", "Sala"],
    ["comercial", "Comercial", null],
    ["rd", "R&D", null],
    ["finanzas", "Finanzas", null],
    ["tareas", "Tareas", summary?.pendingApprovals],
    ["programaciones", "Programaciones", null],
    ["bandeja", "Bandeja de salida", summary?.emailsPending],
    ["entregables", "Entregables", null]
  ];

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/sala">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Sala 24/7</strong>
            <small>Laboratorio Copahue</small>
          </span>
        </a>
        <nav className="nav" aria-label="Secciones">
          {nav.map(([id, label, badge]) => (
            <a key={id} href={`#/${id}`} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined}>
              {label}
              {badge ? <span className="badge">{badge}</span> : null}
            </a>
          ))}
        </nav>
        <div className="top-meta">
          {summary && <span className="pill"><i className="dot live" />{summary.runningTasks} en curso · {summary.activeSchedules} programaciones</span>}
          <span className="pill">Datos simulados</span>
          <button className="btn small ghost" type="button" onClick={onLogout} title={`Sesión: ${user}`}>Salir</button>
        </div>
      </header>

      <main className="content">
        {view === "sala" && (
          <div className="sala">
            <Room agents={agents || []} selected={agentId} />
            {agents && <AgentPanel key={agentId} agentId={agentId} agents={agents} />}
          </div>
        )}
        {view === "comercial" && <ComercialView />}
        {view === "rd" && <RDView />}
        {view === "finanzas" && <FinanzasView />}
        {view === "tareas" && <TasksView agents={agents || []} focus={param} />}
        {view === "programaciones" && <SchedulesView agents={agents || []} />}
        {view === "bandeja" && <OutboxView agents={agents || []} focus={param} />}
        {view === "entregables" && <DeliverablesView agents={agents || []} focus={param} />}
      </main>
    </div>
  );
}
