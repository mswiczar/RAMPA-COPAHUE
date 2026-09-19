import { useState } from "react";
import { api } from "../api.js";
import { TYPES } from "../format.js";
import CronField from "./CronField.jsx";
import IAElegir from "./IAElegir.jsx";
import { useSesion } from "../live.jsx";

const HINTS = {
  reporte: "Ej.: Reporte de sell-out por zona con foco en AMBA.",
  investigacion: "Ej.: Investigá por qué cae el share en NOA.",
  email: "Ej.: Avisale a Comercial que FPS50 tiene quiebre en 23 farmacias online.",
  accion: "Ej.: Postergar el lote de 8.000 u de Crema Corporal."
};

/** Encargar una tarea ahora o dejarla programada. También se usa para editar programaciones. */
export default function TaskForm({ agents, agentId, initial, mode = "task", onDone, onCancel }) {
  const { permisos } = useSesion();
  const [form, setForm] = useState(() => ({
    agentId: initial?.agentId || agentId || agents.find((a) => a.id !== "ceo")?.id || agents[0]?.id,
    type: initial?.type || "reporte",
    name: initial?.name || "",
    instruction: initial?.instruction || "",
    recipients: (initial?.recipients || []).join(", "),
    when: mode === "schedule" ? "programar" : "ahora",
    cron: initial?.cron || "0 8 * * 1",
    requiresApproval: initial?.requiresApproval ?? true,
    ia: { perfil: initial?.ia?.perfil || "auto", flujo: initial?.ia?.flujo || "auto" }
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const scheduling = form.when === "programar";
  const showRecipients = form.type !== "accion";

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      agentId: form.agentId, type: form.type, instruction: form.instruction,
      recipients: showRecipients ? form.recipients : "", requiresApproval: form.requiresApproval,
      ia: form.ia
    };
    try {
      if (scheduling) {
        const payload = { ...body, name: form.name || form.instruction.slice(0, 60), cron: form.cron };
        const s = initial?.id ? await api.patch(`/api/schedules/${initial.id}`, payload) : await api.post("/api/schedules", payload);
        setDone(`Programación guardada: ${s.name}`);
      } else {
        const t = await api.post("/api/tasks", { ...body, title: form.name });
        setDone(`Tarea creada: ${t.title}`);
        setForm((f) => ({ ...f, name: "", instruction: "" }));
      }
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {!agentId && (
        <div className="field">
          <label htmlFor="tf-agent">Agente</label>
          <select id="tf-agent" value={form.agentId} onChange={set("agentId")}>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.id === "ceo" ? "CEO · Centro de decisión" : a.name}</option>)}
          </select>
        </div>
      )}

      <fieldset className="field">
        <legend>Qué tiene que hacer</legend>
        <div className="segmented">
          {Object.entries(TYPES).map(([id, label]) => (
            <label key={id} className={form.type === id ? "on" : ""}>
              <input type="radio" name="tf-type" value={id} checked={form.type === id} onChange={set("type")} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="tf-name">Título <span className="opt">(opcional)</span></label>
        <input id="tf-name" value={form.name} onChange={set("name")} placeholder="Se completa solo si lo dejás vacío" />
      </div>

      <div className="field">
        <label htmlFor="tf-instruction">Instrucción</label>
        <textarea id="tf-instruction" rows={3} value={form.instruction} onChange={set("instruction")} placeholder={HINTS[form.type]} required />
      </div>

      {showRecipients && (
        <div className="field">
          <label htmlFor="tf-recipients">Enviar por mail a <span className="opt">{form.type === "email" ? "(si lo dejás vacío va a Dirección)" : "(opcional)"}</span></label>
          <input id="tf-recipients" value={form.recipients} onChange={set("recipients")} placeholder="direccion@copahue.demo, comercial@copahue.demo" />
        </div>
      )}

      {mode === "task" && (
        <fieldset className="field">
          <legend>Cuándo</legend>
          <div className="segmented">
            {[["ahora", "Ahora"], ...(permisos.programar ? [["programar", "Programar (cron)"]] : [])].map(([id, label]) => (
              <label key={id} className={form.when === id ? "on" : ""}>
                <input type="radio" name="tf-when" value={id} checked={form.when === id} onChange={set("when")} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {scheduling && <CronField id="tf-cron" value={form.cron} onChange={set("cron")} />}

      <IAElegir
        agentId={form.agentId} type={form.type} instruction={form.instruction}
        recipients={showRecipients ? form.recipients : ""} programada={scheduling}
        value={form.ia} onChange={(ia) => setForm((f) => ({ ...f, ia }))}
      />

      {(form.type === "email" || form.recipients.trim()) && showRecipients && (
        <label className="check">
          <input type="checkbox" checked={form.requiresApproval} onChange={set("requiresApproval")} />
          Pedir aprobación de Dirección antes de enviar el mail
        </label>
      )}
      {form.type === "accion" && <p className="hint">Las acciones siempre esperan la aprobación de Dirección.</p>}

      {error && <p className="form-error" role="alert">{error}</p>}
      {done && !error && <p className="form-ok" role="status">{done}</p>}

      <div className="actions">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Guardando…" : scheduling ? (initial?.id ? "Guardar cambios" : "Crear programación") : "Encargar ahora"}
        </button>
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}
