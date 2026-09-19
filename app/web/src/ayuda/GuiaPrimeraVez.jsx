import { useEffect, useLayoutEffect, useState } from "react";
import { api } from "../api.js";
import { abrirAyuda, rutaActual } from "./util.js";

/**
 * Guía corta la primera vez que una persona entra a una pantalla: 3 o 4 pasos que
 * señalan las partes principales. Se recuerda por usuario en el servidor.
 */
export default function GuiaPrimeraVez() {
  const [ruta, setRuta] = useState(rutaActual);
  const [indice, setIndice] = useState(null);
  const [vistas, setVistas] = useState(null);
  const [guia, setGuia] = useState(null); // { id, pasos }
  const [paso, setPaso] = useState(0);
  const [caja, setCaja] = useState(null);

  useEffect(() => {
    // En capturas y exportaciones (?estatico=1) la guía no se muestra.
    if (new URLSearchParams(window.location.search).has("estatico")) return;
    api.get("/api/ayuda/indice").then((r) => setIndice(r.paginas)).catch(() => setIndice([]));
    api.get("/api/ayuda/guias").then((r) => setVistas(new Set(r.vistas))).catch(() => setVistas(new Set()));
  }, []);

  // Sigue la pantalla y la pestaña: cambian con el hash o cuando una pestaña marca la ruta.
  useEffect(() => {
    const on = () => setRuta(rutaActual());
    window.addEventListener("hashchange", on);
    window.addEventListener("sala:ruta", on);
    return () => { window.removeEventListener("hashchange", on); window.removeEventListener("sala:ruta", on); };
  }, []);

  // Al entrar a una pantalla con guía que todavía no se vio, se muestra después de que carga.
  // Vale la guía de la ruta más específica: comercial/pdv/misiones → comercial/pdv → comercial.
  useEffect(() => {
    if (!indice || !vistas || !ruta) return;
    const partes = ruta.split("/");
    let p = null;
    for (let n = partes.length; n > 0 && !p; n--) p = indice.find((x) => x.tieneGuia && x.ruta === partes.slice(0, n).join("/"));
    if (!p || vistas.has(p.id)) { setGuia(null); return; }
    let vivo = true;
    const t = setTimeout(() => {
      api.get(`/api/ayuda/guia/${p.id}`).then((g) => vivo && g.pasos.length && (setGuia({ id: p.id, titulo: p.titulo, pasos: g.pasos }), setPaso(0)));
    }, 1200);
    return () => { vivo = false; clearTimeout(t); };
  }, [ruta, indice, vistas]);

  const actual = guia?.pasos[paso];
  useLayoutEffect(() => {
    if (!actual) return;
    const medir = () => {
      const el = actual.sel && document.querySelector(actual.sel);
      if (!el) { setCaja(null); return; }
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      setCaja({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [actual]);

  if (!guia || !actual) return null;

  function terminar(abrir = false) {
    api.post(`/api/ayuda/guias/${guia.id}`).catch(() => {});
    setVistas((v) => new Set([...v, guia.id]));
    setGuia(null);
    if (abrir) abrirAyuda();
  }

  const ultimo = paso === guia.pasos.length - 1;
  const margen = 6;
  // La tarjeta va debajo del elemento si entra; si no, arriba; sin elemento, al centro.
  const abajo = caja && caja.top + caja.height + 190 < window.innerHeight;
  const estiloTarjeta = caja
    ? { top: abajo ? caja.top + caja.height + 12 : Math.max(12, caja.top - 180), left: Math.min(Math.max(12, caja.left), window.innerWidth - 352) }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="guia" role="dialog" aria-modal="true" aria-label={`Guía: ${guia.titulo}`}>
      {caja
        ? <div className="guia-foco" style={{ top: caja.top - margen, left: caja.left - margen, width: caja.width + margen * 2, height: caja.height + margen * 2 }} />
        : <div className="guia-velo" />}
      <div className="guia-tarjeta" style={estiloTarjeta}>
        <span className="eyebrow">Primera vez en {guia.titulo} · {paso + 1} de {guia.pasos.length}</span>
        <p>{actual.texto}</p>
        <div className="actions">
          {!ultimo && <button type="button" className="btn primary small" onClick={() => setPaso((p) => p + 1)} autoFocus>Siguiente</button>}
          {ultimo && <button type="button" className="btn primary small" onClick={() => terminar(true)} autoFocus>Abrir la ayuda</button>}
          {ultimo && <button type="button" className="btn small" onClick={() => terminar()}>Listo</button>}
          {!ultimo && <button type="button" className="btn small ghost" onClick={() => terminar()}>Saltar la guía</button>}
        </div>
      </div>
    </div>
  );
}
