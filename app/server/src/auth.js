// Login con página propia: sesión firmada (HMAC) en una cookie HttpOnly.
// La sesión lleva el usuario; el rol y los permisos se resuelven en cada pedido.
import crypto from "node:crypto";
import * as users from "./users.js";
import * as audit from "./audit.js";

const COOKIE = "sala_session";
const TTL_MS = 12 * 3600e3;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SECURE = process.env.NODE_ENV === "production";

export const authEnabled = users.hayUsuarios;

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

function readCookie(req) {
  const raw = req.headers.cookie || "";
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  return hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : null;
}

export function sessionUser(req) {
  if (!authEnabled) return users.LOCAL;
  const token = readCookie(req);
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !same(sign(payload), sig)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return exp > Date.now() ? users.buscar(u) : null;
  } catch {
    return null;
  }
}

function setCookie(res, value, maxAgeMs) {
  const parts = [`${COOKIE}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (SECURE) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

// Límite simple de intentos fallidos por IP.
const failures = new Map();
const WINDOW_MS = 15 * 60e3;
const MAX_FAILS = 8;

function tooMany(ip) {
  const f = failures.get(ip);
  if (!f || Date.now() - f.first > WINDOW_MS) return false;
  return f.count >= MAX_FAILS;
}
function fail(ip) {
  const f = failures.get(ip);
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(ip, { first: Date.now(), count: 1 });
  else f.count++;
}

export function routes(app) {
  app.get("/api/auth/me", (req, res) => {
    const user = sessionUser(req);
    if (!user) return res.status(401).json({ error: "Sesión no iniciada" });
    res.json({ user, permisos: users.permisos(user), authEnabled });
  });

  app.post("/api/auth/login", (req, res) => {
    const ip = req.ip;
    if (tooMany(ip)) return res.status(429).json({ error: "Demasiados intentos. Esperá 15 minutos y probá de nuevo." });
    const { user = "", password = "" } = req.body || {};
    const found = authEnabled ? users.verificar(user, password) : users.LOCAL;
    if (found) {
      failures.delete(ip);
      const payload = b64(JSON.stringify({ u: found.usuario, exp: Date.now() + TTL_MS }));
      setCookie(res, `${payload}.${sign(payload)}`, TTL_MS);
      req.user = found;
      audit.registrar(req, "inició sesión", "Sala 24/7");
      return res.json({ user: found, permisos: users.permisos(found) });
    }
    fail(ip);
    req.user = { usuario: String(user).slice(0, 40) || "vacío", rolLabel: "—" };
    audit.registrar(req, "intentó iniciar sesión", "Sala 24/7", "Usuario o contraseña incorrectos", "rechazado");
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.user = sessionUser(req);
    if (req.user) audit.registrar(req, "cerró sesión", "Sala 24/7");
    setCookie(res, "", 0);
    res.json({ ok: true });
  });
}

/** Protege la API y deja el usuario en req.user. El frontend es público y muestra el login. */
export function requireSession(req, res, next) {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/auth/") || req.path === "/api/health") return next();
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: "Sesión no iniciada" });
  req.user = user;
  next();
}
