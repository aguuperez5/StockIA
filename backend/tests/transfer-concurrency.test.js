import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { createTransfer, createSaleCompat } from '../controllers/integration.controller.js';
import { resetDb, createDeposit, createProduct, createUser } from './helpers.js';

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

test('concurrencia: dos transferencias de 7 con stock 10 -> exactamente una pasa, la otra 400', async () => {
  const [origin, destination] = await Promise.all([
    createDeposit({ name: 'Origen Concurrente' }),
    createDeposit({ name: 'Destino Concurrente' }),
  ]);
  const product = await createProduct({ code: 'CONC-TRANSFER-1' });
  await prisma.stock.create({
    data: { productId: product.id, depositId: origin.id, quantity: 10 },
  });

  const res1 = mockRes();
  const res2 = mockRes();

  await Promise.all([
    createTransfer(
      {
        body: {
          originWarehouseId: origin.id,
          destinationWarehouseId: destination.id,
          items: [{ productId: product.id, quantity: 7 }],
        },
      },
      res1
    ),
    createTransfer(
      {
        body: {
          originWarehouseId: origin.id,
          destinationWarehouseId: destination.id,
          items: [{ productId: product.id, quantity: 7 }],
        },
      },
      res2
    ),
  ]);

  const statusCodes = [res1.statusCode, res2.statusCode].sort();
  assert.deepEqual(statusCodes, [201, 400], 'Una transferencia debe tener éxito (201) y la otra debe fallar (400)');

  const originStock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: product.id, depositId: origin.id } },
  });
  const destStock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: product.id, depositId: destination.id } },
  });

  assert.equal(originStock.quantity, 3, 'El stock de origen debe quedar exactamente en 3');
  assert.equal(destStock.quantity, 7, 'El stock de destino debe quedar exactamente en 7');

  const movements = await prisma.stockMovement.findMany({
    where: { productId: product.id },
    orderBy: { id: 'asc' },
  });
  assert.equal(movements.length, 2, 'Debe haber exactamente 2 movimientos registrados (1 salida, 1 entrada)');
  assert.equal(movements[0].quantity, -7);
  assert.equal(movements[0].depositId, origin.id);
  assert.equal(movements[1].quantity, 7);
  assert.equal(movements[1].depositId, destination.id);
});

test('concurrencia: N transferencias simultáneas conservan la masa total y stock jamás es negativo', async () => {
  const [origin, destination] = await Promise.all([
    createDeposit({ name: 'Origen N' }),
    createDeposit({ name: 'Destino N' }),
  ]);
  const product = await createProduct({ code: 'CONC-TRANSFER-N' });
  const initialStock = 15;
  await prisma.stock.create({
    data: { productId: product.id, depositId: origin.id, quantity: initialStock },
  });

  // 10 concurrent transfers of 2 units each = 20 requested, only 15 available (7 succeed, 3 fail)
  const transferRequests = Array.from({ length: 10 }, () => {
    const res = mockRes();
    return {
      res,
      promise: createTransfer(
        {
          body: {
            originWarehouseId: origin.id,
            destinationWarehouseId: destination.id,
            items: [{ productId: product.id, quantity: 2 }],
          },
        },
        res
      ),
    };
  });

  await Promise.all(transferRequests.map(t => t.promise));

  const successful = transferRequests.filter(t => t.res.statusCode === 201).length;
  const failed = transferRequests.filter(t => t.res.statusCode === 400).length;

  assert.equal(successful, 7, 'Exactamente 7 transferencias de 2 unidades deben pasar (14 unidades)');
  assert.equal(failed, 3, '3 transferencias deben ser rechazadas con 400');

  const originStock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: product.id, depositId: origin.id } },
  });
  const destStock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: product.id, depositId: destination.id } },
  });

  assert(originStock.quantity >= 0, 'El stock nunca puede ser negativo');
  assert.equal(originStock.quantity, 1, 'El stock remanente en origen debe ser 1 (15 - 14)');
  assert.equal(destStock.quantity, 14, 'El stock en destino debe ser 14');
  assert.equal(originStock.quantity + destStock.quantity, initialStock, 'La suma total de stock se conserva');
});

test('concurrencia: dos ventas concurrentes de 6 con stock 10 -> exactamente una pasa, la otra 400', async () => {
  const deposit = await createDeposit({ name: 'Depósito Ventas Concurrente' });
  const seller = await createUser({ email: 'seller-conc@stockia.com' });
  const product = await createProduct({ code: 'CONC-SALE-1', price: 100 });
  await prisma.stock.create({
    data: { productId: product.id, depositId: deposit.id, quantity: 10 },
  });

  const res1 = mockRes();
  const res2 = mockRes();

  await Promise.all([
    createSaleCompat(
      {
        body: {
          items: [{ productId: product.id, warehouseId: deposit.id, quantity: 6 }],
        },
        user: { id: seller.id },
      },
      res1
    ),
    createSaleCompat(
      {
        body: {
          items: [{ productId: product.id, warehouseId: deposit.id, quantity: 6 }],
        },
        user: { id: seller.id },
      },
      res2
    ),
  ]);

  const statusCodes = [res1.statusCode, res2.statusCode].sort();
  assert.deepEqual(statusCodes, [201, 400], 'Una venta debe tener éxito (201) y la otra debe fallar (400)');

  const finalStock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: product.id, depositId: deposit.id } },
  });
  assert.equal(finalStock.quantity, 4, 'Stock debe quedar en 4 (10 - 6)');

  const salesCount = await prisma.sale.count();
  assert.equal(salesCount, 1, 'Debe haber quedado registrada exactamente una venta');
});

test('atomicidad: una transferencia con múltiples ítems donde uno falla revierte toda la operación', async () => {
  const [origin, destination] = await Promise.all([
    createDeposit({ name: 'Origen Parcial' }),
    createDeposit({ name: 'Destino Parcial' }),
  ]);
  const p1 = await createProduct({ code: 'P-OK' });
  const p2 = await createProduct({ code: 'P-FAIL' });

  // P1 has sufficient stock, P2 has insufficient stock
  await prisma.stock.create({ data: { productId: p1.id, depositId: origin.id, quantity: 10 } });
  await prisma.stock.create({ data: { productId: p2.id, depositId: origin.id, quantity: 2 } });

  const res = mockRes();
  await createTransfer(
    {
      body: {
        originWarehouseId: origin.id,
        destinationWarehouseId: destination.id,
        items: [
          { productId: p1.id, quantity: 5 },
          { productId: p2.id, quantity: 8 }, // Fails: needs 8, has 2
        ],
      },
    },
    res
  );

  assert.equal(res.statusCode, 400);

  // Verify p1 stock was NOT decremented
  const p1Stock = await prisma.stock.findUnique({
    where: { productId_depositId: { productId: p1.id, depositId: origin.id } },
  });
  assert.equal(p1Stock.quantity, 10, 'El stock del primer producto no debe descontarse si el segundo falla');

  // Verify no movements or transfers were committed
  assert.equal(await prisma.transfer.count(), 0);
  assert.equal(await prisma.stockMovement.count(), 0);
});
