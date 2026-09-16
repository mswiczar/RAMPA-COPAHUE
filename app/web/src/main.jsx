import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Login from "./components/Login.jsx";
import { LiveProvider } from "./live.jsx";
import { api } from "./api.js";
import "./styles.css";

function AuthGate() {
  const [session, setSession] = useState({ checked: false, user: null });

  useEffect(() => {
    api.get("/api/auth/me")
      .then((r) => setSession({ checked: true, user: r.user }))
      .catch(() => setSession({ checked: true, user: null }));
    const onUnauthorized = () => setSession({ checked: true, user: null });
    window.addEventListener("sala:unauthorized", onUnauthorized);
    return () => window.removeEventListener("sala:unauthorized", onUnauthorized);
  }, []);

  async function logout() {
    await api.post("/api/auth/logout").catch(() => {});
    setSession({ checked: true, user: null });
  }

  if (!session.checked) return null;
  if (!session.user) return <Login onLogin={(user) => setSession({ checked: true, user })} />;
  return (
    <LiveProvider>
      <App user={session.user} onLogout={logout} />
    </LiveProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
