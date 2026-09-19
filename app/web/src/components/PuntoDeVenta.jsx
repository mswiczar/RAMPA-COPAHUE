import { useEffect, useMemo, useState } from "react";
import { useFetch, useSesion } from "../live.jsx";
import { api } from "../api.js";
import { marcarRuta } from "../ayuda/util.js";
import { Heatmap, Lineas, RankBars, DIVERGENTE, SECUENCIAL, SERIES, escala, fmtM, fmtPct } from "./charts.jsx";

const ESTADO_LABEL = { conciliado: "Conciliado", operativo: "Operativo", proyectado: "Proyectado", estimado: "Estimado" };
const Tipo = ({ tipo }) => <span className={`tipo tipo-${tipo}`}>{ESTADO_LABEL[tipo] || tipo}</span>;
const SECCIONES = [["resultados", "Resultados"], ["misiones", "Misiones"], ["evidencia", "Evidencia"], ["mercado", "Informes de mercado"], ["calidad", "Calidad y costo"]];
const ESTADO_MISION = {
  por_aprobar: ["warn", "Esperando aprobación"], publicada: ["info", "Publicada"], en_curso: ["info", "En curso"],
  completa: ["ok", "Completa"], rechazada: ["crit", "Rechazada"]
};
const ESTADO_REL = { validado: ["ok", "Validado"], revision: ["warn", "En control manual"], rechazado: ["crit", "Rechazado"] };
// Color fijo por marca: la identidad sigue a la marca, no a su posición.
const COLOR_MARCA = { caviahue: SERIES[0], lider: SERIES[1], local: SERIES[2], blanca: SERIES[3], otros: "#b3c2ca" };
const ars = (v) => `ARS ${fmtM(v)}`;

export default function PuntoDeVenta({ inicial }) {
  // La misión simula su avance en el tiempo: refresco cada 20 s además del tiempo real.
  const [pulso, setPulso] = useState(0);
  useEffect(() => { const t = setInterval(() => setPulso((p) => p + 1), 20000); return () => clearInterval(t); }, []);
  const { data, error } = useFetch(`/api/solutions/comercial/pdv?p=${pulso}`);
  const [seccion, setSeccion] = useState(SECCIONES.some(([id]) => id === inicial) ? inicial : "resultados");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la auditoría de punto de venta…</p>;

  return (
    <div className="solution">
      <section className="card wide pdv-intro">
        <div>
          <span className="eyebrow">Qué pasa en la góndola · datos sintéticos</span>
          <h2>{data.meta.titulo}</h2>
          <p className="muted small">{data.meta.bajada} Se paga solo lo relevado y validado. Fuentes: {data.meta.fuentes.join(", ")}.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Secciones de la auditoría">
          {SECCIONES.map(([id, label]) => (
            <label key={id} className={seccion === id ? "on" : ""}>
              <input type="radio" name="pdv-seccion" value={id} checked={seccion === id} onChange={() => { setSeccion(id); marcarRuta(id === "resultados" ? "comercial/pdv" : `comercial/pdv/${id}`); }} />{label}
            </label>
          ))}
        </div>
      </section>

      {seccion === "resultados" && <Resultados data={data} />}
      {seccion === "misiones" && <Misiones data={data} />}
      {seccion === "evidencia" && <Evidencia data={data} />}
      {seccion === "mercado" && <Mercado data={data} />}
      {seccion === "calidad" && <Calidad data={data} />}
    </div>
  );
}

function Resultados({ data }) {
  const [vista, setVista] = useState("presencia");
  const colorPres = escala(SECUENCIAL, [50, 65, 75, 85, 95]);
  const colorPrecio = escala(DIVERGENTE, [-8, -4, -1.5, 1.5, 4, 8]);
  const m = vista === "presencia" ? data.presencia : data.precios;
  const filas = m.filas.map((f) => ({ ...f, label: f.label.split(" ").slice(0, 3).join(" "), largo: f.label }));
  const columnas = m.columnas.map((c) => ({ ...c, sub: c.zona }));
  return (
    <>
      <section className="kpis">
        {data.kpis.map((k) => (
          <article key={k.id} className="kpi">
            <header><span>{k.label}</span><Tipo tipo={k.tipo} /></header>
            <strong>{fmtM(k.valor, Number.isInteger(k.valor) ? 0 : 1)}<i>{k.unidad}</i></strong>
            {k.contra !== undefined && <p className="muted">referencia: {fmtM(k.contra, Number.isInteger(k.contra) ? 0 : 1)}</p>}
            <small>{k.detalle}</small>
          </article>
        ))}
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Alertas de la IA</h2><span className="muted">Priorizadas: primero lo que cuesta ventas</span></div>
        <ul className="alert-list">
          {data.alertas.map((a) => (
            <li key={a.t} className={a.sev}><i aria-hidden="true" /><span>{a.t}{a.link && <> · <a href={a.link}>ver</a></>}</span><Tipo tipo={a.tipo} /></li>
          ))}
        </ul>
      </section>

      <section className="card wide">
        <div className="card-head">
          <h2>{vista === "presencia" ? "Presencia en góndola por cadena" : "Precio en góndola contra el sugerido"}</h2>
          <div className="segmented">
            {[["presencia", "Presencia"], ["precio", "Precio"]].map(([id, label]) => (
              <label key={id} className={vista === id ? "on" : ""}>
                <input type="radio" name="pdv-heat" value={id} checked={vista === id} onChange={() => setVista(id)} />{label}
              </label>
            ))}
          </div>
        </div>
        {vista === "presencia" ? (
          <Heatmap
            caption="Presencia en góndola por producto y cadena"
            filas={filas} columnas={columnas}
            celda={(f, c, i, j) => {
              const v = m.valores[i][j];
              return { valor: v, texto: v === null ? null : `${v}%`, tip: v === null ? [["Estado", "No listado en la cadena"]] : [["Producto", f.largo], ["Presencia", `${v}% de las sucursales relevadas`], ["Faltante", `${100 - v}%`]] };
            }}
            color={colorPres}
            leyenda={[[SECUENCIAL[0], "< 50%"], [SECUENCIAL[1], "50–65%"], [SECUENCIAL[2], "65–75%"], [SECUENCIAL[3], "75–85%"], [SECUENCIAL[4], "85–95%"], [SECUENCIAL[5], "≥ 95%"], ["vacio", "No listado"]]}
          />
        ) : (
          <Heatmap
            caption="Desvío del precio en góndola contra el precio sugerido"
            filas={filas} columnas={columnas}
            celda={(f, c, i, j) => {
              const v = m.valores[i][j];
              const pvp = data.precios.pvp[f.id];
              return { valor: v, texto: v === null ? null : fmtPct(v), tip: v === null ? [["Estado", "No listado en la cadena"]] : [["Precio sugerido", ars(pvp)], ["Precio relevado", ars(Math.round(pvp * (1 + v / 100)))], ["Desvío", fmtPct(v)]] };
            }}
            color={colorPrecio}
            leyenda={[[DIVERGENTE[0], "8% o más abajo"], [DIVERGENTE[2], "1,5–4% abajo"], [DIVERGENTE[3], "En precio (±1,5%)"], [DIVERGENTE[4], "1,5–4% arriba"], [DIVERGENTE[6], "8% o más arriba"], ["vacio", "No listado"]]}
          />
        )}
        <p className="muted small">
          {vista === "presencia"
            ? "FPS50 falta justo en las cadenas de AMBA donde Operaciones ve quiebre de stock. Emulsión Facial no está listada en Cadena Sur, y Gel Limpiador no está en Cadena Rosario: son las altas que están en negociación."
            : "Por encima del sugerido perdemos competitividad; por debajo, suele ser una promoción que no pasó por Comercial."}
        </p>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Share of shelf contra share de ventas</h2><Tipo tipo="operativo" /></div>
          <ShareStack share={data.share} />
        </section>
        <section className="card">
          <div className="card-head"><h2>Frentes por producto</h2><span className="muted">Promedio por sucursal contra lo acordado</span></div>
          <ul className="quota">
            {data.facings.map((f) => (
              <li key={f.sku}>
                <span className="q-label">{f.label.split(" ").slice(0, 3).join(" ")}</span>
                <span className="q-track">
                  <span className="q-fill" style={{ width: `${Math.min(100, (f.promedio / 5) * 100)}%`, background: f.promedio < f.objetivo * 0.8 ? "#c2571d" : "#0090c2" }} />
                  <span className="q-target" style={{ left: `${(f.objetivo / 5) * 100}%`, right: "auto" }} />
                </span>
                <span className="q-value">{fmtM(f.promedio, 1)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">La marca vertical es lo acordado con las cadenas. {data.facings[0].nota}.</p>
          <h3 className="sub">Material POP · {data.pop.campana}</h3>
          <RankBars data={[
            { label: "Instalado completo", valor: data.pop.instaladas - data.pop.incompletas, color: "#12a594" },
            { label: "Instalado incompleto", valor: data.pop.incompletas, color: "#7a4fd0" },
            { label: "No instalado", valor: data.pop.acordadas - data.pop.instaladas, color: "#c2571d" }
          ]} unidad="farmacias" />
        </section>
      </div>
    </>
  );
}

/** Barra apilada al 100% por cadena, con la marca de share de ventas de Caviahue. */
function ShareStack({ share }) {
  return (
    <div className="share">
      <div className="chart-legend">
        {share.marcas.map((m) => <span key={m.id}><i className="sw" style={{ background: COLOR_MARCA[m.id] }} />{m.label}</span>)}
        <span><i className="sw sw-target" />Share de ventas de Caviahue</span>
      </div>
      <ul className="share-list">
        {share.cadenas.map((c) => (
          <li key={c.id}>
            <span className="share-label">{c.label}</span>
            <span className="share-bar" title={`${c.label}: Caviahue ${c.valores[0]}% del espacio y ${c.ventas}% de las ventas`}>
              {c.valores.map((v, k) => v > 0 && <span key={k} style={{ width: `${v}%`, background: COLOR_MARCA[share.marcas[k].id] }}>{k === 0 ? `${v}%` : ""}</span>)}
              <i className="share-ventas" style={{ left: `${c.ventas}%` }} aria-hidden="true" />
            </span>
            <span className={`share-gap ${c.ventas - c.valores[0] > 2 ? "down" : ""}`}>{c.ventas - c.valores[0] > 0 ? `−${c.ventas - c.valores[0]} pts` : "ok"}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">La línea negra es cuánto vende Caviahue en esa cadena. Si está a la derecha del bloque celeste, la marca vende más de lo que se ve: hay argumento para pedir espacio.</p>
    </div>
  );
}

function Misiones({ data }) {
  const { permisos, user } = useSesion();
  const puedeCrear = ["direccion", "comercial"].includes(user?.rol);
  const [abierta, setAbierta] = useState(false);
  const [inicial, setInicial] = useState(null);
  const usar = (s) => {
    setInicial({ modalidad: s.modalidad, nombre: s.nombre, objetivo: s.objetivo, puntos: s.puntos, recompensa: s.recompensa, pro: s.pro, skus: s.skus, cadenas: s.cadenas, sugerencia: s.id });
    setAbierta(true);
    setTimeout(() => document.querySelector(".mision-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  return (
    <>
      {data.sugerencias.length > 0 && (
        <section className="card wide">
          <div className="card-head">
            <h2>Misiones que sugiere el agente</h2>
            <span className="muted">Salen de las alertas; revisalas antes de mandarlas a aprobar</span>
          </div>
          <div className="sugerencias">
            {data.sugerencias.map((s) => (
              <article key={s.id} className={`sugerencia ${s.prioridad}`}>
                <span className="rec-tag">Recomendación del agente · decide una persona</span>
                <h3>{s.nombre}</h3>
                <p className="small">{s.motivo}</p>
                <p className="muted small">{s.origen} · {s.cuando}</p>
                <div className="sugerencia-pie">
                  <span className="small"><strong>{s.costo === null ? "A cotizar" : ars(s.costo)}</strong> · {s.puntos} puntos · {data.modalidades.find((m) => m.id === s.modalidad).label}</span>
                  {puedeCrear && <button type="button" className="btn small" onClick={() => usar(s)}>Revisar y enviar</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="kpis">
        {[["Saldo cargado", data.saldo.cargado], ["Consumido (validado)", data.saldo.consumido], ["Reservado en misiones abiertas", data.saldo.reservado], ["Disponible", data.saldo.disponible]].map(([label, v]) => (
          <article key={label} className="kpi"><header><span>{label}</span></header><strong>{fmtM(v)}<i>ARS</i></strong></article>
        ))}
      </section>

      <section className="card wide">
        <div className="card-head">
          <h2>Misiones</h2>
          {puedeCrear
            ? <button className="btn small" type="button" onClick={() => { setInicial(null); setAbierta((x) => !x); }}>{abierta ? "Cerrar" : "Nueva misión"}</button>
            : <span className="muted small">Las crean Comercial o Dirección</span>}
        </div>
        {abierta && <NuevaMision key={inicial?.sugerencia || "nueva"} data={data} inicial={inicial} onCreada={() => { setAbierta(false); setInicial(null); }} />}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Misión</th><th scope="col">Modalidad</th><th scope="col">Estado</th><th scope="col" className="num">Avance</th><th scope="col" className="num">Por relevamiento</th><th scope="col" className="num">Comprometido</th><th scope="col" className="num">Consumido</th></tr></thead>
            <tbody>
              {data.misiones.map((m) => {
                const [tono, label] = ESTADO_MISION[m.estado] || ["muted", m.estado];
                return (
                  <tr key={m.id}>
                    <td><span className="mono">{m.id}</span> · {m.nombre}<span className="cell-sub">{m.cadenas.join(", ")} · {m.creadaPor}, {m.creada.slice(8)}/{m.creada.slice(5, 7)}</span></td>
                    <td>{m.modalidadLabel}{m.pro && <span className="cell-sub">Con informe PRO</span>}</td>
                    <td>
                      <span className={`status ${tono}`}><i />{label}</span>
                      {m.estado === "por_aprobar" && m.taskId && <span className="cell-sub">{permisos.aprobar ? <a href={`#/tareas/${m.taskId}`}>Aprobar en Tareas</a> : "La aprueba Dirección"}</span>}
                    </td>
                    <td className="num">
                      <span className="avance"><span style={{ width: `${m.avance}%` }} /></span>
                      <span className="cell-sub">{m.relevados}/{m.puntos} · {m.validados} válidos · {m.rechazados} rechazados</span>
                    </td>
                    <td className="num">{m.unitario === null ? "A cotizar" : ars(m.unitario)}</td>
                    <td className="num">{m.comprometido === null ? "—" : ars(m.comprometido)}</td>
                    <td className="num">{m.consumido === null ? "—" : ars(m.consumido)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">El saldo se reserva al publicar y se descuenta solo cuando el relevamiento queda validado. Los rechazados no se pagan. Toda misión nueva pasa por la aprobación de Dirección.</p>
      </section>

      <section className="card wide">
        <div className="card-head"><h2>Tres modalidades</h2><span className="muted">Precios de referencia, sin impuestos; cada operativo se cotiza</span></div>
        <div className="modalidades">
          {data.modalidades.map((m) => (
            <article key={m.id} className="modalidad">
              <h3>{m.label}</h3>
              <p className="small">{m.detalle}</p>
              <p className="muted small">{m.fee === null ? "Fee a cotizar" : `Fee ${ars(m.fee)} por relevamiento${m.pro ? ` · informe PRO +${ars(m.pro)}` : ""}`} · recompensa sugerida {ars(m.recompensaSugerida)}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function NuevaMision({ data, inicial, onCreada }) {
  const [f, setF] = useState(inicial || { modalidad: "control", nombre: "", objetivo: "", puntos: 50, recompensa: 2500, pro: false, skus: ["fps50"], cadenas: ["Cadena Norte"] });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const mod = data.modalidades.find((m) => m.id === f.modalidad);
  const unitario = useMemo(() => (mod.fee === null ? null : Number(f.recompensa) + mod.fee + (f.pro && mod.pro ? mod.pro : 0)), [f, mod]);
  const total = unitario === null ? null : unitario * Number(f.puntos || 0);

  async function crear(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post("/api/solutions/comercial/pdv/misiones", f);
      onCreada();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="mision-form" onSubmit={crear}>
      {f.sugerencia && <p className="small" style={{ margin: 0 }}><strong>Sugerida por el agente Comercial.</strong> Podés cambiar cualquier campo antes de enviarla.</p>}
      <div className="mision-grid">
        <label>Modalidad
          <select value={f.modalidad} onChange={(e) => set("modalidad", e.target.value)}>
            {data.modalidades.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label>Nombre
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej.: FPS50 en cadenas de Córdoba" required maxLength={120} />
        </label>
        <label>Puntos a relevar
          <input type="number" min="1" max="500" value={f.puntos} onChange={(e) => set("puntos", e.target.value)} />
        </label>
        <label>Recompensa por relevamiento (ARS)
          <input type="number" min="1000" max="20000" step="100" value={f.recompensa} onChange={(e) => set("recompensa", e.target.value)} />
          <span className="muted small">Más alta si es urgente, difícil o lejos</span>
        </label>
      </div>
      <label className="mision-full">Qué hay que mirar
        <input value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Ej.: presencia, precio y frentes; foto de la góndola completa" maxLength={400} />
      </label>
      {f.modalidad === "control" && (
        <fieldset className="chips"><legend>Productos</legend>
          {data.skus.map((s) => <label key={s.id} className={f.skus.includes(s.id) ? "on" : ""}><input type="checkbox" checked={f.skus.includes(s.id)} onChange={() => toggle("skus", s.id)} />{s.label.split(" ").slice(0, 3).join(" ")}</label>)}
        </fieldset>
      )}
      <fieldset className="chips"><legend>Cadenas</legend>
        {data.cadenas.map((c) => <label key={c.id} className={f.cadenas.includes(c.label) ? "on" : ""}><input type="checkbox" checked={f.cadenas.includes(c.label)} onChange={() => toggle("cadenas", c.label)} />{c.label}</label>)}
      </fieldset>
      {f.modalidad === "control" && (
        <label className="check"><input type="checkbox" checked={f.pro} onChange={(e) => set("pro", e.target.checked)} /> Sumar informe PRO (+{ars(mod.pro)} por relevamiento)</label>
      )}
      <div className="mision-total">
        <div>
          <strong>{total === null ? "A cotizar por el proveedor" : ars(total)}</strong>
          <span className="muted small">{unitario === null ? "El operativo a medida se cotiza antes de publicar" : `${fmtM(f.puntos)} × ${ars(unitario)} (recompensa ${ars(Number(f.recompensa))} + fee ${ars(mod.fee)}${f.pro ? ` + PRO ${ars(mod.pro)}` : ""}) · disponible ${ars(data.saldo.disponible)}`}</span>
        </div>
        <button className="btn" type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar a aprobación"}</button>
      </div>
      {error && <p className="form-error small">{error}</p>}
    </form>
  );
}

function Evidencia({ data }) {
  const [sel, setSel] = useState(data.relevamientos[0].id);
  const { data: g } = useFetch(`/api/solutions/comercial/pdv/gondola/${sel}`);
  const rel = data.relevamientos.find((r) => r.id === sel);
  return (
    <div className="evidencia">
      <section className="card">
        <div className="card-head"><h2>Relevamientos</h2><span className="muted">Últimos del mes</span></div>
        <ul className="rel-list">
          {data.relevamientos.map((r) => {
            const [tono, label] = ESTADO_REL[r.estado];
            return (
              <li key={r.id}>
                <button type="button" className={sel === r.id ? "on" : ""} onClick={() => setSel(r.id)} aria-pressed={sel === r.id}>
                  <span className="rel-top"><strong>{r.cadena}</strong><span className={`status ${tono}`}><i />{label}</span></span>
                  <span className="muted small">{r.sucursal} · {r.fecha.slice(8)}/{r.fecha.slice(5, 7)} · {r.mision}</span>
                  {r.hallazgos.length > 0 && <span className="small rel-hall">{r.hallazgos.length} hallazgo{r.hallazgos.length > 1 ? "s" : ""}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{rel.cadena} · {rel.sucursal}</h2>
          <span className="muted small">{rel.relevador} · {rel.localidad} · confianza de la IA {rel.confianza}%</span>
        </div>
        {rel.motivo && <p className={`restringido ${rel.estado === "rechazado" ? "rechazo" : ""}`}>{rel.estado === "rechazado" ? "Rechazado" : "En control manual"}: {rel.motivo}</p>}
        {g ? <Gondola g={g} /> : <p className="thinking">Reconstruyendo la góndola…</p>}
        <h3 className="sub">Qué encontró la IA</h3>
        {rel.hallazgos.length
          ? <ul className="alert-list">{rel.hallazgos.map((h) => <li key={h} className={h.includes("no está") ? "crit" : "warn"}><i aria-hidden="true" /><span>{h}</span></li>)}</ul>
          : <p className="muted small">Sin hallazgos: todo en precio, presente y exhibido.</p>}
        <p className="muted small">Reconstrucción de la góndola a partir de las fotos del relevador. Cada frente es un producto detectado; los recuadros punteados son productos propios con su confianza. En la demo la imagen es un esquema, no una foto.</p>
      </section>
    </div>
  );
}

/** Esquema de la góndola: 4 estantes, un rectángulo por frente, color por marca. */
function Gondola({ g }) {
  const [tip, setTip] = useState(null);
  const W = 100 / g.ancho;
  const H = 26;
  const alto = g.estantes.length * (H + 8) + 4;
  return (
    <figure className="gondola">
      <div className="chart-legend">
        {g.marcas.map((m) => <span key={m.id}><i className="sw" style={{ background: COLOR_MARCA[m.id] }} />{m.label}</span>)}
        <span><i className="sw sw-falta" />Hueco: producto propio que falta</span>
      </div>
      <div className="gondola-plot" onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" role="img" aria-label="Esquema de la góndola relevada">
          {g.estantes.map((estante, e) => {
            let x = 0;
            const y = 4 + e * (H + 8);
            return (
              <g key={e}>
                <rect x="0" y={y + H + 1} width="100" height="2.5" fill="#93adb9" />
                {estante.map((b, k) => {
                  const x0 = x;
                  x += b.facings * W;
                  const frentes = Array.from({ length: b.facings }, (_, i) => (
                    <rect key={i} x={x0 + i * W + 0.25} y={y + (b.falta ? 0 : 3)} width={W - 0.5} height={H - (b.falta ? 0 : 3)} rx="0.6"
                      fill={b.falta ? "#fff" : COLOR_MARCA[b.marca]} stroke={b.falta ? "#d1453b" : "none"} strokeDasharray={b.falta ? "2 1.5" : undefined}
                      strokeWidth="1" vectorEffect="non-scaling-stroke" opacity={b.marca === "caviahue" || b.falta ? 1 : 0.85} />
                  ));
                  return (
                    <g key={k} onMouseEnter={() => setTip({ x: Math.min(82, Math.max(12, x0 + (b.facings * W) / 2)), y: (y / alto) * 100, b })}>
                      {frentes}
                      {b.detectado && <rect x={x0 - 0.2} y={y + 1.5} width={b.facings * W + 0.4} height={H - 1} fill="none" stroke="#063d54" strokeWidth="1.5" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        <div className="gondola-labels">
          {g.estantes.map((estante, e) => {
            let x = 0;
            return estante.map((b, k) => {
              const x0 = x;
              x += b.facings * W;
              return (b.marca === "caviahue") && (
                <span key={`${e}-${k}`} className={b.falta ? "falta" : ""} style={{ left: `${x0 + (b.facings * W) / 2}%`, top: `${((4 + e * (H + 8) + H / 2) / alto) * 100}%` }}>
                  {b.falta ? `Falta ${b.label}` : b.label}
                </span>
              );
            });
          })}
        </div>
        {tip && (
          <div className="tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }} role="status">
            <strong>{tip.b.falta ? `Falta: ${tip.b.label}` : tip.b.label}</strong>
            {tip.b.falta
              ? <span><i>Detección</i>Hueco donde debería estar el producto</span>
              : <><span><i>Frentes</i>{tip.b.facings}</span>{tip.b.precio && <span><i>Precio</i>{ars(tip.b.precio)}</span>}{tip.b.confianza && <span><i>Confianza</i>{tip.b.confianza}%</span>}</>}
          </div>
        )}
      </div>
    </figure>
  );
}

function Mercado({ data }) {
  const inf = data.informes;
  const nombre = (id) => inf.marcas.find((m) => m.id === id).label;
  return (
    <>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Share of shelf en protección solar</h2><Tipo tipo="estimado" /></div>
          <Lineas etiquetas={inf.shareSolar.meses} series={inf.shareSolar.series.map((s) => ({ label: nombre(s.marca), valores: s.valores }))} />
          <p className="muted small">Informe del proveedor sobre su propia base, sin operativo nuestro. Caviahue perdió 2,1 puntos de espacio en seis meses, mientras la marca líder ganó 3,7.</p>
        </section>
        <section className="card">
          <div className="card-head"><h2>Ganadores y perdedores</h2><span className="muted">Puntos de share of shelf, abril a septiembre</span></div>
          <ul className="mini-list">
            {inf.ganadores.map((g) => (
              <li key={g.marca}><span className="mini-title">{g.marca}</span><span className={`num ${g.delta < 0 ? "down" : "up"}`}>{g.delta > 0 ? "+" : ""}{fmtM(g.delta, 1)} pts</span></li>
            ))}
          </ul>
          <h3 className="sub">Informes disponibles</h3>
          <ul className="mini-list">
            {inf.disponibles.map((i) => (
              <li key={i.id}><span><span className="mini-title">{i.titulo}</span><span className="mini-meta">{i.periodo}</span></span><a className="btn small ghost" href="#/sala/comercial">Pedir al agente</a></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function Calidad({ data }) {
  const c = data.calidad;
  const k = data.costos;
  return (
    <div className="grid-2">
      <section className="card">
        <div className="card-head"><h2>Calidad del relevamiento</h2><Tipo tipo="conciliado" /></div>
        <ul className="mini-list">
          <li><span className="mini-title">Relevamientos del mes</span><span className="num">{fmtM(c.relevamientosMes)}</span></li>
          <li><span className="mini-title">Validados</span><span className="num">{fmtM(c.validados)} ({fmtM((c.validados / c.relevamientosMes) * 100, 1)}%)</span></li>
          <li><span className="mini-title">Rechazados (no se pagan)</span><span className="num">{c.rechazados}</span></li>
          <li><span className="mini-title">Confianza promedio de la IA</span><span className="num">{fmtM(c.confianzaIA, 1)}%</span></li>
          <li><span className="mini-title">Tiempo medio de ejecución</span><span className="num">{c.tiempoMedioHoras} h (SLA {c.slaHoras} h)</span></li>
        </ul>
        <h3 className="sub">Precisión medida, no declarada</h3>
        <p className="small">Un {c.control.muestra} relevamientos al mes ({fmtM((c.control.muestra / c.relevamientosMes) * 100, 0)}%) se controlan a mano. Coincidencia con la IA:</p>
        <RankBars data={[{ label: "Presencia", valor: c.control.presencia }, { label: "Precio", valor: c.control.precio }, { label: "Frentes", valor: c.control.facings, color: "#c2571d" }]} unidad="%" dec={1} />
        <p className="muted small">Frentes es lo menos preciso: conviene no usarlo solo para liquidar acuerdos con las cadenas.</p>
        <h3 className="sub">Motivos de rechazo</h3>
        <RankBars data={c.motivosRechazo.map((m) => ({ label: m.motivo, valor: m.casos }))} unidad="casos" />
      </section>

      <section className="card">
        <div className="card-head"><h2>Costo contra auditar con gente propia</h2><Tipo tipo="estimado" /></div>
        <RankBars data={[{ label: "Red de relevadores", valor: k.redPorRelevamiento }, { label: "Auditor propio", valor: k.propioPorVisita, color: "#c2571d" }]} unidad="ARS por punto" />
        <p className="muted small">Método: {k.metodoPropio}. Es una estimación: hay que validarla con los costos reales antes de decidir.</p>
        <h3 className="sub">Cobertura de la red por zona</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Zona</th><th scope="col" className="num">Relevadores activos</th><th scope="col" className="num">Horas hasta relevar</th></tr></thead>
            <tbody>
              {k.coberturaRed.map((z) => (
                <tr key={z.zona}><td>{z.zona}</td><td className="num">{z.relevadores}</td><td className={`num ${z.horasPromedio > c.slaHoras * 0.8 ? "down" : ""}`}>{z.horasPromedio}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="sub">Qué pedirle al proveedor antes de contratar</h3>
        <ul className="small lista-simple">
          <li>Precisión de la IA medida contra control manual, por métrica</li>
          <li>Tiempos reales de ejecución y SLA por zona</li>
          <li>Casos de clientes del rubro farmacia</li>
          <li>Acceso a las fotos originales y a la API para integrar los datos</li>
        </ul>
      </section>
    </div>
  );
}
