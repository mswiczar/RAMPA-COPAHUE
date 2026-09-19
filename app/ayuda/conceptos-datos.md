---
titulo: Dato, análisis y recomendación
grupo: Conceptos
orden: 100
resumen: Cómo leer cualquier número de la Sala: tipo de dato, fuente, qué es análisis, qué es recomendación y qué es sintético.
relacionadas: conceptos-agentes, sistemas, glosario
---

## Tres niveles, siempre separados

1. **Dato:** un número que sale de un sistema. Lleva su fuente entre corchetes, por ejemplo [Tango] o [Elvis].
2. **Análisis:** lo que el agente calcula o cruza con esos datos, con el método a la vista. Por ejemplo, la cobertura proyectada o el ranking por calidad de venta.
3. **Recomendación:** lo que el agente sugiere hacer. Siempre aparece marcada como **Recomendación del agente · decide una persona**. Nunca se ejecuta sola.

## Tipos de dato

Cada indicador lleva una etiqueta de color:

| Tipo | Qué quiere decir | Ejemplo |
| --- | --- | --- |
| **Conciliado** | Cerrado y controlado; no va a cambiar | Ventas de un mes cerrado |
| **Operativo** | Del día, todavía sin cerrar | Stock de hoy, pipeline |
| **Proyectado** | Calculado hacia adelante con un supuesto | Caja a 13 semanas |
| **Estimado** | Calculado con un método y cierta incertidumbre; el método se aclara | Venta perdida por quiebre |

## Datos reales y sintéticos

- **Hoy todos los datos de negocio de la Sala son sintéticos:** están armados para mostrar cómo funciona y son coherentes entre pantallas, pero no son cifras reales de Copahue. Las pantallas lo dicen («Datos simulados», «datos sintéticos»).
- Cuando se conecten los sistemas reales, cada dato va a indicar si es **real** (con su fuente y la hora de extracción) o **sintético**, y nunca se van a mezclar en la misma tabla.
- Los modelos de IA solo pueden trabajar con datos reales si su proveedor está marcado como apto. Ver [Proveedores](/ayuda#/modelos-proveedores).

## Cómo verificar un número

1. Mirá su tipo de dato y su fuente.
2. Si es análisis o estimación, buscá el método (suele estar abajo, en letra chica, o en «Cómo se estimó»).
3. En un entregable hecho con IA, mirá el pie: si la verificación encontró cifras sin respaldo, están listadas.
