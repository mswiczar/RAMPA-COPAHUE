---
titulo: Roles y permisos
grupo: Conceptos
orden: 103
resumen: Qué ve y qué puede hacer cada rol, y por qué la caja, el P&L y el portfolio de I+D son confidenciales.
relacionadas: auditoria-permisos, primeros-pasos, login
---

## Los roles

| Rol | Soluciones que ve | Agentes | Aprobar | Programar | Auditoría y Modelos |
| --- | --- | --- | --- | --- | --- |
| **Dirección** | Todas | Todos | Sí | Sí | Sí |
| **Finanzas** | Finanzas, Comercial, Operaciones, Producción | Finanzas, Operaciones, Producción, Riesgo y Legal | No | Sí | No |
| **Comercial** | Comercial, Operaciones | Comercial, Marketing, Operaciones | No | Sí | No |
| **Operaciones** | Operaciones, Producción, Comercial | Operaciones, Producción | No | Sí | No |
| **R&D** | R&D, Comercial | R&D, Producto | No | Sí | No |
| **Solo lectura** | Comercial, Operaciones, Producción | Ninguno | No | No | No |

## Por qué así

- **La caja, el P&L y el portfolio de I+D son confidenciales:** los ven solo los roles que los necesitan para decidir.
- **Aprobar queda en Dirección:** mails, órdenes, acciones y misiones.
- **Los permisos se controlan en el servidor**, no solo en la pantalla: aunque alguien escriba la dirección de una pantalla, el servidor la bloquea y lo registra.

## Qué pasa si no tenés acceso

- Una pantalla sin acceso muestra «Tu rol no tiene acceso a esta sección».
- Un agente no te muestra cifras de una solución que no ves. Por ejemplo, el forecast comercial te dice que hay impacto en caja, pero no el monto.
- El intento queda en [Auditoría](/ayuda#/auditoria) como acceso rechazado.
