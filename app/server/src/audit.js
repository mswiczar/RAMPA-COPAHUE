// Registro de auditoría: quién consultó, encargó, programó, aprobó o rechazó qué, y cuándo.
// Se guarda junto al resto de los datos y no incluye contraseñas ni contenido sensible.
import { db, newId, now, save } from "./store.js";

const MAXIMO = 5000;
const ultimaConsulta = new Map();
const VENTANA_CONSULTA_MS = 10 * 60e3;

export function registrar(req, accion, recurso, detalle = "", resultado = "ok") {
  db.audit ||= [];
  db.audit.unshift({
    id: newId("aud"), ts: now(),
    usuario: req.user?.usuario || "anónimo", rol: req.user?.rolLabel || "—",
    accion, recurso, detalle: String(detalle).slice(0, 240), resultado,
    ip: req.ip
  });
  if (db.audit.length > MAXIMO) db.audit.length = MAXIMO;
  save();
}

/** Las consultas a un tablero se registran una vez cada 10 minutos por usuario, no en cada refresco. */
export function consulta(req, recurso) {
  const clave = `${req.user?.usuario}|${recurso}`;
  const previa = ultimaConsulta.get(clave) || 0;
  if (Date.now() - previa < VENTANA_CONSULTA_MS) return;
  ultimaConsulta.set(clave, Date.now());
  registrar(req, "consultó", recurso);
}

export function listar({ usuario, accion, limite = 300 } = {}) {
  return (db.audit || [])
    .filter((a) => (!usuario || a.usuario === usuario) && (!accion || a.accion === accion))
    .slice(0, limite);
}
