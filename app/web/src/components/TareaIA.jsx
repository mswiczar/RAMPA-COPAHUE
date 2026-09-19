import { useState } from "react";
import { api } from "../api.js";
import { useFetch } from "../live.jsx";
import { fmtUSD, fmtTokens, PASOS } from "../format.js";
import Markdown from "./Markdown.jsx";

const ESTADO = { ok: ["ok", "Hecho"], respaldo: ["warn", "Respaldo"], error: ["crit", "Falló"], simulado: ["muted", "Simulado"], omitido: ["muted", "Omitido"], alerta: ["warn", "Con alertas"] };

/** Qué inteligencia hizo la tarea: perfil, flujo, cada inferencia, tokens y costo. */
export function InferenciasTarea({ task: t }) {
  const r = t.ia;
  if (!r?.modo) {
    if (["pendiente", "en_curso"].includes(t.status)) return <p className="muted small">Resolviendo qué modelo usar…</p>;
    return null;
  }
  return (
    <div className="ia-tarea">
      <span className="eyebrow">Inteligencia</span>
      <p className="small">
        <strong>{r.perfilNombre}</strong> · {r.flujoNombre} · complejidad {r.complejidad?.nivel}
        <span className="muted"> · {r.origen}</span>
      </p>
      {r.modo !== "real" && <p className="hint">Sin modelo de IA: {r.motivo}. El resultado lo armó el sistema de reglas y el flujo quedó simulado. Costo estimado si hubiera corrido: {fmtUSD(r.costoEstimadoUSD || 0)}.</p>}
      <ol className="ia-inferencias">
        {(t.inferencias || []).map((i, k) => {
          const [tono, label] = ESTADO[i.estado] || ["muted", i.estado];
          return (
            <li key={k}>
              <span className="ia-paso">{PASOS[i.paso] || i.paso}</span>
              <span className="ia-modelo">{i.modelo}{i.proveedor && i.proveedor !== "—" && i.proveedor !== "Sistema" ? <span className="muted"> · {i.proveedor}</span> : null}</span>
              <span className={`status ${tono}`}><i />{label}</span>
              <span className="ia-num">{i.tokensIn || i.tokensOut ? `${fmtTokens(i.tokensIn)} → ${fmtTokens(i.tokensOut)}` : ""}</span>
              <span className="ia-num">{i.costoUSD ? fmtUSD(i.costoUSD) : ""}</span>
              <span className="ia-num">{i.ms ? `${(i.ms / 1000).toFixed(1)} s` : ""}</span>
              {i.detalle && <span className="ia-detalle">{i.detalle}</span>}
            </li>
          );
        })}
      </ol>
      {r.modo === "real" && <p className="small"><strong>Total {fmtUSD(r.costoUSD)}</strong> · {fmtTokens(r.tokens)} tokens · {(r.ms / 1000).toFixed(1)} s <span className="muted">· estimado antes de correr: {fmtUSD(r.costoEstimadoUSD)}</span></p>}
    </div>
  );
}

const VEREDICTO = { aprobado: "ok", "sin observaciones": "ok", observado: "warn", rechazado: "crit", error: "crit", simulado: "muted" };

/** Segunda opinión (mismo pedido, otro modelo) o auditoría cruzada (otro agente revisa el resultado). */
export function Contraste({ task: t, agents }) {
  const { data: op } = useFetch("/api/ia/opciones");
  const [modo, setModo] = useState("auditar");
  const [agentId, setAgentId] = useState(agents.find((a) => a.id !== t.agentId && a.id !== "ceo")?.id || "");
  const [perfil, setPerfil] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const listo = ["completada", "esperando_aprobacion", "rechazada"].includes(t.status);

  async function pedir() {
    setBusy(true);
    setError(null);
    try { await api.post(`/api/tasks/${t.id}/contraste`, { modo, agentId, perfil }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="contraste">
      <span className="eyebrow">Contrastar el resultado</span>
      {listo ? (
        <div className="contraste-form">
          <div className="segmented">
            {[["auditar", "Que lo audite otro agente"], ["mismo_pedido", "Mismo pedido a otro modelo"]].map(([id, label]) => (
              <label key={id} className={modo === id ? "on" : ""}><input type="radio" name={`ctr-${t.id}`} value={id} checked={modo === id} onChange={() => setModo(id)} />{label}</label>
            ))}
          </div>
          {modo === "auditar" && (
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agente que audita">
              {agents.filter((a) => a.id !== t.agentId).map((a) => <option key={a.id} value={a.id}>{a.id === "ceo" ? "CEO" : a.name}</option>)}
            </select>
          )}
          <select value={perfil} onChange={(e) => setPerfil(e.target.value)} aria-label="Perfil">
            <option value="auto">Perfil automático</option>
            {(op?.perfiles || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.listo ? "" : " · sin clave"}</option>)}
          </select>
          <button className="btn small" type="button" disabled={busy} onClick={pedir}>{busy ? "Enviando…" : modo === "auditar" ? "Pedir auditoría" : "Pedir segunda opinión"}</button>
        </div>
      ) : <p className="muted small">Se puede contrastar cuando la tarea tenga resultado.</p>}
      {error && <p className="form-error small">{error}</p>}

      {(t.contrastes || []).map((c) => {
        const v = c.resultado?.veredicto || (c.estado === "en_curso" ? "en curso" : "—");
        const tono = c.estado === "en_curso" ? "live" : VEREDICTO[v] || (String(v).startsWith("Mejor") ? "info" : "muted");
        return (
          <article key={c.id} className="contraste-item">
            <header>
              <strong>{c.modo === "auditar" ? `Auditoría del ${c.auditor?.nombre}` : "Segunda opinión"}</strong>
              <span className={`status ${tono}`}><i />{v}</span>
              <span className="muted small">{c.perfil} · pedido por {c.pedidoPor}{c.costoUSD ? ` · ${fmtUSD(c.costoUSD)}` : ""}{c.simulado ? " · simulado, sin modelo" : ""}</span>
            </header>
            {c.resultado?.resumen && <p className="small">{c.resultado.resumen}</p>}
            {c.resultado?.impacto && <p className="small"><strong>Impacto en su área:</strong> {c.resultado.impacto}</p>}
            {c.resultado?.problemas?.length > 0 && (
              <ul className="alert-list">{c.resultado.problemas.map((p, i) => <li key={i} className="warn"><i aria-hidden="true" /><span><strong>{p.tipo}</strong> · {p.detalle}</span></li>)}</ul>
            )}
            {c.resultado?.diferencias?.length > 0 && (
              <ul className="alert-list">{c.resultado.diferencias.map((d, i) => <li key={i} className="info"><i aria-hidden="true" /><span><strong>{d.tema}</strong> · A: {d.a} · B: {d.b}{d.correcta ? ` · correcta: ${d.correcta}` : ""}</span></li>)}</ul>
            )}
            {c.resultado?.cifras?.soloA && (c.resultado.cifras.soloA.length > 0 || c.resultado.cifras.soloB.length > 0) && (
              <p className="muted small">Cifras solo en A: {c.resultado.cifras.soloA.join(", ") || "—"} · solo en B: {c.resultado.cifras.soloB.join(", ") || "—"} · en común: {c.resultado.cifras.comunes}</p>
            )}
            {c.textoB && (
              <>
                <button type="button" className="linkish small" onClick={() => setAbierto(abierto === c.id ? null : c.id)}>{abierto === c.id ? "Ocultar" : "Ver las dos respuestas lado a lado"}</button>
                {abierto === c.id && (
                  <div className="lado-a-lado">
                    <div><span className="eyebrow">A · original</span><Markdown text={c.textoA} /></div>
                    <div><span className="eyebrow">B · {c.perfil}</span><Markdown text={c.textoB} /></div>
                  </div>
                )}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
