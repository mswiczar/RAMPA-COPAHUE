---
titulo: Modelos · Perfiles
grupo: Administración
orden: 93
ruta: modelos/perfiles
captura: modelos-perfiles.png
resumen: Los perfiles que eligen las personas: modelo principal, respaldos, revisor de otro proveedor, razonamiento y roles habilitados.
relacionadas: conceptos-ia, modelos-asignaciones, modelos-catalogo
---

## Para qué sirve

Las personas eligen **perfiles**, no modelos. Un perfil junta un modelo principal, hasta dos respaldos, un **revisor** y un nivel de razonamiento. Si mañana conviene otro modelo, se cambia en el perfil y todo lo que lo usa se actualiza.

## Los perfiles que vienen

| Perfil | Para qué | Principal | Revisor |
| --- | --- | --- | --- |
| Rápido y barato | Avisos, resúmenes cortos, reportes programados | DeepSeek V4.1 Flash | GPT-5.4 nano |
| Equilibrado | La mayoría de los reportes e investigaciones | DeepSeek V4 Pro | Claude Haiku 4.5 |
| Razonamiento profundo | Decisiones de Dirección, escenarios, cruces entre áreas | Claude Sonnet 5 | DeepSeek V4 Pro |
| Privado (inferencia propia) | Datos reales sensibles | A configurar | A configurar |

## Cómo se edita

1. Cambiá **Modelo principal**, **Respaldo 1 y 2** y **Revisor**. Cada opción muestra el precio y si tiene clave.
2. Elegí el **Razonamiento**: sin razonamiento, bajo, medio o alto. Solo aplica a modelos que razonan.
3. Marcá los **roles que pueden elegirlo**. Ninguno marcado quiere decir todos. Por ejemplo, Razonamiento profundo viene habilitado solo para Dirección y Finanzas.
4. Tocá **Guardar perfil**.

Si el revisor es del mismo proveedor que el principal, la pantalla avisa: la revisión es más débil porque los dos modelos tienden a equivocarse igual.

**+ Nuevo perfil** crea uno desde cero.
