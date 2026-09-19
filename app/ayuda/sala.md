---
titulo: Sala
grupo: La Sala
orden: 10
ruta: sala
captura: sala.png
resumen: El CEO al centro y los ocho agentes alrededor: preguntá, encargá trabajo, programá tareas y aprobá desde el chat.
relacionadas: conceptos-agentes, tareas, programaciones, primeros-pasos
guia: [{"sel":".room","texto":"Esta es la Sala: el CEO al centro y un agente por área alrededor. Tocá un agente para trabajar con él."},{"sel":".panel","texto":"Acá conversás con el agente elegido: preguntale, encargale un reporte o pedile que programe algo."},{"sel":".panel .tabs","texto":"Además del chat: Encargar tarea con formulario, el Trabajo del agente y, en el CEO, las Aprobaciones pendientes."},{"sel":".ayuda-btn","texto":"En cualquier pantalla, este botón (o la tecla ?) abre la ayuda de esa pantalla, con un agente que responde dudas."}]
---

## Para qué sirve

Es la pantalla principal. Desde acá hablás con cada agente como le hablarías a un analista del área: le preguntás cómo viene algo, le pedís un reporte o le dejás un encargo recurrente. El **CEO · Centro de decisión** mira todas las áreas juntas y puede derivar trabajo a cualquier agente.

## Qué hay en la pantalla

- **La sala (izquierda):** el CEO al centro y los ocho agentes alrededor. Cada agente muestra su estado: trabajando, con tareas por aprobar o en espera. Abajo, las fuentes y la última actividad del agente elegido.
- **El panel del agente (derecha):** su nombre, los sistemas de los que toma datos y, si tiene solución, el botón **Abrir tablero →**. Tiene cuatro pestañas:
  - **Conversar:** el chat. Arriba, lo que el agente detectó hoy; abajo, preguntas sugeridas.
  - **Encargar tarea:** el mismo formulario de [Tareas](/ayuda#/tareas), ya con el agente elegido.
  - **Trabajo:** las tareas y programaciones de ese agente.
  - **Aprobaciones:** solo en el CEO, todo lo que espera la decisión de Dirección.

## Cómo se usa

**Preguntar.** Escribí en el chat y tocá **Enviar** (o Enter). El agente responde con los datos de su tablero y cita la fuente entre corchetes, por ejemplo [Elvis] o [Tango]. Si tu rol no ve una solución, el agente no te muestra esos números.

**Encargar desde el chat.** Si tu mensaje pide hacer algo, el agente crea una tarea:

- «Armá un reporte de quiebres y mandalo a Dirección» → crea un reporte con mail a Dirección, que queda esperando aprobación.
- Desde el CEO: «Pedile a Finanzas un reporte de cobranzas» → la tarea queda asignada al agente de Finanzas.

**Programar desde el chat.** Si el mensaje dice cuándo, crea una programación:

- «Todos los lunes a las 8 mandame el reporte comercial».
- «Días hábiles a las 18:30 conciliá el e-commerce».

**Dudas de uso.** Si le preguntás a un agente «¿cómo programo un reporte?», responde con esta ayuda y te deja el link.

## Casos de uso

- **Lunes a la mañana (Dirección):** abrir el CEO, leer «Hoy detectó», pasar por **Aprobaciones** y aprobar o rechazar lo pendiente.
- **Antes de una reunión con una droguería (Comercial):** preguntarle al agente Comercial «¿Qué clientes están en riesgo?» y abrir el tablero para el detalle.
- **Cierre de mes (Finanzas):** pedirle al agente de Finanzas «Armá el reporte de cobranzas y mandalo a Dirección».

## Qué puede hacer cada rol

- **Dirección:** todos los agentes, incluido el CEO, y aprobar.
- **Las áreas:** solo los agentes de su rol (por ejemplo, Comercial trabaja con Comercial, Marketing y Operaciones). No aprueban.
- **Solo lectura:** no tiene agentes; entra directo a su primera solución.

## Preguntas frecuentes

**¿El agente inventa?** No. Responde con los datos de los tableros y cita la fuente. Si no tiene el dato, lo dice. En esta versión los datos son sintéticos.

**¿Por qué el agente no me muestra la caja?** Porque tu rol no tiene acceso a Finanzas. El agente sabe que hay impacto, pero no te muestra la cifra.
