---
titulo: Comercial · Tablero
grupo: Comercial
orden: 20
ruta: comercial
captura: comercial.png
resumen: El estado comercial en una pantalla: pipeline, cuota, forecast, alertas, cumplimiento por vendedor y su evolución mes a mes.
relacionadas: comercial-pipeline, comercial-forecast, pdv, conceptos-datos
guia: [{"sel":".solution-tabs","texto":"La solución Comercial tiene siete pestañas: del tablero general al punto de venta y la inteligencia del agente."},{"sel":".kpis","texto":"Los indicadores clave. Cada uno dice qué tipo de dato es: conciliado, operativo, proyectado o estimado."},{"sel":".alert-list","texto":"Las alertas del agente, ordenadas por gravedad."},{"sel":".page-head .btn.ghost","texto":"Hablá con el agente Comercial sobre estos números sin salir del contexto."},{"sel":".ayuda-btn","texto":"Cada pestaña tiene su propia ayuda en este botón."}]
---

## Para qué sirve

Responde en un minuto «¿cómo venimos?»: cuánto hay en el pipeline, cuánto de la cuota del trimestre se cumplió, qué forecast es probable y qué hay que atender primero. Es la pantalla para la reunión comercial semanal.

## Qué hay en la pantalla

- **Indicadores:** pipeline ponderado, cumplimiento de cuota, forecast del trimestre, brecha contra el objetivo, tasa de conversión, ciclo comercial, ticket promedio y clientes nuevos. Cada uno muestra su referencia u objetivo y su tipo de dato.
- **Alertas:** lo que el agente detectó, con el tipo de dato que la disparó. Por ejemplo, oportunidades perdidas por falta de stock.
- **Pipeline por etapa:** monto bruto por etapa, con la probabilidad de cada una.
- **Cumplimiento por vendedor:** la barra llena es el 100% de la cuota del trimestre.
- **Negocios cerrados** y **motivos de pérdida.**
- **Ranking por calidad de venta:** ordena por facturación, margen, cobranza y retención, y descuenta por los descuentos otorgados. No es solo quién vende más.
- **Cumplimiento mensual por vendedor:** una tabla de calor vendedor × mes. Gris es cumplir la cuota, naranja quedar abajo y celeste pasarse. Septiembre está en curso y se mide contra la cuota prorrateada al día.

## Cómo se usa

1. Empezá por los indicadores: si la **brecha** es positiva, falta vender eso para llegar al objetivo.
2. Leé las **alertas** rojas.
3. En la tabla de calor, buscá filas con **tres meses seguidos en naranja**: no es un mes malo, es una caída sostenida. Pasá el mouse por una celda para ver el detalle.
4. Para profundizar, seguí en [Pipeline](/ayuda#/comercial-pipeline) o [Forecast](/ayuda#/comercial-forecast).

## Casos de uso

- **Reunión semanal:** proyectar esta pantalla y recorrer indicadores, alertas y cumplimiento por vendedor.
- **Coaching:** APM-02 y APM-05 llevan tres meses debajo del 85%: cruzarlo con [Inteligencia › Vendedores que necesitan apoyo](/ayuda#/comercial-ia).
- **Pérdidas evitables:** «Sin stock al momento de la propuesta» es un motivo interno; se resuelve cruzando con [Operaciones](/ayuda#/operaciones-stock).

## Qué significa cada cosa

- **Pipeline ponderado:** suma de cada oportunidad por la probabilidad de su etapa (10% prospecto, 25% contacto, 45% propuesta, 70% negociación, 90% cierre).
- **Brecha contra objetivo:** objetivo del trimestre menos el forecast probable.
- **Ciclo comercial:** días promedio desde el lead hasta el cierre.

Ver también el [Glosario](/ayuda#/glosario).

## Quién la ve

Dirección, Finanzas, Comercial, Operaciones, R&D y Solo lectura.
