---
titulo: Qué es demo y qué viene
grupo: Referencia
orden: 113
resumen: Qué funciona de verdad hoy, qué está simulado y qué falta para usar la Sala con datos reales.
relacionadas: novedades, sistemas, conceptos-datos
---

## Funciona de verdad hoy

- Login, roles y permisos controlados en el servidor, y auditoría.
- Chat con los agentes, tareas, programaciones (crontab real), aprobaciones y entregables.
- Modelos de IA por tarea, con flujos de revisión, contraste y control de gasto, en cuanto se cargan las claves.
- Esta ayuda.

## Está simulado

- **Los datos de negocio:** todos son sintéticos.
- **El envío de mails:** aprobar marca el mail como enviado, pero no sale ningún correo.
- **Las acciones:** aprobar una orden o una misión la registra, pero no la ejecuta en ningún sistema externo.
- **Los relevamientos de punto de venta:** no hay proveedor contratado; la góndola es un esquema.

## Qué falta para datos reales

1. **Conectores** a los sistemas de Copahue (Tango, Elvis, IQVia, Capataz, Disprofarma, Shopify y los demás de [Sistemas y fuentes de datos](/ayuda#/sistemas)), con cada dato marcado como real y con su hora de extracción.
2. **Base de datos** con copias de seguridad, separando datos reales, sintéticos y auditoría.
3. **Envío real de mails** detrás de la aprobación.
4. **Ingreso con la cuenta de la empresa** (SSO) y doble factor.
5. **Decisión del cliente** sobre qué proveedores de IA pueden ver datos reales.
