---
titulo: Programaciones
grupo: Trabajo de los agentes
orden: 81
ruta: programaciones
captura: programaciones.png
resumen: Reportes, mails e investigaciones que los agentes hacen solos, con la frecuencia que elijas (crontab), en hora de Buenos Aires.
relacionadas: tareas, conceptos-ia, bandeja
guia: [{"sel":".page-head .btn.primary","texto":"Creá una programación: qué hace, qué agente, cuándo y con qué inteligencia."},{"sel":".table-wrap","texto":"Cada programación con su frecuencia, la próxima ejecución y la última. Podés pausarla, editarla, ejecutarla ya o borrarla."},{"sel":".ayuda-btn","texto":"Cómo escribir la frecuencia y ejemplos, en este botón."}]
---

## Para qué sirve

Automatizar lo que se repite: el brief diario, el reporte semanal, la conciliación de todos los días. Cada ejecución crea una tarea nueva, que pasa por el mismo circuito (y las mismas aprobaciones) que una encargada a mano.

## Cómo se usa

1. Tocá **Nueva programación**.
2. Completá agente, tipo, nombre e instrucción, como en [Tareas](/ayuda#/tareas).
3. En **Frecuencia**, elegí un atajo o escribí la expresión cron. Abajo se ve en palabras.
4. Elegí la **Inteligencia**: el perfil queda guardado en la programación. Para algo que corre muchas veces, conviene «Rápido y barato».
5. Decidí si los mails salen solos o piden aprobación.
6. Tocá **Crear programación**.

Desde la lista: activá o pausá con el interruptor de la izquierda, **Ejecutar ahora**, **Editar** o **Eliminar**. Se ve la próxima ejecución y la última, con la cantidad de ejecuciones.

## La frecuencia (cron)

Cinco campos: minuto, hora, día del mes, mes y día de la semana.

| Expresión | Significa |
| --- | --- |
| `0 8 * * 1` | Lunes a las 8:00 |
| `30 7 * * 1-5` | Días hábiles a las 7:30 |
| `0 7 * * *` | Todos los días a las 7:00 |
| `0 9 1 * *` | El 1° de cada mes a las 9:00 |

También se crean desde el chat de la [Sala](/ayuda#/sala): «Todos los lunes a las 8 mandame el reporte comercial».

## Casos de uso

- **Brief de dirección**, días hábiles a las 7:30.
- **Conciliación diaria del e-commerce** (Shopify, Mercado Libre y Mercado Pago contra Tango), días hábiles a las 18:30.
- **Vencimientos de contratos y registros**, lunes a las 9.

## Quién puede qué

Crear y modificar programaciones: Dirección, Finanzas, Comercial, Operaciones y R&D, solo con sus agentes. Solo lectura, no.
