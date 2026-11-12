import prisma from '../config/prisma.js';

/**
 * Executes an atomic stock transfer between warehouses with strict concurrency control.
 *
 * Concurrency Strategy:
 * Uses atomic conditional update (`updateMany` with `quantity: { gte: quantity }`).
 * Rationale:
 * Under PostgreSQL default Read Committed isolation, `UPDATE ... WHERE quantity >= qty` acquires
 * an exclusive row-level write lock. Concurrent transactions serialize on the row lock; when the lock
 * is acquired by the second transaction, PostgreSQL re-evaluates the WHERE clause with committed data.
 * If remaining quantity is less than requested, `count === 0`, preventing overselling and deadlocks
 * without requiring manual SELECT FOR UPDATE ordering.
 * In addition, any PostgreSQL CHECK constraint violation (code 23514) is caught and mapped to HTTP 400.
 *
 * @param {object} params
 * @param {number} params.originId - Source warehouse ID
 * @param {number} params.destinationId - Destination warehouse ID
 * @param {Array<{productId: number, quantity: number}>} params.items - Transfer line items
 * @param {number} [params.userId] - User performing the transfer
 * @param {object} [params.photo] - Optional photo proof { photoData, photoMimeType }
 * @returns {Promise<object>} Created Transfer entity
 */
export async function transferStock({ originId, destinationId, items, userId, photo }) {
  const origin = Number(originId);
  const dest = Number(destinationId);

  if (!Number.isInteger(origin) || !Number.isInteger(dest)) {
    throw Object.assign(new Error('Los depósitos de origen y destino deben ser identificadores válidos.'), { status: 400 });
  }

  if (origin === dest) {
    throw Object.assign(new Error('El depósito de origen debe ser distinto al de destino.'), { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Completá origen, destino y al menos un artículo.'), { status: 400 });
  }

  // Aggregate quantities by product to handle duplicate entries cleanly
  const grouped = new Map();
  for (const item of items) {
    const pid = Number(item.productId);
    const qty = Number(item.quantity);
    if (!Number.isInteger(pid) || !Number.isInteger(qty) || qty <= 0) {
      throw Object.assign(new Error('Cada artículo requiere producto y cantidad válidos mayores a cero.'), { status: 400 });
    }
    grouped.set(pid, (grouped.get(pid) || 0) + qty);
  }

  const sortedEntries = [...grouped.entries()].sort(([a], [b]) => a - b);
  const productIds = sortedEntries.map(([productId]) => productId);

  try {
    return await prisma.$transaction(async tx => {
      // 1. Validate both warehouses and all products in parallel
      const [originDeposit, destinationDeposit, products] = await Promise.all([
        tx.deposit.findUnique({ where: { id: origin } }),
        tx.deposit.findUnique({ where: { id: dest } }),
        tx.product.findMany({ where: { id: { in: productIds } } }),
      ]);

      if (!originDeposit || !destinationDeposit) {
        throw Object.assign(new Error('Uno de los depósitos no existe.'), { status: 400 });
      }

      // 2. Validate products exist and map names for clear error reporting
      const productsMap = new Map(products.map(p => [p.id, p]));
      for (const productId of productIds) {
        if (!productsMap.has(productId)) {
          throw Object.assign(new Error('Uno de los productos no existe.'), { status: 404 });
        }
      }

      // 3. Atomically decrement origin stock using conditional update
      for (const [productId, quantity] of sortedEntries) {
        const product = productsMap.get(productId);

        const updateResult = await tx.stock.updateMany({
          where: {
            productId,
            depositId: origin,
            quantity: { gte: quantity },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        if (updateResult.count === 0) {
          throw Object.assign(
            new Error(`Stock insuficiente para "${product.name}".`),
            { status: 400 }
          );
        }
      }

      // 4. Create Transfer record (avoid echoing large photoData payload back from DB)
      const transfer = await tx.transfer.create({
        data: {
          originWarehouseId: origin,
          destinationWarehouseId: dest,
          userId: userId || null,
          ...(photo ? { photoData: photo.photoData, photoMimeType: photo.photoMimeType } : {}),
          items: {
            create: sortedEntries.map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          },
        },
        select: {
          id: true,
          originWarehouseId: true,
          destinationWarehouseId: true,
          status: true,
          createdAt: true,
        },
      });

      // 5. Increment destination stock (upsert) and register signed StockMovements
      const movementRows = [];
      for (const [productId, quantity] of sortedEntries) {
        await tx.stock.upsert({
          where: { productId_depositId: { productId, depositId: dest } },
          update: { quantity: { increment: quantity } },
          create: { productId, depositId: dest, quantity },
        });

        movementRows.push(
          {
            productId,
            depositId: origin,
            quantity: -quantity,
            reason: `Transferencia ${transfer.id}`,
          },
          {
            productId,
            depositId: dest,
            quantity,
            reason: `Transferencia ${transfer.id}`,
          }
        );
      }

      await tx.stockMovement.createMany({ data: movementRows });

      return {
        ...transfer,
        photoData: photo?.photoData ?? null,
        photoMimeType: photo?.photoMimeType ?? null,
      };
    }, { maxWait: 10_000, timeout: 20_000 });
  } catch (error) {
    // Map PostgreSQL CHECK constraint violation 23514 to 400 Bad Request
    if (error.code === '23514' || String(error.message).includes('23514')) {
      throw Object.assign(new Error('Stock insuficiente para completar la transferencia.'), { status: 400 });
    }
    throw error;
  }
}
