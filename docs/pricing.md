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

## Implementación en Sprint 2 (HU-15 - SB-076)

En el Sprint 2 se cierra la brecha entre el cálculo del servidor y la interfaz de ventas:

1. **Exposición de reglas en el inventario**:
   - `GET /api/inventory` incluye `priceRules: Array<{ id, minQuantity, priceCents, price }>` para cada ítem de stock sin consultas HTTP adicionales.
   - Adicionalmente existen `GET /api/price-rules/:id` y `PUT /api/price-rules/:id` para consultar o actualizar reglas por producto.

2. **Cálculo en tiempo real en frontend**:
   - Módulo puro `frontend/client/src/lib/pricing.ts` (`unitPriceForQuantity` y `calculateLinePricing`).
   - Regla de resolución (100% simétrica con el backend):
     ```ts
     const applicable = [...rules]
       .filter(r => r.minQuantity <= quantity)
       .sort((a, b) => b.minQuantity - a.minQuantity);
     const effectiveUnitPrice = applicable.length > 0 ? applicable[0].priceCents : basePriceCents;
     ```
   - Integrado en `NewSaleModal.tsx` y `SaleCartLine.tsx`: al modificar cantidades (o al precargar por escaneo de IA), se recalculan automáticamente el precio unitario, el subtotal de línea y el total general, mostrando el tag visual **"Precio mayorista aplicado"**.

3. **Garantía de paridad (Vitest)**:
   - Evaluado en `frontend/client/src/lib/pricing.test.ts` frente al algoritmo de `createSaleCompat` para casos borde (justo en el umbral, sin reglas, varias reglas no ordenadas, cantidades 0 o negativas). Ambos cálculos producen exactamente el mismo total en centavos.

## Por qué esta forma y no otra

- No migra ni rompe el contrato original (`Product.price` sigue existiendo y significando el precio base unitario).
- Sin consultas HTTP extra al tipear o cambiar cantidades en el carrito.
- El backend (`createSaleCompat`) sigue recalculando de manera autoritativa los precios por tramo al persistir la venta, impidiendo discrepancias o alteraciones desde el cliente.
- Evita motores de promociones complejos con dependencias temporales o combinatorias que exceden el alcance del sprint.
