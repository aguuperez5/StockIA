# Contrato de integración — Persistencia para Backend (Matías)

Este documento describe qué entidades y garantías ofrece la capa de persistencia para que los endpoints de Backend se puedan construir sin depender de conocimiento informal.

## Entidades disponibles

Ver detalle completo en [data-model.md](data-model.md). Resumen de lo que Backend puede asumir:

| Entidad | Clave de negocio | Notas |
|---|---|---|
| `Product` | `code` (único) | `price` es el precio base; usar `PriceRule` para precio por cantidad (ver [pricing.md](pricing.md)) |
| `Deposit` | ninguna (sin unique) | si se necesita evitar duplicados por nombre, coordinar antes de agregar `@unique` |
| `Stock` | `(productId, depositId)` único | nunca crear una segunda fila para el mismo par — usar `upsert` |
| `StockMovement` | — | append-only, nunca se actualiza ni se borra |
| `Sale` / `SaleItem` | — | `SaleItem` se borra en cascada si se borra `Sale`; `Product`/`Deposit` referenciados por `Sale`/`SaleItem`/`Stock`/`StockMovement` no se pueden borrar mientras tengan referencias (`onDelete: Restrict`) |
| `User` | `email` (único) | `password` ya viene hasheado (bcrypt) desde `auth.controller.js` |

## Operaciones de persistencia ya implementadas (no reimplementar)

- `adjustStock(productId, depositId, quantity, type, reason?)` en [stock.controller.js](../backend/controllers/stock.controller.js) — única vía soportada para modificar `Stock.quantity`. Devuelve `{ stock, movement }`. Lanza `400` si `type=OUT` y no hay stock suficiente, `404` si producto o depósito no existen.
- El patrón transaccional de venta en [sale.controller.js](../backend/controllers/sale.controller.js) (`createSale`) es el contrato a seguir para cualquier flujo nuevo que descuente stock: validar disponibilidad de **todos** los ítems primero, recién después crear los registros y actualizar stock, todo dentro de un único `prisma.$transaction`.

## Comportamiento ante errores

- Violaciones de unicidad (`code` duplicado, `(productId, depositId)` duplicado) → Prisma lanza error con `code: 'P2025'` (not found en update) o `P2002` (unique constraint) — los controllers ya mapean `P2025` a `404`; mapear `P2002` a `400` con mensaje claro si se agregan nuevos endpoints.
- Stock insuficiente → `400`, mensaje incluye disponible vs. solicitado.
- Producto/depósito inexistente → `404`.
- El CHECK de base (`quantity >= 0`) es una red de seguridad, no la validación primaria — un intento de violarlo desde código de aplicación ya debería haber sido rechazado antes por la validación explícita.

## Consideraciones transaccionales

Cualquier endpoint nuevo que:
1. Modifique `Stock.quantity`, **debe** hacerlo dentro de `prisma.$transaction` junto con la creación del `StockMovement` correspondiente.
2. Modifique stock de múltiples productos/depósitos en una sola operación (ej. una transferencia futura), debe validar disponibilidad de **todo** antes de escribir nada — no hacer validar-y-escribir por ítem en el mismo loop (evita dejar la operación parcialmente aplicada si un ítem falla a mitad de camino).

## Lo que Backend NO debería hacer

- No escribir `Stock.quantity` con `prisma.stock.update` directo fuera de `stock.controller.js`/el patrón de venta — se pierde la garantía de trazabilidad (`StockMovement`).
- No asumir que `Product.name` es único — usar siempre `code`.
- No borrar `Product`/`Deposit` con stock asociado sin decidir explícitamente qué hacer con ese stock primero (la FK con `Restrict` lo va a impedir).

## Cambios hechos fuera del alcance formal de este rol (documentados para Matías/Facundo)

- **`backend/routes/auth.routes.js`**: había un typo (`router.post('/register', register); r` — una `r` suelta al final de la línea) que lanzaba `ReferenceError` al importar el módulo y **rompía el arranque completo del servidor**. Se corrigió (se quitó el carácter suelto) porque bloqueaba poder verificar el resto del backend end-to-end. No se tocó ninguna otra lógica de `auth`.
- **Estado del frontend (actualizado Sprint 1, verificado con 58 casos E2E HTTP):** el frontend canónico es [frontend/client/src](../frontend/client/src) (el directorio [frontend/src](../frontend/src) quedó como legado y ya no lo usa Vite). El cliente nuevo **sí consume la API real** para listados y altas: productos, depósitos, inventario, ventas, transferencias, clientes, dashboard, reportes, Telegram y reconocimiento simulado. Los totales de venta y los tramos de `PriceRule` se calculan en el servidor (`createSaleCompat`), sin IVA: el total persistido es la suma de `precio_unitario × cantidad` con el tramo aplicable.
- **Compatibilidad legada:** `sale.controller.js` (contrato original SB-042 de un solo depósito) sigue cubierto por tests directos y expuesto solo como `POST /api/sales-legacy`; el flujo canónico es `POST /api/sales` del `integration.controller.js`.

## Endpoints de Visión y Asistencia de Ventas (Sprint 2 - HU-13)

### `POST /api/sales/scan`
- **Propósito**: Escaneo de imágenes para la terminal de ventas asistidas. Ejecuta el pipeline de visión de IA (zxing-cpp + OCR de respaldo), agrupa lecturas sin doble conteo y calcula la cantidad sugerida (`suggestedQuantity`) de cada producto del catálogo.
- **Autenticación y Roles**: Requiere sesión activa (`requireAuth`) con rol `administrador` o `caja` (`requireAppRole(ROLE.ADMIN, ROLE.SALES)`). Rol `deposito` u otros son rechazados con HTTP 403.
- **Request Body**:
  ```json
  {
    "photoData": "data:image/jpeg;base64,..."
  }
  ```
- **Respuestas**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "count": 1,
      "occurrences": 2,
      "detections": [
        {
          "code": "7791234567890",
          "suggestedQuantity": 2,
          "source": "consensus",
          "matchedProduct": { "id": 1, "name": "...", "sku": "...", "priceCents": 12000 }
        }
      ],
      "items": [
        {
          "product": { "id": 1, "name": "...", "sku": "..." },
          "suggestedQuantity": 2,
          "matchedCode": "7791234567890",
          "matchMethod": "barcode+ocr",
          "reviewRequired": false,
          "isAmbiguous": false
        }
      ],
      "rawReadings": [ ... ],
      "textReadings": [ ... ],
      "executionMs": 142
    }
    ```
  - `400 Bad Request`: `{ "error": "No se recibió imagen para procesar." }`
  - `401 Unauthorized`: Sin sesión o token inválido/expirado.
  - `403 Forbidden`: Rol sin permisos de venta (`ROLE.WAREHOUSE`).
  - `503 Service Unavailable`: Servicio de IA no configurado o no disponible temporalmente.

### `POST /api/recognition/analyze`
- **Propósito**: Endpoint de reconocimiento general y fallback por búsqueda textual (`queryText`). Mantiene compatibilidad con el módulo de transferencias y pruebas exploratorias.

## Endpoints de Inventario y Alertas (Sprint 2 - HU-16)

### `GET /api/inventory/low-stock`
- **Propósito**: Consulta las posiciones de inventario que se encuentran en o por debajo del umbral de stock mínimo (`quantity <= lowStockThreshold`), incluyendo expresamente aquellas con existencia cero (`quantity = 0`).
- **Autenticación**: Requiere sesión activa (`requireAuth`).
- **Query Parameters**:
  - `warehouseId` (opcional, entero): Filtra las posiciones de stock por un depósito específico. Si se proporciona un valor no numérico o <= 0, responde `400 Bad Request`.
- **Respuestas**:
  - `200 OK`:
    ```json
    [
      {
        "id": 12,
        "productId": 3,
        "productName": "Yerba Mate 1kg",
        "productCode": "7791234567890",
        "category": "Almacén",
        "warehouseId": 1,
        "warehouseName": "Almacén Central",
        "quantity": 0,
        "lowStockThreshold": 5,
        "level": "sin_stock"
      },
      {
        "id": 15,
        "productId": 8,
        "productName": "Fideos Tallarines 500g",
        "productCode": "7799876543210",
        "category": "Pastas",
        "warehouseId": 1,
        "warehouseName": "Almacén Central",
        "quantity": 2,
        "lowStockThreshold": 5,
        "level": "critico"
      }
    ]
    ```
  - `400 Bad Request`: `{ "error": "El parámetro warehouseId debe ser un número entero positivo" }`
  - `401 Unauthorized`: Sin sesión activa.
- **Clasificación Unificada de Niveles (`level`)**:
  - `quantity <= 0` → `"sin_stock"` (Badge rojo)
  - `0 < quantity <= floor(lowStockThreshold / 2)` (cuando threshold > 1) → `"critico"` (Badge naranja/rojo)
  - `quantity <= lowStockThreshold` → `"bajo"` (Badge amarillo)
  - `quantity > lowStockThreshold` → `"saludable"` (Badge verde)

*(Nota: El endpoint general `GET /api/inventory` también admite el flag `?lowStock=true` para activar este mismo filtrado de forma combinada con los demás parámetros).*

## Endpoints y Mecanismos de Autenticación (Sprint 2 - HU-12)

### 1. `POST /api/auth/login`
- **Payload**: `{ "email": "...", "password": "..." }`
- **Comportamiento**:
  - Compara la contraseña mediante `bcrypt.compare`.
  - Si es válida:
    - Genera un token JWT estándar firmado con HMAC-SHA256 (HS256) con expiración de 7 días (`exp: now + 7d`) y payload `{ userId }`.
    - Emite una cookie de sesión denominada `auth_session` (o `session`) con flags:
      - `HttpOnly: true` (inaccesible desde scripts del navegador para mitigar ataques XSS).
      - `SameSite: 'Lax'` (protección contra CSRF).
      - `Secure: true` cuando `NODE_ENV === 'production'`.
      - `Path: '/'`.
    - Resetea inmediatamente el contador de intentos fallidos de rate-limiting para ese correo (`resetLoginAttempts`).
    - Responde `200 OK` con datos del usuario autenticado (sin contraseña) y rol asignado.
  - Si es inválida:
    - Incrementa el contador de intentos fallidos. Si supera 5 intentos fallidos consecutivos en una ventana de 15 minutos, bloquea temporalmente al usuario con `429 Too Many Requests`.
    - Responde `401 Unauthorized` con mensaje amigable.

### 2. `GET /api/auth/me`
- **Propósito**: Retorna la identidad y permisos del usuario actualmente autenticado leyendo la cookie de sesión.
- **Respuestas**:
  - `200 OK`: `{ "user": { "id": 1, "name": "...", "email": "...", "appRole": "administrador", ... } }`
  - `401 Unauthorized`: Si la cookie no está presente, fue manipulada o el token JWT expiró.

### 3. `POST /api/auth/logout`
- **Propósito**: Cierra la sesión activa borrando la cookie `HttpOnly` del navegador.
- **Respuesta**: `200 OK`.

### 4. Matriz de Control de Acceso por Roles (RBAC)

El sistema define tres roles canónicos en `appRole`:
- `administrador`: Acceso total a configuración, catálogo de productos, depósitos, inventario, reportes, caja y transferencias.
- `caja`: Acceso a terminal de ventas (`POST /api/sales`, `POST /api/sales/scan`), catálogo en modo lectura, consulta de existencias y clientes. Bloqueado para altas de productos y reportes gerenciales (`403 Forbidden`).
- `deposito`: Acceso a gestión física de inventario, ajustes y transferencias interdepósito (`POST /api/transfers`). Bloqueado para emitir ventas comerciales (`403 Forbidden`).

## Cambios de Persistencia y Concurrencia (Sprint 2 - HU-14)

- **`StockTransferService`**: Transferencias atómicas entre depósitos (`transferStock({ originId, destinationId, items, userId, photo })`) con movimientos con signo (+/-) y único `depositId` por movimiento. Descuento atómico condicional (`quantity: { gte: qty }`) para prevenir sobregiros en concurrencia. Violación del CHECK de base mapeado a `400 Bad Request`.
- **`createSaleCompat`**: Aplicación de la misma protección de descuento condicional atómico para evitar sobreventas concurrentes en la misma línea de stock.

## Endpoints de Reportes, Analítica y Toma de Decisiones

### 1. `GET /api/reports`
- **Propósito**: Genera el informe gerencial consolidado para un período específico. Cruza facturación real, stock actual, necesidades urgentes de compra, aporte por depósito y detección de mercadería estancada.
- **Autenticación y Permisos**: Requiere sesión con rol `administrador` (`requireAppRole(ROLE.ADMIN)`).
- **Query Parameters**:
  - `from` (opcional, string `YYYY-MM-DD`): Fecha de inicio del período (`00:00:00.000` en hora local del servidor).
  - `to` (opcional, string `YYYY-MM-DD`): Fecha de fin del período (`23:59:59.999` en hora local del servidor).
- **Garantías de Exactitud**:
  - Toda cifra monetaria se calcula en **centavos enteros** (`moneyToCents` = `Math.round(precio * 100)`), previniendo desvíos de coma flotante.
  - La fecha local se extrae por componentes (`getFullYear`, `getMonth() + 1`, `getDate`), evitando desfasajes por corrimientos UTC de medianoche.
  - No incluye números simulados ni proyecciones ficticias: las ventas corresponden a comprobantes efectivamente confirmados en PostgreSQL.
- **Respuesta `200 OK`**:
  ```json
  {
    "sales": {
      "totalCents": 15400000,
      "count": 28,
      "averageTicketCents": 550000
    },
    "dailySales": [
      { "date": "2026-10-16", "totalCents": 2100000 },
      { "date": "2026-10-17", "totalCents": 0 },
      { "date": "2026-10-18", "totalCents": 3400000 }
    ],
    "replenishment": {
      "totalItems": 3,
      "totalUnitsNeeded": 24,
      "totalReferenceValueCents": 12800000,
      "items": [
        {
          "productId": 5,
          "productName": "Aceite de Girasol 1.5L",
          "sku": "ACE-001",
          "category": "Almacén",
          "currentStock": 0,
          "threshold": 10,
          "unitsNeeded": 10,
          "priceCents": 850000,
          "referenceValueCents": 8500000,
          "priority": "CRÍTICA"
        }
      ]
    },
    "warehouseBreakdown": [
      { "id": 1, "name": "Almacén Central", "count": 18, "totalCents": 9800000, "percentage": 64 },
      { "id": 2, "name": "Sucursal Norte", "count": 10, "totalCents": 5600000, "percentage": 36 }
    ],
    "topRevenue": [
      { "productId": 12, "productName": "Yerba Mate 1kg", "sku": "YER-001", "units": 45, "revenueCents": 4500000 }
    ],
    "stagnantStock": {
      "count": 4,
      "totalUnits": 65,
      "totalReferenceValueCents": 8900000,
      "items": [
        { "id": 9, "name": "Válvula Esférica 1/2", "sku": "VAL-002", "category": "Ferretería", "stock": 20, "referenceValueCents": 3200000 }
      ]
    },
    "transfers": 6
  }
  ```

### 2. `GET /api/dashboard`
- **Propósito**: Alimenta el panel principal de control en vivo (`Home.tsx` y `DashboardCharts.tsx`).
- **Autenticación**: Sesión activa obligatoria (`requireAuth`).
- **Payload de Respuesta**:
  - `products`: Conteo exacto de productos activos en catálogo (`active: true`).
  - `warehouses`: Total de depósitos registrados en la base de datos.
  - `inventoryValueCents`: Valuación integral de existencias a precio de lista (`sum(stock * precioLista)`).
  - `todaySalesCents` y `todaySaleCount`: Total facturado y comprobantes emitidos desde las `00:00:00` de hoy.
  - `salesByDay`: Ventas de los últimos 7 días continuos (hoy y los 6 días anteriores) con días en $0 si no hubo actividad.
  - `inventoryByCategory`: Distribución real de unidades físicas y valor monetario agrupado por categoría.
  - `inventoryStatus`: Conteo y clasificación de artículos (`Saludable`, `Bajo mínimo`, `Sin stock`).

### 3. `GET /api/warehouses/:id/summary`
- **Propósito**: Reporte específico de una sucursal o depósito para el modal gerencial y la toma de decisiones logísticas.
- **Query Parameters**: `from`, `to` (filtrado opcional por período temporal aplicado directamente en PostgreSQL).
- **Contenido**:
  - `deposit`: Metadatos de la sucursal (nombre, tipo, dirección, responsable, capacidad e imagen de portada).
  - `stock`: Inventario completo en el depósito con umbral de alerta y valuación unitaria y total.
  - `sales`: Lista de comprobantes emitidos desde ese depósito en el período, incluyendo cliente y desglose de renglones.

### 4. `GET /api/customers/:id`
- **Propósito**: Ficha comercial integral del cliente.
- **Garantía de Agregación**: Consulta en paralelo el historial de comprobantes (`take: 10` para vista rápida) y la agregación atómica de base de datos (`prisma.sale.aggregate`) para reflejar con exactitud matemática el total histórico real (`totalPurchasesCents`) y el total de ventas (`purchasesCount`), sin límites ni truncamiento.

### 5. `GET /api/apriltags/:tagId/image`
- **Propósito**: Sirve la etiqueta gráfica del AprilTag (formato PNG a través del microservicio de visión OpenCV o SVG vectorial determinista de respaldo).
- **Optimización de Caché**: Cabecera `Cache-Control: public, max-age=31536000, immutable` para descarga instantánea y cero sobrecarga de red en pantallas e impresiones masivas.

## Pendiente de coordinación (fuera de este Sprint)

- Integración bidireccional y recepción de fotos vía Telegram Bot (ítems 13.12 y 13.16 del backlog general).
- Facturación electrónica externa (AFIP).

