import { Router } from 'express';
import { getSales, createSale } from '../controllers/sale.controller.js';

const router = Router();

// GET /api/sales - Historial de ventas[cite: 2]
router.get('/', getSales);

// POST /api/sales - Confirmar venta + descontar stock + movimiento[cite: 2]
router.post('/', createSale);

export default router;
