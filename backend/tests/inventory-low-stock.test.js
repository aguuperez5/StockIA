import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { listLowStock, listInventory } from '../controllers/integration.controller.js';
import { resetDb, createDeposit, createProduct } from './helpers.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

beforeEach(resetDb);
after(async () => prisma.$disconnect());

test('GET /inventory/low-stock rechaza warehouseId inválido con 400', async () => {
  const res = mockRes();
  await listLowStock({ query: { warehouseId: 'invalido' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'El ID del depósito no es válido.');
});

test('GET /inventory/low-stock clasifica stock 0, crítico, umbral exacto y excluye saludable', async () => {
  const deposit = await createDeposit({ name: 'Depósito Central' });

  // Threshold 10
  // Qty 0 -> sin_stock
  // Qty 3 -> critico (3 <= 5)
  // Qty 10 -> bajo (exact threshold)
  // Qty 11 -> saludable (should NOT be in low-stock)
  const pZero = await createProduct({ code: 'P-ZERO', lowStockThreshold: 10 });
  const pCrit = await createProduct({ code: 'P-CRIT', lowStockThreshold: 10 });
  const pExact = await createProduct({ code: 'P-EXACT', lowStockThreshold: 10 });
  const pGood = await createProduct({ code: 'P-GOOD', lowStockThreshold: 10 });

  await prisma.stock.createMany({
    data: [
      { productId: pZero.id, depositId: deposit.id, quantity: 0 },
      { productId: pCrit.id, depositId: deposit.id, quantity: 3 },
      { productId: pExact.id, depositId: deposit.id, quantity: 10 },
      { productId: pGood.id, depositId: deposit.id, quantity: 11 },
    ],
  });

  const res = mockRes();
  await listLowStock({ query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 3, 'Debe devolver exactamente los 3 productos en o por debajo del umbral');

  const zeroItem = res.body.items.find(i => i.productId === pZero.id);
  const critItem = res.body.items.find(i => i.productId === pCrit.id);
  const exactItem = res.body.items.find(i => i.productId === pExact.id);
  const goodItem = res.body.items.find(i => i.productId === pGood.id);

  assert.ok(zeroItem, 'Item con stock 0 debe estar presente');
  assert.equal(zeroItem.level, 'sin_stock');

  assert.ok(critItem, 'Item con stock crítico debe estar presente');
  assert.equal(critItem.level, 'critico');

  assert.ok(exactItem, 'Item en umbral exacto debe estar presente');
  assert.equal(exactItem.level, 'bajo');

  assert.equal(goodItem, undefined, 'Item con stock por encima del umbral no debe estar en low-stock');
});

test('GET /inventory/low-stock filtra correctamente por depósito', async () => {
  const d1 = await createDeposit({ name: 'Depósito 1' });
  const d2 = await createDeposit({ name: 'Depósito 2' });

  const p1 = await createProduct({ code: 'P-D1', lowStockThreshold: 5 });
  const p2 = await createProduct({ code: 'P-D2', lowStockThreshold: 5 });

  await prisma.stock.create({ data: { productId: p1.id, depositId: d1.id, quantity: 2 } });
  await prisma.stock.create({ data: { productId: p2.id, depositId: d2.id, quantity: 1 } });

  const res = mockRes();
  await listLowStock({ query: { warehouseId: String(d1.id) } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.items[0].productId, p1.id);
  assert.equal(res.body.items[0].warehouseId, d1.id);
});

test('GET /inventory?lowStock=true también aplica el filtro y clasifica niveles', async () => {
  const deposit = await createDeposit({ name: 'Depósito General' });
  const pLow = await createProduct({ code: 'P-LOW-QUERY', lowStockThreshold: 5 });
  const pHigh = await createProduct({ code: 'P-HIGH-QUERY', lowStockThreshold: 5 });

  await prisma.stock.create({ data: { productId: pLow.id, depositId: deposit.id, quantity: 4 } });
  await prisma.stock.create({ data: { productId: pHigh.id, depositId: deposit.id, quantity: 10 } });

  const res = mockRes();
  await listInventory({ query: { lowStock: 'true' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].productId, pLow.id);
  assert.equal(res.body.items[0].level, 'bajo');
});
