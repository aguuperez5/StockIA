import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { createTransfer } from '../controllers/integration.controller.js';
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

test('transfiere stock y registra ambos movimientos en una transacción', async () => {
  const [origin, destination] = await Promise.all([createDeposit({ name: 'Origen' }), createDeposit({ name: 'Destino' })]);
  const product = await createProduct({ code: 'TRANSFER-1' });
  await prisma.stock.create({ data: { productId: product.id, depositId: origin.id, quantity: 10 } });

  const res = mockRes();
  await createTransfer({ body: { originWarehouseId: origin.id, destinationWarehouseId: destination.id, photoData: 'data:image/jpeg;base64,AA==', photoMimeType: 'image/jpeg', items: [{ productId: product.id, quantity: 4 }] } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal((await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: origin.id } } })).quantity, 6);
  assert.equal((await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: destination.id } } })).quantity, 4);
  assert.equal(await prisma.stockMovement.count({ where: { productId: product.id } }), 2);
  assert.equal(await prisma.transfer.count(), 1);
  assert.equal((await prisma.transfer.findFirst()).photoData, 'data:image/jpeg;base64,AA==');
});

test('rechazar una transferencia revierte todas las operaciones', async () => {
  const [origin, destination] = await Promise.all([createDeposit({ name: 'Origen' }), createDeposit({ name: 'Destino' })]);
  const product = await createProduct({ code: 'TRANSFER-2' });
  await prisma.stock.create({ data: { productId: product.id, depositId: origin.id, quantity: 2 } });

  const res = mockRes();
  await createTransfer({ body: { originWarehouseId: origin.id, destinationWarehouseId: destination.id, items: [{ productId: product.id, quantity: 3 }] } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal((await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: origin.id } } })).quantity, 2);
  assert.equal(await prisma.stock.count({ where: { productId: product.id } }), 1);
  assert.equal(await prisma.stockMovement.count(), 0);
  assert.equal(await prisma.transfer.count(), 0);
});
