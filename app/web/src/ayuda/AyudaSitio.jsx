import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useSesion } from "../live.jsx";
import AyudaPagina from "./AyudaPagina.jsx";
import AyudaAgente from "./AyudaAgente.jsx";

/** Hash del sitio: #/pagina o #/pagina/ancla. */
function useHashAyuda() {
  const leer = () => {
    const [id, ancla] = window.location.hash.replace(/^#\/?/, "").split("/");
    return { id: id || "inicio", ancla: ancla || null };
  };
  const [pos, setPos] = useState(leer);
  useEffect(() => {
    const on = () => setPos(leer());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return pos;
}

/** Sitio de ayuda: índice, buscador, una página por pantalla y el agente de ayuda. */
export default function AyudaSitio({ onLogout }) {
  const { user, permisos } = useSesion();
  const { id, ancla } = useHashAyuda();
  const [indice, setIndice] = useState(null);
  const [pagina, setPagina] = useState(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState(null);
  const [menu, setMenu] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => { document.title = "Ayuda · Sala 24/7"; api.get("/api/ayuda/indice").then(setIndice); }, []);
  useEffect(() => {
    if (id === "sin-respuesta") { setPagina(null); return; }
    setPagina(null);
    api.get(`/api/ayuda/pagina/${id}`).then(setPagina).catch(() => setPagina({ id: "404", titulo: "No existe esa página", cuerpo: "Volvé al [inicio](/ayuda#/inicio) o buscá arriba.", grupo: "Ayuda" }));
    setMenu(false);
  }, [id]);
  useEffect(() => {
    if (q.trim().length < 3) { setResultados(null); return; }
    const t = setTimeout(() => api.get(`/api/ayuda/buscar?q=${encodeURIComponent(q)}`).then(setResultados).catch(() => setResultados([])), 250);
    return () => clearTimeout(t);
  }, [q]);

  const grupos = useMemo(() => {
    if (!indice) return [];
    return indice.grupos.map((g) => ({ g, paginas: indice.paginas.filter((p) => p.grupo === g) })).filter((x) => x.paginas.length);
  }, [indice]);

  const irAyuda = (pid, a = null) => { window.location.hash = `#/${pid}${a ? `/${a}` : ""}`; setQ(""); };
  const irApp = (ruta) => { window.location.href = `/#/${ruta}`; };

  async function reiniciarGuias() {
    await api.del("/api/ayuda/guias");
    setAviso("Listo: las guías de primera vez van a volver a aparecer en cada pantalla.");
  }

  return (
    <div className="ayuda-sitio">
      <header className="ayuda-top">
        <button type="button" className="btn small ghost ayuda-menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>Índice</button>
        <a className="brand" href="/ayuda#/inicio">
          <span className="brand-mark" aria-hidden="true" />
          <span><strong>Ayuda · Sala 24/7</strong><small>Laboratorio Copahue</small></span>
        </a>
        <div className="ayuda-buscar">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la ayuda: misiones, cobertura, aprobar…" aria-label="Buscar en la ayuda" />
          {resultados && (
            <ul className="ayuda-resultados" role="listbox">
              {!resultados.length && <li className="muted small">Sin resultados. Probá preguntarle al agente de ayuda.</li>}
              {resultados.map((r, i) => (
                <li key={i}><button type="button" onClick={() => irAyuda(r.pagina, r.ancla)}><strong>{r.paginaTitulo}{r.seccion !== r.paginaTitulo ? ` › ${r.seccion}` : ""}</strong><span className="muted small">{r.fragmento}</span></button></li>
              ))}
            </ul>
          )}
        </div>
        <div className="top-meta">
          <button type="button" className="btn small ghost" onClick={reiniciarGuias}>Volver a ver las guías</button>
          <a className="btn small" href="/#/sala">Volver a la Sala</a>
          <span className="pill usuario"><i className="rol-dot" />{user.nombre} · {user.rolLabel}</span>
          <button className="btn small ghost" type="button" onClick={onLogout}>Salir</button>
        </div>
      </header>
      {aviso && <p className="form-ok ayuda-aviso" role="status">{aviso}</p>}

      <div className="ayuda-cuerpo">
        <nav className={`ayuda-indice ${menu ? "abierto" : ""}`} aria-label="Índice de la ayuda">
          {grupos.map(({ g, paginas }) => (
            <div key={g} className="ayuda-grupo">
              <span className="eyebrow">{g}</span>
              <ul>
                {paginas.map((p) => (
                  <li key={p.id}><a href={`/ayuda#/${p.id}`} className={p.id === id ? "activo" : ""} aria-current={p.id === id ? "page" : undefined}>{p.titulo.replace(/^(Comercial|R&D|Operaciones|Producción|Finanzas|Modelos|Auditoría) · /, "")}</a></li>
                ))}
              </ul>
            </div>
          ))}
          {permisos?.auditoria && (
            <div className="ayuda-grupo">
              <span className="eyebrow">Para Dirección</span>
              <ul><li><a href="/ayuda#/sin-respuesta" className={id === "sin-respuesta" ? "activo" : ""}>Preguntas sin respuesta</a></li></ul>
            </div>
          )}
        </nav>

        <main className="ayuda-main ayuda-scroll">
          {id === "sin-respuesta" ? <SinRespuesta /> : <AyudaPagina pagina={pagina} ancla={ancla} onIrAyuda={irAyuda} onIrApp={irApp} />}
          {id === "inicio" && indice && <Portada grupos={grupos} onIr={irAyuda} />}
        </main>

        <aside className="ayuda-lateral">
          <AyudaAgente paginaId={id} onIr={irAyuda} />
        </aside>
      </div>
    </div>
  );
}

function Portada({ grupos, onIr }) {
  return (
    <section className="ayuda-portada">
      <div className="ayuda-grupos">
        {grupos.filter(({ g }) => g !== "Empezar").map(({ g, paginas }) => (
          <article key={g} className="card">
            <h2>{g}</h2>
            <ul>{paginas.slice(0, 6).map((p) => <li key={p.id}><button type="button" className="linkish" onClick={() => onIr(p.id)}>{p.titulo}</button></li>)}</ul>
            {paginas.length > 6 && <p className="muted small">y {paginas.length - 6} más en el índice</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function SinRespuesta() {
  const [lista, setLista] = useState(null);
  useEffect(() => { api.get("/api/ayuda/sin-respuesta").then(setLista).catch(() => setLista([])); }, []);
  return (
    <article className="ayuda-pagina">
      <span className="eyebrow">Para Dirección</span>
      <h1>Preguntas sin respuesta</h1>
      <p className="ayuda-resumen">Lo que se le preguntó al agente de ayuda y no estaba documentado. Sirve para saber qué falta escribir.</p>
      {!lista ? <p className="thinking">Cargando…</p> : !lista.length ? <p className="empty">Todavía no hay preguntas sin respuesta.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Cuándo</th><th scope="col">Quién</th><th scope="col">Pregunta</th><th scope="col">Pantalla</th></tr></thead>
            <tbody>{lista.map((x, i) => <tr key={i}><td>{new Date(x.ts).toLocaleString("es-AR")}</td><td>{x.usuario}<span className="cell-sub">{x.rol}</span></td><td>{x.pregunta}</td><td className="mono small">{x.ruta || "Sitio de ayuda"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </article>
  );
}
