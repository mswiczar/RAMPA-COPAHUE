// Login con página propia: sesión firmada (HMAC) en una cookie HttpOnly.
import crypto from "node:crypto";

const COOKIE = "sala_session";
const TTL_MS = 12 * 3600e3;
const USER = process.env.APP_USER || "ceo";
const PASSWORD = process.env.APP_PASSWORD || "";
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SECURE = process.env.NODE_ENV === "production";

export const authEnabled = Boolean(PASSWORD);

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
  if (!authEnabled) return USER;
  const token = readCookie(req);
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !same(sign(payload), sig)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return exp > Date.now() ? u : null;
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
    res.json({ user, authEnabled });
  });

  app.post("/api/auth/login", (req, res) => {
    const ip = req.ip;
    if (tooMany(ip)) return res.status(429).json({ error: "Demasiados intentos. Esperá 15 minutos y probá de nuevo." });
    const { user = "", password = "" } = req.body || {};
    if (!authEnabled || (same(String(user).trim().toLowerCase(), USER.toLowerCase()) & same(password, PASSWORD))) {
      failures.delete(ip);
      const payload = b64(JSON.stringify({ u: USER, exp: Date.now() + TTL_MS }));
      setCookie(res, `${payload}.${sign(payload)}`, TTL_MS);
      return res.json({ user: USER });
    }
    fail(ip);
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  });

  app.post("/api/auth/logout", (req, res) => {
    setCookie(res, "", 0);
    res.json({ ok: true });
  });
}

/** Protege la API. El frontend (HTML/JS) es público y muestra el login. */
export function requireSession(req, res, next) {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/auth/") || req.path === "/api/health") return next();
  if (sessionUser(req)) return next();
  res.status(401).json({ error: "Sesión no iniciada" });
}
