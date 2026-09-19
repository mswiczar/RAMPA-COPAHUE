---
titulo: Sistemas y fuentes de datos
grupo: La compañía
orden: 6
resumen: Los 21 sistemas y planillas de Copahue: qué es cada uno, quién lo usa, cómo se conecta hoy y qué agente de la Sala lo usa.
relacionadas: flujo-operaciones, conceptos-datos, conceptos-agentes
---

Esta página resume el relevamiento **«Bases de datos y sistemas Copahue»**. Cuando un agente cita una fuente entre corchetes, por ejemplo [Tango] o [Elvis], se refiere a estos sistemas. En esta versión de la Sala los datos son sintéticos y ningún sistema está conectado todavía; la tabla dice cómo están conectados **hoy entre sí**.

## Gestión y finanzas

| Sistema | Qué es | Conexión hoy | Quién lo usa | Agentes que lo usan |
| --- | --- | --- | --- | --- |
| **Tango** | ERP: facturación, notas de crédito, cuentas a cobrar y a pagar, stock teórico | Conectado con Disprofarma **solo para facturación, no para stock** | Administración y Finanzas | Comercial, Finanzas, Operaciones, Riesgo y Legal |
| **Facturante** | Facturación del e-commerce propio | Conectado con Shopify y Mercado Pago, **no con Tango** | Administración y Finanzas | Finanzas |
| **Mercado Pago** | Pagos del e-commerce y de la tienda en Mercado Libre | Shopify, Mercado Libre | Administración y Finanzas | Finanzas |
| **Presupuesto anual** | Excel con ventas, descuentos, comisiones, costos, marketing y SG&A. 4 versiones al año | Dropbox, sin conexión | Todos | Finanzas, R&D |
| **Naloo** | Recursos humanos: recibos, organigrama, ausencias | Sin conexión | Todos | — |

## Comercial y mercado

| Sistema | Qué es | Conexión hoy | Quién lo usa | Agentes que lo usan |
| --- | --- | --- | --- | --- |
| **Elvis** | CRM de visitadores médicos y de farmacias: visitas, ruteo, base de médicos y farmacias | Sin conexión | Comercial | Comercial |
| **IQVia** | Venta de dermocosmética por mes y código postal, 24 meses. Mercado y competencia | Sin conexión: se bajan reportes Excel. Entrega trimestral | Dirección, Desarrollo de negocios, Comercial, Marketing | Comercial, R&D, Marketing |
| **Bonus Dermo** | Recetas y bonos para médicos, canjeados en farmacias. Mide la productividad del visitador | Conectado con médicos y farmacias | Comercial | Comercial, Riesgo y Legal |
| **Avanter** | Liquidación de descuentos compartidos con farmacias por sell-out | Conectado con farmacias | Comercial, Administración | Comercial, Riesgo y Legal |
| **Sell Out** | Compilación del sell-out que envían las farmacias | Dropbox | Comercial | Comercial, Producto |
| **Stock de tiendas online** | Informe diario por mail: un robot releva las tiendas online de las principales farmacias | Mail | Comercial | Operaciones, Producto |
| **Grilla promocional** | Productos en foco y descuentos por ciclo promocional, 12 meses | Dropbox | Comercial, Marketing | Comercial, Producción |
| **Presupuesto de marketing** | Excel detallado por acción: Google Ads, Meta, influencers, material de punto de venta | Dropbox | Marketing | Marketing |
| **WGSN** | Tendencias de consumo, diseño y mercado de skin care (tiene IA propia) | Sin conexión | Marketing y Diseño | R&D, Marketing |

## Venta online

| Sistema | Qué es | Conexión hoy | Quién lo usa | Agentes que lo usan |
| --- | --- | --- | --- | --- |
| **Shopify** | La web y el e-commerce de Cremas Caviahue | Conectado con Ship Now; se bajan reportes | Marketing | Finanzas, Marketing |
| **Mercado Libre** | Tienda oficial de Caviahue | Facturante, Mercado Pago | Comercial, Marketing | Finanzas |

## Operaciones y producción

| Sistema | Qué es | Conexión hoy | Quién lo usa | Agentes que lo usan |
| --- | --- | --- | --- | --- |
| **Disprofarma** | Distribuidora y logística del canal farmacias. Factura por cuenta y orden a droguerías, entrega a farmacias directas, tiene stock propio | Conectado con Tango | Comercial, Administración | Operaciones, Producción |
| **Ship Now** | Logística y fulfillment del e-commerce | Conectado con Shopify | Supply Chain | Operaciones |
| **Capataz** | Stock, planificación de la producción y depósitos (WMS), con vencimientos | Tango, depósitos | Supply Chain | Producción |
| **Planificación de demanda** | Excel: forecast, plan por producto y planta, costos, flujo de fondos de producción | Dropbox. Se actualiza una vez por mes | Supply Chain, Comercial, Finanzas | Producción |
| **Moondesk** | Diseño, etiquetado y aprobación del packaging | Sin conexión | Diseño | R&D, Producto |

## Qué problemas explican varias alertas

- **Tango no tiene el stock real:** está conectado con Disprofarma solo para facturar. Por eso Operaciones compara Tango contra los depósitos y marca la diferencia.
- **Facturante no está conectado con Tango:** las ventas online pueden quedar sin factura en el ERP. Por eso existe la programación «Conciliación diaria del e-commerce».
- **Elvis, IQVia y WGSN no están conectados con nada:** hoy se cruzan a mano, en Excel. La Sala los cruza en el tablero Comercial y en R&D.

Ver cómo se ubica cada sistema en la operación en [Flujo de operaciones](/ayuda#/flujo-operaciones).
