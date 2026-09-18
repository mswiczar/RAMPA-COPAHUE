// Usuarios, roles y permisos. Los usuarios viven fuera del repo (USERS_FILE),
// con la contraseña guardada como hash scrypt. Sin archivo, queda un solo usuario
// de Dirección definido por APP_USER / APP_PASSWORD.
import crypto from "node:crypto";
import fs from "node:fs";

const TODAS = ["comercial", "finanzas", "rd", "operaciones", "produccion"];
const AGENTES = ["ceo", "rd", "comercial", "finanzas", "operaciones", "producto", "legal", "produccion", "marketing"];

/**
 * Qué puede ver y hacer cada rol. La información confidencial (caja, P&L y
 * portfolio de I+D) queda restringida a quien la necesita para decidir.
 */
export const ROLES = {
  direccion: {
    label: "Dirección", soluciones: TODAS, agentes: AGENTES,
    aprobar: true, programar: true, auditoria: true
  },
  finanzas: {
    label: "Finanzas", soluciones: ["finanzas", "comercial", "operaciones", "produccion"],
    agentes: ["finanzas", "operaciones", "produccion", "legal"],
    aprobar: false, programar: true, auditoria: false
  },
  comercial: {
    label: "Comercial", soluciones: ["comercial", "operaciones"],
    agentes: ["comercial", "marketing", "operaciones"],
    aprobar: false, programar: true, auditoria: false
  },
  operaciones: {
    label: "Operaciones", soluciones: ["operaciones", "produccion", "comercial"],
    agentes: ["operaciones", "produccion"],
    aprobar: false, programar: true, auditoria: false
  },
  rd: {
    label: "R&D", soluciones: ["rd", "comercial"],
    agentes: ["rd", "producto"],
    aprobar: false, programar: true, auditoria: false
  },
  consulta: {
    label: "Solo lectura", soluciones: ["comercial", "operaciones", "produccion"],
    agentes: [], aprobar: false, programar: false, auditoria: false
  }
};

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyHash(password, stored) {
  const [alg, salt, hash] = String(stored).split(":");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const calc = crypto.scryptSync(String(password), salt, 32);
  const expected = Buffer.from(hash, "hex");
  return expected.length === calc.length && crypto.timingSafeEqual(calc, expected);
}

function cargar() {
  const file = process.env.USERS_FILE;
  if (file && fs.existsSync(file)) {
    const lista = JSON.parse(fs.readFileSync(file, "utf8"));
    return lista.filter((u) => ROLES[u.rol]);
  }
  if (process.env.APP_PASSWORD) {
    return [{ usuario: process.env.APP_USER || "ceo", nombre: "Dirección", rol: "direccion", password: process.env.APP_PASSWORD }];
  }
  return [];
}

const USUARIOS = cargar();

export const hayUsuarios = USUARIOS.length > 0;

/** Devuelve el usuario si la contraseña es correcta; si no, null. Siempre gasta el mismo tiempo. */
export function verificar(usuario, password) {
  const u = USUARIOS.find((x) => x.usuario.toLowerCase() === String(usuario || "").trim().toLowerCase());
  const ok = u
    ? (u.hash ? verifyHash(password, u.hash) : crypto.timingSafeEqual(sha(password), sha(u.password)))
    : (verifyHash(password, hashPassword("señuelo")), false);
  return ok ? publico(u) : null;
}

export function buscar(usuario) {
  const u = USUARIOS.find((x) => x.usuario === usuario);
  return u ? publico(u) : null;
}

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

function publico(u) {
  const rol = ROLES[u.rol];
  return { usuario: u.usuario, nombre: u.nombre || u.usuario, rol: u.rol, rolLabel: rol.label };
}

/** Usuario anónimo cuando no hay login configurado (desarrollo local). */
export const LOCAL = { usuario: "local", nombre: "Desarrollo local", rol: "direccion", rolLabel: "Dirección" };

export function permisos(user) {
  const r = ROLES[user?.rol];
  if (!r) return { soluciones: [], agentes: [], aprobar: false, programar: false, auditoria: false };
  return { soluciones: r.soluciones, agentes: r.agentes, aprobar: r.aprobar, programar: r.programar, auditoria: r.auditoria };
}

export const puedeSolucion = (user, id) => permisos(user).soluciones.includes(id);
export const puedeAgente = (user, id) => permisos(user).agentes.includes(id);
export const puede = (user, accion) => Boolean(permisos(user)[accion]);

/** Lista pública de usuarios (sin contraseñas) para la pantalla de permisos. */
export function listarUsuarios() {
  return USUARIOS.map(publico);
}
