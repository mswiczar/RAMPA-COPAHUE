---
titulo: Auditoría · Registro
grupo: Administración
orden: 96
ruta: auditoria
captura: auditoria.png
resumen: Quién consultó, preguntó, encargó, programó, aprobó o rechazó qué, y cuándo. Incluye los accesos rechazados.
relacionadas: auditoria-permisos, conceptos-permisos
guia: [{"sel":".solution-tabs","texto":"Dos pestañas: el registro de actividad y los roles y permisos."},{"sel":".filters","texto":"Filtrá por usuario o mirá solo los accesos rechazados."},{"sel":".table-wrap","texto":"Cada fila es una acción: cuándo, quién, qué hizo, sobre qué y con qué resultado."},{"sel":".ayuda-btn","texto":"Más detalle en este botón."}]
---

## Para qué sirve

Gobierno y trazabilidad: poder responder quién hizo qué y cuándo, y detectar intentos de acceso a lo que un rol no puede ver. Solo la ve **Dirección**.

## Qué se registra

- **Siempre:** ingresos y salidas, preguntas a los agentes y a la ayuda, encargos, programaciones, aprobaciones y rechazos, simulaciones de escenarios, misiones, contrastes y cambios en la configuración de modelos.
- **Consultas a tableros:** una vez cada 10 minutos por usuario y tablero, para no llenar el registro con cada refresco.
- **Accesos rechazados:** cuando alguien intenta ver o hacer algo que su rol no permite. Aparecen en rojo.

## Cómo se usa

1. Filtrá por **Usuario** para ver la actividad de una persona.
2. Marcá **Solo accesos rechazados** para una revisión de seguridad.
3. Pasá el mouse por la fecha para ver el año y la hora exacta.

## Casos de uso

- **Revisión mensual de seguridad:** accesos rechazados del mes.
- **Quién aprobó un mail:** buscar la aprobación y su detalle.

El registro guarda los últimos 5.000 movimientos y no incluye contraseñas ni contenido sensible.
