import { Router } from 'express';
import { getDeposits, createDeposit, getStockByDeposit } from '../controllers/deposit.controller.js';

const router = Router();

// POST /api/deposits[cite: 2]
router.get('/', getDeposits);
router.post('/', createDeposit);

// GET /api/deposits/:id/stock[cite: 2]
router.get('/:id/stock', getStockByDeposit);

export default router;
