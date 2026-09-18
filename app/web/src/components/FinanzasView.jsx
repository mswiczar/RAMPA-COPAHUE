import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useFetch } from "../live.jsx";
import { BarsVsTarget, CashLine, RankBars, Waterfall, fmtM, fmtPct } from "./charts.jsx";

const TABS = [["tablero", "Tablero"], ["pnl", "P&L dinámico"], ["analisis", "Análisis"], ["escenarios", "Escenarios"]];
const ESTADO_LABEL = { conciliado: "Conciliado", operativo: "Operativo", proyectado: "Proyectado", estimado: "Estimado" };

const Tipo = ({ tipo }) => <span className={`tipo tipo-${tipo}`}>{ESTADO_LABEL[tipo] || tipo}</span>;

export default function FinanzasView() {
  const { data, error } = useFetch("/api/solutions/finanzas");
  const [tab, setTab] = useState("tablero");

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la solución…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Agente Finanzas · Solución</span>
          <h1>{data.meta.titulo}</h1>
          <p className="muted">{data.meta.bajada} Cifras en {data.meta.moneda} {data.meta.unidad}, datos simulados.</p>
        </div>
        <a className="btn ghost" href="#/sala/finanzas">Hablar con el agente</a>
      </div>

      <div className="tipos">
        {data.meta.tiposDeDato.map((t) => (
          <span key={t.id} className="tipo-def"><Tipo tipo={t.id} />{t.detalle}</span>
        ))}
      </div>

      <div className="tabs solution-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "tablero" && <Tablero data={data} />}
      {tab === "pnl" && <Pnl data={data} />}
      {tab === "analisis" && <Analisis />}
      {tab === "escenarios" && <Escenarios />}
    </div>
  );
}

/* ---------- Tablero ---------- */

function Tablero({ data }) {
  const { indicadores: ind, caja, puente, pnl } = data;
  const mensual = pnl.meses.map((m) => ({
    label: m.mes, valor: m.real.ingresos, target: m.presupuesto.ingresos,
    estado: m.estado, estadoLabel: ESTADO_LABEL[m.estado] + (m.estado === "operativo" ? ` (al ${data.meta ? "17/09" : ""})` : "")
  }));

  return (
    <div className="solution">
      <section className="kpis">
        {ind.kpis.map((k) => (
          <article key={k.id} className="kpi">
            <header><span>{k.label}</span><Tipo tipo={k.tipo} /></header>
            <strong>{fmtM(k.valor, k.unidad === "%" ? 1 : 0)}<i>{k.unidad}</i></strong>
            <p>
              {k.desvio !== undefined && k.desvio !== null && (
                <span className={k.desvio < 0 ? "delta down" : "delta up"}>{fmtPct(k.desvio)}</span>
              )}
              {k.contra !== undefined && k.contra !== null && <span className="muted"> vs {fmtM(k.contra, k.unidad === "%" ? 1 : 0)}{k.unidad === "%" ? "%" : ""}</span>}
            </p>
            <small>{k.detalle}</small>
          </article>
        ))}
      </section>

      <section className="card wide">
        <div className="card-head">
          <h2>Alertas</h2>
          <span className="muted">Cada alerta indica con qué tipo de dato se disparó</span>
        </div>
        <ul className="alert-list">
          {ind.alertas.map((a) => (
            <li key={a.t} className={a.sev}>
              <i aria-hidden="true" />
              <span>{a.t}</span>
              <Tipo tipo={a.tipo} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Caja a 13 semanas</h2>
            <Tipo tipo="proyectado" />
          </div>
          <CashLine semanas={caja.semanas} minimo={caja.minimoOperativo} />
          <p className="muted small">
            {caja.quiebre
              ? `El saldo perfora el mínimo operativo en ${caja.quiebre}. Saldo al cierre: ${fmtM(caja.semanas.at(-1).saldo)} ARS M.`
              : "El saldo se mantiene sobre el mínimo operativo en todo el horizonte."}
          </p>
          <ul className="mini-list">
            {caja.posicion.map((c) => (
              <li key={c.cuenta}>
                <span><span className="mini-title">{c.cuenta}</span><span className="mini-meta"><Tipo tipo={c.tipo} /></span></span>
                <span className="num">{fmtM(c.saldo)} M</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Ingresos netos por mes</h2>
            <span className="muted">Real contra presupuesto</span>
          </div>
          <BarsVsTarget data={mensual} />
          <p className="muted small">
            Acumulado enero a agosto: {fmtM(ind.acumulado.real.ingresos)} contra {fmtM(ind.acumulado.presupuesto.ingresos)} de presupuesto ({fmtPct(ind.acumulado.desvio)}).
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Qué explica el desvío de ingresos</h2>
            <Tipo tipo="conciliado" />
          </div>
          <Waterfall desde={puente.desde} pasos={puente.pasos} hasta={puente.hasta} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Cuentas por cobrar</h2>
            <Tipo tipo="operativo" />
          </div>
          <RankBars ordinal data={ind.aging.map((a) => ({ label: a.bucket, valor: a.monto }))} />
          <ul className="mini-list">
            <li><span className="mini-title">Capital de trabajo</span><span className="num">{fmtM(ind.capitalTrabajo.valor)} M</span></li>
            <li><span className="mini-title">Cuentas por cobrar</span><span className="num">{fmtM(ind.capitalTrabajo.cuentasPorCobrar)} M</span></li>
            <li><span className="mini-title">Inventario</span><span className="num">{fmtM(ind.capitalTrabajo.inventario)} M</span></li>
            <li><span className="mini-title">Cuentas por pagar</span><span className="num">{fmtM(ind.capitalTrabajo.cuentasPorPagar)} M</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------- P&L dinámico con zoom ---------- */

function Pnl({ data }) {
  const { pnl } = data;
  const [linea, setLinea] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function abrir(id) {
    if (linea === id) { setLinea(null); setDetalle(null); return; }
    setLinea(id); setDetalle(null); setCargando(true);
    try { setDetalle(await api.get(`/api/solutions/finanzas/linea/${id}`)); }
    catch { setDetalle("sin-detalle"); }
    finally { setCargando(false); }
  }

  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head">
          <h2>P&L mes a mes</h2>
          <span className="muted">Tocá una línea para ver el centro de costo y los comprobantes</span>
        </div>
        <div className="table-wrap">
          <table className="table pnl">
            <thead>
              <tr>
                <th scope="col">Línea</th>
                {pnl.meses.map((m) => (
                  <th key={m.mes} scope="col" className={`num estado-${m.estado}`}>{m.mes}<span className="cell-sub">{ESTADO_LABEL[m.estado].slice(0, 4)}.</span></th>
                ))}
                <th scope="col" className="num">Año</th>
              </tr>
            </thead>
            <tbody>
              {pnl.lineas.map((l) => {
                const total = pnl.meses.reduce((a, m) => a + m.real[l.id], 0);
                const abrible = ["marketing", "logistica", "sga", "comisiones"].includes(l.id);
                return (
                  <tr key={l.id} className={`linea-${l.tipo} ${linea === l.id ? "abierta" : ""}`}>
                    <th scope="row">
                      {abrible ? (
                        <button className="link-cell" onClick={() => abrir(l.id)} aria-expanded={linea === l.id}>{l.label} <span aria-hidden="true">{linea === l.id ? "▾" : "▸"}</span></button>
                      ) : l.label}
                    </th>
                    {pnl.meses.map((m) => {
                      const v = m.real[l.id];
                      const p = m.presupuesto[l.id];
                      const desvio = p ? ((v - p) / p) * 100 : 0;
                      return (
                        <td key={m.mes} className={`num estado-${m.estado}`} title={`Presupuesto ${fmtM(p, 1)} · desvío ${fmtPct(desvio)}`}>
                          {fmtM(v, 0)}
                        </td>
                      );
                    })}
                    <td className="num total">{fmtM(total, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {linea && (
          <div className="drill">
            {cargando && <p className="thinking">Abriendo el detalle…</p>}
            {detalle === "sin-detalle" && <p className="muted">Esta línea no tiene apertura por centro de costo en el mockup.</p>}
            {Array.isArray(detalle) && detalle.map((c) => (
              <div key={c.id} className="drill-centro">
                <div className="drill-head"><strong>{c.label}</strong><span className="num">{fmtM(c.monto, 1)} ARS M</span></div>
                <table className="table">
                  <thead><tr><th scope="col">Comprobante</th><th scope="col">Proveedor</th><th scope="col" className="num">Monto</th><th scope="col">Fuente</th></tr></thead>
                  <tbody>
                    {c.comprobantes.map((d) => (
                      <tr key={d.numero}>
                        <td className="mono">{d.numero}</td>
                        <td>{d.proveedor}</td>
                        <td className="num">{fmtM(d.monto, 1)}</td>
                        <td><span className="src">{d.fuente}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Análisis multidimensional ---------- */

const DIMENSIONES = [["canal", "Canal"], ["producto", "Producto"], ["zona", "Zona"], ["cliente", "Cliente"]];

function Analisis() {
  const { data } = useFetch("/api/solutions/finanzas/dimensiones");
  const [dim, setDim] = useState("canal");
  if (!data) return <p className="thinking">Cargando…</p>;
  const filas = data[dim];

  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head">
          <h2>Ventas y margen por dimensión</h2>
          <div className="segmented">
            {DIMENSIONES.map(([id, label]) => (
              <label key={id} className={dim === id ? "on" : ""}>
                <input type="radio" name="dim" value={id} checked={dim === id} onChange={() => setDim(id)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div>
            <h3 className="sub">Ventas acumuladas, enero a agosto</h3>
            <RankBars data={filas.map((f) => ({ label: f.label, valor: f.ventas, color: f.color }))} />
          </div>
          <div>
            <h3 className="sub">Margen</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{DIMENSIONES.find(([id]) => id === dim)[1]}</th>
                    <th scope="col" className="num">Ventas</th>
                    <th scope="col" className="num">Margen</th>
                    {dim === "cliente" && <th scope="col" className="num">DSO</th>}
                    {dim === "cliente" && <th scope="col" className="num">Vencido</th>}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td>{f.label}</td>
                      <td className="num">{fmtM(f.ventas)}</td>
                      <td className="num">{fmtM(f.margenPct, 1)}%</td>
                      {dim === "cliente" && <td className="num">{f.dso} d</td>}
                      {dim === "cliente" && <td className="num">{f.vencido ? `${fmtM(f.vencido)} M` : "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dim === "cliente" && <p className="muted small">Droguería A y Droguería B concentran volumen con el margen más bajo y la mayor deuda vencida.</p>}
            {dim === "zona" && <p className="muted small">El mapa geográfico queda para la próxima versión: por ahora, ranking por zona.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Simulador de escenarios ---------- */

function Escenarios() {
  const [deltas, setDeltas] = useState({});
  const [sim, setSim] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.post("/api/solutions/finanzas/escenario", deltas)
        .then((r) => alive && setSim(r))
        .catch((e) => alive && setError(e.message));
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [deltas]);

  if (error) return <p className="form-error">{error}</p>;
  if (!sim) return <p className="thinking">Calculando…</p>;

  const dif = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
  const filas = [
    ["Ingresos netos", sim.base.ingresos, sim.simulado.ingresos],
    ["Margen de contribución", sim.base.contribucion, sim.simulado.contribucion],
    ["EBITDA", sim.base.ebitda, sim.simulado.ebitda],
    ["Resultado neto", sim.base.neto, sim.simulado.neto]
  ];

  return (
    <div className="solution">
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Variables</h2>
            <button className="btn small ghost" onClick={() => setDeltas({})}>Volver al base</button>
          </div>
          <div className="presets">
            {sim.guardados.map((g) => (
              <button key={g.id} className="chip" onClick={() => setDeltas(g.deltas)}>{g.label}</button>
            ))}
          </div>
          <div className="sliders">
            {sim.variables.map((v) => (
              <div key={v.id} className="slider">
                <label htmlFor={`sl-${v.id}`}>{v.label}</label>
                <input
                  id={`sl-${v.id}`} type="range" min={v.min} max={v.max} step={v.paso}
                  value={deltas[v.id] ?? 0}
                  onChange={(e) => setDeltas((d) => ({ ...d, [v.id]: Number(e.target.value) }))}
                />
                <output>{(deltas[v.id] ?? 0) > 0 ? "+" : ""}{deltas[v.id] ?? 0} {v.unidad}</output>
              </div>
            ))}
          </div>
          <p className="muted small">Los meses ya cerrados (enero a agosto) no se tocan: el escenario solo mueve septiembre a diciembre.</p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Impacto en el año</h2>
            <span className="tipo tipo-proyectado">Proyectado</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Línea</th><th scope="col" className="num">Base</th><th scope="col" className="num">Escenario</th><th scope="col" className="num">Diferencia</th></tr></thead>
              <tbody>
                {filas.map(([label, base, esc]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="num">{fmtM(base)}</td>
                    <td className="num"><strong>{fmtM(esc)}</strong></td>
                    <td className={`num ${esc < base ? "down" : esc > base ? "up" : ""}`}>{esc === base ? "—" : `${esc > base ? "+" : ""}${fmtM(esc - base)} (${fmtPct(dif(esc, base))})`}</td>
                  </tr>
                ))}
                <tr>
                  <td>EBITDA sobre ingresos</td>
                  <td className="num">{fmtM(sim.base.ebitdaPct, 1)}%</td>
                  <td className="num"><strong>{fmtM(sim.simulado.ebitdaPct, 1)}%</strong></td>
                  <td className="num">{fmtM(sim.simulado.ebitdaPct - sim.base.ebitdaPct, 1)} pp</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 className="sub">Caja a 13 semanas en este escenario</h3>
          <CashLine semanas={sim.caja.semanas} minimo={sim.caja.minimoOperativo} alto={170} />
          <p className={`small ${sim.cajaSimulada.quiebre ? "form-error" : "muted"}`}>
            {sim.cajaSimulada.quiebre
              ? `La caja perfora el mínimo en ${sim.cajaSimulada.quiebre} (en el base, ${sim.cajaBase.quiebre || "nunca"}). Saldo al cierre: ${fmtM(sim.cajaSimulada.saldoFinal)} contra ${fmtM(sim.cajaBase.saldoFinal)} ARS M.`
              : `La caja se mantiene sobre el mínimo. Saldo al cierre: ${fmtM(sim.cajaSimulada.saldoFinal)} ARS M.`}
          </p>
        </section>
      </div>
    </div>
  );
}
