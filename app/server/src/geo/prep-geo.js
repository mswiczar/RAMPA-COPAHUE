// Simplifica las provincias argentinas de Natural Earth para dibujarlas en el tablero.
const fs = require("node:fs");
const src = JSON.parse(fs.readFileSync("/tmp/ne10.json", "utf8"));

const ZONAS = {
  "Buenos Aires": "AMBA", "Ciudad de Buenos Aires": "AMBA",
  "Córdoba": "Córdoba", "Santa Fe": "Santa Fe",
  "Entre Ríos": "Litoral", "Corrientes": "Litoral", "Misiones": "Litoral", "Chaco": "Litoral", "Formosa": "Litoral",
  "Mendoza": "Cuyo", "San Juan": "Cuyo", "San Luis": "Cuyo",
  "Salta": "NOA", "Jujuy": "NOA", "Tucumán": "NOA", "Catamarca": "NOA", "La Rioja": "NOA", "Santiago del Estero": "NOA",
  "Neuquén": "Patagonia", "Río Negro": "Patagonia", "Chubut": "Patagonia", "Santa Cruz": "Patagonia",
  "Tierra del Fuego": "Patagonia", "La Pampa": "Patagonia"
};

// Ramer-Douglas-Peucker sobre coordenadas en grados.
function rdp(puntos, tol) {
  if (puntos.length < 3) return puntos;
  let maxD = 0, idx = 0;
  const [ax, ay] = puntos[0], [bx, by] = puntos[puntos.length - 1];
  for (let i = 1; i < puntos.length - 1; i++) {
    const [px, py] = puntos[i];
    const dx = bx - ax, dy = by - ay;
    const den = Math.hypot(dx, dy) || 1e-9;
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / den;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [puntos[0], puntos[puntos.length - 1]];
  return [...rdp(puntos.slice(0, idx + 1), tol).slice(0, -1), ...rdp(puntos.slice(idx), tol)];
}

const areaAnillo = (r) => Math.abs(r.reduce((a, [x, y], i) => {
  const [x2, y2] = r[(i + 1) % r.length];
  return a + (x * y2 - x2 * y);
}, 0) / 2);

const redondear = (r) => r.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);

// Solo territorio continental e islas grandes; se descarta el sector antártico reclamado.
const enRango = (r) => r.every(([x, y]) => x > -76 && x < -52 && y > -56.5 && y < -21);

// RDP no sirve directo en un anillo cerrado: se parte en dos cadenas abiertas y se simplifica cada una.
function simplificarAnillo(anillo, tol) {
  const abierto = anillo.slice(0, -1);
  let lejos = 1, maxD = -1;
  const [ax, ay] = abierto[0];
  for (let i = 1; i < abierto.length; i++) {
    const d = Math.hypot(abierto[i][0] - ax, abierto[i][1] - ay);
    if (d > maxD) { maxD = d; lejos = i; }
  }
  const a = rdp(abierto.slice(0, lejos + 1), tol);
  const b = rdp(abierto.slice(lejos), tol);
  const salida = [...a.slice(0, -1), ...b];
  return [...salida, salida[0]];
}

function simplificar(geom, tol = 0.035) {
  const polis = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const salida = [];
  for (const poli of polis) {
    const exterior = poli[0];
    if (!enRango(exterior) || areaAnillo(exterior) < 0.004) continue;
    const anillo = redondear(simplificarAnillo(exterior, tol));
    if (anillo.length > 3) salida.push([anillo]);
  }
  if (!salida.length) return null;
  return salida.length === 1 ? { type: "Polygon", coordinates: salida[0] } : { type: "MultiPolygon", coordinates: salida };
}

const features = [];
let puntos = 0;
for (const f of src.features.filter((x) => x.properties.admin === "Argentina")) {
  const nombre = f.properties.name;
  const geometry = simplificar(f.geometry);
  if (!geometry) { console.warn("sin geometría:", nombre); continue; }
  const anillos = geometry.type === "Polygon" ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0]);
  puntos += anillos.reduce((a, r) => a + r.length, 0);
  features.push({
    type: "Feature",
    properties: { nombre, zona: ZONAS[nombre] || "Sin asignar", iso: f.properties.iso_3166_2 },
    geometry
  });
}

const bbox = features.flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0])))
  .flat().reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);

const out = {
  fuente: "Natural Earth 1:10m Admin 1 (dominio público) · nvkelso/natural-earth-vector",
  descargado: new Date().toISOString().slice(0, 10),
  bbox,
  type: "FeatureCollection",
  features
};
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log("provincias:", features.length, "· puntos:", puntos, "· KB:", Math.round(fs.statSync(process.argv[2]).size / 1024));
console.log("bbox:", bbox.map((n) => n.toFixed(2)).join(", "));
console.log("zonas:", [...new Set(features.map((f) => f.properties.zona))].join(", "));
