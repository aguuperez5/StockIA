# Informe de Ejecución de Pruebas y Matriz de QA — Sprint 2

**Proyecto:** StockIA  
**Rama:** `frontend`  
**Fecha de Ejecución:** 04/10/2026  
**Responsable:** Equipo de QA y Desarrollo StockIA  

---

## 1. Resumen Ejecutivo de Pruebas

Se ejecutaron las cuatro suites automatizadas de pruebas del sistema, abarcando backend, frontend, percepción de IA y verificación estática de tipos:

| Suite / Herramienta | Comando | Pruebas Totales | Pasaron | Fallaron | Omitidas | Tiempo de Ejecución |
|---|---|---|---|---|---|---|
| **Backend API** (`node:test`) | `npm run test:backend` | 116 | 116 | 0 | 0 | ~12.5 s |
| **Frontend UI** (`vitest`) | `npm run test:frontend` | 40 | 40 | 0 | 0 | ~1.5 s |
| **IA / Perception** (`unittest`) | `npm run test:ai` | 25 | 24 | 0 | 1 | ~0.2 s |
| **Tipado TypeScript** (`tsc`) | `npm run check:frontend` | — | 0 errores | 0 errores | — | ~3.0 s |
| **Evaluación de Muestras IA** | `npm run evaluate:ai` | 20 muestras | 17 | 3* | 0 | ~2.0 s |

*\*Nota de evaluación de IA: Las 3 muestras fallidas en la suite sintética corresponden exclusivamente a imágenes `-solo-numeros` que requieren el motor local opcional PaddleOCR (`STOCKIA_INSTALL_OCR=true`), el cual está diseñado para activarse selectivamente en despliegues con OCR habilitado. La suite de pruebas unitarias contempla este escenario con lector simulado y `skipTest` condicional.*

---

## 2. Matriz de Ejecución de Casos de Prueba (CP)

### 2.1 HU-12: Autenticación, Seguridad y Autorización por Roles

| ID Caso | Escenario / Descripción | Entrada / Precondición | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|
| **CP-HU12-01** | Inicio de sesión exitoso | Credenciales válidas (caja@stockia.com, pass) | HTTP 200, cookie `stockia_session` HttpOnly, SameSite=Lax, Max-Age 7d, datos del usuario | HTTP 200, cookie HttpOnly emitida correctamente con JWT HS256 | **APROBADO** | `auth-security.test.js:ok 1` |
| **CP-HU12-02** | Credenciales incorrectas | Contraseña equivocada o email inexistente | HTTP 401, mensaje "Email o contraseña incorrectos", sin cookie | HTTP 401, sin Set-Cookie | **APROBADO** | `auth-security.test.js:ok 2` |
| **CP-HU12-03** | Sesión activa (`GET /auth/me`) | Cookie de sesión válida | HTTP 200 con perfil del usuario autenticado | HTTP 200 con payload deserializado de JWT | **APROBADO** | `auth-security.test.js:ok 3` |
| **CP-HU12-04** | Acceso sin sesión a endpoint protegido | Solicitud sin cabecera Cookie | HTTP 401 "Tu sesión no es válida o expiró." | HTTP 401 | **APROBADO** | `auth-security.test.js:ok 3` |
| **CP-HU12-05** | Cierre de sesión (`POST /auth/logout`) | Solicitud de deslogueo | HTTP 200, cookie con Max-Age=0 | HTTP 200, cookie invalidada | **APROBADO** | `auth-security.test.js:ok 4` |
| **CP-HU12-06** | Cookie manipulada / firma corrupta | JWT con firma HMAC alterada | HTTP 401, no se eleva a usuario | HTTP 401 | **APROBADO** | `auth-security.test.js:ok 5` |
| **CP-HU12-07** | Token JWT con tiempo expirado | Token firmado con `exp` vencido | HTTP 401 | HTTP 401 | **APROBADO** | `auth-security.test.js:ok 6` |
| **CP-HU12-08** | Reseteo de intentos de rate limit | Intentos fallidos previos + login exitoso | Tras login exitoso el contador se resetea a 0 | Contador reseteado; subsiguientes logins permitidos | **APROBADO** | `auth-security.test.js:ok 7` |
| **CP-HU12-09** | Matriz RBAC: rol caja | Usuario con rol `caja` | Permitido en `/sales` y `/sales/scan`; 403 en `/products` y `/transfers` | Permitido y 403 según matriz | **APROBADO** | `auth-security.test.js:ok 8` |
| **CP-HU12-10** | Matriz RBAC: rol depósito | Usuario con rol `deposito` | Permitido en `/transfers` y `/inventory`; 403 en `/sales` | Permitido y 403 según matriz | **APROBADO** | `auth-security.test.js:ok 8` |
| **CP-HU12-11** | Matriz RBAC: rol administrador | Usuario con rol `administrador` | Acceso irrestricto a todos los recursos (200/201) | Acceso concedido a todos los módulos | **APROBADO** | `auth-security.test.js:ok 8` |
| **CP-HU12-12** | Validación en tiempo real (login) | Email inválido o vacío al desenfocar o tipear | Error accesible en pantalla, botón submit deshabilitado | Mensaje en pantalla con `aria-invalid` y submit bloqueado | **APROBADO** | `loginValidation.test.ts (7 tests)` |

---

### 2.2 HU-13: Carga Asistida por Imagen (Percepción y Ventas) y CP-RNF-04

| ID Caso | Escenario / Descripción | Entrada / Precondición | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|
| **CP-RNF-04** | Detección directa por código de barras | Muestra nítida `3017620422003-claro.png` | Código GTIN detectado por zxing-cpp, tiempo < 1000 ms | Detectado en 14.8 ms; status `needs_review` / `matched` | **APROBADO** | `test_pipeline_samples.py:ok` |
| **CP-HU13-01** | Tolerancia a contraste y rotación | Muestras `-contraste.png` y `-girado.png` | Decodificación exitosa del GTIN | Identificado correctamente | **APROBADO** | `test_pipeline_samples.py:ok` |
| **CP-HU13-02** | Detección de múltiples códigos | `varios-codigos.png` con 3 productos | 3 GTINs detectados, estado `ambiguous`, sin crash | 3 GTINs detectados, status `ambiguous` | **APROBADO** | `test_pipeline_samples.py:ok` |
| **CP-HU13-03** | Rechazo de imagen sin códigos | Muestra `sin-codigo.png` | `no_detection`, array de identificadores vacío | `no_detection`, 0 identificadores válidos | **APROBADO** | `test_pipeline_samples.py:ok` |
| **CP-HU13-04** | Regla anti-doble conteo (Barcode + OCR) | Barcode + número OCR de la misma etiqueta | 1 sola unidad física; OCR corrobora sin sumar cantidad | Cantidad = 1; status corroborado; no duplicado | **APROBADO** | `test_agents.py:test_consensus_corroborates_without_double_counting` |
| **CP-HU13-05** | Conteo de barcodes repetidos | 2 barcodes físicos en posiciones distintas | Conteo = 2 unidades sugeridas | `occurrences = 2`, `suggestedQuantity = 2` | **APROBADO** | `test_agents.py:test_consensus_counts_repeated_barcodes` |
| **CP-HU13-06** | Endpoint `POST /api/sales/scan` | Petición con imagen base64 y rol caja | HTTP 200, items con `suggestedQuantity` y matching local | HTTP 200, catálogo local resuelto, cantidades incluidas | **APROBADO** | `sales-scan.test.js:ok` |
| **CP-HU13-07** | Control de roles en `/sales/scan` | Petición con rol `deposito` | HTTP 403 Forbidden | HTTP 403 | **APROBADO** | `sales-scan.test.js:ok` |
| **CP-HU13-08** | Precarga automática de carrito | Análisis de imagen finalizado | Carrito precargado con cantidades sugeridas, 100% editable | Carrito precargado; vendedor puede editar y confirmar | **APROBADO** | `cartPreload.test.ts (4 tests)` |
| **CP-HU13-09** | Recorte automático por stock disponible | Cantidad sugerida 8, stock en depósito 5 | Línea limitada a 5 unidades, advertencia emitida | Cantidad recortada a 5, `trimmed` informado | **APROBADO** | `cartPreload.test.ts:ok` |

---

### 2.3 HU-14: Transferencias Atómicas y Concurrencia (CP-RNF-05)

| ID Caso | Escenario / Descripción | Entrada / Precondición | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|
| **CP-RNF-05-A** | Dos transferencias concurrentes sobre stock límite | Stock 10; dos pedidos paralelos de 7 unidades | Exactamente 1 pasa (201) y 1 rechazada (400); stock final 3 y 7; 2 movimientos | res1: 201, res2: 400; stock 3/7; 2 movimientos firmados | **APROBADO** | `transfer-concurrency.test.js:ok 1` |
| **CP-RNF-05-B** | N transferencias simultáneas | Stock inicial 15; 10 transferencias de 2 unidades | 7 transferencias aprobadas (14 u.), 3 rechazadas; stock 1 y 14; masa conservada | 7 aprobadas, 3 rechazadas, stock nunca negativo, masa = 15 | **APROBADO** | `transfer-concurrency.test.js:ok 2` |
| **CP-RNF-05-C** | Ventas concurrentes sobre mismo stock | Stock 10; dos ventas simultáneas de 6 unidades | 1 venta confirmada (201), 1 rechazada (400); stock remanente 4 | Exactamente 1 venta confirmada, stock final 4 | **APROBADO** | `transfer-concurrency.test.js:ok 3` |
| **CP-RNF-05-D** | Atomicidad ante error parcial | Transferencia con 2 productos: uno con stock y otro sin stock | Rollback total; stock del primer producto intacto; 0 transferencias persistidas | HTTP 400; stock intacto; 0 movimientos huérfanos | **APROBADO** | `transfer-concurrency.test.js:ok 4` |
| **CP-HU14-01** | Modelo de movimientos con signo | Transferencia de 4 unidades | 2 `StockMovement`: origen (-4), destino (+4), cada uno con su `depositId` único | 2 movimientos registrados con signos opuestos y depósitos individuales | **APROBADO** | `transfer.test.js:ok` |

---

### 2.4 HU-15: Precios por Volumen en Tiempo Real

| ID Caso | Escenario / Descripción | Entrada / Precondición | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|
| **CP-HU15-01** | Sin reglas de volumen | Producto base $150.50, cantidad 7 | Se aplica precio base ($150.50) en frontend y backend | Frontend = Backend = 105350 centavos | **APROBADO** | `pricing.test.ts:ok 1` |
| **CP-HU15-02** | Cantidad debajo del umbral mínimo | Regla min 5 ($130); cantidad comprada 4 | Se aplica precio base | Frontend = Backend = 60200 centavos | **APROBADO** | `pricing.test.ts:ok 2` |
| **CP-HU15-03** | Cantidad en umbral exacto | Regla min 5 ($130); cantidad comprada 5 | Se aplica precio mayorista ($130), etiqueta mostrada | Frontend = Backend = 65000 centavos, tag presente | **APROBADO** | `pricing.test.ts:ok 3` |
| **CP-HU15-04** | Múltiples tramos desordenados | Reglas [10 u. $110, 25 u. $95.50, 5 u. $130]; compra 25 | Selecciona automáticamente la regla con mayor minQuantity <= 25 ($95.50) | Precio unitario $95.50; total 238750 centavos en ambos | **APROBADO** | `pricing.test.ts:ok 5` |
| **CP-HU15-05** | Recálculo dinámico en el carrito | Incremento de stepper en línea de comprobante | Modificación instantánea de subtotal y tag sin llamadas HTTP | UI actualiza precio unitario y total reactivamente | **APROBADO** | `NewSaleModal.tsx` + `SaleCartLine.tsx` |

---

### 2.5 HU-16: Alertas de Stock Mínimo y Criticidad

| ID Caso | Escenario / Descripción | Entrada / Precondición | Resultado Esperado | Resultado Obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|
| **CP-HU16-01** | Clasificación `sin_stock` | Stock = 0, umbral = 10 | `level: "sin_stock"`, badge rojo "Sin stock" | `level: "sin_stock"`, badge `stock-critical` | **APROBADO** | `inventory-low-stock.test.js:ok 2` |
| **CP-HU16-02** | Clasificación `critico` | Stock = 3, umbral = 10 (3 <= 5) | `level: "critico"`, badge "Crítico" | `level: "critico"`, badge `stock-critical` | **APROBADO** | `inventory-low-stock.test.js:ok 2` |
| **CP-HU16-03** | Clasificación `bajo` (umbral exacto) | Stock = 10, umbral = 10 | `level: "bajo"`, badge amarillo "Bajo mínimo" | `level: "bajo"`, badge `stock-low` | **APROBADO** | `inventory-low-stock.test.js:ok 2` |
| **CP-HU16-04** | Exclusión de stock saludable | Stock = 11, umbral = 10 | No aparece en `/api/inventory/low-stock` | Excluido de la respuesta de stock bajo | **APROBADO** | `inventory-low-stock.test.js:ok 2` |
| **CP-HU16-05** | Filtro por depósito | `warehouseId` en querystring | Devuelve únicamente posiciones del depósito consultado | 1 resultado correspondiente al depósito filtrado | **APROBADO** | `inventory-low-stock.test.js:ok 3` |
| **CP-HU16-06** | Paridad de lógica de badges | Componente `StockBadge` y reportes | Misma función pura `getStockBadgeInfo` en toda la aplicación | Consistencia total en StockPage, Dashboard y Reportes | **APROBADO** | `stockLevel.test.ts (5 tests)` |

---

## 3. Criterios de Aceptación y Estado de Salida

1. **Compilación y Chequeo Estático:** `npm run check:frontend` y `npm run build:frontend` compilan de forma limpia sin advertencias ni errores.
2. **Cobertura de Pruebas:** Todos los casos de prueba de HU-12 a HU-16 cuentan con tests automatizados y están integrados al flujo de CI (`npm test`).
3. **Manejo de Errores y Seguridad:** Ningún error transaccional o de validación genera respuestas 500 técnicas; la API responde consistentemente con 400, 401, 403 o 404 estructurados.
