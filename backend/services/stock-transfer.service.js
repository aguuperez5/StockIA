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

  try {
    return await prisma.$transaction(async tx => {
      // 1. Validate both warehouses exist
      const [originDeposit, destinationDeposit] = await Promise.all([
        tx.deposit.findUnique({ where: { id: origin } }),
        tx.deposit.findUnique({ where: { id: dest } }),
      ]);

      if (!originDeposit || !destinationDeposit) {
        throw Object.assign(new Error('Uno de los depósitos no existe.'), { status: 400 });
      }

      // 2. Validate products exist and fetch names for clear error reporting
      const productsMap = new Map();
      for (const productId of grouped.keys()) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw Object.assign(new Error('Uno de los productos no existe.'), { status: 404 });
        }
        productsMap.set(productId, product);
      }

      // 3. Atomically decrement origin stock using conditional update
      for (const [productId, quantity] of grouped.entries()) {
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

      // 4. Create Transfer record
      const transfer = await tx.transfer.create({
        data: {
          originWarehouseId: origin,
          destinationWarehouseId: dest,
          userId: userId || null,
          ...(photo ? { photoData: photo.photoData, photoMimeType: photo.photoMimeType } : {}),
          items: {
            create: [...grouped.entries()].map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          },
        },
      });

      // 5. Increment destination stock (upsert) and register signed StockMovements
      for (const [productId, quantity] of grouped.entries()) {
        await tx.stock.upsert({
          where: { productId_depositId: { productId, depositId: dest } },
          update: { quantity: { increment: quantity } },
          create: { productId, depositId: dest, quantity },
        });

        // Signed movements: negative at origin, positive at destination, single depositId per movement
        await tx.stockMovement.createMany({
          data: [
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
            },
          ],
        });
      }

      return transfer;
    });
  } catch (error) {
    // Map PostgreSQL CHECK constraint violation 23514 to 400 Bad Request
    if (error.code === '23514' || String(error.message).includes('23514')) {
      throw Object.assign(new Error('Stock insuficiente para completar la transferencia.'), { status: 400 });
    }
    throw error;
  }
}
