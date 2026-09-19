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
import OperacionesView from "./components/OperacionesView.jsx";
import ProduccionView from "./components/ProduccionView.jsx";
import AuditView from "./components/AuditView.jsx";
import ModelosView from "./components/ModelosView.jsx";
import AyudaPopup from "./ayuda/AyudaPopup.jsx";
import GuiaPrimeraVez from "./ayuda/GuiaPrimeraVez.jsx";

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

export default function App({ user, permisos, onLogout }) {
  const [view, param, detalle] = useRoute();
  const { data: agents } = useFetch("/api/agents");
  const { data: summary } = useFetch("/api/summary");
  // Sin acceso al CEO, la sala abre en el primer agente que el rol puede ver.
  const agenteInicial = permisos.agentes.includes("ceo") ? "ceo" : permisos.agentes[0];
  const agentId = view === "sala" ? param || agenteInicial : null;
  // Un rol sin agentes (solo lectura) entra directo a su primera solución.
  useEffect(() => {
    if (view === "sala" && !permisos.agentes.length && permisos.soluciones.length) window.location.hash = `#/${permisos.soluciones[0]}`;
  }, [view, permisos]);
  const puedeVer = (id) => ["comercial", "rd", "operaciones", "produccion", "finanzas"].includes(id) ? permisos.soluciones.includes(id) : id === "auditoria" || id === "modelos" ? permisos.auditoria : id === "sala" ? permisos.agentes.length > 0 : true;

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
    ["operaciones", "Operaciones", null],
    ["produccion", "Producción", null],
    ["finanzas", "Finanzas", null],
    ["tareas", "Tareas", summary?.pendingApprovals],
    ["programaciones", "Programaciones", null],
    ["bandeja", "Bandeja de salida", summary?.emailsPending],
    ["entregables", "Entregables", null],
    ["modelos", "Modelos", null],
    ["auditoria", "Auditoría", null]
  ].filter(([id]) => puedeVer(id));

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
          <AyudaPopup />
          <span className="pill usuario" title="Sesión iniciada"><i className="rol-dot" />{user.nombre} · {user.rolLabel}</span>
          <button className="btn small ghost" type="button" onClick={onLogout}>Salir</button>
        </div>
      </header>

      <main className="content">
        {!puedeVer(view) && <SinPermiso vista={view} />}
        {view === "sala" && puedeVer("sala") && (
          <div className="sala">
            <Room agents={agents || []} selected={agentId} />
            {agents && <AgentPanel key={agentId} agentId={agentId} agents={agents} />}
          </div>
        )}
        {view === "auditoria" && puedeVer("auditoria") && <AuditView key={param} sub={param} />}
        {view === "modelos" && puedeVer("modelos") && <ModelosView key={param} sub={param} />}
        {view === "comercial" && puedeVer("comercial") && <ComercialView key={param} sub={param} detalle={detalle} />}
        {view === "rd" && puedeVer("rd") && <RDView key={param} sub={param} />}
        {view === "operaciones" && puedeVer("operaciones") && <OperacionesView key={param} sub={param} />}
        {view === "produccion" && puedeVer("produccion") && <ProduccionView key={param} sub={param} />}
        {view === "finanzas" && puedeVer("finanzas") && <FinanzasView key={param} sub={param} />}
        {view === "tareas" && <TasksView agents={agents || []} focus={param} />}
        {view === "programaciones" && <SchedulesView agents={agents || []} />}
        {view === "bandeja" && <OutboxView agents={agents || []} focus={param} />}
        {view === "entregables" && <DeliverablesView agents={agents || []} focus={param} />}
      </main>
      {puedeVer(view) && <GuiaPrimeraVez />}
    </div>
  );
}

function SinPermiso({ vista }) {
  return (
    <div className="page">
      <div className="card">
        <span className="eyebrow">Acceso restringido</span>
        <h2>Tu rol no tiene acceso a esta sección</h2>
        <p className="muted">La información de «{vista}» está reservada a los roles que la necesitan para decidir. Si te hace falta, pedíselo a Dirección.</p>
      </div>
    </div>
  );
}
