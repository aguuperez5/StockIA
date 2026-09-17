import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { createSaleCompat } from '../controllers/integration.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

before(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); });
after(async () => { await prisma.$disconnect(); });

async function seedSeller() {
  return prisma.user.create({ data: { name: 'Vendedor', email: `v-${Date.now()}-${Math.random()}@t.com`, password: 'x', role: 'USER' } });
}

async function seedStock(code, qty, deposit) {
  const product = await createProduct({ code, price: 100 });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: qty } });
  return product;
}

test('rechaza una venta con artículos de más de un depósito (400)', async () => {
  const seller = await seedSeller();
  const a = await createDeposit({ name: 'Dep A' });
  const b = await createDeposit({ name: 'Dep B' });
  const p1 = await seedStock('MULTI-1', 10, a);
  const p2 = await seedStock('MULTI-2', 10, b);

  const res = mockRes();
  await createSaleCompat({
    body: { items: [{ productId: p1.id, warehouseId: a.id, quantity: 1 }, { productId: p2.id, warehouseId: b.id, quantity: 1 }] },
    user: { id: seller.id },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /único depósito/);
});

test('rechaza una venta con foto mayor al límite (400)', async () => {
  const seller = await seedSeller();
  const a = await createDeposit({ name: 'Dep A' });
  const p1 = await seedStock('FOTO-1', 10, a);

  const res = mockRes();
  await createSaleCompat({
    body: { items: [{ productId: p1.id, warehouseId: a.id, quantity: 1 }], photoData: 'x'.repeat(4_000_001), photoMimeType: 'image/jpeg' },
    user: { id: seller.id },
  }, res);
  assert.equal(res.statusCode, 400);
});
