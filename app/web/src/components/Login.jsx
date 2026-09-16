import { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [user, setUser] = useState("ceo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post("/api/auth/login", { user, password });
      onLogin(r.user);
    } catch (err) {
      setError(err.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-orbs" aria-hidden="true">
        <span className="sphere" style={{ "--d": "0s" }} />
        <span className="sphere" style={{ "--d": ".6s" }} />
        <span className="desk">CEO</span>
        <span className="sphere" style={{ "--d": "1.2s" }} />
        <span className="sphere" style={{ "--d": "1.8s" }} />
      </div>
      <form className="login-card form" onSubmit={submit}>
        <div>
          <span className="eyebrow">Laboratorio Copahue · 24/7 AI Ready</span>
          <h1>Sala 24/7</h1>
          <p className="muted">Ingresá para hablar con los agentes, encargar tareas y aprobar envíos.</p>
        </div>
        <div className="field">
          <label htmlFor="login-user">Usuario</label>
          <input id="login-user" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="login-password">Contraseña</label>
          <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary login-btn" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
        <p className="hint">Mockup con datos simulados.</p>
      </form>
    </div>
  );
}
