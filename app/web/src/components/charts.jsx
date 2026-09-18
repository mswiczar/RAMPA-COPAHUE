import { useState } from "react";

// Paleta categórica validada (contraste y daltonismo) sobre fondo blanco.
export const SERIES = ["#0090c2", "#c2571d", "#7a4fd0", "#12a594"];
// Rampa secuencial de un solo tono, del celeste de marca.
export const RAMPA = ["#0077a0", "#0090c2", "#3fb4dc", "#7fcde8", "#b9e4f3"];
const INK = "#0f2e3c";
const MUTED = "#5d7d8c";
const GRID = "#e4f0f7";

export const fmtM = (n, dec = 0) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
export const fmtPct = (n, dec = 1) => `${n > 0 ? "+" : ""}${fmtM(n, dec)}%`;

function useTooltip() {
  const [tip, setTip] = useState(null);
  const node = tip ? (
    <div className="tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }} role="status">
      <strong>{tip.title}</strong>
      {tip.rows.map(([label, value]) => (
        <span key={label}><i>{label}</i>{value}</span>
      ))}
    </div>
  ) : null;
  return [node, setTip];
}

/** Barras mensuales contra una marca de presupuesto. El estado del dato cambia la textura. */
export function BarsVsTarget({ data, unidad = "ARS M", alto = 210, leyenda }) {
  const [tip, setTip] = useTooltip();
  const max = Math.max(...data.map((d) => Math.max(d.valor, d.target))) * 1.12;
  const ancho = 100 / data.length;
  return (
    <figure className="chart">
      <div className="chart-legend">
        {(leyenda || [["sw-solid", "Real conciliado"], ["sw-partial", "Operativo (mes en curso)"], ["sw-fore", "Proyectado"], ["sw-target", "Presupuesto"]]).map(([cls, label]) => (
          <span key={label}><i className={"sw " + cls} />{label}</span>
        ))}
      </div>
      <div className="chart-plot" style={{ height: alto }} onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <line key={g} x1="0" x2="100" y1={alto - alto * g * 0.92} y2={alto - alto * g * 0.92} stroke={GRID} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {data.map((d, i) => {
            const h = (d.valor / max) * alto * 0.92;
            const x = i * ancho + ancho * 0.22;
            const w = ancho * 0.56;
            const ty = alto - (d.target / max) * alto * 0.92;
            return (
              <g key={d.label}>
                <rect x={x} y={alto - h} width={w} height={Math.max(h, 0.5)} rx="1.4" ry="1.4"
                  fill={d.estado === "proyectado" ? "#b9e4f3" : "#0090c2"}
                  opacity={d.estado === "operativo" ? 0.72 : 1} />
                <line x1={x - ancho * 0.06} x2={x + w + ancho * 0.06} y1={ty} y2={ty} stroke={INK} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" />
                <rect x={i * ancho} y="0" width={ancho} height={alto} fill="transparent"
                  onMouseEnter={() => setTip({
                    x: Math.min(86, i * ancho + ancho / 2), y: 4, title: d.label,
                    rows: [["Real", `${fmtM(d.valor)} ${unidad}`], ["Presupuesto", `${fmtM(d.target)} ${unidad}`],
                    ["Desvío", fmtPct(((d.valor - d.target) / d.target) * 100)], ["Dato", d.estadoLabel || d.estado]]
                  })} />
              </g>
            );
          })}
        </svg>
        {tip}
      </div>
      <div className="chart-x">{data.map((d) => <span key={d.label}>{d.label}</span>)}</div>
    </figure>
  );
}

/** Saldo de caja semana a semana, con el mínimo operativo como umbral. */
export function CashLine({ semanas, minimo, alto = 210, unidad = "ARS M" }) {
  const [tip, setTip] = useTooltip();
  const saldos = semanas.map((s) => s.saldo);
  const max = Math.max(...saldos, minimo) * 1.15;
  const min = Math.min(...saldos, minimo, 0) * 1.1;
  const span = max - min || 1;
  const px = (i) => (i / (semanas.length - 1)) * 96 + 2;
  const py = (v) => alto - ((v - min) / span) * (alto - 14) - 7;
  const linea = semanas.map((s, i) => `${i ? "L" : "M"}${px(i)},${py(s.saldo)}`).join(" ");
  const area = `${linea} L${px(semanas.length - 1)},${py(min)} L${px(0)},${py(min)} Z`;
  return (
    <figure className="chart">
      <div className="chart-legend">
        <span><i className="sw sw-line" />Saldo proyectado</span>
        <span><i className="sw sw-threshold" />Mínimo operativo {fmtM(minimo)}</span>
      </div>
      <div className="chart-plot" style={{ height: alto }} onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="cashfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0090c2" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0090c2" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#cashfill)" />
          <line x1="0" x2="100" y1={py(minimo)} y2={py(minimo)} stroke="#d1453b" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <path d={linea} fill="none" stroke="#0090c2" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {semanas.map((s, i) => (
            <g key={s.semana}>
              <circle cx={px(i)} cy={py(s.saldo)} r="1.1" fill={s.saldo < minimo ? "#d1453b" : "#0090c2"} stroke="#fff" strokeWidth="0.6" />
              <rect x={px(i) - 3} y="0" width="6" height={alto} fill="transparent"
                onMouseEnter={() => setTip({
                  x: Math.min(84, px(i)), y: 4, title: `${s.semana} · desde ${s.desde.slice(8)}/${s.desde.slice(5, 7)}`,
                  rows: [["Cobranzas", `${fmtM(s.cobranzas)} ${unidad}`], ["Egresos", `${fmtM(s.egresos)} ${unidad}`], ["Saldo", `${fmtM(s.saldo)} ${unidad}`]]
                })} />
            </g>
          ))}
        </svg>
        {tip}
      </div>
      <div className="chart-x">{semanas.map((s, i) => <span key={s.semana}>{i % 2 === 0 ? s.semana : ""}</span>)}</div>
    </figure>
  );
}

/** Ranking horizontal: magnitud por categoría, con etiqueta directa. */
export function RankBars({ data, unidad = "ARS M", ordinal = false, dec = 0 }) {
  const max = Math.max(...data.map((d) => d.valor)) || 1;
  return (
    <ul className="rank">
      {data.map((d, i) => (
        <li key={d.label}>
          <span className="rank-label">{d.label}</span>
          <span className="rank-track">
            <span className="rank-fill" style={{ width: `${Math.max(2, (d.valor / max) * 100)}%`, background: ordinal ? RAMPA[Math.min(i, RAMPA.length - 1)] : d.color || "#0090c2" }} />
          </span>
          <span className="rank-value">{fmtM(d.valor, dec)}<i>{unidad}</i></span>
          {d.nota && <span className="rank-note">{d.nota}</span>}
        </li>
      ))}
    </ul>
  );
}

// Escala divergente: naranja (debajo), gris neutro en el centro, celeste de marca (arriba).
export const DIVERGENTE = ["#9c4418", "#d9804f", "#f3c6ac", "#e8edf0", "#b9e4f3", "#3fb4dc", "#0077a0"];
// Escala secuencial de un solo tono, de claro a oscuro.
export const SECUENCIAL = ["#e3f4fc", "#b9e4f3", "#7fcde8", "#3fb4dc", "#0090c2", "#0077a0"];

/** Devuelve el paso de la escala según los cortes (cortes.length = colores.length - 1). */
export const escala = (colores, cortes) => (v) => {
  let i = 0;
  while (i < cortes.length && v >= cortes[i]) i++;
  return colores[i];
};
const OSCUROS = new Set(["#9c4418", "#0077a0", "#0090c2", "#3fb4dc", "#d9804f"]);

/**
 * Tabla de calor: filas × columnas, cada celda coloreada por su valor.
 * Es una tabla de verdad (se lee sin color) y al pasar o enfocar una celda
 * muestra el detalle en la barra de abajo.
 */
export function Heatmap({ filas, columnas, celda, color, leyenda, formato = (v) => fmtM(v), vacio = "No listado", resaltarColumna, caption }) {
  const [foco, setFoco] = useState(null);
  const vigente = foco && filas[foco.i] && columnas[foco.j] ? foco : null;
  const detalle = vigente ? celda(filas[vigente.i], columnas[vigente.j], vigente.i, vigente.j) : null;
  return (
    <figure className="heat">
      {leyenda && (
        <div className="chart-legend heat-legend">
          {leyenda.map(([c, label]) => <span key={label}><i className="sw" style={{ background: c, border: c === "vacio" ? "1px dashed var(--faint)" : undefined, ...(c === "vacio" ? { background: "repeating-linear-gradient(45deg, #fff 0 3px, #e8edf0 3px 5px)" } : {}) }} />{label}</span>)}
        </div>
      )}
      <div className="table-wrap heat-wrap" onMouseLeave={() => setFoco(null)}>
        <table className="heat-table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              <th scope="col" />
              {columnas.map((c, j) => <th key={c.id} scope="col" className={resaltarColumna === j ? "en-curso" : ""}>{c.label}{c.sub && <span className="cell-sub">{c.sub}</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.id}>
                <th scope="row">{f.label}{f.sub && <span className="cell-sub">{f.sub}</span>}</th>
                {columnas.map((c, j) => {
                  const d = celda(f, c, i, j);
                  const bg = d.valor === null || d.valor === undefined ? null : color(d.valor, d);
                  const activo = vigente && vigente.i === i && vigente.j === j;
                  return (
                    <td key={c.id} tabIndex={0}
                      className={`${bg ? "" : "vacio"} ${activo ? "activo" : ""} ${resaltarColumna === j ? "en-curso" : ""}`}
                      style={bg ? { background: bg, color: OSCUROS.has(bg) ? "#fff" : "#0f2e3c" } : undefined}
                      onMouseEnter={() => setFoco({ i, j })} onFocus={() => setFoco({ i, j })}>
                      {bg ? (d.texto ?? formato(d.valor)) : <span aria-label={vacio}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="heat-detail" aria-live="polite">
        {detalle
          ? <><strong>{filas[vigente.i].label} · {columnas[vigente.j].label}</strong>{(detalle.tip || [["Valor", detalle.valor === null ? vacio : detalle.texto ?? formato(detalle.valor)]]).map(([k, v]) => <span key={k}><i>{k}</i>{v}</span>)}</>
          : <span className="muted">Pasá el mouse o tocá una celda para ver el detalle.</span>}
      </figcaption>
    </figure>
  );
}

/** Líneas para pocas series (hasta 4) en un eje común, con etiqueta directa al final. */
export function Lineas({ etiquetas, series, unidad = "%", alto = 220 }) {
  const [tip, setTip] = useTooltip();
  const todos = series.flatMap((s) => s.valores);
  const max = Math.max(...todos) * 1.1;
  const min = Math.min(0, Math.min(...todos));
  const px = (i) => (i / (etiquetas.length - 1)) * 84 + 3;
  const py = (v) => alto - ((v - min) / (max - min)) * (alto - 16) - 8;
  return (
    <figure className="chart">
      <div className="chart-legend">
        {series.map((s, k) => <span key={s.label}><i className="sw" style={{ background: SERIES[k] }} />{s.label}</span>)}
      </div>
      <div className="chart-plot" style={{ height: alto }} onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
          {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1="0" x2="100" y1={py(max * g / 1.1)} y2={py(max * g / 1.1)} stroke={GRID} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {series.map((s, k) => (
            <path key={s.label} d={s.valores.map((v, i) => `${i ? "L" : "M"}${px(i)},${py(v)}`).join(" ")} fill="none" stroke={SERIES[k]} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ))}
          {etiquetas.map((e, i) => (
            <rect key={e} x={px(i) - 4} y="0" width="8" height={alto} fill="transparent"
              onMouseEnter={() => setTip({ x: Math.min(80, px(i)), y: 2, title: e, rows: series.map((s) => [s.label, `${fmtM(s.valores[i], 1)}${unidad}`]) })} />
          ))}
        </svg>
        <div className="line-labels">
          {series.map((s, k) => <span key={s.label} style={{ top: `${(py(s.valores.at(-1)) / alto) * 100}%` }}><i style={{ background: SERIES[k] }} />{fmtM(s.valores.at(-1), 1)}{unidad}</span>)}
        </div>
        {tip}
      </div>
      <div className="chart-x" style={{ paddingRight: "13%" }}>{etiquetas.map((e) => <span key={e}>{e}</span>)}</div>
    </figure>
  );
}

/** Puente: qué explica la diferencia entre dos totales. */
export function Waterfall({ desde, pasos, hasta, unidad = "ARS M", alto = 190 }) {
  const [tip, setTip] = useTooltip();
  const puntos = [{ label: desde.label, valor: desde.valor, tipo: "total" },
    ...pasos.map((p) => ({ ...p, tipo: "paso" })),
    { label: hasta.label, valor: hasta.valor, tipo: "total" }];
  let acum = desde.valor;
  const barras = puntos.map((p) => {
    if (p.tipo === "total") return { ...p, base: 0, alto: p.valor, final: p.valor };
    const base = p.valor >= 0 ? acum : acum + p.valor;
    const res = { ...p, base, alto: Math.abs(p.valor), final: acum + p.valor };
    acum += p.valor;
    return res;
  });
  const max = Math.max(...barras.map((b) => b.base + b.alto)) * 1.1;
  const ancho = 100 / barras.length;
  return (
    <figure className="chart">
      <div className="chart-plot" style={{ height: alto }} onMouseLeave={() => setTip(null)}>
        <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
          {barras.map((b, i) => {
            const h = (b.alto / max) * (alto - 10);
            const y = alto - ((b.base + b.alto) / max) * (alto - 10);
            const fill = b.tipo === "total" ? "#0f2e3c" : b.valor >= 0 ? "#12a594" : "#c2571d";
            return (
              <g key={b.label + i}>
                <rect x={i * ancho + ancho * 0.2} y={y} width={ancho * 0.6} height={Math.max(h, 1)} rx="1.4" fill={fill} />
                <rect x={i * ancho} y="0" width={ancho} height={alto} fill="transparent"
                  onMouseEnter={() => setTip({
                    x: Math.min(82, i * ancho + ancho / 2), y: 2, title: b.label,
                    rows: [[b.tipo === "total" ? "Total" : "Impacto", `${b.valor > 0 && b.tipo === "paso" ? "+" : ""}${fmtM(b.valor, 1)} ${unidad}`]]
                  })} />
              </g>
            );
          })}
        </svg>
        {tip}
      </div>
      <div className="chart-x">{barras.map((b, i) => <span key={b.label + i}>{b.label}</span>)}</div>
    </figure>
  );
}
