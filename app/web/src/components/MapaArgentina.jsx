import { useMemo, useState } from "react";
import { useFetch } from "../live.jsx";
import { fmtM } from "./charts.jsx";

// Rampa secuencial de un solo tono: claro = menos, oscuro = más.
const RAMPA = ["#d6ecf6", "#a5d8ec", "#5cbbdf", "#1c9fcd", "#0b6d92"];
const SIN_DATO = "#eef2f5";

// Mercator: conserva la forma de las provincias, que es lo que se reconoce de un mapa.
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

export default function MapaArgentina({ valores, unidad = "", titulo, nota, formato = (v) => fmtM(v) }) {
  const { data: geo } = useFetch("/api/geo/provincias");
  const [hover, setHover] = useState(null);

  const porZona = useMemo(() => Object.fromEntries(valores.map((v) => [v.zona, v])), [valores]);
  // Escala por cuantiles: con una zona muy grande (AMBA), una escala lineal deja al resto indistinguible.
  const escala = useMemo(() => {
    const nums = valores.map((v) => v.valor).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    if (!nums.length) return { min: 0, max: 0, color: () => SIN_DATO };
    const cuantil = (p) => nums[Math.min(nums.length - 1, Math.floor(p * nums.length))];
    const cortes = [0.2, 0.4, 0.6, 0.8].map(cuantil);
    return {
      min: nums[0], max: nums[nums.length - 1], cortes,
      color: (v) => (Number.isFinite(v) ? RAMPA[cortes.filter((c) => v > c).length] : SIN_DATO)
    };
  }, [valores]);

  const proyectado = useMemo(() => {
    if (!geo) return null;
    const [x0, y0, x1, y1] = geo.bbox;
    const rad = (g) => (g * Math.PI) / 180;
    const norte = mercY(y1), sur = mercY(y0);          // en Mercator, el norte queda arriba
    const altoRad = norte - sur;
    const anchoRad = rad(x1) - rad(x0);
    const ancho = 100;
    const alto = (ancho * altoRad) / anchoRad;
    const px = (lon) => ((rad(lon) - rad(x0)) / anchoRad) * ancho;
    const py = (lat) => ((norte - mercY(lat)) / altoRad) * alto;
    const paths = geo.features.map((f) => {
      const polis = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const d = polis.map((poli) => poli.map((anillo) => anillo.map(([lon, lat], i) => `${i ? "L" : "M"}${px(lon).toFixed(2)},${py(lat).toFixed(2)}`).join(" ") + " Z").join(" ")).join(" ");
      // Las provincias muy chicas (CABA) se marcan además con un punto, si no no se ven.
      const pts = polis.flat(1).flat();
      const cx = pts.reduce((a, p) => a + px(p[0]), 0) / pts.length;
      const cy = pts.reduce((a, p) => a + py(p[1]), 0) / pts.length;
      const lados = pts.reduce((b, p) => [Math.min(b[0], px(p[0])), Math.min(b[1], py(p[1])), Math.max(b[2], px(p[0])), Math.max(b[3], py(p[1]))], [999, 999, -999, -999]);
      const diminuta = (lados[2] - lados[0]) * (lados[3] - lados[1]) < 4;
      return { ...f.properties, d, cx, cy, diminuta };
    });
    return { paths, alto, ancho };
  }, [geo]);

  if (!geo || !proyectado) return <p className="thinking">Cargando el mapa…</p>;

  const activo = hover && porZona[hover.zona];

  return (
    <figure className="mapa">
      {titulo && <figcaption className="sub">{titulo}</figcaption>}
      <div className="mapa-cuerpo">
        <div className="mapa-plot">
          <svg viewBox={`0 0 ${proyectado.ancho} ${proyectado.alto}`} role="img" aria-label={`Mapa de Argentina por provincia: ${titulo || ""}`}>
            {proyectado.paths.map((p) => {
              const dato = porZona[p.zona];
              return (
                <path
                  key={p.nombre} d={p.d}
                  fill={escala.color(dato?.valor)}
                  stroke="#fff" strokeWidth="0.25" vectorEffect="non-scaling-stroke"
                  className={hover?.nombre === p.nombre ? "on" : hover && hover.zona === p.zona ? "zona" : ""}
                  onMouseEnter={() => setHover(p)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{p.nombre} · {p.zona}{dato ? ` · ${formato(dato.valor)} ${unidad}` : " · sin datos"}</title>
                </path>
              );
            })}
            {proyectado.paths.filter((p) => p.diminuta).map((p) => (
              <g key={`pt-${p.nombre}`} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}>
                <circle cx={p.cx} cy={p.cy} r="2" fill={escala.color(porZona[p.zona]?.valor)} stroke="#fff" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                <title>{p.nombre} · {p.zona}</title>
              </g>
            ))}
          </svg>
          {activo && (
            <div className="mapa-tip">
              <strong>{hover.nombre}</strong>
              <span><i>Zona</i>{activo.zona}</span>
              <span><i>{activo.etiqueta || "Valor"}</i>{formato(activo.valor)} {unidad}</span>
              {activo.detalle && <span className="det">{activo.detalle}</span>}
            </div>
          )}
        </div>

        <div className="mapa-lado">
          <ul className="mapa-lista">
            {[...valores].sort((a, b) => b.valor - a.valor).map((v) => (
              <li key={v.zona} className={hover?.zona === v.zona ? "on" : ""} onMouseEnter={() => setHover({ zona: v.zona, nombre: v.zona })} onMouseLeave={() => setHover(null)}>
                <span className="sw" style={{ background: escala.color(v.valor) }} />
                <span className="mapa-zona">{v.zona}</span>
                <span className="num">{formato(v.valor)}<i>{unidad}</i></span>
              </li>
            ))}
          </ul>
          <div className="mapa-escala" aria-hidden="true">
            <span>{formato(escala.min)}</span>
            <span className="barras">{RAMPA.map((c) => <i key={c} style={{ background: c }} />)}</span>
            <span>{formato(escala.max)}</span>
          </div>
        </div>
      </div>
      <figcaption className="muted small">{nota ? `${nota} · ` : ""}Provincias: {geo.fuente}</figcaption>
    </figure>
  );
}
