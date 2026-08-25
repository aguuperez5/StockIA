import { Router } from 'express';
import { createDeposit, getStockByDeposit } from '../controllers/deposit.controller.js';

const router = Router();

// POST /api/deposits[cite: 2]
router.post('/', createDeposit);

// GET /api/deposits/:id/stock[cite: 2]
router.get('/:id/stock', getStockByDeposit);

export default router;
