// Llamada a un modelo con el formato de OpenAI (chat/completions).
// Sirve para DigitalOcean, DeepSeek, OpenRouter, Gemini, xAI y servidores propios.
import { proveedor, clave, costo } from "./catalogo.js";

const TIMEOUT_MS = Number(process.env.IA_TIMEOUT_MS || 120000);

export class ErrorIA extends Error {
  constructor(message, { status = null, reintentar = false } = {}) {
    super(message);
    this.status = status;
    this.reintentar = reintentar;
  }
}

/**
 * Devuelve { texto, razonamiento, tokensIn, tokensOut, tokensRazonamiento, costoUSD, ms }.
 * razonamiento: "none" | "low" | "medium" | "high" (se manda solo si el modelo razona).
 */
export async function completar(m, mensajes, { razonamiento = "none", maxTokens = 4000, json = false } = {}) {
  const p = proveedor(m.proveedor);
  const headers = { "Content-Type": "application/json" };
  const k = clave(p);
  if (k) headers.Authorization = `Bearer ${k}`;
  if (p.id === "openrouter") { headers["HTTP-Referer"] = "https://copahue.moshito.work"; headers["X-Title"] = "Sala 24/7"; }

  const body = { model: m.modelo, messages: mensajes, max_tokens: maxTokens };
  if (m.razona && razonamiento !== "none") body.reasoning_effort = razonamiento;
  if (json) body.response_format = { type: "json_object" };

  const inicio = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${p.baseUrl}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    throw new ErrorIA(e.name === "AbortError" ? `${p.nombre} no respondió en ${TIMEOUT_MS / 1000} s` : `No se pudo conectar con ${p.nombre}`, { reintentar: true });
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Nunca se devuelve el cuerpo completo: puede traer datos de la cuenta.
    const msg = String(data?.error?.message || data?.message || `Error ${res.status}`).slice(0, 200);
    throw new ErrorIA(`${p.nombre}: ${msg}`, { status: res.status, reintentar: res.status === 429 || res.status >= 500 });
  }
  const msg = data.choices?.[0]?.message || {};
  const u = data.usage || {};
  const tokensIn = u.prompt_tokens ?? 0;
  const tokensOut = u.completion_tokens ?? 0;
  return {
    texto: String(msg.content || "").trim(),
    razonamiento: msg.reasoning_content || null,
    tokensIn, tokensOut,
    tokensRazonamiento: u.completion_tokens_details?.reasoning_tokens ?? 0,
    costoUSD: costo(m, tokensIn, tokensOut),
    ms: Date.now() - inicio
  };
}

/** Lista los modelos que ofrece el proveedor (GET /models). */
export async function listarModelos(p) {
  const headers = {};
  const k = clave(p);
  if (k) headers.Authorization = `Bearer ${k}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${p.baseUrl}/models`, { headers, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ErrorIA(`${p.nombre}: ${String(data?.error?.message || `Error ${res.status}`).slice(0, 200)}`, { status: res.status });
    return (data.data || data.models || []).map((x) => ({
      id: x.id || x.name,
      nombre: x.name || x.id,
      contexto: x.context_length || null,
      // OpenRouter informa precio por token; se pasa a USD por millón.
      entrada: x.pricing?.prompt != null ? Number(x.pricing.prompt) * 1e6 : null,
      salida: x.pricing?.completion != null ? Number(x.pricing.completion) * 1e6 : null
    })).filter((x) => x.id);
  } catch (e) {
    if (e instanceof ErrorIA) throw e;
    throw new ErrorIA(`No se pudo conectar con ${p.nombre}`);
  } finally {
    clearTimeout(timer);
  }
}
