import { useState } from "react";
import { api } from "../api.js";
import { useFetch } from "../live.jsx";
import { RankBars } from "./charts.jsx";
import { fmtUSD, fmtTokens, fmtDate, RAZONAMIENTO, PASOS } from "../format.js";

const TABS = [["consumo", "Gasto y consumo"], ["proveedores", "Proveedores"], ["catalogo", "Catálogo y precios"], ["perfiles", "Perfiles"], ["asignaciones", "Asignaciones y topes"], ["como", "Cómo funciona"]];

export default function ModelosView({ sub }) {
  const { data, error } = useFetch("/api/ia/admin");
  const [tab, setTab] = useState(TABS.some(([id]) => id === sub) ? sub : "consumo");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="thinking">Cargando la configuración de modelos…</p>;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Inteligencia · la administra Dirección</span>
          <h1>Modelos y consumo</h1>
          <p className="muted">Qué proveedores y modelos usan los agentes, cuánto cuestan y cuánto se gastó. Precios verificados el {data.verificado.split("-").reverse().join("/")} en las páginas de cada proveedor.</p>
        </div>
      </div>
      <div className="tabs solution-tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "consumo" && <Consumo data={data} />}
      {tab === "proveedores" && <Proveedores data={data} />}
      {tab === "catalogo" && <Catalogo data={data} />}
      {tab === "perfiles" && <Perfiles data={data} />}
      {tab === "asignaciones" && <Asignaciones data={data} />}
      {tab === "como" && <Como data={data} />}
    </div>
  );
}

/* ---------- Gasto y consumo ---------- */

function Consumo({ data }) {
  const c = data.consumo;
  const tope = data.topes.mensualUSD;
  const uso = tope ? (c.gastadoUSD / tope) * 100 : 0;
  const proyUso = tope ? (c.proyeccionUSD / tope) * 100 : 0;
  const tono = uso >= 100 ? "crit" : proyUso >= data.topes.alertaPct ? "warn" : "ok";
  const kpis = [
    ["Gastado en el mes", fmtUSD(c.gastadoUSD), tope ? `${uso < 1 && uso > 0 ? "menos del 1" : uso.toFixed(0)}% del tope de ${fmtUSD(tope, 0)}` : "Sin tope"],
    ["Proyección a fin de mes", fmtUSD(c.proyeccionUSD), `Al ritmo de los primeros ${c.dia} días`],
    ["Llamadas a modelos", c.llamadas.toLocaleString("es-AR"), `${c.tareas} tareas con IA`],
    ["Tokens", fmtTokens(c.tokens), `${fmtTokens(c.tokensIn)} de entrada · ${fmtTokens(c.tokensOut)} de salida`],
    ["Costo promedio por tarea", c.tareas ? fmtUSD(c.gastadoUSD / c.tareas) : "—", "Incluye revisión y corrección"],
    ["Errores y respaldos", `${c.errores} / ${c.respaldos}`, "Llamadas que fallaron / que resolvió un modelo de respaldo"],
    ["Tareas sin modelo", String(c.simuladas), "Salieron con el sistema de reglas: sin clave o por tope"]
  ];
  return (
    <div className="solution">
      <section className="card wide tope-card">
        <div className="card-head"><h2>Tope del mes</h2><span className={`status ${tono}`}><i />{tono === "crit" ? "Tope alcanzado: las tareas salen sin modelo" : tono === "warn" ? "La proyección supera el umbral de alerta" : "Dentro del presupuesto"}</span></div>
        <div className="tope-bar" role="img" aria-label={`Gastado ${uso.toFixed(0)}% del tope, proyección ${proyUso.toFixed(0)}%`}>
          <span className="tope-gastado" style={{ width: `${Math.min(100, uso)}%` }} />
          <span className="tope-proy" style={{ width: `${Math.min(100, proyUso)}%` }} />
          <i className="tope-alerta" style={{ left: `${data.topes.alertaPct}%` }} />
        </div>
        <p className="muted small">Lleno: gastado. Rayado: proyección a fin de mes. La marca es el umbral de alerta ({data.topes.alertaPct}%). El tope se cambia en «Asignaciones y topes».</p>
      </section>

      <section className="kpis">
        {kpis.map(([label, v, d]) => <article key={label} className="kpi"><header><span>{label}</span></header><strong>{v}</strong><small>{d}</small></article>)}
      </section>

      {!c.llamadas && (
        <section className="card wide aviso">
          <strong>Todavía no hubo llamadas a modelos este mes.</strong>
          <span>Mientras no haya claves cargadas, las tareas salen con el sistema de reglas y el flujo queda simulado, con su costo estimado. Cargá las claves de DigitalOcean y DeepSeek en el servidor (ver «Proveedores») y este tablero empieza a llenarse solo.</span>
        </section>
      )}

      <section className="card wide">
        <div className="card-head"><h2>Gasto por día</h2><span className="muted">USD, mes en curso</span></div>
        <BarrasDia dias={c.porDia} />
      </section>

      <div className="grid-2">
        {[["Por proveedor", c.porProveedor], ["Por modelo", c.porModelo], ["Por agente", c.porAgente], ["Por paso del flujo", c.porPaso]].map(([titulo, lista]) => (
          <section key={titulo} className="card">
            <div className="card-head"><h2>{titulo}</h2><span className="muted">USD del mes</span></div>
            {lista.length ? <RankBars data={lista.slice(0, 8).map((x) => ({ label: x.nombre, valor: x.costoUSD, nota: `${x.llamadas} llamadas · ${fmtTokens(x.tokens)} tokens` }))} unidad="USD" dec={4} /> : <p className="empty">Sin consumo todavía.</p>}
            {titulo === "Por paso del flujo" && lista.length > 0 && <p className="muted small">Lo que no es «Borrador» es el costo de la calidad: revisión con otro modelo y corrección.</p>}
          </section>
        ))}
      </div>

      <section className="card wide">
        <div className="card-head"><h2>Últimas llamadas</h2><span className="muted">Cada una queda en la auditoría</span></div>
        {c.ultimas.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Cuándo</th><th scope="col">Agente</th><th scope="col">Paso</th><th scope="col">Modelo</th><th scope="col" className="num">Entrada</th><th scope="col" className="num">Salida</th><th scope="col" className="num">Costo</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {c.ultimas.map((x, i) => (
                  <tr key={i}>
                    <td>{fmtDate(x.ts)}</td><td>{x.agente || "—"}</td><td>{PASOS[x.paso] || x.paso}</td><td>{x.modeloNombre}</td>
                    <td className="num">{fmtTokens(x.tokensIn)}</td><td className="num">{fmtTokens(x.tokensOut)}</td><td className="num">{fmtUSD(x.costoUSD)}</td>
                    <td><span className={`status ${x.estado === "error" ? "crit" : x.estado === "respaldo" ? "warn" : "ok"}`}><i />{x.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Sin llamadas este mes.</p>}
      </section>
    </div>
  );
}

function BarrasDia({ dias }) {
  const [foco, setFoco] = useState(null);
  const max = Math.max(...dias.map((d) => d.costoUSD), 0.0001);
  return (
    <figure className="barras-dia">
      <div className="barras-dia-plot" onMouseLeave={() => setFoco(null)}>
        {dias.map((d) => (
          <span key={d.dia} className={`bd ${d.futuro ? "futuro" : ""}`} onMouseEnter={() => setFoco(d)} tabIndex={0} onFocus={() => setFoco(d)} aria-label={`Día ${d.dia}: ${fmtUSD(d.costoUSD)}`}>
            <i style={{ height: `${d.futuro ? 0 : Math.max(d.costoUSD ? 3 : 0, (d.costoUSD / max) * 100)}%` }} />
          </span>
        ))}
      </div>
      <div className="barras-dia-x">{dias.map((d) => <span key={d.dia}>{d.dia % 5 === 1 ? d.dia : ""}</span>)}</div>
      <figcaption className="heat-detail">{foco ? <><strong>Día {foco.dia}</strong><span><i>Gasto</i>{fmtUSD(foco.costoUSD)}</span><span><i>Llamadas</i>{foco.llamadas}</span></> : <span className="muted">Pasá el mouse por un día para ver el detalle.</span>}</figcaption>
    </figure>
  );
}

/* ---------- Proveedores ---------- */

function useAccion() {
  const [msg, setMsg] = useState({});
  const run = async (clave, fn) => {
    setMsg((m) => ({ ...m, [clave]: { cargando: true } }));
    try { const r = await fn(); setMsg((m) => ({ ...m, [clave]: { ok: r?.ok !== false, texto: r?.mensaje || (r?.vinculados !== undefined ? `${r.total} modelos: ${r.vinculados} vinculados, ${r.nuevos} nuevos (entran deshabilitados)` : "Guardado") } })); }
    catch (e) { setMsg((m) => ({ ...m, [clave]: { ok: false, texto: e.message } })); }
  };
  return [msg, run];
}

function Proveedores({ data }) {
  const [msg, run] = useAccion();
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  return (
    <div className="solution">
      <section className="card wide aviso">
        <strong>Cómo se carga una clave</strong>
        <span>Las claves no se escriben en esta pantalla ni se guardan en la base. Cada proveedor dice en qué variable de entorno está la suya. En el servidor, agregala a <code>/etc/copahue/copahue.env</code> (por ejemplo <code>DIGITALOCEAN_INFERENCE_KEY=…</code>) y reiniciá el servicio con <code>systemctl restart copahue-sala</code>. Después usá «Probar conexión» y «Traer modelos».</span>
      </section>

      <div className="prov-grid">
        {data.proveedores.map((p) => (
          <article key={p.id} className={`card prov ${p.habilitado ? "" : "off"}`}>
            <div className="card-head">
              <h2>{p.nombre}</h2>
              <span className={`status ${p.estado.listo ? "ok" : p.habilitado ? "warn" : "muted"}`}><i />{p.estado.listo ? "Listo" : p.estado.motivo}</span>
            </div>
            {editando === p.id ? <ProveedorForm p={p} onDone={() => setEditando(null)} /> : (
              <>
                <p className="small">{p.notas}</p>
                <ul className="mini-list">
                  <li><span className="mini-title">Dirección</span><span className="mono small">{p.baseUrl}</span></li>
                  <li><span className="mini-title">Clave</span><span className="mono small">{p.claveEnv || "No usa clave"}</span></li>
                  <li><span className="mini-title">Datos reales</span><span className={p.aptoDatosReales ? "num up" : "num"}>{p.aptoDatosReales ? "Apto" : "Solo datos sintéticos"}</span></li>
                  <li><span className="mini-title">Modelos en el catálogo</span><span className="num">{p.modelos}</span></li>
                </ul>
                <div className="actions">
                  <button className="btn small" type="button" onClick={() => run(`p-${p.id}`, () => api.post(`/api/ia/proveedores/${p.id}/probar`))}>Probar conexión</button>
                  <button className="btn small" type="button" onClick={() => run(`p-${p.id}`, () => api.post(`/api/ia/proveedores/${p.id}/sincronizar`))}>Traer modelos</button>
                  <button className="btn small ghost" type="button" onClick={() => run(`p-${p.id}`, () => api.put(`/api/ia/proveedores/${p.id}`, { habilitado: !p.habilitado }))}>{p.habilitado ? "Deshabilitar" : "Habilitar"}</button>
                  <button className="btn small ghost" type="button" onClick={() => setEditando(p.id)}>Editar</button>
                </div>
                {msg[`p-${p.id}`] && <p className={`small ${msg[`p-${p.id}`].ok ? "form-ok" : "form-error"}`}>{msg[`p-${p.id}`].cargando ? "…" : msg[`p-${p.id}`].texto}</p>}
              </>
            )}
          </article>
        ))}
        <article className="card prov nuevo">
          {nuevo ? <ProveedorForm onDone={() => setNuevo(false)} /> : (
            <button className="btn" type="button" onClick={() => setNuevo(true)}>+ Agregar proveedor o servidor propio</button>
          )}
        </article>
      </div>
    </div>
  );
}

function ProveedorForm({ p, onDone }) {
  const [f, setF] = useState({ nombre: p?.nombre || "", baseUrl: p?.baseUrl || "", claveEnv: p?.claveEnv || "", aptoDatosReales: p?.aptoDatosReales || false, habilitado: p?.habilitado ?? true, notas: p?.notas || "" });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  async function guardar(e) {
    e.preventDefault();
    setError(null);
    try { p ? await api.put(`/api/ia/proveedores/${p.id}`, f) : await api.post("/api/ia/proveedores", f); onDone(); }
    catch (err) { setError(err.message); }
  }
  return (
    <form className="form compacto" onSubmit={guardar}>
      <label>Nombre<input value={f.nombre} onChange={set("nombre")} required placeholder="Ej.: Servidor GPU propio" /></label>
      <label>Dirección de la API (compatible con OpenAI)<input value={f.baseUrl} onChange={set("baseUrl")} required placeholder="https://… o http://10.0.0.5:8000/v1" /></label>
      <label>Variable de entorno con la clave<input value={f.claveEnv} onChange={set("claveEnv")} placeholder="MI_PROVEEDOR_KEY (vacío si no usa clave)" /></label>
      <label>Notas<input value={f.notas} onChange={set("notas")} /></label>
      <label className="check"><input type="checkbox" checked={f.aptoDatosReales} onChange={set("aptoDatosReales")} /> Apto para datos reales de Copahue</label>
      <label className="check"><input type="checkbox" checked={f.habilitado} onChange={set("habilitado")} /> Habilitado</label>
      {error && <p className="form-error small">{error}</p>}
      <div className="actions"><button className="btn primary small" type="submit">Guardar</button><button className="btn small" type="button" onClick={onDone}>Cancelar</button></div>
    </form>
  );
}

/* ---------- Catálogo ---------- */

function Catalogo({ data }) {
  const [msg, run] = useAccion();
  const [prov, setProv] = useState("");
  const [soloHab, setSoloHab] = useState(false);
  const lista = data.modelos.filter((m) => (!prov || m.proveedor === prov) && (!soloHab || m.habilitado));
  const guardar = (m, campo, valor) => run(`m-${m.id}`, () => api.put(`/api/ia/modelos/${m.id}`, { [campo]: valor }));
  return (
    <div className="solution">
      <div className="filters">
        <label htmlFor="c-prov">Proveedor</label>
        <select id="c-prov" value={prov} onChange={(e) => setProv(e.target.value)}>
          <option value="">Todos</option>
          {data.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={soloHab} onChange={(e) => setSoloHab(e.target.checked)} /> Solo habilitados</label>
      </div>
      <section className="card wide">
        <div className="card-head"><h2>Modelos</h2><span className="muted">USD por millón de tokens · se edita tocando el valor</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Modelo</th><th scope="col">Id en la API</th><th scope="col" className="num">Entrada</th><th scope="col" className="num">Salida</th><th scope="col">Razona</th><th scope="col">Estado</th><th scope="col" /></tr></thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} className={m.habilitado ? "" : "is-off"}>
                  <td>{m.nombre}<span className="cell-sub">{m.proveedorNombre} · {m.fuentePrecio}, {m.verificado?.split("-").reverse().join("/")}{m.entradaPico != null ? ` · pico USD ${m.entradaPico}/${m.salidaPico}` : ""}</span></td>
                  <td><Editable valor={m.modelo || ""} vacio="Completar" mono onGuardar={(v) => guardar(m, "modelo", v)} /></td>
                  <td className="num"><Editable valor={m.entrada} numero onGuardar={(v) => guardar(m, "entrada", v)} /></td>
                  <td className="num"><Editable valor={m.salida} numero onGuardar={(v) => guardar(m, "salida", v)} /></td>
                  <td><input type="checkbox" checked={m.razona} onChange={(e) => guardar(m, "razona", e.target.checked)} aria-label="Razona" /></td>
                  <td>
                    <span className={`status ${m.estado.listo ? "ok" : "muted"}`}><i />{m.estado.listo ? "Listo" : m.estado.motivo}</span>
                    {msg[`m-${m.id}`] && <span className={`cell-sub ${msg[`m-${m.id}`].ok ? "" : "down"}`}>{msg[`m-${m.id}`].cargando ? "…" : msg[`m-${m.id}`].texto}</span>}
                  </td>
                  <td className="acciones-celda">
                    <button className="btn small ghost" type="button" onClick={() => guardar(m, "habilitado", !m.habilitado)}>{m.habilitado ? "Deshabilitar" : "Habilitar"}</button>
                    <button className="btn small ghost" type="button" disabled={!m.estado.listo} onClick={() => run(`m-${m.id}`, () => api.post(`/api/ia/modelos/${m.id}/probar`))}>Probar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">DeepSeek cobra más en horario pico (01–04 y 06–10 UTC, lunes a viernes): el costo real se calcula con el precio de la hora de cada llamada. En DigitalOcean el id se completa solo con «Traer modelos».</p>
      </section>
      <NuevoModelo proveedores={data.proveedores} />
    </div>
  );
}

function Editable({ valor, onGuardar, numero = false, mono = false, vacio = "—" }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(valor);
  if (!edit) return <button type="button" className={`editable ${mono ? "mono" : ""}`} onClick={() => { setV(valor); setEdit(true); }}>{valor === "" || valor === null ? <span className="muted">{vacio}</span> : numero ? Number(valor).toLocaleString("es-AR", { maximumFractionDigits: 4 }) : valor}</button>;
  return (
    <form className="editable-form" onSubmit={(e) => { e.preventDefault(); onGuardar(numero ? Number(String(v).replace(",", ".")) : v); setEdit(false); }}>
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={() => setEdit(false)} onKeyDown={(e) => e.key === "Escape" && setEdit(false)} inputMode={numero ? "decimal" : undefined} />
    </form>
  );
}

function NuevoModelo({ proveedores }) {
  const [f, setF] = useState({ proveedor: proveedores[0]?.id, nombre: "", modelo: "", entrada: "", salida: "" });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function crear(e) {
    e.preventDefault();
    try {
      const m = await api.post("/api/ia/modelos", { proveedor: f.proveedor, nombre: f.nombre });
      await api.put(`/api/ia/modelos/${m.id}`, { modelo: f.modelo, entrada: Number(f.entrada || 0), salida: Number(f.salida || 0) });
      setMsg({ ok: true, t: `Agregado ${m.nombre}` });
      setF((x) => ({ ...x, nombre: "", modelo: "", entrada: "", salida: "" }));
    } catch (err) { setMsg({ ok: false, t: err.message }); }
  }
  return (
    <section className="card wide">
      <div className="card-head"><h2>Agregar un modelo a mano</h2><span className="muted">Por ejemplo, uno que corre en un servidor propio</span></div>
      <form className="nuevo-modelo" onSubmit={crear}>
        <select value={f.proveedor} onChange={set("proveedor")} aria-label="Proveedor">{proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
        <input value={f.nombre} onChange={set("nombre")} placeholder="Nombre" required />
        <input value={f.modelo} onChange={set("modelo")} placeholder="Id en la API" />
        <input value={f.entrada} onChange={set("entrada")} placeholder="USD entrada" inputMode="decimal" />
        <input value={f.salida} onChange={set("salida")} placeholder="USD salida" inputMode="decimal" />
        <button className="btn small" type="submit">Agregar</button>
      </form>
      {msg && <p className={`small ${msg.ok ? "form-ok" : "form-error"}`}>{msg.t}</p>}
    </section>
  );
}

/* ---------- Perfiles ---------- */

function Perfiles({ data }) {
  const [nuevo, setNuevo] = useState(false);
  return (
    <div className="solution">
      <section className="card wide aviso">
        <strong>Las personas eligen perfiles, no modelos.</strong>
        <span>Un perfil es un modelo principal, sus respaldos, un revisor de otro proveedor y un nivel de razonamiento. Si mañana conviene otro modelo, se cambia acá y todo lo que usa el perfil se actualiza.</span>
      </section>
      <div className="prov-grid">
        {data.perfiles.map((p) => <PerfilCard key={p.id} p={p} data={data} />)}
        <article className="card prov nuevo">
          {nuevo ? <PerfilCard p={null} data={data} onDone={() => setNuevo(false)} /> : <button className="btn" type="button" onClick={() => setNuevo(true)}>+ Nuevo perfil</button>}
        </article>
      </div>
    </div>
  );
}

function PerfilCard({ p, data, onDone }) {
  const [f, setF] = useState({ nombre: p?.nombre || "", descripcion: p?.descripcion || "", principal: p?.principal || "", respaldo1: p?.respaldo?.[0] || "", respaldo2: p?.respaldo?.[1] || "", revisor: p?.revisor || "", razonamiento: p?.razonamiento || "none", roles: p?.roles || [] });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const opciones = data.modelos.filter((m) => m.habilitado || [f.principal, f.revisor, f.respaldo1, f.respaldo2].includes(m.id));
  const Sel = ({ k, label }) => (
    <label>{label}
      <select value={f[k]} onChange={set(k)}>
        <option value="">—</option>
        {data.proveedores.map((pr) => {
          const ms = opciones.filter((m) => m.proveedor === pr.id);
          return ms.length ? <optgroup key={pr.id} label={pr.nombre}>{ms.map((m) => <option key={m.id} value={m.id}>{m.nombre} · USD {m.entrada}/{m.salida}{m.estado.listo ? "" : " · sin clave"}</option>)}</optgroup> : null;
        })}
      </select>
    </label>
  );
  async function guardar(e) {
    e.preventDefault();
    const body = { nombre: f.nombre, descripcion: f.descripcion, principal: f.principal || null, respaldo: [f.respaldo1, f.respaldo2].filter(Boolean), revisor: f.revisor || null, razonamiento: f.razonamiento, roles: f.roles };
    try { p ? await api.put(`/api/ia/perfiles/${p.id}`, body) : await api.post("/api/ia/perfiles", body); setMsg({ ok: true, t: "Guardado" }); onDone?.(); }
    catch (err) { setMsg({ ok: false, t: err.message }); }
  }
  const mismoProveedor = f.principal && f.revisor && f.principal.split(":")[0] === f.revisor.split(":")[0];
  return (
    <article className={p ? "card prov" : ""}>
      {p && <div className="card-head"><h2>{p.nombre}</h2><span className={`status ${p.publico.listo ? "ok" : "muted"}`}><i />{p.publico.listo ? "Listo" : "Sin clave"}</span></div>}
      <form className="form compacto" onSubmit={guardar}>
        {!p && <label>Nombre<input value={f.nombre} onChange={set("nombre")} required /></label>}
        <label>Para qué sirve<input value={f.descripcion} onChange={set("descripcion")} /></label>
        <Sel k="principal" label="Modelo principal" />
        <div className="dos"><Sel k="respaldo1" label="Respaldo 1" /><Sel k="respaldo2" label="Respaldo 2" /></div>
        <Sel k="revisor" label="Revisor (idealmente de otro proveedor)" />
        {mismoProveedor && <p className="hint">El revisor es del mismo proveedor que el principal: la revisión es más débil.</p>}
        <label>Razonamiento
          <select value={f.razonamiento} onChange={set("razonamiento")}>{Object.entries(RAZONAMIENTO).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
        </label>
        <fieldset className="chips"><legend>Roles que pueden elegirlo (ninguno = todos)</legend>
          {data.roles.map((r) => <label key={r.id} className={f.roles.includes(r.id) ? "on" : ""}><input type="checkbox" checked={f.roles.includes(r.id)} onChange={() => setF((x) => ({ ...x, roles: x.roles.includes(r.id) ? x.roles.filter((y) => y !== r.id) : [...x.roles, r.id] }))} />{r.label}</label>)}
        </fieldset>
        {msg && <p className={`small ${msg.ok ? "form-ok" : "form-error"}`}>{msg.t}</p>}
        <div className="actions"><button className="btn primary small" type="submit">Guardar perfil</button>{onDone && <button className="btn small" type="button" onClick={onDone}>Cancelar</button>}</div>
      </form>
    </article>
  );
}

/* ---------- Asignaciones y topes ---------- */

const TIPO_LABEL = { default: "Por defecto", chat: "Chat", reporte: "Reporte", investigacion: "Investigación", email: "Email", accion: "Acción" };

function Asignaciones({ data }) {
  const [asig, setAsig] = useState(data.asignaciones);
  const [flujos, setFlujos] = useState(data.flujoPorNivel);
  const [topes, setTopes] = useState({ mensualUSD: data.topes.mensualUSD, alertaPct: data.topes.alertaPct, porAgenteUSD: data.topes.porAgenteUSD || {} });
  const [msg, setMsg] = useState(null);
  const cols = ["default", ...data.tiposTarea];
  const cambiar = (agente, tipo, v) => setAsig((a) => ({ ...a, [agente]: { ...(a[agente] || {}), [tipo]: v || undefined } }));
  async function guardar() {
    try {
      await api.put("/api/ia/asignaciones", { asignaciones: asig, flujoPorNivel: flujos });
      await api.put("/api/ia/topes", topes);
      setMsg({ ok: true, t: "Guardado. Rige para las próximas tareas." });
    } catch (e) { setMsg({ ok: false, t: e.message }); }
  }
  return (
    <div className="solution">
      <section className="card wide">
        <div className="card-head"><h2>Perfil por agente y tipo de tarea</h2><span className="muted">Vacío = automático según la complejidad</span></div>
        <div className="table-wrap">
          <table className="table asig">
            <thead><tr><th scope="col">Agente</th>{cols.map((c) => <th key={c} scope="col">{TIPO_LABEL[c]}</th>)}</tr></thead>
            <tbody>
              {data.agentes.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  {cols.map((c) => (
                    <td key={c}>
                      <select value={asig[a.id]?.[c] || ""} onChange={(e) => cambiar(a.id, c, e.target.value)} aria-label={`${a.nombre} · ${TIPO_LABEL[c]}`}>
                        <option value="">{c === "default" ? "Automático" : "Igual que el agente"}</option>
                        {data.perfiles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Flujo según la complejidad</h2></div>
          {["simple", "media", "compleja"].map((n) => (
            <label key={n} className="fila-config">Complejidad {n}
              <select value={flujos[n]} onChange={(e) => setFlujos((f) => ({ ...f, [n]: e.target.value }))}>
                {data.flujos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </label>
          ))}
          <p className="muted small">Quien encarga la tarea puede cambiarlo en el formulario. Con «Borrador + revisión», un segundo modelo de otro proveedor revisa y, si encuentra errores, el primero corrige.</p>
        </section>
        <section className="card">
          <div className="card-head"><h2>Topes de gasto</h2><span className="muted">USD</span></div>
          <label className="fila-config">Tope mensual total<input inputMode="decimal" value={topes.mensualUSD} onChange={(e) => setTopes((t) => ({ ...t, mensualUSD: e.target.value }))} /></label>
          <label className="fila-config">Alertar al (% del tope)<input inputMode="numeric" value={topes.alertaPct} onChange={(e) => setTopes((t) => ({ ...t, alertaPct: e.target.value }))} /></label>
          <h3 className="sub">Por agente (opcional)</h3>
          {data.agentes.map((a) => (
            <label key={a.id} className="fila-config">{a.nombre}<input inputMode="decimal" placeholder="Sin tope" value={topes.porAgenteUSD[a.id] ?? ""} onChange={(e) => setTopes((t) => ({ ...t, porAgenteUSD: { ...t.porAgenteUSD, [a.id]: e.target.value } }))} /></label>
          ))}
          <p className="muted small">Al llegar al tope, las tareas salen con el sistema de reglas y queda registrado. No se corta nada a mitad de camino.</p>
        </section>
      </div>
      <div className="actions"><button className="btn primary" type="button" onClick={guardar}>Guardar asignaciones y topes</button>{msg && <span className={`small ${msg.ok ? "form-ok" : "form-error"}`}>{msg.t}</span>}</div>
    </div>
  );
}

/* ---------- Cómo funciona ---------- */

function Como({ data }) {
  return (
    <div className="solution">
      <section className="card wide">
        <h2>Qué modelo responde cada tarea</h2>
        <p className="small">Gana la primera regla que exista, de lo más específico a lo más general:</p>
        <ol className="lista-simple small">
          <li><strong>La tarea:</strong> quien la encarga elige un perfil o deja «Automático».</li>
          <li><strong>La programación:</strong> cada crontab guarda su propio perfil.</li>
          <li><strong>Agente + tipo de tarea:</strong> la grilla de «Asignaciones».</li>
          <li><strong>El agente:</strong> la columna «Por defecto».</li>
          <li><strong>La complejidad:</strong> simple → Rápido y barato; media → Equilibrado; compleja → Razonamiento profundo.</li>
        </ol>
        <p className="small">Después se aplican tres controles: el rol tiene que tener habilitado el perfil; con datos reales solo responden proveedores aptos; y si se llegó al tope, la tarea sale con el sistema de reglas.</p>
      </section>
      <div className="grid-2">
        {data.flujos.map((f) => (
          <section key={f.id} className="card">
            <h2>{f.nombre}</h2>
            <p className="small">{f.detalle}</p>
            <ol className="ia-pasos">{f.pasos.map((p) => <li key={p}><strong>{PASOS[p]}</strong></li>)}</ol>
          </section>
        ))}
        <section className="card">
          <h2>Contraste</h2>
          <p className="small">Desde el detalle de cualquier tarea terminada se puede mandar el mismo pedido a otro modelo (segunda opinión, con la comparación de las dos respuestas) o pedirle a otro agente que audite el resultado con sus propios datos. Todo queda en la tarea, en el consumo y en la auditoría.</p>
        </section>
      </div>
    </div>
  );
}
