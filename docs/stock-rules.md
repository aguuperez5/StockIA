# Reglas de stock — StockIA (Sprint 1)

## Cómo se modifica el stock

Toda modificación de `Stock.quantity` pasa por [backend/controllers/stock.controller.js](../backend/controllers/stock.controller.js) (`adjustStock`), usada tanto por el ajuste manual (`POST /api/stock/adjust`, SB-034) como, con el mismo patrón, por la confirmación de venta (`POST /api/sales`, SB-046, implementada en [sale.controller.js](../backend/controllers/sale.controller.js)).

No existe ninguna vía en el código que modifique `Stock.quantity` sin pasar por una transacción que también cree un `StockMovement`.

## Cuándo se crea un movimiento

**Siempre** que cambia `Stock.quantity`. Es una regla de todo o nada: dentro de la misma transacción Prisma (`$transaction`) se:
1. Valida que producto y depósito existan.
2. Para salidas (`OUT`), valida que haya stock suficiente.
3. Actualiza (o crea, vía `upsert`) la fila de `Stock`.
4. Crea la fila de `StockMovement` correspondiente.

Si cualquier paso falla, la transacción completa se revierte — no puede quedar un movimiento sin su cambio de stock, ni viceversa. Verificado en `tests/stock.test.js` ("atomicidad: un ajuste rechazado no deja movimiento huérfano").

## Operaciones permitidas

Los movimientos en `StockMovement` se registran con signo algebraico explícito según el tipo de operación:
- **Entradas y reposiciones**: `quantity > 0` (incrementan `Stock.quantity`).
- **Ventas y transferencias de salida**: `quantity < 0` (decrementan `Stock.quantity`, previa validación de disponibilidad).
- **Ajustes manuales**: `quantity` con signo positivo o negativo según corresponda.

Cada movimiento está asociado a un único `depositId` y puede incluir un `reason` descriptivo.

## Cómo se evita stock negativo

Doble capa:
1. **Aplicación**: antes de decrementar, se valida atómicamente la disponibilidad y se rechaza la operación (`400`) si la cantidad solicitada supera el stock disponible en el depósito. Esto corre dentro de la transacción Prisma para evitar condiciones de carrera.
2. **Base de datos**: constraint `CHECK (quantity >= 0)` en la tabla `stock` (migración [20260825001217_stock_quantity_non_negative](../backend/prisma/migrations/20260825001217_stock_quantity_non_negative/migration.sql)). Es la última línea de defensa si algún flujo futuro intentara saltarse la validación de aplicación. Verificado insertando una fila con `quantity = -5` vía SQL crudo: la base la rechaza con código PostgreSQL `23514`.

## Contrato para una venta (SB-046)

Entrada esperada por `POST /api/sales`:
```json
{
  "depositId": 1,
  "total": 3000,
  "items": [{ "productId": 1, "quantity": 2, "price": 1500 }]
}
```

Efecto (todo dentro de una única transacción):
1. Valida stock suficiente para cada ítem en el depósito indicado.
2. Crea `Sale` + `SaleItem[]`.
3. Por cada ítem: decrementa `Stock.quantity` del producto en ese depósito y crea un `StockMovement` con `reason: "Venta #<id>"`.

Si el stock es insuficiente para cualquier ítem, no se crea la venta ni se modifica ningún stock.

## Transferencias entre depósitos (Sprint 2 - HU-14 / SB-072, SB-073, SB-081)

Toda transferencia se procesa mediante `StockTransferService` (`backend/services/stock-transfer.service.js`, función `transferStock`):
- **Atomicidad absoluta**: Origen y destino, validaciones de existencia, decremento de origen, incremento de destino, creación de `Transfer` y de `StockMovement` corren dentro de `prisma.$transaction`. Si cualquier producto o paso falla, nada se persiste.
- **Movimientos con signo (+/-)**: Se generan exactamente dos filas `StockMovement` por producto transferido:
  - Una con `quantity: -cantidad` y `depositId: originWarehouseId` (salida del origen).
  - Otra con `quantity: +cantidad` y `depositId: destinationWarehouseId` (entrada al destino).
  - Cada movimiento está asociado a un **único** `depositId`, garantizando la trazabilidad estricta sin ambigüedades.
- **Validación de depósitos**: Se valida que `originWarehouseId !== destinationWarehouseId` y que ambos depósitos existan.

## Control de concurrencia y sobregiros (HU-14)

Para prevenir condiciones de carrera y sobregiros en ventas o transferencias concurrentes sobre el mismo stock disponible:

1. **Descuento condicional atómico**:
   Tanto en `transferStock` como en `createSaleCompat`, el decremento se ejecuta condicionado a la disponibilidad en una única sentencia atómica:
   ```js
   const updateResult = await tx.stock.updateMany({
     where: {
       productId,
       depositId: originId,
       quantity: { gte: quantity },
     },
     data: {
       quantity: { decrement: quantity },
     },
   });
   if (updateResult.count === 0) {
     throw Object.assign(new Error(`Stock insuficiente para "${product.name}".`), { status: 400 });
   }
   ```
   **Justificación técnica**: En PostgreSQL bajo aislamiento `Read Committed`, la sentencia `UPDATE ... WHERE quantity >= qty` adquiere un bloqueo exclusivo sobre la fila. Si transacciones concurrentes compiten por el mismo stock, la segunda espera a que la primera confirme. Al tomar el bloqueo, PostgreSQL re-evalúa la cláusula `WHERE` sobre los datos confirmados más recientes. Si el remanente no alcanza para satisfacer `quantity: { gte: quantity }`, la sentencia afecta `0` filas (`updateResult.count === 0`), arrojando inmediatamente un error `400` limpio y consistente. No requiere locks manuales ni incurre en riesgo de deadlock.

2. **Manejo del constraint CHECK 23514**:
   Cualquier violación del CHECK de base de datos (`quantity >= 0`, código PostgreSQL `23514`) es capturada y mapeada a un HTTP `400 Bad Request` claro ("Stock insuficiente para completar la operación."), evitando en cualquier circunstancia respuestas `500` con trazas internas.

3. **Pruebas de concurrencia**:
   Cubierto en `backend/tests/transfer-concurrency.test.js`:
   - Dos transferencias paralelas que exceden el saldo disponible: exactamente una tiene éxito (201) y la otra es rechazada (400), conservando el saldo final exacto.
   - N transferencias simultáneas: la suma total de existencias se mantiene constante y el stock jamás desciende por debajo de cero.
   - Dos ventas concurrentes sobre el mismo producto: exclusión mutua verificada sin sobregiros.
   - Atomicidad ante fallas parciales: ninguna operación inconclusa deja movimientos huérfanos.
