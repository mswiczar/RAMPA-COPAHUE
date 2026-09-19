---
titulo: Tareas
grupo: Trabajo de los agentes
orden: 80
ruta: tareas
captura: tareas.png
resumen: Encargar trabajo a los agentes, elegir con qué inteligencia se hace, seguir su avance, aprobar y contrastar el resultado.
relacionadas: conceptos-agentes, conceptos-ia, programaciones, bandeja
guia: [{"sel":".page-head .btn.primary","texto":"Encargá un reporte, una investigación, un mail o una acción a cualquier agente."},{"sel":".filters","texto":"Filtrá por agente o por estado. «Esperando aprobación» es lo que necesita una decisión."},{"sel":".rows","texto":"Tocá una tarea para ver la instrucción, el registro paso a paso, qué modelos intervinieron y el contraste."},{"sel":".ayuda-btn","texto":"Toda la ayuda de Tareas, con ejemplos, en este botón."}]
---

## Para qué sirve

Es la lista de todo lo que hacen los agentes: lo que se les encargó, lo que está en curso, lo que espera aprobación y lo que ya se terminó. Desde acá también se encarga trabajo nuevo.

## Tipos de tarea

- **Reporte:** un documento con resumen, análisis, datos y recomendaciones. Queda en [Entregables](/ayuda#/entregables).
- **Investigación:** hallazgos, conclusiones, fuentes y límites. También queda en Entregables.
- **Email:** un mail preparado por el agente. Queda en la [Bandeja de salida](/ayuda#/bandeja).
- **Acción:** algo que cambia la operación, por ejemplo emitir o postergar una orden. **Siempre** espera la aprobación de Dirección.

## Cómo se encarga

1. Tocá **Encargar tarea**.
2. Elegí el **Agente** y **Qué tiene que hacer**.
3. Escribí la **Instrucción**. El título es opcional: si lo dejás vacío se completa solo.
4. Si corresponde, completá **Enviar por mail a**. Con destinatarios, podés pedir aprobación de Dirección antes de enviar.
5. En **Inteligencia**, revisá la complejidad y lo recomendado, y elegí perfil y flujo, o dejá «Automático». Ver [Modelos de IA en las tareas](/ayuda#/conceptos-ia).
6. Tocá **Encargar ahora**. Si tu rol puede, también podés elegir **Programar (cron)** para que se repita.

## Estados

Pendiente → En curso → Completada, o **Esperando aprobación** → Completada o Rechazada. Si algo falla, queda Fallida con el motivo en el registro.

## El detalle de una tarea

Tocá una tarea para ver:

- **Instrucción**, destinatarios y, en las acciones, la propuesta.
- **Registro:** cada paso con su hora (qué sistemas consultó, qué perfil usó, cada inferencia, quién aprobó).
- **Inteligencia:** perfil, flujo y complejidad; cada inferencia con modelo, proveedor, tokens, costo y tiempo; el total y lo estimado antes de correr.
- **Contrastar el resultado:**
  - **Que lo audite otro agente:** otro agente revisa el trabajo con sus propios datos y devuelve veredicto (aprobado, observado o rechazado), problemas e impacto en su área.
  - **Mismo pedido a otro modelo:** una segunda opinión con otro perfil; se comparan las dos respuestas y se pueden ver **lado a lado**.
- Botones **Aprobar y enviar** / **Aprobar acción** y **Rechazar** (solo Dirección), **Abrir entregable** y **Ver mail**.

## Casos de uso

- **Reporte para el directorio:** encargar al CEO un reporte con perfil Razonamiento profundo y verificación de cifras.
- **Validación cruzada:** pedir que Finanzas audite el reporte de stock de Operaciones antes de llevarlo al comité.
- **Aprobar una misión de relevamiento:** las misiones de [Punto de venta](/ayuda#/pdv-misiones) llegan acá como acciones.

## Quién puede qué

Encargar: quien tenga acceso a ese agente. Aprobar o rechazar: solo Dirección. Contrastar: quien vea los dos agentes.
