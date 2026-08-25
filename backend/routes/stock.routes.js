import { Router } from 'express';
import { getStock, adjustStock } from '../controllers/stock.controller.js';

const router = Router();

// GET /api/stock?productId=&depositId= (SB-032: consultar stock puntual)
router.get('/', getStock);

// POST /api/stock/adjust (SB-034/SB-035/SB-046: actualización manual de stock + movimiento)
router.post('/adjust', adjustStock);

export default router;
