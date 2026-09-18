// Solución Producción: plan contra demanda, órdenes en plantas de terceros,
// capacidad, costos y flujo de fondos de producción. DATOS SIMULADOS.
import { PRODUCTOS, stock } from "./operaciones.js";

export const HOY = "2026-09-17";
const r1 = (n) => Math.round(n * 10) / 10;
const dias = (fecha) => Math.round((Date.parse(fecha) - Date.parse(HOY)) / 864e5);

export const LEAD_TIME_SEMANAS = 6;

/** Plantas de terceros, sin nombrar proveedores reales en datos de desempeño. */
export const PLANTAS = [
  { id: "p1", label: "Planta 1", especialidad: "Cremas corporales y manos", capacidadMes: 42000, ocupacion: 88, costoUnidad: 2.9, scrap: 1.8, leadTime: 6 },
  { id: "p2", label: "Planta 2", especialidad: "Protección solar", capacidadMes: 26000, ocupacion: 94, costoUnidad: 3.6, scrap: 2.4, leadTime: 6 },
  { id: "p3", label: "Planta 3", especialidad: "Faciales y emulsiones", capacidadMes: 18000, ocupacion: 71, costoUnidad: 4.2, scrap: 1.4, leadTime: 5 },
  { id: "p4", label: "Planta 4", especialidad: "Geles y limpieza", capacidadMes: 15000, ocupacion: 58, costoUnidad: 3.1, scrap: 1.1, leadTime: 4 }
];

// Demanda de septiembre y octubre: la del forecast comercial, con el foco promocional de octubre.
const DEMANDA_BIMESTRE = { fps50: 26000, corporal: 22000, manos: 11000, emulsion: 9500, pies: 5100, gel: 4800 };
const PLAN_ACTUAL = { fps50: 12000, corporal: 8000, manos: 0, emulsion: 4000, pies: 2000, gel: 0 };
const PLANTA_DE = { fps50: "p2", corporal: "p1", manos: "p1", emulsion: "p3", pies: "p1", gel: "p4" };

export function plan() {
  const stockReal = Object.fromEntries(stock().map((p) => [p.id, p]));
  return PRODUCTOS.map((p) => {
    const disponible = stockReal[p.id].real + (p.transito || 0);
    const planificado = PLAN_ACTUAL[p.id];
    const demanda = DEMANDA_BIMESTRE[p.id];
    const saldo = disponible + planificado - demanda;
    const planta = PLANTAS.find((x) => x.id === PLANTA_DE[p.id]);
    return {
      id: p.id, producto: p.label, planta: planta.label, plantaId: planta.id,
      stockReal: stockReal[p.id].real, transito: p.transito || 0, planificado, demanda, saldo,
      cubierto: saldo >= 0,
      faltante: saldo < 0 ? Math.abs(saldo) : 0,
      sobrante: saldo > 0 ? saldo : 0,
      mesesDeSobrante: saldo > 0 ? r1(saldo / (demanda / 2)) : 0,
      costoUnidad: planta.costoUnidad
    };
  });
}

export const ORDENES = [
  { id: "OP-2609", producto: "Protector Solar FPS50 120ml", planta: "Planta 2", unidades: 12000, estado: "En producción", emitida: "2026-08-20", entrega: "2026-10-01", avance: 62 },
  { id: "OP-2610", producto: "Emulsión Facial 50ml", planta: "Planta 3", unidades: 4000, estado: "En producción", emitida: "2026-08-28", entrega: "2026-10-05", avance: 45 },
  { id: "OP-2611", producto: "Crema Corporal 200g", planta: "Planta 1", unidades: 8000, estado: "Planificada", emitida: "—", entrega: "2026-10-20", avance: 0 },
  { id: "OP-2612", producto: "Crema de Pies 100g", planta: "Planta 1", unidades: 2000, estado: "En producción", emitida: "2026-09-02", entrega: "2026-10-12", avance: 28 },
  { id: "OP-2607", producto: "Crema de Manos 50g", planta: "Planta 1", unidades: 6000, estado: "Entregada", emitida: "2026-07-15", entrega: "2026-09-01", avance: 100 }
].map((o) => ({ ...o, diasParaEntrega: o.estado === "Entregada" ? null : dias(o.entrega) }));

export const CUMPLIMIENTO = [
  { mes: "Abr", plan: 38000, real: 34960, pct: 92 },
  { mes: "May", plan: 41000, real: 36080, pct: 88 },
  { mes: "Jun", plan: 36000, real: 34200, pct: 95 },
  { mes: "Jul", plan: 44000, real: 39600, pct: 90 },
  { mes: "Ago", plan: 39000, real: 33540, pct: 86 },
  { mes: "Sep", plan: 42000, real: 38220, pct: 91 }
];

/** Órdenes que el agente sugiere emitir, con su fecha límite por el lead time. */
export function sugerencias() {
  // El ciclo promocional arranca el 06/11: restando el lead time, la orden se emite el 25/09.
  const limite = new Date(Date.parse("2026-11-06") - LEAD_TIME_SEMANAS * 7 * 864e5).toISOString().slice(0, 10);
  return plan().filter((p) => p.faltante > 0).map((p) => {
    const colchon = p.id === "fps50" ? 1800 : 400; // margen por el foco promocional
    const unidades = Math.ceil((p.faltante + colchon) / 100) * 100;
    const planta = PLANTAS.find((x) => x.label === p.planta);
    return {
      producto: p.producto, planta: p.planta, unidades,
      faltante: p.faltante, colchon,
      costo: r1((unidades * planta.costoUnidad) / 1000),
      emitirAntesDe: limite, diasParaDecidir: dias(limite),
      ocupacionPlanta: planta.ocupacion,
      riesgo: planta.ocupacion > 90 ? "La planta está al " + planta.ocupacion + "% de capacidad: conviene confirmar el turno antes de emitir" : "Hay capacidad disponible"
    };
  });
}

export function postergables() {
  return plan().filter((p) => p.sobrante > 0 && p.planificado > 0).map((p) => ({
    producto: p.producto, planta: p.planta, unidades: p.planificado,
    sobrante: p.sobrante, mesesDeSobrante: p.mesesDeSobrante,
    liberaCaja: r1((p.planificado * p.costoUnidad) / 1000),
    nota: `Sobran ${p.sobrante.toLocaleString("es-AR")} unidades, ${p.mesesDeSobrante} bimestres de venta`
  }));
}

/** Flujo de fondos de producción: lo que hay que pagar a las plantas. */
export function flujoDeFondos() {
  const base = [
    { mes: "Septiembre", comprometido: 96, sugerido: 0 },
    { mes: "Octubre", comprometido: 124, sugerido: 0 },
    { mes: "Noviembre", comprometido: 88, sugerido: 0 },
    { mes: "Diciembre", comprometido: 102, sugerido: 0 }
  ];
  const extra = sugerencias().reduce((a, s) => a + s.costo, 0);
  base[1].sugerido = r1(extra * 0.6);
  base[2].sugerido = r1(extra * 0.4);
  return { meses: base, totalComprometido: base.reduce((a, m) => a + m.comprometido, 0), totalSugerido: r1(extra) };
}

export function indicadores() {
  const p = plan();
  const faltantes = p.filter((x) => x.faltante > 0);
  const cumplimiento = r1(CUMPLIMIENTO.reduce((a, m) => a + m.pct, 0) / CUMPLIMIENTO.length);
  const ocupacion = r1(PLANTAS.reduce((a, x) => a + x.ocupacion, 0) / PLANTAS.length);
  const costoPromedio = r1(PLANTAS.reduce((a, x) => a + x.costoUnidad * x.capacidadMes, 0) / PLANTAS.reduce((a, x) => a + x.capacidadMes, 0));
  const flujo = flujoDeFondos();
  return {
    kpis: [
      { id: "cobertura", label: "Productos cubiertos", valor: p.length - faltantes.length, unidad: `de ${p.length}`, tipo: "proyectado", detalle: "Stock más plan contra la demanda del bimestre" },
      { id: "faltante", label: "Faltante total", valor: faltantes.reduce((a, x) => a + x.faltante, 0), unidad: "unidades", tipo: "proyectado", detalle: faltantes.map((x) => x.producto.split(" ")[0]).join(" y ") },
      { id: "cumplimiento", label: "Cumplimiento del plan", valor: cumplimiento, unidad: "%", contra: 95, tipo: "conciliado", detalle: "Promedio de los últimos 6 meses" },
      { id: "ocupacion", label: "Ocupación de plantas", valor: ocupacion, unidad: "%", contra: 85, tipo: "operativo", detalle: "Promedio de las 4 plantas contratadas" },
      { id: "costo", label: "Costo de producción", valor: costoPromedio, unidad: "ARS por unidad", contra: 3.2, tipo: "conciliado", detalle: "Ponderado por capacidad" },
      { id: "leadtime", label: "Lead time", valor: LEAD_TIME_SEMANAS, unidad: "semanas", tipo: "conciliado", detalle: "De la orden a la entrega en depósito" },
      { id: "comprometido", label: "Comprometido con plantas", valor: flujo.totalComprometido, unidad: "ARS M", tipo: "proyectado", detalle: "Septiembre a diciembre" },
      { id: "decidir", label: "Días para decidir", valor: sugerencias()[0]?.diasParaDecidir ?? 0, unidad: "días", tipo: "proyectado", detalle: "Antes de que el lead time deje sin margen a octubre" }
    ],
    alertas: [
      ...sugerencias().map((s) => ({ sev: "crit", t: `${s.producto}: faltan ${s.faltante.toLocaleString("es-AR")} unidades. Emitir ${s.unidades.toLocaleString("es-AR")} u antes del ${s.emitirAntesDe.slice(8)}/${s.emitirAntesDe.slice(5, 7)}`, tipo: "proyectado" })),
      ...postergables().map((x) => ({ sev: "warn", t: `${x.producto}: el lote planificado de ${x.unidades.toLocaleString("es-AR")} u no hace falta. Postergarlo libera ARS ${x.liberaCaja} M`, tipo: "proyectado" })),
      { sev: "warn", t: `Planta 2 al 94% de capacidad, justo donde hay que producir el protector solar`, tipo: "operativo" },
      { sev: "warn", t: `Cumplimiento del plan en ${cumplimiento}%, por debajo del objetivo de 95%`, tipo: "conciliado" },
      { sev: "info", t: "Planta 4 al 58%: hay capacidad ociosa para adelantar geles", tipo: "operativo" }
    ]
  };
}

/** Qué pasa si se aprueban las órdenes sugeridas y se posterga lo que sobra. */
export function simular({ aprobarSugeridas = true, postergarSobrantes = true } = {}) {
  const base = plan();
  const sug = sugerencias();
  const post = postergables();
  const resultado = base.map((p) => {
    const extra = aprobarSugeridas ? (sug.find((s) => s.producto === p.producto)?.unidades || 0) : 0;
    const menos = postergarSobrantes ? (post.find((x) => x.producto === p.producto)?.unidades || 0) : 0;
    const saldo = p.saldo + extra - menos;
    return { producto: p.producto, saldoAntes: p.saldo, saldoDespues: saldo, cubierto: saldo >= 0 };
  });
  const costoExtra = aprobarSugeridas ? r1(sug.reduce((a, s) => a + s.costo, 0)) : 0;
  const cajaLiberada = postergarSobrantes ? r1(post.reduce((a, x) => a + x.liberaCaja, 0)) : 0;
  return {
    resultado, costoExtra, cajaLiberada, impactoNeto: r1(costoExtra - cajaLiberada),
    cubiertos: resultado.filter((r) => r.cubierto).length, total: resultado.length,
    nota: "El impacto neto va al flujo de fondos de la solución Finanzas"
  };
}

export const META = {
  id: "produccion", agentId: "produccion", titulo: "Solución Producción",
  bajada: "Plan contra demanda, órdenes en plantas de terceros, capacidad, costos y flujo de fondos.",
  moneda: "ARS", unidad: "millones",
  fuentes: ["Capataz", "Tango", "Disprofarma", "Grilla promocional"],
  actualizacion: "Plan y órdenes, diario. Costos y cumplimiento, mensual al cierre.",
  tiposDeDato: [
    { id: "conciliado", label: "Conciliado", detalle: "Costos y cumplimiento de los meses cerrados." },
    { id: "operativo", label: "Operativo", detalle: "Órdenes en curso y ocupación de plantas." },
    { id: "proyectado", label: "Proyectado", detalle: "Plan contra demanda del bimestre y flujo comprometido." },
    { id: "estimado", label: "Estimado", detalle: "Colchón sugerido en cada orden. Método: foco promocional del ciclo." }
  ]
};

export function resumen() {
  return {
    meta: META, indicadores: indicadores(), plan: plan(), ordenes: ORDENES,
    plantas: PLANTAS, cumplimiento: CUMPLIMIENTO, sugerencias: sugerencias(),
    postergables: postergables(), flujo: flujoDeFondos(), leadTime: LEAD_TIME_SEMANAS
  };
}
