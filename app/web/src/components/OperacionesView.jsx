import { useState } from "react";
import { useFetch } from "../live.jsx";
import { RankBars, Heatmap, DIVERGENTE, SECUENCIAL, escala, fmtM } from "./charts.jsx";

const TABS = [["tablero", "Tablero"], ["stock", "Stock"], ["canal", "Canal online"], ["logistica", "Logística"]];
const ESTADO_LABEL = { conciliado: "Conciliado", operativo: "Operativo", proyectado: "Proyectado", estimado: "Estimado" };
const Tipo = ({ tipo }) => <span className={`tipo tipo-${tipo}`}>{ESTADO_LABEL[tipo] || tipo}</span>;
const TONO = { crit: "crit", warn: "warn", ok: "ok", info: "muted" };

export default function OperacionesView({ sub }) {
  const { data, error } = useFetch("/api/solutions/operaciones");
  const [tab, setTab] = useState(sub || "tablero");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la solución…</p>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Agente Operaciones · Solución</span>
          <h1>{data.meta.titulo}</h1>
          <p className="muted">{data.meta.bajada} Datos simulados.</p>
          <p className="muted small">Actualización: {data.meta.actualizacion} · Fuentes: {data.meta.fuentes.join(", ")}</p>
        </div>
        <a className="btn ghost" href="#/sala/operaciones">Hablar con el agente</a>
      </div>

      <div className="tabs solution-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "tablero" && <Tablero data={data} />}
      {tab === "stock" && <Stock data={data} />}
      {tab === "canal" && <Canal data={data} />}
      {tab === "logistica" && <Logistica e={data.entregas} />}
    </div>
  );
}

function Tablero({ data }) {
  const { indicadores: ind, stock, integracion, coberturaObjetivo } = data;
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
          <div className="card-head"><h2>Cobertura por producto</h2><span className="muted">Objetivo {coberturaObjetivo} días</span></div>
          <ul className="quota">
            {stock.map((p) => (
              <li key={p.id}>
                <span className="q-label">{p.label.split(" ").slice(0, 3).join(" ")}</span>
                <span className="q-track">
                  <span className="q-fill" style={{ width: `${Math.min(100, (p.cobertura / 90) * 100)}%`, background: p.estado === "crit" ? "#d1453b" : p.estado === "warn" ? "#dd8408" : p.estado === "info" ? "#7a4fd0" : "#12a594" }} />
                  <span className="q-target" style={{ left: `${(coberturaObjetivo / 90) * 100}%`, right: "auto" }} />
                </span>
                <span className="q-value">{fmtM(p.cobertura, 0)} d</span>
              </li>
            ))}
          </ul>
          <p className="muted small">La marca vertical es el objetivo. Por debajo hay riesgo de quiebre; muy por encima, capital inmovilizado.</p>
        </section>

        <section className="card integracion">
          <div className="card-head"><h2>Qué significa para el resto</h2><Tipo tipo="operativo" /></div>
          <div className="cross">
            <h3 className="sub">Comercial</h3>
            <p className="small">{integracion.comercial.nota}. {integracion.comercial.detalle}.</p>
            <p className="muted small">{integracion.comercial.accion}</p>
          </div>
          <div className="cross" style={{ marginTop: 10 }}>
            <h3 className="sub">Producción</h3>
            <p className="small">Faltan {fmtM(integracion.produccion.faltanteFps50)} u de FPS50 y {fmtM(integracion.produccion.faltanteEmulsion)} u de Emulsión, ya calculado con stock real.</p>
            <p className="muted small">{integracion.produccion.accion}</p>
            <a className="btn small ghost" href="#/produccion">Abrir la solución Producción</a>
          </div>
          <div className="cross" style={{ marginTop: 10 }}>
            <h3 className="sub">Finanzas</h3>
            <p className="small">Inventario valorizado en {fmtM(integracion.finanzas.inventario)} ARS M. {integracion.finanzas.nota}.</p>
            <p className="muted small">{integracion.finanzas.accion}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Cobertura: naranja cuando se acerca al quiebre, gris en torno al objetivo, celeste cuando sobra stock.
const colorCobertura = escala(DIVERGENTE, [0.1, 15, 30, 60, 90, 120]);

function Proyeccion({ p }) {
  const filas = p.filas.map((f) => ({ ...f, label: f.label.split(" ").slice(0, 3).join(" "), largo: f.label, sub: f.quiebre ? `Quiebra la semana del ${f.quiebre}` : "Cubierto en el horizonte" }));
  const enRiesgo = p.filas.filter((f) => f.quiebre);
  return (
    <section className="card wide">
      <div className="card-head">
        <h2>Cobertura proyectada semana a semana</h2>
        <span className="muted">Días de stock al cierre de cada semana · {p.nota}</span>
      </div>
      <Heatmap
        caption="Días de cobertura proyectados por producto y semana"
        filas={filas} columnas={p.columnas.map((c) => ({ ...c, label: `Sem ${c.label}` }))}
        celda={(f, c, i, j) => {
          const v = f.valores[j];
          return {
            valor: v.dias, texto: v.dias === 0 ? "Quiebre" : `${fmtM(v.dias, 0)} d`,
            tip: [["Producto", f.largo], ["Stock al cierre", `${fmtM(v.unidades)} u`], ["Cobertura", v.dias === 0 ? "Sin stock" : `${fmtM(v.dias, 0)} días`], ...(v.entradas.length ? [["Entra esa semana", v.entradas.join(" · ")]] : [])]
          };
        }}
        color={colorCobertura}
        leyenda={[[DIVERGENTE[0], "Quiebre"], [DIVERGENTE[1], "< 15 días"], [DIVERGENTE[2], "15–30"], [DIVERGENTE[3], `30–60 (objetivo ${p.objetivo})`], [DIVERGENTE[4], "60–90"], [DIVERGENTE[5], "90–120"], [DIVERGENTE[6], "> 120: capital inmovilizado"]]}
      />
      <p className="muted small">
        {enRiesgo.length
          ? `${enRiesgo.map((f) => `${f.label.split(" ").slice(0, 2).join(" ")} quiebra la semana del ${f.quiebre}`).join("; ")}, aun con las órdenes que ya están en producción. Para evitarlo, la orden nueva tiene que salir antes del 25/09.`
          : "Todo el portfolio queda cubierto en el horizonte."}{" "}
        <a href="#/produccion">Ver el plan de producción</a>
      </p>
    </section>
  );
}

function Stock({ data }) {
  const { stock, lotes } = data;
  return (
    <div className="solution">
      {data.proyeccion && <Proyeccion p={data.proyeccion} />}

      <section className="card wide">
        <div className="card-head"><h2>Stock real contra el ERP</h2><Tipo tipo="operativo" /></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Producto</th><th scope="col" className="num">Tango</th><th scope="col" className="num">Disprofarma</th>
                <th scope="col" className="num">Ship Now</th><th scope="col" className="num">En tránsito</th><th scope="col" className="num">Real</th>
                <th scope="col" className="num">Diferencia</th><th scope="col" className="num">Cobertura</th><th scope="col" className="num">Reponer</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((p) => (
                <tr key={p.id}>
                  <td>{p.label}{p.foco && <span className="cell-sub">En foco promocional</span>}</td>
                  <td className="num">{fmtM(p.tango)}</td>
                  <td className="num">{fmtM(p.disprofarma)}</td>
                  <td className="num">{fmtM(p.shipnow)}</td>
                  <td className="num">{p.transito ? fmtM(p.transito) : "—"}</td>
                  <td className="num"><strong>{fmtM(p.real)}</strong></td>
                  <td className={`num ${p.diferencia < 0 ? "down" : p.diferencia > 0 ? "up" : ""}`}>{p.diferencia ? fmtM(p.diferencia) : "—"}</td>
                  <td className="num"><span className={`status ${TONO[p.estado]}`}><i />{fmtM(p.cobertura, 0)} días</span></td>
                  <td className="num">{p.reposicionSugerida ? fmtM(p.reposicionSugerida) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">«Real» es lo que hay en los depósitos. La diferencia con Tango es lo que hace que el plan de producción se arme sobre stock que no existe.</p>
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Lotes por vencer</h2><Tipo tipo="operativo" /></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Producto</th><th scope="col">Lote</th><th scope="col">Depósito</th><th scope="col" className="num">Unidades</th><th scope="col" className="num">Vence</th><th scope="col" className="num">Días</th></tr></thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.lote}>
                  <td>{l.producto}</td><td className="mono">{l.lote}</td><td>{l.deposito}</td>
                  <td className="num">{fmtM(l.unidades)}</td>
                  <td className="num">{l.vence.split("-").reverse().join("/")}</td>
                  <td className={`num ${l.critico ? "down" : ""}`}>{l.diasParaVencer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Canal({ data }) {
  const { quiebres, tiendasRelevadas } = data;
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Quiebres en farmacias online</h2><span className="muted">{tiendasRelevadas} tiendas relevadas todos los días a las 7:00</span></div>
        <RankBars data={quiebres.map((q) => ({ label: q.producto, valor: q.sinStock, color: q.sinStock > 15 ? "#d1453b" : q.sinStock > 8 ? "#dd8408" : "#0090c2", nota: `${q.pct}% de las tiendas · ${q.tendencia > 0 ? `empeoró ${q.tendencia} en la semana` : q.tendencia < 0 ? `mejoró ${Math.abs(q.tendencia)}` : "estable"} · ${q.cadenas.join(", ")}` }))} unidad="tiendas" />
        <h3 className="sub">Últimos 7 días · tiendas sin stock</h3>
        <Heatmap
          caption="Tiendas online sin stock por producto y día"
          filas={quiebres.map((q) => ({ id: q.producto, label: q.producto.split(" ").slice(0, 3).join(" "), largo: q.producto, q, sub: q.tendencia > 0 ? `Empeoró ${q.tendencia} en la semana` : q.tendencia < 0 ? `Mejoró ${Math.abs(q.tendencia)}` : "Estable" }))}
          columnas={["Vie", "Sáb", "Dom", "Lun", "Mar", "Mié", "Hoy"].map((d, i) => ({ id: `d${i}`, label: d }))}
          celda={(f, c, i, j) => {
            const v = f.q.serie[j];
            return { valor: v, texto: String(v), tip: [["Producto", f.largo], ["Tiendas sin stock", `${v} de ${tiendasRelevadas} (${fmtM((v / tiendasRelevadas) * 100, 1)}%)`], ["Cadenas", f.q.cadenas.join(", ")]] };
          }}
          color={escala(SECUENCIAL, [3, 6, 10, 15, 20])}
          leyenda={[[SECUENCIAL[0], "Menos de 3"], [SECUENCIAL[2], "6–10"], [SECUENCIAL[3], "10–15"], [SECUENCIAL[4], "15–20"], [SECUENCIAL[5], "20 o más tiendas"]]}
        />
        <p className="muted small">El relevamiento lo hace un robot sobre las tiendas online y llega por mail. En el sistema, el agente lo procesa solo y lo convierte en alertas.</p>
      </section>
    </div>
  );
}

function Logistica({ e }) {
  return (
    <div className="solution">
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Desempeño por operador</h2><Tipo tipo="conciliado" /></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Operador</th><th scope="col" className="num">Pedidos</th><th scope="col" className="num">A tiempo y completos</th><th scope="col" className="num">Demora promedio</th><th scope="col" className="num">Incidencias</th></tr></thead>
              <tbody>
                {e.porOperador.map((o) => (
                  <tr key={o.operador}>
                    <td>{o.operador}</td>
                    <td className="num">{fmtM(o.pedidos)}</td>
                    <td className={`num ${o.otif < e.otifObjetivo ? "down" : "up"}`}>{fmtM(o.otif, 1)}%</td>
                    <td className="num">{fmtM(o.demoraProm, 1)} d</td>
                    <td className="num">{o.incidencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Objetivo de entregas a tiempo y completas: {e.otifObjetivo}%. Hoy el promedio es {fmtM(e.otif, 1)}%.</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>En tránsito</h2><Tipo tipo="operativo" /></div>
          <ul className="mini-list">
            {e.enTransito.map((t) => (
              <li key={t.orden}>
                <span>
                  <span className="mini-title">{t.producto}</span>
                  <span className="mini-meta"><span className="mono">{t.orden}</span> · {t.desde} → {t.hacia} · llega en {t.diasParaLlegar} días</span>
                </span>
                <span className="num">{fmtM(t.unidades)} u</span>
              </li>
            ))}
          </ul>
          <h3 className="sub">Incidencias del mes</h3>
          <RankBars data={e.incidencias.map((i) => ({ label: i.tipo, valor: i.casos, nota: i.operador }))} unidad="casos" />
        </section>
      </div>
    </div>
  );
}
