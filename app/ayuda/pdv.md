---
titulo: Punto de venta · Resultados
grupo: Comercial
orden: 25
ruta: comercial/pdv
captura: pdv.png
resumen: Qué pasa en la góndola: presencia, precio, espacio contra ventas, frentes, material POP y alertas de la IA.
relacionadas: pdv-misiones, pdv-evidencia, pdv-calidad, operaciones-canal
guia: [{"sel":".pdv-intro .segmented","texto":"La auditoría de punto de venta tiene cinco secciones: resultados, misiones, evidencia, informes de mercado y calidad."},{"sel":".kpis","texto":"Lo que pasa en la góndola en ocho números, con su tipo de dato."},{"sel":".heat","texto":"Presencia o precio por producto y cadena. Pasá el mouse por una celda para ver el detalle; las rayadas son productos no listados."},{"sel":".ayuda-btn","texto":"Cada sección tiene su ayuda en este botón."}]
---

## Para qué sirve

Las ventas y el stock no dicen si el producto **está en la góndola**, a qué precio y con cuánto espacio. Esta solución lo mide con relevamientos en las farmacias hechos por una red de relevadores, que sacan fotos que después analiza un sistema de reconocimiento de imágenes. El proveedor todavía no está definido; los datos de esta versión son sintéticos.

## Qué hay en la pantalla

- **Indicadores:** presencia en góndola, share of shelf contra share de ventas, desvío de precio, frentes de FPS50, POP instalado, relevamientos validados, saldo disponible y costo por relevamiento.
- **Alertas de la IA:** priorizadas por lo que cuesta ventas, con link a la pantalla relacionada.
- **Tabla de calor por producto y cadena**, con dos vistas:
  - **Presencia:** el % de sucursales relevadas donde el producto está exhibido. Más oscuro es más presencia. Rayado: no listado en esa cadena.
  - **Precio:** el desvío contra el precio sugerido. Naranja, más barato; celeste, más caro; gris, en precio.
- **Share of shelf contra share de ventas:** el espacio de cada marca por cadena. La línea negra es cuánto vende Caviahue ahí: si está a la derecha del bloque celeste, la marca vende más de lo que se ve y hay argumento para pedir espacio.
- **Frentes por producto** contra lo acordado, y el estado del **material POP** de la campaña.

## Cómo se usa

1. Leé las alertas rojas: suelen ser faltantes en góndola.
2. En la tabla de calor, buscá celdas claras en Presencia. Si coinciden con quiebre en [Operaciones](/ayuda#/operaciones-canal), el problema es de stock, no de la cadena.
3. Cambiá a **Precio** para ver desvíos: por encima perdemos competitividad; por debajo, suele ser una promoción que no pasó por Comercial.
4. En share of shelf, buscá cadenas con brecha negativa grande: son candidatas a una negociación de espacio.

## Casos de uso

- **Negociación con una cadena:** Cadena Norte tiene el 11% del espacio y el 16% de las ventas: es el argumento para la góndola destacada de verano.
- **Control de precios:** Emulsión Facial se vende 14% arriba del sugerido en Cadena Norte.
- **Ejecución de campañas:** el exhibidor de verano está instalado en 14 de 25 farmacias acordadas.

## Qué significa cada cosa

- **Presencia:** sucursales donde el producto se ve en góndola, sobre las relevadas.
- **Share of shelf:** porcentaje del espacio de la categoría que ocupa cada marca.
- **Frentes (facings):** cantidad de unidades de frente visibles de un producto.
- **POP:** material de punto de venta (exhibidores, carteles).
