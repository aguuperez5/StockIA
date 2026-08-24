import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

// GET /api/sales - Historial de ventas[cite: 2]
router.get('/', async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sales - Confirmar venta + descontar stock + movimiento[cite: 2]
router.post('/', async (req, res) => {
  const { depositId, items, total } = req.body; // items: [{ productId, quantity, price }]

  try {
    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Crear la Venta y sus Detalles
      const sale = await tx.sale.create({
        data: {
          depositId,
          total,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });

      // 2. Descontar stock y generar movimientos de salida para cada producto
      for (const item of items) {
        await tx.stock.update({
          where: {
            productId_depositId: { productId: item.productId, depositId }
          },
          data: { quantity: { decrement: item.quantity } }
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            depositId,
            quantity: item.quantity,
            type: 'OUT',
            reason: `Venta #${sale.id}`
          }
        });
      }

      return sale;
    });

    res.status(201).json(saleResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;