---
titulo: Modelos · Gasto y consumo
grupo: Administración
orden: 90
ruta: modelos
captura: modelos.png
resumen: El dashboard de gasto en IA: tope del mes, proyección, llamadas, tokens y costo por proveedor, modelo, agente y paso.
relacionadas: conceptos-ia, modelos-asignaciones, modelos-proveedores
guia: [{"sel":".solution-tabs","texto":"Modelos tiene seis pestañas: consumo, proveedores, catálogo, perfiles, asignaciones y cómo funciona."},{"sel":".tope-card","texto":"El tope del mes: lo gastado, la proyección a fin de mes y el umbral de alerta."},{"sel":".kpis","texto":"Gasto, llamadas, tokens, costo por tarea, errores y tareas que salieron sin modelo."},{"sel":".ayuda-btn","texto":"Toda la ayuda de Modelos en este botón."}]
---

## Para qué sirve

Controlar cuánto se gasta en modelos de IA y en qué. La administra **Dirección**.

## Qué hay en la pantalla

- **Tope del mes:** la barra llena es lo gastado; la rayada, la proyección a fin de mes; la marca, el umbral de alerta. El estado dice si está dentro del presupuesto, si la proyección supera la alerta o si se llegó al tope.
- **Indicadores:** gastado en el mes, proyección, llamadas a modelos, tokens (entrada y salida), costo promedio por tarea, errores y respaldos, y tareas que salieron sin modelo.
- **Gasto por día:** una barra por día del mes. Los días que faltan van rayados.
- **Por proveedor, por modelo, por agente y por paso del flujo:** en USD. En «por paso», todo lo que no es Borrador es el **costo de la calidad**: revisión, corrección, auditoría cruzada y segunda opinión.
- **Últimas llamadas:** cuándo, agente, paso, modelo, tokens, costo y estado.

## Cómo se usa

1. Mirá el estado del tope. Si la proyección supera la alerta, revisá qué agente o qué paso gasta más.
2. Si un agente gasta mucho en tareas simples, asignale el perfil «Rápido y barato» en [Asignaciones y topes](/ayuda#/modelos-asignaciones).
3. Si hay muchos errores o respaldos, revisá el proveedor en [Proveedores](/ayuda#/modelos-proveedores).

## Qué pasa al llegar al tope

Las tareas nuevas salen con el sistema de reglas, sin modelo, y queda registrado en la tarea. No se corta nada a mitad de camino.

## Preguntas frecuentes

**¿Por qué está todo en cero?** Porque todavía no hay claves cargadas: las tareas salen sin modelo y el tablero muestra cuántas fueron. Ver [Proveedores](/ayuda#/modelos-proveedores).

**¿El costo es exacto?** Es tokens × precio del catálogo. DeepSeek cobra distinto en horario pico: se usa el precio de la hora de cada llamada. La factura final es la del proveedor.
