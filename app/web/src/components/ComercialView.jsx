import { useState } from "react";
import { useFetch } from "../live.jsx";
import { RankBars, fmtM, fmtPct } from "./charts.jsx";
import MapaArgentina from "./MapaArgentina.jsx";

const TABS = [["tablero", "Tablero"], ["pipeline", "Pipeline"], ["funnel", "Funnel"], ["forecast", "Forecast"], ["clientes", "Clientes y territorios"], ["ia", "Inteligencia"]];
const ESTADO_LABEL = { conciliado: "Conciliado", operativo: "Operativo", proyectado: "Proyectado", estimado: "Estimado" };
const Tipo = ({ tipo }) => <span className={`tipo tipo-${tipo}`}>{ESTADO_LABEL[tipo] || tipo}</span>;

export default function ComercialView() {
  const { data, error } = useFetch("/api/solutions/comercial");
  const [tab, setTab] = useState("tablero");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la solución…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Agente Comercial · Solución</span>
          <h1>{data.meta.titulo}</h1>
          <p className="muted">{data.meta.bajada} Cifras en {data.meta.moneda} {data.meta.unidad}, datos simulados.</p>
          <p className="muted small">Actualización: {data.meta.actualizacion} · Fuentes: {data.meta.fuentes.join(", ")}</p>
        </div>
        <a className="btn ghost" href="#/sala/comercial">Hablar con el agente</a>
      </div>

      <div className="tabs solution-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "tablero" && <Tablero data={data} />}
      {tab === "pipeline" && <Pipeline p={data.pipeline} />}
      {tab === "funnel" && <Funnel f={data.funnel} />}
      {tab === "forecast" && <Forecast f={data.forecast} desempeno={data.desempeno} />}
      {tab === "clientes" && <Clientes />}
      {tab === "ia" && <Inteligencia ia={data.inteligencia} />}
    </div>
  );
}

function Kpis({ kpis }) {
  return (
    <section className="kpis">
      {kpis.map((k) => (
        <article key={k.id} className="kpi">
          <header><span>{k.label}</span><Tipo tipo={k.tipo} /></header>
          <strong>{fmtM(k.valor, Number.isInteger(k.valor) ? 0 : 1)}<i>{k.unidad}</i></strong>
          {k.contra !== undefined && k.contra !== null && <p className="muted">objetivo o referencia: {fmtM(k.contra, 0)}</p>}
          <small>{k.detalle}</small>
        </article>
      ))}
    </section>
  );
}

function Tablero({ data }) {
  const { pipeline: p, desempeno: d, inteligencia: ia } = data;
  return (
    <div className="solution">
      <Kpis kpis={data.kpis} />

      <section className="card wide">
        <div className="card-head"><h2>Alertas</h2><span className="muted">Con el tipo de dato que las disparó</span></div>
        <ul className="alert-list">
          {ia.alertas.map((a) => (
            <li key={a.t} className={a.sev}><i aria-hidden="true" /><span>{a.t}</span><Tipo tipo={a.tipo} /></li>
          ))}
        </ul>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Pipeline por etapa</h2><Tipo tipo="operativo" /></div>
          <RankBars ordinal data={p.porEtapa.map((e) => ({ label: `${e.label} (${e.probabilidad}%)`, valor: e.bruto, nota: `${e.cantidad} oportunidades · ponderado ${fmtM(e.ponderado)}` }))} />
        </section>

        <section className="card">
          <div className="card-head"><h2>Cumplimiento por vendedor</h2><span className="muted">Cuota del trimestre</span></div>
          <ul className="quota">
            {d.vendedores.map((v) => (
              <li key={v.id}>
                <span className="q-label">{v.label}</span>
                <span className="q-track">
                  <span className="q-fill" style={{ width: `${Math.min(100, v.cumplimiento)}%`, background: v.cumplimiento >= 95 ? "#12a594" : v.cumplimiento >= 80 ? "#0090c2" : "#c2571d" }} />
                  <span className="q-target" />
                </span>
                <span className="q-value">{fmtM(v.cumplimiento, 0)}%</span>
              </li>
            ))}
          </ul>
          <p className="muted small">La barra llena es el 100% de la cuota. Equipo: {d.equipo.cumplimiento}% ({fmtPct(d.equipo.contraTrimestreAnterior)} contra el trimestre anterior).</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Negocios cerrados</h2><Tipo tipo="conciliado" /></div>
          <RankBars data={[
            { label: "Ganados", valor: p.ganado, color: "#12a594" },
            { label: "Perdidos", valor: p.perdido, color: "#c2571d" },
            { label: "Postergados", valor: p.postergado, color: "#7a4fd0" }
          ]} />
          <h3 className="sub">Motivos de pérdida</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Motivo</th><th scope="col" className="num">Casos</th><th scope="col" className="num">Monto</th></tr></thead>
              <tbody>
                {p.motivosPerdida.map((m) => (
                  <tr key={m.motivo}><td>{m.motivo}</td><td className="num">{m.casos}</td><td className="num">{fmtM(m.monto)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Ranking por calidad de venta</h2><Tipo tipo="estimado" /></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th scope="col">#</th><th scope="col">Vendedor</th><th scope="col" className="num">Ventas</th><th scope="col" className="num">Margen</th><th scope="col" className="num">Cobranza</th><th scope="col" className="num">Retención</th><th scope="col" className="num">Descuento</th></tr>
              </thead>
              <tbody>
                {d.vendedores.map((v) => (
                  <tr key={v.id}>
                    <td>{v.puesto}</td>
                    <td>{v.label}<span className="cell-sub">{v.rol} · {v.territorio}</span></td>
                    <td className="num">{fmtM(v.ventas)}</td>
                    <td className="num">{v.margenPct}%</td>
                    <td className="num">{v.cobranzaPct}%</td>
                    <td className="num">{v.retencionPct}%</td>
                    <td className={`num ${v.descuentoProm > 15 ? "down" : ""}`}>{v.descuentoProm}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">El puesto combina facturación, margen, cobranza y retención, y descuenta por descuentos otorgados. No es solo facturación.</p>
        </section>
      </div>
    </div>
  );
}

const DIMS = [["porVendedor", "Vendedor"], ["porSegmento", "Segmento"], ["porCanal", "Canal"], ["porRegion", "Región"], ["porProducto", "Producto"], ["porCliente", "Cliente"]];

function Pipeline({ p }) {
  const [dim, setDim] = useState("porVendedor");
  const [etapa, setEtapa] = useState("");
  const { data: ops } = useFetch(`/api/solutions/comercial/oportunidades${etapa ? `?etapa=${etapa}` : ""}`);

  return (
    <div className="solution">
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Pipeline por dimensión</h2>
            <select value={dim} onChange={(e) => setDim(e.target.value)} aria-label="Dimensión" style={{ width: "auto" }}>
              {DIMS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          {dim === "porRegion" ? (
            <MapaArgentina
              valores={p.porRegion.filter((r) => r.label !== "Nacional").map((r) => ({ zona: r.label, valor: r.bruto, etiqueta: "Pipeline bruto", detalle: `${r.cantidad} oportunidades · ponderado ${fmtM(r.ponderado, 1)} M` }))}
              unidad="ARS M"
              nota="Pipeline abierto por región; las cuentas nacionales no se mapean"
            />
          ) : (
            <RankBars data={p[dim].map((x) => ({ label: x.label, valor: x.bruto, nota: `${x.cantidad} oportunidades · ponderado ${fmtM(x.ponderado)}` }))} />
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>Sin movimiento</h2><Tipo tipo="operativo" /></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Oportunidad</th><th scope="col" className="num">Monto</th><th scope="col" className="num">Días</th></tr></thead>
              <tbody>
                {p.estancadas.map((o) => (
                  <tr key={o.id}>
                    <td>{o.cliente}<span className="cell-sub">{o.producto} · {o.vendedorLabel}</span></td>
                    <td className="num">{fmtM(o.monto)}</td>
                    <td className="num down">{o.sinMovimiento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Se marcan las oportunidades sin actividad registrada en Elvis hace más de 21 días.</p>
        </section>
      </div>

      <section className="card wide">
        <div className="card-head">
          <h2>Oportunidades abiertas</h2>
          <div className="filters">
            <label htmlFor="f-etapa">Etapa</label>
            <select id="f-etapa" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
              <option value="">Todas</option>
              {p.porEtapa.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Cliente</th><th scope="col">Producto</th><th scope="col">Vendedor</th>
                <th scope="col">Etapa</th><th scope="col" className="num">Monto</th><th scope="col" className="num">Ponderado</th>
                <th scope="col">Cierre</th><th scope="col">Próxima acción</th>
              </tr>
            </thead>
            <tbody>
              {(ops || []).map((o) => (
                <tr key={o.id} className={o.estancada ? "is-off" : ""}>
                  <td>{o.cliente}<span className="cell-sub">{o.segmento} · {o.region}</span></td>
                  <td>{o.producto}</td>
                  <td>{o.vendedorLabel}</td>
                  <td>{o.etapaLabel}<span className="cell-sub">{o.probabilidad}% de probabilidad</span></td>
                  <td className="num">{fmtM(o.monto)}</td>
                  <td className="num">{fmtM(o.ponderado, 1)}</td>
                  <td className="num">{o.cierreProbable.slice(8)}/{o.cierreProbable.slice(5, 7)}</td>
                  <td>{o.proximaAccion}<span className="cell-sub">Última actividad hace {o.sinMovimiento} días</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Funnel({ f }) {
  return (
    <div className="solution">
      <section className="kpis">
        {[["Ciclo comercial", f.ciclo, "días"], ["Ticket promedio", f.ticket, "ARS M"], ["Tasa de conversión", f.winRate, "%"], ["Velocidad del pipeline", f.velocidad, "ARS M por día"], ["Tiempo de respuesta", f.tiempoRespuesta.valor, "horas"]].map(([label, valor, unidad]) => (
          <article key={label} className="kpi">
            <header><span>{label}</span></header>
            <strong>{fmtM(valor, Number.isInteger(valor) ? 0 : 1)}<i>{unidad}</i></strong>
          </article>
        ))}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Embudo</h2><Tipo tipo="conciliado" /></div>
          <RankBars ordinal data={f.etapas.map((e) => ({ label: e.etapa, valor: e.cantidad, nota: `${e.conversion}% de conversión · ${e.dias} días promedio` }))} unidad="oport." />
          <p className="form-error small">Cuello de botella: {f.cuelloDeBotella}</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Origen de los leads</h2><span className="muted">Retorno por canal</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Origen</th><th scope="col" className="num">Recibidos</th><th scope="col" className="num">Abandonados</th><th scope="col" className="num">Conversión</th><th scope="col" className="num">Retorno</th></tr></thead>
              <tbody>
                {f.leads.map((l) => (
                  <tr key={l.origen}>
                    <td>{l.origen}<span className="cell-sub">{l.inversion ? `${fmtM(l.inversion, 1)} ARS M invertidos` : "Sin inversión directa"}</span></td>
                    <td className="num">{l.recibidos}</td>
                    <td className={`num ${l.abandonados > 15 ? "down" : ""}`}>{l.abandonados}</td>
                    <td className="num">{l.conversion}%</td>
                    <td className="num">{l.roi ? `${fmtM(l.roi, 1)}x` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Actividad del equipo</h2><span className="muted">Contra objetivo del trimestre</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Actividad</th><th scope="col" className="num">Real</th><th scope="col" className="num">Objetivo</th><th scope="col" className="num">Desvío</th></tr></thead>
              <tbody>
                {f.actividad.map((a) => (
                  <tr key={a.tipo}>
                    <td>{a.tipo}</td><td className="num">{a.cantidad}</td><td className="num">{a.contra}</td>
                    <td className={`num ${a.cantidad < a.contra ? "down" : "up"}`}>{fmtPct(((a.cantidad - a.contra) / a.contra) * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">El tiempo de respuesta a un lead es de {f.tiempoRespuesta.valor} horas contra un objetivo de {f.tiempoRespuesta.objetivo}.</p>
        </section>
      </div>
    </div>
  );
}

function Forecast({ f, desempeno }) {
  const [escenario, setEscenario] = useState("probable");
  const { data: integ } = useFetch(`/api/solutions/comercial/integracion?escenario=${escenario}`);

  return (
    <div className="solution">
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Cuatro formas de proyectar el trimestre</h2></div>
          <RankBars data={f.metodos.map((m) => ({ label: m.label, valor: m.valor, nota: m.nota }))} />
          <h3 className="sub">Escenarios</h3>
          <div className="segmented">
            {f.escenarios.map((e) => (
              <label key={e.id} className={escenario === e.id ? "on" : ""}>
                <input type="radio" name="esc" value={e.id} checked={escenario === e.id} onChange={() => setEscenario(e.id)} />
                {e.label} · {fmtM(e.valor)}
              </label>
            ))}
          </div>
          <p className="muted small">{f.escenarios.find((e) => e.id === escenario).detalle}</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Riesgo de no llegar al objetivo</h2><Tipo tipo="estimado" /></div>
          <ul className="mini-list">
            <li><span className="mini-title">Objetivo del trimestre</span><span className="num">{fmtM(f.objetivo)} ARS M</span></li>
            <li><span className="mini-title">Vendido hasta hoy</span><span className="num">{fmtM(f.vendido)} ARS M</span></li>
            <li><span className="mini-title">Base instalada por facturar</span><span className="num">{fmtM(f.recurrente)} ARS M</span></li>
            <li><span className="mini-title">Forecast probable del trimestre</span><span className="num">{fmtM(f.escenarios[1].valor)} ARS M</span></li>
            <li><span className="mini-title">Brecha</span><span className={`num ${f.brecha > 0 ? "down" : "up"}`}>{fmtM(f.brecha)} ARS M</span></li>
            <li><span className="mini-title">Pipeline nuevo necesario</span><span className="num">{fmtM(f.pipelineAdicional)} ARS M</span></li>
          </ul>
          <h3 className="sub">Precisión histórica del forecast</h3>
          <RankBars data={f.precisionPorVendedor.map((v) => ({ label: v.label, valor: v.precision }))} unidad="%" />
          <p className="muted small">El modelo del agente castiga el forecast de los vendedores con menor precisión histórica.</p>
        </section>
      </div>

      <section className="card wide integracion">
        <div className="card-head">
          <h2>Qué significa este forecast para el resto de la compañía</h2>
          <Tipo tipo="proyectado" />
        </div>
        {!integ ? <p className="thinking">Calculando el impacto…</p> : (
          <div className="grid-2">
            <div className="cross">
              <h3 className="sub">Finanzas</h3>
              <ul className="mini-list">
                <li><span className="mini-title">Ingresos del año</span><span className="num">{fmtM(integ.finanzas.ingresosEscenario)} vs {fmtM(integ.finanzas.ingresosBase)} base</span></li>
                <li><span className="mini-title">EBITDA</span><span className="num">{fmtM(integ.finanzas.ebitdaEscenario)} vs {fmtM(integ.finanzas.ebitdaBase)} base</span></li>
                <li><span className="mini-title">Caja al cierre de 13 semanas</span><span className="num">{fmtM(integ.finanzas.cajaFinal)} ARS M</span></li>
                <li><span className="mini-title">Mínimo operativo</span><span className={`num ${integ.finanzas.cajaQuiebre ? "down" : "up"}`}>{integ.finanzas.cajaQuiebre ? `Se perfora en ${integ.finanzas.cajaQuiebre}` : "No se perfora"}</span></li>
              </ul>
              <p className="muted small">{integ.finanzas.nota}</p>
              <a className="btn small ghost" href="#/finanzas">Abrir la solución Finanzas</a>
            </div>
            <div className="cross">
              <h3 className="sub">Producción y Producto</h3>
              <ul className="mini-list">
                <li><span className="mini-title">Unidades del trimestre</span><span className="num">{fmtM(integ.produccion.unidadesRequeridas)} u</span></li>
                <li><span className="mini-title">Producto en foco</span><span className="num">{integ.produccion.foco}</span></li>
                <li><span className="mini-title">Faltante del plan</span><span className="num down">{fmtM(integ.produccion.faltante)} u</span></li>
              </ul>
              <p className="muted small">{integ.produccion.nota}</p>
              <p className="muted small">{integ.rd.nota}</p>
            </div>
          </div>
        )}
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Forecast contra realidad</h2><Tipo tipo="conciliado" /></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Trimestre</th><th scope="col" className="num">Forecast</th><th scope="col" className="num">Real</th><th scope="col" className="num">Desvío</th></tr></thead>
            <tbody>
              {f.historico.map((h) => (
                <tr key={h.periodo}>
                  <td>{h.periodo}</td><td className="num">{fmtM(h.forecast)}</td><td className="num">{fmtM(h.real)}</td>
                  <td className={`num ${h.desvio < 0 ? "down" : "up"}`}>{fmtPct(h.desvio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">El equipo sobreestima el forecast de forma sistemática, entre 3% y 6%. El modelo del agente corrige por eso.</p>
      </section>
    </div>
  );
}

/** Los territorios de la fuerza de ventas se agrupan en las zonas del mapa. */
const ZONA_DE_TERRITORIO = { "AMBA Norte": "AMBA", "AMBA Sur": "AMBA", "Córdoba": "Córdoba", "Cuyo": "Cuyo", "Patagonia": "Patagonia", NOA: "NOA", Litoral: "Litoral", "Santa Fe": "Santa Fe" };

function zonasDeTerritorios(territorios, medida) {
  const mapa = new Map();
  for (const t of territorios) {
    const zona = ZONA_DE_TERRITORIO[t.territorio] || t.territorio;
    const acc = mapa.get(zona) || { zona, objetivo: 0, cubiertas: 0, potencial: 0, responsables: [] };
    acc.objetivo += t.farmaciasObjetivo;
    acc.cubiertas += t.cubiertas;
    acc.potencial += t.potencial;
    acc.responsables.push(t.vendedor);
    mapa.set(zona, acc);
  }
  return [...mapa.values()].map((z) => ({
    zona: z.zona,
    valor: medida === "penetracion" ? Math.round((z.cubiertas / z.objetivo) * 1000) / 10 : z[medida],
    etiqueta: medida === "penetracion" ? "Penetración" : medida === "potencial" ? "Farmacias sin cubrir" : "Farmacias cubiertas",
    detalle: `${z.cubiertas} de ${z.objetivo} farmacias · ${[...new Set(z.responsables)].join(", ")}`
  }));
}

function Clientes() {
  const { data } = useFetch("/api/solutions/comercial/clientes");
  const [medida, setMedida] = useState("penetracion");
  if (!data) return <p className="thinking">Cargando…</p>;
  return (
    <div className="solution">
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Concentración de ventas</h2><Tipo tipo="conciliado" /></div>
          <RankBars data={data.cuentas.map((c) => ({ label: c.cliente, valor: c.ventasAnio, nota: `${c.participacion}% de la facturación · margen ${c.margenPct}%` }))} />
          <p className="form-error small">Las tres primeras cuentas concentran el {fmtM(data.concentracion.top3, 1)}% de las ventas. {data.concentracion.nota}</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Clientes en riesgo</h2><Tipo tipo="operativo" /></div>
          <ul className="alert-list">
            {data.enRiesgo.map((c) => (
              <li key={c.cliente} className={c.severidad}><i aria-hidden="true" /><span><strong>{c.cliente}</strong> · {c.motivo}</span></li>
            ))}
          </ul>
          <h3 className="sub">Recomendaciones por cuenta</h3>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Cliente</th><th scope="col" className="num">CLV</th><th scope="col" className="num">Crecimiento</th><th scope="col">Próximo paso</th></tr></thead>
              <tbody>
                {data.cuentas.map((c) => (
                  <tr key={c.cliente}>
                    <td>{c.cliente}<span className="cell-sub">Churn {c.churn}</span></td>
                    <td className="num">{fmtM(c.clv)}</td>
                    <td className={`num ${c.crecimiento < 0 ? "down" : "up"}`}>{fmtPct(c.crecimiento)}</td>
                    <td>{c.upsell}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card wide">
        <div className="card-head">
          <h2>Mapa de cobertura</h2>
          <div className="segmented">
            {[["penetracion", "Penetración"], ["potencial", "Potencial sin cubrir"], ["cubiertas", "Farmacias cubiertas"]].map(([id, label]) => (
              <label key={id} className={medida === id ? "on" : ""}>
                <input type="radio" name="medida-mapa" value={id} checked={medida === id} onChange={() => setMedida(id)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <MapaArgentina
          valores={zonasDeTerritorios(data.territorios, medida)}
          unidad={medida === "penetracion" ? "%" : "farmacias"}
          formato={(v) => fmtM(v, medida === "penetracion" ? 1 : 0)}
          nota="Las zonas agrupan los territorios de la fuerza de ventas"
        />
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Cobertura por territorio</h2><span className="muted">Detalle del mapa</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Territorio</th><th scope="col">Responsable</th><th scope="col" className="num">Farmacias objetivo</th><th scope="col" className="num">Cubiertas</th><th scope="col" className="num">Penetración</th><th scope="col" className="num">Potencial sin cubrir</th></tr></thead>
            <tbody>
              {data.territorios.map((t) => (
                <tr key={t.territorio} className={t.vendedor === "Sin asignar" ? "is-off" : ""}>
                  <td>{t.territorio}</td>
                  <td>{t.vendedor}</td>
                  <td className="num">{t.farmaciasObjetivo}</td>
                  <td className="num">{t.cubiertas}</td>
                  <td className={`num ${t.penetracion < 60 ? "down" : ""}`}>{t.penetracion}%</td>
                  <td className="num">{t.potencial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Inteligencia({ ia }) {
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Qué atender primero</h2><Tipo tipo="estimado" /></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">#</th><th scope="col">Oportunidad</th><th scope="col" className="num">Ponderado</th><th scope="col">Por qué</th><th scope="col">Próxima acción</th></tr></thead>
            <tbody>
              {ia.prioridad.map((o, i) => (
                <tr key={o.id}>
                  <td>{i + 1}</td>
                  <td>{o.cliente}<span className="cell-sub">{o.producto} · {o.vendedorLabel}</span></td>
                  <td className="num">{fmtM(o.ponderado, 1)}</td>
                  <td>{o.motivo}</td>
                  <td>{o.proximaAccion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">La prioridad es criterio del agente, no un dato de Elvis: combina monto ponderado, cercanía del cierre y días sin movimiento.</p>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Vendedores que necesitan apoyo</h2><Tipo tipo="estimado" /></div>
          {ia.coaching.map((c) => (
            <div key={c.vendedor} className="coach">
              <strong>{c.vendedor}</strong>
              <ul>{c.señales.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          ))}
          {!ia.coaching.length && <p className="empty">Nadie con señales de alerta este trimestre.</p>}
        </section>

        <section className="card">
          <div className="card-head"><h2>Competidores mencionados</h2><span className="muted">En las oportunidades cargadas</span></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Competidor</th><th scope="col" className="num">Menciones</th><th scope="col">Dónde aparece</th></tr></thead>
              <tbody>
                {ia.competidores.map((c) => (
                  <tr key={c.competidor}><td>{c.competidor}</td><td className="num">{c.menciones}</td><td>{c.contexto}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="sub">Oportunidades abandonadas</h3>
          <ul className="mini-list">
            {ia.abandonadas.map((o) => (
              <li key={o.id}>
                <span><span className="mini-title">{o.cliente}</span><span className="mini-meta">{o.vendedorLabel} · {o.sinMovimiento} días sin actividad</span></span>
                <span className="num">{fmtM(o.monto)} M</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
