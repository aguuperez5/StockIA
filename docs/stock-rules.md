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

`MovementType`: `IN` (entrada), `OUT` (salida), `ADJUST` (ajuste manual con cualquier signo declarado por el usuario). Extensible a `TRANSFER_IN`/`TRANSFER_OUT`/`RETURN` en sprints futuros sin cambios estructurales.

- `IN` / `ADJUST` incrementan `Stock.quantity`.
- `OUT` decrementa `Stock.quantity`, previa validación de disponibilidad.

## Cómo se evita stock negativo

Doble capa:
1. **Aplicación**: antes de decrementar, se lee el stock existente y se rechaza la operación (`400`) si `quantity solicitada > disponible`. Esto corre dentro de la transacción para evitar condiciones de carrera entre la lectura y la escritura.
2. **Base de datos**: constraint `CHECK (quantity >= 0)` en la tabla `stock` (migración [20260825001217_stock_quantity_non_negative](../backend/prisma/migrations/20260825001217_stock_quantity_non_negative/migration.sql)). Es la última línea de defensa si algún flujo futuro (o un `UPDATE` manual) intentara saltarse la validación de aplicación. Verificado manualmente insertando una fila con `quantity = -5` vía SQL crudo: la base la rechaza.

También existe `CHECK (quantity > 0)` en `stock_movements`: la cantidad de un movimiento siempre se registra en valor absoluto, el signo lo determina `type`.

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
3. Por cada ítem: decrementa `Stock.quantity` del producto en ese depósito y crea un `StockMovement` tipo `OUT` con `reason: "Venta #<id>"`.

Si el stock es insuficiente para cualquier ítem, no se crea la venta ni se modifica ningún stock.
