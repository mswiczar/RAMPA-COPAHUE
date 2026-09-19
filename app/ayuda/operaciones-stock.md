---
titulo: Operaciones · Stock
grupo: Operaciones
orden: 51
ruta: operaciones/stock
captura: operaciones-stock.png
resumen: Cobertura proyectada semana a semana, stock real contra el ERP y lotes por vencer.
relacionadas: operaciones, produccion-decidir, produccion-plan
---

## Para qué sirve

Anticipar quiebres: ver semana a semana cuántos días de stock va a haber de cada producto y en qué semana se queda sin nada si no se decide nada nuevo.

## Qué hay en la pantalla

- **Cobertura proyectada semana a semana:** una tabla de calor producto × semana (8 semanas). Cada celda son los días de stock al cierre de la semana. Suma el stock real, lo que está en tránsito y las órdenes de producción que ya están en producción; no incluye órdenes nuevas.
  - **Naranja:** poca cobertura; el más oscuro es **Quiebre**.
  - **Gris:** alrededor del objetivo de 45 días.
  - **Celeste:** sobra stock; el más oscuro es capital inmovilizado.
  - Pasá el mouse por una celda para ver unidades y qué entra esa semana.
- **Stock real contra el ERP:** Tango, Disprofarma, Ship Now, en tránsito, real, diferencia, cobertura y reposición sugerida.
- **Lotes por vencer:** lote, depósito, unidades, fecha y días que faltan. Menos de 90 días, en rojo.

## Cómo se usa

1. En la tabla de calor, buscá la primera celda **Quiebre** de cada fila: esa es la semana límite.
2. Restá el lead time de producción (6 semanas): esa es la fecha para emitir la orden.
3. Abrí [Producción › Qué decidir](/ayuda#/produccion-decidir) para emitirla.
4. Revisá los lotes por vencer y llevalos a la grilla promocional.

## Casos de uso

- **FPS50 y Emulsión Facial quiebran la semana del 06/11**, aun con las órdenes en curso. Para evitarlo, la orden nueva tiene que salir antes del 25/09.
- **Lote de Crema de Pies por vencer:** incluirlo en la promoción de octubre.

## Preguntas frecuentes

**¿Por qué no aparece la orden de Crema Corporal?** Porque está planificada, no emitida. La proyección solo cuenta lo que ya está en producción.
