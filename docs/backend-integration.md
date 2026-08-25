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
- **Desalineación frontend/backend**: el frontend actual ([frontend/src/context/AppDataContext.jsx](../frontend/src/context/AppDataContext.jsx)) es un mock en memoria con nombres de campo en español (`nombre`, `sku`, `precio`, `stockMinimo`, `stock: {depositoId: cantidad}`) y **no llama a la API real**. La API expone nombres en inglés (`name`, `code`, `price`, `imageUrl`) y stock como filas `Stock` por depósito. Este cableado es responsabilidad de Facundo; se documenta acá para que la integración no se descubra tarde.

## Pendiente de coordinación (fuera de este Sprint)

- Exponer `PriceRule` por API cuando se necesite resolver precio-por-cantidad en el flujo de venta.
- `Sale.customerId?` cuando se implemente `Cliente` (no rompe el modelo actual).
- Tipos `TRANSFER_IN`/`TRANSFER_OUT` en `MovementType` para cuando se implementen transferencias completas.
