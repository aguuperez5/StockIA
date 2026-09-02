import { Router } from 'express';
import { getStock, adjustStock, transferStock } from '../controllers/stock.controller.js';

const router = Router();

// GET /api/stock?productId=&depositId=  (stock puntual o por producto en todos los depósitos)
router.get('/', getStock);

// POST /api/stock/adjust    (entrada / salida / ajuste manual + movimiento)
router.post('/adjust', adjustStock);

// POST /api/stock/transfer  (mover stock entre depósitos)
router.post('/transfer', transferStock);

export default router;
