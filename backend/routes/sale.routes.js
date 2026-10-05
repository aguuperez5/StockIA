import { Router } from 'express';
import { getSales, createSale } from '../controllers/sale.controller.js';
import { requireAppRole } from '../middleware.js';

const router = Router();

// GET /api/sales - Historial de ventas
router.get('/', getSales);

// POST /api/sales - Confirmar venta + descontar stock + movimiento
router.post('/', requireAppRole('administrador', 'caja'), createSale);

export default router;
