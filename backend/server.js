import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import depositRoutes from './routes/deposit.routes.js';
import stockRoutes from './routes/stock.routes.js';
import saleRoutes from './routes/sale.routes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Montado de rutas del Sprint 1[cite: 2]
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/sales', saleRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});