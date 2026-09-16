# Sala 24/7 · Laboratorio Copahue

Mockup funcional de la sala de agentes del programa RAMPA: el CEO al centro y ocho agentes verticales (R&D, Comercial, Finanzas, Operaciones, Producto, Riesgo y Legal, Producción, Marketing).

Todo corre con **datos simulados**. No se conecta a sistemas reales y no envía mails.

## Qué hace

- **Sala**: el CEO al centro y los agentes alrededor, con sus alertas y su estado (trabajando, por aprobar).
- **Conversar**: preguntás y el agente responde citando la fuente. También entiende encargos en lenguaje natural:
  - «Armá un reporte de quiebres y mandalo a Dirección» crea una tarea.
  - «Todos los lunes a las 8 mandame el reporte comercial» crea una programación.
  - Desde el CEO: «Pedile a Finanzas un reporte de cobranzas» se lo asigna al agente que corresponde.
- **Tareas**: reporte, investigación, email o acción. Pasan por pendiente → en curso → completada o esperando aprobación.
- **Programaciones**: crontab por agente con croner, en hora de Buenos Aires. Se pueden crear, pausar, editar, borrar y ejecutar a mano.
- **Bandeja de salida**: mails preparados por los agentes. Nada sale sin aprobación del CEO, salvo las programaciones configuradas para enviar sin aprobación.
- **Entregables**: reportes e investigaciones generados en Markdown.
- Actualización en vivo por Server-Sent Events.

## Estructura

```
app/
├── server/        API Express + scheduler + worker mock (Node ≥ 20)
│   └── src/
│       ├── index.js      rutas HTTP y SSE
│       ├── agents.js     agentes y datos simulados
│       ├── brain.js      respuestas, detección de encargos y generación de entregables (mock)
│       ├── worker.js     ciclo de vida de tareas y aprobaciones
│       ├── scheduler.js  programaciones cron
│       ├── seed.js       datos iniciales
│       └── store.js      persistencia en data/db.json
└── web/           React + Vite (compila a server/public)
```

## Correr en desarrollo

```bash
npm run setup
npm run dev:server   # API en http://localhost:8080
npm run dev:web      # frontend en http://localhost:5173 (proxy a la API)
```

## Producción (sin Docker)

```bash
npm run setup
npm run build
PORT=8080 APP_USER=ceo APP_PASSWORD=cambiar npm start
```

El servidor sirve el frontend compilado y la API en el mismo puerto. Detrás de un proxy (nginx o Caddy) para `copahue.moshito.work`, desactivar el buffering en `/api/events` para que funcione el tiempo real.

Variables de entorno:

| Variable | Default | Uso |
| --- | --- | --- |
| `PORT` | `8080` | Puerto HTTP |
| `DATA_DIR` | `server/data` | Dónde se guarda `db.json` |
| `APP_PASSWORD` | — | Si está definida, la app muestra una página de login |
| `SESSION_SECRET` | aleatorio al arrancar | Firma de la cookie de sesión (definirla para que las sesiones sobrevivan reinicios) |
| `APP_USER` | `ceo` | Usuario del login |
| `APP_TZ` | `America/Argentina/Buenos_Aires` | Zona horaria de las programaciones |

Para volver a los datos iniciales, borrar `server/data/db.json` y reiniciar.

## Próximos pasos

1. Reemplazar `brain.js` por Claude, con las herramientas de cada agente.
2. Reemplazar los datos de `agents.js` por conectores a Tango, IQVia, Elvis, Capataz y los demás sistemas.
3. Envío real de mails (SMTP) detrás de la aprobación.
4. Base de datos real y usuarios con roles.
