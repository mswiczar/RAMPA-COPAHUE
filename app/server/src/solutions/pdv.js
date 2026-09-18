// Auditoría de punto de venta: misiones de relevamiento en góndola hechas por una red
// distribuida de relevadores, con reconocimiento de imágenes sobre las fotos.
// DATOS SIMULADOS, consistentes con Comercial (oportunidades) y Operaciones (quiebres).
import { PRODUCTOS } from "./operaciones.js";

export const HOY = "2026-09-17";
const r1 = (n) => Math.round(n * 10) / 10;
const n = (v, dec = 0) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);

/** Precios de referencia del proveedor, sin impuestos. Cada operativo se cotiza. */
export const MODALIDADES = [
  { id: "control", label: "Control de productos", detalle: "SKUs puntuales: disponibilidad, precio en góndola y foto de evidencia. Tablero básico incluido.", fee: 750, pro: 1000, recompensaSugerida: 2500 },
  { id: "categoria", label: "Inteligencia de categoría", detalle: "Góndola completa: presencia, facings, share of shelf, precios y competidores, comparable entre cadenas, zonas y períodos.", fee: 5000, pro: 0, recompensaSugerida: 2500 },
  { id: "medida", label: "Operativo a medida", detalle: "Relevamiento diseñado para una necesidad puntual, por ejemplo material POP o una activación. Se cotiza aparte.", fee: null, pro: 0, recompensaSugerida: 3500 }
];

export const SALDO_CARGADO = 2000000; // ARS

export const CADENAS = [
  { id: "norte", label: "Cadena Norte", zona: "AMBA", sucursales: 38 },
  { id: "sur", label: "Cadena Sur", zona: "AMBA", sucursales: 24 },
  { id: "centro", label: "Cadena Centro", zona: "Córdoba", sucursales: 18 },
  { id: "mediterranea", label: "Cadena Mediterránea", zona: "Córdoba", sucursales: 12 },
  { id: "rosario", label: "Cadena Rosario", zona: "Santa Fe", sucursales: 14 },
  { id: "patagonica", label: "Cadena Patagónica", zona: "Patagonia", sucursales: 16 },
  { id: "indep", label: "Farmacias independientes", zona: "Varias", sucursales: null }
];

const SKUS = PRODUCTOS.map((p) => ({ id: p.id, label: p.label }));

/** Precio de venta sugerido por SKU, en ARS. */
export const PVP = { fps50: 18900, corporal: 12400, emulsion: 24600, manos: 8900, pies: 10200, gel: 13800 };

// Presencia en góndola: % de sucursales relevadas donde el SKU está exhibido. null = no listado en la cadena.
const PRESENCIA = {
  //          norte sur  centro medit rosario patag indep
  fps50:    [54,   61,   83,    88,   79,     91,   66],
  corporal: [96,   92,   94,    90,   95,     97,   88],
  emulsion: [58,   null, 49,    72,   64,     85,   41],
  manos:    [88,   85,   90,    86,   82,     93,   74],
  pies:     [71,   69,   77,    80,   62,     84,   58],
  gel:      [80,   74,   70,    66,   null,   79,   63]
};

// Precio relevado contra el sugerido, en %. Positivo: la cadena vende más caro que el PVP.
const DESVIO_PRECIO = {
  fps50:    [1.5,  0.8,  -2.1,  0.4,  -1.2,   -9.1, 4.2],
  corporal: [0.6,  -0.4, 1.1,   0.2,  -0.8,   0.9,  3.1],
  emulsion: [14.2, null, 2.4,   1.8,  0.6,    -1.4, 6.8],
  manos:    [-0.6, 0.3,  -1.8,  0.5,  -6.2,   0.4,  2.2],
  pies:     [0.8,  -0.2, 0.6,   -0.9, 1.3,    0.2,  1.9],
  gel:      [2.1,  1.4,  -0.3,  0.8,  null,   -0.6, 3.6]
};

/** Share of shelf de la categoría (dermocosmética corporal y solar) contra el share de ventas. */
export const MARCAS = [
  { id: "caviahue", label: "Caviahue" },
  { id: "lider", label: "Marca internacional líder" },
  { id: "local", label: "Laboratorio dermo local" },
  { id: "blanca", label: "Marca blanca de cadena" },
  { id: "otros", label: "Otras marcas" }
];
const SHARE = {
  //            caviahue lider local blanca otros  ventasCaviahue
  norte:        [11, 34, 21, 18, 16, 16],
  sur:          [13, 31, 22, 15, 19, 14],
  centro:       [15, 28, 24, 12, 21, 15],
  mediterranea: [17, 26, 25, 10, 22, 15],
  rosario:      [12, 30, 20, 20, 18, 13],
  patagonica:   [19, 27, 18, 14, 22, 17],
  indep:        [14, 33, 29, 0, 24, 18]
};

const FACINGS = [
  { sku: "fps50", promedio: 2.1, objetivo: 4, nota: "Temporada solar: el acuerdo con las cadenas es de 4 frentes" },
  { sku: "corporal", promedio: 3.2, objetivo: 3 },
  { sku: "emulsion", promedio: 1.4, objetivo: 2 },
  { sku: "manos", promedio: 2.0, objetivo: 2 },
  { sku: "pies", promedio: 1.3, objetivo: 1 },
  { sku: "gel", promedio: 1.2, objetivo: 1 }
];

export const POP = { campana: "Exhibidor de verano · Kit dermo", acordadas: 25, instaladas: 14, incompletas: 4 };

/** Misiones de este año. Las que se crean desde la app se guardan en la base (db.misiones). */
export const MISIONES_BASE = [
  { id: "M-032", nombre: "Material POP de verano en farmacias acordadas", modalidad: "medida", puntos: 25, recompensa: 3500, fee: 4000, pro: false, zonas: ["AMBA"], cadenas: ["Farmacias independientes"], skus: [], creada: "2026-09-08", creadaPor: "Gerencia Comercial", estado: "completa", relevados: 25, validados: 21, rechazados: 2, revision: 2 },
  { id: "M-031", nombre: "Temporada solar · FPS50 en cadenas AMBA", modalidad: "control", puntos: 120, recompensa: 2500, pro: true, zonas: ["AMBA"], cadenas: ["Cadena Norte", "Cadena Sur", "Farmacias independientes"], skus: ["fps50", "emulsion"], creada: "2026-09-10", creadaPor: "Gerencia Comercial", estado: "en_curso", relevados: 99, validados: 84, rechazados: 6, revision: 9 },
  { id: "M-030", nombre: "Góndola dermo corporal y solar · categoría completa", modalidad: "categoria", puntos: 60, recompensa: 3000, pro: false, zonas: ["Córdoba", "Santa Fe", "Patagonia"], cadenas: ["Cadena Centro", "Cadena Mediterránea", "Cadena Rosario", "Cadena Patagónica"], skus: [], creada: "2026-09-01", creadaPor: "Dirección", estado: "completa", relevados: 60, validados: 57, rechazados: 3, revision: 0 },
  { id: "M-029", nombre: "Precio de Emulsión Facial en cadenas", modalidad: "control", puntos: 80, recompensa: 2000, pro: false, zonas: ["AMBA", "Córdoba"], cadenas: ["Cadena Norte", "Cadena Centro", "Cadena Mediterránea"], skus: ["emulsion"], creada: "2026-08-25", creadaPor: "Gerencia Comercial", estado: "completa", relevados: 80, validados: 74, rechazados: 4, revision: 2 }
];

/** Costo por relevamiento: recompensa al relevador + fee del proveedor (+ informe PRO). */
export function costoUnitario({ modalidad, recompensa, pro, fee }) {
  const m = MODALIDADES.find((x) => x.id === modalidad);
  const f = fee ?? m?.fee;
  if (f === null || f === undefined) return null;
  return recompensa + f + (pro && m?.pro ? m.pro : 0);
}

// [id, fecha, cadena, sucursal, localidad, mision, relevador, estado, confianza, facings por SKU (null = no listado), precios, pop, motivo]
const RELEVAMIENTOS = [
  ["REL-20931", "2026-09-16", "norte", "Suc. 12 · Palermo", "CABA", "M-031", 4821, "validado", 96, { fps50: 0, corporal: 3, emulsion: 2, manos: 2, pies: 1, gel: 2 }, { corporal: 12500, emulsion: 28100, manos: 8850, pies: 10300, gel: 14100 }, null],
  ["REL-20935", "2026-09-16", "norte", "Suc. 27 · San Isidro", "Buenos Aires", "M-031", 3377, "validado", 94, { fps50: 2, corporal: 3, emulsion: 0, manos: 2, pies: 1, gel: 1 }, { fps50: 19200, corporal: 12450, manos: 8900, pies: 10250, gel: 14000 }, true],
  ["REL-20940", "2026-09-16", "sur", "Suc. 8 · Lomas de Zamora", "Buenos Aires", "M-031", 5102, "validado", 91, { fps50: 0, corporal: 2, emulsion: null, manos: 2, pies: 1, gel: 1 }, { corporal: 12350, manos: 8950, pies: 10200, gel: 14000 }, null],
  ["REL-20944", "2026-09-15", "indep", "Farmacia del Plata · Quilmes", "Buenos Aires", "M-032", 2210, "validado", 89, { fps50: 1, corporal: 2, emulsion: 1, manos: 1, pies: 0, gel: 0 }, { fps50: 19700, corporal: 12800, emulsion: 26300, manos: 9100 }, true],
  ["REL-20948", "2026-09-15", "sur", "Suc. 3 · Avellaneda", "Buenos Aires", "M-031", 4410, "rechazado", 62, { fps50: 1, corporal: 2, emulsion: null, manos: 1, pies: 1, gel: 1 }, {}, null, "Foto borrosa: no se pueden leer los precios. No se descuenta del saldo"],
  ["REL-20951", "2026-09-15", "centro", "Suc. 5 · Nueva Córdoba", "Córdoba", "M-030", 1893, "validado", 95, { fps50: 3, corporal: 4, emulsion: 0, manos: 2, pies: 2, gel: 1 }, { fps50: 18500, corporal: 12500, manos: 8750, pies: 10250, gel: 13750 }, null],
  ["REL-20955", "2026-09-14", "mediterranea", "Suc. 2 · Cerro de las Rosas", "Córdoba", "M-030", 6034, "validado", 97, { fps50: 4, corporal: 3, emulsion: 2, manos: 2, pies: 2, gel: 1 }, { fps50: 18950, corporal: 12400, emulsion: 25000, manos: 8950, pies: 10100, gel: 13900 }, null],
  ["REL-20958", "2026-09-14", "rosario", "Suc. 9 · Centro", "Rosario", "M-030", 2745, "validado", 93, { fps50: 2, corporal: 3, emulsion: 1, manos: 2, pies: 1, gel: null }, { fps50: 18700, corporal: 12300, emulsion: 24750, manos: 8350, pies: 10350 }, null],
  ["REL-20962", "2026-09-14", "patagonica", "Suc. 4 · Neuquén", "Neuquén", "M-030", 3918, "validado", 95, { fps50: 4, corporal: 3, emulsion: 2, manos: 2, pies: 1, gel: 1 }, { fps50: 17200, corporal: 12500, emulsion: 24250, manos: 8950, pies: 10200, gel: 13700 }, null],
  ["REL-20966", "2026-09-13", "indep", "Farmacia Belgrano · Belgrano", "CABA", "M-032", 5561, "revision", 78, { fps50: 2, corporal: 2, emulsion: 1, manos: 1, pies: 1, gel: 1 }, { fps50: 19900, corporal: 12700 }, true, "Confianza de la IA por debajo del 80%: pasa a control manual"],
  ["REL-20970", "2026-09-13", "norte", "Suc. 31 · Caballito", "CABA", "M-029", 1207, "validado", 96, { fps50: 1, corporal: 3, emulsion: 2, manos: 2, pies: 1, gel: 1 }, { fps50: 19100, emulsion: 28300 }, null],
  ["REL-20973", "2026-09-12", "indep", "Farmacia Sur Salud · Lanús", "Buenos Aires", "M-032", 4102, "rechazado", 70, { fps50: 0, corporal: 1, emulsion: 0, manos: 1, pies: 0, gel: 0 }, {}, false, "Relevado fuera de la franja horaria pedida. No se descuenta del saldo"]
];

const cadenaDe = (id) => CADENAS.find((c) => c.id === id);
const skuLabel = (id) => SKUS.find((s) => s.id === id)?.label || id;
const CORTO = { fps50: "FPS50", corporal: "Crema Corporal", emulsion: "Emulsión Facial", manos: "Crema de Manos", pies: "Crema de Pies", gel: "Gel Limpiador" };
const corto = (id) => CORTO[id] || skuLabel(id);

export function relevamientos() {
  return RELEVAMIENTOS.map(([id, fecha, cadena, sucursal, localidad, mision, relevador, estado, confianza, facings, precios, pop, motivo]) => {
    const faltantes = Object.entries(facings).filter(([, f]) => f === 0).map(([s]) => corto(s));
    const desvios = Object.entries(precios)
      .map(([s, p]) => ({ sku: s, desvio: r1(((p - PVP[s]) / PVP[s]) * 100) }))
      .filter((d) => Math.abs(d.desvio) >= 5)
      .map((d) => `${corto(d.sku)} ${d.desvio > 0 ? "+" : ""}${n(d.desvio, 1)}% contra el sugerido`);
    return {
      id, fecha, cadena: cadenaDe(cadena).label, cadenaId: cadena, sucursal, localidad, mision,
      relevador: `Relevador #${relevador}`, estado, confianza, motivo: motivo || null, pop,
      hallazgos: [
        ...faltantes.map((f) => `${f}: no está en góndola`),
        ...desvios,
        ...(pop === false ? ["Material POP de verano no instalado"] : [])
      ]
    };
  });
}

// Generador pseudoaleatorio con semilla: la góndola de un relevamiento sale siempre igual.
function semilla(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Reconstrucción de la góndola a partir de las fotos: 4 estantes de 22 frentes.
 * Los productos propios salen de lo relevado; el resto del espacio se reparte entre
 * la competencia según el share of shelf de la cadena.
 */
export function gondola(relId) {
  const fila = RELEVAMIENTOS.find((r) => r[0] === relId);
  if (!fila) return null;
  const [id, , cadena, , , , , , confianza, facings, precios] = fila;
  const rnd = semilla(id);
  const share = SHARE[cadena];
  const ANCHO = 22;
  const propios = Object.entries(facings).filter(([, f]) => f !== null);
  // Estante 1: faciales; 2: solares; 3: corporales; 4: manos, pies y limpieza.
  const orden = [["emulsion", "gel"], ["fps50"], ["corporal"], ["manos", "pies"]];
  const competidores = MARCAS.slice(1).map((m, i) => ({ ...m, peso: share[i + 1] })).filter((m) => m.peso > 0);
  const pesoTotal = competidores.reduce((a, m) => a + m.peso, 0);
  const elegir = () => {
    let x = rnd() * pesoTotal;
    for (const m of competidores) { if ((x -= m.peso) <= 0) return m; }
    return competidores[0];
  };
  const estantes = orden.map((skus) => {
    const bloques = [];
    for (const s of skus) {
      const f = facings[s];
      if (f === undefined || f === null) continue;
      if (f === 0) bloques.push({ marca: "caviahue", sku: s, label: corto(s), facings: 1, falta: true });
      else bloques.push({ marca: "caviahue", sku: s, label: corto(s), facings: f, precio: precios[s] || null, detectado: true, confianza: Math.min(99, confianza + Math.round(rnd() * 4 - 2)) });
    }
    let usados = bloques.reduce((a, b) => a + b.facings, 0);
    const resto = [];
    while (usados < ANCHO) {
      const m = elegir();
      const f = Math.min(ANCHO - usados, 1 + Math.floor(rnd() * 3));
      const prev = resto.at(-1);
      if (prev && prev.marca === m.id) prev.facings += f;
      else resto.push({ marca: m.id, label: m.label, facings: f });
      usados += f;
    }
    // Cada producto propio queda en su propia posición, separado de los otros por la competencia.
    const estante = [...resto];
    bloques.forEach((b, k) => {
      const tramo = Math.max(1, Math.floor(estante.length / bloques.length));
      const pos = Math.min(estante.length, k * (tramo + 1) + Math.floor(rnd() * tramo));
      estante.splice(pos, 0, b);
    });
    return estante;
  });
  return { id, ancho: ANCHO, estantes, marcas: MARCAS, propios: propios.length };
}

function matriz(fuente) {
  return {
    filas: SKUS,
    columnas: CADENAS.map(({ id, label, zona }) => ({ id, label, zona })),
    valores: SKUS.map((s) => fuente[s.id])
  };
}

/** Estado de las misiones creadas desde la app: sigue a la tarea de aprobación. */
function estadoMision(m, tareas) {
  const t = tareas.find((x) => x.id === m.taskId);
  if (!t) return { estado: "por_aprobar", relevados: 0, validados: 0, rechazados: 0, revision: 0 };
  if (["pendiente", "en_curso", "esperando_aprobacion"].includes(t.status)) return { estado: "por_aprobar", relevados: 0, validados: 0, rechazados: 0, revision: 0 };
  if (t.status !== "completada") return { estado: "rechazada", relevados: 0, validados: 0, rechazados: 0, revision: 0 };
  // Simulación: la red completa la misión en unos 30 minutos desde la aprobación.
  const minutos = (Date.now() - Date.parse(t.finishedAt)) / 6e4;
  const relevados = Math.min(m.puntos, Math.floor((minutos / 30) * m.puntos));
  const rechazados = Math.floor(relevados * 0.05);
  const revision = relevados === m.puntos ? 0 : Math.floor(relevados * 0.06);
  return {
    estado: relevados === 0 ? "publicada" : relevados === m.puntos ? "completa" : "en_curso",
    relevados, validados: relevados - rechazados - revision, rechazados, revision
  };
}

export function misiones(guardadas = [], tareas = []) {
  const todas = [
    ...guardadas.map((m) => ({ ...m, ...estadoMision(m, tareas), propia: true })),
    ...MISIONES_BASE
  ];
  return todas.map((m) => {
    const unitario = costoUnitario(m);
    const comprometido = unitario === null ? null : unitario * m.puntos;
    const consumido = unitario === null ? null : unitario * m.validados;
    return {
      ...m,
      modalidadLabel: MODALIDADES.find((x) => x.id === m.modalidad)?.label,
      unitario, comprometido, consumido,
      avance: Math.round((m.relevados / m.puntos) * 100)
    };
  });
}

export function saldo(lista) {
  const activas = lista.filter((m) => ["publicada", "en_curso", "completa"].includes(m.estado) && m.comprometido !== null);
  const consumido = activas.reduce((a, m) => a + m.consumido, 0);
  // Reservado: lo comprometido en misiones abiertas que todavía no se validó.
  const reservado = lista
    .filter((m) => ["publicada", "en_curso", "por_aprobar"].includes(m.estado) && m.comprometido !== null)
    .reduce((a, m) => a + (m.comprometido - m.consumido), 0);
  return { cargado: SALDO_CARGADO, consumido, reservado, disponible: SALDO_CARGADO - consumido - reservado };
}

export const CALIDAD = {
  relevamientosMes: 412, validados: 371, rechazados: 23, revision: 18,
  confianzaIA: 93.4, tiempoMedioHoras: 31, slaHoras: 72,
  motivosRechazo: [
    { motivo: "Foto borrosa o con reflejos", casos: 11 },
    { motivo: "Fuera de la franja horaria pedida", casos: 6 },
    { motivo: "Sucursal distinta de la asignada", casos: 4 },
    { motivo: "Góndola incompleta en la foto", casos: 2 }
  ],
  // Control manual sobre una muestra del 5%: es lo que permite medir la precisión y no creerla.
  control: { muestra: 21, presencia: 95.2, facings: 88.1, precio: 97.6 }
};

/** Comparación contra auditar con personal propio. Estimación: tipo estimado. */
export const COSTOS = {
  redPorRelevamiento: 3250, propioPorVisita: 11800,
  metodoPropio: "Auditor propio: sueldo con cargas, viáticos y movilidad, dividido por 9 visitas por día",
  coberturaRed: [
    { zona: "AMBA", relevadores: 412, horasPromedio: 22 },
    { zona: "Córdoba", relevadores: 96, horasPromedio: 34 },
    { zona: "Santa Fe", relevadores: 74, horasPromedio: 36 },
    { zona: "Cuyo", relevadores: 41, horasPromedio: 48 },
    { zona: "Patagonia", relevadores: 38, horasPromedio: 52 },
    { zona: "NOA", relevadores: 27, horasPromedio: 61 }
  ]
};

/** Informes de mercado sin operativo propio: el proveedor los arma con su propia base. */
export const INFORMES = {
  disponibles: [
    { id: "share-solar", titulo: "Evolución del share of shelf en protección solar", periodo: "Abr–Sep 2026" },
    { id: "ganadores", titulo: "Ganadores y perdedores de la categoría corporal", periodo: "3T 2026" },
    { id: "precios", titulo: "Movimientos de precio en dermocosmética", periodo: "Mensual" },
    { id: "lider", titulo: "Posición frente al líder por cadena", periodo: "3T 2026" }
  ],
  shareSolar: {
    meses: ["Abr", "May", "Jun", "Jul", "Ago", "Sep"],
    series: [
      { marca: "caviahue", valores: [14.1, 13.8, 13.2, 12.6, 12.3, 12.0] },
      { marca: "lider", valores: [29.4, 29.8, 30.5, 31.6, 32.4, 33.1] },
      { marca: "local", valores: [22.8, 22.5, 22.9, 22.4, 22.1, 21.8] },
      { marca: "blanca", valores: [13.0, 13.4, 13.1, 13.6, 13.9, 14.2] }
    ]
  },
  ganadores: [
    { marca: "Marca internacional líder", delta: 3.7 },
    { marca: "Marca blanca de cadena", delta: 1.2 },
    { marca: "Laboratorio dermo local", delta: -1.0 },
    { marca: "Caviahue", delta: -2.1 }
  ]
};

export function alertas() {
  const i = (cad) => CADENAS.findIndex((c) => c.id === cad);
  return [
    { sev: "crit", t: `Protector Solar FPS50 no está en góndola en el ${100 - PRESENCIA.fps50[i("norte")]}% de las sucursales de Cadena Norte, en plena temporada. Coincide con el quiebre del depósito`, tipo: "operativo", link: "#/operaciones/canal" },
    { sev: "crit", t: `Emulsión Facial aparece solo en el ${PRESENCIA.emulsion[i("centro")]}% de Cadena Centro y en el ${PRESENCIA.emulsion[i("indep")]}% de las independientes`, tipo: "operativo" },
    { sev: "warn", t: `Cadena Norte: Caviahue tiene el ${SHARE.norte[0]}% del espacio pero el ${SHARE.norte[5]}% de las ventas. Es el argumento para la góndola destacada de verano que está en negociación`, tipo: "operativo", link: "#/comercial/pipeline" },
    { sev: "warn", t: `Emulsión Facial se vende ${n(DESVIO_PRECIO.emulsion[i("norte")], 1)}% por encima del precio sugerido en Cadena Norte`, tipo: "operativo" },
    { sev: "warn", t: `FPS50 ${n(Math.abs(DESVIO_PRECIO.fps50[i("patagonica")]), 1)}% debajo del sugerido en Cadena Patagónica: promoción no informada`, tipo: "operativo" },
    { sev: "warn", t: `Exhibidor de verano instalado en ${POP.instaladas} de ${POP.acordadas} farmacias acordadas`, tipo: "operativo" },
    { sev: "info", t: "La marca internacional líder ganó 3,7 puntos de share of shelf en protección solar desde abril", tipo: "estimado" }
  ];
}

/**
 * Misiones que sugiere el agente a partir de sus alertas. Es criterio del agente, no un dato:
 * una persona la revisa, la ajusta y la manda a aprobación.
 */
export function sugerencias(guardadas = []) {
  const i = (cad) => CADENAS.findIndex((c) => c.id === cad);
  const usadas = new Set(guardadas.map((m) => m.sugerencia).filter(Boolean));
  return [
    {
      id: "sug-fps50-reposicion", prioridad: "alta",
      nombre: "Reposición de FPS50 en Cadena Norte y Cadena Sur",
      modalidad: "control", skus: ["fps50"], cadenas: ["Cadena Norte", "Cadena Sur"], puntos: 40, recompensa: 2800, pro: false,
      objetivo: "Presencia, frentes y precio de FPS50. Foto de la góndola solar completa.",
      cuando: "Semana del 05/10, después de que entre la orden OP-2609",
      motivo: `FPS50 falta en el ${100 - PRESENCIA.fps50[i("norte")]}% de Cadena Norte y el ${100 - PRESENCIA.fps50[i("sur")]}% de Cadena Sur. La orden de producción llega el 01/10: hay que verificar que la reposición llegue a la góndola y no se quede en el depósito de la cadena.`,
      origen: "Alerta de presencia + quiebre de Operaciones"
    },
    {
      id: "sug-norte-categoria", prioridad: "alta",
      nombre: "Categoría completa en Cadena Norte para negociar la góndola de verano",
      modalidad: "categoria", skus: [], cadenas: ["Cadena Norte"], puntos: 20, recompensa: 2500, pro: false,
      objetivo: "Share of shelf de toda la categoría, frentes por marca y material POP de la competencia.",
      cuando: "Antes del 20/10, cierre previsto de la negociación",
      motivo: `Caviahue tiene el ${SHARE.norte[0]}% del espacio y el ${SHARE.norte[5]}% de las ventas en Cadena Norte. Un relevamiento reciente de la categoría es el mejor argumento para la oportunidad «Góndola destacada verano» (ARS 98 M, en negociación).`,
      origen: "Alerta de share + pipeline de Comercial"
    },
    {
      id: "sug-emulsion-precio", prioridad: "media",
      nombre: "Precio de Emulsión Facial en Cadena Norte",
      modalidad: "control", skus: ["emulsion"], cadenas: ["Cadena Norte"], puntos: 25, recompensa: 2000, pro: true,
      objetivo: "Precio en góndola, precio de promoción si hay, y foto de la etiqueta.",
      cuando: "Esta semana",
      motivo: `Emulsión Facial se vende ${n(DESVIO_PRECIO.emulsion[i("norte")], 1)}% por encima del sugerido en Cadena Norte, justo cuando se presenta el alta en Cadena Sur. Confirmarlo en más sucursales antes de hablar con la cadena.`,
      origen: "Alerta de precio"
    },
    {
      id: "sug-pop-verano", prioridad: "media",
      nombre: "Segunda visita a las farmacias sin exhibidor de verano",
      modalidad: "medida", skus: [], cadenas: ["Farmacias independientes"], puntos: POP.acordadas - POP.instaladas + POP.incompletas, recompensa: 3500, pro: false,
      objetivo: "Foto del exhibidor instalado, o motivo por el que no está.",
      cuando: "Antes de que arranque la campaña de verano",
      motivo: `El exhibidor está instalado en ${POP.instaladas} de ${POP.acordadas} farmacias acordadas y ${POP.incompletas} están incompletas. Las demás ya se pagaron en el acuerdo comercial.`,
      origen: "Resultado de la misión M-032"
    }
  ].filter((s) => !usadas.has(s.id)).map((s) => {
    const unitario = costoUnitario(s);
    return { ...s, unitario, costo: unitario === null ? null : unitario * s.puntos };
  });
}

export const META = {
  id: "pdv", titulo: "Auditoría de punto de venta",
  bajada: "Qué pasa en la góndola: presencia, precio, espacio, competencia y ejecución de campañas, relevado por una red de relevadores y leído con IA.",
  origen: "sintetico",
  fuentes: ["Plataforma de relevamiento (proveedor a definir)", "Reconocimiento de imágenes", "Elvis (CRM)", "Sell Out"],
  actualizacion: "Relevamientos, a medida que se validan. Informes de mercado, mensual."
};

export function resumen(guardadas = [], tareas = []) {
  const lista = misiones(guardadas, tareas);
  const pres = Object.values(PRESENCIA).flat().filter((v) => v !== null);
  const desv = Object.values(DESVIO_PRECIO).flat().filter((v) => v !== null);
  const sal = saldo(lista);
  const shareProm = r1(Object.values(SHARE).reduce((a, s) => a + s[0], 0) / Object.keys(SHARE).length);
  const ventasProm = r1(Object.values(SHARE).reduce((a, s) => a + s[5], 0) / Object.keys(SHARE).length);
  return {
    meta: META,
    kpis: [
      { id: "presencia", label: "Presencia en góndola", valor: r1(pres.reduce((a, v) => a + v, 0) / pres.length), unidad: "%", contra: 90, tipo: "operativo", detalle: "Promedio de los 6 SKU en las cadenas donde están listados" },
      { id: "share", label: "Share of shelf", valor: shareProm, unidad: "%", contra: ventasProm, tipo: "operativo", detalle: `Contra ${n(ventasProm, 1)}% de share de ventas: la marca tiene menos espacio del que vende` },
      { id: "precio", label: "Desvío de precio", valor: r1(desv.reduce((a, v) => a + Math.abs(v), 0) / desv.length), unidad: "% prom.", contra: 3, tipo: "operativo", detalle: "Diferencia absoluta promedio contra el precio sugerido" },
      { id: "facings", label: "Frentes de FPS50", valor: FACINGS[0].promedio, unidad: "frentes", contra: FACINGS[0].objetivo, tipo: "operativo", detalle: "Promedio por sucursal; lo acordado para la temporada son 4" },
      { id: "pop", label: "POP instalado", valor: Math.round((POP.instaladas / POP.acordadas) * 100), unidad: "%", contra: 100, tipo: "operativo", detalle: `${POP.instaladas} de ${POP.acordadas} farmacias con el exhibidor de verano` },
      { id: "validados", label: "Relevamientos validados", valor: CALIDAD.validados, unidad: "del mes", contra: CALIDAD.relevamientosMes, tipo: "conciliado", detalle: `${CALIDAD.rechazados} rechazados no se pagan · ${CALIDAD.revision} en control manual` },
      { id: "saldo", label: "Saldo disponible", valor: sal.disponible, unidad: "ARS", tipo: "operativo", detalle: `De ${n(sal.cargado)} cargados: ${n(sal.consumido)} consumidos y ${n(sal.reservado)} reservados` },
      { id: "costo", label: "Costo por relevamiento", valor: COSTOS.redPorRelevamiento, unidad: "ARS", contra: COSTOS.propioPorVisita, tipo: "estimado", detalle: `Contra ARS ${n(COSTOS.propioPorVisita)} con un auditor propio` }
    ],
    alertas: alertas(),
    presencia: matriz(PRESENCIA),
    precios: { ...matriz(DESVIO_PRECIO), pvp: PVP },
    share: {
      marcas: MARCAS,
      cadenas: CADENAS.map((c) => ({ id: c.id, label: c.label, valores: SHARE[c.id].slice(0, 5), ventas: SHARE[c.id][5] }))
    },
    facings: FACINGS.map((f) => ({ ...f, label: skuLabel(f.sku) })),
    pop: POP,
    modalidades: MODALIDADES,
    misiones: lista,
    sugerencias: sugerencias(guardadas),
    saldo: sal,
    relevamientos: relevamientos(),
    calidad: CALIDAD,
    costos: COSTOS,
    informes: { ...INFORMES, marcas: MARCAS },
    skus: SKUS, cadenas: CADENAS
  };
}
