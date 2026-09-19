// Utilidades de la ayuda: en qué pantalla y pestaña está la persona, y cómo abrir el popup.

/** Ruta actual de la app, sin «#/», por ejemplo «comercial/pdv/misiones». */
export const rutaActual = () => (window.location.hash.replace(/^#\/?/, "") || "sala").split("?")[0];

/**
 * Las pestañas actualizan la dirección sin recargar la vista (replaceState no dispara
 * hashchange). Así la ayuda sabe dónde estás y el link se puede compartir.
 */
export function marcarRuta(ruta) {
  const nueva = `#/${ruta}`;
  if (window.location.hash !== nueva) window.history.replaceState(null, "", nueva);
  window.dispatchEvent(new CustomEvent("sala:ruta", { detail: { ruta } }));
}

export const abrirAyuda = (id = null) => window.dispatchEvent(new CustomEvent("sala:ayuda", { detail: { id } }));

/** Links dentro de la ayuda: a otra página de ayuda, a una pantalla de la app o externos. */
export function clasificarLink(href) {
  if (!href) return null;
  const ayuda = href.match(/^\/ayuda#\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/);
  if (ayuda) return { tipo: "ayuda", id: ayuda[1], ancla: ayuda[2] || null };
  const app = href.match(/^\/?#\/(.*)$/);
  if (app) return { tipo: "app", ruta: app[1] };
  return { tipo: "externo" };
}
