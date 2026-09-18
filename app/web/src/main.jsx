import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Login from "./components/Login.jsx";
import { LiveProvider, SesionContext } from "./live.jsx";
import { api } from "./api.js";
import "./styles.css";

function AuthGate() {
  const [session, setSession] = useState({ checked: false, user: null, permisos: null });

  useEffect(() => {
    api.get("/api/auth/me")
      .then((r) => setSession({ checked: true, user: r.user, permisos: r.permisos }))
      .catch(() => setSession({ checked: true, user: null, permisos: null }));
    const onUnauthorized = () => setSession({ checked: true, user: null, permisos: null });
    window.addEventListener("sala:unauthorized", onUnauthorized);
    return () => window.removeEventListener("sala:unauthorized", onUnauthorized);
  }, []);

  async function logout() {
    await api.post("/api/auth/logout").catch(() => {});
    setSession({ checked: true, user: null, permisos: null });
  }

  if (!session.checked) return null;
  if (!session.user) return <Login onLogin={(r) => setSession({ checked: true, user: r.user, permisos: r.permisos })} />;
  return (
    <SesionContext.Provider value={{ user: session.user, permisos: session.permisos }}>
      <LiveProvider>
        <App user={session.user} permisos={session.permisos} onLogout={logout} />
      </LiveProvider>
    </SesionContext.Provider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
