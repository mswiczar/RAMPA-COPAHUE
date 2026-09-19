---
titulo: Modelos de IA en las tareas
grupo: Conceptos
orden: 102
resumen: Cómo se elige el modelo de cada tarea, qué son los perfiles y los flujos de varias inferencias, el contraste y los topes.
relacionadas: tareas, modelos, modelos-perfiles, modelos-asignaciones
---

## Las piezas

- **Proveedor:** una conexión a un servicio de modelos (DigitalOcean, DeepSeek, un servidor propio…).
- **Modelo:** cada modelo de un proveedor, con su precio.
- **Perfil:** un modelo principal, respaldos, un revisor y un nivel de razonamiento, con un nombre fácil: Rápido y barato, Equilibrado, Razonamiento profundo, Privado.
- **Flujo:** cuántas inferencias pasa la tarea.

## Qué modelo responde una tarea

Gana la primera regla que exista, de lo más específico a lo más general:

1. Lo que eligió quien encargó la tarea.
2. Lo que tiene guardado la programación.
3. La asignación del agente para ese tipo de tarea.
4. La asignación por defecto del agente.
5. La **complejidad**: simple → Rápido y barato; media → Equilibrado; compleja → Razonamiento profundo.

Después se aplican tres controles: el rol tiene que tener habilitado el perfil; con datos reales solo responden proveedores aptos; y si se llegó al tope de gasto, la tarea sale sin modelo.

## La complejidad

Se calcula con señales visibles: si es investigación o acción, si pide analizar, comparar o recomendar, si cruza áreas, si es para el CEO, si la instrucción es larga y si sale por mail fuera de la empresa. En el formulario, **Por qué** muestra las señales.

## Los flujos

| Flujo | Qué pasa | Cuándo conviene |
| --- | --- | --- |
| **Directo** | Una inferencia | Avisos, resúmenes, reportes repetitivos |
| **Borrador + revisión** | Un modelo escribe; otro, de otro proveedor, revisa contra los datos; si hay problemas, el primero corrige | La mayoría de los reportes |
| **Revisión + verificación de cifras** | Lo anterior, y cada número se controla contra los datos. Lo que no tiene respaldo queda marcado | Lo que va a Dirección o sale de la empresa |

## El contraste

Desde el detalle de una tarea terminada:

- **Que lo audite otro agente:** otro agente revisa el trabajo con **sus propios datos**. Por ejemplo, Finanzas audita un reporte de Operaciones y dice qué impacto tiene en la caja.
- **Mismo pedido a otro modelo:** una segunda opinión con otro perfil; se comparan las dos respuestas, se marcan coincidencias y diferencias, y se ven lado a lado.

## Sin clave o sin presupuesto

Si ningún modelo del perfil tiene clave, o se llegó al tope, la tarea igual se hace con el sistema de reglas de la Sala. La tarea y el entregable lo dicen, y queda el costo estimado que habría tenido.

## Dónde se ve el costo

En cada tarea (por inferencia y total), al pie de cada entregable y en [Modelos › Gasto y consumo](/ayuda#/modelos).
