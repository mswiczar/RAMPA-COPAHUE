// Agentes verticales de Copahue con datos SIMULADOS de demostración.
// Cuando se conecten los sistemas reales, `data` sale de Tango, IQVia, Elvis, etc.

export const PERIODO = "Agosto 2026, comparado con julio 2026";

const qa = (pairs) => pairs.map(([q, a]) => ({ q, a }));

export const AGENTS = [
  {
    id: "rd", name: "Agente R&D", short: "R&D",
    mission: "detectar oportunidades de producto cruzando tendencias de consumo y crecimiento de segmentos",
    tagline: "Tendencias y segmentos para el próximo lanzamiento.",
    systems: ["WGSN", "IQVia", "Moondesk"],
    alerts: [
      { sev: "warn", t: "Protección solar facial crece 19% y Caviahue tiene 3,2% de share" },
      { sev: "info", t: "Anti-age crece 11%: sin presencia de la marca" }
    ],
    data: {
      segmentos_de_mercado: { fuente: "IQVia", filas: [
        { segmento: "Protección solar facial", crecimiento: "+19%", share_caviahue: "3,2%" },
        { segmento: "Hidratantes reparadoras", crecimiento: "+14%", share_caviahue: "6,1%" },
        { segmento: "Anti-age", crecimiento: "+11%", share_caviahue: "Sin presencia" },
        { segmento: "Dermolimpieza", crecimiento: "+8%", share_caviahue: "2,4%" },
        { segmento: "Corporales", crecimiento: "+5%", share_caviahue: "11,8%" }
      ] },
      tendencias: { fuente: "WGSN", filas: [
        { tendencia: "Cuidado de la barrera cutánea", detalle: "Reparar antes que tratar" },
        { tendencia: "Protección solar diaria urbana", detalle: "FPS cotidiano, texturas livianas" },
        { tendencia: "Fórmulas minimalistas", detalle: "Pocos ingredientes, claims claros" },
        { tendencia: "Origen mineral y termal", detalle: "Valor del origen del ingrediente" }
      ] }
    },
    qa: qa([
      ["¿Qué segmentos crecen y dónde no estamos?", "Crecimiento interanual por segmento y share de Caviahue [IQVia]:\n\n- **Protección solar facial**: +19%, share 3,2%\n- **Hidratantes reparadoras**: +14%, share 6,1%\n- **Anti-age**: +11%, **sin presencia**\n- **Dermolimpieza**: +8%, share 2,4%\n- **Corporales**: +5%, share 11,8% (nuestro segmento fuerte)\n\nRecomendación: el mayor potencial está en solar facial, donde ya tenemos marca y el segmento es el que más crece."],
      ["¿Qué oportunidad de lanzamiento ves?", "Dos candidatos:\n\n- **Solar facial con color**: el segmento crece 19% [IQVia] y la protección urbana diaria es tendencia [WGSN].\n- **Serum de barrera**: une la tendencia más fuerte [WGSN] con las hidratantes reparadoras (+14%), y ya tiene brief en diseño [Moondesk].\n\nRecomendación: acelerar el Serum Barrera, que ya está en marcha, y evaluar el solar facial para 2027."],
      ["¿Qué dicen las tendencias de consumo?", "Tendencias del último reporte trimestral [WGSN]:\n\n- **Cuidado de la barrera cutánea**: reparar antes que tratar\n- **Protección solar diaria urbana**: FPS cotidiano, texturas livianas\n- **Fórmulas minimalistas**: pocos ingredientes y claims claros\n- **Origen mineral y termal**: valor del origen\n\nRecomendación: la última se alinea con el origen patagónico de la marca y conviene reflejarla en la comunicación."]
    ])
  },
  {
    id: "comercial", name: "Agente Comercial", short: "Comercial",
    mission: "leer mercado, canal y fuerza de ventas: sell-in, sell-out, share por zona, productividad de visitadores y promociones",
    tagline: "Mercado, canal y fuerza de ventas, todos los días.",
    systems: ["Tango", "IQVia", "Elvis", "Bonus Dermo", "Avanter", "Sell Out", "Grilla promocional"],
    alerts: [
      { sev: "crit", t: "AMBA: el share cae de 8,3% a 7,8%" },
      { sev: "warn", t: "APM-05 Mendoza: 0,60 recetas por visita, la más baja" },
      { sev: "info", t: "El ciclo de FPS50 movió +31% de sell-out" }
    ],
    data: {
      zonas: { fuente: "Tango, Sell Out, IQVia", filas: [
        { zona: "AMBA", sell_in: 48200, sell_out: 51900, share_jul: "8,3%", share_ago: "7,8%" },
        { zona: "Córdoba", sell_in: 12400, sell_out: 11800, share_jul: "8,7%", share_ago: "9,1%" },
        { zona: "Santa Fe", sell_in: 10100, sell_out: 10350, share_jul: "8,5%", share_ago: "8,4%" },
        { zona: "Mendoza", sell_in: 6900, sell_out: 6100, share_jul: "6,0%", share_ago: "6,2%" },
        { zona: "Patagonia", sell_in: 9800, sell_out: 10400, share_jul: "12,1%", share_ago: "12,6%" },
        { zona: "NOA", sell_in: 5200, sell_out: 4300, share_jul: "5,3%", share_ago: "4,9%" }
      ] },
      visitadores: { fuente: "Elvis, Bonus Dermo", filas: [
        { apm: "APM-01 AMBA Norte", visitas: 182, recetas: 214, recetas_por_visita: "1,18" },
        { apm: "APM-02 AMBA Sur", visitas: 176, recetas: 121, recetas_por_visita: "0,69" },
        { apm: "APM-03 Córdoba", visitas: 150, recetas: 168, recetas_por_visita: "1,12" },
        { apm: "APM-04 Santa Fe", visitas: 141, recetas: 139, recetas_por_visita: "0,99" },
        { apm: "APM-05 Mendoza", visitas: 128, recetas: 77, recetas_por_visita: "0,60" },
        { apm: "APM-06 Patagonia", visitas: 133, recetas: 171, recetas_por_visita: "1,29" }
      ] },
      ciclo_promocional_agosto: { fuente: "Grilla promocional, Avanter, Sell Out", filas: [
        { producto: "Protector Solar FPS50 120ml", descuento: "15%", sell_out_vs_julio: "+31%" },
        { producto: "Crema de Manos 50g", descuento: "10%", sell_out_vs_julio: "+4%" },
        { producto: "Sin promoción (promedio)", descuento: "—", sell_out_vs_julio: "+2%" }
      ] }
    },
    qa: qa([
      ["¿Qué visitadores generan más recetas por visita?", "Cruzando visitas y bonos de agosto [Elvis] [Bonus Dermo]:\n\n- **APM-06 Patagonia**: 1,29 recetas por visita (133 visitas, 171 bonos)\n- **APM-01 AMBA Norte**: 1,18 (182 visitas, 214 bonos)\n- **APM-03 Córdoba**: 1,12 (150 visitas, 168 bonos)\n\nLos más bajos son **APM-05 Mendoza** con 0,60 y **APM-02 AMBA Sur** con 0,69.\n\nRecomendación: revisar el ruteo de APM-05 y APM-02 y cruzar qué médicos visitados no generan bonos."],
      ["¿Dónde perdimos market share este mes?", "Share de agosto contra julio [IQVia]:\n\n- **AMBA**: 8,3% → 7,8% (−0,5 pp), la zona de mayor volumen\n- **NOA**: 5,3% → 4,9% (−0,4 pp)\n- **Santa Fe**: 8,5% → 8,4% (−0,1 pp)\n\nCrecimos en **Patagonia** (+0,5 pp) y **Córdoba** (+0,4 pp). En AMBA el sell-out (51.900 u) supera al sell-in (48.200 u), así que la caída no viene del canal [Tango] [Sell Out].\n\nRecomendación: foco de visita en AMBA Sur, que además tiene la productividad más baja de la zona."],
      ["¿Funcionó el último ciclo promocional?", "Ciclo de agosto, sell-out contra julio [Sell Out] [Avanter]:\n\n- **Protector Solar FPS50** (15% de descuento): **+31%**\n- **Crema de Manos 50g** (10% de descuento): +4%\n- Productos sin promoción: +2% promedio\n\nEl descuento en manos casi no movió la venta.\n\nRecomendación: repetir el foco en FPS50 y cambiar el producto con descuento del 10% en el próximo ciclo [Grilla promocional]."]
    ])
  },
  {
    id: "finanzas", name: "Agente Finanzas", short: "Finanzas",
    mission: "seguir ventas contra presupuesto, margen por canal, conciliación del e-commerce y cobranzas",
    tagline: "Real contra presupuesto, margen por canal y caja.",
    systems: ["Tango", "Presupuesto anual", "Shopify", "Mercado Libre", "Mercado Pago", "Facturante"],
    alerts: [
      { sev: "crit", t: "Ventas de agosto −5,3% contra presupuesto" },
      { sev: "warn", t: "37 órdenes online sin factura en Tango (ARS 4,1 M)" }
    ],
    data: {
      ventas_por_canal_ars_millones: { fuente: "Tango, Presupuesto anual", filas: [
        { canal: "Droguerías", real: 820, presupuesto: 870, margen: "38%" },
        { canal: "Farmacias directas", real: 190, presupuesto: 200, margen: "41%" },
        { canal: "Web propia", real: 135, presupuesto: 120, margen: "46%" },
        { canal: "Mercado Libre", real: 95, presupuesto: 120, margen: "29%" },
        { canal: "Total", real: 1240, presupuesto: 1310, margen: "—" }
      ] },
      conciliacion_online: { fuente: "Shopify, Mercado Libre, Mercado Pago vs Tango", filas: [
        { origen: "Shopify", ordenes_sin_factura: 29 },
        { origen: "Mercado Libre", ordenes_sin_factura: 8 },
        { origen: "Total (ARS 4,1 M, 22 ya cobradas)", ordenes_sin_factura: 37 }
      ] },
      cuentas_a_cobrar_vencidas_ars_millones: { fuente: "Tango", filas: [
        { cliente: "Droguería A", vencido_mas_60_dias: 52 },
        { cliente: "Droguería B", vencido_mas_60_dias: 31 },
        { cliente: "Droguería C", vencido_mas_60_dias: 13 }
      ] }
    },
    qa: qa([
      ["¿Cómo venimos contra presupuesto?", "Ventas netas de agosto: **ARS 1.240 M** contra 1.310 M presupuestados (**−5,3%**) [Tango] [Presupuesto anual].\n\n- **Droguerías**: 820 vs 870 M (−50 M)\n- **Mercado Libre**: 95 vs 120 M (−25 M)\n- **Farmacias directas**: 190 vs 200 M (−10 M)\n- **Web propia**: 135 vs 120 M (**+15 M**)\n\nRecomendación: revisar con Comercial la caída en droguerías antes de ajustar la versión de septiembre del presupuesto."],
      ["¿Cuánto ganamos realmente en Mercado Libre?", "En agosto Mercado Libre vendió **ARS 95 M** [Mercado Libre]. La comisión fue de 14,2% (13,5 M) y el margen de contribución quedó en **29%** [Tango].\n\n- Web propia: 46%\n- Farmacias directas: 41%\n- Droguerías: 38%\n\nCada venta que pasa de Mercado Libre a la web propia suma unos 17 puntos de margen.\n\nRecomendación: usar Mercado Libre para captar clientes y derivar la recompra a la web propia."],
      ["¿Qué ventas online no están conciliadas?", "Hay **37 órdenes** por **ARS 4,1 M** sin factura en Tango [Tango]:\n\n- 29 de Shopify [Shopify]\n- 8 de Mercado Libre [Mercado Libre]\n\n22 de esas órdenes ya están cobradas [Mercado Pago].\n\nRecomendación: emitir esta semana las facturas de las 22 órdenes cobradas [Facturante] y revisar las 15 restantes con E-commerce."]
    ])
  },
  {
    id: "operaciones", name: "Agente Operaciones", short: "Operaciones",
    mission: "unificar el stock real entre Tango y depósitos, anticipar vencimientos y detectar quiebres en farmacias online",
    tagline: "Una sola verdad de stock, del depósito a la góndola.",
    systems: ["Tango", "Disprofarma", "Ship Now", "Informe de stock online"],
    alerts: [
      { sev: "crit", t: "FPS50 sin stock en 23 de 60 farmacias online" },
      { sev: "warn", t: "Stock real de FPS50: 1.400 u menos que en Tango" },
      { sev: "info", t: "Lote L2311 de Crema de Pies vence el 30/11" }
    ],
    data: {
      stock_unidades: { fuente: "Tango, Disprofarma, Ship Now", filas: [
        { producto: "Protector Solar FPS50 120ml", tango: 11200, real: 9800, diferencia: -1400 },
        { producto: "Crema Corporal 200g", tango: 30200, real: 31000, diferencia: 800 },
        { producto: "Emulsión Facial 50ml", tango: 4600, real: 3900, diferencia: -700 },
        { producto: "Crema de Manos 50g", tango: 14500, real: 14500, diferencia: 0 },
        { producto: "Crema de Pies 100g", tango: 7300, real: 7200, diferencia: -100 },
        { producto: "Gel Limpiador 150ml", tango: 5600, real: 5600, diferencia: 0 }
      ] },
      lotes_por_vencer: { fuente: "Disprofarma", filas: [
        { producto: "Crema de Pies 100g", lote: "L2311", unidades: 2100, vence: "30/11/2026" },
        { producto: "Gel Limpiador 150ml", lote: "L2402", unidades: 900, vence: "15/12/2026" }
      ] },
      quiebres_farmacias_online: { fuente: "Informe de stock online (60 tiendas)", filas: [
        { producto: "Protector Solar FPS50 120ml", tiendas_sin_stock: 23 },
        { producto: "Emulsión Facial 50ml", tiendas_sin_stock: 11 }
      ] }
    },
    qa: qa([
      ["¿Dónde difiere el stock de Tango del real?", "Comparando Tango con los depósitos [Tango] [Disprofarma] [Ship Now]:\n\n- **Protector Solar FPS50**: Tango 11.200, real 9.800 → **−1.400 u**\n- **Emulsión Facial 50ml**: Tango 4.600, real 3.900 → **−700 u**\n- **Crema Corporal 200g**: Tango 30.200, real 31.000 → +800 u\n\nLos faltantes caen justo en los dos productos con quiebre.\n\nRecomendación: ajustar Tango con el stock real antes de confirmar el plan de producción."],
      ["¿Qué lotes vencen pronto?", "Dos lotes vencen en los próximos 90 días [Disprofarma]:\n\n- **Crema de Pies 100g**, lote L2311: 2.100 u, vence el 30/11/2026\n- **Gel Limpiador 150ml**, lote L2402: 900 u, vence el 15/12/2026\n\nRecomendación: incluir Crema de Pies en la grilla de octubre y priorizar ambos lotes en los pedidos de farmacias de alta rotación."],
      ["¿Dónde hay quiebres en farmacias online?", "Según el relevamiento diario de 60 tiendas online de farmacias [Informe de stock online]:\n\n- **Protector Solar FPS50**: sin stock en **23 tiendas** (38%)\n- **Emulsión Facial 50ml**: sin stock en 11 (18%)\n\nCoincide con el faltante de stock en depósito [Disprofarma].\n\nRecomendación: priorizar la reposición de FPS50 a las cadenas con mayor sell-out y avisar a Comercial."]
    ])
  },
  {
    id: "producto", name: "Agente Producto", short: "Producto",
    mission: "seguir el estado del packaging y de los lanzamientos, y avisar qué los frena",
    tagline: "Packaging y lanzamientos, sin perseguir aprobaciones.",
    systems: ["Moondesk", "Sell Out", "Informe de stock online"],
    alerts: [
      { sev: "crit", t: "Pomo nuevo de FPS50: 12 días trabado en aprobación" },
      { sev: "info", t: "Crema Corporal 400ml: aprobada, en imprenta" }
    ],
    data: {
      proyectos_de_packaging: { fuente: "Moondesk", filas: [
        { proyecto: "FPS50, pomo nuevo", estado: "En aprobación regulatoria", dias: 12, lanzamiento: "01/11/2026" },
        { proyecto: "Emulsión Facial, claims", estado: "En revisión de Marketing", dias: 4, lanzamiento: "—" },
        { proyecto: "Crema Corporal 400ml", estado: "Aprobado, en imprenta", dias: 2, lanzamiento: "15/10/2026" },
        { proyecto: "Serum Barrera", estado: "Brief de diseño", dias: 9, lanzamiento: "1T 2027" }
      ] }
    },
    qa: qa([
      ["¿Qué packaging está demorado?", "**FPS50, pomo nuevo**: lleva **12 días** trabado en aprobación regulatoria [Moondesk]. El relanzamiento es el 01/11 y el producto ya tiene quiebres.\n\n**Emulsión Facial, claims**: 4 días en revisión de Marketing [Moondesk].\n\nRecomendación: escalar hoy la aprobación del pomo de FPS50."],
      ["¿Cómo está el pipeline de lanzamientos?", "- **Crema Corporal 400ml**: aprobado, en imprenta, lanza el 15/10 [Moondesk]\n- **Emulsión Facial (claims nuevos)**: en revisión de Marketing, 4 días\n- **FPS50 pomo nuevo**: en aprobación regulatoria hace 12 días, lanza el 01/11\n- **Serum Barrera**: brief de diseño, 1T 2027\n\nRecomendación: el único proyecto con riesgo de fecha es FPS50."],
      ["¿Qué conviene priorizar?", "**FPS50**, porque reúne las tres señales:\n\n- Mejor respuesta promocional: +31% de sell-out [Sell Out]\n- Quiebre en 38% de las tiendas online [Informe de stock online]\n- Packaging nuevo trabado hace 12 días [Moondesk]\n\nRecomendación: armar un equipo corto de Producto, Regulatorio y Producción para destrabar el pomo y asegurar el lote de octubre."]
    ])
  },
  {
    id: "legal", name: "Agente Riesgo y Legal", short: "Riesgo y Legal",
    mission: "vigilar contratos, registros regulatorios, datos personales y exposición de crédito",
    tagline: "Contratos, registros, datos personales y crédito.",
    systems: ["Contratos", "Registros regulatorios", "Bonus Dermo", "Tango", "Avanter"],
    alerts: [
      { sev: "crit", t: "Preaviso a Droguería B antes del 01/10" },
      { sev: "warn", t: "Bonus Dermo: 2 usuarios externos sin acceso por rol" },
      { sev: "warn", t: "ARS 96 M vencidos a más de 60 días" }
    ],
    data: {
      vencimientos: { fuente: "Contratos, Registros regulatorios", filas: [
        { item: "Contrato de distribución, Droguería B", vence: "31/10/2026", accion: "Preaviso antes del 01/10" },
        { item: "Registro Emulsión Facial 50ml", vence: "20/01/2027", accion: "Iniciar renovación antes del 22/10" }
      ] },
      datos_personales: { fuente: "Bonus Dermo", filas: [
        { sistema: "Bonus Dermo", contenido: "Datos de médicos y pacientes (Ley 25.326)", observacion: "2 usuarios externos sin acceso por rol" }
      ] },
      credito: { fuente: "Tango, Avanter", filas: [
        { concepto: "Vencido >60 días Droguería A", ars_millones: 52 },
        { concepto: "Vencido >60 días Droguería B", ars_millones: 31 },
        { concepto: "Vencido >60 días Droguería C", ars_millones: 13 },
        { concepto: "Liquidaciones observadas (Avanter)", ars_millones: 1.8 }
      ] }
    },
    qa: qa([
      ["¿Qué vencimientos tengo en los próximos 60 días?", "- **Contrato con Droguería B**: vence el 31/10 con renovación automática. Para renegociar hay que dar **preaviso antes del 01/10** [Contratos]\n- **Registro de Emulsión Facial**: vence el 20/01/2027. Conviene iniciar la renovación **antes del 22/10** [Registros regulatorios]\n\nRecomendación: definir esta semana si se renegocia con Droguería B, que además tiene ARS 31 M vencidos [Tango]."],
      ["¿Qué riesgos de datos personales hay?", "**Bonus Dermo** guarda datos de médicos y pacientes, alcanzados por la Ley 25.326 [Bonus Dermo]. Hoy hay **2 usuarios externos sin acceso por rol**.\n\nRecomendación: restringir esos accesos antes de conectar Bonus Dermo a cualquier agente. Es parte del checklist de Puerta Segura."],
      ["¿Qué exposición de crédito tenemos?", "Cuentas a cobrar vencidas a más de 60 días: **ARS 96 M** [Tango]\n\n- Droguería A: 52 M\n- Droguería B: 31 M\n- Droguería C: 13 M\n\nAdemás hay 3 liquidaciones observadas por ARS 1,8 M, abiertas hace más de 45 días [Avanter].\n\nRecomendación: condicionar la renovación con Droguería B a un plan de pago."]
    ])
  },
  {
    id: "produccion", name: "Agente Producción", short: "Producción",
    mission: "comparar stock real, demanda proyectada y plan de producción en plantas de terceros, y sugerir órdenes",
    tagline: "Plan de producción alineado a la demanda y la promoción.",
    systems: ["Capataz", "Grilla promocional", "Disprofarma"],
    alerts: [
      { sev: "crit", t: "FPS50: faltan 4.200 u para septiembre y octubre" },
      { sev: "warn", t: "Emulsión Facial: faltan 1.600 u" },
      { sev: "info", t: "Crema Corporal: unas 17.000 u de sobrestock" }
    ],
    data: {
      plan_septiembre_octubre_unidades: { fuente: "Capataz, Disprofarma, Grilla promocional", filas: [
        { producto: "Protector Solar FPS50 120ml", stock_real: 9800, plan: 12000, demanda: 26000, saldo: -4200 },
        { producto: "Crema Corporal 200g", stock_real: 31000, plan: 8000, demanda: 22000, saldo: 17000 },
        { producto: "Crema de Manos 50g", stock_real: 14500, plan: 0, demanda: 11000, saldo: 3500 },
        { producto: "Emulsión Facial 50ml", stock_real: 3900, plan: 4000, demanda: 9500, saldo: -1600 },
        { producto: "Crema de Pies 100g", stock_real: 7200, plan: 2000, demanda: 5100, saldo: 4100 },
        { producto: "Gel Limpiador 150ml", stock_real: 5600, plan: 0, demanda: 4800, saldo: 800 }
      ] }
    },
    qa: qa([
      ["¿Alcanza el plan de producción para el próximo ciclo?", "No para dos productos, con stock real y demanda de septiembre y octubre [Capataz] [Grilla promocional]:\n\n- **Protector Solar FPS50**: stock 9.800 + plan 12.000 contra demanda de 26.000 → **faltan 4.200 u**\n- **Emulsión Facial 50ml**: 3.900 + 4.000 contra 9.500 → **faltan 1.600 u**\n\nEl resto de la línea está cubierto.\n\nRecomendación: con 6 semanas de lead time, emitir las órdenes adicionales antes del 25/09."],
      ["¿Qué producto tiene sobrestock?", "**Crema Corporal 200g**: 31.000 u en stock más un lote planificado de 8.000, contra una demanda de 22.000 [Capataz]. Sobran unas **17.000 u**, más de un mes y medio de venta.\n\nRecomendación: postergar el lote de 8.000 de Crema Corporal y usar esa capacidad para FPS50."],
      ["¿Qué órdenes conviene emitir esta semana?", "Dos órdenes sugeridas, con colchón de seguridad [Capataz]:\n\n- **Protector Solar FPS50**: 6.000 u (faltante de 4.200 más margen por el foco de octubre)\n- **Emulsión Facial 50ml**: 2.000 u (faltante de 1.600)\n\nY una postergación: el lote de 8.000 u de **Crema Corporal 200g**.\n\nRecomendación: aprobar las órdenes antes del 25/09. Requiere aprobación de Dirección."]
    ])
  },
  {
    id: "marketing", name: "Agente Marketing", short: "Marketing",
    mission: "medir el retorno de cada acción, controlar el presupuesto de marketing y conectar tendencias con campañas",
    tagline: "Inversión, retorno y campañas conectadas al mercado.",
    systems: ["Presupuesto de marketing", "Shopify", "WGSN", "IQVia"],
    alerts: [
      { sev: "warn", t: "Influencers: 25% sobre plan y retorno de 1,4x" },
      { sev: "info", t: "Google Ads rinde 3,3x" }
    ],
    data: {
      inversion_agosto_ars_millones: { fuente: "Presupuesto de marketing, Shopify", filas: [
        { accion: "Google Ads", real: 18.5, plan: 18, venta_atribuida: 61, retorno: "3,3x" },
        { accion: "Meta", real: 22, plan: 20, venta_atribuida: 48, retorno: "2,2x" },
        { accion: "Influencers", real: 15, plan: 12, venta_atribuida: 21, retorno: "1,4x" },
        { accion: "Material punto de venta", real: 9, plan: 10, venta_atribuida: "—", retorno: "—" }
      ] }
    },
    qa: qa([
      ["¿Qué acción de marketing rinde más?", "Retorno de agosto (venta online atribuida sobre inversión) [Presupuesto de marketing] [Shopify]:\n\n- **Google Ads**: 3,3x (ARS 18,5 M → 61 M)\n- **Meta**: 2,2x (22 M → 48 M)\n- **Influencers**: 1,4x (15 M → 21 M)\n\nRecomendación: mover parte de la inversión en influencers a Google Ads durante el próximo ciclo."],
      ["¿Cómo vamos contra el presupuesto de marketing?", "En agosto se gastaron **ARS 64,5 M** contra 60 M presupuestados (**+7,5%**) [Presupuesto de marketing].\n\n- **Influencers**: 15 M vs 12 M (+25%), el mayor desvío\n- **Meta**: 22 M vs 20 M (+10%)\n- **Google Ads**: 18,5 M vs 18 M (+3%)\n- **Material POP**: 9 M vs 10 M (−10%)\n\nRecomendación: congelar nuevas contrataciones de influencers hasta cerrar septiembre dentro del plan."],
      ["¿Qué tendencia deberíamos aprovechar?", "La más alineada con el portfolio es el **cuidado de la barrera cutánea** [WGSN]. Las hidratantes reparadoras crecen **14% interanual** y Caviahue tiene **6,1%** de share [IQVia].\n\nRecomendación: campaña de la línea corporal y facial con mensaje de barrera para el ciclo de octubre."]
    ])
  }
];

export const CEO = {
  id: "ceo", name: "CEO", short: "CEO",
  mission: "integrar lo que ven los agentes y priorizar decisiones para la dirección general",
  tagline: "Centro de decisión: lo que requiere tu atención hoy.",
  systems: ["Los 8 agentes"],
  alerts: [
    { sev: "crit", t: "Riesgo transversal: quiebre de FPS50 en el ciclo de octubre" },
    { sev: "warn", t: "3 decisiones con fecha esta semana" }
  ],
  data: {},
  qa: qa([
    ["Dame el brief del día", "**Brief de dirección**\n\n- **Ventas**: agosto cerró en ARS 1.240 M, −5,3% contra presupuesto [Agente Finanzas]\n- **Share**: AMBA cayó 0,5 pp, a 7,8% [Agente Comercial]\n- **FPS50**: la promo funcionó (+31%), pero hay quiebre en 38% de las tiendas online y faltan 4.200 u para octubre [Agente Operaciones] [Agente Producción]\n- **Packaging FPS50**: 12 días trabado en aprobación [Agente Producto]\n- **Legal**: preaviso a Droguería B antes del 01/10 [Agente Riesgo y Legal]\n\nRecomendación: la decisión de la semana es asegurar FPS50, con orden adicional y packaging aprobado."],
    ["¿Qué decisiones tengo que tomar esta semana?", "- **Aprobar las órdenes adicionales**: FPS50 (6.000 u) y Emulsión Facial (2.000 u), antes del 25/09 [Agente Producción]\n- **Definir la renovación con Droguería B** antes del 01/10 [Agente Riesgo y Legal]\n- **Escalar la aprobación del pomo de FPS50** [Agente Producto]\n- **Reasignar inversión**: influencers está 25% sobre plan y rinde 1,4x [Agente Marketing]\n\nRecomendación: empezar por las órdenes y el pomo de FPS50, que afectan la venta de octubre."],
    ["¿Cuál es el mayor riesgo del mes?", "**Quedarnos sin FPS50 en pleno ciclo de octubre.** Coinciden cinco señales:\n\n- Faltan 4.200 u en el plan [Agente Producción]\n- El stock real es 1.400 u menor que el de Tango [Agente Operaciones]\n- Quiebre en 23 de 60 tiendas online [Agente Operaciones]\n- Pomo nuevo trabado en aprobación [Agente Producto]\n- Mejor respuesta comercial, +31% [Agente Comercial]\n\nRecomendación: tratarlo hoy como prioridad transversal entre Producción, Producto y Comercial."]
  ])
};

export const ALL = [...AGENTS, CEO];
export const byId = Object.fromEntries(ALL.map((a) => [a.id, a]));

// Direcciones de demostración: el mockup no envía mails reales.
export const MAIL_ALIASES = {
  direccion: "direccion@copahue.demo",
  finanzas: "finanzas@copahue.demo",
  comercial: "comercial@copahue.demo",
  marketing: "marketing@copahue.demo",
  legal: "legal@copahue.demo",
  operaciones: "operaciones@copahue.demo",
  produccion: "produccion@copahue.demo",
  producto: "producto@copahue.demo"
};
