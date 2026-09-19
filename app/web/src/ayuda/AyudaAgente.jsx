import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import Markdown from "../components/Markdown.jsx";

const SUGERENCIAS = {
  default: ["¿Cómo encargo un reporte?", "¿Cómo programo una tarea semanal?", "¿Qué significa un dato estimado?"],
  tareas: ["¿Cómo apruebo una acción?", "¿Qué es el contraste?", "¿Cómo elijo el modelo de una tarea?"],
  modelos: ["¿Cómo cargo la clave de DeepSeek?", "¿Qué pasa si llego al tope?", "¿Qué es un perfil?"],
  pdv: ["¿Cómo envío una misión a aprobación?", "¿Qué es el share of shelf?", "¿Cuánto cuesta un relevamiento?"]
};

/** Agente de ayuda: responde solo con la documentación y cita las páginas. */
export default function AyudaAgente({ ruta = null, paginaId = null, onIr }) {
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fin = useRef(null);
  useEffect(() => { fin.current?.scrollIntoView({ block: "nearest" }); }, [msgs, pensando]);
  const clave = paginaId?.startsWith("pdv") ? "pdv" : paginaId?.startsWith("modelos") ? "modelos" : paginaId === "tareas" ? "tareas" : "default";

  async function preguntar(p) {
    const pregunta = (p ?? texto).trim();
    if (!pregunta || pensando) return;
    setTexto("");
    setMsgs((m) => [...m, { rol: "yo", texto: pregunta }]);
    setPensando(true);
    try {
      const r = await api.post("/api/ayuda/preguntar", { pregunta, ruta });
      setMsgs((m) => [...m, { rol: "ayuda", ...r }]);
    } catch (e) {
      setMsgs((m) => [...m, { rol: "ayuda", respuesta: e.message, fuentes: [], modo: "error" }]);
    } finally {
      setPensando(false);
    }
  }

  return (
    <section className="ayuda-agente" aria-label="Agente de ayuda">
      <header>
        <span className="ayuda-agente-dot" aria-hidden="true" />
        <div><strong>Agente de ayuda</strong><span className="muted small">Responde con esta documentación y te dice de dónde sale.</span></div>
      </header>
      <div className="ayuda-agente-log">
        {!msgs.length && (
          <div className="ayuda-sugs">
            {SUGERENCIAS[clave].map((s) => <button key={s} type="button" className="chip" onClick={() => preguntar(s)}>{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => m.rol === "yo" ? <p key={i} className="ayuda-yo">{m.texto}</p> : (
          <div key={i} className={`ayuda-resp ${m.modo}`}>
            <Markdown text={m.respuesta} />
            {m.fuentes?.length > 0 && (
              <p className="ayuda-fuentes">Fuentes: {m.fuentes.map((f, k) => (
                <button key={k} type="button" className="linkish" onClick={() => onIr?.(f.id, f.ancla)}>{f.titulo}{f.seccion && f.seccion !== f.titulo ? ` › ${f.seccion}` : ""}</button>
              ))}</p>
            )}
            {m.modo === "busqueda" && <p className="muted small">Respuesta armada con la búsqueda en la ayuda (sin modelo de IA).</p>}
            {m.modo === "ia" && <p className="muted small">Redactada por {m.modelo} a partir de la ayuda.</p>}
          </div>
        ))}
        {pensando && <p className="thinking">Buscando en la ayuda…</p>}
        <span ref={fin} />
      </div>
      <form className="ayuda-agente-form" onSubmit={(e) => { e.preventDefault(); preguntar(); }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Preguntá cómo se hace algo…" aria-label="Pregunta para el agente de ayuda" maxLength={500} />
        <button className="btn primary small" type="submit" disabled={pensando || !texto.trim()}>Preguntar</button>
      </form>
    </section>
  );
}
