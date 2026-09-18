import { useState } from "react";
import { api } from "../api.js";
import { useFetch } from "../live.jsx";
import { RankBars, fmtM, fmtPct } from "./charts.jsx";

const TABS = [["tablero", "Tablero"], ["proyectos", "Proyectos"], ["radar", "Radar"], ["competencia", "Competencia"], ["decision", "Decisión"]];
const ESTADO_LABEL = { conciliado: "Conciliado", operativo: "Operativo", proyectado: "Proyectado", estimado: "Estimado" };
const Tipo = ({ tipo }) => <span className={`tipo tipo-${tipo}`}>{ESTADO_LABEL[tipo] || tipo}</span>;
const ETAPAS = ["Idea", "Investigación", "Prototipo", "Validación", "Desarrollo", "Lanzamiento"];

export default function RDView() {
  const { data, error } = useFetch("/api/solutions/rd");
  const [tab, setTab] = useState("tablero");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la solución…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Agente R&D · Solución</span>
          <h1>{data.meta.titulo}</h1>
          <p className="muted">{data.meta.bajada} Cifras en {data.meta.moneda} {data.meta.unidad}, datos simulados.</p>
          <p className="muted small">Actualización: {data.meta.actualizacion} · {data.meta.referencia}</p>
        </div>
        <a className="btn ghost" href="#/sala/rd">Hablar con el agente</a>
      </div>

      <div className="tabs solution-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "tablero" && <Tablero data={data} />}
      {tab === "proyectos" && <Proyectos proyectos={data.proyectos} historico={data.historico} />}
      {tab === "radar" && <Radar radar={data.radar} />}
      {tab === "competencia" && <Competencia competidores={data.competidores} />}
      {tab === "decision" && <Decision decision={data.decision} />}
    </div>
  );
}

function Tablero({ data }) {
  const ind = data.indicadores;
  const p = ind.presupuesto;
  return (
    <div className="solution">
      <section className="kpis">
        {ind.kpis.map((k) => (
          <article key={k.id} className="kpi">
            <header><span>{k.label}</span><Tipo tipo={k.tipo} /></header>
            <strong>{fmtM(k.valor, Number.isInteger(k.valor) ? 0 : 1)}<i>{k.unidad}</i></strong>
            {k.contra !== undefined && k.contra !== null && <p className="muted">referencia: {fmtM(k.contra, 0)}</p>}
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
          <div className="card-head"><h2>Ejecución del presupuesto</h2><Tipo tipo="conciliado" /></div>
          <ul className="quota">
            <li>
              <span className="q-label">Ejecutado</span>
              <span className="q-track">
                <span className="q-fill" style={{ width: `${p.ejecutadoPct}%`, background: "#0090c2" }} />
                <span className="q-fill" style={{ width: `${(p.comprometido / p.anual) * 100}%`, left: `${p.ejecutadoPct}%`, background: "#7fcde8" }} />
                <span className="q-target" />
              </span>
              <span className="q-value">{fmtM(p.ejecutadoPct, 0)}%</span>
            </li>
          </ul>
          <ul className="mini-list">
            <li><span className="mini-title">Presupuesto anual</span><span className="num">{fmtM(p.anual)} M</span></li>
            <li><span className="mini-title">Ejecutado</span><span className="num">{fmtM(p.ejecutado)} M</span></li>
            <li><span className="mini-title">Comprometido</span><span className="num">{fmtM(p.comprometido)} M</span></li>
            <li><span className="mini-title">Disponible</span><span className="num">{fmtM(p.disponible)} M</span></li>
            <li><span className="mini-title">Proyección de cierre</span><span className={`num ${p.proyeccionCierre > p.anual ? "down" : "up"}`}>{fmtM(p.proyeccionCierre)} M ({fmtPct(((p.proyeccionCierre - p.anual) / p.anual) * 100)})</span></li>
          </ul>
        </section>

        <section className="card">
          <div className="card-head"><h2>Inversión por tipo de gasto</h2><span className="muted">Criterio Frascati</span></div>
          <RankBars ordinal data={p.porTipo.map((t) => ({ label: t.tipo, valor: t.monto, nota: t.frascati }))} />
        </section>

        <section className="card">
          <div className="card-head"><h2>Inversión por unidad de negocio</h2></div>
          <RankBars data={p.porUnidad.map((u) => ({ label: u.unidad, valor: u.monto }))} />
          <h3 className="sub">Por tecnología</h3>
          <RankBars ordinal data={p.porTecnologia.map((t) => ({ label: t.tecnologia, valor: t.monto }))} />
        </section>

        <section className="card">
          <div className="card-head"><h2>Capacidad y riesgos</h2><Tipo tipo="operativo" /></div>
          <ul className="mini-list">
            <li><span className="mini-title">Equipo</span><span className="num">{ind.capacidad.equipo} {ind.capacidad.unidad}</span></li>
            <li><span className="mini-title">Asignados a proyectos</span><span className="num">{ind.capacidad.asignados}</span></li>
            <li><span className="mini-title">Disponibles</span><span className="num">{ind.capacidad.disponibles}</span></li>
          </ul>
          <p className="form-error small">Cuello de botella: {ind.capacidad.cuelloDeBotella}</p>
          <h3 className="sub">Riesgos del portfolio</h3>
          <ul className="alert-list">
            {ind.riesgos.map((r) => (
              <li key={r.detalle} className={r.severidad}><i aria-hidden="true" /><span><strong>{r.tipo}</strong> · {r.detalle} <span className="muted">({r.proyecto})</span></span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Proyectos({ proyectos, historico }) {
  const [abierto, setAbierto] = useState(null);
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Portfolio</h2><span className="muted">Tocá un proyecto para ver el detalle</span></div>
        <div className="etapas">
          {ETAPAS.map((e) => (
            <div key={e} className="etapa">
              <h3>{e}</h3>
              {proyectos.filter((p) => p.estado === e).map((p) => (
                <button key={p.id} className={`proyecto ${p.demorado ? "demorado" : ""} ${abierto === p.id ? "on" : ""}`} onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                  <strong>{p.nombre}</strong>
                  <span className="proyecto-meta">{p.avance}% · {fmtM(p.consumido)}/{fmtM(p.presupuesto)} M</span>
                  {p.demorado && <span className="proyecto-flag">{p.diasDemora} días de demora</span>}
                </button>
              ))}
              {!proyectos.some((p) => p.estado === e) && <p className="empty">—</p>}
            </div>
          ))}
        </div>
        {abierto && <Detalle p={proyectos.find((x) => x.id === abierto)} />}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Indicadores por proyecto</h2><Tipo tipo="estimado" /></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Proyecto</th><th scope="col" className="num">Éxito</th><th scope="col" className="num">Meses al mercado</th><th scope="col" className="num">Valor esperado</th><th scope="col" className="num">Retorno</th></tr></thead>
              <tbody>
                {proyectos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}<span className="cell-sub">{p.estado} · riesgo {p.riesgo}</span></td>
                    <td className="num">{fmtM(p.exito, 1)}%<span className="cell-sub">téc. {p.probTecnica}% · com. {p.probComercial}%</span></td>
                    <td className="num">{p.mesesAlMercado}</td>
                    <td className={`num ${p.valorEsperado < 0 ? "down" : ""}`}>{fmtM(p.valorEsperado)} M</td>
                    <td className="num">{fmtM(p.roi)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Historia del portfolio</h2><Tipo tipo="conciliado" /></div>
          <h3 className="sub">Lanzados</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Producto</th><th scope="col" className="num">Año</th><th scope="col" className="num">Inversión</th><th scope="col" className="num">Ventas del año</th></tr></thead>
              <tbody>
                {historico.lanzados.map((h) => (
                  <tr key={h.producto}><td>{h.producto}<span className="cell-sub">{h.resultado}</span></td><td className="num">{h.anio}</td><td className="num">{fmtM(h.inversion)}</td><td className="num">{fmtM(h.ventasAnio)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="sub">Discontinuados</h3>
          <ul className="mini-list">
            {historico.discontinuados.map((h) => (
              <li key={h.producto}><span><span className="mini-title">{h.producto} ({h.anio})</span><span className="mini-meta">{h.motivo}</span></span><span className="num">{fmtM(h.inversion)} M</span></li>
            ))}
          </ul>
          <h3 className="sub">Patentes</h3>
          <ul className="mini-list">
            {historico.patentes.map((p) => (
              <li key={p.titulo}><span><span className="mini-title">{p.titulo}</span><span className="mini-meta">{p.pais}{p.vence ? ` · vence ${p.vence}` : p.presentada ? ` · presentada ${p.presentada}` : ""}</span></span><span className="status ok"><i />{p.estado}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Detalle({ p }) {
  return (
    <div className="drill">
      <div className="drill-centro">
        <div className="drill-head"><strong>{p.nombre}</strong><span className="num">{fmtM(p.consumido)} de {fmtM(p.presupuesto)} ARS M</span></div>
        <ul className="mini-list">
          <li><span className="mini-title">Estado</span><span>{p.estado} · {p.avance}% de avance</span></li>
          <li><span className="mini-title">Próximo hito</span><span>{p.hitoProximo} ({p.fechaHito}){p.demorado ? ` · ${p.diasDemora} días de demora` : ""}</span></li>
          <li><span className="mini-title">Probabilidad de éxito</span><span>{p.exito}% (técnica {p.probTecnica}%, comercial {p.probComercial}%)</span></li>
          <li><span className="mini-title">Tiempo al mercado</span><span>{p.mesesAlMercado} meses</span></li>
          <li><span className="mini-title">Ventas esperadas</span><span>{fmtM(p.ventasEsperadas)} ARS M al año</span></li>
          <li><span className="mini-title">Valor esperado</span><span>{fmtM(p.valorEsperado)} ARS M · retorno {fmtM(p.roi)}%</span></li>
        </ul>
      </div>
    </div>
  );
}

function Radar({ radar }) {
  const [filtro, setFiltro] = useState("");
  const items = radar.filter((r) => !filtro || r.impacto === filtro);
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head">
          <h2>Qué pasa afuera</h2>
          <div className="filters">
            <label htmlFor="r-filtro">Mostrar</label>
            <select id="r-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todo</option>
              <option value="riesgo">Riesgos</option>
              <option value="oportunidad">Oportunidades</option>
            </select>
          </div>
        </div>
        <ul className="radar">
          {items.map((r) => (
            <li key={r.id} className={r.impacto}>
              <div className="radar-head">
                <span className={`status ${r.impacto === "riesgo" ? "crit" : "ok"}`}><i />{r.impacto === "riesgo" ? "Riesgo" : "Oportunidad"}</span>
                <span className="mini-meta">{r.tipo} · {r.fuente} · {r.fecha} · confiabilidad {r.confiabilidad}</span>
              </div>
              <strong>{r.titulo}</strong>
              <p>{r.resumen}</p>
              <span className="mini-meta">Afecta a: {r.afecta}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">Cada ítem trae fuente, fecha y nivel de confiabilidad. En producción, esto se alimenta de publicaciones científicas, INPI, ANMAT, WGSN y relevamiento propio.</p>
      </section>
    </div>
  );
}

function Competencia({ competidores }) {
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Inversión en I+D del sector</h2><Tipo tipo="estimado" /></div>
        <RankBars data={competidores.map((c) => ({ label: c.competidor, valor: c.inversionEstimada, color: c.propio ? "#0090c2" : "#7a4fd0", nota: c.propio ? "Dato propio" : `Estimado · confianza ${c.confianza}` }))} />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th scope="col">Competidor</th><th scope="col" className="num">Inversión</th><th scope="col" className="num">% de ventas</th><th scope="col" className="num">Investigadores</th><th scope="col" className="num">Patentes 5 años</th><th scope="col" className="num">Lanzamientos 12m</th><th scope="col">Alianzas</th></tr>
            </thead>
            <tbody>
              {competidores.map((c) => (
                <tr key={c.competidor} className={c.propio ? "propio" : ""}>
                  <td>{c.competidor}<span className="cell-sub">{c.propio ? "Dato propio" : `Estimación, confianza ${c.confianza}`}</span></td>
                  <td className="num">{fmtM(c.inversionEstimada)}</td>
                  <td className="num">{fmtM(c.sobreVentas, 1)}%</td>
                  <td className="num">{c.investigadores}</td>
                  <td className="num">{c.patentes5anios}</td>
                  <td className="num">{c.lanzamientos12m}</td>
                  <td>{c.alianzas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="sub">Cómo se estimó cada número</h3>
        <ul className="mini-list">
          {competidores.filter((c) => !c.propio).map((c) => (
            <li key={c.competidor}><span><span className="mini-title">{c.competidor}</span><span className="mini-meta">{c.metodo}</span></span><span className={`tipo tipo-estimado`}>Confianza {c.confianza}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Decision({ decision }) {
  const [monto, setMonto] = useState(200);
  const { data: plan } = useFetch(`/api/solutions/rd/inversion?monto=${monto}`);
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Ranking por atractivo estratégico</h2><Tipo tipo="estimado" /></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">#</th><th scope="col">Proyecto</th><th scope="col" className="num">Valor esperado</th><th scope="col" className="num">Éxito</th><th scope="col" className="num">Meses</th><th scope="col">Recomendación</th></tr></thead>
            <tbody>
              {decision.ranking.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.nombre}<span className="cell-sub">{p.estado} · riesgo {p.riesgo}</span></td>
                  <td className={`num ${p.valorEsperado < 0 ? "down" : ""}`}>{fmtM(p.valorEsperado)} M</td>
                  <td className="num">{fmtM(p.exito, 1)}%</td>
                  <td className="num">{p.mesesAlMercado}</td>
                  <td><span className={`accion accion-${p.accion}`}>{p.accionLabel}</span><span className="cell-sub">{p.motivo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card wide">
        <div className="card-head"><h2>¿Dónde poner una inversión adicional?</h2><Tipo tipo="estimado" /></div>
        <div className="slider">
          <label htmlFor="monto">Inversión adicional</label>
          <input id="monto" type="range" min="50" max="1000" step="50" value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
          <output>{fmtM(monto)} M</output>
        </div>
        {!plan ? <p className="thinking">Calculando…</p> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th scope="col">Proyecto</th><th scope="col" className="num">Asignado</th><th scope="col" className="num">Retorno esperado</th><th scope="col">Efecto</th></tr></thead>
                <tbody>
                  {plan.asignacion.map((a) => (
                    <tr key={a.proyecto}><td>{a.proyecto}</td><td className="num">{fmtM(a.asignado)} M</td><td className="num">{fmtM(a.roiEsperado)}%</td><td>{a.efecto}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">Agrega <strong>{fmtM(plan.valorEsperadoGanado)} ARS M</strong> de valor esperado{plan.sobrante > 0 ? `, y quedan ${fmtM(plan.sobrante)} M sin asignar` : ""}. {plan.nota}</p>
          </>
        )}
      </section>
    </div>
  );
}
