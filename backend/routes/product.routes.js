import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';

const router = Router();

router.get('/', getProducts);          // GET /api/products
router.get('/:id', getProductById);    // GET /api/products/:id
router.post('/', createProduct);       // POST /api/products
router.put('/:id', updateProduct);     // PUT /api/products/:id
router.delete('/:id', deleteProduct);  // DELETE /api/products/:id (baja lógica)

export default router;
