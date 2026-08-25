import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { createDeposit as createDepositHandler, getStockByDeposit } from '../controllers/deposit.controller.js';

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

test('crea un depósito válido', async () => {
  const res = mockRes();
  await createDepositHandler({ body: { name: 'Depósito Test', location: 'Ruta 1' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.deposit.name, 'Depósito Test');
});

test('rechaza depósito sin nombre', async () => {
  const res = mockRes();
  await createDepositHandler({ body: { location: 'Sin nombre' } }, res);
  assert.equal(res.statusCode, 400);
});

test('ignora campos no soportados en el alta (no hace mass-assignment)', async () => {
  const res = mockRes();
  await createDepositHandler({ body: { name: 'Depósito X', extraField: 'no debería guardarse' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.deposit.extraField, undefined);
});

test('consulta stock de un depósito existente, incluye datos del producto', async () => {
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'DEP-STOCK-1' });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 25 } });

  const res = mockRes();
  await getStockByDeposit({ params: { id: String(deposit.id) } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deposit.id, deposit.id);
  assert.equal(res.body.stock.length, 1);
  assert.equal(res.body.stock[0].quantity, 25);
  assert.equal(res.body.stock[0].product.code, 'DEP-STOCK-1');
});

test('consultar stock de un depósito inexistente devuelve 404', async () => {
  const res = mockRes();
  await getStockByDeposit({ params: { id: '999999' } }, res);
  assert.equal(res.statusCode, 404);
});

test('id de depósito inválido devuelve 400', async () => {
  const res = mockRes();
  await getStockByDeposit({ params: { id: 'no-es-un-numero' } }, res);
  assert.equal(res.statusCode, 400);
});
