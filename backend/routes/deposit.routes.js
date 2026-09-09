import { Router } from 'express';
import {
  getDeposits,
  createDeposit,
  updateDeposit,
  getStockByDeposit,
} from '../controllers/deposit.controller.js';
import { requireAppRole } from '../middleware.js';

const router = Router();

router.get('/', getDeposits);                 // GET /api/deposits
router.post('/', requireAppRole('administrador', 'deposito'), createDeposit);              // POST /api/deposits
router.put('/:id', requireAppRole('administrador', 'deposito'), updateDeposit);            // PUT /api/deposits/:id
router.get('/:id/stock', getStockByDeposit);  // GET /api/deposits/:id/stock

export default router;
