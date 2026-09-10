import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct } from './helpers.js';
import { listPriceRules, savePriceRules } from '../controllers/integration.controller.js';

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

test('guarda y lee tramos de precio por volumen', async () => {
  const product = await createProduct({ code: 'PRICE-1', price: 100 });

  const save = mockRes();
  await savePriceRules({ params: { id: String(product.id) }, body: { rules: [{ minQuantity: 6, price: 90 }] } }, save);
  assert.equal(save.statusCode, 200);

  const list = mockRes();
  await listPriceRules({ params: { id: String(product.id) } }, list);
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].minQuantity, 6);
  assert.equal(Number(list.body.items[0].price), 90);
});

test('guardar con lista vacía limpia los tramos existentes', async () => {
  const product = await createProduct({ code: 'PRICE-2', price: 100 });
  await prisma.priceRule.create({ data: { productId: product.id, minQuantity: 3, price: 95 } });

  const save = mockRes();
  await savePriceRules({ params: { id: String(product.id) }, body: { rules: [] } }, save);
  assert.equal(save.statusCode, 200);
  assert.equal(await prisma.priceRule.count({ where: { productId: product.id } }), 0);
});

test('rechaza reglas para un producto inexistente (404)', async () => {
  const res = mockRes();
  await savePriceRules({ params: { id: '999999' }, body: { rules: [{ minQuantity: 2, price: 10 }] } }, res);
  assert.equal(res.statusCode, 404);
});

test('rechaza tramos con cantidad o precio inválidos (400)', async () => {
  const product = await createProduct({ code: 'PRICE-3', price: 100 });
  for (const rules of [
    [{ minQuantity: 0, price: 10 }],
    [{ minQuantity: 2.5, price: 10 }],
    [{ minQuantity: 2, price: 0 }],
    [{ minQuantity: 2, price: -5 }],
    [{ minQuantity: 'mucha', price: 10 }],
  ]) {
    const res = mockRes();
    await savePriceRules({ params: { id: String(product.id) }, body: { rules } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(await prisma.priceRule.count({ where: { productId: product.id } }), 0);
});

test('rechaza tramos con cantidad mínima repetida (400)', async () => {
  const product = await createProduct({ code: 'PRICE-4', price: 100 });
  const res = mockRes();
  await savePriceRules({
    params: { id: String(product.id) },
    body: { rules: [{ minQuantity: 5, price: 90 }, { minQuantity: 5, price: 80 }] },
  }, res);
  assert.equal(res.statusCode, 400);
});
