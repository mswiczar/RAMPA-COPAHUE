// Solución Operaciones: stock real unificado, vencimientos, quiebres en el canal y logística.
// DATOS SIMULADOS, consistentes con las soluciones Comercial, Finanzas y Producción.

export const HOY = "2026-09-17";
const r1 = (n) => Math.round(n * 10) / 10;
const dias = (fecha) => Math.round((Date.parse(fecha) - Date.parse(HOY)) / 864e5);
const n = (v, dec = 0) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);

/** Catálogo compartido: lo usan también Producción y las consultas del chat. */
export const PRODUCTOS = [
  { id: "fps50", label: "Protector Solar FPS50 120ml", tango: 11200, disprofarma: 8300, shipnow: 1500, transito: 0, demandaMes: 13000, precio: 7.4, foco: true },
  { id: "corporal", label: "Crema Corporal 200g", tango: 30200, disprofarma: 27400, shipnow: 3600, transito: 2400, demandaMes: 11000, precio: 6.1 },
  { id: "emulsion", label: "Emulsión Facial 50ml", tango: 4600, disprofarma: 3300, shipnow: 600, transito: 0, demandaMes: 4750, precio: 9.8, foco: true },
  { id: "manos", label: "Crema de Manos 50g", tango: 14500, disprofarma: 13100, shipnow: 1400, transito: 0, demandaMes: 5500, precio: 4.2 },
  { id: "pies", label: "Crema de Pies 100g", tango: 7300, disprofarma: 6500, shipnow: 700, transito: 1200, demandaMes: 2550, precio: 5.3 },
  { id: "gel", label: "Gel Limpiador 150ml", tango: 5600, disprofarma: 5000, shipnow: 600, transito: 0, demandaMes: 2400, precio: 5.9 }
];

const COBERTURA_OBJETIVO = 45; // días de stock

export function stock() {
  return PRODUCTOS.map((p) => {
    const real = p.disprofarma + p.shipnow;
    const cobertura = r1((real / p.demandaMes) * 30);
    const estado = cobertura < 20 ? "crit" : cobertura < 35 ? "warn" : cobertura > 90 ? "info" : "ok";
    return {
      ...p, real, diferencia: real - p.tango,
      cobertura, estado,
      reposicionSugerida: Math.max(0, Math.round(((COBERTURA_OBJETIVO - cobertura) / 30) * p.demandaMes - p.transito)),
      valorizado: r1((real * p.precio) / 1000) // ARS millones
    };
  });
}

export const LOTES = [
  { producto: "Crema de Pies 100g", lote: "L2311", unidades: 2100, vence: "2026-11-30", deposito: "Disprofarma" },
  { producto: "Gel Limpiador 150ml", lote: "L2402", unidades: 900, vence: "2026-12-15", deposito: "Disprofarma" },
  { producto: "Emulsión Facial 50ml", lote: "L2405", unidades: 600, vence: "2027-01-22", deposito: "Ship Now" },
  { producto: "Crema Corporal 200g", lote: "L2312", unidades: 3400, vence: "2027-02-05", deposito: "Disprofarma" }
].map((l) => ({ ...l, diasParaVencer: dias(l.vence), critico: dias(l.vence) < 90 }));

/** Relevamiento diario de 60 tiendas online de farmacias, con la serie de la semana. */
export const TIENDAS_RELEVADAS = 60;
export const QUIEBRES = [
  { producto: "Protector Solar FPS50 120ml", sinStock: 23, serie: [14, 16, 17, 19, 21, 22, 23], cadenas: ["Cadena Norte", "Cadena Sur", "Farmacias online independientes"] },
  { producto: "Emulsión Facial 50ml", sinStock: 11, serie: [9, 9, 10, 10, 11, 11, 11], cadenas: ["Cadena Centro", "Cadena Norte"] },
  { producto: "Gel Limpiador 150ml", sinStock: 6, serie: [8, 7, 7, 6, 6, 6, 6], cadenas: ["Farmacias online independientes"] },
  { producto: "Crema Corporal 200g", sinStock: 4, serie: [5, 5, 4, 4, 4, 4, 4], cadenas: ["Cadena Sur"] }
].map((q) => ({ ...q, pct: r1((q.sinStock / TIENDAS_RELEVADAS) * 100), tendencia: q.serie.at(-1) - q.serie[0] }));

export const ENTREGAS = {
  otif: 94.2, otifObjetivo: 97, pedidosMes: 486, pedidosConDemora: 28,
  costoLogisticoUnidad: 168, costoLogisticoPct: 5.2,
  porOperador: [
    { operador: "Disprofarma", pedidos: 342, otif: 95.1, demoraProm: 1.2, incidencias: 12 },
    { operador: "Ship Now", pedidos: 118, otif: 93.4, demoraProm: 1.8, incidencias: 9 },
    { operador: "Retiro en depósito", pedidos: 26, otif: 88.5, demoraProm: 2.4, incidencias: 7 }
  ],
  enTransito: [
    { orden: "TR-4412", producto: "Crema Corporal 200g", unidades: 2400, desde: "Planta 2", hacia: "Disprofarma", eta: "2026-09-22" },
    { orden: "TR-4415", producto: "Crema de Pies 100g", unidades: 1200, desde: "Planta 3", hacia: "Disprofarma", eta: "2026-09-25" },
    { orden: "TR-4418", producto: "Crema de Manos 50g", unidades: 1800, desde: "Planta 1", hacia: "Ship Now", eta: "2026-09-29" }
  ].map((t) => ({ ...t, diasParaLlegar: dias(t.eta) })),
  incidencias: [
    { tipo: "Entrega rechazada por documentación", casos: 9, operador: "Disprofarma" },
    { tipo: "Faltante en el bulto", casos: 7, operador: "Ship Now" },
    { tipo: "Demora de más de 48 horas", casos: 12, operador: "Disprofarma" }
  ]
};

export function indicadores() {
  const s = stock();
  const fps = s.find((p) => p.id === "fps50");
  const enQuiebre = s.filter((p) => p.estado === "crit" || p.estado === "warn");
  const diferencias = s.filter((p) => p.diferencia !== 0);
  const valorTotal = r1(s.reduce((a, p) => a + p.valorizado, 0));
  const ventaPerdida = r1((QUIEBRES.reduce((a, q) => a + q.sinStock, 0) / TIENDAS_RELEVADAS) * 0.18 * 1288 * 0.3);

  return {
    kpis: [
      { id: "cobertura", label: "Cobertura promedio", valor: r1(s.reduce((a, p) => a + p.cobertura, 0) / s.length), unidad: "días", contra: COBERTURA_OBJETIVO, tipo: "operativo", detalle: "Stock real sobre demanda mensual" },
      { id: "valor", label: "Inventario valorizado", valor: valorTotal, unidad: "ARS M", tipo: "operativo", detalle: "A precio de costo, en los tres depósitos" },
      { id: "diferencia", label: "Diferencia con Tango", valor: r1(s.reduce((a, p) => a + p.diferencia, 0)), unidad: "unidades", tipo: "operativo", detalle: `${diferencias.length} productos con diferencia entre el ERP y el depósito` },
      { id: "quiebres", label: "Quiebres en farmacias online", valor: r1((QUIEBRES[0].sinStock / TIENDAS_RELEVADAS) * 100), unidad: "% de tiendas", contra: 10, tipo: "operativo", detalle: `Protector solar FPS50, en ${QUIEBRES[0].sinStock} de ${TIENDAS_RELEVADAS} tiendas` },
      { id: "otif", label: "Entregas a tiempo y completas", valor: ENTREGAS.otif, unidad: "%", contra: ENTREGAS.otifObjetivo, tipo: "conciliado", detalle: `${ENTREGAS.pedidosConDemora} pedidos con demora sobre ${ENTREGAS.pedidosMes}` },
      { id: "costo", label: "Costo logístico", valor: ENTREGAS.costoLogisticoPct, unidad: "% de ventas", contra: 4.5, tipo: "conciliado", detalle: `ARS ${ENTREGAS.costoLogisticoUnidad} por unidad entregada` },
      { id: "vencer", label: "Por vencer a 90 días", valor: LOTES.filter((l) => l.critico).reduce((a, l) => a + l.unidades, 0), unidad: "unidades", tipo: "operativo", detalle: `${LOTES.filter((l) => l.critico).length} lotes` },
      { id: "perdida", label: "Venta perdida estimada", valor: ventaPerdida, unidad: "ARS M", tipo: "estimado", detalle: "Por quiebres del mes; método: tiendas sin stock por rotación media" }
    ],
    enQuiebre: enQuiebre.map((p) => p.label),
    alertas: [
      { sev: "crit", t: `Protector Solar FPS50: ${n(fps.cobertura, 1)} días de cobertura y quiebre en ${QUIEBRES[0].sinStock} de ${TIENDAS_RELEVADAS} tiendas online`, tipo: "operativo" },
      { sev: "crit", t: `Tango tiene ${n(Math.abs(fps.diferencia))} unidades más de FPS50 que el depósito: el plan de producción se está armando con un stock que no existe`, tipo: "operativo" },
      { sev: "warn", t: `Emulsión Facial: ${n(s.find((p) => p.id === "emulsion").cobertura, 1)} días de cobertura, por debajo del objetivo de ${COBERTURA_OBJETIVO}`, tipo: "operativo" },
      { sev: "warn", t: `Lote L2311 de Crema de Pies: 2.100 unidades vencen en ${LOTES[0].diasParaVencer} días`, tipo: "operativo" },
      { sev: "warn", t: `Entregas a tiempo y completas en ${n(ENTREGAS.otif, 1)}%, contra un objetivo de ${ENTREGAS.otifObjetivo}%`, tipo: "conciliado" },
      { sev: "info", t: `Crema Corporal: ${n(s.find((p) => p.id === "corporal").cobertura, 1)} días de cobertura, casi el triple del objetivo`, tipo: "operativo" }
    ]
  };
}

/** Qué significa el stock de hoy para las otras áreas. */
export function integracion() {
  const s = stock();
  const fps = s.find((p) => p.id === "fps50");
  const emulsion = s.find((p) => p.id === "emulsion");
  const corporal = s.find((p) => p.id === "corporal");
  return {
    comercial: {
      nota: "Cinco oportunidades por ARS 96 M se perdieron por falta de stock al momento de la propuesta",
      detalle: `FPS50 y Emulsión Facial están en quiebre justo en el ciclo promocional de octubre`,
      accion: "Avisar a la fuerza de ventas antes de prometer entrega"
    },
    produccion: {
      faltanteFps50: Math.max(0, 26000 - (fps.real + 12000)),
      faltanteEmulsion: Math.max(0, 9500 - (emulsion.real + 4000)),
      nota: "El faltante ya está calculado con el stock real, no con el de Tango",
      accion: "Emitir las órdenes adicionales antes del 25/09 por el lead time de 6 semanas"
    },
    finanzas: {
      inventario: r1(s.reduce((a, p) => a + p.valorizado, 0)),
      inmovilizado: r1(corporal.valorizado * 0.55),
      nota: `Crema Corporal inmoviliza unos ARS ${r1(corporal.valorizado * 0.55)} M por encima de la cobertura objetivo`,
      accion: "Postergar el lote planificado libera capital de trabajo"
    }
  };
}

export const META = {
  id: "operaciones", agentId: "operaciones", titulo: "Solución Operaciones",
  bajada: "Stock real unificado, vencimientos, quiebres en el canal y desempeño logístico.",
  moneda: "ARS", unidad: "millones",
  fuentes: ["Tango", "Disprofarma", "Ship Now", "Informe de stock online", "Capataz"],
  actualizacion: "Stock y entregas, cada hora. Relevamiento de tiendas online, diario a las 7:00.",
  tiposDeDato: [
    { id: "conciliado", label: "Conciliado", detalle: "Entregas y costos cerrados del mes." },
    { id: "operativo", label: "Operativo", detalle: "Stock y quiebres del día, sin cerrar." },
    { id: "proyectado", label: "Proyectado", detalle: "Cobertura y reposición según la demanda prevista." },
    { id: "estimado", label: "Estimado", detalle: "Venta perdida por quiebre. Método: tiendas sin stock por rotación media." }
  ]
};

export function resumen() {
  return { meta: META, indicadores: indicadores(), stock: stock(), lotes: LOTES, quiebres: QUIEBRES, tiendasRelevadas: TIENDAS_RELEVADAS, entregas: ENTREGAS, integracion: integracion(), coberturaObjetivo: COBERTURA_OBJETIVO };
}
