import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

// POST /api/deposits[cite: 2]
router.post('/', async (req, res) => {
  try {
    const deposit = await prisma.deposit.create({ data: req.body });
    res.status(201).json(deposit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/deposits/:id/stock[cite: 2]
router.get('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const stocks = await prisma.stock.findMany({
      where: { depositId: Number(id) },
      include: { product: true }
    });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;