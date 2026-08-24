import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

// POST /api/stock/adjust (Actualización manual de stock + registro de movimiento)[cite: 2]
router.post('/adjust', async (req, res) => {
  const { productId, depositId, quantity, type } = req.body; // type: 'IN' o 'OUT'

  try {
    // Usamos una transacción para actualizar el stock y registrar el movimiento al mismo tiempo
    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.upsert({
        where: {
          productId_depositId: { productId, depositId }
        },
        update: {
          quantity: type === 'IN' ? { increment: quantity } : { decrement: quantity }
        },
        create: { productId, depositId, quantity }
      });

      const movement = await tx.stockMovement.create({
        data: { productId, depositId, quantity, type, reason: 'Ajuste manual' }
      });

      return { stock, movement };
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;