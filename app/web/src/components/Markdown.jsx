import { Marked } from "marked";

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const md = new Marked({ gfm: true, breaks: true });
md.use({
  renderer: {
    // Nunca renderizar HTML crudo que venga en el contenido.
    html(token) { return escapeHtml(typeof token === "string" ? token : token.text); }
  }
});

export function toHtml(text) {
  return md.parse(String(text || ""))
    .replace(/\[([^\[\]<>\n]{2,40})\]/g, '<span class="src">$1</span>')
    // La recomendación es criterio del agente, no un dato: se marca así en toda la Sala.
    .replace(/<p>Recomendación:\s*/g, '<p class="rec"><span class="rec-tag">Recomendación del agente · decide una persona</span>');
}

export default function Markdown({ text, className = "" }) {
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: toHtml(text) }} />;
}
