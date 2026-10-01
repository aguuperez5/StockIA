import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import integrationRoutes from './routes/integration.routes.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import depositRoutes from './routes/deposit.routes.js';
import stockRoutes from './routes/stock.routes.js';
import saleRoutes from './routes/sale.routes.js';
import { requireAuth, requireAppRole } from './middleware.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.use('/api', integrationRoutes);
// Endpoints originales del backend, conservados para compatibilidad con las pruebas y clientes anteriores.
app.use('/api/auth', authRoutes);
app.use('/api/products-legacy', requireAuth, requireAppRole('administrador'), productRoutes);
app.use('/api/deposits', requireAuth, depositRoutes);
app.use('/api/stock', requireAuth, stockRoutes);
// Contrato original de ventas (SB-042), conservado para compatibilidad.
// El flujo canónico actual es POST /api/sales del integration.controller,
// que calcula totales y tramos de precio en el servidor.
app.use('/api/sales-legacy', requireAuth, saleRoutes);

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({ message: err.message || 'Error interno del servidor.' });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`Servidor StockIA corriendo en http://localhost:${PORT}`));
