import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useFetch } from "../live.jsx";
import { fmtUSD, RAZONAMIENTO } from "../format.js";

const NIVEL = { simple: ["Simple", "ok"], media: ["Media", "info"], compleja: ["Compleja", "warn"] };

/**
 * Elección de inteligencia para una tarea o una programación: muestra la complejidad,
 * lo que recomienda el sistema, el flujo de inferencias y el costo estimado.
 */
export default function IAElegir({ agentId, type, instruction, recipients, value, onChange, programada = false }) {
  const { data: op } = useFetch("/api/ia/opciones");
  const [rec, setRec] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    let vivo = true;
    const t = setTimeout(() => {
      api.post("/api/ia/recomendar", { agentId, type, instruction, recipients, ia: value })
        .then((r) => vivo && setRec(r)).catch(() => {});
    }, 450);
    return () => { vivo = false; clearTimeout(t); };
  }, [agentId, type, instruction, recipients, value.perfil, value.flujo]);

  if (!op) return null;
  const perfilRec = op.perfiles.find((p) => p.id === rec?.recomendado.perfil);
  const flujoRec = op.flujos.find((f) => f.id === rec?.recomendado.flujo);
  const [nivel, tono] = NIVEL[rec?.complejidad.nivel] || ["—", "muted"];

  return (
    <fieldset className="field ia-elegir">
      <legend>Inteligencia</legend>
      {rec && (
        <div className="ia-rec">
          <div className="ia-rec-top">
            <span className={`status ${tono}`}><i />Complejidad {nivel.toLowerCase()}</span>
            <button type="button" className="linkish small" onClick={() => setAbierto((x) => !x)} aria-expanded={abierto}>{abierto ? "Ocultar por qué" : "Por qué"}</button>
          </div>
          {abierto && <ul className="ia-senales">{rec.complejidad.senales.map((s) => <li key={s}>{s}</li>)}</ul>}
          <p className="small">
            Recomendado: <strong>{perfilRec?.nombre || rec.recomendado.perfil}</strong> con <strong>{flujoRec?.nombre || rec.recomendado.flujo}</strong>.
          </p>
        </div>
      )}

      <div className="ia-grid">
        <label>Perfil
          <select value={value.perfil} onChange={(e) => onChange({ ...value, perfil: e.target.value })}>
            <option value="auto">Automático{perfilRec ? ` (hoy: ${rec.perfil.nombre})` : ""}</option>
            {op.perfiles.map((p) => <option key={p.id} value={p.id} disabled={!p.listo && p.principal === "Sin modelo"}>{p.nombre}{p.listo ? "" : " · sin clave"}</option>)}
          </select>
        </label>
        <label>Flujo de inferencias
          <select value={value.flujo} onChange={(e) => onChange({ ...value, flujo: e.target.value })}>
            <option value="auto">Automático{flujoRec ? ` (${flujoRec.nombre})` : ""}</option>
            {op.flujos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </label>
      </div>

      {rec && (
        <div className="ia-plan">
          <ol className="ia-pasos">
            {rec.flujo.pasos.map((paso) => {
              const m = paso === "revision" ? rec.revisor : paso === "verificacion" ? null : rec.cadena[0];
              return (
                <li key={paso}>
                  <strong>{{ borrador: "Borrador", revision: "Revisión", correccion: "Corrección (si hace falta)", verificacion: "Verificación de cifras" }[paso]}</strong>
                  <span className="muted small">{paso === "verificacion" ? "Control automático contra los datos, sin costo" : m ? `${m.nombre} · ${m.proveedor}${m.listo ? "" : " · sin clave"}` : "Sin modelo asignado"}</span>
                </li>
              );
            })}
          </ol>
          <p className="small ia-costo">
            Costo estimado: <strong>{fmtUSD(rec.estimacion.costoUSD)}</strong> {programada ? "por ejecución" : ""} · razonamiento {RAZONAMIENTO[rec.perfil.razonamiento]?.toLowerCase() || "—"}
            <span className="muted"> · {rec.origen}</span>
          </p>
          {rec.aviso && <p className="hint">{rec.aviso}</p>}
        </div>
      )}
    </fieldset>
  );
}
