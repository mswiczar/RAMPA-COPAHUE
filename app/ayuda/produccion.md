---
titulo: Producción · Tablero
grupo: Producción
orden: 60
ruta: produccion
captura: produccion.png
resumen: Si el plan de producción cubre la demanda, cuánto se cumple, cuánto está comprometido con las plantas y cuántos días quedan para decidir.
relacionadas: produccion-decidir, produccion-plan, operaciones-stock
guia: [{"sel":".solution-tabs","texto":"Producción tiene cuatro pestañas: tablero, plan y órdenes, plantas y qué decidir."},{"sel":".kpis","texto":"Cobertura del plan, faltante, cumplimiento, ocupación de plantas y días para decidir."},{"sel":".alert-list","texto":"Las alertas: qué falta producir y hasta cuándo hay tiempo."},{"sel":".ayuda-btn","texto":"Cada pestaña tiene su ayuda en este botón."}]
---

## Para qué sirve

Anticipar si va a faltar producto y decidir a tiempo, sabiendo que una orden tarda 6 semanas desde que se emite hasta que llega.

## Qué hay en la pantalla

- **Indicadores:** productos cubiertos, faltante total, cumplimiento del plan, ocupación de plantas, costo de producción, lead time, comprometido con plantas y **días para decidir**.
- **Alertas.**
- **Cumplimiento del plan:** plan contra real de los últimos meses. La línea punteada es el plan; la barra, lo producido.
- **Compromiso con las plantas:** lo que ya está comprometido en órdenes.

## Cómo se usa

1. Mirá **Días para decidir**: es el margen antes de que el lead time deje sin tiempo al próximo ciclo.
2. Si hay faltante, andá directo a [Qué decidir](/ayuda#/produccion-decidir).
3. Si el cumplimiento viene bajo, revisá [Plantas](/ayuda#/produccion-plantas).

## Casos de uso

- **Comité semanal de producción:** faltantes, días para decidir y órdenes sugeridas.

## Qué significa cada cosa

- **Lead time:** tiempo entre emitir la orden y tener el producto.
- **Stock real:** sale de los depósitos, no del ERP. Es la corrección que aporta el agente de Operaciones.
