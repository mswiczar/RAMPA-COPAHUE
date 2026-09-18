// Solución Comercial: pipeline, objetivos, funnel, forecast, clientes e inteligencia.
// DATOS SIMULADOS. Cada bloque declara su tipo de dato y su frecuencia de actualización.
import * as finanzas from "./finanzas.js";

export const HOY = "2026-09-17";
const r1 = (n) => Math.round(n * 10) / 10;
const pct = (a, b) => (b ? r1(((a - b) / b) * 100) : 0);
const dias = (desde) => Math.round((Date.parse(HOY) - Date.parse(desde)) / 864e5);

export const ETAPAS = [
  { id: "prospecto", label: "Prospecto", prob: 0.1 },
  { id: "contacto", label: "Contacto y relevamiento", prob: 0.25 },
  { id: "propuesta", label: "Propuesta enviada", prob: 0.45 },
  { id: "negociacion", label: "Negociación", prob: 0.7 },
  { id: "cierre", label: "Cierre administrativo", prob: 0.9 }
];
const PROB = Object.fromEntries(ETAPAS.map((e) => [e.id, e.prob]));

export const VENDEDORES = [
  { id: "kam01", label: "KAM Droguerías", rol: "KAM", territorio: "Nacional", cuota: 980, ventas: 742, margen: 0.34, cobranza: 0.82, retencion: 0.94, precisionForecast: 0.89, descuentoProm: 13.5, nuevosClientes: 1 },
  { id: "kam02", label: "KAM Cadenas", rol: "KAM", territorio: "Nacional", cuota: 620, ventas: 534, margen: 0.41, cobranza: 0.95, retencion: 0.91, precisionForecast: 0.93, descuentoProm: 11.2, nuevosClientes: 3 },
  { id: "apm01", label: "APM-01 AMBA Norte", rol: "Visitador médico", territorio: "AMBA Norte", cuota: 300, ventas: 268, margen: 0.46, cobranza: 0.98, retencion: 0.88, precisionForecast: 0.86, descuentoProm: 9.4, nuevosClientes: 6 },
  { id: "apm02", label: "APM-02 AMBA Sur", rol: "Visitador médico", territorio: "AMBA Sur", cuota: 300, ventas: 205, margen: 0.44, cobranza: 0.9, retencion: 0.79, precisionForecast: 0.64, descuentoProm: 15.8, nuevosClientes: 2 },
  { id: "apm03", label: "APM-03 Córdoba", rol: "Gestor punto de venta", territorio: "Córdoba", cuota: 260, ventas: 262, margen: 0.45, cobranza: 0.96, retencion: 0.9, precisionForecast: 0.91, descuentoProm: 10.1, nuevosClientes: 5 },
  { id: "apm05", label: "APM-05 Mendoza", rol: "Visitador médico", territorio: "Cuyo", cuota: 240, ventas: 158, margen: 0.42, cobranza: 0.88, retencion: 0.76, precisionForecast: 0.58, descuentoProm: 16.4, nuevosClientes: 1 },
  { id: "apm06", label: "APM-06 Patagonia", rol: "Visitador médico", territorio: "Patagonia", cuota: 250, ventas: 271, margen: 0.48, cobranza: 0.97, retencion: 0.93, precisionForecast: 0.9, descuentoProm: 8.7, nuevosClientes: 4 }
];

const SEGMENTOS = { drogueria: "Droguería", cadena: "Cadena de farmacias", farmacia: "Farmacia independiente", ecommerce: "E-commerce" };

// [id, cliente, segmento, canal, region, vendedor, producto, monto, etapa, cierre, ultimaActividad, proximaAccion]
const OPS = [
  ["op-101", "Droguería A", "drogueria", "Droguerías", "AMBA", "kam01", "Línea completa", 186, "negociacion", "2026-10-10", "2026-09-15", "Enviar propuesta final con grilla de octubre"],
  ["op-102", "Droguería B", "drogueria", "Droguerías", "AMBA", "kam01", "Línea completa", 142, "cierre", "2026-09-30", "2026-09-16", "Firmar renovación antes del preaviso del 01/10"],
  ["op-103", "Droguería C", "drogueria", "Droguerías", "Litoral", "kam01", "Protector Solar FPS50", 64, "propuesta", "2026-11-05", "2026-08-21", "Reunión de seguimiento, sin respuesta hace 27 días"],
  ["op-104", "Cadena Norte", "cadena", "Cadenas", "AMBA", "kam02", "Góndola destacada verano", 98, "negociacion", "2026-10-20", "2026-09-12", "Negociar espacio y descuento de temporada"],
  ["op-105", "Cadena Sur", "cadena", "Cadenas", "AMBA", "kam02", "Alta de Emulsión Facial", 57, "propuesta", "2026-10-28", "2026-09-09", "Presentar estudio de rotación"],
  ["op-106", "Cadena Centro", "cadena", "Cadenas", "Córdoba", "kam02", "Línea corporal", 72, "contacto", "2026-12-05", "2026-09-05", "Agendar visita con la gerencia de compras"],
  ["op-107", "Farmacia del Plata", "farmacia", "Farmacias", "AMBA", "apm01", "Kit dermo verano", 18, "cierre", "2026-09-26", "2026-09-16", "Cerrar pedido inicial"],
  ["op-108", "Farmacia Belgrano", "farmacia", "Farmacias", "AMBA", "apm01", "Protector Solar FPS50", 12, "negociacion", "2026-10-02", "2026-09-14", "Confirmar exhibidor"],
  ["op-109", "Farmacia Sur Salud", "farmacia", "Farmacias", "AMBA", "apm02", "Línea manos y pies", 9, "propuesta", "2026-10-15", "2026-08-12", "Sin contacto hace 36 días"],
  ["op-110", "Red Farmacias Quilmes", "farmacia", "Farmacias", "AMBA", "apm02", "Alta de línea", 34, "contacto", "2026-11-20", "2026-09-02", "Enviar muestras a 4 sucursales"],
  ["op-111", "Farmacia Nueva Córdoba", "farmacia", "Farmacias", "Córdoba", "apm03", "Kit dermo verano", 21, "negociacion", "2026-10-08", "2026-09-15", "Acordar plan de reposición"],
  ["op-112", "Cadena Mediterránea", "cadena", "Cadenas", "Córdoba", "apm03", "Góndola destacada", 46, "propuesta", "2026-11-12", "2026-09-10", "Seguimiento de propuesta"],
  ["op-113", "Farmacia Andina", "farmacia", "Farmacias", "Cuyo", "apm05", "Línea completa", 16, "contacto", "2026-11-30", "2026-08-18", "Reagendar visita, cancelada dos veces"],
  ["op-114", "Droguería Cuyana", "drogueria", "Droguerías", "Cuyo", "apm05", "Protector Solar FPS50", 41, "prospecto", "2026-12-18", "2026-08-25", "Primera reunión pendiente"],
  ["op-115", "Farmacia del Lago", "farmacia", "Farmacias", "Patagonia", "apm06", "Kit dermo verano", 23, "cierre", "2026-09-29", "2026-09-16", "Enviar orden de compra a administración"],
  ["op-116", "Cadena Patagónica", "cadena", "Cadenas", "Patagonia", "apm06", "Línea corporal", 68, "negociacion", "2026-10-25", "2026-09-13", "Cerrar volumen anual"],
  ["op-117", "Farmacia Caviahue", "farmacia", "Farmacias", "Patagonia", "apm06", "Alta de línea", 11, "propuesta", "2026-10-18", "2026-09-08", "Definir surtido inicial"],
  ["op-118", "Marketplace Salud", "ecommerce", "E-commerce", "Nacional", "kam02", "Tienda oficial", 52, "contacto", "2026-12-10", "2026-09-04", "Evaluar condiciones comerciales"],
  ["op-119", "Farmacia Litoral", "farmacia", "Farmacias", "Litoral", "apm01", "Línea completa", 14, "prospecto", "2027-01-15", "2026-09-01", "Calificar potencial de la cuenta"],
  ["op-120", "Droguería del Norte", "drogueria", "Droguerías", "NOA", "kam01", "Línea completa", 88, "propuesta", "2026-11-28", "2026-07-30", "Propuesta sin respuesta hace 49 días"],
  ["op-121", "Cadena Rosario", "cadena", "Cadenas", "Litoral", "kam02", "Alta de Gel Limpiador", 29, "negociacion", "2026-10-30", "2026-09-11", "Ajustar precio de lista"],
  ["op-122", "Farmacia Tucumán Centro", "farmacia", "Farmacias", "NOA", "apm03", "Kit dermo verano", 13, "contacto", "2026-11-08", "2026-09-06", "Visita de relevamiento"]
];

const CERRADAS = [
  { id: "op-090", cliente: "Cadena Norte", vendedor: "kam02", producto: "Línea corporal", monto: 76, estado: "ganado", fecha: "2026-08-28" },
  { id: "op-091", cliente: "Farmacia Belgrano", vendedor: "apm01", producto: "Kit dermo invierno", monto: 15, estado: "ganado", fecha: "2026-08-22" },
  { id: "op-092", cliente: "Droguería Cuyana", vendedor: "apm05", producto: "Línea manos", monto: 38, estado: "perdido", fecha: "2026-08-19", motivo: "Precio de la competencia" },
  { id: "op-093", cliente: "Farmacia Sur Salud", vendedor: "apm02", producto: "Línea completa", monto: 22, estado: "perdido", fecha: "2026-09-02", motivo: "Sin stock en el momento de la propuesta" },
  { id: "op-094", cliente: "Cadena Mediterránea", vendedor: "apm03", producto: "Alta de línea", monto: 31, estado: "ganado", fecha: "2026-09-08" },
  { id: "op-095", cliente: "Marketplace Salud", vendedor: "kam02", producto: "Tienda oficial", monto: 44, estado: "postergado", fecha: "2026-09-05", motivo: "Definición presupuestaria del cliente" },
  { id: "op-096", cliente: "Farmacia Andina", vendedor: "apm05", producto: "Kit dermo verano", monto: 12, estado: "perdido", fecha: "2026-09-10", motivo: "Falta de seguimiento" },
  { id: "op-097", cliente: "Farmacia del Lago", vendedor: "apm06", producto: "Línea corporal", monto: 19, estado: "ganado", fecha: "2026-09-12" }
];

export const MOTIVOS_PERDIDA = [
  { motivo: "Precio de la competencia", casos: 7, monto: 148 },
  { motivo: "Sin stock al momento de la propuesta", casos: 5, monto: 96 },
  { motivo: "Falta de seguimiento", casos: 4, monto: 61 },
  { motivo: "Decisión postergada por el cliente", casos: 3, monto: 54 },
  { motivo: "Condiciones de pago", casos: 2, monto: 37 }
];

export function oportunidades() {
  return OPS.map(([id, cliente, segmento, canal, region, vendedor, producto, monto, etapa, cierre, ultima, accion]) => {
    const sinMovimiento = dias(ultima);
    return {
      id, cliente, segmento: SEGMENTOS[segmento], canal, region, producto, monto,
      vendedor, vendedorLabel: VENDEDORES.find((v) => v.id === vendedor).label,
      etapa, etapaLabel: ETAPAS.find((e) => e.id === etapa).label,
      probabilidad: Math.round(PROB[etapa] * 100),
      ponderado: r1(monto * PROB[etapa]),
      cierreProbable: cierre, ultimaActividad: ultima, sinMovimiento,
      estancada: sinMovimiento > 21,
      proximaAccion: accion
    };
  });
}

const sum = (arr, f) => r1(arr.reduce((a, x) => a + f(x), 0));

export function pipeline() {
  const ops = oportunidades();
  const porEtapa = ETAPAS.map((e) => {
    const lista = ops.filter((o) => o.etapa === e.id);
    return { id: e.id, label: e.label, cantidad: lista.length, bruto: sum(lista, (o) => o.monto), ponderado: sum(lista, (o) => o.ponderado), probabilidad: Math.round(e.prob * 100) };
  });
  const agrupar = (campo) => {
    const mapa = new Map();
    for (const o of ops) {
      const k = o[campo];
      const acc = mapa.get(k) || { label: k, bruto: 0, ponderado: 0, cantidad: 0 };
      acc.bruto = r1(acc.bruto + o.monto);
      acc.ponderado = r1(acc.ponderado + o.ponderado);
      acc.cantidad++;
      mapa.set(k, acc);
    }
    return [...mapa.values()].sort((a, b) => b.bruto - a.bruto);
  };
  return {
    bruto: sum(ops, (o) => o.monto), ponderado: sum(ops, (o) => o.ponderado), cantidad: ops.length,
    porEtapa,
    porVendedor: agrupar("vendedorLabel"), porSegmento: agrupar("segmento"), porCanal: agrupar("canal"),
    porRegion: agrupar("region"), porProducto: agrupar("producto"), porCliente: agrupar("cliente"),
    estancadas: ops.filter((o) => o.estancada).sort((a, b) => b.sinMovimiento - a.sinMovimiento),
    nuevasDelMes: 6,
    cerradas: CERRADAS,
    ganado: sum(CERRADAS.filter((c) => c.estado === "ganado"), (c) => c.monto),
    perdido: sum(CERRADAS.filter((c) => c.estado === "perdido"), (c) => c.monto),
    postergado: sum(CERRADAS.filter((c) => c.estado === "postergado"), (c) => c.monto),
    motivosPerdida: MOTIVOS_PERDIDA
  };
}

/** Ranking por calidad de la venta, no solo por facturación. */
export function desempeno() {
  const maxVentas = Math.max(...VENDEDORES.map((v) => v.ventas));
  const vendedores = VENDEDORES.map((v) => {
    const cumplimiento = r1((v.ventas / v.cuota) * 100);
    const proyeccion = r1(cumplimiento * 1.28); // ritmo actual hasta el cierre del trimestre
    const score = r1(
      (v.ventas / maxVentas) * 35 + v.margen * 60 + v.cobranza * 20 + v.retencion * 15 - (v.descuentoProm / 100) * 30
    );
    return { ...v, cumplimiento, proyeccion, margenPct: r1(v.margen * 100), cobranzaPct: r1(v.cobranza * 100), retencionPct: r1(v.retencion * 100), precisionPct: r1(v.precisionForecast * 100), score };
  }).sort((a, b) => b.score - a.score).map((v, i) => ({ ...v, puesto: i + 1 }));

  const equipo = {
    cuota: sum(VENDEDORES, (v) => v.cuota), ventas: sum(VENDEDORES, (v) => v.ventas),
    nuevosClientes: VENDEDORES.reduce((a, v) => a + v.nuevosClientes, 0)
  };
  equipo.cumplimiento = r1((equipo.ventas / equipo.cuota) * 100);
  equipo.contraTrimestreAnterior = 6.4;
  return { vendedores, equipo };
}

// Cumplimiento mensual contra la cuota del mes, de enero a agosto (meses cerrados).
const MENSUAL = {
  kam01: [91, 94, 88, 97, 93, 90, 88, 84],
  kam02: [96, 99, 102, 98, 101, 97, 102, 99],
  apm01: [104, 101, 99, 106, 103, 108, 108, 102],
  apm02: [97, 95, 92, 94, 90, 87, 84, 74],
  apm03: [98, 103, 107, 104, 110, 112, 118, 120],
  apm05: [88, 84, 90, 86, 82, 79, 80, 72],
  apm06: [109, 106, 112, 115, 111, 118, 130, 128]
};

/**
 * Vendedor × mes. Septiembre está en curso: se mide contra la cuota prorrateada al día de hoy
 * y se despeja para que el trimestre coincida con el cumplimiento de la cuota.
 */
export function cumplimientoMensual() {
  const diaDelMes = Number(HOY.slice(8)) / 30;
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep"];
  const filas = VENDEDORES.map((v) => {
    const serie = MENSUAL[v.id];
    const trimestre = v.ventas / v.cuota;
    const sep = Math.round(((3 * trimestre - serie[6] / 100 - serie[7] / 100) / diaDelMes) * 100);
    const valores = [...serie, sep];
    const ultimos3 = valores.slice(-3);
    return {
      id: v.id, label: v.label, territorio: v.territorio, valores,
      tendencia: ultimos3[2] - ultimos3[0],
      // Tres meses seguidos debajo del 85%: es una caída sostenida, no un mes malo.
      bajoSostenido: ultimos3.every((x) => x < 85)
    };
  });
  return { meses, enCurso: 8, filas, nota: "Septiembre, al día 17 contra la cuota prorrateada" };
}

export function funnel() {
  const etapas = [
    { etapa: "Leads trabajados", cantidad: 412, dias: 2 },
    { etapa: "Contacto y relevamiento", cantidad: 236, dias: 11 },
    { etapa: "Propuesta enviada", cantidad: 128, dias: 18 },
    { etapa: "Negociación", cantidad: 64, dias: 26 },
    { etapa: "Ganados", cantidad: 31, dias: 9 }
  ].map((e, i, arr) => ({ ...e, conversion: i === 0 ? 100 : r1((e.cantidad / arr[i - 1].cantidad) * 100) }));
  const ciclo = etapas.reduce((a, e) => a + e.dias, 0);
  const ticket = 34.6;
  const winRate = r1((31 / 412) * 100);
  const velocidad = r1((128 * ticket * (31 / 128)) / ciclo); // ARS M por día en el embudo
  return {
    etapas, ciclo, ticket, winRate, velocidad,
    cuelloDeBotella: "Propuesta enviada → Negociación: solo convierte el 50% y es la etapa más larga después de negociación",
    actividad: [
      { tipo: "Visitas y reuniones", cantidad: 910, contra: 980 },
      { tipo: "Llamadas y videollamadas", cantidad: 324, contra: 300 },
      { tipo: "Propuestas enviadas", cantidad: 128, contra: 140 },
      { tipo: "Muestras entregadas", cantidad: 186, contra: 160 }
    ],
    tiempoRespuesta: { valor: 26, unidad: "horas", objetivo: 8 },
    leads: [
      { origen: "Visita médica (Elvis)", recibidos: 148, trabajados: 141, ganados: 14, inversion: 0, tipo: "conciliado" },
      { origen: "Congresos y eventos", recibidos: 62, trabajados: 51, ganados: 5, inversion: 6, tipo: "conciliado" },
      { origen: "Web propia", recibidos: 96, trabajados: 78, ganados: 6, inversion: 18.5, tipo: "operativo" },
      { origen: "Campañas Meta", recibidos: 74, trabajados: 52, ganados: 3, inversion: 22, tipo: "operativo" },
      { origen: "Referidos", recibidos: 32, trabajados: 32, ganados: 3, inversion: 0, tipo: "conciliado" }
    ].map((l) => ({ ...l, abandonados: l.recibidos - l.trabajados, conversion: r1((l.ganados / l.recibidos) * 100), roi: l.inversion ? r1((l.ganados * 34.6) / l.inversion) : null }))
  };
}

/** Forecast del trimestre en curso (3T 2026, cierra el 30/09): base instalada + pipeline. */
export function forecast() {
  const ops = oportunidades();
  const delTrimestre = ops.filter((o) => o.cierreProbable <= "2026-09-30");
  const ponderado = sum(delTrimestre, (o) => o.ponderado);
  const declarado = sum(delTrimestre.filter((o) => ["negociacion", "cierre"].includes(o.etapa)), (o) => o.monto);
  const recurrente = 296; // reposición de la base instalada que falta facturar en septiembre
  const objetivo = sum(VENDEDORES, (v) => v.cuota);
  const vendido = sum(VENDEDORES, (v) => v.ventas);
  const tasaCierre = 31 / 128; // de propuesta enviada a negocio ganado

  const metodos = [
    { id: "declarado", label: "Declarado por los vendedores", valor: r1(vendido + recurrente + declarado), tipo: "operativo", nota: "Compromiso cargado en Elvis, sin descontar riesgo" },
    { id: "ponderado", label: "Probabilidad por etapa", valor: r1(vendido + recurrente + ponderado), tipo: "operativo", nota: "Pipeline del trimestre por la probabilidad de cada etapa" },
    { id: "historico", label: "Comportamiento histórico", valor: r1(vendido + recurrente * 0.94 + ponderado * 0.88), tipo: "estimado", nota: "Conversión real de los últimos 4 trimestres" },
    { id: "ia", label: "Modelo del agente", valor: r1(vendido + recurrente * 0.96 + ponderado * 0.9), tipo: "estimado", nota: "Mezcla los tres anteriores y castiga a los vendedores con forecast poco preciso" }
  ];
  const ia = metodos[3].valor;
  const escenarios = [
    { id: "conservador", label: "Conservador", valor: r1(vendido + recurrente * 0.85 + ponderado * 0.6), detalle: "Solo lo que está en cierre y la reposición segura de la base instalada" },
    { id: "probable", label: "Probable", valor: ia, detalle: "Modelo del agente: probabilidad por etapa, ajustada por la precisión histórica de cada vendedor" },
    { id: "agresivo", label: "Agresivo", valor: r1(vendido + recurrente + declarado + ponderado * 0.25), detalle: "Incluye lo declarado por los vendedores y lo postergado que podría destrabarse" }
  ];
  const brecha = r1(objetivo - ia);
  return {
    metodos, escenarios, objetivo, vendido, recurrente, brecha,
    riesgo: brecha > 0 ? "alto" : "bajo",
    pipelineAdicional: brecha > 0 ? r1(brecha / tasaCierre) : 0,
    precisionPorVendedor: VENDEDORES.map((v) => ({ label: v.label, precision: r1(v.precisionForecast * 100) })).sort((a, b) => a.precision - b.precision),
    historico: [
      { periodo: "1T 2026", forecast: 1180, real: 1102 },
      { periodo: "2T 2026", forecast: 1240, real: 1198 },
      { periodo: "3T 2026", forecast: 1290, real: 1215 }
    ].map((h) => ({ ...h, desvio: pct(h.real, h.forecast) }))
  };
}

export function clientes() {
  const cuentas = [
    { cliente: "Droguería A", segmento: "Droguería", region: "AMBA", ventasAnio: 3980, margenPct: 33, clv: 12400, churn: "medio", crecimiento: 4, upsell: "Sumar línea facial, hoy solo compra corporal" },
    { cliente: "Droguería B", segmento: "Droguería", region: "AMBA", ventasAnio: 2610, margenPct: 31, clv: 8100, churn: "alto", crecimiento: -6, upsell: "Renovación en riesgo: contrato vence el 31/10" },
    { cliente: "Droguería C", segmento: "Droguería", region: "Litoral", ventasAnio: 1240, margenPct: 38, clv: 4200, churn: "bajo", crecimiento: 11, upsell: "Protector solar para la temporada" },
    { cliente: "Cadena Norte", segmento: "Cadena", region: "AMBA", ventasAnio: 880, margenPct: 42, clv: 3600, churn: "bajo", crecimiento: 18, upsell: "Góndola destacada de verano" },
    { cliente: "Cadena Sur", segmento: "Cadena", region: "AMBA", ventasAnio: 640, margenPct: 44, clv: 2700, churn: "medio", crecimiento: 2, upsell: "Alta de Emulsión Facial" },
    { cliente: "Cadena Mediterránea", segmento: "Cadena", region: "Córdoba", ventasAnio: 410, margenPct: 43, clv: 1900, churn: "bajo", crecimiento: 22, upsell: "Ampliar surtido a 6 SKU" },
    { cliente: "Marketplace Salud", segmento: "E-commerce", region: "Nacional", ventasAnio: 745, margenPct: 29, clv: 2100, churn: "medio", crecimiento: -9, upsell: "Revisar precios frente a la tienda oficial" }
  ];
  const total = sum(cuentas, (c) => c.ventasAnio);
  const top3 = sum(cuentas.slice(0, 3), (c) => c.ventasAnio);
  return {
    cuentas: cuentas.map((c) => ({ ...c, participacion: r1((c.ventasAnio / total) * 100) })),
    concentracion: { top3: r1((top3 / total) * 100), nota: "Las tres droguerías explican la mayor parte de la facturación: es el principal riesgo comercial" },
    territorios: [
      { territorio: "AMBA Norte", vendedor: "APM-01", farmaciasObjetivo: 420, cubiertas: 356, penetracion: 84.8, potencial: 64 },
      { territorio: "AMBA Sur", vendedor: "APM-02", farmaciasObjetivo: 380, cubiertas: 241, penetracion: 63.4, potencial: 139 },
      { territorio: "Córdoba", vendedor: "APM-03", farmaciasObjetivo: 260, cubiertas: 218, penetracion: 83.8, potencial: 42 },
      { territorio: "Cuyo", vendedor: "APM-05", farmaciasObjetivo: 210, cubiertas: 108, penetracion: 51.4, potencial: 102 },
      { territorio: "Patagonia", vendedor: "APM-06", farmaciasObjetivo: 180, cubiertas: 163, penetracion: 90.6, potencial: 17 },
      { territorio: "NOA", vendedor: "Sin asignar", farmaciasObjetivo: 240, cubiertas: 86, penetracion: 35.8, potencial: 154 },
      { territorio: "Litoral", vendedor: "KAM Droguerías", farmaciasObjetivo: 290, cubiertas: 171, penetracion: 59, potencial: 119 },
      { territorio: "Santa Fe", vendedor: "APM-04", farmaciasObjetivo: 200, cubiertas: 152, penetracion: 76, potencial: 48 }
    ],
    enRiesgo: [
      { cliente: "Droguería B", motivo: "Contrato vence el 31/10 y tiene ARS 31 M vencidos", severidad: "crit" },
      { cliente: "Marketplace Salud", motivo: "Cayó 9% interanual y postergó la definición", severidad: "warn" },
      { cliente: "Farmacia Sur Salud", motivo: "Perdió una propuesta por falta de stock y no volvió a comprar", severidad: "warn" }
    ]
  };
}

/** Priorización y próxima acción: el criterio del agente, no un dato. */
export function inteligencia() {
  const ops = oportunidades();
  const prioridad = ops.map((o) => {
    const urgencia = Math.max(0, 60 - dias(HOY) - (Date.parse(o.cierreProbable) - Date.parse(HOY)) / 864e5 / 3);
    const score = r1(o.ponderado * 0.7 + urgencia * 0.6 - (o.estancada ? 12 : 0));
    return { ...o, score, motivo: o.estancada ? "Monto alto pero sin movimiento" : o.probabilidad >= 70 ? "Alta probabilidad y cierre cercano" : "Buen monto, falta avanzar de etapa" };
  }).sort((a, b) => b.score - a.score).slice(0, 6);

  const coaching = desempeno().vendedores
    .filter((v) => v.precisionPct < 70 || v.descuentoProm > 15 || v.cumplimiento < 75)
    .map((v) => ({
      vendedor: v.label,
      señales: [
        v.cumplimiento < 75 ? `Cumplimiento de cuota ${v.cumplimiento}%` : null,
        v.precisionPct < 70 ? `Precisión de forecast ${v.precisionPct}%` : null,
        v.descuentoProm > 15 ? `Descuento promedio ${v.descuentoProm}%, el más alto del equipo` : null
      ].filter(Boolean)
    }));

  return {
    prioridad,
    abandonadas: ops.filter((o) => o.sinMovimiento > 30),
    coaching,
    competidores: [
      { competidor: "Laboratorio dermo local", menciones: 9, contexto: "Precio en droguerías y bonificaciones por volumen" },
      { competidor: "Marca internacional de solares", menciones: 6, contexto: "Espacio en góndola de cadenas para la temporada" },
      { competidor: "Marca blanca de cadena", menciones: 4, contexto: "Línea corporal de bajo precio" }
    ],
    alertas: [
      { sev: "crit", t: "Droguería B: renovación en negociación con preaviso el 01/10 y ARS 31 M vencidos", tipo: "operativo" },
      { sev: "crit", t: "5 oportunidades por ARS 96 M perdidas por falta de stock en el momento de la propuesta", tipo: "conciliado" },
      { sev: "warn", t: "3 oportunidades sin movimiento hace más de 30 días, por ARS 163 M", tipo: "operativo" },
      { sev: "warn", t: "NOA sin vendedor asignado: 154 farmacias de potencial sin cobertura", tipo: "operativo" },
      { sev: "info", t: "El tiempo de respuesta a leads es de 26 horas contra un objetivo de 8", tipo: "operativo" }
    ]
  };
}

/** El diferencial: qué significa el forecast comercial para Finanzas y para Producción. */
export function integracion(escenarioId = "probable") {
  const f = forecast();
  const escenario = f.escenarios.find((e) => e.id === escenarioId) || f.escenarios[1];
  // Cuánto se aparta el escenario del objetivo comercial, que es lo que ya está en el presupuesto.
  const deltaPct = pct(escenario.valor, f.objetivo);
  const impactoFinanzas = finanzas.escenario({ ventas: deltaPct });
  // 32 unidades por ARS M con la mezcla actual: es la misma relación que usa el plan de Capataz.
  const unidadesPorMillon = 32;
  return {
    escenario, deltaPct, objetivoComercial: f.objetivo,
    finanzas: {
      ingresosBase: impactoFinanzas.base.ingresos, ingresosEscenario: impactoFinanzas.simulado.ingresos,
      ebitdaBase: impactoFinanzas.base.ebitda, ebitdaEscenario: impactoFinanzas.simulado.ebitda,
      cajaQuiebre: impactoFinanzas.cajaSimulada.quiebre, cajaFinal: impactoFinanzas.cajaSimulada.saldoFinal,
      nota: "El forecast comercial entra al P&L y al flujo de caja de la solución Finanzas"
    },
    produccion: {
      unidadesRequeridas: Math.round(escenario.valor * unidadesPorMillon),
      foco: "Protector Solar FPS50",
      faltante: 4200,
      nota: "Con este forecast, el plan de producción de octubre queda corto en FPS50: hay que emitir la orden antes del 25/09"
    },
    rd: {
      nota: "Emulsión Facial aparece en 3 oportunidades de cadenas: conviene acelerar la aprobación de claims en Moondesk"
    }
  };
}

export const META = {
  id: "comercial",
  agentId: "comercial",
  titulo: "Solución Comercial",
  bajada: "Pipeline, objetivos, funnel, forecast, clientes e inteligencia comercial.",
  moneda: "ARS", unidad: "millones",
  fuentes: ["Elvis (CRM)", "Tango", "IQVia", "Bonus Dermo", "Avanter", "Sell Out", "Shopify", "Mercado Libre"],
  actualizacion: "Pipeline y actividad, cada 15 minutos. Facturación, diaria. Mercado, mensual.",
  tiposDeDato: finanzas.META.tiposDeDato
};

export function resumen() {
  const p = pipeline();
  const d = desempeno();
  const f = forecast();
  const fu = funnel();
  return {
    meta: META,
    kpis: [
      { id: "pipeline", label: "Pipeline ponderado", valor: p.ponderado, unidad: "ARS M", contra: p.bruto, tipo: "operativo", detalle: `${p.cantidad} oportunidades, bruto ${p.bruto}` },
      { id: "cuota", label: "Cumplimiento de cuota", valor: d.equipo.cumplimiento, unidad: "%", contra: 100, tipo: "operativo", detalle: `${d.equipo.ventas} de ${d.equipo.cuota} ARS M del trimestre` },
      { id: "forecast", label: "Forecast del trimestre", valor: f.escenarios[1].valor, unidad: "ARS M", contra: f.objetivo, tipo: "estimado", detalle: "Modelo del agente: vendido + base instalada + pipeline" },
      { id: "brecha", label: "Brecha contra objetivo", valor: f.brecha, unidad: "ARS M", tipo: "estimado", detalle: f.brecha > 0 ? `Faltan ${f.pipelineAdicional} ARS M de pipeline nuevo para cubrirla` : "Objetivo cubierto" },
      { id: "winrate", label: "Tasa de conversión", valor: fu.winRate, unidad: "%", contra: 9, tipo: "conciliado", detalle: "De lead trabajado a negocio ganado" },
      { id: "ciclo", label: "Ciclo comercial", valor: fu.ciclo, unidad: "días", contra: 60, tipo: "conciliado", detalle: "Desde el lead hasta el cierre" },
      { id: "ticket", label: "Ticket promedio", valor: fu.ticket, unidad: "ARS M", contra: 31, tipo: "conciliado", detalle: "Últimos 12 meses" },
      { id: "nuevos", label: "Clientes nuevos", valor: d.equipo.nuevosClientes, unidad: "cuentas", tipo: "conciliado", detalle: "En el trimestre" }
    ],
    pipeline: p, desempeno: d, funnel: fu, forecast: f, inteligencia: inteligencia(),
    mensual: cumplimientoMensual()
  };
}
