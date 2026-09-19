import { useState } from "react";
import { marcarRuta } from "../ayuda/util.js";
import { useFetch } from "../live.jsx";
import { fmtDate, fmtRelative } from "../format.js";

const SOLUCIONES = { comercial: "Comercial", finanzas: "Finanzas", rd: "R&D", operaciones: "Operaciones", produccion: "Producción" };

export default function AuditView({ sub }) {
  const [tab, setTab] = useState(sub === "permisos" ? "permisos" : "registro");
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Gobierno de la Sala</span>
          <h1>Auditoría y permisos</h1>
          <p className="muted">Quién consultó, preguntó, encargó, programó, aprobó o rechazó qué, y cuándo. Solo lo ve Dirección.</p>
        </div>
      </div>
      <div className="tabs solution-tabs" role="tablist">
        {[["registro", "Registro"], ["permisos", "Roles y permisos"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); marcarRuta(id === "registro" ? "auditoria" : `auditoria/${id}`); }}>{label}</button>
        ))}
      </div>
      {tab === "registro" ? <Registro /> : <Permisos />}
    </div>
  );
}

function Registro() {
  const [usuario, setUsuario] = useState("");
  const [soloRechazos, setSoloRechazos] = useState(false);
  const { data: registros } = useFetch(`/api/audit${usuario ? `?usuario=${encodeURIComponent(usuario)}` : ""}`);
  const { data: roles } = useFetch("/api/roles");
  const lista = (registros || []).filter((r) => !soloRechazos || r.resultado === "rechazado");

  return (
    <section className="card wide">
      <div className="card-head">
        <h2>Registro de actividad</h2>
        <div className="filters">
          <label htmlFor="a-usuario">Usuario</label>
          <select id="a-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)}>
            <option value="">Todos</option>
            {(roles?.usuarios || []).map((u) => <option key={u.usuario} value={u.usuario}>{u.nombre}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={soloRechazos} onChange={(e) => setSoloRechazos(e.target.checked)} /> Solo accesos rechazados</label>
        </div>
      </div>
      {registros && !lista.length && <p className="empty">No hay registros con esos filtros.</p>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th scope="col">Cuándo</th><th scope="col">Usuario</th><th scope="col">Acción</th><th scope="col">Sobre qué</th><th scope="col">Detalle</th><th scope="col">Resultado</th></tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id} className={r.resultado === "rechazado" ? "rechazado" : ""}>
                <td className="num" title={fmtDate(r.ts, true)}>{fmtDate(r.ts)}<span className="cell-sub">{fmtRelative(r.ts)}</span></td>
                <td>{r.usuario}<span className="cell-sub">{r.rol}</span></td>
                <td>{r.accion}</td>
                <td>{r.recurso}</td>
                <td className="detalle">{r.detalle || "—"}</td>
                <td><span className={`status ${r.resultado === "rechazado" ? "crit" : "ok"}`}><i />{r.resultado === "rechazado" ? "Rechazado" : "OK"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Las consultas a un tablero se registran una vez cada 10 minutos por usuario. Las acciones (preguntar, encargar, programar, aprobar) se registran siempre, igual que los accesos rechazados.</p>
    </section>
  );
}

function Permisos() {
  const { data } = useFetch("/api/roles");
  if (!data) return <p className="thinking">Cargando…</p>;
  const roles = Object.entries(data.roles);
  const si = (v) => (v ? <span className="status ok"><i />Sí</span> : <span className="status muted"><i />No</span>);

  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Qué puede ver y hacer cada rol</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Rol</th>
                {Object.values(SOLUCIONES).map((s) => <th key={s} scope="col">{s}</th>)}
                <th scope="col">Agentes</th><th scope="col">Aprobar</th><th scope="col">Programar</th><th scope="col">Auditoría</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(([id, r]) => (
                <tr key={id}>
                  <td><strong>{r.label}</strong></td>
                  {Object.keys(SOLUCIONES).map((s) => <td key={s}>{si(r.soluciones.includes(s))}</td>)}
                  <td>{r.agentes.length}</td>
                  <td>{si(r.aprobar)}</td><td>{si(r.programar)}</td><td>{si(r.auditoria)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">La caja, el P&L y el portfolio de I+D son confidenciales: solo los ven los roles que los necesitan para decidir. Aprobar mails, órdenes y acciones queda reservado a Dirección.</p>
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Usuarios</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Usuario</th><th scope="col">Nombre</th><th scope="col">Rol</th></tr></thead>
            <tbody>
              {data.usuarios.map((u) => (
                <tr key={u.usuario}><td className="mono">{u.usuario}</td><td>{u.nombre}</td><td>{u.rolLabel}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Los usuarios y sus contraseñas se administran en el servidor, fuera del código, y las contraseñas se guardan cifradas.</p>
      </section>
    </div>
  );
}
