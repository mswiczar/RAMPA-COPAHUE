// Solución Finanzas: P&L dinámico, caja, análisis multidimensional y escenarios.
// DATOS SIMULADOS. Cada cifra declara su tipo: conciliado, operativo, proyectado o estimado.
// En producción, `conciliado` sale de Tango cerrado; `operativo` de ventas del día
// (Tango + Shopify + Mercado Libre) y `proyectado` del presupuesto vigente y el forecast.

export const HOY = "2026-09-17";
const M = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const AVANCE_MES = 0.57; // 17 de 30 días de septiembre

/** conciliado: cerrado y auditado · operativo: día a día, sin cerrar · proyectado: forecast */
const ESTADO = M.map((_, i) => (i <= 7 ? "conciliado" : i === 8 ? "operativo" : "proyectado"));

const PRESUPUESTO = [1200, 1150, 1280, 1310, 1290, 1240, 1300, 1310, 1350, 1420, 1480, 1600];
const REAL = [1182, 1105, 1298, 1276, 1251, 1228, 1272, 1240, 1288, 1385, 1455, 1585];

// Mezcla de canales por mes (suma 1). La web propia crece, Mercado Libre se achica.
const MIX = M.map((_, i) => ({
  droguerias: 0.68 - i * 0.004,
  farmacias: 0.153 + i * 0.0005,
  web: 0.09 + i * 0.0035,
  meli: 0.077
}));

const CANALES = [
  { id: "droguerias", label: "Droguerías", color: "#0090c2", margenBruto: 0.52, comision: 0 },
  { id: "farmacias", label: "Farmacias directas", color: "#c2571d", margenBruto: 0.55, comision: 0 },
  { id: "web", label: "Web propia", color: "#7a4fd0", margenBruto: 0.58, comision: 0.045 },
  { id: "meli", label: "Mercado Libre", color: "#12a594", margenBruto: 0.55, comision: 0.142 }
];

const PRODUCTOS = [
  { id: "fps50", label: "Protector Solar FPS50 120ml", peso: 0.24, margen: 0.55 },
  { id: "corporal", label: "Crema Corporal 200g", peso: 0.27, margen: 0.49 },
  { id: "manos", label: "Crema de Manos 50g", peso: 0.14, margen: 0.58 },
  { id: "emulsion", label: "Emulsión Facial 50ml", peso: 0.16, margen: 0.61 },
  { id: "pies", label: "Crema de Pies 100g", peso: 0.11, margen: 0.5 },
  { id: "gel", label: "Gel Limpiador 150ml", peso: 0.08, margen: 0.47 }
];

// Las zonas coinciden con las del mapa de provincias (geo/provincias-ar.json).
const ZONAS = [
  { id: "amba", label: "AMBA", peso: 0.4, margen: 0.5 },
  { id: "cordoba", label: "Córdoba", peso: 0.12, margen: 0.53 },
  { id: "santafe", label: "Santa Fe", peso: 0.1, margen: 0.52 },
  { id: "litoral", label: "Litoral", peso: 0.09, margen: 0.49 },
  { id: "cuyo", label: "Cuyo", peso: 0.09, margen: 0.51 },
  { id: "noa", label: "NOA", peso: 0.09, margen: 0.48 },
  { id: "patagonia", label: "Patagonia", peso: 0.11, margen: 0.56 }
];

const CLIENTES = [
  { id: "drogA", label: "Droguería A", canal: "droguerias", ventas: 3980, margen: 0.33, dso: 78, vencido: 52 },
  { id: "drogB", label: "Droguería B", canal: "droguerias", ventas: 2610, margen: 0.31, dso: 86, vencido: 31 },
  { id: "drogC", label: "Droguería C", canal: "droguerias", ventas: 1240, margen: 0.38, dso: 61, vencido: 13 },
  { id: "cadena1", label: "Cadena de farmacias Norte", canal: "farmacias", ventas: 880, margen: 0.42, dso: 45, vencido: 4 },
  { id: "cadena2", label: "Cadena de farmacias Sur", canal: "farmacias", ventas: 640, margen: 0.44, dso: 41, vencido: 0 },
  { id: "meli", label: "Mercado Libre (consumidor final)", canal: "meli", ventas: 745, margen: 0.29, dso: 6, vencido: 0 },
  { id: "web", label: "Web propia (consumidor final)", canal: "web", ventas: 995, margen: 0.46, dso: 2, vencido: 0 }
];

const GASTO_MKT = [58, 52, 61, 64, 60, 59, 63, 64.5, 66, 68, 70, 74];
const PPTO_MKT = [55, 55, 60, 62, 62, 60, 60, 60, 62, 65, 68, 72];
const SGA = M.map((_, i) => 158 + i * 4.5); // sube con inflación
const FUERZA_VENTAS = M.map((_, i) => 92 + i * 1.5);
const LOGISTICA_PCT = 0.052;
const DEPRECIACION = 22;
const FINANCIERO = -18;
const TASA_IMPUESTO = 0.35;

const r1 = (n) => Math.round(n * 10) / 10;
const fmtPct = (n) => `${n > 0 ? "+" : ""}${r1(n)}%`.replace(".", ",");

function comisionesDe(ingresos, mix) {
  return CANALES.reduce((acc, c) => acc + ingresos * mix[c.id] * c.comision, 0);
}

/** Arma el P&L de un mes. `deltas` aplica un escenario (solo a meses no cerrados). */
function mesPnl(i, fuente, deltas = null) {
  const base = fuente === "presupuesto" ? PRESUPUESTO[i] : REAL[i];
  const d = deltas || {};
  const factorVentas = 1 + (d.ventas || 0) / 100;
  const factorPrecio = 1 + (d.precio || 0) / 100;
  const factorCostos = 1 + (d.costos || 0) / 100;
  const factorTC = 1 + (d.tipoCambio || 0) / 100;
  const factorInfl = 1 + (d.inflacion || 0) / 100;
  const descuentoExtra = (d.descuentos || 0) / 100;

  const mix = MIX[i];
  const ingresosBrutos = base * factorVentas * factorPrecio;
  const descuentos = ingresosBrutos * (0.11 + descuentoExtra);
  const ingresos = ingresosBrutos - descuentos;

  // El costo de ventas sigue al tipo de cambio: los insumos son importados.
  const margenPonderado = CANALES.reduce((acc, c) => acc + mix[c.id] * c.margenBruto, 0);
  const costoVentas = ingresos * (1 - margenPonderado) * factorCostos * (0.72 + 0.28 * factorTC);
  const margenBruto = ingresos - costoVentas;
  const comisiones = comisionesDe(ingresos, mix) * (1 + (d.comisiones || 0) / 100);
  const logistica = ingresos * LOGISTICA_PCT * factorInfl;
  const contribucion = margenBruto - comisiones - logistica;
  const marketing = (fuente === "presupuesto" ? PPTO_MKT[i] : GASTO_MKT[i]) * factorInfl;
  const fuerzaVentas = FUERZA_VENTAS[i] * factorInfl * (1 + (d.personal || 0) / 100);
  const sga = SGA[i] * factorInfl * (1 + (d.personal || 0) / 100);
  const ebitda = contribucion - marketing - fuerzaVentas - sga;
  const operativo = ebitda - DEPRECIACION;
  const antesImpuestos = operativo + FINANCIERO * factorTC;
  const impuestos = antesImpuestos > 0 ? antesImpuestos * TASA_IMPUESTO : 0;

  return {
    ingresosBrutos, descuentos, ingresos, costoVentas, margenBruto, comisiones, logistica,
    contribucion, marketing, fuerzaVentas, sga, ebitda, depreciacion: DEPRECIACION,
    operativo, financiero: FINANCIERO * factorTC, impuestos, neto: antesImpuestos - impuestos
  };
}

export const LINEAS = [
  { id: "ingresosBrutos", label: "Ingresos brutos", tipo: "ingreso" },
  { id: "descuentos", label: "Descuentos comerciales", tipo: "resta" },
  { id: "ingresos", label: "Ingresos netos", tipo: "subtotal" },
  { id: "costoVentas", label: "Costo de ventas", tipo: "resta" },
  { id: "margenBruto", label: "Margen bruto", tipo: "subtotal" },
  { id: "comisiones", label: "Comisiones (MP y MELI)", tipo: "resta" },
  { id: "logistica", label: "Logística", tipo: "resta" },
  { id: "contribucion", label: "Margen de contribución", tipo: "subtotal" },
  { id: "marketing", label: "Marketing", tipo: "resta" },
  { id: "fuerzaVentas", label: "Fuerza de ventas", tipo: "resta" },
  { id: "sga", label: "SG&A", tipo: "resta" },
  { id: "ebitda", label: "EBITDA", tipo: "subtotal" },
  { id: "depreciacion", label: "Depreciación", tipo: "resta" },
  { id: "operativo", label: "Resultado operativo", tipo: "subtotal" },
  { id: "financiero", label: "Resultado financiero", tipo: "resta" },
  { id: "impuestos", label: "Impuestos", tipo: "resta" },
  { id: "neto", label: "Resultado neto", tipo: "total" }
];

/** P&L de los 12 meses: real/operativo/forecast contra presupuesto. */
export function pnl(deltas = null) {
  const meses = M.map((mes, i) => {
    const escenario = ESTADO[i] === "conciliado" ? null : deltas;
    const real = mesPnl(i, "real", escenario);
    const ppto = mesPnl(i, "presupuesto");
    const parcial = ESTADO[i] === "operativo";
    return {
      mes, indice: i, estado: ESTADO[i],
      real: Object.fromEntries(Object.entries(real).map(([k, v]) => [k, r1(parcial ? v * AVANCE_MES : v)])),
      proyeccionMes: parcial ? Object.fromEntries(Object.entries(real).map(([k, v]) => [k, r1(v)])) : null,
      presupuesto: Object.fromEntries(Object.entries(ppto).map(([k, v]) => [k, r1(v)]))
    };
  });
  return { meses, lineas: LINEAS, avanceMes: AVANCE_MES, hoy: HOY };
}

const acumular = (meses, campo, hasta) => meses.slice(0, hasta).reduce((acc, m) => {
  for (const [k, v] of Object.entries(m[campo])) acc[k] = r1((acc[k] || 0) + v);
  return acc;
}, {});

/** Caja: 13 semanas de flujo proyectado, con saldo y mínimo operativo. */
export function caja(deltas = null) {
  const factorVentas = 1 + ((deltas?.ventas || 0) + (deltas?.precio || 0)) / 100;
  const factorCostos = 1 + ((deltas?.costos || 0) + (deltas?.inflacion || 0)) / 100;
  const atraso = (deltas?.cobranzaAtrasada || 0) / 100;
  const SALDO_INICIAL = 318;
  let saldo = SALDO_INICIAL;
  const semanas = [];
  for (let i = 0; i < 13; i++) {
    const cobranzas = (268 + 26 * Math.sin(i / 1.9) + (i % 4 === 0 ? 120 : 0)) * factorVentas * (1 - atraso);
    const proveedores = (172 + 21 * Math.cos(i / 2.3) + (i % 4 === 1 ? 95 : 0)) * factorCostos;
    const sueldos = i % 4 === 3 ? 148 : 0;
    // Semana 3: anticipo de ganancias e IVA del trimestre.
    const impuestos = i === 2 ? 214 : i % 4 === 2 ? 96 : 0;
    const otros = 26 + 5 * Math.sin(i);
    const egresos = proveedores + sueldos + impuestos + otros;
    saldo += cobranzas - egresos;
    semanas.push({
      semana: `S${i + 1}`,
      desde: new Date(Date.parse(HOY) + i * 7 * 864e5).toISOString().slice(0, 10),
      cobranzas: r1(cobranzas), proveedores: r1(proveedores), sueldos, impuestos, otros: r1(otros),
      egresos: r1(egresos), saldo: r1(saldo)
    });
  }
  const minimo = 250;
  const quiebre = semanas.find((s) => s.saldo < minimo);
  return {
    saldoInicial: SALDO_INICIAL, minimoOperativo: minimo, semanas, quiebre: quiebre?.semana || null,
    saldoMinimo: Math.min(...semanas.map((s) => s.saldo)),
    posicion: [
      { cuenta: "Banco Galicia · ARS", saldo: 268, tipo: "conciliado" },
      { cuenta: "Banco Santander · ARS", saldo: 96, tipo: "conciliado" },
      { cuenta: "Mercado Pago", saldo: 34, tipo: "operativo" },
      { cuenta: "Banco Galicia · USD (equivalente)", saldo: 14, tipo: "conciliado" }
    ]
  };
}

/** Aperturas por dimensión del mes/acumulado elegido. */
/** `cantidadMeses` = meses cerrados que se acumulan (8 = enero a agosto). */
export function dimensiones(cantidadMeses = 8) {
  const { meses } = pnl();
  const acum = acumular(meses, "real", cantidadMeses);
  const ingresos = acum.ingresos;
  const mix = MIX[cantidadMeses - 1];
  return {
    canal: CANALES.map((c) => {
      const venta = ingresos * mix[c.id];
      return { id: c.id, label: c.label, color: c.color, ventas: r1(venta), margen: r1(venta * (c.margenBruto - c.comision) * 100) / (venta || 1) / 100, margenPct: r1((c.margenBruto - c.comision) * 100) };
    }),
    producto: PRODUCTOS.map((p) => ({ id: p.id, label: p.label, ventas: r1(ingresos * p.peso), margenPct: r1(p.margen * 100) })),
    zona: ZONAS.map((z) => ({ id: z.id, label: z.label, ventas: r1(ingresos * z.peso), margenPct: r1(z.margen * 100) })),
    cliente: CLIENTES.map((c) => ({ ...c, margenPct: r1(c.margen * 100) }))
  };
}

/** Centros de costo y facturas: el zoom desde una línea del P&L hasta el comprobante. */
const CENTROS = {
  marketing: [
    { id: "digital", label: "Marketing digital", monto: 34.5, docs: [["FC-A 0004-00012877", "Google Ads Argentina", 18.5], ["FC-A 0004-00012903", "Meta Platforms", 16]] },
    { id: "influencers", label: "Influencers", monto: 15, docs: [["FC-C 0002-00000341", "Agencia Rizoma", 9], ["FC-C 0002-00000352", "Contenidos MKT SRL", 6]] },
    { id: "pop", label: "Material punto de venta", monto: 9, docs: [["FC-A 0011-00003120", "Gráfica Sur", 5.4], ["FC-A 0011-00003147", "Displays Norte", 3.6]] },
    { id: "eventos", label: "Congresos dermatológicos", monto: 6, docs: [["FC-A 0007-00000988", "Sociedad de Dermatología", 6]] }
  ],
  logistica: [
    { id: "disprofarma", label: "Disprofarma", monto: 41.2, docs: [["FC-A 0003-00025511", "Disprofarma SA", 41.2]] },
    { id: "shipnow", label: "Ship Now", monto: 14.8, docs: [["FC-A 0009-00007742", "Ship Now SA", 14.8]] },
    { id: "depositos", label: "Depósitos Garín y Madero", monto: 8.5, docs: [["FC-A 0014-00001220", "Logística Garín", 5.1], ["FC-A 0015-00000908", "Depósito Madero", 3.4]] }
  ],
  sga: [
    { id: "personal", label: "Personal administrativo", monto: 112, docs: [["Liquidación 2026-08", "Nómina administración", 112]] },
    { id: "sistemas", label: "Sistemas y licencias", monto: 38, docs: [["FC-A 0001-00004410", "Axoft (Tango)", 12], ["FC-C 0002-00000871", "IQVia Argentina", 18], ["FC-C 0002-00000872", "WGSN", 8]] },
    { id: "estructura", label: "Estructura y servicios", monto: 24, docs: [["FC-A 0022-00009001", "Alquiler oficina", 15], ["FC-B 0031-00000455", "Servicios varios", 9]] },
    { id: "profesionales", label: "Honorarios profesionales", monto: 19.5, docs: [["FC-C 0004-00000112", "Estudio contable", 11], ["FC-C 0004-00000119", "Estudio jurídico", 8.5]] }
  ],
  comisiones: [
    { id: "meli", label: "Mercado Libre", monto: 13.5, docs: [["Liquidación MELI 2026-08", "Comisión 14,2%", 13.5]] },
    { id: "mercadopago", label: "Mercado Pago", monto: 5.1, docs: [["Liquidación MP 2026-08", "Comisión 4,5%", 5.1]] }
  ]
};

export function detalleLinea(lineaId) {
  const centros = CENTROS[lineaId];
  if (!centros) return null;
  return centros.map((c) => ({
    id: c.id, label: c.label, monto: c.monto,
    comprobantes: c.docs.map(([numero, proveedor, monto]) => ({ numero, proveedor, monto, fuente: "Tango" }))
  }));
}

/** Indicadores y alertas, con el tipo de dato de cada uno. */
export function indicadores(deltas = null) {
  const { meses } = pnl(deltas);
  const cerrados = 8; // ene a ago
  const acumReal = acumular(meses, "real", cerrados);
  const acumPpto = acumular(meses, "presupuesto", cerrados);
  const anioReal = acumular(meses, "real", 12);
  const anioPpto = acumular(meses, "presupuesto", 12);
  const flujo = caja(deltas);
  const pct = (a, b) => (b ? r1(((a - b) / b) * 100) : 0);

  const fijos = SGA.slice(0, cerrados).reduce((a, b) => a + b, 0)
    + FUERZA_VENTAS.slice(0, cerrados).reduce((a, b) => a + b, 0)
    + GASTO_MKT.slice(0, cerrados).reduce((a, b) => a + b, 0) + DEPRECIACION * cerrados;
  const margenContribucionPct = acumReal.contribucion / acumReal.ingresos;
  const puntoEquilibrio = r1(fijos / margenContribucionPct);

  return {
    hoy: HOY,
    acumulado: { desde: "Ene", hasta: "Ago", tipo: "conciliado", real: acumReal, presupuesto: acumPpto, desvio: pct(acumReal.ingresos, acumPpto.ingresos) },
    anio: { tipo: "proyectado", real: anioReal, presupuesto: anioPpto, desvio: pct(anioReal.ingresos, anioPpto.ingresos) },
    kpis: [
      { id: "ingresos", label: "Ingresos netos", valor: acumReal.ingresos, unidad: "ARS M", contra: acumPpto.ingresos, desvio: pct(acumReal.ingresos, acumPpto.ingresos), tipo: "conciliado", detalle: "Acumulado enero a agosto" },
      { id: "margenBruto", label: "Margen bruto", valor: r1((acumReal.margenBruto / acumReal.ingresos) * 100), unidad: "%", contra: r1((acumPpto.margenBruto / acumPpto.ingresos) * 100), tipo: "conciliado", detalle: "Sobre ingresos netos" },
      { id: "ebitda", label: "EBITDA", valor: acumReal.ebitda, unidad: "ARS M", contra: acumPpto.ebitda, desvio: pct(acumReal.ebitda, acumPpto.ebitda), tipo: "conciliado", detalle: `${r1((acumReal.ebitda / acumReal.ingresos) * 100)}% de los ingresos` },
      { id: "neto", label: "Resultado neto", valor: acumReal.neto, unidad: "ARS M", contra: acumPpto.neto, desvio: pct(acumReal.neto, acumPpto.neto), tipo: "conciliado", detalle: "Después de impuestos" },
      { id: "caja", label: "Caja disponible", valor: r1(flujo.posicion.reduce((a, c) => a + c.saldo, 0)), unidad: "ARS M", tipo: "operativo", detalle: "4 cuentas, al día de hoy" },
      { id: "dso", label: "DSO", valor: 68, unidad: "días", contra: 55, tipo: "operativo", detalle: "Días de cobranza, objetivo 55" },
      { id: "dpo", label: "DPO", valor: 51, unidad: "días", contra: 60, tipo: "operativo", detalle: "Días de pago a proveedores" },
      { id: "equilibrio", label: "Punto de equilibrio", valor: puntoEquilibrio, unidad: "ARS M", tipo: "estimado", detalle: "Ventas necesarias enero a agosto, con la estructura actual" }
    ],
    capitalTrabajo: { cuentasPorCobrar: 1980, inventario: 1240, cuentasPorPagar: 1105, valor: 2115, tipo: "operativo" },
    aging: [
      { bucket: "Por vencer", monto: 1284 },
      { bucket: "1 a 30 días", monto: 412 },
      { bucket: "31 a 60 días", monto: 188 },
      { bucket: "61 a 90 días", monto: 61 },
      { bucket: "Más de 90 días", monto: 35 }
    ],
    alertas: [
      { sev: "crit", t: `Ingresos acumulados ${fmtPct(pct(acumReal.ingresos, acumPpto.ingresos))} contra presupuesto (${r1(acumReal.ingresos - acumPpto.ingresos)} ARS M); el desvío se concentra en droguerías`, tipo: "conciliado" },
      flujo.quiebre
        ? { sev: "crit", t: `La caja perfora el mínimo operativo de ARS ${flujo.minimoOperativo} M en ${flujo.quiebre}: toca ARS ${r1(flujo.saldoMinimo)} M`, tipo: "proyectado" }
        : { sev: "info", t: `La caja se mantiene sobre el mínimo operativo: el piso del trimestre es ARS ${r1(flujo.saldoMinimo)} M`, tipo: "proyectado" },
      { sev: "warn", t: "Droguería A y Droguería B: alto volumen y margen bajo (33% y 31%), con ARS 83 M vencidos", tipo: "operativo" },
      { sev: "warn", t: `Marketing acumula ARS ${r1(acumReal.marketing - acumPpto.marketing)} M sobre presupuesto (${fmtPct(pct(acumReal.marketing, acumPpto.marketing))}), casi todo en influencers`, tipo: "conciliado" },
      { sev: "warn", t: "37 órdenes online por ARS 4,1 M sin factura en Tango", tipo: "operativo" },
      { sev: "info", t: "Gasto posiblemente duplicado: FC-A 0004-00012877 y FC-A 0004-00012903 de Google Ads y Meta en el mismo período", tipo: "estimado" }
    ]
  };
}

/** Puente de variación: qué explica la diferencia entre presupuesto y real. */
export function puente() {
  const { meses } = pnl();
  const acumReal = acumular(meses, "real", 8);
  const acumPpto = acumular(meses, "presupuesto", 8);
  const total = r1(acumReal.ingresos - acumPpto.ingresos);
  return {
    desde: { label: "Presupuesto ene-ago", valor: acumPpto.ingresos },
    pasos: [
      { label: "Droguerías (volumen)", valor: r1(total * 0.72) },
      { label: "Mercado Libre (volumen)", valor: r1(total * 0.36) },
      { label: "Farmacias directas", valor: r1(total * 0.14) },
      { label: "Web propia", valor: r1(-total * 0.22) },
      { label: "Precio y mezcla", valor: r1(total * 0.0) }
    ],
    hasta: { label: "Real ene-ago", valor: acumReal.ingresos }
  };
}

export const VARIABLES_ESCENARIO = [
  { id: "ventas", label: "Volumen de ventas", min: -25, max: 25, paso: 1, unidad: "%" },
  { id: "precio", label: "Precio de lista", min: -15, max: 20, paso: 1, unidad: "%" },
  { id: "costos", label: "Costo de producción", min: -15, max: 30, paso: 1, unidad: "%" },
  { id: "tipoCambio", label: "Tipo de cambio", min: -10, max: 60, paso: 5, unidad: "%" },
  { id: "inflacion", label: "Inflación de gastos", min: 0, max: 40, paso: 5, unidad: "%" },
  { id: "comisiones", label: "Comisiones de plataformas", min: -30, max: 40, paso: 5, unidad: "%" },
  { id: "descuentos", label: "Descuentos comerciales", min: -5, max: 10, paso: 1, unidad: "pp" },
  { id: "personal", label: "Costo de personal", min: -10, max: 40, paso: 5, unidad: "%" },
  { id: "cobranzaAtrasada", label: "Cobranzas que se atrasan", min: 0, max: 40, paso: 5, unidad: "%" }
];

export const ESCENARIOS_GUARDADOS = [
  { id: "base", label: "Base", deltas: {} },
  { id: "optimista", label: "Optimista", deltas: { ventas: 8, precio: 4, costos: -2 } },
  { id: "pesimista", label: "Pesimista", deltas: { ventas: -12, costos: 14, tipoCambio: 25, inflacion: 20, cobranzaAtrasada: 20 } },
  { id: "devaluacion", label: "Salto del dólar", deltas: { tipoCambio: 40, costos: 8, inflacion: 15 } }
];

/** Resumen de un escenario contra el base, para el simulador. */
export function escenario(deltas = {}) {
  const base = pnl();
  const sim = pnl(deltas);
  const resumen = (p) => {
    const anio = acumular(p.meses, "real", 12);
    return { ingresos: anio.ingresos, contribucion: anio.contribucion, ebitda: anio.ebitda, neto: anio.neto, ebitdaPct: r1((anio.ebitda / anio.ingresos) * 100) };
  };
  const cajaBase = caja();
  const cajaSim = caja(deltas);
  return {
    deltas,
    base: resumen(base), simulado: resumen(sim),
    pnl: sim, caja: cajaSim,
    cajaBase: { minimo: cajaBase.minimoOperativo, quiebre: cajaBase.quiebre, saldoFinal: cajaBase.semanas.at(-1).saldo },
    cajaSimulada: { minimo: cajaSim.minimoOperativo, quiebre: cajaSim.quiebre, saldoFinal: cajaSim.semanas.at(-1).saldo },
    variables: VARIABLES_ESCENARIO, guardados: ESCENARIOS_GUARDADOS
  };
}

export const META = {
  id: "finanzas",
  agentId: "finanzas",
  titulo: "Solución Finanzas",
  bajada: "Caja, P&L dinámico, análisis por dimensión y simulación de escenarios.",
  moneda: "ARS",
  unidad: "millones",
  fuentes: ["Tango", "Presupuesto anual", "Shopify", "Mercado Libre", "Mercado Pago", "Facturante"],
  tiposDeDato: [
    { id: "conciliado", label: "Conciliado", detalle: "Cerrado en Tango y auditado. Enero a agosto." },
    { id: "operativo", label: "Operativo", detalle: "Día a día, sin cerrar. Septiembre, al 17." },
    { id: "proyectado", label: "Proyectado", detalle: "Forecast sobre el presupuesto vigente. Octubre a diciembre." },
    { id: "estimado", label: "Estimado", detalle: "Calculado por el agente. Se explica siempre el método." }
  ]
};
