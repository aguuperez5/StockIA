import { Router } from 'express';
import { getProducts, createProduct, updateProduct } from '../controllers/product.controller.js';

const router = Router();

router.get('/', getProducts);       // GET /api/products[cite: 2]
router.post('/', createProduct);    // POST /api/products[cite: 2]
router.put('/:id', updateProduct);  // PUT /api/products/:id[cite: 2]

export default router;