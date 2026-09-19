---
titulo: Modelos · Proveedores
grupo: Administración
orden: 91
ruta: modelos/proveedores
captura: modelos-proveedores.png
resumen: Conectar proveedores de IA (DigitalOcean, DeepSeek y los que se sumen), cargar sus claves y probar la conexión.
relacionadas: modelos-catalogo, conceptos-ia, sistemas
---

## Para qué sirve

Definir con qué proveedores de IA trabaja la Sala. Vienen configurados **DigitalOcean** y **DeepSeek**, y como plantillas deshabilitadas OpenRouter, OpenAI, Claude (Anthropic), Gemini (Google), Grok (xAI) e **Inferencia propia** (un servidor con Ollama, vLLM o LM Studio).

## Qué hay en cada tarjeta

Nombre, estado (Listo, falta la clave o deshabilitado), una nota, la dirección de la API, la **variable de entorno** donde está la clave, si es **apto para datos reales** y cuántos modelos tiene en el catálogo.

## Cómo se carga una clave

Las claves **no se escriben en la pantalla** ni se guardan en la base: cada proveedor dice en qué variable de entorno está la suya. En el servidor:

```
echo 'DIGITALOCEAN_INFERENCE_KEY=...' >> /etc/copahue/copahue.env
echo 'DEEPSEEK_API_KEY=...' >> /etc/copahue/copahue.env
systemctl restart copahue-sala
```

Después, en la tarjeta:

1. **Probar conexión:** confirma que la clave funciona y dice cuántos modelos ofrece el proveedor.
2. **Traer modelos:** completa los ids de los modelos del catálogo (en DigitalOcean hacen falta) y suma los nuevos **deshabilitados**, para que revises su precio antes de usarlos.

## Agregar un proveedor o un servidor propio

1. Tocá **+ Agregar proveedor o servidor propio**.
2. Completá nombre, dirección de la API (compatible con OpenAI), variable de la clave (vacía si no usa) y si es apto para datos reales.
3. Guardá, probá la conexión y traé los modelos.

La dirección tiene que ser `https`, o `http` a un servidor de la red interna.

## Datos reales

Solo los proveedores marcados **aptos para datos reales** pueden responder tareas con datos reales de Copahue. Hoy todos los datos son sintéticos. Recomendación inicial: solo la inferencia propia, hasta que el cliente apruebe otros.

## Qué queda registrado

Cada cambio de un proveedor queda en [Auditoría](/ayuda#/auditoria).
