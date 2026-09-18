// Capa de consultas: traduce una pregunta en lenguaje natural a los datos de una solución.
// No es texto escrito a mano: cada respuesta se arma con los mismos números del tablero.
import * as finanzas from "./finanzas.js";
import * as comercial from "./comercial.js";
import * as rd from "./rd.js";

const n = (v, dec = 0) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
const r0 = (v) => Math.round(v);
const r1 = (v) => Math.round(v * 10) / 10;
const pct = (v) => `${v > 0 ? "+" : ""}${n(v, 1)}%`;
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const MES_FIN = "2026-09-30";

/** Cada consulta declara las palabras que la activan y arma su respuesta al momento. */
const COMERCIAL = [
  {
    id: "cierres",
    ejemplo: "¿Qué negocios cierran este mes y qué falta hacer?",
    keys: ["cierra", "cierran", "cierre", "cerrar", "mes", "negocio", "negocios", "falta", "hacer", "septiembre"],
    responder() {
      const ops = comercial.oportunidades()
        .filter((o) => o.cierreProbable <= MES_FIN)
        .sort((a, b) => b.ponderado - a.ponderado);
      if (!ops.length) return "No hay oportunidades con cierre previsto este mes [Elvis].";
      const total = ops.reduce((a, o) => a + o.monto, 0);
      const ponderado = ops.reduce((a, o) => a + o.ponderado, 0);
      const lineas = ops.map((o) => `- **${o.cliente}** · ${o.producto}: ${n(o.monto)} M, ${o.probabilidad}% de probabilidad, cierre ${o.cierreProbable.slice(8)}/${o.cierreProbable.slice(5, 7)} [Elvis]\n  Falta: ${o.proximaAccion}${o.estancada ? ` (sin movimiento hace ${o.sinMovimiento} días)` : ""} · ${o.vendedorLabel}`);
      const critica = ops[0];
      return `${ops.length} negocios con cierre este mes: **${n(total)} ARS M** brutos, ${n(ponderado, 1)} M ponderados [Elvis].\n\n${lineas.join("\n")}\n\nRecomendación: empezar por ${critica.cliente}, que pesa ${n(critica.ponderado, 1)} M ponderados. [Ver el pipeline completo](#/comercial)`;
    }
  },
  {
    id: "cuota",
    ejemplo: "¿Cómo venimos con la cuota del trimestre?",
    keys: ["cuota", "objetivo", "cumplimiento", "meta", "vamos", "venimos", "trimestre", "equipo"],
    responder() {
      const { equipo, vendedores } = comercial.desempeno();
      const f = comercial.forecast();
      const bajos = vendedores.filter((v) => v.cumplimiento < 85).map((v) => `${v.label} (${n(v.cumplimiento)}%)`);
      return `El equipo lleva **${n(equipo.ventas)} de ${n(equipo.cuota)} ARS M**: ${n(equipo.cumplimiento, 1)}% de la cuota del trimestre [Tango] [Elvis].\n\n- Forecast probable: ${n(f.escenarios[1].valor)} M contra un objetivo de ${n(f.objetivo)} M\n- Brecha: **${n(f.brecha, 1)} M**, que necesitan ${n(f.pipelineAdicional)} M de pipeline nuevo\n- Debajo del 85%: ${bajos.join(", ") || "nadie"}\n\nRecomendación: la brecha se cubre con lo que ya está en negociación si se destraban las oportunidades estancadas. [Ver el forecast](#/comercial)`;
    }
  },
  {
    id: "estancadas",
    ejemplo: "¿Qué oportunidades están estancadas?",
    keys: ["estancada", "estancadas", "frenada", "sin", "movimiento", "abandonada", "abandonadas", "demorada", "parada"],
    responder() {
      const p = comercial.pipeline();
      const total = p.estancadas.reduce((a, o) => a + o.monto, 0);
      return `${p.estancadas.length} oportunidades sin actividad hace más de 21 días, por **${n(total)} ARS M** [Elvis]:\n\n${p.estancadas.map((o) => `- **${o.cliente}** · ${n(o.monto)} M · ${o.sinMovimiento} días · ${o.vendedorLabel}\n  Próxima acción pendiente: ${o.proximaAccion}`).join("\n")}\n\nRecomendación: pedir a cada vendedor una fecha de contacto esta semana, empezando por las de mayor monto.`;
    }
  },
  {
    id: "perdidas",
    ejemplo: "¿Por qué perdemos negocios?",
    keys: ["perdemos", "perdidos", "perdida", "perdidas", "motivo", "motivos", "porque", "razon"],
    responder() {
      const p = comercial.pipeline();
      const total = p.motivosPerdida.reduce((a, m) => a + m.monto, 0);
      return `Motivos de pérdida de los últimos trimestres, ${n(total)} ARS M en total [Elvis]:\n\n${p.motivosPerdida.map((m) => `- **${m.motivo}**: ${m.casos} casos, ${n(m.monto)} M`).join("\n")}\n\nDos de los tres primeros motivos son internos: stock y seguimiento.\n\nRecomendación: cruzar las propuestas con el stock real antes de enviarlas [Disprofarma]. Eso solo ya evita ${n(p.motivosPerdida[1].monto)} M de pérdidas.`;
    }
  },
  {
    id: "pipeline",
    ejemplo: "¿Cómo está el pipeline por vendedor?",
    keys: ["pipeline", "embudo", "vendedor", "canal", "region", "segmento", "producto", "etapa"],
    responder(texto) {
      const t = norm(texto);
      const p = comercial.pipeline();
      const dim = t.includes("canal") ? ["porCanal", "canal"]
        : t.includes("region") || t.includes("zona") ? ["porRegion", "región"]
        : t.includes("segmento") ? ["porSegmento", "segmento"]
        : t.includes("producto") ? ["porProducto", "producto"]
        : t.includes("etapa") ? ["porEtapa", "etapa"]
        : ["porVendedor", "vendedor"];
      const filas = p[dim[0]].slice(0, 6);
      return `Pipeline por ${dim[1]}: **${n(p.bruto)} ARS M** brutos, ${n(p.ponderado, 1)} M ponderados en ${p.cantidad} oportunidades [Elvis].\n\n${filas.map((f) => `- **${f.label}**: ${n(f.bruto)} M brutos, ${n(f.ponderado, 1)} M ponderados (${f.cantidad})`).join("\n")}\n\nRecomendación: mirar el ponderado, no el bruto: hay ${p.estancadas.length} oportunidades sin movimiento que inflan el total. [Ver el pipeline](#/comercial)`;
    }
  },
  {
    id: "forecast",
    ejemplo: "¿Cuál es el forecast y qué impacto tiene en la caja?",
    keys: ["forecast", "proyeccion", "proyectamos", "escenario", "escenarios", "impacto", "caja", "cerrar", "trimestre"],
    responder() {
      const f = comercial.forecast();
      const i = comercial.integracion("probable");
      return `Forecast del trimestre [Elvis] [Tango]:\n\n${f.escenarios.map((e) => `- **${e.label}**: ${n(e.valor)} ARS M`).join("\n")}\n\nEl objetivo es ${n(f.objetivo)} M, así que en el escenario probable falta **${n(f.brecha, 1)} M**.\n\nImpacto en el resto de la compañía:\n- Finanzas: EBITDA de ${n(i.finanzas.ebitdaEscenario)} M contra ${n(i.finanzas.ebitdaBase)} M del base; la caja ${i.finanzas.cajaQuiebre ? `perfora el mínimo operativo en ${i.finanzas.cajaQuiebre}` : "se mantiene sobre el mínimo"}\n- Producción: ${n(i.produccion.unidadesRequeridas)} unidades, con ${n(i.produccion.faltante)} u de faltante en FPS50\n\nRecomendación: ${i.produccion.nota} [Ver la integración](#/comercial)`;
    }
  },
  {
    id: "riesgo-clientes",
    ejemplo: "¿Qué clientes están en riesgo?",
    keys: ["cliente", "clientes", "riesgo", "churn", "perder", "concentracion", "cuenta", "cuentas"],
    responder() {
      const c = comercial.clientes();
      return `Clientes en riesgo [Elvis] [Tango]:\n\n${c.enRiesgo.map((x) => `- **${x.cliente}**: ${x.motivo}`).join("\n")}\n\nAdemás, las tres cuentas más grandes concentran el **${n(c.concentracion.top3, 1)}%** de la facturación.\n\nRecomendación: ${c.concentracion.nota.toLowerCase()}. [Ver clientes y territorios](#/comercial)`;
    }
  },
  {
    id: "cobertura",
    ejemplo: "¿Dónde tenemos baja cobertura?",
    keys: ["cobertura", "territorio", "territorios", "penetracion", "zona", "zonas", "potencial", "cubrir"],
    responder() {
      const c = comercial.clientes();
      const bajos = c.territorios.filter((t) => t.penetracion < 70).sort((a, b) => b.potencial - a.potencial);
      return `Cobertura por territorio [Elvis]:\n\n${bajos.map((t) => `- **${t.territorio}** (${t.vendedor}): ${n(t.penetracion, 1)}% de penetración, ${t.potencial} farmacias sin cubrir`).join("\n")}\n\nEl resto está por encima del 80%.\n\nRecomendación: NOA es el mayor potencial sin cubrir y no tiene vendedor asignado. Conviene decidir si se asigna o se atiende por droguería.`;
    }
  }
];

const FINANZAS = [
  {
    id: "presupuesto",
    ejemplo: "¿Cómo venimos contra presupuesto?",
    keys: ["presupuesto", "desvio", "venimos", "vamos", "contra", "ppto", "real"],
    responder() {
      const ind = finanzas.indicadores();
      const { real, presupuesto } = ind.acumulado;
      const lineas = ["ingresos", "margenBruto", "contribucion", "ebitda", "neto"].map((id) => {
        const l = finanzas.LINEAS.find((x) => x.id === id);
        const d = presupuesto[id] ? ((real[id] - presupuesto[id]) / presupuesto[id]) * 100 : 0;
        return `- **${l.label}**: ${n(real[id])} contra ${n(presupuesto[id])} M (${pct(d)})`;
      });
      return `Acumulado enero a agosto, datos conciliados [Tango] [Presupuesto anual]:\n\n${lineas.join("\n")}\n\nRecomendación: el desvío de ingresos es de ${n(real.ingresos - presupuesto.ingresos, 1)} M y se concentra en droguerías. Conviene revisarlo con Comercial antes de rehacer el forecast. [Ver el P&L](#/finanzas)`;
    }
  },
  {
    id: "caja",
    ejemplo: "¿Cómo está la caja en las próximas semanas?",
    keys: ["caja", "liquidez", "cash", "flujo", "semanas", "saldo", "plata", "fondos"],
    responder() {
      const c = finanzas.caja();
      const peor = c.semanas.reduce((a, s) => (s.saldo < a.saldo ? s : a));
      return `Flujo a 13 semanas, proyectado [Tango] [Presupuesto anual]:\n\n- Saldo de hoy: **${n(c.posicion.reduce((a, x) => a + x.saldo, 0))} ARS M** en ${c.posicion.length} cuentas\n- Piso del período: **${n(c.saldoMinimo, 1)} M** en ${peor.semana}, contra un mínimo operativo de ${n(c.minimoOperativo)} M\n- Saldo al cierre: ${n(c.semanas.at(-1).saldo)} M\n${c.quiebre ? `- **Perfora el mínimo en ${c.quiebre}**` : "- No perfora el mínimo en todo el horizonte"}\n\nLa semana más exigente es ${peor.semana}: en la 3 vencen el anticipo de ganancias y el IVA.\n\nRecomendación: ${c.saldoMinimo - c.minimoOperativo < 30 ? "el margen sobre el mínimo es de pocos millones: conviene adelantar cobranzas de droguerías antes de la semana 3" : "no hace falta acción inmediata sobre la caja"}. [Ver el flujo](#/finanzas)`;
    }
  },
  {
    id: "canales",
    ejemplo: "¿Cuánto ganamos en cada canal?",
    keys: ["canal", "canales", "margen", "ganamos", "rentabilidad", "mercado", "libre", "meli", "web", "droguerias"],
    responder() {
      const d = finanzas.dimensiones(8);
      const orden = [...d.canal].sort((a, b) => b.margenPct - a.margenPct);
      return `Ventas y margen por canal, enero a agosto [Tango] [Shopify] [Mercado Libre]:\n\n${orden.map((c) => `- **${c.label}**: ${n(c.ventas)} M vendidos, ${n(c.margenPct, 1)}% de margen`).join("\n")}\n\nMercado Libre es el canal de menor margen: la comisión se lleva 14,2% [Mercado Pago].\n\nRecomendación: usar Mercado Libre para captar y llevar la recompra a la web propia, que rinde unos 17 puntos más. [Ver el análisis](#/finanzas)`;
    }
  },
  {
    id: "escenario",
    ejemplo: "¿Qué pasa si el dólar sube 40%?",
    keys: ["si", "sube", "baja", "pasa", "escenario", "simula", "dolar", "ventas", "costos", "inflacion"],
    responder(texto) {
      const t = norm(texto);
      const m = t.match(/(\d{1,3})\s*(%|por ciento|puntos)/);
      const magnitud = m ? Number(m[1]) : 20;
      const signo = /baja|cae|caen|reduce|menos/.test(t) ? -1 : 1;
      const variable = /dolar|cambio|devalua/.test(t) ? "tipoCambio"
        : /costo|insumo|produccion/.test(t) ? "costos"
        : /inflacion|gasto/.test(t) ? "inflacion"
        : /comision/.test(t) ? "comisiones"
        : /cobranza|atras/.test(t) ? "cobranzaAtrasada"
        : /precio/.test(t) ? "precio"
        : "ventas";
      const label = finanzas.VARIABLES_ESCENARIO.find((v) => v.id === variable).label;
      const s = finanzas.escenario({ [variable]: signo * magnitud });
      const dif = (a, b) => `${n(a)} contra ${n(b)} M (${pct(((a - b) / Math.abs(b)) * 100)})`;
      return `Escenario simulado: **${label} ${signo > 0 ? "+" : "−"}${magnitud}%**, aplicado solo a los meses no cerrados [Tango] [Presupuesto anual].\n\n- Ingresos del año: ${dif(s.simulado.ingresos, s.base.ingresos)}\n- EBITDA: ${dif(s.simulado.ebitda, s.base.ebitda)}\n- Resultado neto: ${dif(s.simulado.neto, s.base.neto)}\n- Caja al cierre de 13 semanas: ${n(s.cajaSimulada.saldoFinal)} M${s.cajaSimulada.quiebre ? `, perfora el mínimo en ${s.cajaSimulada.quiebre}` : ", sin perforar el mínimo"}\n\nRecomendación: ${s.cajaSimulada.quiebre ? "este escenario rompe la caja: hay que tener lista una línea de crédito o adelantar cobranzas" : "el escenario es absorbible con la caja actual"}. [Probar otros escenarios](#/finanzas)`;
    }
  },
  {
    id: "gastos",
    ejemplo: "¿Qué gastos están sobre presupuesto?",
    keys: ["gasto", "gastos", "sobre", "exceso", "marketing", "sga", "logistica", "factura", "facturas", "comprobante"],
    responder(texto) {
      const t = norm(texto);
      const ind = finanzas.indicadores();
      const { real, presupuesto } = ind.acumulado;
      const linea = /marketing/.test(t) ? "marketing" : /logistica/.test(t) ? "logistica" : /comision/.test(t) ? "comisiones" : /sga|administra|estructura/.test(t) ? "sga" : null;
      if (linea) {
        const detalle = finanzas.detalleLinea(linea);
        const l = finanzas.LINEAS.find((x) => x.id === linea);
        return `**${l.label}**, acumulado enero a agosto: ${n(real[linea])} M contra ${n(presupuesto[linea])} M de presupuesto (${pct(((real[linea] - presupuesto[linea]) / presupuesto[linea]) * 100)}) [Tango].\n\nApertura del último mes por centro de costo:\n\n${detalle.map((c) => `- **${c.label}**: ${n(c.monto, 1)} M (${c.comprobantes.length} comprobantes)`).join("\n")}\n\nRecomendación: el detalle comprobante por comprobante está en el tablero, con el número de factura y el proveedor. [Abrir el P&L](#/finanzas)`;
      }
      const sobre = ["marketing", "fuerzaVentas", "sga", "logistica", "comisiones"]
        .map((id) => ({ id, label: finanzas.LINEAS.find((x) => x.id === id).label, desvio: ((real[id] - presupuesto[id]) / presupuesto[id]) * 100, monto: real[id] - presupuesto[id] }))
        .filter((x) => x.monto > 0).sort((a, b) => b.monto - a.monto);
      return `Líneas de gasto por encima del presupuesto, enero a agosto [Tango] [Presupuesto anual]:\n\n${sobre.map((x) => `- **${x.label}**: ${n(x.monto, 1)} M de más (${pct(x.desvio)})`).join("\n") || "- Ninguna"}\n\nRecomendación: preguntame por una línea puntual y te abro el detalle por centro de costo y comprobante.`;
    }
  },
  {
    id: "cobranzas",
    ejemplo: "¿Cuánto nos deben y quién está vencido?",
    keys: ["deben", "deuda", "cobrar", "cobranza", "cobranzas", "vencido", "vencidos", "dso", "morosidad"],
    responder() {
      const ind = finanzas.indicadores();
      const d = finanzas.dimensiones(8);
      const vencidos = d.cliente.filter((c) => c.vencido > 0);
      return `Cuentas por cobrar [Tango]:\n\n${ind.aging.map((a) => `- ${a.bucket}: ${n(a.monto)} M`).join("\n")}\n\nVencido a más de 60 días, por cliente:\n\n${vencidos.map((c) => `- **${c.label}**: ${n(c.vencido)} M, DSO de ${c.dso} días`).join("\n")}\n\nEl DSO del negocio es de 68 días contra un objetivo de 55.\n\nRecomendación: Droguería B concentra deuda vencida y además tiene la renovación de contrato en negociación. Conviene atar una cosa a la otra. [Ver cobranzas](#/finanzas)`;
    }
  }
];

const RD = [
  {
    id: "inversion-adicional",
    ejemplo: "¿En qué proyectos deberíamos invertir 200 millones adicionales?",
    keys: ["invertir", "inversion", "adicional", "adicionales", "plata", "poner", "millones", "proyecto", "proyectos", "donde"],
    responder(texto) {
      const t = norm(texto);
      const m = t.match(/(\d+(?:[.,]\d+)?)\s*(millon|millones|m\b|usd|dolares)/);
      let monto = m ? Number(m[1].replace(",", ".")) : 200;
      if (/usd|dolares/.test(t)) monto = r0(monto * 1450 / 1e3); // USD a ARS M, tipo de cambio de referencia
      const plan = rd.inversionAdicional(monto);
      return `Con **${n(plan.monto)} ARS M** adicionales, así los asignaría [Presupuesto anual] [Moondesk]:\n\n${plan.asignacion.map((a) => `- **${a.proyecto}**: ${n(a.asignado)} M · retorno esperado ${n(a.roiEsperado)}%\n  ${a.efecto}`).join("\n")}\n\nValor esperado que se agrega: **${n(plan.valorEsperadoGanado)} M**${plan.sobrante > 0 ? `, y quedarían ${n(plan.sobrante)} M sin asignar` : ""}.\n\nRecomendación: ${plan.nota} [Ver el motor de decisión](#/rd)`;
    }
  },
  {
    id: "proyectos-demorados",
    ejemplo: "¿Qué proyectos están demorados o trabados?",
    keys: ["demorado", "demorados", "trabado", "trabados", "atrasado", "retraso", "hito", "hitos", "proyecto", "proyectos"],
    responder() {
      const ps = rd.proyectos().filter((p) => p.demorado).sort((a, b) => b.diasDemora - a.diasDemora);
      if (!ps.length) return "Ningún proyecto está demorado contra su hito [Moondesk].";
      return `${ps.length} proyectos demorados contra su próximo hito [Moondesk]:\n\n${ps.map((p) => `- **${p.nombre}** (${p.estado}): ${p.diasDemora} días de demora\n  Hito: ${p.hitoProximo}, previsto para el ${p.fechaHito.slice(8)}/${p.fechaHito.slice(5, 7)} · ${n(p.consumido)} M ya invertidos`).join("\n")}\n\nRecomendación: la Emulsión facial es la más urgente: está lista y la traba una aprobación interna de packaging.`;
    }
  },
  {
    id: "radar",
    ejemplo: "¿Qué novedades del mercado afectan nuestros productos?",
    keys: ["novedad", "novedades", "paper", "papers", "patente", "patentes", "regulacion", "anmat", "afecta", "tendencia", "descubrimiento", "radar"],
    responder() {
      const riesgos = rd.RADAR.filter((x) => x.impacto === "riesgo");
      const oportunidades = rd.RADAR.filter((x) => x.impacto === "oportunidad").slice(0, 3);
      const fila = (x) => `- **${x.titulo}** (${x.tipo}, ${x.fuente}, ${x.fecha.slice(8)}/${x.fecha.slice(5, 7)}, confiabilidad ${x.confiabilidad})\n  Afecta a ${x.afecta}. ${x.resumen}`;
      return `Radar de las últimas semanas.\n\n**Riesgos**\n${riesgos.map(fila).join("\n")}\n\n**Oportunidades**\n${oportunidades.map(fila).join("\n")}\n\nRecomendación: los dos riesgos caen sobre el mismo proyecto, el solar facial con color. Conviene decidir si se reformula o se pausa antes de seguir invirtiendo. [Ver el radar](#/rd)`;
    }
  },
  {
    id: "competencia",
    ejemplo: "¿Cuánto invierte la competencia en R&D?",
    keys: ["competencia", "competidor", "competidores", "invierte", "invierten", "comparacion", "benchmark", "rivales"],
    responder() {
      const c = rd.COMPETIDORES;
      const propio = c.find((x) => x.propio);
      return `Inversión estimada en I+D, últimos 12 meses:\n\n${c.map((x) => `- **${x.competidor}**: ${n(x.inversionEstimada)} ARS M, ${n(x.sobreVentas, 1)}% de sus ventas, ~${x.investigadores} investigadores${x.propio ? " (dato propio)" : ` · confianza ${x.confianza}`}`).join("\n")}\n\nMétodo de las estimaciones: ${c.filter((x) => !x.propio).map((x) => `${x.competidor}: ${x.metodo.toLowerCase()}`).join("; ")}.\n\nNuestra intensidad (${n(propio.sobreVentas, 1)}%) está en el promedio del sector, pero con menos investigadores y menos patentes que el competidor internacional.\n\nRecomendación: donde más se puede compensar la diferencia de escala es con alianzas: hoy tenemos dos. [Ver la comparación](#/rd)`;
    }
  },
  {
    id: "portfolio",
    ejemplo: "¿Qué proyectos conviene acelerar o cancelar?",
    keys: ["acelerar", "cancelar", "pausar", "portfolio", "ranking", "prioridad", "conviene", "decidir", "decision"],
    responder() {
      const { ranking } = rd.decision();
      const porAccion = (a) => ranking.filter((p) => p.accion === a);
      const bloque = (titulo, lista) => lista.length ? `**${titulo}**\n${lista.map((p) => `- ${p.nombre}: ${p.motivo} (valor esperado ${n(p.valorEsperado)} M, éxito ${n(p.exito)}%)`).join("\n")}` : null;
      const bloques = [bloque("Acelerar", porAccion("acelerar")), bloque("Asociarse", porAccion("asociarse")), bloque("Pausar", porAccion("pausar")), bloque("Cancelar", porAccion("cancelar"))].filter(Boolean);
      return `Ranking del portfolio por atractivo estratégico [Presupuesto anual] [Moondesk]:\n\n${bloques.join("\n\n")}\n\nEl resto se mantiene como está.\n\nRecomendación: es criterio del agente, no un dato: cada acción se apoya en valor esperado, probabilidad de éxito, tiempo al mercado y riesgo. [Ver el motor de decisión](#/rd)`;
    }
  },
  {
    id: "presupuesto-rd",
    ejemplo: "¿Cómo viene el presupuesto de R&D?",
    keys: ["presupuesto", "ejecutado", "comprometido", "disponible", "gasto", "viene", "proyeccion"],
    responder() {
      const p = rd.indicadores().presupuesto;
      return `Presupuesto de R&D ${p.anual} ARS M [Presupuesto anual]:\n\n- Ejecutado: **${n(p.ejecutado)} M** (${n(p.ejecutadoPct, 1)}%)\n- Comprometido: ${n(p.comprometido)} M\n- Disponible: **${n(p.disponible)} M**\n- Proyección de cierre: ${n(p.proyeccionCierre)} M (${pct(((p.proyeccionCierre - p.anual) / p.anual) * 100)} contra el presupuesto)\n\nPor tipo de gasto:\n${p.porTipo.map((t) => `- ${t.tipo}: ${n(t.monto)} M`).join("\n")}\n\nRecomendación: la proyección se pasa del presupuesto. Si se aprueba la inversión adicional, conviene decidirla junto con la pausa de los proyectos de bajo atractivo. [Ver el tablero](#/rd)`;
    }
  }
];

export const POR_AGENTE = { comercial: COMERCIAL, finanzas: FINANZAS, rd: RD, ceo: [...COMERCIAL, ...FINANZAS, ...RD] };

const stems = (s) => norm(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2).map((w) => w.slice(0, 5));

/** Devuelve la respuesta de la consulta que mejor matchea, o null si ninguna alcanza. */
export function responder(agentId, texto) {
  const lista = POR_AGENTE[agentId];
  if (!lista) return null;
  const tokens = new Set(stems(texto));
  let mejor = null;
  for (const consulta of lista) {
    const claves = new Set(consulta.keys.map((k) => norm(k).slice(0, 5)));
    let score = 0;
    for (const k of claves) if (tokens.has(k)) score++;
    for (const k of new Set(stems(consulta.ejemplo))) if (tokens.has(k)) score += 0.5;
    if (!mejor || score > mejor.score) mejor = { consulta, score };
  }
  if (!mejor || mejor.score < 2.5) return null;
  try {
    return mejor.consulta.responder(texto);
  } catch {
    return null;
  }
}

export function ejemplos(agentId) {
  return (POR_AGENTE[agentId] || []).map((c) => c.ejemplo);
}
