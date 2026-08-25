# Precios por cantidad — decisión de diseño

## Problema

Un mismo producto puede tener distinto precio según la cantidad comprada (ej: 1 unidad a precio de lista, 6+ unidades a precio de caja). `Product.price` como único campo no alcanza, pero implementar ya un motor de promociones es sobre-ingeniería para este Sprint.

## Decisión

Se mantiene `Product.price` como precio base (1 unidad) — **no se toca**, porque [product.controller.js](../backend/controllers/product.controller.js) ya lo usa como único campo de precio en `createProduct`/`updateProduct`, y romperlo hubiera invalidado ese contrato sin necesidad.

Se agrega una tabla aparte, `PriceRule`:

```prisma
model PriceRule {
  id          Int     @id @default(autoincrement())
  productId   Int
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  minQuantity Int
  price       Decimal @db.Decimal(10, 2)

  @@unique([productId, minQuantity])
}
```

## Cómo se resuelve el precio aplicable a una cantidad N

```js
const rule = await prisma.priceRule.findFirst({
  where: { productId, minQuantity: { lte: N } },
  orderBy: { minQuantity: 'desc' }
});
const applicablePrice = rule ? rule.price : product.price;
```

Es decir: se toma la regla de mayor `minQuantity` que sea `<= N`; si no hay ninguna, se usa el precio base del producto.

## Qué NO se implementa todavía

- No hay endpoint HTTP para gestionar `PriceRule` (alta/baja de reglas) — es responsabilidad de Backend definir esa superficie cuando se necesite.
- No hay motor de promociones (descuentos por combo, vigencia temporal, etc.).
- `sale.controller.js` recibe el `price` de cada ítem desde el cliente (ya decidido por quien arma la venta) — no resuelve automáticamente `PriceRule` todavía. Queda documentado como próximo paso para quien construya la pantalla de venta.

## Por qué esta forma y no otra

- No migra ni rompe el contrato ya consumido por Matías (`Product.price` sigue existiendo y significando lo mismo).
- No cierra la puerta a precios por cantidad: la tabla ya existe, con la unicidad y el índice necesarios; solo falta exponerla por API cuando se necesite.
- Evita motor de promociones complejo, que estaba explícitamente fuera de alcance.
