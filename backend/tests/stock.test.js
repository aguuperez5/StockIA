import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { adjustStock, getStock } from '../controllers/stock.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

before(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

// Caso 1: Consultar stock existente
test('consulta stock existente', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 42 } });

  const res = mockRes();
  await getStock({ query: { productId: product.id, depositId: deposit.id } }, res);
  assert.equal(res.body.quantity, 42);
});

// Caso 2: Crear stock inicial (upsert vía adjustStock con IN)
test('crea stock inicial con un movimiento IN', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();
  const res = mockRes();

  await adjustStock({ body: { productId: product.id, depositId: deposit.id, quantity: 50, type: 'IN' } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.stock.quantity, 50);
  assert.equal(res.body.movement.type, 'IN');
});

// Caso 3: Entrada de stock sobre stock existente
test('entrada de stock incrementa cantidad existente', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 10 } });

  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: deposit.id, quantity: 5, type: 'IN' } }, res);

  assert.equal(res.body.stock.quantity, 15);
});

// Caso 4: Salida de stock válida
test('salida de stock válida decrementa cantidad', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 20 } });

  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: deposit.id, quantity: 8, type: 'OUT' } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.stock.quantity, 12);
});

// Caso 5: Intentar retirar más stock del disponible
test('rechaza salida mayor al stock disponible', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 5 } });

  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: deposit.id, quantity: 10, type: 'OUT' } }, res);

  assert.equal(res.statusCode, 400);
  const stock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: product.id, depositId: deposit.id } }
  });
  assert.equal(stock.quantity, 5, 'el stock no debe modificarse ante un rechazo');
});

// Caso 6: Verificar que el movimiento quede registrado
test('registra el movimiento de stock', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();

  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: deposit.id, quantity: 7, type: 'ADJUST', reason: 'Conteo físico' } }, res);

  const movements = await prisma.stockMovement.findMany({ where: { productId: product.id, depositId: deposit.id } });
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, 'ADJUST');
  assert.equal(movements[0].reason, 'Conteo físico');
});

// Caso 7: Verificar que el stock correcto del depósito correcto sea modificado
test('modifica sólo el stock del depósito indicado', async () => {
  const product = await createProduct();
  const depositA = await createDeposit({ name: 'A' });
  const depositB = await createDeposit({ name: 'B' });
  await prisma.stock.create({ data: { productId: product.id, depositId: depositA.id, quantity: 10 } });
  await prisma.stock.create({ data: { productId: product.id, depositId: depositB.id, quantity: 10 } });

  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: depositA.id, quantity: 4, type: 'OUT' } }, res);

  const stockA = await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: depositA.id } } });
  const stockB = await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: depositB.id } } });
  assert.equal(stockA.quantity, 6);
  assert.equal(stockB.quantity, 10);
});

// Caso 8: Verificar atomicidad de stock + movimiento (stock insuficiente no debe crear movimiento)
test('atomicidad: un ajuste rechazado no deja movimiento huérfano', async () => {
  const product = await createProduct();
  const deposit = await createDeposit();
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 2 } });

  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: deposit.id, quantity: 100, type: 'OUT' } }, res);

  const movements = await prisma.stockMovement.findMany({ where: { productId: product.id, depositId: deposit.id } });
  assert.equal(movements.length, 0);
});

// Caso 9: Producto inexistente
test('rechaza ajuste con producto inexistente', async () => {
  const deposit = await createDeposit();
  const res = mockRes();
  await adjustStock({ body: { productId: 999999, depositId: deposit.id, quantity: 1, type: 'IN' } }, res);
  assert.equal(res.statusCode, 404);
});

// Caso 10: Depósito inexistente
test('rechaza ajuste con depósito inexistente', async () => {
  const product = await createProduct();
  const res = mockRes();
  await adjustStock({ body: { productId: product.id, depositId: 999999, quantity: 1, type: 'IN' } }, res);
  assert.equal(res.statusCode, 404);
});
