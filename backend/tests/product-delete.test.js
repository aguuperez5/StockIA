import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { deleteProductCompat, listProducts } from '../controllers/integration.controller.js';

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

test('da de baja un producto sin stock y desaparece del listado', async () => {
  const product = await createProduct({ code: 'BAJA-1' });

  const res = mockRes();
  await deleteProductCompat({ params: { id: String(product.id) } }, res);
  assert.equal(res.statusCode, 200);

  const stored = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(stored.active, false);

  const list = mockRes();
  await listProducts({ query: {} }, list);
  assert.ok(!list.body.items.some((p) => p.id === product.id));
});

test('rechaza la baja de un producto con stock existente', async () => {
  const product = await createProduct({ code: 'BAJA-2' });
  const deposit = await createDeposit();
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 5 } });

  const res = mockRes();
  await deleteProductCompat({ params: { id: String(product.id) } }, res);
  assert.equal(res.statusCode, 400);

  const stored = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(stored.active, true);
});

test('dar de baja un producto inexistente devuelve 404', async () => {
  const res = mockRes();
  await deleteProductCompat({ params: { id: '999999' } }, res);
  assert.equal(res.statusCode, 404);
});

test('id inválido devuelve 400', async () => {
  const res = mockRes();
  await deleteProductCompat({ params: { id: 'abc' } }, res);
  assert.equal(res.statusCode, 400);
});

test('el listado oculta dados de baja salvo includeInactive=1', async () => {
  const product = await createProduct({ code: 'BAJA-VIS' });
  const del = mockRes();
  await deleteProductCompat({ params: { id: String(product.id) } }, del);
  assert.equal(del.statusCode, 200);

  const hidden = mockRes();
  await listProducts({ query: {} }, hidden);
  assert.ok(!hidden.body.items.some((p) => p.id === product.id));

  const shown = mockRes();
  await listProducts({ query: { includeInactive: '1' } }, shown);
  const found = shown.body.items.find((p) => p.id === product.id);
  assert.ok(found);
  assert.equal(found.active, false);
});
