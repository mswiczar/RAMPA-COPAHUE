// Solución R&D: inversión, portfolio de proyectos, radar de investigación,
// inteligencia competitiva y motor de decisión. DATOS SIMULADOS.
// Métricas de inversión y personal estructuradas según el criterio del Manual de Frascati (OCDE).

export const HOY = "2026-09-17";
const r1 = (n) => Math.round(n * 10) / 10;
const pct = (a, b) => (b ? r1(((a - b) / b) * 100) : 0);

export const ESTADOS = ["Idea", "Investigación", "Prototipo", "Validación", "Desarrollo", "Lanzamiento"];

export const PRESUPUESTO = {
  anual: 620, ejecutado: 389, comprometido: 118,
  moneda: "ARS", unidad: "millones",
  porTipo: [
    { tipo: "Personal de I+D", monto: 168, frascati: "Costos corrientes: personal" },
    { tipo: "Laboratorio y ensayos", monto: 92, frascati: "Costos corrientes: otros" },
    { tipo: "Investigación tercerizada", monto: 74, frascati: "I+D extramuros" },
    { tipo: "Equipamiento", monto: 35, frascati: "Gastos de capital" },
    { tipo: "Licencias y bases de datos", monto: 20, frascati: "Costos corrientes: otros" }
  ],
  porUnidad: [
    { unidad: "Dermocosmética facial", monto: 186 },
    { unidad: "Corporales", monto: 104 },
    { unidad: "Protección solar", monto: 78 },
    { unidad: "Nuevas categorías", monto: 21 }
  ],
  porTecnologia: [
    { tecnologia: "Activos de barrera cutánea", monto: 142 },
    { tecnologia: "Filtros solares", monto: 98 },
    { tecnologia: "Minerales y agua termal", monto: 86 },
    { tecnologia: "Packaging sustentable", monto: 63 }
  ],
  porRegion: [
    { region: "Argentina (laboratorio propio)", monto: 251 },
    { region: "Argentina (universidades y CONICET)", monto: 84 },
    { region: "Brasil (planta contratada)", monto: 54 }
  ]
};

// [id, nombre, estado, avance %, presupuesto, consumido, probTecnica, probComercial, mesesAlMercado, ventasEsperadas, riesgo, hitoProximo, fechaHito, diasDemora]
const PROYECTOS = [
  ["p01", "Serum Barrera Termal", "Desarrollo", 72, 96, 81, 0.85, 0.7, 7, 420, "medio", "Cierre de fórmula final", "2026-10-15", 0],
  ["p02", "Solar facial con color FPS50", "Validación", 54, 78, 41, 0.78, 0.74, 11, 510, "medio", "Test de estabilidad acelerada", "2026-11-05", 12],
  ["p03", "Reformulación Crema Corporal 200g", "Desarrollo", 88, 44, 40, 0.94, 0.55, 4, 180, "bajo", "Aprobación de claims", "2026-09-30", 0],
  ["p04", "Línea anti-age con péptidos", "Investigación", 26, 120, 34, 0.55, 0.68, 22, 680, "alto", "Selección de activo principal", "2026-12-10", 34],
  ["p05", "Gel limpiador sin sulfatos", "Prototipo", 41, 36, 17, 0.8, 0.49, 14, 150, "medio", "Prueba de uso con 40 voluntarios", "2026-10-28", 0],
  ["p06", "Packaging monomaterial reciclable", "Validación", 63, 52, 34, 0.72, 0.6, 9, 0, "medio", "Validación de barrera del envase", "2026-11-20", 8],
  ["p07", "Protector solar infantil", "Idea", 8, 24, 3, 0.6, 0.71, 26, 340, "alto", "Brief técnico y regulatorio", "2027-01-20", 0],
  ["p08", "Emulsión facial con ácido hialurónico", "Lanzamiento", 96, 68, 66, 0.97, 0.66, 2, 260, "bajo", "Aprobación de packaging en Moondesk", "2026-09-26", 12]
];

export function proyectos() {
  return PROYECTOS.map(([id, nombre, estado, avance, presupuesto, consumido, tecnica, comercial, meses, ventas, riesgo, hito, fechaHito, demora]) => {
    const exito = r1(tecnica * comercial * 100);
    // Valor esperado simple: ventas anuales esperadas por margen, por probabilidad, descontado por tiempo.
    const valorEsperado = r1(((ventas * 0.55 * tecnica * comercial) / (1 + 0.35 * (meses / 12))) - (presupuesto - consumido));
    return {
      id, nombre, estado, avance, presupuesto, consumido,
      disponible: r1(presupuesto - consumido),
      probTecnica: r1(tecnica * 100), probComercial: r1(comercial * 100), exito,
      mesesAlMercado: meses, ventasEsperadas: ventas, riesgo,
      habilitante: ventas === 0, // proyectos que no venden por sí mismos (packaging, procesos)
      hitoProximo: hito, fechaHito, diasDemora: demora, demorado: demora > 0,
      valorEsperado,
      roi: presupuesto ? r1((valorEsperado / presupuesto) * 100) : 0
    };
  });
}

export const HISTORICO = {
  lanzados: [
    { producto: "Crema de Pies 100g", anio: 2024, inversion: 38, ventasAnio: 410, resultado: "éxito" },
    { producto: "Gel Limpiador 150ml", anio: 2025, inversion: 44, ventasAnio: 240, resultado: "por debajo de lo esperado" },
    { producto: "Crema de Manos 50g", anio: 2023, inversion: 31, ventasAnio: 620, resultado: "éxito" }
  ],
  discontinuados: [
    { producto: "Línea capilar", anio: 2024, inversion: 52, motivo: "Mercado muy competido y margen bajo" },
    { producto: "Loción post-sol en spray", anio: 2025, inversion: 19, motivo: "Problemas de estabilidad de la fórmula" }
  ],
  patentes: [
    { titulo: "Composición con minerales termales para reparación de barrera", estado: "Concedida", vence: "2031-04-12", pais: "Argentina" },
    { titulo: "Sistema de liberación prolongada de filtros solares", estado: "En trámite", presentada: "2025-11-03", pais: "Argentina y Brasil" },
    { titulo: "Envase monomaterial con barrera a oxígeno", estado: "En preparación", pais: "Argentina" }
  ]
};

/** Radar: lo que pasa afuera y puede afectar un producto propio. */
export const RADAR = [
  { id: "r1", tipo: "Paper científico", titulo: "Ceramidas y agua termal en la reparación de barrera cutánea", fuente: "Journal of Dermatological Science", fecha: "2026-09-12", confiabilidad: "alta", afecta: "Serum Barrera Termal", impacto: "oportunidad", resumen: "Un ensayo con 180 pacientes muestra mejora del 34% en pérdida de agua transepidérmica con la combinación de ceramidas y minerales termales." },
  { id: "r2", tipo: "Patente de terceros", titulo: "Filtro solar de origen mineral con textura fluida", fuente: "INPI Argentina", fecha: "2026-09-08", confiabilidad: "alta", afecta: "Solar facial con color FPS50", impacto: "riesgo", resumen: "Un laboratorio local presentó una patente que se superpone parcialmente con el sistema de filtros del proyecto." },
  { id: "r3", tipo: "Cambio regulatorio", titulo: "ANMAT actualiza el listado de filtros UV permitidos", fuente: "ANMAT", fecha: "2026-09-04", confiabilidad: "alta", afecta: "Protección solar", impacto: "riesgo", resumen: "Dos filtros quedan con límite de concentración más bajo. Hay que revisar las fórmulas antes de la temporada." },
  { id: "r4", tipo: "Tendencia de consumo", titulo: "Rutinas minimalistas de 3 pasos", fuente: "WGSN", fecha: "2026-09-01", confiabilidad: "media", afecta: "Portfolio", impacto: "oportunidad", resumen: "El consumidor reduce la cantidad de productos y prioriza multifunción." },
  { id: "r5", tipo: "Startup", titulo: "Biotecnológica local desarrolla péptidos de síntesis local", fuente: "Relevamiento propio", fecha: "2026-08-27", confiabilidad: "media", afecta: "Línea anti-age con péptidos", impacto: "oportunidad", resumen: "Podría reemplazar un activo importado y bajar el costo del proyecto p04." },
  { id: "r6", tipo: "Ensayo clínico", titulo: "Estudio de eficacia en piel sensible con extracto termal", fuente: "Registro de ensayos", fecha: "2026-08-19", confiabilidad: "alta", afecta: "Serum Barrera Termal", impacto: "oportunidad", resumen: "Resultados preliminares favorables en piel sensible, la indicación que más pregunta el dermatólogo." },
  { id: "r7", tipo: "Acuerdo del sector", titulo: "Competidor internacional firma alianza con universidad brasileña", fuente: "Prensa del sector", fecha: "2026-08-14", confiabilidad: "media", afecta: "Competencia", impacto: "riesgo", resumen: "Foco declarado en activos de barrera, el mismo territorio del proyecto p01." },
  { id: "r8", tipo: "Nuevo material", titulo: "Envase monomaterial con barrera mejorada", fuente: "Feria de packaging", fecha: "2026-08-05", confiabilidad: "media", afecta: "Packaging monomaterial reciclable", impacto: "oportunidad", resumen: "Un proveedor local ofrece el material a un costo 18% menor que el importado." }
];

/** Inteligencia competitiva: casi todo estimado, con método explícito. */
export const COMPETIDORES = [
  { competidor: "Laboratorio dermo local A", inversionEstimada: 980, sobreVentas: 3.4, investigadores: 42, patentes5anios: 7, lanzamientos12m: 4, alianzas: "Universidad Nacional y un CRO local", confianza: "media", metodo: "Balance publicado, avisos de búsqueda y publicaciones científicas de los últimos 24 meses" },
  { competidor: "Marca internacional B", inversionEstimada: 2400, sobreVentas: 4.1, investigadores: 120, patentes5anios: 23, lanzamientos12m: 6, alianzas: "Centro de I+D regional en Brasil", confianza: "baja", metodo: "Prorrateo del gasto global de I+D por participación de la filial en las ventas de la región" },
  { competidor: "Marca blanca de cadena", inversionEstimada: 210, sobreVentas: 1.2, investigadores: 8, patentes5anios: 0, lanzamientos12m: 9, alianzas: "Laboratorios contratados", confianza: "media", metodo: "Estimación por cantidad de SKU nuevos y costo típico de desarrollo tercerizado" },
  { competidor: "Caviahue (nosotros)", inversionEstimada: 620, sobreVentas: 3.9, investigadores: 19, patentes5anios: 3, lanzamientos12m: 3, alianzas: "CONICET y planta contratada en Brasil", confianza: "alta", metodo: "Presupuesto propio [Presupuesto anual]", propio: true }
];

export function indicadores() {
  const ps = proyectos();
  const ventasAnio = 13360; // ingresos proyectados del año, solución Finanzas
  const enMercado = HISTORICO.lanzados.length;
  const totalCerrados = enMercado + HISTORICO.discontinuados.length;
  const demorados = ps.filter((p) => p.demorado);
  const disponible = r1(PRESUPUESTO.anual - PRESUPUESTO.ejecutado - PRESUPUESTO.comprometido);
  return {
    presupuesto: { ...PRESUPUESTO, disponible, ejecutadoPct: r1((PRESUPUESTO.ejecutado / PRESUPUESTO.anual) * 100), proyeccionCierre: r1(PRESUPUESTO.ejecutado * 1.42) },
    kpis: [
      { id: "intensidad", label: "Intensidad de R&D", valor: r1((PRESUPUESTO.anual / ventasAnio) * 100), unidad: "% de ventas", contra: 3.4, tipo: "conciliado", detalle: "Inversión sobre ingresos del año [Presupuesto anual] [Tango]" },
      { id: "ejecutado", label: "Presupuesto ejecutado", valor: PRESUPUESTO.ejecutado, unidad: "ARS M", contra: PRESUPUESTO.anual, tipo: "conciliado", detalle: `${r1((PRESUPUESTO.ejecutado / PRESUPUESTO.anual) * 100)}% del año, más ${PRESUPUESTO.comprometido} M comprometidos` },
      { id: "disponible", label: "Disponible", valor: disponible, unidad: "ARS M", tipo: "operativo", detalle: "Sin ejecutar ni comprometer" },
      { id: "costoProyecto", label: "Costo por proyecto", valor: r1(PRESUPUESTO.anual / ps.length), unidad: "ARS M", tipo: "estimado", detalle: `${ps.length} proyectos activos` },
      { id: "tiempo", label: "De la idea al mercado", valor: 19, unidad: "meses", contra: 15, tipo: "estimado", detalle: "Promedio de los últimos lanzamientos" },
      { id: "llegada", label: "Proyectos que llegan al mercado", valor: r1((enMercado / totalCerrados) * 100), unidad: "%", tipo: "conciliado", detalle: `${enMercado} de ${totalCerrados} proyectos cerrados` },
      { id: "hitos", label: "Cumplimiento de hitos", valor: r1(((ps.length - demorados.length) / ps.length) * 100), unidad: "%", contra: 85, tipo: "operativo", detalle: `${demorados.length} proyectos demorados` },
      { id: "nuevos", label: "Ingresos de productos nuevos", valor: 14.2, unidad: "% de ventas", contra: 20, tipo: "conciliado", detalle: "Lanzados en los últimos 3 años" },
      { id: "portfolio", label: "Valor del portfolio", valor: r1(ps.reduce((a, p) => a + p.valorEsperado, 0)), unidad: "ARS M", tipo: "estimado", detalle: "Valor esperado, descontado por tiempo y probabilidad" }
    ],
    capacidad: { equipo: 19, asignados: 17.5, disponibles: 1.5, unidad: "personas equivalentes", cuelloDeBotella: "Laboratorio de estabilidad: 3 proyectos esperan turno de ensayo" },
    riesgos: [
      { tipo: "Regulatorio", detalle: "ANMAT bajó el límite de dos filtros UV: afecta la línea solar", severidad: "crit", proyecto: "Solar facial con color FPS50" },
      { tipo: "Propiedad intelectual", detalle: "Patente de terceros que se superpone con el sistema de filtros", severidad: "crit", proyecto: "Solar facial con color FPS50" },
      { tipo: "Técnico", detalle: "Sin activo principal definido después de 8 meses", severidad: "warn", proyecto: "Línea anti-age con péptidos" },
      { tipo: "Comercial", detalle: "Gel limpiador: probabilidad comercial de 49%, la más baja del portfolio", severidad: "warn", proyecto: "Gel limpiador sin sulfatos" }
    ],
    alertas: [
      { sev: "crit", t: `Solar facial FPS50: patente de terceros y cambio regulatorio de ANMAT sobre los mismos filtros, con ${r1(41)} M ya invertidos`, tipo: "operativo" },
      { sev: "crit", t: "Línea anti-age con péptidos: 34 días de demora y sin activo principal definido", tipo: "operativo" },
      { sev: "warn", t: `Proyección de cierre en ${r1(PRESUPUESTO.ejecutado * 1.42)} M contra un presupuesto de ${PRESUPUESTO.anual} M`, tipo: "proyectado" },
      { sev: "warn", t: "Emulsión facial lista para lanzar, trabada 12 días en aprobación de packaging [Moondesk]", tipo: "operativo" },
      { sev: "info", t: "Nuevo paper respalda la combinación de ceramidas y minerales termales del Serum Barrera", tipo: "estimado" }
    ]
  };
}

const ACCIONES = {
  acelerar: "Acelerar", mantener: "Mantener", pausar: "Pausar", asociarse: "Asociarse con un tercero", cancelar: "Cancelar"
};

/** Ranking por atractivo estratégico, con la acción sugerida y su fundamento. */
export function decision() {
  const ranking = proyectos().map((p) => {
    const atractivo = r1(p.valorEsperado / 10 + p.exito * 0.6 - p.mesesAlMercado * 1.2 - (p.demorado ? 8 : 0) - (p.riesgo === "alto" ? 10 : p.riesgo === "medio" ? 3 : 0));
    let accion = "mantener";
    let motivo = "Avanza según lo previsto";
    if (p.estado === "Lanzamiento" && p.demorado) { accion = "acelerar"; motivo = "Está listo para lanzar y lo frena una aprobación interna"; }
    else if (p.valorEsperado > 120 && p.exito > 55 && !p.demorado) { accion = "acelerar"; motivo = "Alto valor esperado y buena probabilidad de éxito"; }
    else if (p.riesgo === "alto" && p.demorado) { accion = "pausar"; motivo = "Demorado, caro y sin definición técnica"; }
    else if (p.habilitante) { accion = "mantener"; motivo = "No vende por sí mismo: habilita al resto del portfolio y responde a regulación de envases"; }
    else if (p.estado === "Idea") { accion = "mantener"; motivo = "Todavía es una idea: el costo de seguir explorando es bajo"; }
    else if (p.exito < 45 && p.valorEsperado < 0) { accion = "cancelar"; motivo = "Probabilidad de éxito baja y valor esperado negativo"; }
    else if (p.exito < 45) { accion = "pausar"; motivo = "Probabilidad de éxito por debajo del umbral del portfolio"; }
    else if (p.mesesAlMercado > 20 && p.valorEsperado > 60) { accion = "asociarse"; motivo = "Buen potencial pero muy lejos del mercado para hacerlo solos"; }
    return { ...p, atractivo, accion, accionLabel: ACCIONES[accion], motivo };
  }).sort((a, b) => b.atractivo - a.atractivo);
  return { ranking, acciones: ACCIONES };
}

/** Simulación: dónde poner una inversión adicional. */
export function inversionAdicional(monto = 200) {
  const candidatos = decision().ranking
    .filter((p) => ["acelerar", "mantener"].includes(p.accion))
    .sort((a, b) => b.roi - a.roi);
  let restante = monto;
  const asignacion = [];
  // Primera vuelta: cada proyecto hasta su tope razonable, que es duplicar lo que le falta gastar.
  const topes = candidatos.map((p) => ({ p, tope: Math.max(30, r1(p.disponible * 1.5 + p.presupuesto * 0.5)) }));
  const capacidad = topes.reduce((a, x) => a + x.tope, 0);
  for (const { p, tope } of topes) {
    if (restante <= 0) break;
    // Si sobra capacidad, se reparte proporcional al tope de cada proyecto.
    const cuota = capacidad > monto ? Math.min(tope, r1((tope / capacidad) * monto)) : tope;
    const asignado = r1(Math.min(restante, cuota));
    if (asignado <= 0) continue;
    restante = r1(restante - asignado);
    asignacion.push({
      proyecto: p.nombre, asignado, roiEsperado: p.roi,
      efecto: p.estado === "Lanzamiento" ? "Adelanta el lanzamiento y libera el cuello de aprobación"
        : p.mesesAlMercado > 12 ? `Acorta el tiempo al mercado, hoy ${p.mesesAlMercado} meses`
        : "Asegura los ensayos de estabilidad y el lote piloto"
    });
  }
  const valorGanado = r1(asignacion.reduce((a, x) => a + (x.asignado * x.roiEsperado) / 100, 0));
  return {
    monto, asignacion, sobrante: restante, valorEsperadoGanado: valorGanado,
    nota: "La asignación ordena por retorno esperado y descarta lo que el motor sugiere pausar o cancelar. Es criterio del agente, no un dato."
  };
}

export const META = {
  id: "rd", agentId: "rd", titulo: "Solución R&D",
  bajada: "Inversión, portfolio de proyectos, radar de investigación, competencia y motor de decisión.",
  moneda: "ARS", unidad: "millones",
  fuentes: ["Presupuesto anual", "Moondesk", "WGSN", "IQVia", "ANMAT", "INPI", "Publicaciones científicas"],
  actualizacion: "Proyectos y presupuesto, diario. Radar externo, semanal. Competencia, trimestral.",
  referencia: "Las métricas de inversión y personal siguen el criterio del Manual de Frascati (OCDE).",
  tiposDeDato: [
    { id: "conciliado", label: "Conciliado", detalle: "Ejecución presupuestaria cerrada en Tango." },
    { id: "operativo", label: "Operativo", detalle: "Estado de proyectos y hitos, al día." },
    { id: "proyectado", label: "Proyectado", detalle: "Proyección de cierre del presupuesto." },
    { id: "estimado", label: "Estimado", detalle: "Probabilidades, valor del portfolio e inversión de la competencia. Siempre con el método explicado." }
  ]
};

export function resumen() {
  return {
    meta: META,
    indicadores: indicadores(),
    proyectos: proyectos(),
    radar: RADAR,
    competidores: COMPETIDORES,
    decision: decision(),
    historico: HISTORICO
  };
}
