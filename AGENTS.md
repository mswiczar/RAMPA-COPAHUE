# AGENTS.md

Guía para agentes (y personas) que trabajan en este repositorio.

## Qué hay acá

- Documentos del cliente Laboratorio Copahue (marca Caviahue) y del programa RAMPA / 24/7 AI Ready: PDFs y el Excel de sistemas.
- `Propuesta_RAMPA_Copahue.pdf`: propuesta comercial. Su fuente editable es `src/propuesta_copahue.html` y se genera con Chrome headless.
- `app/`: **Sala 24/7**, un mockup funcional con el CEO y 8 agentes verticales. Permite chatear, encargar tareas, programar crontabs, aprobar mails y leer entregables. Los detalles están en `app/README.md`.

Todos los datos de negocio de la app son **simulados**. No inventar datos presentados como reales de Copahue.

## Deploy de la Sala 24/7

| | |
| --- | --- |
| URL | https://copahue.moshito.work |
| Servidor | `143.244.161.204` (Ubuntu 24.04, DigitalOcean), usuario SSH `root` |
| Código | `/srv/copahue/app` (el frontend se compila en `server/public`) |
| Datos | `/srv/copahue/data/db.json` (propiedad de `www-data`) |
| Servicio | `copahue-sala.service` (systemd, usuario `www-data`, `127.0.0.1:3200`) |
| Secretos | `/etc/copahue/copahue.env` (`APP_USER`, `APP_PASSWORD`, `SESSION_SECRET`, modo 600). No se commitea |
| Acceso | Página de login propia con sesión en cookie HttpOnly (12 h). No usa Basic Auth |
| Usuarios | `/etc/copahue/usuarios.json` (`USERS_FILE`): usuario, nombre, rol y hash scrypt. Roles: direccion, finanzas, comercial, operaciones, rd, consulta. Las contraseñas iniciales quedaron en `/root/copahue-usuarios-iniciales.txt` (modo 600): borrarlo después de entregarlas |
| Auditoría | En `db.json` (`audit`, últimos 5.000 registros). Visible en la app para el rol Dirección |
| nginx | `/etc/nginx/sites-available/copahue.moshito.work` (symlink en `sites-enabled`) |
| TLS | Let's Encrypt propio: `/etc/letsencrypt/live/copahue.moshito.work` (webroot `/var/www/acme`, se renueva con certbot). Cloudflare está en Full (strict), así que cada subdominio necesita su propio certificado |
| Logs | `journalctl -u copahue-sala`, `/var/log/nginx/copahue-moshito-work.*.log` |

### Modelos de IA y claves

La pantalla **Modelos** (solo Dirección) administra proveedores, catálogo con precios, perfiles, asignaciones por agente y tipo de tarea, topes y el dashboard de consumo. La configuración vive en `db.json` (`ia`); las claves **no**: cada proveedor indica en qué variable de entorno está la suya.

Para cargar una clave, en el servidor:

```bash
echo 'DIGITALOCEAN_INFERENCE_KEY=...' >> /etc/copahue/copahue.env   # clave de acceso a modelos de DigitalOcean
echo 'DEEPSEEK_API_KEY=...' >> /etc/copahue/copahue.env
systemctl restart copahue-sala
```

Después, en Modelos › Proveedores: «Probar conexión» y «Traer modelos» (completa los ids de DigitalOcean). Sin clave, las tareas salen con el sistema de reglas y el flujo queda marcado como simulado. Todos los proveedores usan hoy el formato compatible con OpenAI (`/chat/completions`); un servidor propio (Ollama, vLLM) se agrega desde la misma pantalla.

### Desplegar una nueva versión

Desde la raíz del repo, en Git Bash:

```bash
bash app/deploy.sh
```

El script empaqueta `app/` sin `node_modules`, lo sube, instala dependencias, compila el frontend en el servidor (no hace falta Node local) y reinicia **solo** `copahue-sala`.

### Reglas en el servidor

El servidor es compartido. También corren `moshito.work`, `kop.moshito.work` (`kop-mcp`), `pvs.moshito.work` y `mcp.moshito.work`.

- No tocar otros servicios, sitios de nginx, certificados ni puertos (3100, 5183 y 8790 están en uso).
- Antes de `systemctl reload nginx`, correr siempre `nginx -t`.
- El disco está al ~90%: no dejar builds ni tarballs sueltos y limpiar `/tmp`.
- Para resetear los datos simulados: `systemctl stop copahue-sala && rm /srv/copahue/data/db.json && systemctl start copahue-sala`.
