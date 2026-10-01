import { Router } from 'express';
import { rateLimitLogin, requireAuth, requireAppRole, ROLE } from '../middleware.js';
import * as c from '../controllers/integration.controller.js';

const router = Router();
router.get('/health', (req,res)=>res.json({status:'ok'}));
router.post('/users/register', c.registerCompat);
router.post('/auth/login', rateLimitLogin, c.login);
router.get('/auth/me', requireAuth, c.me);
router.post('/auth/logout', c.logout);

router.get('/products', requireAuth, c.listProducts);
router.get('/products/:id', requireAuth, c.getProductCompat);
router.post('/products', requireAuth, requireAppRole(ROLE.ADMIN), c.createProductCompat);
router.put('/products/:id', requireAuth, requireAppRole(ROLE.ADMIN), c.updateProductCompat);
router.delete('/products/:id', requireAuth, requireAppRole(ROLE.ADMIN), c.deleteProductCompat);

router.get('/warehouses', requireAuth, c.listWarehouses);
router.get('/warehouses/:id/summary', requireAuth, c.warehouseSummary);
router.post('/warehouses', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.WAREHOUSE), c.createWarehouse);
router.put('/warehouses/:id', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.WAREHOUSE), c.updateWarehouse);
router.delete('/warehouses/:id', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.WAREHOUSE), c.deleteWarehouse);
router.get('/inventory', requireAuth, c.listInventory);
router.patch('/inventory/:id', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.WAREHOUSE), c.updateInventory);

router.get('/price-rules/:id', requireAuth, c.listPriceRules);
router.put('/price-rules/:id', requireAuth, requireAppRole(ROLE.ADMIN), c.savePriceRules);

router.get('/sales', requireAuth, c.listSales);
router.post('/sales', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES), c.createSaleCompat);
router.get('/sales/:id', requireAuth, c.getSale);
router.get('/dashboard', requireAuth, c.dashboard);

router.get('/transfers', requireAuth, c.listTransfers);
router.post('/transfers', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.WAREHOUSE), c.createTransfer);
router.get('/transfers/:id', requireAuth, c.getTransfer);

router.get('/customers', requireAuth, c.listCustomers);
router.post('/customers', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES), c.createCustomer);
router.get('/customers/:id', requireAuth, c.customerDetail);
router.put('/customers/:id', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES), c.updateCustomer);
router.delete('/customers/:id', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES), c.deleteCustomer);

router.get('/reports', requireAuth, requireAppRole(ROLE.ADMIN), c.reports);
router.get('/team', requireAuth, requireAppRole(ROLE.ADMIN), c.team);
router.patch('/team/:id', requireAuth, requireAppRole(ROLE.ADMIN), c.updateRole);
router.post('/recognition/analyze', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES, ROLE.WAREHOUSE), c.recognition);
router.get('/telegram', requireAuth, c.listTelegram);
router.post('/telegram', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES), c.createTelegram);
router.patch('/telegram/:id', requireAuth, requireAppRole(ROLE.ADMIN, ROLE.SALES), c.updateTelegram);

export default router;
