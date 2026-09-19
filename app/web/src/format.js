import cronstrue from "cronstrue/i18n";

const TZ = "America/Argentina/Buenos_Aires";

export const TYPES = { reporte: "Reporte", investigacion: "Investigación", email: "Email", accion: "Acción" };

export const fmtUSD = (v, dec) => {
  const d = dec ?? (v === 0 ? 2 : v < 0.01 ? 5 : v < 1 ? 4 : 2);
  return `USD ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0)}`;
};
export const fmtTokens = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${(n / 1e3).toLocaleString("es-AR", { maximumFractionDigits: 1 })} k` : String(n || 0));
export const PASOS = { borrador: "Borrador", revision: "Revisión", correccion: "Corrección", verificacion: "Verificación de cifras", prueba: "Prueba", "segunda-opinion": "Segunda opinión", comparacion: "Comparación", auditoria: "Auditoría cruzada", "contraste-auditoria": "Auditoría cruzada", "contraste-segunda-opinion": "Segunda opinión", "contraste-comparacion": "Comparación" };
export const RAZONAMIENTO = { none: "Sin razonamiento", low: "Bajo", medium: "Medio", high: "Alto" };

export const TASK_STATUS = {
  pendiente: ["Pendiente", "muted"],
  en_curso: ["En curso", "live"],
  esperando_aprobacion: ["Esperando aprobación", "warn"],
  completada: ["Completada", "ok"],
  rechazada: ["Rechazada", "crit"],
  fallida: ["Fallida", "crit"]
};

export const EMAIL_STATUS = {
  esperando_aprobacion: ["Esperando aprobación", "warn"],
  enviado: ["Enviado (simulado)", "ok"],
  rechazado: ["Rechazado", "crit"]
};

export const CRON_PRESETS = [
  ["0 7 * * *", "Todos los días, 07:00"],
  ["0 8 * * 1-5", "Días hábiles, 08:00"],
  ["30 18 * * 1-5", "Días hábiles, 18:30"],
  ["0 8 * * 1", "Lunes, 08:00"],
  ["0 9 1 * *", "El 1° de cada mes, 09:00"],
  ["*/15 * * * *", "Cada 15 minutos (demo)"]
];

export function fmtDate(iso, withYear = false) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", ...(withYear ? { year: "numeric" } : {}), hour: "2-digit", minute: "2-digit"
  }).format(new Date(iso));
}

export function fmtRelative(iso) {
  if (!iso) return "—";
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  if (abs < 60) return diff < 0 ? "recién" : "en instantes";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function describeCron(expr) {
  try {
    return cronstrue.toString(expr, { locale: "es", use24HourTimeFormat: true });
  } catch {
    return null;
  }
}
