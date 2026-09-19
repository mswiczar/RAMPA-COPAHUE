import { useState } from "react";
import { marcarRuta } from "../ayuda/util.js";
import { useFetch } from "../live.jsx";
import { BarsVsTarget, RankBars, fmtM, fmtPct } from "./charts.jsx";

const TABS = [["tablero", "Tablero"], ["plan", "Plan y órdenes"], ["plantas", "Plantas"], ["decidir", "Qué decidir"]];
const ESTADO_LABEL = { conciliado: "Conciliado", operativo: "Operativo", proyectado: "Proyectado", estimado: "Estimado" };
const Tipo = ({ tipo }) => <span className={`tipo tipo-${tipo}`}>{ESTADO_LABEL[tipo] || tipo}</span>;

export default function ProduccionView({ sub }) {
  const { data, error } = useFetch("/api/solutions/produccion");
  const [tab, setTab] = useState(sub || "tablero");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la solución…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Agente Producción · Solución</span>
          <h1>{data.meta.titulo}</h1>
          <p className="muted">{data.meta.bajada} Datos simulados.</p>
          <p className="muted small">Actualización: {data.meta.actualizacion} · Fuentes: {data.meta.fuentes.join(", ")}</p>
        </div>
        <a className="btn ghost" href="#/sala/produccion">Hablar con el agente</a>
      </div>

      <div className="tabs solution-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); marcarRuta(id === "tablero" ? "produccion" : `produccion/${id}`); }}>{label}</button>
        ))}
      </div>

      {tab === "tablero" && <Tablero data={data} />}
      {tab === "plan" && <Plan data={data} />}
      {tab === "plantas" && <Plantas data={data} />}
      {tab === "decidir" && <Decidir data={data} />}
    </div>
  );
}

function Tablero({ data }) {
  const { indicadores: ind, plan, cumplimiento, flujo } = data;
  return (
    <div className="solution">
      <section className="kpis">
        {ind.kpis.map((k) => (
          <article key={k.id} className="kpi">
            <header><span>{k.label}</span><Tipo tipo={k.tipo} /></header>
            <strong>{fmtM(k.valor, Number.isInteger(k.valor) ? 0 : 1)}<i>{k.unidad}</i></strong>
            {k.contra !== undefined && <p className="muted">objetivo: {fmtM(k.contra)}</p>}
            <small>{k.detalle}</small>
          </article>
        ))}
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Alertas</h2><span className="muted">Con el tipo de dato que las disparó</span></div>
        <ul className="alert-list">
          {ind.alertas.map((a) => (
            <li key={a.t} className={a.sev}><i aria-hidden="true" /><span>{a.t}</span><Tipo tipo={a.tipo} /></li>
          ))}
        </ul>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Cumplimiento del plan</h2><Tipo tipo="conciliado" /></div>
          <BarsVsTarget
            data={cumplimiento.map((m) => ({ label: m.mes, valor: m.real, target: m.plan, estado: "conciliado", estadoLabel: `${m.pct}% del plan` }))}
            unidad="unidades"
            leyenda={[["sw-solid", "Producido"], ["sw-target", "Plan del mes"]]}
          />
          <p className="muted small">La línea punteada es el plan de cada mes; la barra, lo que se produjo.</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Compromiso con las plantas</h2><Tipo tipo="proyectado" /></div>
          <RankBars data={flujo.meses.map((m) => ({ label: m.mes, valor: m.comprometido + m.sugerido, nota: m.sugerido ? `${fmtM(m.comprometido)} comprometido + ${fmtM(m.sugerido, 1)} de las órdenes sugeridas` : "Comprometido" }))} unidad="ARS M" />
          <p className="muted small">Total comprometido: {fmtM(flujo.totalComprometido)} ARS M. Las órdenes sugeridas agregan {fmtM(flujo.totalSugerido, 1)} M. Esto entra al flujo de caja de Finanzas.</p>
        </section>

        <section className="card wide" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head"><h2>Plan contra demanda del bimestre</h2><Tipo tipo="proyectado" /></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">Producto</th><th scope="col">Planta</th><th scope="col" className="num">Stock real</th><th scope="col" className="num">En tránsito</th><th scope="col" className="num">Planificado</th><th scope="col" className="num">Demanda</th><th scope="col" className="num">Saldo</th></tr>
              </thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.id}>
                    <td>{p.producto}</td>
                    <td>{p.planta}</td>
                    <td className="num">{fmtM(p.stockReal)}</td>
                    <td className="num">{p.transito ? fmtM(p.transito) : "—"}</td>
                    <td className="num">{p.planificado ? fmtM(p.planificado) : "—"}</td>
                    <td className="num">{fmtM(p.demanda)}</td>
                    <td className={`num ${p.cubierto ? "up" : "down"}`}><strong>{p.saldo > 0 ? "+" : ""}{fmtM(p.saldo)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">El stock real sale de los depósitos, no del ERP: es la corrección que aporta el Agente Operaciones.</p>
        </section>
      </div>
    </div>
  );
}

function Plan({ data }) {
  const { ordenes, plan, leadTime } = data;
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Órdenes de producción</h2><span className="muted">Lead time de {leadTime} semanas</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Orden</th><th scope="col">Producto</th><th scope="col">Planta</th><th scope="col" className="num">Unidades</th><th scope="col">Estado</th><th scope="col" className="num">Entrega</th><th scope="col" className="num">Avance</th></tr></thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{o.producto}</td>
                  <td>{o.planta}</td>
                  <td className="num">{fmtM(o.unidades)}</td>
                  <td><span className={`status ${o.estado === "Entregada" ? "ok" : o.estado === "Planificada" ? "muted" : "live"}`}><i />{o.estado}</span></td>
                  <td className="num">{o.entrega.split("-").reverse().join("/")}{o.diasParaEntrega !== null && <span className="cell-sub">en {o.diasParaEntrega} días</span>}</td>
                  <td className="num">
                    <span className="q-track" style={{ display: "inline-block", width: 70, verticalAlign: "middle" }}>
                      <span className="q-fill" style={{ width: `${o.avance}%`, background: "#0090c2" }} />
                    </span>
                    <span style={{ marginLeft: 8 }}>{o.avance}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Cobertura por producto</h2><Tipo tipo="proyectado" /></div>
        <RankBars
          data={plan.map((p) => ({ label: p.producto, valor: p.stockReal + p.transito + p.planificado, color: p.cubierto ? "#0090c2" : "#d1453b", nota: p.cubierto ? `Cubre la demanda de ${fmtM(p.demanda)} u` : `No alcanza: faltan ${fmtM(p.faltante)} u para ${fmtM(p.demanda)} de demanda` }))}
          unidad="u disponibles"
        />
      </section>
    </div>
  );
}

function Plantas({ data }) {
  const { plantas } = data;
  return (
    <div className="solution">
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Ocupación</h2><Tipo tipo="operativo" /></div>
          <ul className="quota">
            {plantas.map((p) => (
              <li key={p.id}>
                <span className="q-label">{p.label}</span>
                <span className="q-track">
                  <span className="q-fill" style={{ width: `${p.ocupacion}%`, background: p.ocupacion > 90 ? "#d1453b" : p.ocupacion > 80 ? "#dd8408" : "#12a594" }} />
                  <span className="q-target" style={{ left: "85%", right: "auto" }} />
                </span>
                <span className="q-value">{p.ocupacion}%</span>
              </li>
            ))}
          </ul>
          <p className="muted small">La marca está en 85%: por encima, no hay margen para adelantar un lote sin negociar turno.</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Capacidad, costo y scrap</h2><Tipo tipo="conciliado" /></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Planta</th><th scope="col">Especialidad</th><th scope="col" className="num">Capacidad</th><th scope="col" className="num">Costo unitario</th><th scope="col" className="num">Scrap</th><th scope="col" className="num">Lead time</th></tr></thead>
              <tbody>
                {plantas.map((p) => (
                  <tr key={p.id}>
                    <td>{p.label}</td>
                    <td>{p.especialidad}</td>
                    <td className="num">{fmtM(p.capacidadMes)} u/mes</td>
                    <td className="num">{fmtM(p.costoUnidad, 1)}</td>
                    <td className={`num ${p.scrap > 2 ? "down" : ""}`}>{fmtM(p.scrap, 1)}%</td>
                    <td className="num">{p.leadTime} sem.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Planta 2, la de protección solar, es la más cara y la de mayor scrap, y además es la más ocupada.</p>
        </section>
      </div>
    </div>
  );
}

function Decidir({ data }) {
  const [aprobar, setAprobar] = useState(true);
  const [postergar, setPostergar] = useState(true);
  const { data: sim } = useFetch(`/api/solutions/produccion/simular?aprobar=${aprobar ? 1 : 0}&postergar=${postergar ? 1 : 0}`);
  const { sugerencias, postergables } = data;

  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Órdenes que el agente sugiere emitir</h2><Tipo tipo="proyectado" /></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Producto</th><th scope="col">Planta</th><th scope="col" className="num">Unidades</th><th scope="col" className="num">Costo</th><th scope="col" className="num">Emitir antes de</th><th scope="col">Riesgo</th></tr></thead>
            <tbody>
              {sugerencias.map((s) => (
                <tr key={s.producto}>
                  <td>{s.producto}<span className="cell-sub">Faltante {fmtM(s.faltante)} + colchón {fmtM(s.colchon)}</span></td>
                  <td>{s.planta}<span className="cell-sub">{s.ocupacionPlanta}% ocupada</span></td>
                  <td className="num">{fmtM(s.unidades)}</td>
                  <td className="num">{fmtM(s.costo, 1)} M</td>
                  <td className="num">{s.emitirAntesDe.split("-").reverse().join("/")}<span className="cell-sub">en {s.diasParaDecidir} días</span></td>
                  <td>{s.riesgo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="sub">Y lo que conviene postergar</h3>
        <ul className="mini-list">
          {postergables.map((p) => (
            <li key={p.producto}>
              <span><span className="mini-title">{p.producto} · {p.planta}</span><span className="mini-meta">{p.nota}</span></span>
              <span className="num">libera {fmtM(p.liberaCaja, 1)} M</span>
            </li>
          ))}
        </ul>
        <p className="muted small">Las órdenes son una recomendación del agente. Emitirlas requiere aprobación de Dirección, igual que cualquier acción con impacto.</p>
      </section>

      <section className="card wide integracion">
        <div className="card-head"><h2>Qué pasa si se hace</h2><Tipo tipo="proyectado" /></div>
        <div className="presets" style={{ gap: 12 }}>
          <label className="check"><input type="checkbox" checked={aprobar} onChange={(e) => setAprobar(e.target.checked)} /> Aprobar las órdenes sugeridas</label>
          <label className="check"><input type="checkbox" checked={postergar} onChange={(e) => setPostergar(e.target.checked)} /> Postergar los lotes que sobran</label>
        </div>
        {!sim ? <p className="thinking">Calculando…</p> : (
          <div className="grid-2">
            <div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th scope="col">Producto</th><th scope="col" className="num">Saldo hoy</th><th scope="col" className="num">Saldo después</th></tr></thead>
                  <tbody>
                    {sim.resultado.map((r) => (
                      <tr key={r.producto}>
                        <td>{r.producto}</td>
                        <td className={`num ${r.saldoAntes < 0 ? "down" : ""}`}>{r.saldoAntes > 0 ? "+" : ""}{fmtM(r.saldoAntes)}</td>
                        <td className={`num ${r.cubierto ? "up" : "down"}`}><strong>{r.saldoDespues > 0 ? "+" : ""}{fmtM(r.saldoDespues)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="cross">
              <h3 className="sub">Resultado</h3>
              <ul className="mini-list">
                <li><span className="mini-title">Productos cubiertos</span><span className="num">{sim.cubiertos} de {sim.total}</span></li>
                <li><span className="mini-title">Costo de las órdenes</span><span className="num">{fmtM(sim.costoExtra, 1)} ARS M</span></li>
                <li><span className="mini-title">Caja que libera la postergación</span><span className="num">{fmtM(sim.cajaLiberada, 1)} ARS M</span></li>
                <li><span className="mini-title">Impacto neto</span><span className={`num ${sim.impactoNeto > 0 ? "down" : "up"}`}>{sim.impactoNeto > 0 ? "+" : ""}{fmtM(sim.impactoNeto, 1)} ARS M</span></li>
              </ul>
              <p className="muted small">{sim.nota}</p>
              <a className="btn small ghost" href="#/finanzas">Ver el flujo de caja</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
