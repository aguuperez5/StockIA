import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { createSale, getSales } from '../controllers/sale.controller.js';

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

test('confirma una venta válida: descuenta stock y registra movimiento OUT', async () => {
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'SALE-1', price: 100 });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 20 } });

  const res = mockRes();
  await createSale({
    body: { depositId: deposit.id, total: 200, items: [{ productId: product.id, quantity: 2, price: 100 }] }
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.sale.items.length, 1);

  const stock = await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: deposit.id } } });
  assert.equal(stock.quantity, 18);

  const movements = await prisma.stockMovement.findMany({ where: { productId: product.id, depositId: deposit.id } });
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, 'OUT');
  assert.equal(movements[0].reason, `Venta #${res.body.sale.id}`);
});

test('rechaza venta con stock insuficiente y no modifica nada', async () => {
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'SALE-2', price: 50 });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 3 } });

  const res = mockRes();
  await createSale({
    body: { depositId: deposit.id, total: 500, items: [{ productId: product.id, quantity: 10, price: 50 }] }
  }, res);

  assert.equal(res.statusCode, 400);

  const stock = await prisma.stock.findUnique({ where: { productId_depositId: { productId: product.id, depositId: deposit.id } } });
  assert.equal(stock.quantity, 3, 'el stock no debe cambiar ante un rechazo');

  const sales = await prisma.sale.findMany();
  assert.equal(sales.length, 0, 'no debe quedar una venta creada');

  const movements = await prisma.stockMovement.findMany();
  assert.equal(movements.length, 0, 'no debe quedar un movimiento huérfano');
});

test('rechaza venta con múltiples ítems si uno solo tiene stock insuficiente (todo o nada)', async () => {
  const deposit = await createDeposit();
  const productOk = await createProduct({ code: 'SALE-3A', price: 10 });
  const productSinStock = await createProduct({ code: 'SALE-3B', price: 10 });
  await prisma.stock.create({ data: { productId: productOk.id, depositId: deposit.id, quantity: 100 } });
  await prisma.stock.create({ data: { productId: productSinStock.id, depositId: deposit.id, quantity: 1 } });

  const res = mockRes();
  await createSale({
    body: {
      depositId: deposit.id,
      total: 60,
      items: [
        { productId: productOk.id, quantity: 5, price: 10 },
        { productId: productSinStock.id, quantity: 10, price: 10 }
      ]
    }
  }, res);

  assert.equal(res.statusCode, 400);
  const stockOk = await prisma.stock.findUnique({ where: { productId_depositId: { productId: productOk.id, depositId: deposit.id } } });
  assert.equal(stockOk.quantity, 100, 'el producto con stock suficiente tampoco debe descontarse');
});

test('rechaza venta con datos incompletos', async () => {
  const res = mockRes();
  await createSale({ body: { depositId: 1 } }, res);
  assert.equal(res.statusCode, 400);
});

test('lista el historial de ventas con sus ítems y producto', async () => {
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'SALE-4', price: 30 });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 10 } });
  await createSale({ body: { depositId: deposit.id, total: 30, items: [{ productId: product.id, quantity: 1, price: 30 }] } }, mockRes());

  const res = mockRes();
  await getSales({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].items[0].product.code, 'SALE-4');
});
