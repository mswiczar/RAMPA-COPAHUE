import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import AyudaPagina from "./AyudaPagina.jsx";
import AyudaAgente from "./AyudaAgente.jsx";
import { rutaActual } from "./util.js";

/**
 * Botón «? Ayuda» (y tecla ?) que abre, en un popup, la página del sitio de ayuda
 * que corresponde a la pantalla y la pestaña actuales, con el agente de ayuda abajo.
 */
export default function AyudaPopup() {
  const [abierto, setAbierto] = useState(false);
  const [pila, setPila] = useState([]); // historial dentro del popup: [{ id, ancla }]
  const [pagina, setPagina] = useState(null);
  const [ruta, setRuta] = useState(null);
  const volverFoco = useRef(null);
  const actual = pila.at(-1);

  async function abrir(id = null) {
    volverFoco.current = document.activeElement;
    const r = rutaActual();
    setRuta(r);
    const destino = id || (await api.get(`/api/ayuda/para?ruta=${encodeURIComponent(r)}`).then((x) => x.id).catch(() => "inicio"));
    setPila([{ id: destino, ancla: null }]);
    setAbierto(true);
  }
  const cerrar = () => { setAbierto(false); volverFoco.current?.focus?.(); };

  useEffect(() => {
    const onAbrir = (e) => abrir(e.detail?.id);
    const onTecla = (e) => {
      const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (e.key === "?" && !escribiendo && !e.ctrlKey && !e.metaKey) { e.preventDefault(); abierto ? cerrar() : abrir(); }
      if (e.key === "Escape" && abierto) cerrar();
    };
    window.addEventListener("sala:ayuda", onAbrir);
    window.addEventListener("keydown", onTecla);
    return () => { window.removeEventListener("sala:ayuda", onAbrir); window.removeEventListener("keydown", onTecla); };
  });

  // ?ayuda=1 abre la ayuda al cargar: sirve para compartir un link con la ayuda abierta.
  useEffect(() => { if (new URLSearchParams(window.location.search).has("ayuda")) abrir(); }, []);

  useEffect(() => {
    if (!actual) return;
    setPagina(null);
    api.get(`/api/ayuda/pagina/${actual.id}`).then(setPagina).catch(() => setPagina({ id: "error", titulo: "No se encontró la página", cuerpo: "Probá desde el índice del sitio de ayuda.", grupo: "Ayuda" }));
  }, [actual?.id]);

  const irAyuda = (id, ancla = null) => setPila((p) => [...p, { id, ancla }]);
  const irApp = (r) => { cerrar(); window.location.hash = `#/${r}`; };

  return (
    <>
      <button type="button" className="btn small ayuda-btn" onClick={() => (abierto ? cerrar() : abrir())} aria-haspopup="dialog" title="Ayuda de esta pantalla (tecla ?)">
        <span aria-hidden="true" className="ayuda-q">?</span> Ayuda
      </button>
      {abierto && (
        <div className="ayuda-overlay" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
          <div className="ayuda-popup" role="dialog" aria-modal="true" aria-label="Ayuda">
            <header className="ayuda-popup-head">
              {pila.length > 1 && <button type="button" className="btn small ghost" onClick={() => setPila((p) => p.slice(0, -1))}>← Volver</button>}
              <span className="muted small">Ayuda · {ruta}</span>
              <a className="btn small ghost" href={`/ayuda#/${actual?.id || "inicio"}`} target="_blank" rel="noopener">Abrir en el sitio de ayuda ↗</a>
              <button type="button" className="btn small" onClick={cerrar} aria-label="Cerrar la ayuda">Cerrar</button>
            </header>
            <div className="ayuda-popup-body ayuda-scroll">
              <AyudaPagina pagina={pagina} ancla={actual?.ancla} compacta onIrAyuda={irAyuda} onIrApp={irApp} />
            </div>
            <AyudaAgente ruta={ruta} paginaId={actual?.id} onIr={irAyuda} />
          </div>
        </div>
      )}
    </>
  );
}
