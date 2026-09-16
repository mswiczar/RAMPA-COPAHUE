import { useEffect, useState } from "react";
import { api } from "../api.js";
import { CRON_PRESETS, describeCron, fmtDate } from "../format.js";

export default function CronField({ id, value, onChange }) {
  const isPreset = CRON_PRESETS.some(([expr]) => expr === value);
  const [custom, setCustom] = useState(!isPreset);
  const [next, setNext] = useState(null);
  const label = describeCron(value);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.get(`/api/cron/preview?expr=${encodeURIComponent(value)}`).then((r) => alive && setNext(r.next)).catch(() => alive && setNext(null));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [value]);

  return (
    <div className="field">
      <label htmlFor={id}>Frecuencia</label>
      <select
        id={id}
        value={custom ? "custom" : value}
        onChange={(e) => {
          if (e.target.value === "custom") setCustom(true);
          else { setCustom(false); onChange(e.target.value); }
        }}
      >
        {CRON_PRESETS.map(([expr, text]) => <option key={expr} value={expr}>{text}</option>)}
        <option value="custom">Personalizada (expresión cron)</option>
      </select>
      {custom && (
        <input
          id={`${id}-expr`} className="mono" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="minuto hora día mes día-semana" aria-label="Expresión cron" spellCheck={false}
        />
      )}
      <p className="hint">
        <code>{value}</code> · {label || "expresión inválida"}
        {next && <> · próxima: {fmtDate(next)}</>}
        {" · hora de Buenos Aires"}
      </p>
    </div>
  );
}
