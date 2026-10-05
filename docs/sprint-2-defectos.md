# Registro de Defectos Hallados y Corregidos — Sprint 2 (SB-082)

**Proyecto:** StockIA  
**Sprint:** 2  
**Ciclo de Pruebas:** QA y Desarrollo Continuo  
**Estado General:** Todos los defectos identificados han sido resueltos y verificados con pruebas automatizadas.

---

## 1. Tabla de Defectos

| ID Defecto | Severidad | Historia Relacionada | Descripción del Defecto | Estado | Solución Técnica Aplicada | Verificación / Test |
|---|---|---|---|---|---|---|
| **DEF-001** | **Alta** | HU-13 | El pipeline de visión deduplicaba códigos de barras a 1 sola unidad, impidiendo detectar repeticiones físicas del mismo producto en la foto. | **CERRADO** | Se agregó preservación de conteo por posición en `barcode.py` y regla anti-doble conteo en `consensus.py` (barcode físico suma unidad; OCR del texto corroborador suma 0 unidades). | `test_consensus_counts_repeated_barcodes`, `test_consensus_corroborates_without_double_counting` |
| **DEF-002** | **Alta** | HU-13 | Inexistencia del endpoint `POST /api/sales/scan` especificado en el backlog; se dependía de `/recognition/analyze` sin control de roles ni propagación de cantidades sugeridas. | **CERRADO** | Creado endpoint dedicado `POST /api/sales/scan` en `integration.routes.js`, protegido con `requireAuth` y roles `administrador` y `caja`, devolviendo cantidades agregadas. | `sales-scan.test.js` |
| **DEF-003** | **Media** | HU-13 | La terminal de ventas no precargaba el carrito tras el análisis visual; el usuario debía pulsar manualmente cada sugerencia una a una. | **CERRADO** | Implementado `preloadCartFromDetections` en `cartPreload.ts`, precargando automáticamente el comprobante con cantidades sugeridas, recorte por stock disponible y aviso al usuario. | `cartPreload.test.ts` |
| **DEF-004** | **Crítica** | HU-14 | Condición de carrera en transferencias y ventas concurrentes: dos transacciones paralelas podían sobregirar el stock o producir HTTP 500 no controlado por violación de CHECK `23514`. | **CERRADO** | Creado `StockTransferService` con descuento condicional atómico (`updateMany` con `quantity: { gte: qty }`) y captura de código `23514` mapeándolo a HTTP 400. Mismo patrón en `createSaleCompat`. | `transfer-concurrency.test.js` |
| **DEF-005** | **Media** | HU-15 | El carrito de ventas mostraba precios unitarios y subtotales estáticos basados en el precio base de lista, generando discrepancias con el total final recalculado por el servidor. | **CERRADO** | Se incluyó `priceRules` en la respuesta de `/api/inventory` y se creó la función de cálculo dinámico `unitPriceForQuantity` y `calculateLinePricing`, sincronizando el total en tiempo real con etiqueta de mayorista. | `pricing.test.ts` |
| **DEF-006** | **Alta** | HU-12 | El backend utilizaba una firma HMAC artesanal en lugar de tokens JWT estándar, sin flag `Secure` en producción y con fallback a un secreto débil conocido. | **CERRADO** | Se implementó JWT real con estándar HS256 (`jsonwebtoken`, expiración 7 días), cookie con `HttpOnly`, `SameSite=Lax` y `Secure` condicional a producción, y aborto al inicio en prod si el secreto es el por defecto. | `auth-security.test.js` |
| **DEF-007** | **Media** | HU-12 | El middleware de rate limiting de login seguía acumulando intentos fallidos aun después de un inicio de sesión exitoso, pudiendo bloquear erróneamente a usuarios legítimos. | **CERRADO** | Se implementó `resetLoginAttempts(email)` ejecutado inmediatamente tras autenticar credenciales con éxito en el controlador de login. | `auth-security.test.js:ok 7` |
| **DEF-008** | **Baja** | HU-12 | El formulario de login no ofrecía validación en tiempo real ni informaba accesibilidad con `aria-invalid` al tipear o desenfocar campos vacíos o emails mal formados. | **CERRADO** | Se extrajo la validación pura a `loginValidation.ts` y se conectaron controladores `onChange` y `onBlur` en `LoginPage.tsx` junto con atributos de accesibilidad y botón deshabilitado en envío. | `loginValidation.test.ts` |
| **DEF-009** | **Media** | HU-16 | El filtro "Bajo mínimo" se ejecutaba solo en memoria del cliente filtrando `/api/inventory`, sin endpoint de servidor ni clasificación uniforme de criticidad. | **CERRADO** | Creado `GET /api/inventory/low-stock` con filtro opcional por `warehouseId`, clasificación `sin_stock`, `critico`, `bajo` y `saludable`, y unificación de badges en `stockLevel.ts`. | `inventory-low-stock.test.js`, `stockLevel.test.ts` |

---

## 2. Métricas de Defectos

- **Total Defectos Reportados:** 9
- **Severidad Crítica:** 1 (DEF-004)
- **Severidad Alta:** 3 (DEF-001, DEF-002, DEF-006)
- **Severidad Media:** 4 (DEF-003, DEF-005, DEF-007, DEF-009)
- **Severidad Baja:** 1 (DEF-008)
- **Defectos Resueltos:** 9 (100%)
- **Defectos Reabiertos:** 0
- **Defectos Pendientes:** 0
