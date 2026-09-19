import { useEffect, useRef } from "react";
import { toHtml } from "../components/Markdown.jsx";
import { clasificarLink } from "./util.js";

const slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Una página de ayuda. Los links a otras páginas o a pantallas de la app se interceptan:
 * onIrAyuda(id, ancla) y onIrApp(ruta).
 */
export default function AyudaPagina({ pagina, ancla, onIrAyuda, onIrApp, compacta = false, grupo }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Anclas en los títulos, para poder linkear secciones.
    el.querySelectorAll("h2").forEach((h) => { h.id = slug(h.textContent); });
    if (ancla) el.querySelector(`#${CSS.escape(ancla)}`)?.scrollIntoView({ block: "start" });
    else el.closest(".ayuda-scroll")?.scrollTo?.({ top: 0 });
  }, [pagina?.id, ancla]);

  function click(e) {
    const a = e.target.closest("a");
    if (!a) return;
    const l = clasificarLink(a.getAttribute("href"));
    if (!l || l.tipo === "externo") return;
    e.preventDefault();
    if (l.tipo === "ayuda") onIrAyuda?.(l.id, l.ancla);
    else onIrApp?.(l.ruta);
  }

  if (!pagina) return <p className="thinking">Cargando…</p>;
  return (
    <article className={`ayuda-pagina ${compacta ? "compacta" : ""}`}>
      <span className="eyebrow">{grupo || pagina.grupo}</span>
      <h1>{pagina.titulo}</h1>
      {pagina.resumen && <p className="ayuda-resumen">{pagina.resumen}</p>}
      {pagina.ruta && pagina.ruta !== "login" && (
        <p><button type="button" className="btn small" onClick={() => onIrApp?.(pagina.ruta)}>Abrir esta pantalla →</button></p>
      )}
      {pagina.captura && !compacta && (
        <figure className="ayuda-captura">
          <img src={`/api/ayuda/img/${pagina.captura}`} alt={`Captura de la pantalla ${pagina.titulo}`} loading="lazy" onError={(e) => { e.currentTarget.closest("figure").style.display = "none"; }} />
          <figcaption className="muted small">Captura de la pantalla con los datos sintéticos de la demo.</figcaption>
        </figure>
      )}
      <div ref={ref} className="md ayuda-md" onClick={click} dangerouslySetInnerHTML={{ __html: toHtml(pagina.cuerpo) }} />
      {pagina.relacionadas?.length > 0 && (
        <section className="ayuda-relacionadas">
          <h2>Pantallas y páginas relacionadas</h2>
          <ul>
            {pagina.relacionadas.map((r) => (
              <li key={r.id}><button type="button" className="linkish" onClick={() => onIrAyuda?.(r.id)}>{r.titulo}</button><span className="muted small"> · {r.resumen}</span></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
