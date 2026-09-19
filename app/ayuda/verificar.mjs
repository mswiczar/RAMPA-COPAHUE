// Control de la documentación. Falla (exit 1) si:
// - una pantalla o pestaña de rutas.json no tiene su página de ayuda,
// - una página apunta a una ruta que no existe, o linkea a una página que no existe,
// - una página no tiene las secciones mínimas.
// Avisa (sin fallar) si un texto en **negrita** que parece un botón no aparece en el código de la app.
// Uso: node ayuda/verificar.mjs   (desde app/)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(DIR, "../web/src");
const { rutas } = JSON.parse(fs.readFileSync(path.join(DIR, "rutas.json"), "utf8"));

const paginas = fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => {
  const txt = fs.readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");
  const meta = Object.fromEntries((txt.match(/^---\n([\s\S]*?)\n---/)?.[1] || "").split("\n").map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  return { id: f.replace(/\.md$/, ""), meta, txt };
});
const ids = new Set(paginas.map((p) => p.id));
const errores = [];
const avisos = [];

for (const r of rutas) if (!paginas.some((p) => p.meta.ruta === r)) errores.push(`Falta la página de ayuda de la ruta «${r}»`);
for (const p of paginas) {
  if (!p.meta.titulo) errores.push(`${p.id}: falta el título`);
  if (!p.meta.resumen) errores.push(`${p.id}: falta el resumen`);
  if (p.meta.ruta && !rutas.includes(p.meta.ruta)) errores.push(`${p.id}: la ruta «${p.meta.ruta}» no está en rutas.json`);
  if (p.meta.ruta && p.meta.ruta !== "modelos/como" && !/^## (Para qué sirve|Qué hay)/m.test(p.txt) && !/^## Para qué/m.test(p.txt)) errores.push(`${p.id}: falta la sección «Para qué sirve»`);
  for (const rel of (p.meta.relacionadas || "").split(",").map((x) => x.trim()).filter(Boolean)) if (!ids.has(rel)) errores.push(`${p.id}: relacionada inexistente «${rel}»`);
  for (const m of p.txt.matchAll(/\(\/ayuda#\/([a-z0-9-]+)/g)) if (!ids.has(m[1])) errores.push(`${p.id}: link a una página inexistente «${m[1]}»`);
  if (p.meta.guia) { try { JSON.parse(p.meta.guia); } catch { errores.push(`${p.id}: la guía no es JSON válido`); } }
}

// Textos de botones: lo que va en negrita y empieza con mayúscula, comparado con el código de la app.
const codigo = fs.readdirSync(WEB, { recursive: true }).filter((f) => /\.(jsx|js)$/.test(f)).map((f) => fs.readFileSync(path.join(WEB, f), "utf8")).join("\n");
const BOTONES = /^(Encargar|Nueva|Nuevo|Revisar|Enviar|Aprobar|Rechazar|Probar|Traer|Guardar|Ejecutar|Editar|Eliminar|Abrir|Pedir|Volver|Ingresar|Salir|\+ )/;
for (const p of paginas) {
  for (const m of p.txt.matchAll(/\*\*([^*]{3,60})\*\*/g)) {
    const t = m[1].trim();
    // Lo que termina en «:» o «.» es una etiqueta de lista, no un botón.
    if (/[:.]$/.test(t)) continue;
    if (BOTONES.test(t) && !codigo.includes(t.replace(/ →$/, ""))) avisos.push(`${p.id}: «${t}» no aparece en el código de la app`);
  }
}

console.log(`Ayuda: ${paginas.length} páginas, ${rutas.length} rutas.`);
for (const a of avisos) console.log(`  aviso: ${a}`);
if (errores.length) {
  for (const e of errores) console.log(`  ERROR: ${e}`);
  process.exit(1);
}
console.log("  Todas las pantallas están documentadas.");
